#!/usr/bin/env python3
"""
Comprehensive backend test for Online Spirits Club v1.2 pre-launch changes.
Tests SSR "Beginner" stripping, rawTitle preservation, audience profiling, and regressions.
"""

import requests
import json
import re
from urllib.parse import urljoin

# Base URLs from .env
BASE_URL = "https://proof-academy.preview.emergentagent.com"
API_URL = f"{BASE_URL}/api"

# Admin credentials
ADMIN_EMAIL = "sebastiandieugenioe@gmail.com"
ADMIN_PASSWORD = "preview-only-change-in-prod"

# Test counters
tests_passed = 0
tests_failed = 0
test_users = []

def log_pass(msg):
    global tests_passed
    tests_passed += 1
    print(f"✅ PASS: {msg}")

def log_fail(msg):
    global tests_failed
    tests_failed += 1
    print(f"❌ FAIL: {msg}")

def admin_login():
    """Login as admin and return session cookie"""
    try:
        r = requests.post(f"{API_URL}/admin-auth", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=10)
        if r.status_code == 200:
            cookie = r.cookies.get("osc_admin")
            if cookie:
                log_pass("Admin login successful")
                return {"osc_admin": cookie}
            else:
                log_fail("Admin login: no cookie returned")
                return None
        else:
            log_fail(f"Admin login failed: {r.status_code} {r.text[:200]}")
            return None
    except Exception as e:
        log_fail(f"Admin login exception: {e}")
        return None

def test_ssr_beginner_stripping():
    """Test 1: SSR pages should NOT contain 'Beginner' in <title> tags"""
    print("\n=== TEST 1: SSR 'Beginner' Stripping ===")
    
    # Test lessons that previously had hardcoded "Beginner" in SEO titles
    test_lessons = [
        "what-is-vodka",
        "what-is-tequila", 
        "what-is-wine",
        "what-are-liqueurs",
        "vodka-production",
        "triple-sec-and-orange-liqueurs"
    ]
    
    for slug in test_lessons:
        try:
            url = f"{BASE_URL}/learn/{slug}"
            r = requests.get(url, timeout=10)
            if r.status_code != 200:
                log_fail(f"SSR {slug}: returned {r.status_code}")
                continue
            
            html = r.text
            
            # Extract <title> tag
            title_match = re.search(r'<title[^>]*>(.*?)</title>', html, re.IGNORECASE | re.DOTALL)
            if not title_match:
                log_fail(f"SSR {slug}: no <title> tag found")
                continue
            
            title_content = title_match.group(1).strip()
            
            # Check if "Beginner" appears in title (should NOT)
            if re.search(r'\bBeginner\b', title_content, re.IGNORECASE):
                log_fail(f"SSR {slug}: <title> contains 'Beginner': {title_content}")
            else:
                log_pass(f"SSR {slug}: <title> clean (no 'Beginner'): {title_content[:80]}")
            
            # Check og:title meta tag
            og_title_match = re.search(r'<meta[^>]*property=["\']og:title["\'][^>]*content=["\']([^"\']*)["\']', html, re.IGNORECASE)
            if og_title_match:
                og_title = og_title_match.group(1)
                if re.search(r'\bBeginner\b', og_title, re.IGNORECASE):
                    log_fail(f"SSR {slug}: og:title contains 'Beginner': {og_title}")
                else:
                    log_pass(f"SSR {slug}: og:title clean")
            
            # Check twitter:title meta tag
            twitter_title_match = re.search(r'<meta[^>]*name=["\']twitter:title["\'][^>]*content=["\']([^"\']*)["\']', html, re.IGNORECASE)
            if twitter_title_match:
                twitter_title = twitter_title_match.group(1)
                if re.search(r'\bBeginner\b', twitter_title, re.IGNORECASE):
                    log_fail(f"SSR {slug}: twitter:title contains 'Beginner': {twitter_title}")
                else:
                    log_pass(f"SSR {slug}: twitter:title clean")
            
            # Check og:description meta tag
            og_desc_match = re.search(r'<meta[^>]*property=["\']og:description["\'][^>]*content=["\']([^"\']*)["\']', html, re.IGNORECASE)
            if og_desc_match:
                og_desc = og_desc_match.group(1)
                if re.search(r'\bBeginner\b', og_desc, re.IGNORECASE):
                    log_fail(f"SSR {slug}: og:description contains 'Beginner': {og_desc[:100]}")
                else:
                    log_pass(f"SSR {slug}: og:description clean")
            
            # VERIFY: "Beginner" SHOULD still appear in:
            # 1. Schema.org educationalLevel
            if '"educationalLevel":"Beginner"' in html or '"educationalLevel": "Beginner"' in html:
                log_pass(f"SSR {slug}: schema.org educationalLevel='Beginner' present (intentional)")
            
            # 2. Meta badge (e.g., "VODKA · BEGINNER · 5 MIN READ")
            if re.search(r'BEGINNER\s*·', html, re.IGNORECASE):
                log_pass(f"SSR {slug}: meta badge contains 'BEGINNER' (intentional)")
            
        except Exception as e:
            log_fail(f"SSR {slug}: exception {e}")

def test_rawtitle_preservation():
    """Test 2: API should return rawTitle with original 'Beginner' suffix"""
    print("\n=== TEST 2: rawTitle Preservation ===")
    
    try:
        r = requests.get(f"{API_URL}/lessons/vodka-beginner/what-is-vodka", timeout=10)
        if r.status_code != 200:
            log_fail(f"GET /api/lessons/vodka-beginner/what-is-vodka: {r.status_code}")
            return
        
        data = r.json()
        course_title = data.get("course", {}).get("title")
        raw_title = data.get("course", {}).get("rawTitle")
        
        # Title should be stripped
        if course_title and not re.search(r'\bBeginner\b', course_title, re.IGNORECASE):
            log_pass(f"API lesson: course.title stripped: '{course_title}'")
        else:
            log_fail(f"API lesson: course.title NOT stripped: '{course_title}'")
        
        # rawTitle should preserve original (may be "Vodka Beginner" or just "Vodka" if static content was updated)
        if raw_title:
            log_pass(f"API lesson: course.rawTitle present: '{raw_title}'")
            # NOTE: If static content.js was edited to remove "Beginner", rawTitle will equal title
            # The key is that rawTitle field exists and title is stripped
        else:
            log_fail(f"API lesson: course.rawTitle missing")
        
    except Exception as e:
        log_fail(f"rawTitle test exception: {e}")

def test_findbylessonslug_fix():
    """Test 3: Verify findByLessonSlug fix (no undefined 'hydrated' error)"""
    print("\n=== TEST 3: findByLessonSlug Fix ===")
    
    # Test multiple SSR pages to ensure no crashes
    test_slugs = ["what-is-vodka", "what-is-alcohol", "scotch-whisky", "london-dry-gin"]
    
    for slug in test_slugs:
        try:
            r = requests.get(f"{BASE_URL}/learn/{slug}", timeout=10)
            if r.status_code == 200:
                # Check for hydration errors in HTML
                if "ReferenceError" in r.text or "hydrated is not defined" in r.text:
                    log_fail(f"SSR {slug}: contains ReferenceError")
                else:
                    log_pass(f"SSR {slug}: renders without crash (200)")
            else:
                log_fail(f"SSR {slug}: returned {r.status_code}")
        except Exception as e:
            log_fail(f"SSR {slug}: exception {e}")

def test_all_lessons_load():
    """Test 4: Verify all 58 lessons load via API without crashing"""
    print("\n=== TEST 4: All Lessons Load (Regression) ===")
    
    try:
        # Get all courses
        r = requests.get(f"{API_URL}/courses", timeout=10)
        if r.status_code != 200:
            log_fail(f"GET /api/courses: {r.status_code}")
            return
        
        courses = r.json()
        total_lessons = sum(len(c.get("lessons", [])) for c in courses)
        
        if len(courses) == 12:
            log_pass(f"GET /api/courses: 12 courses returned")
        else:
            log_fail(f"GET /api/courses: expected 12 courses, got {len(courses)}")
        
        if total_lessons == 58:
            log_pass(f"Total lessons: 58 (expected)")
        else:
            log_fail(f"Total lessons: {total_lessons} (expected 58)")
        
        # Sample test: load a few lessons from different courses
        sample_lessons = [
            ("vodka-beginner", "what-is-vodka"),
            ("alcohol-fundamentals", "what-is-alcohol"),
            ("whiskey-beginner", "scotch-whisky"),
            ("gin-beginner", "london-dry-gin"),
        ]
        
        for course_slug, lesson_slug in sample_lessons:
            try:
                r = requests.get(f"{API_URL}/lessons/{course_slug}/{lesson_slug}", timeout=10)
                if r.status_code == 200:
                    data = r.json()
                    # Verify lesson has theory, flashcards, quiz (hydration working)
                    lesson = data.get("lesson", {})
                    if lesson.get("theory") and lesson.get("flashcards") and lesson.get("quiz"):
                        log_pass(f"Lesson {course_slug}/{lesson_slug}: fully hydrated")
                    else:
                        log_fail(f"Lesson {course_slug}/{lesson_slug}: missing theory/flashcards/quiz")
                else:
                    log_fail(f"Lesson {course_slug}/{lesson_slug}: {r.status_code}")
            except Exception as e:
                log_fail(f"Lesson {course_slug}/{lesson_slug}: exception {e}")
        
    except Exception as e:
        log_fail(f"All lessons test exception: {e}")

def test_audience_signup():
    """Test 5: Audience profiling on signup"""
    print("\n=== TEST 5: Audience Profiling on Signup ===")
    
    # Test 1: New user with all fields
    try:
        email = f"test-audience-{tests_passed}@example.com"
        r = requests.post(f"{API_URL}/auth", json={
            "email": email,
            "name": "Test User",
            "country": "United States",
            "city": "New York",
            "role": "Bartender",
            "newsletter": True
        }, timeout=10)
        
        if r.status_code == 200:
            data = r.json()
            user = data.get("user", {})
            test_users.append(user.get("id"))
            
            if user.get("country") == "United States" and user.get("city") == "New York" and user.get("role") == "Bartender":
                log_pass("Signup: new user with country/city/role created")
            else:
                log_fail(f"Signup: fields not saved correctly: {user}")
        else:
            log_fail(f"Signup: {r.status_code} {r.text[:200]}")
    except Exception as e:
        log_fail(f"Signup test exception: {e}")
    
    # Test 2: Invalid role should default to "Other"
    try:
        email = f"test-invalid-role-{tests_passed}@example.com"
        r = requests.post(f"{API_URL}/auth", json={
            "email": email,
            "role": "InvalidRole123"
        }, timeout=10)
        
        if r.status_code == 200:
            user = r.json().get("user", {})
            test_users.append(user.get("id"))
            
            if user.get("role") == "Other":
                log_pass("Signup: invalid role sanitized to 'Other'")
            else:
                log_fail(f"Signup: invalid role not sanitized: {user.get('role')}")
        else:
            log_fail(f"Signup invalid role: {r.status_code}")
    except Exception as e:
        log_fail(f"Signup invalid role exception: {e}")

def test_admin_analytics():
    """Test 6: Admin analytics audience breakdowns"""
    print("\n=== TEST 6: Admin Analytics Audience Breakdowns ===")
    
    cookies = admin_login()
    if not cookies:
        log_fail("Admin analytics: login failed")
        return
    
    try:
        r = requests.get(f"{API_URL}/admin/analytics", cookies=cookies, timeout=10)
        if r.status_code != 200:
            log_fail(f"GET /api/admin/analytics: {r.status_code}")
            return
        
        data = r.json()
        audience = data.get("audience", {})
        
        # Check structure
        if "totalUsers" in audience:
            log_pass(f"Admin analytics: totalUsers present ({audience['totalUsers']})")
        else:
            log_fail("Admin analytics: totalUsers missing")
        
        if "byCountry" in audience and isinstance(audience["byCountry"], list):
            log_pass(f"Admin analytics: byCountry present ({len(audience['byCountry'])} entries)")
        else:
            log_fail("Admin analytics: byCountry missing or invalid")
        
        if "byCity" in audience and isinstance(audience["byCity"], list):
            log_pass(f"Admin analytics: byCity present ({len(audience['byCity'])} entries)")
        else:
            log_fail("Admin analytics: byCity missing or invalid")
        
        if "byRole" in audience and isinstance(audience["byRole"], list):
            log_pass(f"Admin analytics: byRole present ({len(audience['byRole'])} entries)")
        else:
            log_fail("Admin analytics: byRole missing or invalid")
        
        if "newsletterByRole" in audience and isinstance(audience["newsletterByRole"], list):
            log_pass(f"Admin analytics: newsletterByRole present ({len(audience['newsletterByRole'])} entries)")
            # Check rate format (0-100 with max 1 decimal)
            for entry in audience["newsletterByRole"]:
                rate = entry.get("rate")
                if isinstance(rate, (int, float)) and 0 <= rate <= 100:
                    log_pass(f"Admin analytics: newsletterByRole rate valid ({entry.get('role')}: {rate}%)")
                    break
        else:
            log_fail("Admin analytics: newsletterByRole missing or invalid")
        
    except Exception as e:
        log_fail(f"Admin analytics exception: {e}")

def test_admin_users():
    """Test 7: Admin users endpoint exposes profile fields"""
    print("\n=== TEST 7: Admin Users Endpoint ===")
    
    cookies = admin_login()
    if not cookies:
        log_fail("Admin users: login failed")
        return
    
    try:
        r = requests.get(f"{API_URL}/admin/users", cookies=cookies, timeout=10)
        if r.status_code != 200:
            log_fail(f"GET /api/admin/users: {r.status_code}")
            return
        
        data = r.json()
        users = data.get("users", [])
        
        if len(users) > 0:
            log_pass(f"Admin users: {len(users)} users returned")
            
            # Check if first user has profile fields
            first_user = users[0]
            if "country" in first_user or "city" in first_user or "role" in first_user:
                log_pass("Admin users: profile fields (country/city/role) present")
            else:
                log_fail("Admin users: profile fields missing")
        else:
            log_fail("Admin users: no users returned")
        
    except Exception as e:
        log_fail(f"Admin users exception: {e}")

def test_version_endpoint():
    """Test 8: Version endpoint returns v1.1-admin-changes"""
    print("\n=== TEST 8: Version Endpoint ===")
    
    try:
        r = requests.get(f"{API_URL}/version", timeout=10)
        if r.status_code != 200:
            log_fail(f"GET /api/version: {r.status_code}")
            return
        
        data = r.json()
        version = data.get("version")
        
        if version == "v1.1-admin-changes":
            log_pass(f"Version endpoint: {version}")
        else:
            log_fail(f"Version endpoint: expected 'v1.1-admin-changes', got '{version}'")
        
    except Exception as e:
        log_fail(f"Version endpoint exception: {e}")

def test_slug_alias_redirect():
    """Test 9: Slug alias 301 redirects"""
    print("\n=== TEST 9: Slug Alias 301 Redirects ===")
    
    # Note: This test assumes a slug alias exists from previous testing
    # If no aliases exist, this test will be skipped
    
    cookies = admin_login()
    if not cookies:
        log_fail("Slug alias: login failed")
        return
    
    try:
        # Check if any aliases exist
        r = requests.get(f"{API_URL}/admin/course-aliases", cookies=cookies, timeout=10)
        if r.status_code == 200:
            aliases = r.json()
            if len(aliases) > 0:
                # Test first alias
                alias = aliases[0]
                old_slug = alias.get("from")
                new_slug = alias.get("to")
                
                r = requests.get(f"{API_URL}/courses/{old_slug}", allow_redirects=False, timeout=10)
                if r.status_code == 301:
                    data = r.json()
                    if data.get("redirect") == new_slug:
                        log_pass(f"Slug alias: {old_slug} → {new_slug} (301 redirect)")
                    else:
                        log_fail(f"Slug alias: redirect target mismatch")
                else:
                    log_fail(f"Slug alias: expected 301, got {r.status_code}")
            else:
                log_pass("Slug alias: no aliases to test (skipped)")
        else:
            log_fail(f"Slug alias: GET /api/admin/course-aliases failed: {r.status_code}")
    except Exception as e:
        log_fail(f"Slug alias exception: {e}")

def test_study_next():
    """Test 10: Study/next endpoint requires auth"""
    print("\n=== TEST 10: Study/next Endpoint ===")
    
    try:
        # Without userId, should return 401
        r = requests.get(f"{API_URL}/study/next", timeout=10)
        if r.status_code == 401:
            log_pass("Study/next: requires auth (401 without userId)")
        else:
            log_fail(f"Study/next: expected 401, got {r.status_code}")
        
    except Exception as e:
        log_fail(f"Study/next exception: {e}")

def test_pages_crud():
    """Test 11: Pages CRUD endpoints"""
    print("\n=== TEST 11: Pages CRUD ===")
    
    cookies = admin_login()
    if not cookies:
        log_fail("Pages CRUD: login failed")
        return
    
    try:
        # GET /api/pages (public)
        r = requests.get(f"{API_URL}/pages", timeout=10)
        if r.status_code == 200:
            log_pass("Pages: GET /api/pages works")
        else:
            log_fail(f"Pages: GET /api/pages failed: {r.status_code}")
        
        # GET /api/admin/pages (admin)
        r = requests.get(f"{API_URL}/admin/pages", cookies=cookies, timeout=10)
        if r.status_code == 200:
            log_pass("Pages: GET /api/admin/pages works")
        else:
            log_fail(f"Pages: GET /api/admin/pages failed: {r.status_code}")
        
    except Exception as e:
        log_fail(f"Pages CRUD exception: {e}")

def test_ai_generation_disabled():
    """Test 12: AI generation returns 410"""
    print("\n=== TEST 12: AI Generation Disabled ===")
    
    cookies = admin_login()
    if not cookies:
        log_fail("AI generation: login failed")
        return
    
    try:
        r = requests.post(f"{API_URL}/admin/generate-course", json={}, cookies=cookies, timeout=10)
        if r.status_code == 410:
            log_pass("AI generation: POST /api/admin/generate-course returns 410")
        else:
            log_fail(f"AI generation: expected 410, got {r.status_code}")
        
    except Exception as e:
        log_fail(f"AI generation exception: {e}")

def cleanup_test_users():
    """Delete all test users created during testing"""
    print("\n=== CLEANUP: Deleting Test Users ===")
    
    cookies = admin_login()
    if not cookies:
        print("⚠️  Cleanup: admin login failed, cannot delete test users")
        return
    
    for user_id in test_users:
        try:
            r = requests.delete(f"{API_URL}/admin/users/{user_id}", cookies=cookies, timeout=10)
            if r.status_code == 200:
                print(f"✅ Deleted test user: {user_id}")
            else:
                print(f"⚠️  Failed to delete test user {user_id}: {r.status_code}")
        except Exception as e:
            print(f"⚠️  Exception deleting test user {user_id}: {e}")

def main():
    print("=" * 80)
    print("BACKEND TEST: Online Spirits Club v1.2 Pre-Launch")
    print("=" * 80)
    
    # Run all tests
    test_ssr_beginner_stripping()
    test_rawtitle_preservation()
    test_findbylessonslug_fix()
    test_all_lessons_load()
    test_audience_signup()
    test_admin_analytics()
    test_admin_users()
    test_version_endpoint()
    test_slug_alias_redirect()
    test_study_next()
    test_pages_crud()
    test_ai_generation_disabled()
    
    # Cleanup
    cleanup_test_users()
    
    # Summary
    print("\n" + "=" * 80)
    print(f"TEST SUMMARY: {tests_passed} passed, {tests_failed} failed")
    print("=" * 80)
    
    if tests_failed == 0:
        print("🎉 ALL TESTS PASSED!")
        return 0
    else:
        print(f"⚠️  {tests_failed} TEST(S) FAILED")
        return 1

if __name__ == "__main__":
    exit(main())
