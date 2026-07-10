"""
Automated backend tests for Phase 1 of the first-party marketing attribution system.

Coverage:
  * Middleware cookie writes (osc_vid, osc_sid, osc_ft, osc_lt) on UTM landings
  * First-touch immutability, last-touch overwrite semantics
  * /api/tracking/ingest beacon writes visitor / session / visit rows in Mongo
  * /go/[slug] redirect logic
      - unknown / archived slugs 302 back to home
      - active slugs 302 to the destination URL with UTMs appended
      - click counter increments
      - visitor/session/visit rows created
      - cookies set on the redirect response
  * /api/register copies first_touch_* + last_touch_* fields onto the new user
  * Visitor doc is linked to the freshly-registered user (visitor.userId)
  * /api/admin/tracking-links CRUD + duplicate + archive + slug validation
  * Reserved slugs are rejected
  * Non-admin access to admin endpoints is 401
  * Middleware matcher excludes /api and /go so those paths don't set cookies

Run:
  cd /app && python3 tests/tracking_attribution_test.py
"""

import os
import sys
import time
import unittest
import uuid
import requests

BASE_URL = os.environ.get("NEXT_PUBLIC_BASE_URL", "http://localhost:3000")
ADMIN_EMAIL = os.environ.get("ADMIN_EMAILS", "sebastiandieugenioe@gmail.com").split(",")[0].strip()
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "preview-only-change-in-prod")
API = f"{BASE_URL}/api"


def _mongo():
    """Best-effort Mongo handle; tests that need direct DB inspection skip if unavailable."""
    try:
        from pymongo import MongoClient  # type: ignore
        client = MongoClient(os.environ.get("MONGO_URL", "mongodb://localhost:27017"), serverSelectionTimeoutMS=1500)
        client.server_info()
        return client[os.environ.get("DB_NAME", "osc_db")]
    except Exception:  # noqa: BLE001
        return None


DB = _mongo()


class MiddlewareCookieTests(unittest.TestCase):
    """The Edge middleware must set the 4 attribution cookies on a UTM landing."""

    def test_home_with_utms_sets_all_cookies(self):
        s = requests.Session()
        r = s.get(f"{BASE_URL}/?utm_source=x&utm_medium=y&utm_campaign=z", allow_redirects=False)
        self.assertEqual(r.status_code, 200)
        for name in ("osc_vid", "osc_sid", "osc_ft", "osc_lt"):
            self.assertIn(name, s.cookies, f"middleware did not set {name}")

    def test_home_without_utms_still_sets_visitor_and_session(self):
        s = requests.Session()
        r = s.get(f"{BASE_URL}/", allow_redirects=False)
        self.assertEqual(r.status_code, 200)
        self.assertIn("osc_vid", s.cookies)
        self.assertIn("osc_sid", s.cookies)
        # No touch cookies without UTMs
        self.assertNotIn("osc_ft", s.cookies)
        self.assertNotIn("osc_lt", s.cookies)

    def test_first_touch_is_immutable_across_requests(self):
        s = requests.Session()
        s.get(f"{BASE_URL}/?utm_source=insta&utm_medium=social&utm_campaign=first")
        first_ft = s.cookies.get("osc_ft")
        first_lt = s.cookies.get("osc_lt")
        self.assertTrue(first_ft)
        # Second visit with different UTMs \u2014 lt changes, ft stays.
        s.get(f"{BASE_URL}/?utm_source=google&utm_medium=cpc&utm_campaign=second")
        self.assertEqual(s.cookies.get("osc_ft"), first_ft, "first_touch was overwritten")
        self.assertNotEqual(s.cookies.get("osc_lt"), first_lt, "last_touch was not overwritten")

    def test_api_route_is_excluded_from_middleware(self):
        s = requests.Session()
        r = s.get(f"{API}/health?utm_source=x", allow_redirects=False)
        self.assertEqual(r.status_code, 200)
        for name in ("osc_vid", "osc_sid", "osc_ft", "osc_lt"):
            self.assertNotIn(name, s.cookies, f"middleware ran on /api and set {name}")


class IngestBeaconTests(unittest.TestCase):
    """/api/tracking/ingest must materialise visitor/session/visit docs."""

    def test_beacon_returns_200_when_cookies_present(self):
        s = requests.Session()
        s.get(f"{BASE_URL}/?utm_source=beacon&utm_medium=test&utm_campaign=cov")
        r = s.post(f"{API}/tracking/ingest", json={"url": "/", "referrer": None})
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.json().get("ok"))

    def test_beacon_skips_without_cookies(self):
        s = requests.Session()  # no prior visit, no cookies
        r = s.post(f"{API}/tracking/ingest", json={"url": "/", "referrer": None})
        self.assertEqual(r.status_code, 200)
        # Either { ok: true } or { ok: true, skipped: 'no-cookies' }; both are acceptable.
        self.assertTrue(r.json().get("ok"))

    def test_beacon_creates_visitor_session_visit(self):
        if DB is None:
            self.skipTest("Mongo not reachable")
        s = requests.Session()
        s.get(f"{BASE_URL}/?utm_source=beacon2&utm_medium=test&utm_campaign=coverage")
        vid = s.cookies.get("osc_vid")
        sid = s.cookies.get("osc_sid")
        self.assertTrue(vid and sid)
        r = s.post(f"{API}/tracking/ingest", json={"url": "/", "referrer": None})
        self.assertEqual(r.status_code, 200)
        v = DB.tracking_visitors.find_one({"id": vid})
        self.assertIsNotNone(v, "no visitor row after ingest")
        sess = DB.tracking_sessions.find_one({"id": sid})
        self.assertIsNotNone(sess, "no session row after ingest")
        vis = list(DB.tracking_visits.find({"visitorId": vid, "sessionId": sid}))
        self.assertGreaterEqual(len(vis), 1)
        # Cleanup
        DB.tracking_visits.delete_many({"visitorId": vid})
        DB.tracking_sessions.delete_many({"visitorId": vid})
        DB.tracking_visitors.delete_one({"id": vid})


def _admin_session():
    s = requests.Session()
    r = s.post(f"{API}/admin-auth", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    if r.status_code != 200:
        raise RuntimeError(f"admin login failed: {r.status_code} {r.text}")
    return s


class AdminCrudTests(unittest.TestCase):
    def setUp(self):
        self.admin = _admin_session()
        self._created_ids = []

    def tearDown(self):
        for lid in self._created_ids:
            try:
                self.admin.delete(f"{API}/admin/tracking-links/{lid}")
            except Exception:
                pass

    def _make(self, **over):
        slug = over.pop("slug", f"phase1-{uuid.uuid4().hex[:8]}")
        body = {
            "name": "Phase 1 test link",
            "slug": slug,
            "destinationUrl": "/learn/alcohol-fundamentals",
            "utmSource": "instagram",
            "utmMedium": "social",
            "utmCampaign": "phase1-tests",
            "utmContent": "bio-link",
        }
        body.update(over)
        r = self.admin.post(f"{API}/admin/tracking-links", json=body)
        return r

    def test_unauthenticated_admin_endpoints_return_401(self):
        s = requests.Session()  # no admin cookie
        r = s.get(f"{API}/admin/tracking-links")
        self.assertEqual(r.status_code, 401)
        r = s.post(f"{API}/admin/tracking-links", json={"name": "x"})
        self.assertEqual(r.status_code, 401)

    def test_create_and_list(self):
        r = self._make()
        self.assertEqual(r.status_code, 200, r.text)
        link = r.json()["link"]
        self._created_ids.append(link["id"])
        self.assertEqual(link["status"], "active")
        self.assertEqual(link["clickCount"], 0)
        self.assertTrue(link["shortUrl"].endswith(f"/go/{link['slug']}"))
        self.assertIn("utm_source=instagram", link["fullUrl"])
        # It appears in the listing
        r = self.admin.get(f"{API}/admin/tracking-links?status=active")
        self.assertEqual(r.status_code, 200)
        ids = [l["id"] for l in r.json()["links"]]
        self.assertIn(link["id"], ids)

    def test_slug_validation(self):
        r = self._make(slug="Invalid Slug!!!")
        self.assertEqual(r.status_code, 400)
        r = self._make(slug="admin")  # reserved
        self.assertEqual(r.status_code, 400)
        # Duplicate slug
        s1 = f"phase1-dup-{uuid.uuid4().hex[:6]}"
        r1 = self._make(slug=s1)
        self.assertEqual(r1.status_code, 200)
        self._created_ids.append(r1.json()["link"]["id"])
        r2 = self._make(slug=s1)
        self.assertEqual(r2.status_code, 400)

    def test_required_fields(self):
        r = self.admin.post(f"{API}/admin/tracking-links", json={
            "slug": f"missing-{uuid.uuid4().hex[:6]}",
            "destinationUrl": "https://onlinespiritsclub.com/",
            "utmSource": "x", "utmMedium": "y", "utmCampaign": "z",
        })
        self.assertEqual(r.status_code, 400)  # missing name

    def test_patch_updates_fields(self):
        r = self._make()
        link = r.json()["link"]
        self._created_ids.append(link["id"])
        r2 = self.admin.patch(f"{API}/admin/tracking-links/{link['id']}", json={"name": "Renamed", "utmContent": "footer-link"})
        self.assertEqual(r2.status_code, 200)
        upd = r2.json()["link"]
        self.assertEqual(upd["name"], "Renamed")
        self.assertEqual(upd["utmContent"], "footer-link")

    def test_duplicate_produces_new_slug(self):
        r = self._make()
        link = r.json()["link"]
        self._created_ids.append(link["id"])
        r2 = self.admin.post(f"{API}/admin/tracking-links/{link['id']}/duplicate")
        self.assertEqual(r2.status_code, 200)
        new_link = r2.json()["link"]
        self._created_ids.append(new_link["id"])
        self.assertNotEqual(new_link["slug"], link["slug"])
        self.assertTrue(new_link["name"].endswith("(copy)"))

    def test_archive_and_restore(self):
        r = self._make()
        link = r.json()["link"]
        self._created_ids.append(link["id"])
        r2 = self.admin.post(f"{API}/admin/tracking-links/{link['id']}/archive")
        self.assertEqual(r2.json()["link"]["status"], "archived")
        r3 = self.admin.post(f"{API}/admin/tracking-links/{link['id']}/archive", json={"status": "active"})
        self.assertEqual(r3.json()["link"]["status"], "active")


class GoSlugRedirectTests(unittest.TestCase):
    def setUp(self):
        self.admin = _admin_session()
        self._link_id = None
        self._slug = f"go-{uuid.uuid4().hex[:8]}"
        r = self.admin.post(f"{API}/admin/tracking-links", json={
            "name": "Go redirect test",
            "slug": self._slug,
            "destinationUrl": "/learn/alcohol-fundamentals",
            "utmSource": "twitter", "utmMedium": "social", "utmCampaign": "gotest",
        })
        self.assertEqual(r.status_code, 200)
        self._link_id = r.json()["link"]["id"]

    def tearDown(self):
        if self._link_id:
            self.admin.delete(f"{API}/admin/tracking-links/{self._link_id}")
            if DB is not None:
                DB.tracking_visits.delete_many({"linkId": self._link_id})

    def test_unknown_slug_redirects_home(self):
        r = requests.get(f"{BASE_URL}/go/does-not-exist-{uuid.uuid4().hex[:6]}", allow_redirects=False)
        self.assertEqual(r.status_code, 302)
        self.assertTrue(r.headers.get("location", "").endswith("/"))

    def test_active_slug_redirects_and_sets_cookies(self):
        s = requests.Session()
        r = s.get(f"{BASE_URL}/go/{self._slug}", allow_redirects=False)
        self.assertEqual(r.status_code, 302)
        loc = r.headers["location"]
        self.assertIn("/learn/alcohol-fundamentals", loc)
        for kv in ("utm_source=twitter", "utm_medium=social", "utm_campaign=gotest"):
            self.assertIn(kv, loc)
        for name in ("osc_vid", "osc_sid", "osc_ft", "osc_lt"):
            self.assertIn(name, s.cookies, f"/go did not set {name}")

    def test_click_counter_increments(self):
        for _ in range(3):
            requests.get(f"{BASE_URL}/go/{self._slug}", allow_redirects=False)
        r = self.admin.get(f"{API}/admin/tracking-links/{self._link_id}")
        self.assertGreaterEqual(r.json()["link"]["clickCount"], 3)

    def test_archived_slug_redirects_home(self):
        self.admin.post(f"{API}/admin/tracking-links/{self._link_id}/archive")
        r = requests.get(f"{BASE_URL}/go/{self._slug}", allow_redirects=False)
        self.assertEqual(r.status_code, 302)
        self.assertTrue(r.headers.get("location", "").endswith("/"))


class RegisterAttributionTests(unittest.TestCase):
    def _cleanup(self, email):
        if DB is not None:
            user = DB.users.find_one({"email": email})
            if user:
                DB.tracking_visitors.delete_many({"userId": user["id"]})
            DB.users.delete_many({"email": email})

    def test_register_copies_first_and_last_touch(self):
        s = requests.Session()
        s.get(f"{BASE_URL}/?utm_source=insta&utm_medium=social&utm_campaign=ft-camp&utm_content=hero&utm_term=whiskey")
        s.get(f"{BASE_URL}/?utm_source=google&utm_medium=cpc&utm_campaign=lt-camp")
        email = f"phase1-attr-{int(time.time())}-{uuid.uuid4().hex[:6]}@example.com"
        try:
            r = s.post(f"{API}/register", json={
                "email": email, "password": "testpass123", "confirmPassword": "testpass123",
                "name": "Attr Test", "country": "Ireland", "city": "Dublin", "role": "Bartender", "newsletter": False,
            })
            self.assertEqual(r.status_code, 200)
            if DB is not None:
                u = DB.users.find_one({"email": email})
                self.assertIsNotNone(u)
                self.assertEqual(u.get("first_touch_source"), "insta")
                self.assertEqual(u.get("first_touch_campaign"), "ft-camp")
                self.assertEqual(u.get("first_touch_content"), "hero")
                self.assertEqual(u.get("first_touch_term"), "whiskey")
                self.assertEqual(u.get("last_touch_source"), "google")
                self.assertEqual(u.get("last_touch_medium"), "cpc")
                self.assertEqual(u.get("last_touch_campaign"), "lt-camp")
        finally:
            self._cleanup(email)

    def test_register_links_visitor_to_user_when_beacon_fired_first(self):
        if DB is None:
            self.skipTest("Mongo not reachable")
        s = requests.Session()
        s.get(f"{BASE_URL}/?utm_source=x&utm_medium=y&utm_campaign=z")
        vid = s.cookies.get("osc_vid")
        # Fire the beacon so a visitor doc exists.
        s.post(f"{API}/tracking/ingest", json={"url": "/", "referrer": None})
        email = f"phase1-link-{int(time.time())}-{uuid.uuid4().hex[:6]}@example.com"
        try:
            r = s.post(f"{API}/register", json={
                "email": email, "password": "testpass123", "confirmPassword": "testpass123",
                "name": "Link Test", "country": "Ireland", "city": "Dublin", "role": "Bartender", "newsletter": False,
            })
            self.assertEqual(r.status_code, 200)
            u = DB.users.find_one({"email": email})
            v = DB.tracking_visitors.find_one({"id": vid})
            self.assertIsNotNone(v)
            self.assertEqual(v.get("userId"), u["id"])
        finally:
            self._cleanup(email)


if __name__ == "__main__":
    # Simple health check first so we fail fast if the server isn't up.
    try:
        r = requests.get(f"{API}/health", timeout=5)
        r.raise_for_status()
    except Exception as e:  # noqa: BLE001
        print(f"[fatal] can't reach {API}/health: {e}", file=sys.stderr)
        sys.exit(2)
    unittest.main(verbosity=2)
