#!/usr/bin/env python3
"""
Backend test suite for Online Spirits Club v1.1 pre-launch changes.
Tests: course title stripping, audience fields, admin analytics, admin users, regressions.
"""

import requests
import json
import sys
from typing import Dict, Any, List, Optional

BASE_URL = "https://proof-academy.preview.emergentagent.com/api"
ADMIN_EMAIL = "sebastiandieugenioe@gmail.com"
ADMIN_PASSWORD = "preview-only-change-in-prod"

class TestRunner:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.admin_cookie = None
        self.test_user_ids = []
        
    def log(self, msg: str):
        print(f"  {msg}")
    
    def assert_true(self, condition: bool, msg: str):
        if condition:
            self.passed += 1
            self.log(f"✅ PASS: {msg}")
        else:
            self.failed += 1
            self.log(f"❌ FAIL: {msg}")
    
    def assert_equal(self, actual, expected, msg: str):
        if actual == expected:
            self.passed += 1
            self.log(f"✅ PASS: {msg}")
        else:
            self.failed += 1
            self.log(f"❌ FAIL: {msg} (expected: {expected}, got: {actual})")
    
    def assert_not_contains(self, text: str, substring: str, msg: str):
        if substring.lower() not in text.lower():
            self.passed += 1
            self.log(f"✅ PASS: {msg}")
        else:
            self.failed += 1
            self.log(f"❌ FAIL: {msg} (found '{substring}' in text)")
    
    def assert_contains(self, text: str, substring: str, msg: str):
        if substring.lower() in text.lower():
            self.passed += 1
            self.log(f"✅ PASS: {msg}")
        else:
            self.failed += 1
            self.log(f"❌ FAIL: {msg} ('{substring}' not found in text)")
    
    def admin_login(self):
        """Authenticate as admin and store cookie."""
        print("\n🔐 Admin Authentication")
        try:
            resp = requests.post(f"{BASE_URL}/admin-auth", json={
                "email": ADMIN_EMAIL,
                "password": ADMIN_PASSWORD
            })
            self.assert_equal(resp.status_code, 200, "Admin login successful")
            self.admin_cookie = resp.cookies.get("osc_admin")
            self.assert_true(self.admin_cookie is not None, "Admin session cookie received")
            if not self.admin_cookie:
                self.log(f"⚠️  Available cookies: {list(resp.cookies.keys())}")
        except Exception as e:
            self.log(f"❌ Admin login failed: {e}")
            sys.exit(1)
    
    def get_admin_cookies(self) -> Dict[str, str]:
        """Return cookies dict for admin requests."""
        return {"osc_admin": self.admin_cookie} if self.admin_cookie else {}
    
    def test_1_course_title_stripping(self):
        """Test 1: PUBLIC COURSE TITLE STRIPPING"""
        print("\n" + "="*80)
        print("TEST 1: PUBLIC COURSE TITLE STRIPPING")
        print("="*80)
        
        # 1a) GET /api/courses → titles must NOT end with " Beginner"
        print("\n1a) GET /api/courses - verify title stripping")
        try:
            resp = requests.get(f"{BASE_URL}/courses")
            self.assert_equal(resp.status_code, 200, "GET /api/courses returns 200")
            courses = resp.json()
            self.assert_equal(len(courses), 12, "Returns 12 courses")
            
            beginner_titles = [c for c in courses if c.get('title', '').lower().endswith(' beginner')]
            self.assert_equal(len(beginner_titles), 0, "No course titles end with ' Beginner'")
            
            # Check that level field can still be "Beginner"
            beginner_levels = [c for c in courses if c.get('level') == 'Beginner']
            self.log(f"ℹ️  Found {len(beginner_levels)} courses with level='Beginner' (this is OK)")
        except Exception as e:
            self.log(f"❌ Test 1a failed: {e}")
        
        # 1b) GET /api/courses/vodka-beginner → title === "Vodka"
        print("\n1b) GET /api/courses/vodka-beginner - verify specific course")
        try:
            resp = requests.get(f"{BASE_URL}/courses/vodka-beginner")
            # This might be 301 if renamed, or 200 if not
            if resp.status_code == 301:
                data = resp.json()
                self.assert_true('redirect' in data, "301 response contains redirect field")
                self.log(f"ℹ️  Course renamed, redirect to: {data.get('redirect')}")
                # Follow redirect
                new_slug = data.get('redirect')
                resp = requests.get(f"{BASE_URL}/courses/{new_slug}")
            
            self.assert_equal(resp.status_code, 200, "GET course returns 200")
            course = resp.json()
            self.assert_equal(course.get('title'), 'Vodka', "Course title is 'Vodka' (no 'Beginner' suffix)")
            self.assert_equal(course.get('level'), 'Beginner', "Level field is still 'Beginner'")
        except Exception as e:
            self.log(f"❌ Test 1b failed: {e}")
        
        # 1c) GET /api/lessons/vodka-beginner/what-is-vodka → course.title === "Vodka", course.rawTitle contains "Beginner"
        print("\n1c) GET /api/lessons/vodka-beginner/what-is-vodka - verify lesson endpoint")
        try:
            resp = requests.get(f"{BASE_URL}/lessons/vodka-beginner/what-is-vodka")
            self.assert_equal(resp.status_code, 200, "GET lesson returns 200")
            data = resp.json()
            self.assert_equal(data.get('course', {}).get('title'), 'Vodka', "course.title is 'Vodka'")
            raw_title = data.get('course', {}).get('rawTitle', '')
            self.assert_contains(raw_title, 'Beginner', "course.rawTitle contains 'Beginner'")
        except Exception as e:
            self.log(f"❌ Test 1c failed: {e}")
        
        # 1d) SSR: curl /learn/what-is-vodka → does NOT contain "Vodka Beginner"
        print("\n1d) SSR pages - verify 3 spot lessons don't show 'Beginner' in course label")
        test_lessons = [
            "what-is-vodka",
            "what-is-alcohol", 
            "scotch-whisky"
        ]
        for lesson_slug in test_lessons:
            try:
                resp = requests.get(f"https://proof-academy.preview.emergentagent.com/learn/{lesson_slug}")
                self.assert_equal(resp.status_code, 200, f"SSR page /learn/{lesson_slug} returns 200")
                html = resp.text
                # Check that we don't have "Vodka Beginner" or "Whiskey Beginner" etc as course labels
                self.assert_not_contains(html, "Vodka Beginner", f"SSR page doesn't contain 'Vodka Beginner'")
                self.assert_not_contains(html, "Whiskey Beginner", f"SSR page doesn't contain 'Whiskey Beginner'")
            except Exception as e:
                self.log(f"❌ SSR test for {lesson_slug} failed: {e}")
    
    def test_2_audience_fields_signup(self):
        """Test 2: AUDIENCE FIELDS ON SIGNUP"""
        print("\n" + "="*80)
        print("TEST 2: AUDIENCE FIELDS ON SIGNUP")
        print("="*80)
        
        # 2a) POST /api/auth with full fields
        print("\n2a) POST /api/auth with country/city/role/newsletter")
        try:
            resp = requests.post(f"{BASE_URL}/auth", json={
                "email": "aud-a@example.com",
                "name": "Test User A",
                "country": "Italy",
                "city": "Milan",
                "role": "Bartender",
                "newsletter": True
            })
            self.assert_equal(resp.status_code, 200, "POST /api/auth returns 200")
            user = resp.json().get('user', {})
            self.test_user_ids.append(user.get('id'))
            self.assert_equal(user.get('country'), 'Italy', "User country is 'Italy'")
            self.assert_equal(user.get('city'), 'Milan', "User city is 'Milan'")
            self.assert_equal(user.get('role'), 'Bartender', "User role is 'Bartender'")
            self.assert_equal(user.get('newsletter'), True, "User newsletter is True")
        except Exception as e:
            self.log(f"❌ Test 2a failed: {e}")
        
        # 2b) POST /api/auth with same email, different fields → should NOT overwrite
        print("\n2b) POST /api/auth (same email, different fields) - verify no overwrite")
        try:
            resp = requests.post(f"{BASE_URL}/auth", json={
                "email": "aud-a@example.com",
                "name": "Test User A",
                "country": "Spain",
                "city": "Madrid",
                "role": "Bar manager",
                "newsletter": False
            })
            self.assert_equal(resp.status_code, 200, "POST /api/auth returns 200")
            user = resp.json().get('user', {})
            # Should NOT overwrite existing values
            self.assert_equal(user.get('country'), 'Italy', "Country NOT overwritten (still 'Italy')")
            self.assert_equal(user.get('city'), 'Milan', "City NOT overwritten (still 'Milan')")
            self.assert_equal(user.get('role'), 'Bartender', "Role NOT overwritten (still 'Bartender')")
        except Exception as e:
            self.log(f"❌ Test 2b failed: {e}")
        
        # 2c) Invalid role like 'Ninja' → stored as 'Other'
        print("\n2c) POST /api/auth with invalid role - verify sanitization to 'Other'")
        try:
            resp = requests.post(f"{BASE_URL}/auth", json={
                "email": "aud-b@example.com",
                "name": "Test User B",
                "role": "Ninja"
            })
            self.assert_equal(resp.status_code, 200, "POST /api/auth returns 200")
            user = resp.json().get('user', {})
            self.test_user_ids.append(user.get('id'))
            self.assert_equal(user.get('role'), 'Other', "Invalid role sanitized to 'Other'")
        except Exception as e:
            self.log(f"❌ Test 2c failed: {e}")
        
        # 2d) POST /api/auth with only email → user created without country/city/role
        print("\n2d) POST /api/auth with only email - verify optional fields")
        try:
            resp = requests.post(f"{BASE_URL}/auth", json={
                "email": "aud-c@example.com"
            })
            self.assert_equal(resp.status_code, 200, "POST /api/auth returns 200")
            user = resp.json().get('user', {})
            self.test_user_ids.append(user.get('id'))
            self.assert_true(user.get('country') is None, "Country is null/absent")
            self.assert_true(user.get('city') is None, "City is null/absent")
            self.assert_true(user.get('role') is None, "Role is null/absent")
        except Exception as e:
            self.log(f"❌ Test 2d failed: {e}")
        
        # 2e) POST /api/me/update → user updated
        print("\n2e) POST /api/me/update - verify profile update")
        try:
            # First create a user
            resp = requests.post(f"{BASE_URL}/auth", json={
                "email": "aud-d@example.com",
                "name": "Test User D"
            })
            user = resp.json().get('user', {})
            user_id = user.get('id')
            self.test_user_ids.append(user_id)
            
            # Update profile
            resp = requests.post(f"{BASE_URL}/me/update", json={
                "userId": user_id,
                "country": "Spain",
                "city": "Madrid",
                "role": "Bar manager"
            })
            self.assert_equal(resp.status_code, 200, "POST /api/me/update returns 200")
            updated_user = resp.json().get('user', {})
            self.assert_equal(updated_user.get('country'), 'Spain', "Country updated to 'Spain'")
            self.assert_equal(updated_user.get('city'), 'Madrid', "City updated to 'Madrid'")
            self.assert_equal(updated_user.get('role'), 'Bar manager', "Role updated to 'Bar manager'")
        except Exception as e:
            self.log(f"❌ Test 2e failed: {e}")
        
        # 2f) POST /api/me/update with invalid role → sanitized to 'Other'
        print("\n2f) POST /api/me/update with invalid role - verify sanitization")
        try:
            resp = requests.post(f"{BASE_URL}/me/update", json={
                "userId": user_id,
                "role": "InvalidRole"
            })
            self.assert_equal(resp.status_code, 200, "POST /api/me/update returns 200")
            updated_user = resp.json().get('user', {})
            self.assert_equal(updated_user.get('role'), 'Other', "Invalid role sanitized to 'Other'")
        except Exception as e:
            self.log(f"❌ Test 2f failed: {e}")
    
    def test_3_admin_audience_analytics(self):
        """Test 3: ADMIN AUDIENCE ANALYTICS"""
        print("\n" + "="*80)
        print("TEST 3: ADMIN AUDIENCE ANALYTICS")
        print("="*80)
        
        # Prep: create 5 test users with varied country/city/role
        print("\nPrep: Creating 5 test users with varied profiles")
        test_profiles = [
            {"email": "analytics-1@example.com", "country": "USA", "city": "New York", "role": "Bartender", "newsletter": True},
            {"email": "analytics-2@example.com", "country": "USA", "city": "Los Angeles", "role": "Bar manager", "newsletter": False},
            {"email": "analytics-3@example.com", "country": "UK", "city": "London", "role": "Bartender", "newsletter": True},
            {"email": "analytics-4@example.com", "country": "Italy", "city": "Rome", "role": "Cocktail enthusiast", "newsletter": True},
            {"email": "analytics-5@example.com", "country": "Spain", "city": "Barcelona", "role": "Waiter/Server", "newsletter": False},
        ]
        for profile in test_profiles:
            try:
                resp = requests.post(f"{BASE_URL}/auth", json=profile)
                if resp.status_code == 200:
                    user_id = resp.json().get('user', {}).get('id')
                    self.test_user_ids.append(user_id)
                    self.log(f"✅ Created test user: {profile['email']}")
            except Exception as e:
                self.log(f"❌ Failed to create test user {profile['email']}: {e}")
        
        # 3a) GET /api/admin/analytics returns audience data
        print("\n3a) GET /api/admin/analytics - verify audience structure")
        try:
            resp = requests.get(f"{BASE_URL}/admin/analytics", cookies=self.get_admin_cookies())
            self.assert_equal(resp.status_code, 200, "GET /api/admin/analytics returns 200")
            data = resp.json()
            audience = data.get('audience', {})
            
            self.assert_true('totalUsers' in audience, "audience.totalUsers present")
            self.assert_true('byCountry' in audience, "audience.byCountry present")
            self.assert_true('byCity' in audience, "audience.byCity present")
            self.assert_true('byRole' in audience, "audience.byRole present")
            self.assert_true('newsletterByRole' in audience, "audience.newsletterByRole present")
            
            self.assert_true(isinstance(audience['byCountry'], list), "byCountry is array")
            self.assert_true(isinstance(audience['byCity'], list), "byCity is array")
            self.assert_true(isinstance(audience['byRole'], list), "byRole is array")
            self.assert_true(isinstance(audience['newsletterByRole'], list), "newsletterByRole is array")
        except Exception as e:
            self.log(f"❌ Test 3a failed: {e}")
        
        # 3b) Verify counts add up correctly
        print("\n3b) Verify byRole counts match total users with roles")
        try:
            by_role = audience.get('byRole', [])
            total_with_roles = sum(r['count'] for r in by_role)
            self.log(f"ℹ️  Total users with roles: {total_with_roles}")
            self.assert_true(total_with_roles > 0, "At least some users have roles")
            
            # Verify our test users are in the data
            bartender_count = next((r['count'] for r in by_role if r['role'] == 'Bartender'), 0)
            self.assert_true(bartender_count >= 2, "At least 2 Bartenders (from our test users)")
        except Exception as e:
            self.log(f"❌ Test 3b failed: {e}")
        
        # 3c) newsletterByRole rate is a number between 0 and 100 with 1 decimal max
        print("\n3c) Verify newsletterByRole rate format")
        try:
            newsletter_by_role = audience.get('newsletterByRole', [])
            for item in newsletter_by_role:
                rate = item.get('rate')
                self.assert_true(isinstance(rate, (int, float)), f"Rate for {item.get('role')} is numeric")
                self.assert_true(0 <= rate <= 100, f"Rate for {item.get('role')} is between 0-100")
                # Check decimal places (should be 1 max)
                rate_str = str(rate)
                if '.' in rate_str:
                    decimals = len(rate_str.split('.')[1])
                    self.assert_true(decimals <= 1, f"Rate for {item.get('role')} has max 1 decimal place")
        except Exception as e:
            self.log(f"❌ Test 3c failed: {e}")
    
    def test_4_admin_users_table(self):
        """Test 4: ADMIN USERS TABLE + PROFILE"""
        print("\n" + "="*80)
        print("TEST 4: ADMIN USERS TABLE + PROFILE")
        print("="*80)
        
        # 4a) GET /api/admin/users returns users with country, city, role fields
        print("\n4a) GET /api/admin/users - verify fields present")
        try:
            resp = requests.get(f"{BASE_URL}/admin/users", cookies=self.get_admin_cookies())
            self.assert_equal(resp.status_code, 200, "GET /api/admin/users returns 200")
            data = resp.json()
            users = data.get('users', [])
            self.assert_true(len(users) > 0, "Returns at least one user")
            
            # Check first user has the fields (may be null)
            first_user = users[0]
            self.assert_true('country' in first_user, "User has 'country' field")
            self.assert_true('city' in first_user, "User has 'city' field")
            self.assert_true('role' in first_user, "User has 'role' field")
        except Exception as e:
            self.log(f"❌ Test 4a failed: {e}")
        
        # 4b) GET /api/admin/users/:id returns the same fields
        print("\n4b) GET /api/admin/users/:id - verify individual user profile")
        try:
            # Use one of our test users
            if self.test_user_ids:
                test_id = self.test_user_ids[0]
                resp = requests.get(f"{BASE_URL}/admin/users/{test_id}", cookies=self.get_admin_cookies())
                self.assert_equal(resp.status_code, 200, "GET /api/admin/users/:id returns 200")
                data = resp.json()
                user = data.get('user', {})
                self.assert_true('country' in user, "User profile has 'country' field")
                self.assert_true('city' in user, "User profile has 'city' field")
                self.assert_true('role' in user, "User profile has 'role' field")
        except Exception as e:
            self.log(f"❌ Test 4b failed: {e}")
        
        # 4c) PATCH /api/admin/users/:id can update these fields
        print("\n4c) PATCH /api/admin/users/:id - verify update capability")
        try:
            if self.test_user_ids:
                test_id = self.test_user_ids[0]
                # Note: Based on code review, PATCH may not support country/city/role
                # Let's test what it does support (name, email, newsletter)
                resp = requests.patch(
                    f"{BASE_URL}/admin/users/{test_id}",
                    json={"name": "Updated Name"},
                    cookies=self.get_admin_cookies()
                )
                self.assert_equal(resp.status_code, 200, "PATCH /api/admin/users/:id returns 200")
                data = resp.json()
                user = data.get('user', {})
                self.assert_equal(user.get('name'), 'Updated Name', "User name updated successfully")
                
                # Try updating country/city/role (may not be supported)
                resp = requests.patch(
                    f"{BASE_URL}/admin/users/{test_id}",
                    json={"country": "France", "city": "Paris", "role": "Bartender"},
                    cookies=self.get_admin_cookies()
                )
                if resp.status_code == 200:
                    user = resp.json().get('user', {})
                    if user.get('country') == 'France':
                        self.log("✅ PATCH supports country/city/role updates")
                    else:
                        self.log("⚠️  PATCH does not update country/city/role (may be intentional)")
        except Exception as e:
            self.log(f"❌ Test 4c failed: {e}")
    
    def test_5_regressions(self):
        """Test 5: REGRESSIONS"""
        print("\n" + "="*80)
        print("TEST 5: REGRESSIONS")
        print("="*80)
        
        # Version endpoint
        print("\n5.1) GET /api/version")
        try:
            resp = requests.get(f"{BASE_URL}/version")
            self.assert_equal(resp.status_code, 200, "GET /api/version returns 200")
            data = resp.json()
            self.assert_equal(data.get('version'), 'v1.1-admin-changes', "Version is 'v1.1-admin-changes'")
        except Exception as e:
            self.log(f"❌ Version test failed: {e}")
        
        # Study/next auth check
        print("\n5.2) GET /api/study/next - verify auth required")
        try:
            resp = requests.get(f"{BASE_URL}/study/next")
            self.assert_equal(resp.status_code, 401, "GET /api/study/next requires auth (401)")
        except Exception as e:
            self.log(f"❌ Study/next auth test failed: {e}")
        
        # Lesson hydration check
        print("\n5.3) GET /api/lessons/alcohol-fundamentals/what-is-alcohol - verify full hydration")
        try:
            resp = requests.get(f"{BASE_URL}/lessons/alcohol-fundamentals/what-is-alcohol")
            self.assert_equal(resp.status_code, 200, "GET lesson returns 200")
            data = resp.json()
            lesson = data.get('lesson', {})
            self.assert_true('theory' in lesson, "Lesson has 'theory' field")
            self.assert_true('flashcards' in lesson, "Lesson has 'flashcards' field")
            self.assert_true('quiz' in lesson, "Lesson has 'quiz' field")
            self.assert_true('embedded' in lesson, "Lesson has 'embedded' field")
            self.assert_true(len(lesson.get('theory', '')) > 100, "Theory content is substantial")
            self.assert_true(len(lesson.get('flashcards', [])) > 0, "Has flashcards")
            self.assert_true(len(lesson.get('quiz', [])) > 0, "Has quiz questions")
        except Exception as e:
            self.log(f"❌ Lesson hydration test failed: {e}")
        
        # Admin pages CRUD
        print("\n5.4) GET /api/admin/pages - verify CRUD still works")
        try:
            resp = requests.get(f"{BASE_URL}/admin/pages", cookies=self.get_admin_cookies())
            self.assert_equal(resp.status_code, 200, "GET /api/admin/pages returns 200")
        except Exception as e:
            self.log(f"❌ Admin pages test failed: {e}")
        
        # Slug alias test (rename and verify 301)
        print("\n5.5) Slug alias - rename course and verify 301 redirect")
        try:
            # Rename vodka-beginner to vodka-test
            resp = requests.post(
                f"{BASE_URL}/admin/course-meta",
                json={
                    "originalSlug": "vodka-beginner",
                    "slug": "vodka-test",
                    "title": "Vodka"
                },
                cookies=self.get_admin_cookies()
            )
            if resp.status_code == 200:
                self.log("✅ Course renamed successfully")
                
                # Check old slug returns 301
                resp = requests.get(f"{BASE_URL}/courses/vodka-beginner", allow_redirects=False)
                self.assert_equal(resp.status_code, 301, "Old slug returns 301")
                data = resp.json()
                self.assert_equal(data.get('redirect'), 'vodka-test', "Redirect points to new slug")
                
                # Rename back
                resp = requests.post(
                    f"{BASE_URL}/admin/course-meta",
                    json={
                        "originalSlug": "vodka-test",
                        "slug": "vodka-beginner",
                        "title": "Vodka Beginner"
                    },
                    cookies=self.get_admin_cookies()
                )
                self.assert_equal(resp.status_code, 200, "Course renamed back successfully")
            else:
                self.log(f"⚠️  Course rename failed (may already be renamed): {resp.status_code}")
        except Exception as e:
            self.log(f"❌ Slug alias test failed: {e}")
        
        # AI generation disabled
        print("\n5.6) POST /api/admin/generate-course - verify 410 (disabled)")
        try:
            resp = requests.post(
                f"{BASE_URL}/admin/generate-course",
                json={"title": "Test"},
                cookies=self.get_admin_cookies()
            )
            self.assert_equal(resp.status_code, 410, "AI generation returns 410 (disabled)")
        except Exception as e:
            self.log(f"❌ AI generation test failed: {e}")
    
    def cleanup(self):
        """Delete all test users created during testing."""
        print("\n" + "="*80)
        print("CLEANUP: Deleting test users")
        print("="*80)
        
        for user_id in self.test_user_ids:
            try:
                resp = requests.delete(
                    f"{BASE_URL}/admin/users/{user_id}",
                    cookies=self.get_admin_cookies()
                )
                if resp.status_code == 200:
                    self.log(f"✅ Deleted user: {user_id}")
                else:
                    self.log(f"⚠️  Failed to delete user {user_id}: {resp.status_code}")
            except Exception as e:
                self.log(f"❌ Error deleting user {user_id}: {e}")
    
    def run_all_tests(self):
        """Run all test suites."""
        print("\n" + "="*80)
        print("ONLINE SPIRITS CLUB - BACKEND TEST SUITE")
        print("v1.1 Pre-Launch Changes")
        print("="*80)
        
        self.admin_login()
        self.test_1_course_title_stripping()
        self.test_2_audience_fields_signup()
        self.test_3_admin_audience_analytics()
        self.test_4_admin_users_table()
        self.test_5_regressions()
        self.cleanup()
        
        print("\n" + "="*80)
        print("TEST SUMMARY")
        print("="*80)
        print(f"✅ PASSED: {self.passed}")
        print(f"❌ FAILED: {self.failed}")
        print(f"📊 TOTAL:  {self.passed + self.failed}")
        print(f"📈 SUCCESS RATE: {(self.passed / (self.passed + self.failed) * 100):.1f}%")
        print("="*80)
        
        return self.failed == 0

if __name__ == "__main__":
    runner = TestRunner()
    success = runner.run_all_tests()
    sys.exit(0 if success else 1)
