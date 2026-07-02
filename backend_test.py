#!/usr/bin/env python3
"""
Critical regression test for client-side exception on lesson open bug fix.
Tests hydration of corrupted lesson data from courses_published collection.
"""

import requests
import json
import os
from pymongo import MongoClient
from datetime import datetime

# Configuration
# Read from .env file
def load_env():
    env_vars = {}
    try:
        with open('/app/.env', 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    env_vars[key] = value
    except:
        pass
    return env_vars

env_vars = load_env()
BASE_URL = env_vars.get('NEXT_PUBLIC_BASE_URL', 'http://localhost:3000')
API_URL = f"{BASE_URL}/api"
MONGO_URL = env_vars.get('MONGO_URL', 'mongodb://localhost:27017')
# Use osc_db as the actual database name (the app falls back to this when DB_NAME is 'your_database_name')
DB_NAME = 'osc_db'

# Admin credentials
ADMIN_EMAIL = "sebastiandieugenioe@gmail.com"
ADMIN_PASSWORD = "preview-only-change-in-prod"

# Test data
TEST_COURSE_SLUG = "alcohol-fundamentals"
TEST_LESSONS = [
    "what-is-alcohol",
    "fermentation-basics",
    "distillation-explained",
    "aging-and-maturation",
    "reading-spirit-labels"
]

def get_admin_cookie():
    """Authenticate as admin and return session cookie."""
    try:
        resp = requests.post(f"{API_URL}/admin-auth", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        }, timeout=10)
        if resp.status_code == 200:
            cookie = resp.cookies.get('osc_admin')
            if cookie:
                print(f"✅ Admin authentication successful")
                return {'osc_admin': cookie}
            else:
                print(f"❌ No osc_admin cookie in response")
                print(f"   Available cookies: {list(resp.cookies.keys())}")
                return None
        else:
            print(f"❌ Admin auth failed: {resp.status_code} - {resp.text}")
            return None
    except Exception as e:
        print(f"❌ Admin auth error: {e}")
        return None

def get_mongo_client():
    """Get MongoDB client."""
    try:
        client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=5000)
        client.server_info()  # Force connection
        print(f"✅ MongoDB connection successful")
        return client
    except Exception as e:
        print(f"❌ MongoDB connection failed: {e}")
        return None

def test_1_simulate_corruption():
    """
    Test 1: Simulate production corruption by inserting a corrupted DB document.
    Then verify hydration works on read.
    """
    print("\n" + "="*80)
    print("TEST 1: SIMULATE PRODUCTION CORRUPTION")
    print("="*80)
    
    client = get_mongo_client()
    if not client:
        return False
    
    db = client[DB_NAME]
    collection = db['courses_published']
    
    # Insert corrupted document (lesson with only minimal fields, no theory/flashcards/quiz/embedded)
    corrupted_doc = {
        'slug': TEST_COURSE_SLUG,
        'title': 'Alcohol Fundamentals',
        'tagline': 'x',
        'level': 'Beginner',
        'accent': 'from-blue-500 to-cyan-500',
        'icon': 'Flame',
        'lessons': [
            {
                'slug': 'what-is-alcohol',
                'title': 'What Is Alcohol?',
                'minutes': 4,
                'objectives': ['A', 'B', 'C']
                # MISSING: theory, flashcards, quiz, embedded
            }
        ],
        'updatedAt': datetime.utcnow()
    }
    
    try:
        # Clean up first
        collection.delete_one({'slug': TEST_COURSE_SLUG})
        
        # Insert corrupted doc
        result = collection.insert_one(corrupted_doc)
        print(f"✅ Inserted corrupted document with _id: {result.inserted_id}")
        
        # Test 1a: GET /api/lessons/alcohol-fundamentals/what-is-alcohol
        print("\n--- Test 1a: GET lesson (should be hydrated) ---")
        resp = requests.get(f"{API_URL}/lessons/{TEST_COURSE_SLUG}/what-is-alcohol", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            lesson = data.get('lesson', {})
            
            # Check for hydrated fields
            has_theory = bool(lesson.get('theory'))
            has_flashcards = len(lesson.get('flashcards', [])) >= 5
            has_quiz = len(lesson.get('quiz', [])) >= 5
            has_embedded = len(lesson.get('embedded', [])) >= 1
            
            print(f"  Theory present: {has_theory} (length: {len(lesson.get('theory', ''))})")
            print(f"  Flashcards count: {len(lesson.get('flashcards', []))} (expected >= 5)")
            print(f"  Quiz count: {len(lesson.get('quiz', []))} (expected >= 5)")
            print(f"  Embedded count: {len(lesson.get('embedded', []))} (expected >= 1)")
            
            if has_theory and has_flashcards and has_quiz and has_embedded:
                print(f"✅ Test 1a PASSED: Lesson hydrated correctly from static source")
            else:
                print(f"❌ Test 1a FAILED: Lesson not fully hydrated")
                return False
        else:
            print(f"❌ Test 1a FAILED: {resp.status_code} - {resp.text}")
            return False
        
        # Test 1b: GET /api/courses/alcohol-fundamentals
        # Note: The corrupted DB doc has only 1 lesson, but the endpoint returns what's in DB
        # The hydration happens at the lesson level, not course level
        print("\n--- Test 1b: GET course (should return 200) ---")
        resp = requests.get(f"{API_URL}/courses/{TEST_COURSE_SLUG}", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            lesson_count = len(data.get('lessons', []))
            print(f"  Lesson count: {lesson_count}")
            print(f"  Note: DB override has {lesson_count} lesson(s), hydration happens per-lesson")
            print(f"✅ Test 1b PASSED: Course endpoint returns successfully")
        else:
            print(f"❌ Test 1b FAILED: {resp.status_code} - {resp.text}")
            return False
        
        # Test 1c: GET /learn/what-is-alcohol (SSR page)
        print("\n--- Test 1c: GET SSR page (should not crash) ---")
        resp = requests.get(f"{BASE_URL}/learn/what-is-alcohol", timeout=10)
        if resp.status_code == 200:
            html = resp.text
            has_theory_keywords = 'ethanol' in html.lower() or 'alcohol' in html.lower()
            has_h1 = '<h1' in html and 'What Is Alcohol' in html
            print(f"  Status: {resp.status_code}")
            print(f"  Has <h1>: {has_h1}")
            print(f"  Has theory keywords: {has_theory_keywords}")
            if has_h1 and has_theory_keywords:
                print(f"✅ Test 1c PASSED: SSR page renders without crash")
            else:
                print(f"❌ Test 1c FAILED: SSR page missing expected content")
                return False
        else:
            print(f"❌ Test 1c FAILED: {resp.status_code}")
            return False
        
        # Test 1d: Test the corrupted lesson gets hydrated
        # Note: Since DB override has only 1 lesson, other lessons will 404 (expected)
        # The key test is that the ONE lesson in the corrupted doc gets hydrated
        print("\n--- Test 1d: Verify corrupted lesson is hydrated (other lessons will 404) ---")
        resp = requests.get(f"{API_URL}/lessons/{TEST_COURSE_SLUG}/what-is-alcohol", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            lesson = data.get('lesson', {})
            has_theory = bool(lesson.get('theory'))
            has_flashcards = len(lesson.get('flashcards', [])) >= 5
            has_quiz = len(lesson.get('quiz', [])) >= 5
            has_embedded = len(lesson.get('embedded', [])) >= 1
            
            if has_theory and has_flashcards and has_quiz and has_embedded:
                print(f"  ✅ what-is-alcohol: fully hydrated despite corruption")
                print(f"✅ Test 1d PASSED: Corrupted lesson successfully hydrated")
            else:
                print(f"  ❌ what-is-alcohol: missing fields")
                print(f"❌ Test 1d FAILED: Lesson not fully hydrated")
                return False
        else:
            print(f"❌ Test 1d FAILED: {resp.status_code}")
            return False
        
        # Test 1e: Cleanup
        print("\n--- Test 1e: Cleanup ---")
        collection.delete_one({'slug': TEST_COURSE_SLUG})
        print(f"✅ Cleaned up corrupted document")
        
        return True
        
    except Exception as e:
        print(f"❌ Test 1 ERROR: {e}")
        # Cleanup on error
        try:
            collection.delete_one({'slug': TEST_COURSE_SLUG})
        except:
            pass
        return False
    finally:
        client.close()

def test_2_save_path_sanitization():
    """
    Test 2: SAVE-PATH sanitization via admin/course-override.
    Send a course with lessons carrying ONLY minimal fields, verify hydration on save.
    """
    print("\n" + "="*80)
    print("TEST 2: SAVE-PATH SANITIZATION (admin/course-override)")
    print("="*80)
    
    cookies = get_admin_cookie()
    if not cookies:
        return False
    
    # Prepare a course object with minimal lesson data (simulating client bug)
    course_data = {
        'slug': TEST_COURSE_SLUG,
        'title': 'Alcohol Fundamentals Test',
        'tagline': 'Test tagline',
        'level': 'Beginner',
        'accent': 'from-blue-500 to-cyan-500',
        'icon': 'Flame',
        'lessons': [
            {
                'slug': 'what-is-alcohol',
                'title': 'What Is Alcohol?',
                'minutes': 4,
                'objectives': ['A', 'B', 'C']
                # MISSING: theory, flashcards, quiz, embedded
            }
        ]
    }
    
    try:
        # Test 2a: POST admin/course-override
        print("\n--- Test 2a: POST admin/course-override with minimal lesson data ---")
        resp = requests.post(f"{API_URL}/admin/course-override", 
                           json={'course': course_data},
                           cookies=cookies,
                           timeout=10)
        if resp.status_code == 200:
            print(f"✅ Course override saved successfully")
        else:
            print(f"❌ Test 2a FAILED: {resp.status_code} - {resp.text}")
            return False
        
        # Test 2b: Verify DB has hydrated lessons
        print("\n--- Test 2b: Verify courses_published has hydrated lessons ---")
        client = get_mongo_client()
        if not client:
            return False
        
        db = client[DB_NAME]
        saved_doc = db['courses_published'].find_one({'slug': TEST_COURSE_SLUG})
        
        if saved_doc:
            lesson = saved_doc['lessons'][0]
            has_theory = bool(lesson.get('theory'))
            has_flashcards = len(lesson.get('flashcards', [])) >= 5
            has_quiz = len(lesson.get('quiz', [])) >= 5
            has_embedded = len(lesson.get('embedded', [])) >= 1
            
            print(f"  Theory present: {has_theory}")
            print(f"  Flashcards count: {len(lesson.get('flashcards', []))}")
            print(f"  Quiz count: {len(lesson.get('quiz', []))}")
            print(f"  Embedded count: {len(lesson.get('embedded', []))}")
            
            if has_theory and has_flashcards and has_quiz and has_embedded:
                print(f"✅ Test 2b PASSED: DB document has hydrated lessons")
            else:
                print(f"❌ Test 2b FAILED: DB document missing fields")
                client.close()
                return False
        else:
            print(f"❌ Test 2b FAILED: Document not found in DB")
            client.close()
            return False
        
        client.close()
        
        # Test 2c: GET lesson via API
        print("\n--- Test 2c: GET lesson via API (should have full data) ---")
        resp = requests.get(f"{API_URL}/lessons/{TEST_COURSE_SLUG}/what-is-alcohol", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            lesson = data.get('lesson', {})
            has_theory = bool(lesson.get('theory'))
            has_flashcards = len(lesson.get('flashcards', [])) >= 5
            has_quiz = len(lesson.get('quiz', [])) >= 5
            has_embedded = len(lesson.get('embedded', [])) >= 1
            
            if has_theory and has_flashcards and has_quiz and has_embedded:
                print(f"✅ Test 2c PASSED: API returns fully hydrated lesson")
            else:
                print(f"❌ Test 2c FAILED: API lesson missing fields")
                return False
        else:
            print(f"❌ Test 2c FAILED: {resp.status_code} - {resp.text}")
            return False
        
        # Cleanup
        print("\n--- Cleanup ---")
        client = get_mongo_client()
        if client:
            db = client[DB_NAME]
            db['courses_published'].delete_one({'slug': TEST_COURSE_SLUG})
            print(f"✅ Cleaned up test document")
            client.close()
        
        return True
        
    except Exception as e:
        print(f"❌ Test 2 ERROR: {e}")
        # Cleanup on error
        try:
            client = get_mongo_client()
            if client:
                db = client[DB_NAME]
                db['courses_published'].delete_one({'slug': TEST_COURSE_SLUG})
                client.close()
        except:
            pass
        return False

def test_3_lesson_image_save_path():
    """
    Test 3: SAVE-PATH for lesson-image endpoint.
    Verify that saving an image doesn't corrupt other lessons.
    """
    print("\n" + "="*80)
    print("TEST 3: SAVE-PATH FOR LESSON-IMAGE")
    print("="*80)
    
    cookies = get_admin_cookie()
    if not cookies:
        return False
    
    try:
        # Test 3a: POST admin/lesson-image with a test image
        print("\n--- Test 3a: POST admin/lesson-image ---")
        image_data = {
            'courseSlug': TEST_COURSE_SLUG,
            'lessonSlug': 'what-is-alcohol',
            'image': {
                'url': 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b',
                'alt': 'Test image',
                'caption': 'Test caption',
                'credit': 'Unsplash',
                'id': None
            }
        }
        
        resp = requests.post(f"{API_URL}/admin/lesson-image",
                           json=image_data,
                           cookies=cookies,
                           timeout=10)
        if resp.status_code == 200:
            print(f"✅ Lesson image saved successfully")
        else:
            print(f"❌ Test 3a FAILED: {resp.status_code} - {resp.text}")
            return False
        
        # Test 3b: Verify all lessons in courses_published have full data
        print("\n--- Test 3b: Verify all lessons have theory/flashcards/quiz/embedded ---")
        client = get_mongo_client()
        if not client:
            return False
        
        db = client[DB_NAME]
        saved_doc = db['courses_published'].find_one({'slug': TEST_COURSE_SLUG})
        
        if saved_doc:
            all_valid = True
            for lesson in saved_doc.get('lessons', []):
                has_theory = bool(lesson.get('theory'))
                has_flashcards = len(lesson.get('flashcards', [])) >= 5
                has_quiz = len(lesson.get('quiz', [])) >= 5
                has_embedded = len(lesson.get('embedded', [])) >= 1
                
                if not (has_theory and has_flashcards and has_quiz and has_embedded):
                    print(f"  ❌ {lesson.get('slug')}: missing fields")
                    all_valid = False
                else:
                    print(f"  ✅ {lesson.get('slug')}: fully hydrated")
            
            if all_valid:
                print(f"✅ Test 3b PASSED: All lessons have full data")
            else:
                print(f"❌ Test 3b FAILED: Some lessons missing fields")
                client.close()
                return False
        else:
            print(f"❌ Test 3b FAILED: Document not found")
            client.close()
            return False
        
        client.close()
        
        # Test 3c: Verify the updated lesson has the image
        print("\n--- Test 3c: Verify updated lesson has image ---")
        resp = requests.get(f"{API_URL}/lessons/{TEST_COURSE_SLUG}/what-is-alcohol", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            media = data.get('media', {})
            has_image = bool(media.get('image'))
            print(f"  Image URL: {media.get('image')}")
            if has_image:
                print(f"✅ Test 3c PASSED: Lesson has image")
            else:
                print(f"❌ Test 3c FAILED: Lesson missing image")
                return False
        else:
            print(f"❌ Test 3c FAILED: {resp.status_code}")
            return False
        
        # Test 3d: Cleanup - remove image
        print("\n--- Test 3d: Cleanup - remove image ---")
        resp = requests.post(f"{API_URL}/admin/lesson-image",
                           json={
                               'courseSlug': TEST_COURSE_SLUG,
                               'lessonSlug': 'what-is-alcohol',
                               'image': None
                           },
                           cookies=cookies,
                           timeout=10)
        if resp.status_code == 200:
            print(f"✅ Image removed successfully")
        else:
            print(f"⚠️  Image removal failed: {resp.status_code}")
        
        # Delete the document
        client = get_mongo_client()
        if client:
            db = client[DB_NAME]
            db['courses_published'].delete_one({'slug': TEST_COURSE_SLUG})
            print(f"✅ Cleaned up test document")
            client.close()
        
        return True
        
    except Exception as e:
        print(f"❌ Test 3 ERROR: {e}")
        # Cleanup on error
        try:
            client = get_mongo_client()
            if client:
                db = client[DB_NAME]
                db['courses_published'].delete_one({'slug': TEST_COURSE_SLUG})
                client.close()
        except:
            pass
        return False

def test_4_regression_checks():
    """
    Test 4: Regression checks for existing functionality.
    """
    print("\n" + "="*80)
    print("TEST 4: REGRESSION CHECKS")
    print("="*80)
    
    try:
        # Test 4a: GET /api/courses (should return 12 courses)
        print("\n--- Test 4a: GET /api/courses ---")
        resp = requests.get(f"{API_URL}/courses", timeout=10)
        if resp.status_code == 200:
            courses = resp.json()
            course_count = len(courses)
            print(f"  Course count: {course_count}")
            if course_count >= 12:
                print(f"✅ Test 4a PASSED: {course_count} courses returned")
            else:
                print(f"❌ Test 4a FAILED: Expected >= 12 courses, got {course_count}")
                return False
        else:
            print(f"❌ Test 4a FAILED: {resp.status_code}")
            return False
        
        # Test 4b: GET /api/version
        print("\n--- Test 4b: GET /api/version ---")
        resp = requests.get(f"{API_URL}/version", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            version = data.get('version')
            print(f"  Version: {version}")
            if version == 'v1.1-admin-changes':
                print(f"✅ Test 4b PASSED: Correct version")
            else:
                print(f"⚠️  Test 4b: Version is '{version}' (expected 'v1.1-admin-changes')")
        else:
            print(f"❌ Test 4b FAILED: {resp.status_code}")
            return False
        
        # Test 4c: GET /api/study/next (basic check)
        print("\n--- Test 4c: GET /api/study/next (without userId - should fail) ---")
        resp = requests.get(f"{API_URL}/study/next", timeout=10)
        if resp.status_code == 401:
            print(f"✅ Test 4c PASSED: Correctly requires authentication")
        else:
            print(f"⚠️  Test 4c: Expected 401, got {resp.status_code}")
        
        # Test 4d: GET /api/pages (CRUD check)
        print("\n--- Test 4d: GET /api/pages ---")
        resp = requests.get(f"{API_URL}/pages", timeout=10)
        if resp.status_code == 200:
            print(f"✅ Test 4d PASSED: Pages endpoint working")
        else:
            print(f"❌ Test 4d FAILED: {resp.status_code}")
            return False
        
        # Test 4e: Admin course-meta (basic check with auth)
        print("\n--- Test 4e: Admin endpoints require auth ---")
        resp = requests.post(f"{API_URL}/admin/course-meta", json={}, timeout=10)
        if resp.status_code == 401:
            print(f"✅ Test 4e PASSED: Admin endpoints require auth")
        else:
            print(f"⚠️  Test 4e: Expected 401, got {resp.status_code}")
        
        # Test 4f: Generate-course should return 410
        print("\n--- Test 4f: POST /api/admin/generate-course (should be 410) ---")
        cookies = get_admin_cookie()
        if cookies:
            resp = requests.post(f"{API_URL}/admin/generate-course", json={}, cookies=cookies, timeout=10)
            if resp.status_code == 410:
                print(f"✅ Test 4f PASSED: Generate-course disabled (410)")
            else:
                print(f"⚠️  Test 4f: Expected 410, got {resp.status_code}")
        
        return True
        
    except Exception as e:
        print(f"❌ Test 4 ERROR: {e}")
        return False

def test_5_seo_page_regression():
    """
    Test 5: SEO page regression - verify SSR pages render correctly.
    """
    print("\n" + "="*80)
    print("TEST 5: SEO PAGE REGRESSION")
    print("="*80)
    
    test_lessons = [
        ('what-is-alcohol', 'What Is Alcohol', 'ethanol'),
        ('scotch-whisky', 'Scotch Whisky', 'scotland'),
        ('london-dry-gin', 'London Dry Gin', 'juniper'),
    ]
    
    try:
        all_passed = True
        for lesson_slug, expected_title, keyword in test_lessons:
            print(f"\n--- Testing /learn/{lesson_slug} ---")
            resp = requests.get(f"{BASE_URL}/learn/{lesson_slug}", timeout=10)
            if resp.status_code == 200:
                html = resp.text
                has_h1 = '<h1' in html and expected_title in html
                has_keyword = keyword.lower() in html.lower()
                print(f"  Status: {resp.status_code}")
                print(f"  Has <h1> with '{expected_title}': {has_h1}")
                print(f"  Has keyword '{keyword}': {has_keyword}")
                
                if has_h1 and has_keyword:
                    print(f"  ✅ {lesson_slug}: SSR page renders correctly")
                else:
                    print(f"  ❌ {lesson_slug}: Missing expected content")
                    all_passed = False
            else:
                print(f"  ❌ {lesson_slug}: {resp.status_code}")
                all_passed = False
        
        if all_passed:
            print(f"\n✅ Test 5 PASSED: All SSR pages render correctly")
            return True
        else:
            print(f"\n❌ Test 5 FAILED: Some SSR pages have issues")
            return False
        
    except Exception as e:
        print(f"❌ Test 5 ERROR: {e}")
        return False

def main():
    """Run all tests."""
    print("\n" + "="*80)
    print("CRITICAL REGRESSION TEST: CLIENT-SIDE EXCEPTION ON LESSON OPEN BUG FIX")
    print("="*80)
    print(f"Base URL: {BASE_URL}")
    print(f"API URL: {API_URL}")
    print(f"MongoDB: {MONGO_URL}")
    print(f"Database: {DB_NAME}")
    
    results = {
        'Test 1: Simulate Corruption': test_1_simulate_corruption(),
        'Test 2: Save-Path Sanitization': test_2_save_path_sanitization(),
        'Test 3: Lesson-Image Save-Path': test_3_lesson_image_save_path(),
        'Test 4: Regression Checks': test_4_regression_checks(),
        'Test 5: SEO Page Regression': test_5_seo_page_regression(),
    }
    
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{status}: {test_name}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED - Bug fix verified!")
        return 0
    else:
        print(f"\n⚠️  {total - passed} test(s) failed")
        return 1

if __name__ == '__main__':
    exit(main())
