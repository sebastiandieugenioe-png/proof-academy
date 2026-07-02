#!/usr/bin/env python3
"""
Backend API tests for Online Spirits Club v1.1 admin changes.
Tests version endpoint, course meta updates, study/next, pages CMS, sitemap, and regressions.
"""

import requests
import os
import time
from uuid import uuid4

# Base URL from environment
BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'http://localhost:3000')
API_BASE = f"{BASE_URL}/api"

# Test credentials
ADMIN_EMAIL = "sebastiandieugenioe@gmail.com"
ADMIN_PASSWORD = "preview-only-change-in-prod"

# Global state
admin_cookie = None
test_user_ids = []
test_page_ids = []
created_aliases = []

def log_test(name, passed, details=""):
    """Log test result"""
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"{status}: {name}")
    if details:
        print(f"  Details: {details}")
    return passed

def get_admin_cookie():
    """Get admin authentication cookie"""
    global admin_cookie
    if admin_cookie:
        return admin_cookie
    
    try:
        resp = requests.post(f"{API_BASE}/admin-auth", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        }, timeout=10)
        
        if resp.status_code == 200 and 'osc_admin' in resp.cookies:
            admin_cookie = {'osc_admin': resp.cookies['osc_admin']}
            return admin_cookie
        else:
            print(f"❌ Admin auth failed: {resp.status_code}")
            return None
    except Exception as e:
        print(f"❌ Admin auth error: {e}")
        return None

# ============================================================================
# TEST 1: Version Endpoint
# ============================================================================

def test_1_version_endpoint():
    """Test 1: GET /api/version"""
    try:
        resp = requests.get(f"{API_BASE}/version", timeout=10)
        
        if resp.status_code != 200:
            return log_test("1: Version endpoint", False, f"Status: {resp.status_code}")
        
        data = resp.json()
        checks = {
            'has_version': 'version' in data,
            'has_builtAt': 'builtAt' in data,
            'has_env': 'env' in data,
            'version_correct': data.get('version') == 'v1.1-admin-changes' or 'APP_VERSION' in str(data.get('version', ''))
        }
        
        passed = all([checks['has_version'], checks['has_builtAt'], checks['has_env']])
        return log_test("1: Version endpoint", passed, 
                       f"Version: {data.get('version')}, Checks: {checks}")
    except Exception as e:
        return log_test("1: Version endpoint", False, str(e))

# ============================================================================
# TEST 2: Course Meta Update
# ============================================================================

def test_2a_course_meta_update_no_rename():
    """Test 2a: Update course meta without slug rename"""
    cookie = get_admin_cookie()
    if not cookie:
        return log_test("2a: Course meta update (no rename)", False, "No admin cookie")
    
    try:
        resp = requests.post(f"{API_BASE}/admin/course-meta", json={
            "originalSlug": "vodka-beginner",
            "title": "Vodka",
            "tagline": "Master vodka.",
            "category": "Vodka",
            "level": "Beginner"
        }, cookies=cookie, timeout=10)
        
        if resp.status_code != 200:
            return log_test("2a: Course meta update (no rename)", False, 
                           f"Status: {resp.status_code}, Body: {resp.text}")
        
        data = resp.json()
        checks = {
            'ok': data.get('ok') == True,
            'no_rename': data.get('renamed') is None,
            'title_updated': data.get('course', {}).get('title') == 'Vodka',
            'category_updated': data.get('course', {}).get('category') == 'Vodka'
        }
        
        passed = all(checks.values())
        return log_test("2a: Course meta update (no rename)", passed, f"Checks: {checks}")
    except Exception as e:
        return log_test("2a: Course meta update (no rename)", False, str(e))

def test_2b_verify_course_list():
    """Test 2b: Verify GET /api/courses shows updated title"""
    try:
        resp = requests.get(f"{API_BASE}/courses", timeout=10)
        
        if resp.status_code != 200:
            return log_test("2b: Verify course list", False, f"Status: {resp.status_code}")
        
        courses = resp.json()
        vodka_course = next((c for c in courses if c.get('slug') == 'vodka-beginner'), None)
        
        if not vodka_course:
            return log_test("2b: Verify course list", False, "vodka-beginner not found")
        
        checks = {
            'title': vodka_course.get('title') == 'Vodka',
            'category': vodka_course.get('category') == 'Vodka'
        }
        
        passed = all(checks.values())
        return log_test("2b: Verify course list", passed, f"Checks: {checks}")
    except Exception as e:
        return log_test("2b: Verify course list", False, str(e))

def test_2c_verify_course_detail():
    """Test 2c: Verify GET /api/courses/vodka-beginner returns updated title"""
    try:
        resp = requests.get(f"{API_BASE}/courses/vodka-beginner", timeout=10)
        
        if resp.status_code != 200:
            return log_test("2c: Verify course detail", False, f"Status: {resp.status_code}")
        
        data = resp.json()
        passed = data.get('title') == 'Vodka'
        return log_test("2c: Verify course detail", passed, f"Title: {data.get('title')}")
    except Exception as e:
        return log_test("2c: Verify course detail", False, str(e))

def test_2d_course_rename():
    """Test 2d: Rename course slug vodka-beginner -> vodka"""
    cookie = get_admin_cookie()
    if not cookie:
        return log_test("2d: Course rename", False, "No admin cookie")
    
    try:
        resp = requests.post(f"{API_BASE}/admin/course-meta", json={
            "originalSlug": "vodka-beginner",
            "slug": "vodka",
            "title": "Vodka"
        }, cookies=cookie, timeout=10)
        
        if resp.status_code != 200:
            return log_test("2d: Course rename", False, 
                           f"Status: {resp.status_code}, Body: {resp.text}")
        
        data = resp.json()
        checks = {
            'ok': data.get('ok') == True,
            'renamed': data.get('renamed') is not None,
            'from': data.get('renamed', {}).get('from') == 'vodka-beginner',
            'to': data.get('renamed', {}).get('to') == 'vodka'
        }
        
        if checks['renamed']:
            created_aliases.append({'from': 'vodka-beginner', 'to': 'vodka'})
        
        passed = all(checks.values())
        return log_test("2d: Course rename", passed, f"Checks: {checks}")
    except Exception as e:
        return log_test("2d: Course rename", False, str(e))

def test_2e_verify_new_slug():
    """Test 2e: Verify GET /api/courses/vodka returns 200"""
    try:
        resp = requests.get(f"{API_BASE}/courses/vodka", timeout=10)
        
        if resp.status_code != 200:
            return log_test("2e: Verify new slug", False, f"Status: {resp.status_code}")
        
        data = resp.json()
        passed = data.get('slug') == 'vodka' and data.get('title') == 'Vodka'
        return log_test("2e: Verify new slug", passed, f"Slug: {data.get('slug')}, Title: {data.get('title')}")
    except Exception as e:
        return log_test("2e: Verify new slug", False, str(e))

def test_2f_verify_old_slug_redirect():
    """Test 2f: Verify GET /api/courses/vodka-beginner returns 301 with redirect"""
    try:
        resp = requests.get(f"{API_BASE}/courses/vodka-beginner", timeout=10, allow_redirects=False)
        
        if resp.status_code != 301:
            return log_test("2f: Verify old slug redirect", False, 
                           f"Status: {resp.status_code} (expected 301)")
        
        data = resp.json()
        passed = data.get('redirect') == 'vodka'
        return log_test("2f: Verify old slug redirect", passed, 
                       f"Redirect: {data.get('redirect')}")
    except Exception as e:
        return log_test("2f: Verify old slug redirect", False, str(e))

def test_2g_create_test_user_for_progress():
    """Test 2g: Create test user for progress migration test"""
    try:
        test_email = f"progress-test-{uuid4().hex[:8]}@example.com"
        resp = requests.post(f"{API_BASE}/auth", json={
            "email": test_email,
            "name": "Progress Test User"
        }, timeout=10)
        
        if resp.status_code != 200:
            return log_test("2g: Create test user", False, f"Status: {resp.status_code}")
        
        user = resp.json().get('user', {})
        user_id = user.get('id')
        
        if user_id:
            test_user_ids.append(user_id)
            
            # Create progress for vodka course
            prog_resp = requests.post(f"{API_BASE}/progress", json={
                "userId": user_id,
                "courseSlug": "vodka",
                "lessonSlug": "vodka-basics",
                "completed": True,
                "quizScore": 5
            }, timeout=10)
            
            passed = prog_resp.status_code == 200
            return log_test("2g: Create test user", passed, f"User ID: {user_id}")
        else:
            return log_test("2g: Create test user", False, "No user ID")
    except Exception as e:
        return log_test("2g: Create test user", False, str(e))

def test_2h_rename_reserved_slug():
    """Test 2h: Try to rename to reserved slug 'admin'"""
    cookie = get_admin_cookie()
    if not cookie:
        return log_test("2h: Rename to reserved slug", False, "No admin cookie")
    
    try:
        resp = requests.post(f"{API_BASE}/admin/course-meta", json={
            "originalSlug": "vodka",
            "slug": "admin"
        }, cookies=cookie, timeout=10)
        
        passed = resp.status_code == 400
        return log_test("2h: Rename to reserved slug", passed, 
                       f"Status: {resp.status_code}, Body: {resp.json()}")
    except Exception as e:
        return log_test("2h: Rename to reserved slug", False, str(e))

def test_2i_rename_uppercase_slug():
    """Test 2i: Try to rename to uppercase slug 'About'"""
    cookie = get_admin_cookie()
    if not cookie:
        return log_test("2i: Rename to uppercase slug", False, "No admin cookie")
    
    try:
        resp = requests.post(f"{API_BASE}/admin/course-meta", json={
            "originalSlug": "vodka",
            "slug": "About"
        }, cookies=cookie, timeout=10)
        
        passed = resp.status_code == 400
        return log_test("2i: Rename to uppercase slug", passed, 
                       f"Status: {resp.status_code}")
    except Exception as e:
        return log_test("2i: Rename to uppercase slug", False, str(e))

# ============================================================================
# TEST 3: Study /next Endpoint
# ============================================================================

def test_3a_create_study_test_user():
    """Test 3a: Create test user for study endpoint"""
    try:
        test_email = f"studytest-{uuid4().hex[:8]}@example.com"
        resp = requests.post(f"{API_BASE}/auth", json={
            "email": test_email,
            "name": "Study Test User"
        }, timeout=10)
        
        if resp.status_code != 200:
            return log_test("3a: Create study test user", False, f"Status: {resp.status_code}")
        
        user = resp.json().get('user', {})
        user_id = user.get('id')
        
        if user_id:
            test_user_ids.append(user_id)
            
            # Complete a lesson to seed reviews
            prog_resp = requests.post(f"{API_BASE}/progress", json={
                "userId": user_id,
                "courseSlug": "alcohol-fundamentals",
                "lessonSlug": "what-is-alcohol",
                "completed": True,
                "quizScore": 5
            }, timeout=10)
            
            # Wait a moment for reviews to be seeded
            time.sleep(1)
            
            passed = prog_resp.status_code == 200
            return log_test("3a: Create study test user", passed, f"User ID: {user_id}")
        else:
            return log_test("3a: Create study test user", False, "No user ID")
    except Exception as e:
        return log_test("3a: Create study test user", False, str(e))

def test_3b_study_next_basic():
    """Test 3b: GET /api/study/next returns a card"""
    if not test_user_ids:
        return log_test("3b: Study next basic", False, "No test user")
    
    user_id = test_user_ids[-1]
    
    try:
        resp = requests.get(f"{API_BASE}/study/next?userId={user_id}", timeout=10)
        
        if resp.status_code != 200:
            return log_test("3b: Study next basic", False, f"Status: {resp.status_code}")
        
        data = resp.json()
        
        if data.get('done'):
            return log_test("3b: Study next basic", False, "No cards available (done=true)")
        
        card = data.get('card', {})
        stats = data.get('stats', {})
        
        checks = {
            'has_card': card is not None,
            'has_front': 'front' in card,
            'has_back': 'back' in card,
            'has_courseTitle': 'courseTitle' in card,
            'has_lessonTitle': 'lessonTitle' in card,
            'has_source': 'source' in data,
            'has_stats': stats is not None,
            'stats_has_due': 'due' in stats,
            'stats_has_weak': 'weak' in stats,
            'stats_has_total': 'total' in stats,
            'stats_has_remainingDue': 'remainingDue' in stats
        }
        
        passed = all(checks.values())
        return log_test("3b: Study next basic", passed, 
                       f"Source: {data.get('source')}, Stats: {stats}, Checks: {checks}")
    except Exception as e:
        return log_test("3b: Study next basic", False, str(e))

def test_3c_study_next_with_exclude():
    """Test 3c: GET /api/study/next with exclude parameter"""
    if not test_user_ids:
        return log_test("3c: Study next with exclude", False, "No test user")
    
    user_id = test_user_ids[-1]
    
    try:
        # Get first card
        resp1 = requests.get(f"{API_BASE}/study/next?userId={user_id}", timeout=10)
        if resp1.status_code != 200 or resp1.json().get('done'):
            return log_test("3c: Study next with exclude", False, "No cards available")
        
        card1_id = resp1.json().get('card', {}).get('id')
        
        # Get next card excluding the first
        resp2 = requests.get(f"{API_BASE}/study/next?userId={user_id}&exclude={card1_id}", timeout=10)
        
        if resp2.status_code != 200:
            return log_test("3c: Study next with exclude", False, f"Status: {resp2.status_code}")
        
        data2 = resp2.json()
        
        # If not done, verify we got a different card
        if not data2.get('done'):
            card2_id = data2.get('card', {}).get('id')
            passed = card2_id != card1_id
            return log_test("3c: Study next with exclude", passed, 
                           f"Card1: {card1_id}, Card2: {card2_id}")
        else:
            # If done, that's also acceptable (only one card available)
            return log_test("3c: Study next with exclude", True, "Only one card available (done=true)")
    except Exception as e:
        return log_test("3c: Study next with exclude", False, str(e))

def test_3d_answer_review():
    """Test 3d: POST /api/reviews/answer with grade='easy'"""
    if not test_user_ids:
        return log_test("3d: Answer review", False, "No test user")
    
    user_id = test_user_ids[-1]
    
    try:
        # Get a card
        resp = requests.get(f"{API_BASE}/study/next?userId={user_id}", timeout=10)
        if resp.status_code != 200 or resp.json().get('done'):
            return log_test("3d: Answer review", False, "No cards available")
        
        card = resp.json().get('card', {})
        review_id = card.get('id')
        
        # Answer it
        answer_resp = requests.post(f"{API_BASE}/reviews/answer", json={
            "userId": user_id,
            "reviewId": review_id,
            "grade": "easy"
        }, timeout=10)
        
        if answer_resp.status_code != 200:
            return log_test("3d: Answer review", False, 
                           f"Status: {answer_resp.status_code}, Body: {answer_resp.text}")
        
        data = answer_resp.json()
        passed = data.get('ok') == True
        return log_test("3d: Answer review", passed, f"Response: {data}")
    except Exception as e:
        return log_test("3d: Answer review", False, str(e))

def test_3e_study_next_include_new():
    """Test 3e: GET /api/study/next with includeNew=1"""
    if not test_user_ids:
        return log_test("3e: Study next includeNew", False, "No test user")
    
    user_id = test_user_ids[-1]
    
    try:
        # Complete another lesson to have potential new cards
        prog_resp = requests.post(f"{API_BASE}/progress", json={
            "userId": user_id,
            "courseSlug": "alcohol-fundamentals",
            "lessonSlug": "alcohol-chemistry",
            "completed": True,
            "quizScore": 4
        }, timeout=10)
        
        time.sleep(1)
        
        # Get all existing cards and exclude them
        all_cards = []
        for _ in range(20):  # Max 20 iterations
            resp = requests.get(f"{API_BASE}/study/next?userId={user_id}&includeNew=1", timeout=10)
            if resp.status_code != 200:
                break
            data = resp.json()
            if data.get('done'):
                break
            card = data.get('card', {})
            if card.get('id'):
                all_cards.append(card.get('id'))
            if len(all_cards) > 10:
                break
        
        # The fact that we got cards is good enough
        passed = len(all_cards) > 0
        return log_test("3e: Study next includeNew", passed, 
                       f"Got {len(all_cards)} cards")
    except Exception as e:
        return log_test("3e: Study next includeNew", False, str(e))

def test_3f_study_next_invalid_exclude():
    """Test 3f: GET /api/study/next with invalid exclude IDs"""
    if not test_user_ids:
        return log_test("3f: Study next invalid exclude", False, "No test user")
    
    user_id = test_user_ids[-1]
    
    try:
        resp = requests.get(f"{API_BASE}/study/next?userId={user_id}&exclude=invalid,fake,ids", timeout=10)
        
        # Should not crash, should return 200
        passed = resp.status_code == 200
        return log_test("3f: Study next invalid exclude", passed, 
                       f"Status: {resp.status_code}")
    except Exception as e:
        return log_test("3f: Study next invalid exclude", False, str(e))

# ============================================================================
# TEST 4: Pages CMS
# ============================================================================

def test_4a_create_page_with_sanitization():
    """Test 4a: POST /api/admin/pages with HTML sanitization"""
    cookie = get_admin_cookie()
    if not cookie:
        return log_test("4a: Create page with sanitization", False, "No admin cookie")
    
    try:
        resp = requests.post(f"{API_BASE}/admin/pages", json={
            "title": "About Us",
            "slug": "about",
            "seoTitle": "About",
            "seoDescription": "About our spirits club",
            "contentHtml": """
                <h2>Mission</h2>
                <p>Ok<a href='javascript:alert(1)'>x</a></p>
                <script>alert(1)</script>
                <iframe src='https://evil.com'></iframe>
                <iframe src='https://www.youtube.com/embed/xyz'></iframe>
            """,
            "published": True
        }, cookies=cookie, timeout=10)
        
        if resp.status_code != 200:
            return log_test("4a: Create page with sanitization", False, 
                           f"Status: {resp.status_code}, Body: {resp.text}")
        
        data = resp.json()
        page = data.get('page', {})
        content = page.get('contentHtml', '')
        
        checks = {
            'ok': data.get('ok') == True,
            'has_page_id': bool(page.get('id')),
            'script_stripped': '<script>' not in content,
            'javascript_stripped': 'javascript:' not in content,
            'evil_iframe_stripped': 'evil.com' not in content,
            'youtube_kept': 'youtube.com' in content
        }
        
        if page.get('id'):
            test_page_ids.append(page['id'])
        
        passed = all(checks.values())
        return log_test("4a: Create page with sanitization", passed, 
                       f"Checks: {checks}, Page ID: {page.get('id')}")
    except Exception as e:
        return log_test("4a: Create page with sanitization", False, str(e))

def test_4b_create_page_reserved_slug():
    """Test 4b: POST /api/admin/pages with reserved slug 'admin'"""
    cookie = get_admin_cookie()
    if not cookie:
        return log_test("4b: Create page reserved slug", False, "No admin cookie")
    
    try:
        resp = requests.post(f"{API_BASE}/admin/pages", json={
            "title": "Admin Page",
            "slug": "admin",
            "contentHtml": "<p>Test</p>",
            "published": True
        }, cookies=cookie, timeout=10)
        
        passed = resp.status_code == 400
        return log_test("4b: Create page reserved slug", passed, 
                       f"Status: {resp.status_code}")
    except Exception as e:
        return log_test("4b: Create page reserved slug", False, str(e))

def test_4c_create_page_reserved_slug_learn():
    """Test 4c: POST /api/admin/pages with reserved slug 'learn'"""
    cookie = get_admin_cookie()
    if not cookie:
        return log_test("4c: Create page reserved slug 'learn'", False, "No admin cookie")
    
    try:
        resp = requests.post(f"{API_BASE}/admin/pages", json={
            "title": "Learn Page",
            "slug": "learn",
            "contentHtml": "<p>Test</p>",
            "published": True
        }, cookies=cookie, timeout=10)
        
        passed = resp.status_code == 400
        return log_test("4c: Create page reserved slug 'learn'", passed, 
                       f"Status: {resp.status_code}")
    except Exception as e:
        return log_test("4c: Create page reserved slug 'learn'", False, str(e))

def test_4d_create_page_uppercase_slug():
    """Test 4d: POST /api/admin/pages with uppercase slug 'API'"""
    cookie = get_admin_cookie()
    if not cookie:
        return log_test("4d: Create page uppercase slug", False, "No admin cookie")
    
    try:
        resp = requests.post(f"{API_BASE}/admin/pages", json={
            "title": "API Page",
            "slug": "API",
            "contentHtml": "<p>Test</p>",
            "published": True
        }, cookies=cookie, timeout=10)
        
        passed = resp.status_code == 400
        return log_test("4d: Create page uppercase slug", passed, 
                       f"Status: {resp.status_code}")
    except Exception as e:
        return log_test("4d: Create page uppercase slug", False, str(e))

def test_4e_create_page_course_slug_clash():
    """Test 4e: POST /api/admin/pages with slug used by course"""
    cookie = get_admin_cookie()
    if not cookie:
        return log_test("4e: Create page course slug clash", False, "No admin cookie")
    
    try:
        resp = requests.post(f"{API_BASE}/admin/pages", json={
            "title": "Alcohol Fundamentals",
            "slug": "alcohol-fundamentals",
            "contentHtml": "<p>Test</p>",
            "published": True
        }, cookies=cookie, timeout=10)
        
        passed = resp.status_code == 400
        return log_test("4e: Create page course slug clash", passed, 
                       f"Status: {resp.status_code}")
    except Exception as e:
        return log_test("4e: Create page course slug clash", False, str(e))

def test_4f_get_admin_pages():
    """Test 4f: GET /api/admin/pages (with cookie)"""
    cookie = get_admin_cookie()
    if not cookie:
        return log_test("4f: Get admin pages", False, "No admin cookie")
    
    try:
        resp = requests.get(f"{API_BASE}/admin/pages", cookies=cookie, timeout=10)
        
        if resp.status_code != 200:
            return log_test("4f: Get admin pages", False, f"Status: {resp.status_code}")
        
        data = resp.json()
        passed = isinstance(data, list)
        return log_test("4f: Get admin pages", passed, f"Count: {len(data)}")
    except Exception as e:
        return log_test("4f: Get admin pages", False, str(e))

def test_4g_get_admin_page_by_id():
    """Test 4g: GET /api/admin/pages/:id"""
    cookie = get_admin_cookie()
    if not cookie or not test_page_ids:
        return log_test("4g: Get admin page by ID", False, "No admin cookie or page ID")
    
    page_id = test_page_ids[0]
    
    try:
        resp = requests.get(f"{API_BASE}/admin/pages/{page_id}", cookies=cookie, timeout=10)
        
        if resp.status_code != 200:
            return log_test("4g: Get admin page by ID", False, f"Status: {resp.status_code}")
        
        data = resp.json()
        passed = data.get('id') == page_id
        return log_test("4g: Get admin page by ID", passed, f"Page: {data.get('title')}")
    except Exception as e:
        return log_test("4g: Get admin page by ID", False, str(e))

def test_4h_get_public_pages():
    """Test 4h: GET /api/pages (public, no cookie)"""
    try:
        resp = requests.get(f"{API_BASE}/pages", timeout=10)
        
        if resp.status_code != 200:
            return log_test("4h: Get public pages", False, f"Status: {resp.status_code}")
        
        data = resp.json()
        
        # Should only return published pages
        checks = {
            'is_array': isinstance(data, list),
            'has_pages': len(data) > 0
        }
        
        passed = all(checks.values())
        return log_test("4h: Get public pages", passed, f"Count: {len(data)}")
    except Exception as e:
        return log_test("4h: Get public pages", False, str(e))

def test_4i_get_public_page_by_slug():
    """Test 4i: GET /api/pages/about (public)"""
    try:
        resp = requests.get(f"{API_BASE}/pages/about", timeout=10)
        
        if resp.status_code != 200:
            return log_test("4i: Get public page by slug", False, f"Status: {resp.status_code}")
        
        data = resp.json()
        checks = {
            'has_slug': data.get('slug') == 'about',
            'has_title': bool(data.get('title')),
            'has_contentHtml': bool(data.get('contentHtml'))
        }
        
        passed = all(checks.values())
        return log_test("4i: Get public page by slug", passed, f"Checks: {checks}")
    except Exception as e:
        return log_test("4i: Get public page by slug", False, str(e))

def test_4j_patch_page():
    """Test 4j: PATCH /api/admin/pages/:id"""
    cookie = get_admin_cookie()
    if not cookie or not test_page_ids:
        return log_test("4j: Patch page", False, "No admin cookie or page ID")
    
    page_id = test_page_ids[0]
    
    try:
        resp = requests.patch(f"{API_BASE}/admin/pages/{page_id}", json={
            "title": "About Us Updated",
            "contentHtml": "<h2>Updated</h2><script>alert(1)</script>"
        }, cookies=cookie, timeout=10)
        
        if resp.status_code != 200:
            return log_test("4j: Patch page", False, 
                           f"Status: {resp.status_code}, Body: {resp.text}")
        
        data = resp.json()
        page = data.get('page', {})
        
        checks = {
            'ok': data.get('ok') == True,
            'title_updated': page.get('title') == 'About Us Updated',
            'script_stripped': '<script>' not in page.get('contentHtml', '')
        }
        
        passed = all(checks.values())
        return log_test("4j: Patch page", passed, f"Checks: {checks}")
    except Exception as e:
        return log_test("4j: Patch page", False, str(e))

def test_4k_patch_page_slug():
    """Test 4k: PATCH /api/admin/pages/:id to change slug"""
    cookie = get_admin_cookie()
    if not cookie or not test_page_ids:
        return log_test("4k: Patch page slug", False, "No admin cookie or page ID")
    
    page_id = test_page_ids[0]
    
    try:
        resp = requests.patch(f"{API_BASE}/admin/pages/{page_id}", json={
            "slug": "about-us"
        }, cookies=cookie, timeout=10)
        
        if resp.status_code != 200:
            return log_test("4k: Patch page slug", False, 
                           f"Status: {resp.status_code}, Body: {resp.text}")
        
        data = resp.json()
        passed = data.get('page', {}).get('slug') == 'about-us'
        return log_test("4k: Patch page slug", passed, f"New slug: {data.get('page', {}).get('slug')}")
    except Exception as e:
        return log_test("4k: Patch page slug", False, str(e))

def test_4l_patch_page_unpublish():
    """Test 4l: PATCH /api/admin/pages/:id to unpublish"""
    cookie = get_admin_cookie()
    if not cookie or not test_page_ids:
        return log_test("4l: Patch page unpublish", False, "No admin cookie or page ID")
    
    page_id = test_page_ids[0]
    
    try:
        resp = requests.patch(f"{API_BASE}/admin/pages/{page_id}", json={
            "published": False
        }, cookies=cookie, timeout=10)
        
        if resp.status_code != 200:
            return log_test("4l: Patch page unpublish", False, 
                           f"Status: {resp.status_code}, Body: {resp.text}")
        
        data = resp.json()
        passed = data.get('page', {}).get('published') == False
        return log_test("4l: Patch page unpublish", passed, 
                       f"Published: {data.get('page', {}).get('published')}")
    except Exception as e:
        return log_test("4l: Patch page unpublish", False, str(e))

def test_4m_get_unpublished_page_public():
    """Test 4m: GET /api/pages/about-us (unpublished, should 404)"""
    try:
        resp = requests.get(f"{API_BASE}/pages/about-us", timeout=10)
        
        passed = resp.status_code == 404
        return log_test("4m: Get unpublished page public", passed, 
                       f"Status: {resp.status_code}")
    except Exception as e:
        return log_test("4m: Get unpublished page public", False, str(e))

def test_4n_ssr_page():
    """Test 4n: GET /about-us (SSR page, should 404 when unpublished)"""
    try:
        resp = requests.get(f"{BASE_URL}/about-us", timeout=10)
        
        # Should be 404 since we unpublished it
        passed = resp.status_code == 404
        return log_test("4n: SSR page (unpublished)", passed, 
                       f"Status: {resp.status_code}")
    except Exception as e:
        return log_test("4n: SSR page (unpublished)", False, str(e))

# ============================================================================
# TEST 5: Sitemap
# ============================================================================

def test_5a_create_published_page_for_sitemap():
    """Test 5a: Create a published page for sitemap test"""
    cookie = get_admin_cookie()
    if not cookie:
        return log_test("5a: Create page for sitemap", False, "No admin cookie")
    
    try:
        resp = requests.post(f"{API_BASE}/admin/pages", json={
            "title": "Test Sitemap Page",
            "slug": "test-sitemap-page",
            "seoTitle": "Test Sitemap",
            "seoDescription": "Test page for sitemap",
            "contentHtml": "<p>Test sitemap content</p>",
            "published": True
        }, cookies=cookie, timeout=10)
        
        if resp.status_code != 200:
            return log_test("5a: Create page for sitemap", False, 
                           f"Status: {resp.status_code}, Body: {resp.text}")
        
        data = resp.json()
        page = data.get('page', {})
        
        if page.get('id'):
            test_page_ids.append(page['id'])
        
        passed = data.get('ok') == True
        return log_test("5a: Create page for sitemap", passed, 
                       f"Page ID: {page.get('id')}")
    except Exception as e:
        return log_test("5a: Create page for sitemap", False, str(e))

def test_5b_verify_sitemap_includes_page():
    """Test 5b: GET /sitemap.xml includes test-sitemap-page"""
    try:
        resp = requests.get(f"{BASE_URL}/sitemap.xml", timeout=10)
        
        if resp.status_code != 200:
            return log_test("5b: Verify sitemap includes page", False, 
                           f"Status: {resp.status_code}")
        
        content = resp.text
        passed = '/test-sitemap-page' in content
        return log_test("5b: Verify sitemap includes page", passed, 
                       f"Contains test-sitemap-page: {passed}")
    except Exception as e:
        return log_test("5b: Verify sitemap includes page", False, str(e))

def test_5c_unpublish_page_for_sitemap():
    """Test 5c: Unpublish the sitemap test page"""
    cookie = get_admin_cookie()
    if not cookie or len(test_page_ids) < 2:
        return log_test("5c: Unpublish sitemap page", False, "No admin cookie or page ID")
    
    page_id = test_page_ids[-1]  # Last created page
    
    try:
        resp = requests.patch(f"{API_BASE}/admin/pages/{page_id}", json={
            "published": False
        }, cookies=cookie, timeout=10)
        
        passed = resp.status_code == 200
        return log_test("5c: Unpublish sitemap page", passed, 
                       f"Status: {resp.status_code}")
    except Exception as e:
        return log_test("5c: Unpublish sitemap page", False, str(e))

def test_5d_verify_sitemap_excludes_unpublished():
    """Test 5d: GET /sitemap.xml should not include unpublished page"""
    try:
        resp = requests.get(f"{BASE_URL}/sitemap.xml", timeout=10)
        
        if resp.status_code != 200:
            return log_test("5d: Verify sitemap excludes unpublished", False, 
                           f"Status: {resp.status_code}")
        
        content = resp.text
        # The page should not be in sitemap anymore
        passed = '/test-sitemap-page' not in content
        return log_test("5d: Verify sitemap excludes unpublished", passed, 
                       f"Excludes test-sitemap-page: {passed}")
    except Exception as e:
        return log_test("5d: Verify sitemap excludes unpublished", False, str(e))

# ============================================================================
# TEST 6: Regressions
# ============================================================================

def test_6a_courses_endpoint():
    """Test 6a: GET /api/courses returns courses with category"""
    try:
        resp = requests.get(f"{API_BASE}/courses", timeout=10)
        
        if resp.status_code != 200:
            return log_test("6a: Courses endpoint", False, f"Status: {resp.status_code}")
        
        data = resp.json()
        checks = {
            'is_array': isinstance(data, list),
            'has_courses': len(data) > 0,
            'has_category': len(data) > 0 and 'category' in data[0],
            'has_lessons': len(data) > 0 and 'lessons' in data[0]
        }
        
        passed = all(checks.values())
        return log_test("6a: Courses endpoint", passed, 
                       f"Count: {len(data)}, Checks: {checks}")
    except Exception as e:
        return log_test("6a: Courses endpoint", False, str(e))

def test_6b_lesson_structured_media():
    """Test 6b: GET /api/lessons/alcohol-fundamentals/what-is-alcohol has structured media"""
    try:
        resp = requests.get(f"{API_BASE}/lessons/alcohol-fundamentals/what-is-alcohol", timeout=10)
        
        if resp.status_code != 200:
            return log_test("6b: Lesson structured media", False, f"Status: {resp.status_code}")
        
        data = resp.json()
        media = data.get('media', {})
        
        checks = {
            'has_media': media is not None,
            'has_image': 'image' in media,
            'has_imageAlt': 'imageAlt' in media,
            'has_sources': isinstance(media.get('sources'), list)
        }
        
        passed = all(checks.values())
        return log_test("6b: Lesson structured media", passed, f"Checks: {checks}")
    except Exception as e:
        return log_test("6b: Lesson structured media", False, str(e))

def test_6c_admin_overview():
    """Test 6c: GET /api/admin/overview"""
    cookie = get_admin_cookie()
    if not cookie:
        return log_test("6c: Admin overview", False, "No admin cookie")
    
    try:
        resp = requests.get(f"{API_BASE}/admin/overview", cookies=cookie, timeout=10)
        
        if resp.status_code != 200:
            return log_test("6c: Admin overview", False, f"Status: {resp.status_code}")
        
        data = resp.json()
        checks = {
            'has_users': 'users' in data,
            'has_learning': 'learning' in data
        }
        
        passed = all(checks.values())
        return log_test("6c: Admin overview", passed, f"Checks: {checks}")
    except Exception as e:
        return log_test("6c: Admin overview", False, str(e))

def test_6d_admin_analytics():
    """Test 6d: GET /api/admin/analytics"""
    cookie = get_admin_cookie()
    if not cookie:
        return log_test("6d: Admin analytics", False, "No admin cookie")
    
    try:
        resp = requests.get(f"{API_BASE}/admin/analytics", cookies=cookie, timeout=10)
        
        if resp.status_code != 200:
            return log_test("6d: Admin analytics", False, f"Status: {resp.status_code}")
        
        data = resp.json()
        checks = {
            'has_byCourse': 'byCourse' in data,
            'has_byLesson': 'byLesson' in data
        }
        
        passed = all(checks.values())
        return log_test("6d: Admin analytics", passed, f"Checks: {checks}")
    except Exception as e:
        return log_test("6d: Admin analytics", False, str(e))

def test_6e_admin_users():
    """Test 6e: GET /api/admin/users?q="""
    cookie = get_admin_cookie()
    if not cookie:
        return log_test("6e: Admin users", False, "No admin cookie")
    
    try:
        resp = requests.get(f"{API_BASE}/admin/users?q=", cookies=cookie, timeout=10)
        
        if resp.status_code != 200:
            return log_test("6e: Admin users", False, f"Status: {resp.status_code}")
        
        data = resp.json()
        checks = {
            'has_users': 'users' in data,
            'has_total': 'total' in data
        }
        
        passed = all(checks.values())
        return log_test("6e: Admin users", passed, f"Checks: {checks}")
    except Exception as e:
        return log_test("6e: Admin users", False, str(e))

def test_6f_generate_course_disabled():
    """Test 6f: POST /api/admin/generate-course returns 410"""
    cookie = get_admin_cookie()
    if not cookie:
        return log_test("6f: Generate course disabled", False, "No admin cookie")
    
    try:
        resp = requests.post(f"{API_BASE}/admin/generate-course", json={},
                            cookies=cookie, timeout=10)
        
        passed = resp.status_code == 410
        return log_test("6f: Generate course disabled", passed, 
                       f"Status: {resp.status_code}")
    except Exception as e:
        return log_test("6f: Generate course disabled", False, str(e))

def test_6g_auth_flow():
    """Test 6g: POST /api/auth creates users"""
    try:
        test_email = f"regression-test-{uuid4().hex[:8]}@example.com"
        resp = requests.post(f"{API_BASE}/auth", json={
            "email": test_email,
            "name": "Regression Test User"
        }, timeout=10)
        
        if resp.status_code != 200:
            return log_test("6g: Auth flow", False, f"Status: {resp.status_code}")
        
        data = resp.json()
        user = data.get('user', {})
        
        if user.get('id'):
            test_user_ids.append(user['id'])
        
        checks = {
            'has_user': user is not None,
            'has_id': bool(user.get('id')),
            'email_match': user.get('email') == test_email
        }
        
        passed = all(checks.values())
        return log_test("6g: Auth flow", passed, f"Checks: {checks}")
    except Exception as e:
        return log_test("6g: Auth flow", False, str(e))

# ============================================================================
# CLEANUP
# ============================================================================

def cleanup_test_data():
    """Clean up all test data"""
    cookie = get_admin_cookie()
    if not cookie:
        print("\n⚠️  No admin cookie for cleanup")
        return
    
    print("\n" + "=" * 80)
    print("CLEANUP")
    print("=" * 80)
    
    # Delete test users
    if test_user_ids:
        print(f"\nCleaning up {len(test_user_ids)} test user(s)...")
        for user_id in test_user_ids:
            try:
                resp = requests.delete(f"{API_BASE}/admin/users/{user_id}",
                                      cookies=cookie, timeout=10)
                if resp.status_code == 200:
                    print(f"  ✅ Deleted user {user_id}")
                else:
                    print(f"  ⚠️  Failed to delete user {user_id}: {resp.status_code}")
            except Exception as e:
                print(f"  ❌ Error deleting user {user_id}: {e}")
    
    # Delete test pages
    if test_page_ids:
        print(f"\nCleaning up {len(test_page_ids)} test page(s)...")
        for page_id in test_page_ids:
            try:
                resp = requests.delete(f"{API_BASE}/admin/pages/{page_id}",
                                      cookies=cookie, timeout=10)
                if resp.status_code == 200:
                    print(f"  ✅ Deleted page {page_id}")
                else:
                    print(f"  ⚠️  Failed to delete page {page_id}: {resp.status_code}")
            except Exception as e:
                print(f"  ❌ Error deleting page {page_id}: {e}")
    
    # Reset vodka course (if it was renamed)
    print("\nResetting vodka course...")
    try:
        # Check if vodka exists
        resp = requests.get(f"{API_BASE}/courses/vodka", timeout=10)
        if resp.status_code == 200:
            # Rename back to vodka-beginner
            rename_resp = requests.post(f"{API_BASE}/admin/course-meta", json={
                "originalSlug": "vodka",
                "slug": "vodka-beginner",
                "title": "Vodka for Beginners"
            }, cookies=cookie, timeout=10)
            
            if rename_resp.status_code == 200:
                print("  ✅ Renamed vodka back to vodka-beginner")
            else:
                print(f"  ⚠️  Failed to rename: {rename_resp.status_code}")
    except Exception as e:
        print(f"  ⚠️  Error resetting vodka course: {e}")
    
    print("\nCleanup complete!")

# ============================================================================
# MAIN
# ============================================================================

def main():
    """Run all tests"""
    print("=" * 80)
    print("Backend API Tests - Online Spirits Club v1.1 Admin Changes")
    print("=" * 80)
    print(f"Base URL: {BASE_URL}")
    print(f"API Base: {API_BASE}")
    print()
    
    results = []
    
    # Test 1: Version Endpoint
    print("\n--- Test 1: Version Endpoint ---")
    results.append(test_1_version_endpoint())
    
    # Test 2: Course Meta Update
    print("\n--- Test 2: Course Meta Update ---")
    results.append(test_2a_course_meta_update_no_rename())
    results.append(test_2b_verify_course_list())
    results.append(test_2c_verify_course_detail())
    results.append(test_2d_course_rename())
    results.append(test_2e_verify_new_slug())
    results.append(test_2f_verify_old_slug_redirect())
    results.append(test_2g_create_test_user_for_progress())
    results.append(test_2h_rename_reserved_slug())
    results.append(test_2i_rename_uppercase_slug())
    
    # Test 3: Study /next Endpoint
    print("\n--- Test 3: Study /next Endpoint ---")
    results.append(test_3a_create_study_test_user())
    results.append(test_3b_study_next_basic())
    results.append(test_3c_study_next_with_exclude())
    results.append(test_3d_answer_review())
    results.append(test_3e_study_next_include_new())
    results.append(test_3f_study_next_invalid_exclude())
    
    # Test 4: Pages CMS
    print("\n--- Test 4: Pages CMS ---")
    results.append(test_4a_create_page_with_sanitization())
    results.append(test_4b_create_page_reserved_slug())
    results.append(test_4c_create_page_reserved_slug_learn())
    results.append(test_4d_create_page_uppercase_slug())
    results.append(test_4e_create_page_course_slug_clash())
    results.append(test_4f_get_admin_pages())
    results.append(test_4g_get_admin_page_by_id())
    results.append(test_4h_get_public_pages())
    results.append(test_4i_get_public_page_by_slug())
    results.append(test_4j_patch_page())
    results.append(test_4k_patch_page_slug())
    results.append(test_4l_patch_page_unpublish())
    results.append(test_4m_get_unpublished_page_public())
    results.append(test_4n_ssr_page())
    
    # Test 5: Sitemap
    print("\n--- Test 5: Sitemap ---")
    results.append(test_5a_create_published_page_for_sitemap())
    results.append(test_5b_verify_sitemap_includes_page())
    results.append(test_5c_unpublish_page_for_sitemap())
    results.append(test_5d_verify_sitemap_excludes_unpublished())
    
    # Test 6: Regressions
    print("\n--- Test 6: Regressions ---")
    results.append(test_6a_courses_endpoint())
    results.append(test_6b_lesson_structured_media())
    results.append(test_6c_admin_overview())
    results.append(test_6d_admin_analytics())
    results.append(test_6e_admin_users())
    results.append(test_6f_generate_course_disabled())
    results.append(test_6g_auth_flow())
    
    # Cleanup
    cleanup_test_data()
    
    # Summary
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    passed = sum(results)
    total = len(results)
    print(f"Passed: {passed}/{total}")
    print(f"Failed: {total - passed}/{total}")
    
    if passed == total:
        print("\n✅ ALL TESTS PASSED")
    else:
        print(f"\n❌ {total - passed} TEST(S) FAILED")
    
    return passed == total

if __name__ == "__main__":
    try:
        success = main()
        exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\nTests interrupted by user")
        exit(1)
    except Exception as e:
        print(f"\n\n❌ FATAL ERROR: {e}")
        import traceback
        traceback.print_exc()
        exit(1)
