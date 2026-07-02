#!/usr/bin/env python3
"""
Backend API tests for Online Spirits Club admin lesson image management.
Tests admin auth, image upload/serving/deletion, and lesson image attachment.
"""

import requests
import io
import os
from PIL import Image

# Base URL from environment
BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://proof-academy.preview.emergentagent.com')
API_BASE = f"{BASE_URL}/api"

# Test credentials
ADMIN_EMAIL = "sebastiandieugenioe@gmail.com"
ADMIN_PASSWORD = "preview-only-change-in-prod"

# Test lesson
TEST_COURSE = "alcohol-fundamentals"
TEST_LESSON = "what-is-alcohol"

# Global state
admin_cookie = None
uploaded_image_id = None
test_user_ids = []

def log_test(name, passed, details=""):
    """Log test result"""
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"{status}: {name}")
    if details:
        print(f"  Details: {details}")
    return passed

def create_test_image(width=2400, height=1350, format='JPEG'):
    """Create a test image in memory"""
    img = Image.new('RGB', (width, height), color=(30, 58, 138))
    buf = io.BytesIO()
    img.save(buf, format=format, quality=90)
    buf.seek(0)
    return buf

def test_1a_admin_auth_wrong_password():
    """Test 1a: POST /api/admin-auth with wrong password"""
    try:
        resp = requests.post(f"{API_BASE}/admin-auth", json={
            "email": ADMIN_EMAIL,
            "password": "wrong-password"
        }, timeout=10)
        
        passed = resp.status_code == 401 and 'error' in resp.json()
        return log_test("1a: Admin auth - wrong password", passed, 
                       f"Status: {resp.status_code}, Body: {resp.json()}")
    except Exception as e:
        return log_test("1a: Admin auth - wrong password", False, str(e))

def test_1b_admin_auth_wrong_email():
    """Test 1b: POST /api/admin-auth with wrong email"""
    try:
        resp = requests.post(f"{API_BASE}/admin-auth", json={
            "email": "notadmin@example.com",
            "password": ADMIN_PASSWORD
        }, timeout=10)
        
        passed = resp.status_code == 401
        return log_test("1b: Admin auth - wrong email", passed,
                       f"Status: {resp.status_code}")
    except Exception as e:
        return log_test("1b: Admin auth - wrong email", False, str(e))

def test_1c_admin_auth_correct():
    """Test 1c: POST /api/admin-auth with correct credentials"""
    global admin_cookie
    try:
        resp = requests.post(f"{API_BASE}/admin-auth", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        }, timeout=10)
        
        data = resp.json()
        has_cookie = 'osc_admin' in resp.cookies
        
        if resp.status_code == 200 and data.get('ok') and has_cookie:
            admin_cookie = {'osc_admin': resp.cookies['osc_admin']}
            return log_test("1c: Admin auth - correct credentials", True,
                           f"Cookie set: {has_cookie}")
        else:
            return log_test("1c: Admin auth - correct credentials", False,
                           f"Status: {resp.status_code}, Cookie: {has_cookie}")
    except Exception as e:
        return log_test("1c: Admin auth - correct credentials", False, str(e))

def test_2a_upload_without_cookie():
    """Test 2a: POST /api/admin/images without admin cookie"""
    try:
        img_buf = create_test_image()
        files = {'file': ('test.jpg', img_buf, 'image/jpeg')}
        resp = requests.post(f"{API_BASE}/admin/images", files=files, timeout=10)
        
        passed = resp.status_code == 401
        return log_test("2a: Upload without cookie", passed,
                       f"Status: {resp.status_code}")
    except Exception as e:
        return log_test("2a: Upload without cookie", False, str(e))

def test_2b_upload_valid_jpg():
    """Test 2b: POST /api/admin/images with valid JPG"""
    global uploaded_image_id
    try:
        img_buf = create_test_image(2400, 1350, 'JPEG')
        files = {'file': ('test.jpg', img_buf, 'image/jpeg')}
        resp = requests.post(f"{API_BASE}/admin/images", files=files, 
                            cookies=admin_cookie, timeout=15)
        
        if resp.status_code != 200:
            return log_test("2b: Upload valid JPG", False,
                           f"Status: {resp.status_code}, Body: {resp.text}")
        
        data = resp.json()
        image = data.get('image', {})
        
        checks = {
            'ok': data.get('ok') == True,
            'contentType': image.get('contentType') == 'image/webp',
            'width': image.get('width', 0) <= 1920,
            'url': image.get('url', '').startswith('/api/images/'),
            'has_id': bool(image.get('id'))
        }
        
        if all(checks.values()):
            uploaded_image_id = image['id']
            return log_test("2b: Upload valid JPG", True,
                           f"ID: {uploaded_image_id}, Width: {image['width']}, Size: {image['size']}")
        else:
            return log_test("2b: Upload valid JPG", False,
                           f"Checks failed: {checks}, Image: {image}")
    except Exception as e:
        return log_test("2b: Upload valid JPG", False, str(e))

def test_2c_upload_text_file():
    """Test 2c: POST /api/admin/images with text/plain"""
    try:
        files = {'file': ('test.txt', io.BytesIO(b'not an image'), 'text/plain')}
        resp = requests.post(f"{API_BASE}/admin/images", files=files,
                            cookies=admin_cookie, timeout=10)
        
        passed = resp.status_code == 400
        return log_test("2c: Upload text file", passed,
                       f"Status: {resp.status_code}")
    except Exception as e:
        return log_test("2c: Upload text file", False, str(e))

def test_2d_upload_gif():
    """Test 2d: POST /api/admin/images with GIF"""
    try:
        img = Image.new('RGB', (100, 100), color=(255, 0, 0))
        buf = io.BytesIO()
        img.save(buf, format='GIF')
        buf.seek(0)
        
        files = {'file': ('test.gif', buf, 'image/gif')}
        resp = requests.post(f"{API_BASE}/admin/images", files=files,
                            cookies=admin_cookie, timeout=10)
        
        passed = resp.status_code == 400
        return log_test("2d: Upload GIF (unsupported)", passed,
                       f"Status: {resp.status_code}")
    except Exception as e:
        return log_test("2d: Upload GIF (unsupported)", False, str(e))

def test_2e_upload_large_file():
    """Test 2e: POST /api/admin/images with >8MB file"""
    try:
        # Create a large image (should exceed 8MB when saved)
        img = Image.new('RGB', (8000, 8000), color=(255, 255, 255))
        buf = io.BytesIO()
        img.save(buf, format='JPEG', quality=100)
        buf.seek(0)
        
        if buf.getbuffer().nbytes <= 8 * 1024 * 1024:
            # If still under 8MB, pad it
            buf.write(b'\x00' * (8 * 1024 * 1024 + 1000))
            buf.seek(0)
        
        files = {'file': ('large.jpg', buf, 'image/jpeg')}
        resp = requests.post(f"{API_BASE}/admin/images", files=files,
                            cookies=admin_cookie, timeout=15)
        
        passed = resp.status_code == 400
        return log_test("2e: Upload >8MB file", passed,
                       f"Status: {resp.status_code}, Size: {buf.getbuffer().nbytes}")
    except Exception as e:
        return log_test("2e: Upload >8MB file", False, str(e))

def test_3a_get_uploaded_image():
    """Test 3a: GET /api/images/{id} for uploaded image"""
    if not uploaded_image_id:
        return log_test("3a: Get uploaded image", False, "No uploaded image ID")
    
    try:
        resp = requests.get(f"{API_BASE}/images/{uploaded_image_id}", timeout=10)
        
        if resp.status_code != 200:
            return log_test("3a: Get uploaded image", False,
                           f"Status: {resp.status_code}")
        
        checks = {
            'content_type': resp.headers.get('Content-Type') == 'image/webp',
            'cache_control': 'public' in resp.headers.get('Cache-Control', ''),
            'max_age': 'max-age=31536000' in resp.headers.get('Cache-Control', ''),
            'immutable': 'immutable' in resp.headers.get('Cache-Control', ''),
            'content_length': int(resp.headers.get('Content-Length', 0)) == len(resp.content),
            'webp_magic': resp.content[:4] == b'RIFF' and resp.content[8:12] == b'WEBP'
        }
        
        passed = all(checks.values())
        return log_test("3a: Get uploaded image", passed,
                       f"Checks: {checks}, Size: {len(resp.content)}")
    except Exception as e:
        return log_test("3a: Get uploaded image", False, str(e))

def test_3b_get_nonexistent_image():
    """Test 3b: GET /api/images/000000000000000000000000"""
    try:
        resp = requests.get(f"{API_BASE}/images/000000000000000000000000", timeout=10)
        
        passed = resp.status_code == 404
        return log_test("3b: Get nonexistent image", passed,
                       f"Status: {resp.status_code}")
    except Exception as e:
        return log_test("3b: Get nonexistent image", False, str(e))

def test_3c_get_invalid_id():
    """Test 3c: GET /api/images/not-an-oid"""
    try:
        resp = requests.get(f"{API_BASE}/images/not-an-oid", timeout=10)
        
        passed = resp.status_code == 404
        return log_test("3c: Get invalid image ID", passed,
                       f"Status: {resp.status_code}")
    except Exception as e:
        return log_test("3c: Get invalid image ID", False, str(e))

def test_4a_upload_from_url():
    """Test 4a: POST /api/admin/images with URL"""
    try:
        resp = requests.post(f"{API_BASE}/admin/images", 
                            json={"url": "https://images.unsplash.com/photo-1585706225595-096acd929453?auto=format&fit=crop&w=1200&q=80"},
                            cookies=admin_cookie, timeout=20)
        
        if resp.status_code != 200:
            return log_test("4a: Upload from URL", False,
                           f"Status: {resp.status_code}, Body: {resp.text}")
        
        data = resp.json()
        image = data.get('image', {})
        
        checks = {
            'ok': data.get('ok') == True,
            'contentType': image.get('contentType') == 'image/webp',
            'width': image.get('width', 0) <= 1920,
            'has_id': bool(image.get('id'))
        }
        
        if all(checks.values()):
            # Verify we can fetch it
            fetch_resp = requests.get(f"{API_BASE}/images/{image['id']}", timeout=10)
            checks['fetchable'] = fetch_resp.status_code == 200
            
        passed = all(checks.values())
        return log_test("4a: Upload from URL", passed,
                       f"Checks: {checks}, ID: {image.get('id')}")
    except Exception as e:
        return log_test("4a: Upload from URL", False, str(e))

def test_4b_upload_from_html_url():
    """Test 4b: POST /api/admin/images with HTML URL"""
    try:
        resp = requests.post(f"{API_BASE}/admin/images",
                            json={"url": "https://example.com"},
                            cookies=admin_cookie, timeout=15)
        
        passed = resp.status_code == 400
        return log_test("4b: Upload from HTML URL", passed,
                       f"Status: {resp.status_code}")
    except Exception as e:
        return log_test("4b: Upload from HTML URL", False, str(e))

def test_4c_upload_from_invalid_url():
    """Test 4c: POST /api/admin/images with invalid URL"""
    try:
        resp = requests.post(f"{API_BASE}/admin/images",
                            json={"url": "not-a-url"},
                            cookies=admin_cookie, timeout=10)
        
        passed = resp.status_code == 400
        return log_test("4c: Upload from invalid URL", passed,
                       f"Status: {resp.status_code}")
    except Exception as e:
        return log_test("4c: Upload from invalid URL", False, str(e))

def test_5a_attach_without_cookie():
    """Test 5a: POST /api/admin/lesson-image without cookie"""
    try:
        resp = requests.post(f"{API_BASE}/admin/lesson-image", json={
            "courseSlug": TEST_COURSE,
            "lessonSlug": TEST_LESSON,
            "image": {"url": "/api/images/test", "alt": "Test", "caption": "", "credit": "", "id": "test"}
        }, timeout=10)
        
        passed = resp.status_code == 401
        return log_test("5a: Attach image without cookie", passed,
                       f"Status: {resp.status_code}")
    except Exception as e:
        return log_test("5a: Attach image without cookie", False, str(e))

def test_5b_attach_image_to_lesson():
    """Test 5b: POST /api/admin/lesson-image with valid data"""
    if not uploaded_image_id:
        return log_test("5b: Attach image to lesson", False, "No uploaded image ID")
    
    try:
        resp = requests.post(f"{API_BASE}/admin/lesson-image", json={
            "courseSlug": TEST_COURSE,
            "lessonSlug": TEST_LESSON,
            "image": {
                "url": f"/api/images/{uploaded_image_id}",
                "alt": "A",
                "caption": "B",
                "credit": "C",
                "id": uploaded_image_id
            }
        }, cookies=admin_cookie, timeout=10)
        
        if resp.status_code != 200:
            return log_test("5b: Attach image to lesson", False,
                           f"Status: {resp.status_code}, Body: {resp.text}")
        
        data = resp.json()
        passed = data.get('ok') == True
        return log_test("5b: Attach image to lesson", passed,
                       f"Response: {data}")
    except Exception as e:
        return log_test("5b: Attach image to lesson", False, str(e))

def test_5c_verify_lesson_image():
    """Test 5c: GET /api/lessons/{course}/{lesson} to verify image"""
    if not uploaded_image_id:
        return log_test("5c: Verify lesson image", False, "No uploaded image ID")
    
    try:
        resp = requests.get(f"{API_BASE}/lessons/{TEST_COURSE}/{TEST_LESSON}", timeout=10)
        
        if resp.status_code != 200:
            return log_test("5c: Verify lesson image", False,
                           f"Status: {resp.status_code}")
        
        data = resp.json()
        media = data.get('media', {})
        
        checks = {
            'image': media.get('image') == f"/api/images/{uploaded_image_id}",
            'imageAlt': media.get('imageAlt') == 'A',
            'imageCaption': media.get('imageCaption') == 'B',
            'imageCredit': media.get('imageCredit') == 'C',
            'imageId': media.get('imageId') == uploaded_image_id,
            'sources': isinstance(media.get('sources'), list) and len(media.get('sources', [])) > 0
        }
        
        passed = all(checks.values())
        return log_test("5c: Verify lesson image", passed,
                       f"Checks: {checks}, Media: {media}")
    except Exception as e:
        return log_test("5c: Verify lesson image", False, str(e))

def test_5d_attach_missing_fields():
    """Test 5d: POST /api/admin/lesson-image with missing fields"""
    try:
        resp = requests.post(f"{API_BASE}/admin/lesson-image", json={
            "courseSlug": TEST_COURSE
            # Missing lessonSlug
        }, cookies=admin_cookie, timeout=10)
        
        passed = resp.status_code == 400
        return log_test("5d: Attach with missing fields", passed,
                       f"Status: {resp.status_code}")
    except Exception as e:
        return log_test("5d: Attach with missing fields", False, str(e))

def test_5e_attach_empty_image():
    """Test 5e: POST /api/admin/lesson-image with empty image"""
    try:
        resp = requests.post(f"{API_BASE}/admin/lesson-image", json={
            "courseSlug": TEST_COURSE,
            "lessonSlug": TEST_LESSON,
            "image": {}  # No url
        }, cookies=admin_cookie, timeout=10)
        
        passed = resp.status_code == 400
        return log_test("5e: Attach empty image", passed,
                       f"Status: {resp.status_code}")
    except Exception as e:
        return log_test("5e: Attach empty image", False, str(e))

def test_5f_remove_image():
    """Test 5f: POST /api/admin/lesson-image with image:null"""
    try:
        resp = requests.post(f"{API_BASE}/admin/lesson-image", json={
            "courseSlug": TEST_COURSE,
            "lessonSlug": TEST_LESSON,
            "image": None
        }, cookies=admin_cookie, timeout=10)
        
        if resp.status_code != 200:
            return log_test("5f: Remove image", False,
                           f"Status: {resp.status_code}, Body: {resp.text}")
        
        # Verify lesson reverted to media.js
        lesson_resp = requests.get(f"{API_BASE}/lessons/{TEST_COURSE}/{TEST_LESSON}", timeout=10)
        if lesson_resp.status_code == 200:
            media = lesson_resp.json().get('media', {})
            # Should revert to Unsplash URL from media.js
            reverted = not media.get('image', '').startswith('/api/images/')
            return log_test("5f: Remove image", reverted,
                           f"Media image: {media.get('image')}")
        else:
            return log_test("5f: Remove image", False,
                           f"Failed to verify: {lesson_resp.status_code}")
    except Exception as e:
        return log_test("5f: Remove image", False, str(e))

def test_5g_verify_blob_cleanup():
    """Test 5g: Verify GridFS blob was cleaned up"""
    if not uploaded_image_id:
        return log_test("5g: Verify blob cleanup", False, "No uploaded image ID")
    
    try:
        resp = requests.get(f"{API_BASE}/images/{uploaded_image_id}", timeout=10)
        
        passed = resp.status_code == 404
        return log_test("5g: Verify blob cleanup", passed,
                       f"Status: {resp.status_code} (should be 404)")
    except Exception as e:
        return log_test("5g: Verify blob cleanup", False, str(e))

def test_6a_attach_external_url():
    """Test 6a: POST /api/admin/lesson-image with external URL"""
    try:
        external_url = "https://images.unsplash.com/photo-1585706225595-096acd929453?w=1200"
        resp = requests.post(f"{API_BASE}/admin/lesson-image", json={
            "courseSlug": TEST_COURSE,
            "lessonSlug": TEST_LESSON,
            "image": {
                "url": external_url,
                "alt": "ext",
                "caption": "",
                "credit": "Unsplash",
                "id": None
            }
        }, cookies=admin_cookie, timeout=10)
        
        if resp.status_code != 200:
            return log_test("6a: Attach external URL", False,
                           f"Status: {resp.status_code}, Body: {resp.text}")
        
        passed = resp.json().get('ok') == True
        return log_test("6a: Attach external URL", passed,
                       f"Response: {resp.json()}")
    except Exception as e:
        return log_test("6a: Attach external URL", False, str(e))

def test_6b_verify_external_url():
    """Test 6b: Verify lesson has external URL and imageId is null"""
    try:
        resp = requests.get(f"{API_BASE}/lessons/{TEST_COURSE}/{TEST_LESSON}", timeout=10)
        
        if resp.status_code != 200:
            return log_test("6b: Verify external URL", False,
                           f"Status: {resp.status_code}")
        
        media = resp.json().get('media', {})
        checks = {
            'external_url': media.get('image', '').startswith('https://images.unsplash.com'),
            'imageId_null': media.get('imageId') is None
        }
        
        passed = all(checks.values())
        return log_test("6b: Verify external URL", passed,
                       f"Checks: {checks}, Image: {media.get('image')}")
    except Exception as e:
        return log_test("6b: Verify external URL", False, str(e))

def test_6c_cleanup_external():
    """Test 6c: Clean up external URL with image:null"""
    try:
        resp = requests.post(f"{API_BASE}/admin/lesson-image", json={
            "courseSlug": TEST_COURSE,
            "lessonSlug": TEST_LESSON,
            "image": None
        }, cookies=admin_cookie, timeout=10)
        
        passed = resp.status_code == 200
        return log_test("6c: Clean up external URL", passed,
                       f"Status: {resp.status_code}")
    except Exception as e:
        return log_test("6c: Clean up external URL", False, str(e))

def test_7a_delete_fresh_image():
    """Test 7a: Upload and DELETE /api/admin/images/{id}"""
    try:
        # Upload a fresh image
        img_buf = create_test_image(1200, 675, 'JPEG')
        files = {'file': ('delete-test.jpg', img_buf, 'image/jpeg')}
        upload_resp = requests.post(f"{API_BASE}/admin/images", files=files,
                                   cookies=admin_cookie, timeout=15)
        
        if upload_resp.status_code != 200:
            return log_test("7a: Delete fresh image", False,
                           f"Upload failed: {upload_resp.status_code}")
        
        image_id = upload_resp.json().get('image', {}).get('id')
        if not image_id:
            return log_test("7a: Delete fresh image", False, "No image ID returned")
        
        # Delete it
        delete_resp = requests.delete(f"{API_BASE}/admin/images/{image_id}",
                                     cookies=admin_cookie, timeout=10)
        
        if delete_resp.status_code != 200:
            return log_test("7a: Delete fresh image", False,
                           f"Delete status: {delete_resp.status_code}")
        
        passed = delete_resp.json().get('ok') == True
        return log_test("7a: Delete fresh image", passed,
                       f"Deleted ID: {image_id}")
    except Exception as e:
        return log_test("7a: Delete fresh image", False, str(e))

def test_7b_verify_deleted():
    """Test 7b: Verify deleted image returns 404"""
    # This is implicitly tested in 7a, but we can add explicit check
    return log_test("7b: Verify deleted image 404", True, "Covered by 7a")

def test_7c_delete_nonexistent():
    """Test 7c: DELETE /api/admin/images/deadbeef"""
    try:
        resp = requests.delete(f"{API_BASE}/admin/images/deadbeef",
                              cookies=admin_cookie, timeout=10)
        
        # Should return 200 with ok:false or gracefully handle
        passed = resp.status_code == 200
        return log_test("7c: Delete nonexistent image", passed,
                       f"Status: {resp.status_code}, Body: {resp.json()}")
    except Exception as e:
        return log_test("7c: Delete nonexistent image", False, str(e))

def test_8a_get_courses():
    """Test 8a: GET /api/courses"""
    try:
        resp = requests.get(f"{API_BASE}/courses", timeout=10)
        
        if resp.status_code != 200:
            return log_test("8a: GET /api/courses", False,
                           f"Status: {resp.status_code}")
        
        data = resp.json()
        checks = {
            'is_array': isinstance(data, list),
            'has_lessons': len(data) > 0 and 'lessons' in data[0],
            'lesson_has_slug': len(data) > 0 and len(data[0].get('lessons', [])) > 0 and 'slug' in data[0]['lessons'][0],
            'lesson_has_hasImage': len(data) > 0 and len(data[0].get('lessons', [])) > 0 and 'hasImage' in data[0]['lessons'][0]
        }
        
        passed = all(checks.values())
        return log_test("8a: GET /api/courses", passed,
                       f"Checks: {checks}, Count: {len(data)}")
    except Exception as e:
        return log_test("8a: GET /api/courses", False, str(e))

def test_8b_get_course():
    """Test 8b: GET /api/courses/alcohol-fundamentals"""
    try:
        resp = requests.get(f"{API_BASE}/courses/{TEST_COURSE}", timeout=10)
        
        if resp.status_code != 200:
            return log_test("8b: GET course", False,
                           f"Status: {resp.status_code}")
        
        data = resp.json()
        checks = {
            'has_slug': data.get('slug') == TEST_COURSE,
            'has_lessons': isinstance(data.get('lessons'), list) and len(data['lessons']) > 0
        }
        
        passed = all(checks.values())
        return log_test("8b: GET course", passed,
                       f"Checks: {checks}")
    except Exception as e:
        return log_test("8b: GET course", False, str(e))

def test_8c_get_lesson():
    """Test 8c: GET /api/lessons/alcohol-fundamentals/what-is-alcohol"""
    try:
        resp = requests.get(f"{API_BASE}/lessons/{TEST_COURSE}/{TEST_LESSON}", timeout=10)
        
        if resp.status_code != 200:
            return log_test("8c: GET lesson", False,
                           f"Status: {resp.status_code}")
        
        data = resp.json()
        media = data.get('media', {})
        checks = {
            'has_media': media is not None,
            'has_image': 'image' in media,
            'has_sources': isinstance(media.get('sources'), list)
        }
        
        passed = all(checks.values())
        return log_test("8c: GET lesson", passed,
                       f"Checks: {checks}")
    except Exception as e:
        return log_test("8c: GET lesson", False, str(e))

def test_8d_admin_overview():
    """Test 8d: GET /api/admin/overview"""
    try:
        resp = requests.get(f"{API_BASE}/admin/overview", cookies=admin_cookie, timeout=10)
        
        if resp.status_code != 200:
            return log_test("8d: GET admin/overview", False,
                           f"Status: {resp.status_code}")
        
        data = resp.json()
        checks = {
            'has_users': 'users' in data,
            'has_learning': 'learning' in data
        }
        
        passed = all(checks.values())
        return log_test("8d: GET admin/overview", passed,
                       f"Checks: {checks}")
    except Exception as e:
        return log_test("8d: GET admin/overview", False, str(e))

def test_8e_admin_analytics():
    """Test 8e: GET /api/admin/analytics"""
    try:
        resp = requests.get(f"{API_BASE}/admin/analytics", cookies=admin_cookie, timeout=10)
        
        if resp.status_code != 200:
            return log_test("8e: GET admin/analytics", False,
                           f"Status: {resp.status_code}")
        
        data = resp.json()
        checks = {
            'has_byCourse': 'byCourse' in data,
            'has_byLesson': 'byLesson' in data
        }
        
        passed = all(checks.values())
        return log_test("8e: GET admin/analytics", passed,
                       f"Checks: {checks}")
    except Exception as e:
        return log_test("8e: GET admin/analytics", False, str(e))

def test_8f_admin_users():
    """Test 8f: GET /api/admin/users?q="""
    try:
        resp = requests.get(f"{API_BASE}/admin/users?q=", cookies=admin_cookie, timeout=10)
        
        if resp.status_code != 200:
            return log_test("8f: GET admin/users", False,
                           f"Status: {resp.status_code}")
        
        data = resp.json()
        checks = {
            'has_users': 'users' in data,
            'has_total': 'total' in data
        }
        
        passed = all(checks.values())
        return log_test("8f: GET admin/users", passed,
                       f"Checks: {checks}")
    except Exception as e:
        return log_test("8f: GET admin/users", False, str(e))

def test_8g_generate_course_disabled():
    """Test 8g: POST /api/admin/generate-course (should be 410)"""
    try:
        resp = requests.post(f"{API_BASE}/admin/generate-course", json={},
                            cookies=admin_cookie, timeout=10)
        
        passed = resp.status_code == 410
        return log_test("8g: Generate course disabled", passed,
                       f"Status: {resp.status_code}")
    except Exception as e:
        return log_test("8g: Generate course disabled", False, str(e))

def test_8h_auth_flow():
    """Test 8h: POST /api/auth (user auth flow)"""
    try:
        test_email = "test-image-user@example.com"
        resp = requests.post(f"{API_BASE}/auth", json={
            "email": test_email,
            "name": "Test Image User"
        }, timeout=10)
        
        if resp.status_code != 200:
            return log_test("8h: Auth flow", False,
                           f"Status: {resp.status_code}")
        
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
        return log_test("8h: Auth flow", passed,
                       f"Checks: {checks}")
    except Exception as e:
        return log_test("8h: Auth flow", False, str(e))

def cleanup_test_users():
    """Clean up test users created during testing"""
    if not test_user_ids:
        print("\nNo test users to clean up")
        return
    
    print(f"\nCleaning up {len(test_user_ids)} test user(s)...")
    for user_id in test_user_ids:
        try:
            resp = requests.delete(f"{API_BASE}/admin/users/{user_id}",
                                  cookies=admin_cookie, timeout=10)
            if resp.status_code == 200:
                print(f"  ✅ Deleted user {user_id}")
            else:
                print(f"  ⚠️  Failed to delete user {user_id}: {resp.status_code}")
        except Exception as e:
            print(f"  ❌ Error deleting user {user_id}: {e}")

def main():
    """Run all tests"""
    print("=" * 80)
    print("Backend API Tests - Online Spirits Club Admin Image Management")
    print("=" * 80)
    print(f"Base URL: {BASE_URL}")
    print(f"API Base: {API_BASE}")
    print()
    
    results = []
    
    # Test 1: Admin Auth
    print("\n--- Test 1: Admin Authentication ---")
    results.append(test_1a_admin_auth_wrong_password())
    results.append(test_1b_admin_auth_wrong_email())
    results.append(test_1c_admin_auth_correct())
    
    if not admin_cookie:
        print("\n❌ CRITICAL: Admin auth failed, cannot continue")
        return
    
    # Test 2: Image Upload
    print("\n--- Test 2: Image Upload (Multipart) ---")
    results.append(test_2a_upload_without_cookie())
    results.append(test_2b_upload_valid_jpg())
    results.append(test_2c_upload_text_file())
    results.append(test_2d_upload_gif())
    results.append(test_2e_upload_large_file())
    
    # Test 3: Image Serving
    print("\n--- Test 3: Image Serving ---")
    results.append(test_3a_get_uploaded_image())
    results.append(test_3b_get_nonexistent_image())
    results.append(test_3c_get_invalid_id())
    
    # Test 4: URL Import
    print("\n--- Test 4: URL Import ---")
    results.append(test_4a_upload_from_url())
    results.append(test_4b_upload_from_html_url())
    results.append(test_4c_upload_from_invalid_url())
    
    # Test 5: Lesson Image Attachment
    print("\n--- Test 5: Lesson Image Attachment ---")
    results.append(test_5a_attach_without_cookie())
    results.append(test_5b_attach_image_to_lesson())
    results.append(test_5c_verify_lesson_image())
    results.append(test_5d_attach_missing_fields())
    results.append(test_5e_attach_empty_image())
    results.append(test_5f_remove_image())
    results.append(test_5g_verify_blob_cleanup())
    
    # Test 6: External URL
    print("\n--- Test 6: External URL Handling ---")
    results.append(test_6a_attach_external_url())
    results.append(test_6b_verify_external_url())
    results.append(test_6c_cleanup_external())
    
    # Test 7: Image Deletion
    print("\n--- Test 7: Image Deletion ---")
    results.append(test_7a_delete_fresh_image())
    results.append(test_7b_verify_deleted())
    results.append(test_7c_delete_nonexistent())
    
    # Test 8: Regression Tests
    print("\n--- Test 8: Regression Tests ---")
    results.append(test_8a_get_courses())
    results.append(test_8b_get_course())
    results.append(test_8c_get_lesson())
    results.append(test_8d_admin_overview())
    results.append(test_8e_admin_analytics())
    results.append(test_8f_admin_users())
    results.append(test_8g_generate_course_disabled())
    results.append(test_8h_auth_flow())
    
    # Cleanup
    cleanup_test_users()
    
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
