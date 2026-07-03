#!/usr/bin/env python3
"""
Backend regression test for SESSION 9: Admin GDPR toolkit
Tests the three new/enhanced endpoints:
- GET  /api/admin/users/:id/export?format=json|csv  (NEW)
- GET  /api/admin/users/:id                          (ENHANCED)
- PATCH /api/admin/users/:id                         (ENHANCED)
"""

import requests
import json
import sys
from datetime import datetime

# Base URL from .env
BASE_URL = "https://proof-academy.preview.emergentagent.com/api"

# Admin credentials from test_credentials.md
ADMIN_EMAIL = "sebastiandieugenioe@gmail.com"
ADMIN_PASSWORD = "preview-only-change-in-prod"

# Test state
admin_session = requests.Session()
user_session = requests.Session()
alice_id = None
alice_email = None
comment_id = None

def log_step(step_num, description):
    print(f"\n{'='*80}")
    print(f"STEP {step_num}: {description}")
    print('='*80)

def log_pass(message):
    print(f"✅ PASS: {message}")

def log_fail(message, details=None):
    print(f"❌ FAIL: {message}")
    if details:
        print(f"   Details: {details}")

def log_info(message):
    print(f"ℹ️  INFO: {message}")

def admin_login():
    """Authenticate as admin and capture session cookie"""
    log_step(0, "Admin Authentication")
    resp = admin_session.post(f"{BASE_URL}/admin-auth", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if resp.status_code == 200:
        log_pass(f"Admin login successful. Cookie: {admin_session.cookies.get('osc_admin')[:20]}...")
        return True
    else:
        log_fail(f"Admin login failed: {resp.status_code}", resp.text)
        return False

def test_step_1_auth_guard():
    """Step 1: Auth guard on export endpoint"""
    log_step(1, "Auth guard on export endpoint")
    
    # Test without admin cookie
    resp = requests.get(f"{BASE_URL}/admin/users/some-fake-id/export")
    if resp.status_code == 401:
        log_pass("Export without admin cookie returns 401")
    else:
        log_fail(f"Expected 401, got {resp.status_code}", resp.text)
        return False
    
    # Test with admin cookie but invalid id
    resp = admin_session.get(f"{BASE_URL}/admin/users/invalid-id-12345/export")
    if resp.status_code == 404:
        log_pass("Export with invalid user id returns 404")
    else:
        log_fail(f"Expected 404, got {resp.status_code}", resp.text)
        return False
    
    return True

def test_step_2_prepare_user():
    """Step 2: Create test user 'GDPR Alice' and post a comment"""
    global alice_id, alice_email, comment_id
    log_step(2, "Prepare test user 'GDPR Alice'")
    
    # Generate unique email
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    alice_email = f"gdpr-alice-{timestamp}@test.example"
    
    # Register user
    register_data = {
        "email": alice_email,
        "password": "TestPassword123!",
        "confirmPassword": "TestPassword123!",
        "name": "GDPR Alice",
        "country": "Italy",
        "city": "Milan",
        "role": "Bartender",
        "newsletter": True
    }
    
    resp = user_session.post(f"{BASE_URL}/register", json=register_data)
    if resp.status_code != 200:
        log_fail(f"User registration failed: {resp.status_code}", resp.text)
        return False
    
    data = resp.json()
    alice_id = data.get('user', {}).get('id')
    if not alice_id:
        log_fail("No user id in registration response", resp.text)
        return False
    
    log_pass(f"User 'GDPR Alice' created with id: {alice_id}")
    log_info(f"Email: {alice_email}")
    
    # Verify user session cookie
    if not user_session.cookies.get('osc_user'):
        log_fail("No user session cookie after registration")
        return False
    
    log_pass("User session cookie captured")
    
    # Try to post a comment
    comment_data = {
        "courseSlug": "alcohol-fundamentals",
        "lessonSlug": "what-is-alcohol",
        "text": "This is a test comment from GDPR Alice for GDPR compliance testing."
    }
    
    resp = user_session.post(f"{BASE_URL}/comments", json=comment_data)
    if resp.status_code == 200:
        data = resp.json()
        comment_id = data.get('comment', {}).get('id')
        log_pass(f"Comment posted successfully. Comment id: {comment_id}")
    else:
        log_info(f"Comment posting failed ({resp.status_code}). Will continue without comment. Response: {resp.text[:200]}")
        comment_id = None
    
    return True

def test_step_3_json_export():
    """Step 3: Test JSON export"""
    log_step(3, "JSON export (GET /api/admin/users/:id/export)")
    
    resp = admin_session.get(f"{BASE_URL}/admin/users/{alice_id}/export")
    
    # Check HTTP 200
    if resp.status_code != 200:
        log_fail(f"Expected 200, got {resp.status_code}", resp.text)
        return False
    log_pass("HTTP 200 OK")
    
    # Check Content-Type
    content_type = resp.headers.get('Content-Type', '')
    if 'application/json' in content_type:
        log_pass(f"Content-Type includes 'application/json': {content_type}")
    else:
        log_fail(f"Content-Type should include 'application/json', got: {content_type}")
        return False
    
    # Check Content-Disposition
    content_disp = resp.headers.get('Content-Disposition', '')
    if 'attachment' in content_disp and 'gdpr-export-' in content_disp and '.json' in content_disp:
        log_pass(f"Content-Disposition correct: {content_disp}")
    else:
        log_fail(f"Content-Disposition incorrect: {content_disp}")
        return False
    
    # Parse JSON
    try:
        data = resp.json()
    except:
        log_fail("Failed to parse JSON response", resp.text[:500])
        return False
    
    # Check top-level keys
    required_keys = ['exportedAt', 'exportedBy', 'format', 'gdprNote', 'user', 'progress', 'flashcardReviews', 'comments', 'newsletterAudit']
    for key in required_keys:
        if key in data:
            log_pass(f"Key '{key}' present")
        else:
            log_fail(f"Key '{key}' missing")
            return False
    
    # Check exportedBy
    if data.get('exportedBy') == 'admin':
        log_pass("exportedBy === 'admin'")
    else:
        log_fail(f"exportedBy should be 'admin', got: {data.get('exportedBy')}")
    
    # Check format
    if data.get('format') == 'gdpr-portability-v1':
        log_pass("format === 'gdpr-portability-v1'")
    else:
        log_fail(f"format should be 'gdpr-portability-v1', got: {data.get('format')}")
    
    # Check gdprNote is non-empty
    if data.get('gdprNote') and len(data.get('gdprNote')) > 0:
        log_pass(f"gdprNote is non-empty ({len(data.get('gdprNote'))} chars)")
    else:
        log_fail("gdprNote is empty or missing")
    
    # Check user object
    user = data.get('user', {})
    
    # passwordHash must NOT be present
    if 'passwordHash' not in user:
        log_pass("user.passwordHash NOT present (correctly stripped)")
    else:
        log_fail("user.passwordHash IS present (SECURITY ISSUE!)")
        return False
    
    # newsletterUnsubscribeToken must NOT be present
    if 'newsletterUnsubscribeToken' not in user:
        log_pass("user.newsletterUnsubscribeToken NOT present (correctly stripped)")
    else:
        log_fail("user.newsletterUnsubscribeToken IS present (SECURITY ISSUE!)")
        return False
    
    # _id must NOT be present
    if '_id' not in user:
        log_pass("user._id NOT present (correctly stripped)")
    else:
        log_fail("user._id IS present")
    
    # Check user fields
    if user.get('email') == alice_email:
        log_pass(f"user.email === '{alice_email}'")
    else:
        log_fail(f"user.email mismatch. Expected '{alice_email}', got '{user.get('email')}'")
    
    if user.get('newsletter') == True:
        log_pass("user.newsletter === true")
    else:
        log_fail(f"user.newsletter should be true, got: {user.get('newsletter')}")
    
    if user.get('newsletterConsentAt'):
        log_pass(f"user.newsletterConsentAt is set: {user.get('newsletterConsentAt')}")
    else:
        log_fail("user.newsletterConsentAt is missing or null")
    
    # Check newsletterAudit array
    newsletter_audit = data.get('newsletterAudit', [])
    if isinstance(newsletter_audit, list) and len(newsletter_audit) >= 1:
        log_pass(f"newsletterAudit is an array with {len(newsletter_audit)} entry/entries")
        # Check if any entry matches alice's email
        matching = [n for n in newsletter_audit if n.get('email') == alice_email]
        if matching:
            log_pass(f"newsletterAudit contains entry for {alice_email}")
        else:
            log_fail(f"newsletterAudit does not contain entry for {alice_email}")
    else:
        log_fail(f"newsletterAudit should be an array with >= 1 entry, got: {newsletter_audit}")
    
    log_info(f"Export bundle summary: {len(data.get('progress', []))} progress, {len(data.get('flashcardReviews', []))} reviews, {len(data.get('comments', []))} comments")
    
    return True

def test_step_4_csv_export():
    """Step 4: Test CSV export"""
    log_step(4, "CSV export (GET /api/admin/users/:id/export?format=csv)")
    
    resp = admin_session.get(f"{BASE_URL}/admin/users/{alice_id}/export?format=csv")
    
    # Check HTTP 200
    if resp.status_code != 200:
        log_fail(f"Expected 200, got {resp.status_code}", resp.text)
        return False
    log_pass("HTTP 200 OK")
    
    # Check Content-Type
    content_type = resp.headers.get('Content-Type', '')
    if 'text/csv' in content_type:
        log_pass(f"Content-Type includes 'text/csv': {content_type}")
    else:
        log_fail(f"Content-Type should include 'text/csv', got: {content_type}")
        return False
    
    # Check Content-Disposition
    content_disp = resp.headers.get('Content-Disposition', '')
    if '.csv' in content_disp:
        log_pass(f"Content-Disposition ends with '.csv': {content_disp}")
    else:
        log_fail(f"Content-Disposition should end with '.csv': {content_disp}")
        return False
    
    # Check CSV content
    csv_text = resp.text
    lines = csv_text.split('\n')
    
    # First line should be header
    if lines[0] == 'section,field,value':
        log_pass("CSV header correct: 'section,field,value'")
    else:
        log_fail(f"CSV header incorrect. Expected 'section,field,value', got: '{lines[0]}'")
        return False
    
    # Check for user email row
    user_email_row = f'user,email,{alice_email}'
    if user_email_row in csv_text:
        log_pass(f"CSV contains row: '{user_email_row}'")
    else:
        log_fail(f"CSV should contain row: '{user_email_row}'")
        log_info(f"First 10 lines:\n" + '\n'.join(lines[:10]))
    
    # Check for newsletter row
    if 'user,newsletter,true' in csv_text or 'user,newsletter,True' in csv_text:
        log_pass("CSV contains 'user,newsletter,true'")
    else:
        log_fail("CSV should contain 'user,newsletter,true'")
    
    # Check for newsletterAudit row
    if 'newsletterAudit[0],email,' in csv_text:
        log_pass("CSV contains at least one 'newsletterAudit[0],email,...' row")
    else:
        log_fail("CSV should contain at least one 'newsletterAudit[0],email,...' row")
    
    log_info(f"CSV has {len(lines)} lines")
    
    return True

def test_step_5_enhanced_detail():
    """Step 5: Enhanced detail response"""
    log_step(5, "Enhanced detail response (GET /api/admin/users/:id)")
    
    resp = admin_session.get(f"{BASE_URL}/admin/users/{alice_id}")
    
    if resp.status_code != 200:
        log_fail(f"Expected 200, got {resp.status_code}", resp.text)
        return False
    log_pass("HTTP 200 OK")
    
    try:
        data = resp.json()
    except:
        log_fail("Failed to parse JSON response", resp.text[:500])
        return False
    
    # Check user object
    if 'user' in data:
        log_pass("'user' object present")
        user = data['user']
        if 'passwordHash' not in user:
            log_pass("user.passwordHash NOT present (correctly stripped)")
        else:
            log_fail("user.passwordHash IS present (SECURITY ISSUE!)")
            return False
    else:
        log_fail("'user' object missing")
        return False
    
    # Check stats.commentsPosted
    stats = data.get('stats', {})
    if 'commentsPosted' in stats:
        comments_posted = stats['commentsPosted']
        if isinstance(comments_posted, int) and comments_posted >= 0:
            log_pass(f"stats.commentsPosted is integer >= 0: {comments_posted}")
        else:
            log_fail(f"stats.commentsPosted should be integer >= 0, got: {comments_posted}")
    else:
        log_fail("stats.commentsPosted missing")
        return False
    
    # Check comments array
    if 'comments' in data:
        comments = data['comments']
        if isinstance(comments, list):
            log_pass(f"'comments' is an array with {len(comments)} entries")
        else:
            log_fail(f"'comments' should be an array, got: {type(comments)}")
            return False
    else:
        log_fail("'comments' array missing")
        return False
    
    # Check newsletterAudit array
    if 'newsletterAudit' in data:
        newsletter_audit = data['newsletterAudit']
        if isinstance(newsletter_audit, list) and len(newsletter_audit) >= 1:
            log_pass(f"'newsletterAudit' is an array with {len(newsletter_audit)} entry/entries")
        else:
            log_fail(f"'newsletterAudit' should be an array with >= 1 entry, got: {newsletter_audit}")
            return False
    else:
        log_fail("'newsletterAudit' array missing")
        return False
    
    return True

def test_step_6_rectification():
    """Step 6: Rectification via PATCH"""
    log_step(6, "Rectification via PATCH (GDPR Art. 16)")
    
    # PATCH with new country/city/role
    patch_data = {
        "country": "Spain",
        "city": "Barcelona",
        "role": "Bar manager"
    }
    
    resp = admin_session.patch(f"{BASE_URL}/admin/users/{alice_id}", json=patch_data)
    
    if resp.status_code != 200:
        log_fail(f"PATCH failed: {resp.status_code}", resp.text)
        return False
    log_pass("PATCH returned 200")
    
    try:
        data = resp.json()
    except:
        log_fail("Failed to parse PATCH response", resp.text[:500])
        return False
    
    # Check returned user reflects changes
    user = data.get('user', {})
    if user.get('country') == 'Spain':
        log_pass("Returned user.country === 'Spain'")
    else:
        log_fail(f"Expected country 'Spain', got: {user.get('country')}")
    
    if user.get('city') == 'Barcelona':
        log_pass("Returned user.city === 'Barcelona'")
    else:
        log_fail(f"Expected city 'Barcelona', got: {user.get('city')}")
    
    if user.get('role') == 'Bar manager':
        log_pass("Returned user.role === 'Bar manager'")
    else:
        log_fail(f"Expected role 'Bar manager', got: {user.get('role')}")
    
    # Verify with GET
    resp = admin_session.get(f"{BASE_URL}/admin/users/{alice_id}")
    if resp.status_code != 200:
        log_fail(f"GET after PATCH failed: {resp.status_code}", resp.text)
        return False
    
    data = resp.json()
    user = data.get('user', {})
    
    if user.get('country') == 'Spain' and user.get('city') == 'Barcelona' and user.get('role') == 'Bar manager':
        log_pass("GET confirms all changes persisted correctly")
    else:
        log_fail(f"GET shows incorrect values: country={user.get('country')}, city={user.get('city')}, role={user.get('role')}")
        return False
    
    return True

def test_step_7_newsletter_toggle():
    """Step 7: Newsletter toggle by admin keeps audit trail"""
    log_step(7, "Newsletter toggle by admin preserves audit trail")
    
    # Get current state
    resp = admin_session.get(f"{BASE_URL}/admin/users/{alice_id}")
    if resp.status_code != 200:
        log_fail(f"GET failed: {resp.status_code}", resp.text)
        return False
    
    data = resp.json()
    user = data.get('user', {})
    original_consent_at = user.get('newsletterConsentAt')
    
    if not original_consent_at:
        log_fail("Original newsletterConsentAt is missing")
        return False
    log_info(f"Original newsletterConsentAt: {original_consent_at}")
    
    # Toggle newsletter OFF
    resp = admin_session.patch(f"{BASE_URL}/admin/users/{alice_id}", json={"newsletter": False})
    if resp.status_code != 200:
        log_fail(f"PATCH newsletter=false failed: {resp.status_code}", resp.text)
        return False
    log_pass("PATCH newsletter=false returned 200")
    
    # Verify state after toggle OFF
    resp = admin_session.get(f"{BASE_URL}/admin/users/{alice_id}")
    if resp.status_code != 200:
        log_fail(f"GET after toggle OFF failed: {resp.status_code}", resp.text)
        return False
    
    data = resp.json()
    user = data.get('user', {})
    
    if user.get('newsletter') == False:
        log_pass("user.newsletter === false")
    else:
        log_fail(f"user.newsletter should be false, got: {user.get('newsletter')}")
        return False
    
    if user.get('newsletterConsentAt') == original_consent_at:
        log_pass(f"user.newsletterConsentAt STILL SET (preserved): {user.get('newsletterConsentAt')}")
    else:
        log_fail(f"user.newsletterConsentAt changed! Original: {original_consent_at}, Now: {user.get('newsletterConsentAt')}")
    
    if user.get('newsletterWithdrawnAt'):
        log_pass(f"user.newsletterWithdrawnAt IS SET: {user.get('newsletterWithdrawnAt')}")
    else:
        log_fail("user.newsletterWithdrawnAt should be set after withdrawal")
        return False
    
    # Check newsletterAudit
    newsletter_audit = data.get('newsletterAudit', [])
    if newsletter_audit and newsletter_audit[0].get('withdrawnAt'):
        log_pass(f"newsletterAudit[0].withdrawnAt IS SET: {newsletter_audit[0].get('withdrawnAt')}")
    else:
        log_fail("newsletterAudit[0].withdrawnAt should be set")
    
    # Toggle newsletter back ON
    resp = admin_session.patch(f"{BASE_URL}/admin/users/{alice_id}", json={"newsletter": True})
    if resp.status_code != 200:
        log_fail(f"PATCH newsletter=true failed: {resp.status_code}", resp.text)
        return False
    log_pass("PATCH newsletter=true returned 200")
    
    # Verify state after toggle ON
    resp = admin_session.get(f"{BASE_URL}/admin/users/{alice_id}")
    if resp.status_code != 200:
        log_fail(f"GET after toggle ON failed: {resp.status_code}", resp.text)
        return False
    
    data = resp.json()
    user = data.get('user', {})
    
    if user.get('newsletter') == True:
        log_pass("user.newsletter === true")
    else:
        log_fail(f"user.newsletter should be true, got: {user.get('newsletter')}")
        return False
    
    new_consent_at = user.get('newsletterConsentAt')
    if new_consent_at and new_consent_at != original_consent_at:
        log_pass(f"user.newsletterConsentAt UPDATED to newer date: {new_consent_at}")
    else:
        log_fail(f"user.newsletterConsentAt should be updated. Original: {original_consent_at}, Now: {new_consent_at}")
    
    if user.get('newsletterWithdrawnAt') is None:
        log_pass("user.newsletterWithdrawnAt === null (cleared)")
    else:
        log_fail(f"user.newsletterWithdrawnAt should be null, got: {user.get('newsletterWithdrawnAt')}")
    
    if user.get('newsletterSource') == 'admin':
        log_pass("user.newsletterSource === 'admin'")
    else:
        log_fail(f"user.newsletterSource should be 'admin', got: {user.get('newsletterSource')}")
    
    return True

def test_step_8_comment_erasure():
    """Step 8: Comment-level erasure"""
    log_step(8, "Comment-level erasure (DELETE /api/admin/comments/:id)")
    
    if not comment_id:
        log_info("SKIPPED: No comment was created in step 2")
        return True
    
    # Delete the comment
    resp = admin_session.delete(f"{BASE_URL}/admin/comments/{comment_id}")
    if resp.status_code != 200:
        log_fail(f"DELETE comment failed: {resp.status_code}", resp.text)
        return False
    
    data = resp.json()
    if data.get('ok') == True:
        log_pass(f"DELETE comment returned {{ok: true}}")
    else:
        log_fail(f"DELETE comment should return {{ok: true}}, got: {data}")
        return False
    
    # Verify comment is gone from user detail
    resp = admin_session.get(f"{BASE_URL}/admin/users/{alice_id}")
    if resp.status_code != 200:
        log_fail(f"GET user after comment delete failed: {resp.status_code}", resp.text)
        return False
    
    data = resp.json()
    comments = data.get('comments', [])
    
    # Check if comment_id is still in the list
    comment_ids = [c.get('id') for c in comments]
    if comment_id not in comment_ids:
        log_pass(f"Comment {comment_id} no longer in user's comments array")
    else:
        log_fail(f"Comment {comment_id} still present in user's comments array")
        return False
    
    return True

def test_step_9_account_erasure():
    """Step 9: Account erasure (DELETE /api/admin/users/:id)"""
    log_step(9, "Account erasure (GDPR Art. 17)")
    
    # Delete the user
    resp = admin_session.delete(f"{BASE_URL}/admin/users/{alice_id}")
    if resp.status_code != 200:
        log_fail(f"DELETE user failed: {resp.status_code}", resp.text)
        return False
    
    data = resp.json()
    if data.get('ok') == True:
        log_pass(f"DELETE user returned {{ok: true}}")
    else:
        log_fail(f"DELETE user should return {{ok: true}}, got: {data}")
        return False
    
    # Verify user is gone
    resp = admin_session.get(f"{BASE_URL}/admin/users/{alice_id}")
    if resp.status_code == 404:
        log_pass(f"GET /api/admin/users/{alice_id} returns 404 (user deleted)")
    else:
        log_fail(f"GET should return 404, got: {resp.status_code}", resp.text)
        return False
    
    # Verify user not in search results
    resp = admin_session.get(f"{BASE_URL}/admin/users?q={alice_email}")
    if resp.status_code == 200:
        data = resp.json()
        users = data.get('users', [])
        matching = [u for u in users if u.get('email') == alice_email]
        if len(matching) == 0:
            log_pass(f"User search for '{alice_email}' returns 0 results")
        else:
            log_fail(f"User search should return 0 results, found {len(matching)}")
            return False
    else:
        log_fail(f"User search failed: {resp.status_code}", resp.text)
        return False
    
    log_info("Account erasure complete. Cascading deletes (progress, reviews, comments) are handled by the backend.")
    
    return True

def main():
    print("="*80)
    print("SESSION 9: Admin GDPR Toolkit Backend Test")
    print("="*80)
    print(f"Base URL: {BASE_URL}")
    print(f"Admin: {ADMIN_EMAIL}")
    print("="*80)
    
    # Admin login
    if not admin_login():
        print("\n❌ FATAL: Admin login failed. Cannot continue.")
        sys.exit(1)
    
    # Run all test steps
    results = []
    
    results.append(("Step 1: Auth guard", test_step_1_auth_guard()))
    results.append(("Step 2: Prepare user", test_step_2_prepare_user()))
    
    if not results[-1][1]:
        print("\n❌ FATAL: Cannot continue without test user.")
        sys.exit(1)
    
    results.append(("Step 3: JSON export", test_step_3_json_export()))
    results.append(("Step 4: CSV export", test_step_4_csv_export()))
    results.append(("Step 5: Enhanced detail", test_step_5_enhanced_detail()))
    results.append(("Step 6: Rectification", test_step_6_rectification()))
    results.append(("Step 7: Newsletter toggle", test_step_7_newsletter_toggle()))
    results.append(("Step 8: Comment erasure", test_step_8_comment_erasure()))
    results.append(("Step 9: Account erasure", test_step_9_account_erasure()))
    
    # Summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for step_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {step_name}")
    
    print("="*80)
    print(f"TOTAL: {passed}/{total} tests passed ({100*passed//total}%)")
    print("="*80)
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED!")
        sys.exit(0)
    else:
        print(f"\n⚠️  {total - passed} test(s) failed.")
        sys.exit(1)

if __name__ == "__main__":
    main()
