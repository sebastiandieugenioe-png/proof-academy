#!/usr/bin/env python3
"""
Backend regression test suite for Session 6: Security-audit remediation (SEC-001..005 + hardening)

CRITICAL: The auth shape has changed. Session identity is now an HTTP-only cookie called `osc_user`,
set by /api/register and /api/login. This test harness uses requests.Session() to maintain cookies.
Caller-supplied `userId` in body, query, or `x-user-id` header is IGNORED by the server.
"""

import os
import sys
import requests
import time
from pymongo import MongoClient

# Configuration
BASE_URL = os.getenv("NEXT_PUBLIC_BASE_URL", "https://proof-academy.preview.emergentagent.com")
API_BASE = f"{BASE_URL}/api"
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "osc_db")

# Test state
test_users = []
test_pages = []
test_reviews = []
test_comments = []

def get_db():
    """Get MongoDB database connection"""
    client = MongoClient(MONGO_URL)
    return client[DB_NAME]

def cleanup():
    """Clean up all test data"""
    print("\n🧹 CLEANUP:")
    db = get_db()
    
    # Delete test users
    if test_users:
        result = db.users.delete_many({"id": {"$in": test_users}})
        print(f"   - Deleted {result.deleted_count} test users")
    
    # Delete test pages
    if test_pages:
        result = db.pages.delete_many({"id": {"$in": test_pages}})
        print(f"   - Deleted {result.deleted_count} test pages")
    
    # Delete test reviews
    if test_reviews:
        result = db.reviews.delete_many({"id": {"$in": test_reviews}})
        print(f"   - Deleted {result.deleted_count} test reviews")
    
    # Delete test comments
    if test_comments:
        result = db.comments.delete_many({"id": {"$in": test_comments}})
        print(f"   - Deleted {result.deleted_count} test comments")
    
    # Delete test progress
    if test_users:
        result = db.progress.delete_many({"userId": {"$in": test_users}})
        print(f"   - Deleted {result.deleted_count} test progress records")
    
    # Delete test newsletter entries
    if test_users:
        db_users = list(db.users.find({"id": {"$in": test_users}}, {"email": 1}))
        emails = [u["email"] for u in db_users]
        if emails:
            result = db.newsletter.delete_many({"email": {"$in": emails}})
            print(f"   - Deleted {result.deleted_count} test newsletter entries")

def test_positive_cookie_auth_flow():
    """Test 1-7: Positive tests for cookie-based authentication"""
    print("\n✅ TEST 1-7: Positive Cookie Auth Flow")
    
    # Test 1: Register → 200, Set-Cookie, no passwordHash
    print("   Test 1: Register with cookie")
    session = requests.Session()
    email = f"test-sec-{int(time.time())}@example.com"
    payload = {
        "email": email,
        "password": "SecurePass123",
        "confirmPassword": "SecurePass123",
        "name": "Security Test User",
        "country": "United States",
        "city": "San Francisco",
        "role": "Cocktail enthusiast",
        "newsletter": True
    }
    
    try:
        resp = session.post(f"{API_BASE}/register", json=payload)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "user" in data, "Response missing user"
        assert "passwordHash" not in data["user"], "Response contains passwordHash (security leak)"
        assert "_id" not in data["user"], "Response contains _id (should be sanitized)"
        assert data["user"]["email"] == email, "Email mismatch"
        
        # Check Set-Cookie header
        cookies = resp.cookies
        assert "osc_user" in cookies, "Missing osc_user cookie"
        
        user_id = data["user"]["id"]
        test_users.append(user_id)
        print(f"      ✅ Register successful, userId={user_id}, cookie set")
        
        # Test 2: GET /api/me on same session → 200 with user
        print("   Test 2: GET /api/me with cookie")
        resp = session.get(f"{API_BASE}/me")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data["id"] == user_id, "User ID mismatch"
        assert "passwordHash" not in data, "Response contains passwordHash"
        assert data["hasPassword"] == True, "hasPassword should be True"
        print(f"      ✅ GET /api/me successful")
        
        # Test 3: POST /api/me/update on same session (no userId in body)
        print("   Test 3: POST /api/me/update with cookie")
        resp = session.post(f"{API_BASE}/me/update", json={"name": "Updated Security User"})
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data["user"]["name"] == "Updated Security User", "Name not updated"
        assert "passwordHash" not in data["user"], "Response contains passwordHash"
        print(f"      ✅ Profile update successful")
        
        # Test 4: POST /api/progress on same session
        print("   Test 4: POST /api/progress with cookie")
        resp = session.post(f"{API_BASE}/progress", json={
            "courseSlug": "alcohol-fundamentals",
            "lessonSlug": "what-is-alcohol",
            "completed": True,
            "step": "quiz",
            "minutesSpent": 5
        })
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data["ok"] == True, "Progress not recorded"
        assert data["progress"]["userId"] == user_id, "Progress userId mismatch"
        print(f"      ✅ Progress recorded successfully")
        
        # Test 5: POST /api/reviews/answer with valid reviewId
        print("   Test 5: POST /api/reviews/answer with cookie")
        # First, get a review card
        db = get_db()
        review = db.reviews.find_one({"userId": user_id})
        if review:
            test_reviews.append(review["id"])
            resp = session.post(f"{API_BASE}/reviews/answer", json={
                "reviewId": review["id"],
                "grade": "easy"
            })
            assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
            data = resp.json()
            assert data["ok"] == True, "Review answer not recorded"
            print(f"      ✅ Review answer recorded successfully")
        else:
            print(f"      ⚠️  No review cards found (expected after completing lesson)")
        
        # Test 6: POST /api/comments → 200, no userId in response
        print("   Test 6: POST /api/comments with cookie")
        resp = session.post(f"{API_BASE}/comments", json={
            "courseSlug": "alcohol-fundamentals",
            "lessonSlug": "what-is-alcohol",
            "text": "This is a test comment for security testing"
        })
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data["ok"] == True, "Comment not created"
        assert "userId" not in data["comment"], "Comment response contains userId (BOLA vulnerability)"
        test_comments.append(data["comment"]["id"])
        print(f"      ✅ Comment created, userId not exposed")
        
        # Verify GET /api/comments also doesn't expose userId
        print("   Test 6b: GET /api/comments doesn't expose userId")
        resp = session.get(f"{API_BASE}/comments/alcohol-fundamentals/what-is-alcohol")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        comments = resp.json()
        for comment in comments:
            assert "userId" not in comment, f"Public comment contains userId (BOLA vulnerability): {comment}"
        print(f"      ✅ GET /api/comments doesn't expose userId")
        
        # Test 7: POST /api/logout clears cookie, GET /api/me returns 401
        print("   Test 7: POST /api/logout clears cookie")
        resp = session.post(f"{API_BASE}/logout")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        # Verify cookie is cleared
        resp = session.get(f"{API_BASE}/me")
        assert resp.status_code == 401, f"Expected 401 after logout, got {resp.status_code}"
        print(f"      ✅ Logout successful, session cleared")
        
        # Test 7b: POST /api/login → 200 with Set-Cookie, no needsPasswordSetup
        print("   Test 7b: POST /api/login with valid credentials")
        session2 = requests.Session()
        resp = session2.post(f"{API_BASE}/login", json={
            "email": email,
            "password": "SecurePass123"
        })
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "user" in data, "Response missing user"
        assert "needsPasswordSetup" not in data, "Response contains needsPasswordSetup (should not be present)"
        assert "osc_user" in resp.cookies, "Missing osc_user cookie"
        print(f"      ✅ Login successful, no needsPasswordSetup field")
        
        print("   ✅ ALL POSITIVE TESTS PASSED")
        return True
        
    except AssertionError as e:
        print(f"      ❌ FAILED: {e}")
        return False
    except Exception as e:
        print(f"      ❌ ERROR: {e}")
        return False

def test_negative_auth_bypass_attempts():
    """Test 8-11: Negative tests - auth bypass attempts must be rejected"""
    print("\n❌ TEST 8-11: Negative Auth Bypass Attempts")
    
    # Create a victim user for testing
    session_victim = requests.Session()
    email_victim = f"victim-{int(time.time())}@example.com"
    payload = {
        "email": email_victim,
        "password": "VictimPass123",
        "confirmPassword": "VictimPass123",
        "name": "Victim User",
        "country": "Canada",
        "city": "Toronto",
        "role": "Bar manager",
        "newsletter": False
    }
    
    try:
        resp = session_victim.post(f"{API_BASE}/register", json=payload)
        assert resp.status_code == 200, f"Victim registration failed: {resp.status_code}"
        victim_data = resp.json()
        victim_id = victim_data["user"]["id"]
        test_users.append(victim_id)
        print(f"   Setup: Created victim user {victim_id}")
        
        # Test 8: GET /api/me?userId=<victim-id> with NO cookie → 401
        print("   Test 8: GET /api/me?userId=<victim-id> without cookie")
        session_attacker = requests.Session()
        resp = session_attacker.get(f"{API_BASE}/me?userId={victim_id}")
        assert resp.status_code == 401, f"Expected 401, got {resp.status_code}: {resp.text}"
        print(f"      ✅ Query param userId ignored, 401 returned")
        
        # Test 9: GET /api/me with x-user-id header and NO cookie → 401
        print("   Test 9: GET /api/me with x-user-id header without cookie")
        resp = session_attacker.get(f"{API_BASE}/me", headers={"x-user-id": victim_id})
        assert resp.status_code == 401, f"Expected 401, got {resp.status_code}: {resp.text}"
        print(f"      ✅ x-user-id header ignored, 401 returned")
        
        # Test 10: POST /api/me/update with userId in body and NO cookie → 401
        print("   Test 10: POST /api/me/update with userId in body without cookie")
        resp = session_attacker.post(f"{API_BASE}/me/update", json={
            "userId": victim_id,
            "name": "Owned by Attacker"
        })
        assert resp.status_code == 401, f"Expected 401, got {resp.status_code}: {resp.text}"
        
        # Verify victim's profile is unchanged
        resp_victim = session_victim.get(f"{API_BASE}/me")
        assert resp_victim.status_code == 200, "Victim session broken"
        victim_profile = resp_victim.json()
        assert victim_profile["name"] == "Victim User", f"Victim profile was modified! Name: {victim_profile['name']}"
        print(f"      ✅ Body userId ignored, 401 returned, victim profile unchanged")
        
        # Test 11: POST /api/me/update from session A with userId=B in body → updates A, not B
        print("   Test 11: Cross-session tampering attempt")
        # Create attacker user with valid session
        session_attacker2 = requests.Session()
        email_attacker = f"attacker-{int(time.time())}@example.com"
        payload_attacker = {
            "email": email_attacker,
            "password": "AttackerPass123",
            "confirmPassword": "AttackerPass123",
            "name": "Attacker User",
            "country": "Russia",
            "city": "Moscow",
            "role": "Other",
            "newsletter": False
        }
        resp = session_attacker2.post(f"{API_BASE}/register", json=payload_attacker)
        assert resp.status_code == 200, f"Attacker registration failed: {resp.status_code}"
        attacker_data = resp.json()
        attacker_id = attacker_data["user"]["id"]
        test_users.append(attacker_id)
        
        # Attacker tries to update victim's profile by sending victim's userId in body
        resp = session_attacker2.post(f"{API_BASE}/me/update", json={
            "userId": victim_id,
            "name": "Owned by Attacker Session"
        })
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        # Verify the update was applied to attacker, not victim
        assert data["user"]["id"] == attacker_id, "Update was applied to wrong user!"
        assert data["user"]["name"] == "Owned by Attacker Session", "Attacker's own profile not updated"
        
        # Verify victim's profile is still unchanged
        resp_victim = session_victim.get(f"{API_BASE}/me")
        victim_profile = resp_victim.json()
        assert victim_profile["name"] == "Victim User", f"Victim profile was modified! Name: {victim_profile['name']}"
        print(f"      ✅ Body userId ignored, update applied to cookie owner (attacker), victim unchanged")
        
        print("   ✅ ALL NEGATIVE AUTH TESTS PASSED")
        return True
        
    except AssertionError as e:
        print(f"      ❌ FAILED: {e}")
        return False
    except Exception as e:
        print(f"      ❌ ERROR: {e}")
        return False

def test_nosql_injection_protection():
    """Test 12: NoSQL operator injection must be rejected"""
    print("\n🛡️  TEST 12: NoSQL Injection Protection")
    
    # Create a user with valid session
    session = requests.Session()
    email = f"test-nosql-{int(time.time())}@example.com"
    payload = {
        "email": email,
        "password": "NoSQLTest123",
        "confirmPassword": "NoSQLTest123",
        "name": "NoSQL Test User",
        "country": "Germany",
        "city": "Berlin",
        "role": "Spirits enthusiast",
        "newsletter": False
    }
    
    try:
        resp = session.post(f"{API_BASE}/register", json=payload)
        assert resp.status_code == 200, f"Registration failed: {resp.status_code}"
        user_id = resp.json()["user"]["id"]
        test_users.append(user_id)
        
        # Test 12a: Unauthenticated NoSQL injection attempt → 401
        print("   Test 12a: NoSQL injection while unauthenticated")
        session_unauth = requests.Session()
        resp = session_unauth.post(f"{API_BASE}/reviews/answer", json={
            "reviewId": {"$ne": None},
            "grade": "easy"
        })
        assert resp.status_code == 401, f"Expected 401, got {resp.status_code}: {resp.text}"
        print(f"      ✅ Unauthenticated NoSQL injection rejected with 401")
        
        # Test 12b: Authenticated NoSQL injection attempt → 400 (invalid id)
        print("   Test 12b: NoSQL injection while authenticated")
        resp = session.post(f"{API_BASE}/reviews/answer", json={
            "reviewId": {"$ne": None},
            "grade": "easy"
        })
        assert resp.status_code == 400, f"Expected 400, got {resp.status_code}: {resp.text}"
        error_data = resp.json()
        assert "error" in error_data, "Error response missing error field"
        print(f"      ✅ Authenticated NoSQL injection rejected with 400: {error_data['error']}")
        
        print("   ✅ NOSQL INJECTION PROTECTION PASSED")
        return True
        
    except AssertionError as e:
        print(f"      ❌ FAILED: {e}")
        return False
    except Exception as e:
        print(f"      ❌ ERROR: {e}")
        return False

def test_legacy_flow_disabled():
    """Test 13-15: Legacy password-claim flow must be disabled"""
    print("\n🚫 TEST 13-15: Legacy Flow Disabled")
    
    try:
        # Test 13: POST /api/set-password → 410
        print("   Test 13: POST /api/set-password returns 410")
        resp = requests.post(f"{API_BASE}/set-password", json={
            "email": "legacy@example.com",
            "password": "NewPass123",
            "confirmPassword": "NewPass123"
        })
        assert resp.status_code == 410, f"Expected 410, got {resp.status_code}: {resp.text}"
        print(f"      ✅ /api/set-password returns 410 (disabled)")
        
        # Test 14: POST /api/register with existing legacy email → 409, no passwordHash added
        print("   Test 14: Register with existing legacy email")
        # Create a legacy user (no passwordHash) directly in DB
        db = get_db()
        legacy_email = f"legacy-{int(time.time())}@example.com"
        legacy_user = {
            "id": f"legacy-{int(time.time())}",
            "email": legacy_email,
            "name": "Legacy User",
            "provider": "email",
            "authMethod": "email",
            "verified": True,
            "newsletter": False,
            "country": "France",
            "city": "Paris",
            "role": "Bartender",
            "createdAt": time.time(),
            "updatedAt": time.time()
        }
        db.users.insert_one(legacy_user)
        test_users.append(legacy_user["id"])
        
        # Try to register with the same email
        resp = requests.post(f"{API_BASE}/register", json={
            "email": legacy_email,
            "password": "NewPass123",
            "confirmPassword": "NewPass123",
            "name": "Attacker",
            "country": "USA",
            "city": "New York",
            "role": "Other",
            "newsletter": False
        })
        assert resp.status_code == 409, f"Expected 409, got {resp.status_code}: {resp.text}"
        
        # Verify the legacy user still has no passwordHash
        updated_user = db.users.find_one({"id": legacy_user["id"]})
        assert "passwordHash" not in updated_user or updated_user.get("passwordHash") is None, \
            "Legacy user was modified with passwordHash!"
        print(f"      ✅ Register with legacy email returns 409, no passwordHash added")
        
        # Test 15: POST /api/login with legacy email → 401 (no 428, no userId echo)
        print("   Test 15: Login with legacy email returns 401")
        resp = requests.post(f"{API_BASE}/login", json={
            "email": legacy_email,
            "password": "AnyPassword123"
        })
        assert resp.status_code == 401, f"Expected 401, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "needsPasswordSetup" not in data, "Response contains needsPasswordSetup (should not be present)"
        assert "userId" not in data, "Response contains userId (should not be present)"
        print(f"      ✅ Login with legacy email returns 401, no needsPasswordSetup or userId")
        
        print("   ✅ LEGACY FLOW DISABLED TESTS PASSED")
        return True
        
    except AssertionError as e:
        print(f"      ❌ FAILED: {e}")
        return False
    except Exception as e:
        print(f"      ❌ ERROR: {e}")
        return False

def test_rate_limiting():
    """Test 16: Rate limiting on /api/login"""
    print("\n⏱️  TEST 16: Rate Limiting on /api/login")
    
    try:
        # Make 8+ rapid failed login attempts
        print("   Making 10 rapid failed login attempts...")
        email = f"ratelimit-{int(time.time())}@example.com"
        rate_limited = False
        retry_after = None
        
        for i in range(10):
            resp = requests.post(f"{API_BASE}/login", json={
                "email": email,
                "password": "WrongPassword123"
            })
            
            if resp.status_code == 429:
                rate_limited = True
                retry_after = resp.headers.get("Retry-After")
                print(f"      ✅ Rate limited on attempt {i+1}, status=429, Retry-After={retry_after}")
                break
            elif resp.status_code == 401:
                print(f"      Attempt {i+1}: 401 (expected)")
            else:
                print(f"      ⚠️  Attempt {i+1}: Unexpected status {resp.status_code}")
        
        assert rate_limited, "Rate limiting did not trigger after 10 attempts"
        assert retry_after is not None, "Retry-After header missing"
        assert int(retry_after) > 0, f"Invalid Retry-After value: {retry_after}"
        
        print(f"   ✅ RATE LIMITING TEST PASSED")
        return True
        
    except AssertionError as e:
        print(f"      ❌ FAILED: {e}")
        return False
    except Exception as e:
        print(f"      ❌ ERROR: {e}")
        return False

def test_security_headers():
    """Test 17-18: Security headers on HTML and API responses"""
    print("\n🔒 TEST 17-18: Security Headers")
    
    try:
        # Test 17: GET / must include security headers
        print("   Test 17: Security headers on GET /")
        resp = requests.get(BASE_URL)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        
        headers = resp.headers
        
        # Check X-Frame-Options
        assert "X-Frame-Options" in headers, "Missing X-Frame-Options header"
        assert headers["X-Frame-Options"] == "SAMEORIGIN", \
            f"X-Frame-Options should be SAMEORIGIN, got {headers['X-Frame-Options']}"
        print(f"      ✅ X-Frame-Options: SAMEORIGIN")
        
        # Check X-Content-Type-Options
        assert "X-Content-Type-Options" in headers, "Missing X-Content-Type-Options header"
        assert headers["X-Content-Type-Options"] == "nosniff", \
            f"X-Content-Type-Options should be nosniff, got {headers['X-Content-Type-Options']}"
        print(f"      ✅ X-Content-Type-Options: nosniff")
        
        # Check Referrer-Policy
        assert "Referrer-Policy" in headers, "Missing Referrer-Policy header"
        assert "strict-origin-when-cross-origin" in headers["Referrer-Policy"], \
            f"Referrer-Policy should contain strict-origin-when-cross-origin, got {headers['Referrer-Policy']}"
        print(f"      ✅ Referrer-Policy: {headers['Referrer-Policy']}")
        
        # Check Content-Security-Policy
        assert "Content-Security-Policy" in headers, "Missing Content-Security-Policy header"
        csp = headers["Content-Security-Policy"]
        assert "frame-ancestors *" not in csp, "CSP contains 'frame-ancestors *' (insecure)"
        print(f"      ✅ Content-Security-Policy present and doesn't contain 'frame-ancestors *'")
        
        # Test 18: OPTIONS /api/courses does NOT return Access-Control-Allow-Origin: *
        print("   Test 18: CORS headers on OPTIONS /api/courses")
        resp = requests.options(f"{API_BASE}/courses")
        headers = resp.headers
        
        if "Access-Control-Allow-Origin" in headers:
            origin = headers["Access-Control-Allow-Origin"]
            assert origin != "*", f"Access-Control-Allow-Origin is wildcard (*), should be specific origin"
            print(f"      ✅ Access-Control-Allow-Origin: {origin} (not wildcard)")
        else:
            print(f"      ✅ Access-Control-Allow-Origin not present (same-origin only)")
        
        print("   ✅ SECURITY HEADERS TESTS PASSED")
        return True
        
    except AssertionError as e:
        print(f"      ❌ FAILED: {e}")
        return False
    except Exception as e:
        print(f"      ❌ ERROR: {e}")
        return False

def test_html_sanitizer():
    """Test SEC-005: HTML sanitizer strips iframes and data: URIs"""
    print("\n🧹 TEST SEC-005: HTML Sanitizer")
    
    # Get admin session
    admin_session = requests.Session()
    admin_email = os.getenv("ADMIN_EMAILS", "sebastiandieugenioe@gmail.com").split(",")[0]
    admin_password = os.getenv("ADMIN_PASSWORD", "preview-only-change-in-prod")
    
    try:
        # Admin login
        print("   Logging in as admin...")
        resp = admin_session.post(f"{API_BASE}/admin-auth", json={
            "email": admin_email,
            "password": admin_password
        })
        assert resp.status_code == 200, f"Admin login failed: {resp.status_code}: {resp.text}"
        print(f"      ✅ Admin logged in")
        
        # Test: POST /api/admin/pages with malicious HTML
        print("   Test: Creating page with malicious HTML")
        malicious_html = """
        <h1>Test Page</h1>
        <p>This is safe content.</p>
        <iframe src="https://evil.com/steal-cookies"></iframe>
        <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" alt="Evil">
        <img src="https://example.com/safe.jpg" alt="Safe">
        <script>alert('XSS')</script>
        """
        
        resp = admin_session.post(f"{API_BASE}/admin/pages", json={
            "title": "Sanitizer Test Page",
            "slug": f"sanitizer-test-{int(time.time())}",
            "seoTitle": "Sanitizer Test",
            "seoDescription": "Testing HTML sanitization",
            "contentHtml": malicious_html,
            "published": True
        })
        assert resp.status_code == 200, f"Page creation failed: {resp.status_code}: {resp.text}"
        data = resp.json()
        page_id = data["page"]["id"]
        test_pages.append(page_id)
        
        sanitized_html = data["page"]["contentHtml"]
        print(f"      Original HTML length: {len(malicious_html)}")
        print(f"      Sanitized HTML length: {len(sanitized_html)}")
        
        # Verify iframe is stripped
        assert "<iframe" not in sanitized_html.lower(), "Sanitizer did not strip <iframe>"
        print(f"      ✅ <iframe> stripped")
        
        # Verify data: URI is stripped
        assert "data:image" not in sanitized_html.lower(), "Sanitizer did not strip data: URI"
        print(f"      ✅ data: URI stripped")
        
        # Verify script is stripped
        assert "<script" not in sanitized_html.lower(), "Sanitizer did not strip <script>"
        print(f"      ✅ <script> stripped")
        
        # Verify safe content is preserved
        assert "<h1>Test Page</h1>" in sanitized_html, "Sanitizer removed safe <h1>"
        assert "This is safe content" in sanitized_html, "Sanitizer removed safe text"
        assert "https://example.com/safe.jpg" in sanitized_html, "Sanitizer removed safe image"
        print(f"      ✅ Safe content preserved")
        
        print("   ✅ HTML SANITIZER TEST PASSED")
        return True
        
    except AssertionError as e:
        print(f"      ❌ FAILED: {e}")
        return False
    except Exception as e:
        print(f"      ❌ ERROR: {e}")
        return False

def main():
    """Run all security regression tests"""
    print("=" * 80)
    print("SESSION 6: Security-Audit Remediation Backend Tests")
    print("=" * 80)
    print(f"API Base: {API_BASE}")
    print(f"MongoDB: {MONGO_URL}/{DB_NAME}")
    print("=" * 80)
    
    results = []
    
    try:
        # Run all test suites
        results.append(("Positive Cookie Auth Flow (Tests 1-7)", test_positive_cookie_auth_flow()))
        results.append(("Negative Auth Bypass (Tests 8-11)", test_negative_auth_bypass_attempts()))
        results.append(("NoSQL Injection Protection (Test 12)", test_nosql_injection_protection()))
        results.append(("Legacy Flow Disabled (Tests 13-15)", test_legacy_flow_disabled()))
        results.append(("Rate Limiting (Test 16)", test_rate_limiting()))
        results.append(("Security Headers (Tests 17-18)", test_security_headers()))
        results.append(("HTML Sanitizer (SEC-005)", test_html_sanitizer()))
        
    finally:
        # Always cleanup
        cleanup()
    
    # Print summary
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {name}")
    
    print("=" * 80)
    print(f"TOTAL: {passed}/{total} test suites passed ({passed*100//total}%)")
    print("=" * 80)
    
    if passed == total:
        print("\n🎉 ALL SECURITY TESTS PASSED!")
        sys.exit(0)
    else:
        print(f"\n⚠️  {total - passed} test suite(s) failed")
        sys.exit(1)

if __name__ == "__main__":
    main()
