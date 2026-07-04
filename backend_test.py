#!/usr/bin/env python3
"""
SESSION 11 - Email verification + password management backend regression test
Tests T1-T10 as specified in /app/test_result.md
"""

import requests
import time
import hashlib
import secrets
from pymongo import MongoClient
from datetime import datetime, timedelta
import os

# Configuration
BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://proof-academy.preview.emergentagent.com')
API_URL = f"{BASE_URL}/api"
MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.getenv('DB_NAME', 'osc_db')
ADMIN_EMAIL = 'sebastiandieugenioe@gmail.com'
ADMIN_PASSWORD = 'preview-only-change-in-prod'

# MongoDB connection
mongo_client = MongoClient(MONGO_URL)
db = mongo_client[DB_NAME]

# Test state
test_users = []
test_results = {
    'T1': {'passed': 0, 'failed': 0, 'details': []},
    'T2': {'passed': 0, 'failed': 0, 'details': []},
    'T3': {'passed': 0, 'failed': 0, 'details': []},
    'T4': {'passed': 0, 'failed': 0, 'details': []},
    'T5': {'passed': 0, 'failed': 0, 'details': []},
    'T6': {'passed': 0, 'failed': 0, 'details': []},
    'T7': {'passed': 0, 'failed': 0, 'details': []},
    'T8': {'passed': 0, 'failed': 0, 'details': []},
    'T9': {'passed': 0, 'failed': 0, 'details': []},
    'T10': {'passed': 0, 'failed': 0, 'details': []},
}

def log_pass(test_id, msg):
    """Log a passing test"""
    test_results[test_id]['passed'] += 1
    test_results[test_id]['details'].append(f"✅ {msg}")
    print(f"✅ {test_id}: {msg}")

def log_fail(test_id, msg):
    """Log a failing test"""
    test_results[test_id]['failed'] += 1
    test_results[test_id]['details'].append(f"❌ {msg}")
    print(f"❌ {test_id}: {msg}")

def generate_test_token():
    """Generate a raw token and its SHA-256 hash"""
    raw = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw.encode()).hexdigest()
    return raw, token_hash

def insert_known_token(user_id, purpose, raw_token):
    """Insert a known token into the database for testing"""
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    now = datetime.utcnow()
    expires_at = now + timedelta(hours=1)
    
    # Invalidate any existing tokens for this user/purpose
    db.auth_tokens.update_many(
        {'userId': user_id, 'purpose': purpose, 'usedAt': None},
        {'$set': {'usedAt': now}}
    )
    
    # Insert new token
    token_doc = {
        'id': secrets.token_urlsafe(16),
        'userId': user_id,
        'purpose': purpose,
        'tokenHash': token_hash,
        'createdAt': now,
        'expiresAt': expires_at,
        'usedAt': None
    }
    db.auth_tokens.insert_one(token_doc)
    return raw_token

def register_user(email, password='testpass123', name='Test User', newsletter=False):
    """Register a new user"""
    payload = {
        'email': email,
        'password': password,
        'confirmPassword': password,
        'name': name,
        'country': 'Ireland',
        'city': 'Dublin',
        'role': 'Bartender',
        'newsletter': newsletter
    }
    resp = requests.post(f"{API_URL}/register", json=payload)
    return resp

def admin_login():
    """Login as admin and return session"""
    session = requests.Session()
    resp = session.post(f"{API_URL}/admin-auth", json={
        'email': ADMIN_EMAIL,
        'password': ADMIN_PASSWORD
    })
    if resp.status_code == 200:
        return session
    return None

def cleanup_test_users():
    """Delete all test users created during testing"""
    print("\n🧹 CLEANUP: Deleting test users...")
    admin_session = admin_login()
    if not admin_session:
        print("❌ Failed to login as admin for cleanup")
        return
    
    for user_id in test_users:
        try:
            resp = admin_session.delete(f"{API_URL}/admin/users/{user_id}")
            if resp.status_code == 200:
                print(f"✅ Deleted user {user_id}")
            else:
                print(f"⚠️  Failed to delete user {user_id}: {resp.status_code}")
        except Exception as e:
            print(f"⚠️  Error deleting user {user_id}: {e}")
    
    # Also clean up auth_tokens for test users
    try:
        result = db.auth_tokens.delete_many({'userId': {'$in': test_users}})
        print(f"✅ Deleted {result.deleted_count} auth_tokens")
    except Exception as e:
        print(f"⚠️  Error deleting auth_tokens: {e}")

def print_summary():
    """Print test summary"""
    print("\n" + "="*80)
    print("TEST SUMMARY - SESSION 11: Email Verification + Password Management")
    print("="*80)
    
    total_passed = 0
    total_failed = 0
    
    for test_id in sorted(test_results.keys()):
        result = test_results[test_id]
        passed = result['passed']
        failed = result['failed']
        total_passed += passed
        total_failed += failed
        
        status = "✅ PASS" if failed == 0 else "❌ FAIL"
        print(f"\n{test_id}: {status} ({passed} passed, {failed} failed)")
        for detail in result['details']:
            print(f"  {detail}")
    
    print("\n" + "="*80)
    print(f"TOTAL: {total_passed} passed, {total_failed} failed")
    if total_failed == 0:
        print("🎉 ALL TESTS PASSED!")
    else:
        print(f"⚠️  {total_failed} TESTS FAILED")
    print("="*80)

# ============================================================================
# T1: Register creates unverified user
# ============================================================================
def test_t1_register_unverified():
    print("\n" + "="*80)
    print("T1: Register creates unverified user")
    print("="*80)
    
    ts = int(time.time())
    email = f"t1-{ts}@example.test"
    
    try:
        # Register user
        resp = register_user(email, newsletter=False)
        
        if resp.status_code == 200:
            log_pass('T1', f"Register returned 200")
            data = resp.json()
            
            # Check response structure
            if data.get('ok') == True:
                log_pass('T1', "Response has ok:true")
            else:
                log_fail('T1', f"Expected ok:true, got {data.get('ok')}")
            
            if data.get('emailVerified') == False:
                log_pass('T1', "emailVerified:false")
            else:
                log_fail('T1', f"Expected emailVerified:false, got {data.get('emailVerified')}")
            
            if data.get('emailSkipped') == True:
                log_pass('T1', "emailSkipped:true (RESEND unconfigured)")
            else:
                log_fail('T1', f"Expected emailSkipped:true, got {data.get('emailSkipped')}")
            
            # Check NO session cookie
            if 'osc_user' not in resp.cookies:
                log_pass('T1', "No osc_user cookie set (user not logged in)")
            else:
                log_fail('T1', "osc_user cookie was set (should not be)")
            
            # Try GET /api/me without cookie
            me_resp = requests.get(f"{API_URL}/me")
            if me_resp.status_code == 401:
                log_pass('T1', "GET /api/me without cookie returns 401")
            else:
                log_fail('T1', f"GET /api/me returned {me_resp.status_code}, expected 401")
            
            # Verify DB state
            user = db.users.find_one({'email': email})
            if user:
                test_users.append(user['id'])
                
                if user.get('emailVerified') == False:
                    log_pass('T1', "DB: emailVerified:false")
                else:
                    log_fail('T1', f"DB: emailVerified should be false, got {user.get('emailVerified')}")
                
                if user.get('emailVerifiedAt') is None:
                    log_pass('T1', "DB: emailVerifiedAt:null")
                else:
                    log_fail('T1', f"DB: emailVerifiedAt should be null, got {user.get('emailVerifiedAt')}")
                
                if user.get('passwordLastChangedAt'):
                    log_pass('T1', "DB: passwordLastChangedAt is set")
                else:
                    log_fail('T1', "DB: passwordLastChangedAt is missing")
                
                # Check auth_tokens
                token = db.auth_tokens.find_one({'userId': user['id'], 'purpose': 'verify_email', 'usedAt': None})
                if token:
                    log_pass('T1', "DB: verify_email token exists")
                    
                    if token.get('expiresAt') and token['expiresAt'] > datetime.utcnow():
                        log_pass('T1', "DB: token expiresAt > now")
                    else:
                        log_fail('T1', "DB: token expiresAt is invalid")
                else:
                    log_fail('T1', "DB: verify_email token not found")
            else:
                log_fail('T1', f"User {email} not found in DB")
        else:
            log_fail('T1', f"Register failed with status {resp.status_code}: {resp.text}")
    
    except Exception as e:
        log_fail('T1', f"Exception: {e}")

# ============================================================================
# T2: Login blocked for unverified
# ============================================================================
def test_t2_login_blocked():
    print("\n" + "="*80)
    print("T2: Login blocked for unverified")
    print("="*80)
    
    # Get the T1 user
    ts = int(time.time())
    # Find the most recent t1 user
    user = db.users.find_one({'email': {'$regex': '^t1-.*@example.test$'}}, sort=[('createdAt', -1)])
    
    if not user:
        log_fail('T2', "T1 user not found in DB")
        return
    
    try:
        resp = requests.post(f"{API_URL}/login", json={
            'email': user['email'],
            'password': 'testpass123'
        })
        
        if resp.status_code == 403:
            log_pass('T2', "Login returned 403 (blocked)")
            data = resp.json()
            
            if data.get('code') == 'EMAIL_NOT_VERIFIED':
                log_pass('T2', "Response code:'EMAIL_NOT_VERIFIED'")
            else:
                log_fail('T2', f"Expected code:'EMAIL_NOT_VERIFIED', got {data.get('code')}")
            
            if 'Please verify your email' in data.get('error', ''):
                log_pass('T2', "Error message mentions verification")
            else:
                log_fail('T2', f"Error message: {data.get('error')}")
            
            if data.get('email') == user['email']:
                log_pass('T2', "Response includes user email")
            else:
                log_fail('T2', f"Expected email:{user['email']}, got {data.get('email')}")
            
            # Check NO session cookie
            if 'osc_user' not in resp.cookies:
                log_pass('T2', "No osc_user cookie set")
            else:
                log_fail('T2', "osc_user cookie was set (should not be)")
        else:
            log_fail('T2', f"Login returned {resp.status_code}, expected 403: {resp.text}")
    
    except Exception as e:
        log_fail('T2', f"Exception: {e}")

# ============================================================================
# T3: Verify email happy path
# ============================================================================
def test_t3_verify_email():
    print("\n" + "="*80)
    print("T3: Verify email happy path")
    print("="*80)
    
    # Get the T1 user
    user = db.users.find_one({'email': {'$regex': '^t1-.*@example.test$'}}, sort=[('createdAt', -1)])
    
    if not user:
        log_fail('T3', "T1 user not found in DB")
        return
    
    try:
        # Generate and insert a known token
        raw_token = secrets.token_urlsafe(32)
        insert_known_token(user['id'], 'verify_email', raw_token)
        log_pass('T3', f"Inserted known token for user {user['email']}")
        
        # Verify email with the token
        session = requests.Session()
        resp = session.post(f"{API_URL}/auth/verify-email", json={'token': raw_token})
        
        if resp.status_code == 200:
            log_pass('T3', "verify-email returned 200")
            data = resp.json()
            
            if data.get('ok') == True:
                log_pass('T3', "Response has ok:true")
            else:
                log_fail('T3', f"Expected ok:true, got {data.get('ok')}")
            
            # Check session cookie is set
            if 'osc_user' in session.cookies:
                log_pass('T3', "osc_user cookie set (user logged in)")
            else:
                log_fail('T3', "osc_user cookie not set")
            
            # GET /api/me with the session
            me_resp = session.get(f"{API_URL}/me")
            if me_resp.status_code == 200:
                log_pass('T3', "GET /api/me with session returns 200")
                me_data = me_resp.json()
                
                if me_data.get('emailVerified') == True:
                    log_pass('T3', "emailVerified:true in /me response")
                else:
                    log_fail('T3', f"Expected emailVerified:true, got {me_data.get('emailVerified')}")
                
                if me_data.get('emailVerifiedAt'):
                    log_pass('T3', "emailVerifiedAt is set")
                else:
                    log_fail('T3', "emailVerifiedAt is missing")
            else:
                log_fail('T3', f"GET /api/me returned {me_resp.status_code}")
            
            # Try to use the same token again (should fail - single use)
            resp2 = requests.post(f"{API_URL}/auth/verify-email", json={'token': raw_token})
            if resp2.status_code == 400:
                log_pass('T3', "Reusing token returns 400 (single-use)")
            else:
                log_fail('T3', f"Reusing token returned {resp2.status_code}, expected 400")
            
            # Try with bogus token
            resp3 = requests.post(f"{API_URL}/auth/verify-email", json={'token': 'bogus-not-real-token'})
            if resp3.status_code == 400:
                log_pass('T3', "Bogus token returns 400")
            else:
                log_fail('T3', f"Bogus token returned {resp3.status_code}, expected 400")
        else:
            log_fail('T3', f"verify-email failed with status {resp.status_code}: {resp.text}")
    
    except Exception as e:
        log_fail('T3', f"Exception: {e}")

# ============================================================================
# T4: Login now works
# ============================================================================
def test_t4_login_works():
    print("\n" + "="*80)
    print("T4: Login now works")
    print("="*80)
    
    # Get the T1 user (now verified)
    user = db.users.find_one({'email': {'$regex': '^t1-.*@example.test$'}}, sort=[('createdAt', -1)])
    
    if not user:
        log_fail('T4', "T1 user not found in DB")
        return
    
    try:
        session = requests.Session()
        resp = session.post(f"{API_URL}/login", json={
            'email': user['email'],
            'password': 'testpass123'
        })
        
        if resp.status_code == 200:
            log_pass('T4', "Login returned 200")
            data = resp.json()
            
            if data.get('user'):
                log_pass('T4', "Response includes user object")
            else:
                log_fail('T4', "Response missing user object")
            
            if 'osc_user' in session.cookies:
                log_pass('T4', "osc_user cookie set")
            else:
                log_fail('T4', "osc_user cookie not set")
        else:
            log_fail('T4', f"Login failed with status {resp.status_code}: {resp.text}")
    
    except Exception as e:
        log_fail('T4', f"Exception: {e}")

# ============================================================================
# T5: Resend verification (generic + rate limit)
# ============================================================================
def test_t5_resend_verification():
    print("\n" + "="*80)
    print("T5: Resend verification (generic + rate limit)")
    print("="*80)
    
    ts = int(time.time())
    email = f"t5-{ts}@example.test"
    
    try:
        # Register a fresh unverified user
        resp = register_user(email, newsletter=False)
        if resp.status_code == 200:
            log_pass('T5', f"Registered user {email}")
            user = db.users.find_one({'email': email})
            if user:
                test_users.append(user['id'])
        else:
            log_fail('T5', f"Failed to register user: {resp.status_code}")
            return
        
        # Resend verification for existing user
        resp1 = requests.post(f"{API_URL}/auth/resend-verification", json={'email': email})
        if resp1.status_code == 200:
            log_pass('T5', "Resend for existing user returns 200")
            data1 = resp1.json()
            if data1.get('ok') == True:
                log_pass('T5', "Response has ok:true")
            else:
                log_fail('T5', f"Expected ok:true, got {data1.get('ok')}")
            
            # Check that a new token was created
            token = db.auth_tokens.find_one({'userId': user['id'], 'purpose': 'verify_email', 'usedAt': None})
            if token:
                log_pass('T5', "New verify_email token exists in DB")
            else:
                log_fail('T5', "New verify_email token not found")
        else:
            log_fail('T5', f"Resend returned {resp1.status_code}")
        
        # Resend for non-existent user (should still return 200 - generic)
        nobody_email = f"nobody-{ts}@example.test"
        resp2 = requests.post(f"{API_URL}/auth/resend-verification", json={'email': nobody_email})
        if resp2.status_code == 200:
            log_pass('T5', "Resend for non-existent user returns 200 (generic)")
        else:
            log_fail('T5', f"Resend for non-existent returned {resp2.status_code}, expected 200")
        
        # Resend with invalid email (should still return 200 - generic)
        resp3 = requests.post(f"{API_URL}/auth/resend-verification", json={'email': 'not an email'})
        if resp3.status_code == 200:
            log_pass('T5', "Resend with invalid email returns 200 (generic)")
        else:
            log_fail('T5', f"Resend with invalid email returned {resp3.status_code}, expected 200")
        
        # Test rate limit (3/hr per email)
        # We've already sent 1, send 3 more quickly
        rate_limited = False
        for i in range(3):
            resp = requests.post(f"{API_URL}/auth/resend-verification", json={'email': email})
            if resp.status_code == 429:
                rate_limited = True
                log_pass('T5', f"Rate limit hit on attempt {i+2} (429)")
                break
            time.sleep(0.1)
        
        if not rate_limited:
            log_fail('T5', "Rate limit not triggered after 4 requests (expected 3/hr)")
    
    except Exception as e:
        log_fail('T5', f"Exception: {e}")

# ============================================================================
# T6: Forgot password (generic + rate limit)
# ============================================================================
def test_t6_forgot_password():
    print("\n" + "="*80)
    print("T6: Forgot password (generic + rate limit)")
    print("="*80)
    
    ts = int(time.time())
    email = f"t6-{ts}@example.test"
    
    try:
        # Register and verify a user
        resp = register_user(email, newsletter=False)
        if resp.status_code == 200:
            log_pass('T6', f"Registered user {email}")
            user = db.users.find_one({'email': email})
            if user:
                test_users.append(user['id'])
                
                # Verify the user using T3 technique
                raw_token = secrets.token_urlsafe(32)
                insert_known_token(user['id'], 'verify_email', raw_token)
                verify_resp = requests.post(f"{API_URL}/auth/verify-email", json={'token': raw_token})
                if verify_resp.status_code == 200:
                    log_pass('T6', "User verified")
                else:
                    log_fail('T6', f"Verification failed: {verify_resp.status_code}")
                    return
        else:
            log_fail('T6', f"Failed to register user: {resp.status_code}")
            return
        
        # Request password reset for existing user
        resp1 = requests.post(f"{API_URL}/auth/forgot-password", json={'email': email})
        if resp1.status_code == 200:
            log_pass('T6', "Forgot password for existing user returns 200")
            data1 = resp1.json()
            if data1.get('ok') == True:
                log_pass('T6', "Response has ok:true")
            else:
                log_fail('T6', f"Expected ok:true, got {data1.get('ok')}")
            
            # Check that a password_reset token was created
            token = db.auth_tokens.find_one({'userId': user['id'], 'purpose': 'password_reset', 'usedAt': None})
            if token:
                log_pass('T6', "password_reset token exists in DB")
                
                # Check expiresAt is within 1 hour
                expires_in = (token['expiresAt'] - datetime.utcnow()).total_seconds()
                if 0 < expires_in <= 3600:
                    log_pass('T6', f"Token expiresAt within 1h ({expires_in:.0f}s)")
                else:
                    log_fail('T6', f"Token expiresAt not within 1h: {expires_in:.0f}s")
            else:
                log_fail('T6', "password_reset token not found")
        else:
            log_fail('T6', f"Forgot password returned {resp1.status_code}")
        
        # Request for non-existent user (should still return 200 - generic)
        nobody_email = f"nobody-{ts}@example.test"
        resp2 = requests.post(f"{API_URL}/auth/forgot-password", json={'email': nobody_email})
        if resp2.status_code == 200:
            log_pass('T6', "Forgot password for non-existent user returns 200 (generic)")
        else:
            log_fail('T6', f"Forgot password for non-existent returned {resp2.status_code}, expected 200")
        
        # Test rate limit - fire multiple times for the same email
        # The response should STILL be 200 even when rate-limited (no enumeration)
        for i in range(3):
            resp = requests.post(f"{API_URL}/auth/forgot-password", json={'email': email})
            if resp.status_code == 200:
                if i == 2:
                    log_pass('T6', "Rate-limited requests still return 200 (no enumeration)")
            else:
                log_fail('T6', f"Request {i+1} returned {resp.status_code}, expected 200 even when rate-limited")
            time.sleep(0.1)
    
    except Exception as e:
        log_fail('T6', f"Exception: {e}")

# ============================================================================
# T7: Reset password happy path
# ============================================================================
def test_t7_reset_password():
    print("\n" + "="*80)
    print("T7: Reset password happy path")
    print("="*80)
    
    # Get the T6 user
    user = db.users.find_one({'email': {'$regex': '^t6-.*@example.test$'}}, sort=[('createdAt', -1)])
    
    if not user:
        log_fail('T7', "T6 user not found in DB")
        return
    
    try:
        # Generate and insert a known password_reset token
        raw_token = secrets.token_urlsafe(32)
        insert_known_token(user['id'], 'password_reset', raw_token)
        log_pass('T7', f"Inserted known password_reset token for {user['email']}")
        
        # Reset password
        resp = requests.post(f"{API_URL}/auth/reset-password", json={
            'token': raw_token,
            'password': 'newpass456',
            'confirmPassword': 'newpass456'
        })
        
        if resp.status_code == 200:
            log_pass('T7', "reset-password returned 200")
            data = resp.json()
            
            if data.get('ok') == True:
                log_pass('T7', "Response has ok:true")
            else:
                log_fail('T7', f"Expected ok:true, got {data.get('ok')}")
            
            # Check that osc_user cookie is cleared (Max-Age=0)
            set_cookie = resp.headers.get('Set-Cookie', '')
            if 'osc_user' in set_cookie and ('Max-Age=0' in set_cookie or 'max-age=0' in set_cookie):
                log_pass('T7', "osc_user cookie cleared (Max-Age=0)")
            else:
                log_fail('T7', f"osc_user cookie not properly cleared: {set_cookie}")
            
            # Try to login with OLD password (should fail)
            resp_old = requests.post(f"{API_URL}/login", json={
                'email': user['email'],
                'password': 'testpass123'
            })
            if resp_old.status_code == 401:
                log_pass('T7', "Login with old password returns 401")
            else:
                log_fail('T7', f"Login with old password returned {resp_old.status_code}, expected 401")
            
            # Login with NEW password (should work)
            session = requests.Session()
            resp_new = session.post(f"{API_URL}/login", json={
                'email': user['email'],
                'password': 'newpass456'
            })
            if resp_new.status_code == 200:
                log_pass('T7', "Login with new password returns 200")
            else:
                log_fail('T7', f"Login with new password returned {resp_new.status_code}")
            
            # Try to reuse the same token (should fail - single use)
            resp2 = requests.post(f"{API_URL}/auth/reset-password", json={
                'token': raw_token,
                'password': 'anotherpass',
                'confirmPassword': 'anotherpass'
            })
            if resp2.status_code == 400:
                log_pass('T7', "Reusing token returns 400 (single-use)")
            else:
                log_fail('T7', f"Reusing token returned {resp2.status_code}, expected 400")
            
            # Try with short password (validation)
            raw_token2 = secrets.token_urlsafe(32)
            insert_known_token(user['id'], 'password_reset', raw_token2)
            resp3 = requests.post(f"{API_URL}/auth/reset-password", json={
                'token': raw_token2,
                'password': 'short',
                'confirmPassword': 'short'
            })
            if resp3.status_code == 400:
                log_pass('T7', "Short password returns 400 (validation)")
            else:
                log_fail('T7', f"Short password returned {resp3.status_code}, expected 400")
        else:
            log_fail('T7', f"reset-password failed with status {resp.status_code}: {resp.text}")
    
    except Exception as e:
        log_fail('T7', f"Exception: {e}")

# ============================================================================
# T8: Change password (authenticated)
# ============================================================================
def test_t8_change_password():
    print("\n" + "="*80)
    print("T8: Change password (authenticated)")
    print("="*80)
    
    # Get the T6 user (now with password 'newpass456')
    user = db.users.find_one({'email': {'$regex': '^t6-.*@example.test$'}}, sort=[('createdAt', -1)])
    
    if not user:
        log_fail('T8', "T6 user not found in DB")
        return
    
    try:
        # Login as T6 user
        session = requests.Session()
        login_resp = session.post(f"{API_URL}/login", json={
            'email': user['email'],
            'password': 'newpass456'
        })
        
        if login_resp.status_code != 200:
            log_fail('T8', f"Failed to login: {login_resp.status_code}")
            return
        
        log_pass('T8', "Logged in as T6 user")
        
        # Change password
        resp = session.post(f"{API_URL}/me/change-password", json={
            'currentPassword': 'newpass456',
            'newPassword': 'finalpass789',
            'confirmNewPassword': 'finalpass789'
        })
        
        if resp.status_code == 200:
            log_pass('T8', "change-password returned 200")
            data = resp.json()
            
            if data.get('ok') == True:
                log_pass('T8', "Response has ok:true")
            else:
                log_fail('T8', f"Expected ok:true, got {data.get('ok')}")
            
            # Check that osc_user cookie is REFRESHED (new token)
            set_cookie = resp.headers.get('Set-Cookie', '')
            if 'osc_user' in set_cookie and 'Max-Age=0' not in set_cookie:
                log_pass('T8', "osc_user cookie refreshed (new token)")
            else:
                log_fail('T8', f"osc_user cookie not refreshed: {set_cookie}")
            
            # Verify the session still works
            me_resp = session.get(f"{API_URL}/me")
            if me_resp.status_code == 200:
                log_pass('T8', "Session still valid after password change")
            else:
                log_fail('T8', f"Session invalid after password change: {me_resp.status_code}")
        else:
            log_fail('T8', f"change-password failed: {resp.status_code} - {resp.text}")
        
        # Test with wrong current password
        resp2 = session.post(f"{API_URL}/me/change-password", json={
            'currentPassword': 'wrongpass',
            'newPassword': 'anotherpass',
            'confirmNewPassword': 'anotherpass'
        })
        if resp2.status_code == 401:
            log_pass('T8', "Wrong current password returns 401")
        else:
            log_fail('T8', f"Wrong current password returned {resp2.status_code}, expected 401")
        
        # Test unauthenticated (no cookie)
        resp3 = requests.post(f"{API_URL}/me/change-password", json={
            'currentPassword': 'finalpass789',
            'newPassword': 'anotherpass',
            'confirmNewPassword': 'anotherpass'
        })
        if resp3.status_code == 401:
            log_pass('T8', "Unauthenticated request returns 401")
        else:
            log_fail('T8', f"Unauthenticated request returned {resp3.status_code}, expected 401")
        
        # Test with short password (validation)
        resp4 = session.post(f"{API_URL}/me/change-password", json={
            'currentPassword': 'finalpass789',
            'newPassword': 'short',
            'confirmNewPassword': 'short'
        })
        if resp4.status_code == 400:
            log_pass('T8', "Short password returns 400 (validation)")
        else:
            log_fail('T8', f"Short password returned {resp4.status_code}, expected 400")
        
        # Test with same password as current
        resp5 = session.post(f"{API_URL}/me/change-password", json={
            'currentPassword': 'finalpass789',
            'newPassword': 'finalpass789',
            'confirmNewPassword': 'finalpass789'
        })
        if resp5.status_code == 400:
            log_pass('T8', "Same password as current returns 400")
        else:
            log_fail('T8', f"Same password returned {resp5.status_code}, expected 400")
    
    except Exception as e:
        log_fail('T8', f"Exception: {e}")

# ============================================================================
# T9: Admin verify controls
# ============================================================================
def test_t9_admin_verify():
    print("\n" + "="*80)
    print("T9: Admin verify controls")
    print("="*80)
    
    ts = int(time.time())
    email_t9 = f"t9-{ts}@example.test"
    email_t9b = f"t9b-{ts}@example.test"
    
    try:
        # Register unverified t9 user
        resp = register_user(email_t9, newsletter=False)
        if resp.status_code == 200:
            log_pass('T9', f"Registered user {email_t9}")
            user_t9 = db.users.find_one({'email': email_t9})
            if user_t9:
                test_users.append(user_t9['id'])
        else:
            log_fail('T9', f"Failed to register t9: {resp.status_code}")
            return
        
        # Admin login
        admin_session = admin_login()
        if not admin_session:
            log_fail('T9', "Failed to login as admin")
            return
        
        log_pass('T9', "Logged in as admin")
        
        # Mark t9 as verified
        resp1 = admin_session.post(f"{API_URL}/admin/users/{user_t9['id']}/mark-verified")
        if resp1.status_code == 200:
            log_pass('T9', "mark-verified returned 200")
            data1 = resp1.json()
            
            if data1.get('emailVerifiedAt'):
                log_pass('T9', "Response includes emailVerifiedAt")
            else:
                log_fail('T9', "Response missing emailVerifiedAt")
            
            # Verify in DB
            user_t9_updated = db.users.find_one({'id': user_t9['id']})
            if user_t9_updated and user_t9_updated.get('emailVerified') == True:
                log_pass('T9', "DB: emailVerified:true after mark-verified")
            else:
                log_fail('T9', "DB: emailVerified not set to true")
        else:
            log_fail('T9', f"mark-verified failed: {resp1.status_code} - {resp1.text}")
        
        # Register unverified t9b user
        resp2 = register_user(email_t9b, newsletter=False)
        if resp2.status_code == 200:
            log_pass('T9', f"Registered user {email_t9b}")
            user_t9b = db.users.find_one({'email': email_t9b})
            if user_t9b:
                test_users.append(user_t9b['id'])
        else:
            log_fail('T9', f"Failed to register t9b: {resp2.status_code}")
            return
        
        # Admin resend verification for t9b
        resp3 = admin_session.post(f"{API_URL}/admin/users/{user_t9b['id']}/resend-verification")
        if resp3.status_code == 200:
            log_pass('T9', "resend-verification returned 200")
            data3 = resp3.json()
            
            if data3.get('emailSent') == False:
                log_pass('T9', "emailSent:false (RESEND unconfigured)")
            else:
                log_fail('T9', f"Expected emailSent:false, got {data3.get('emailSent')}")
            
            if data3.get('emailSkipped') == True:
                log_pass('T9', "emailSkipped:true (RESEND unconfigured)")
            else:
                log_fail('T9', f"Expected emailSkipped:true, got {data3.get('emailSkipped')}")
            
            if data3.get('error') is None:
                log_pass('T9', "error:null")
            else:
                log_fail('T9', f"Expected error:null, got {data3.get('error')}")
        else:
            log_fail('T9', f"resend-verification failed: {resp3.status_code} - {resp3.text}")
        
        # Try to resend for ALREADY verified user (t9)
        resp4 = admin_session.post(f"{API_URL}/admin/users/{user_t9['id']}/resend-verification")
        if resp4.status_code == 400:
            log_pass('T9', "resend-verification for verified user returns 400")
            data4 = resp4.json()
            if 'already verified' in data4.get('error', '').lower():
                log_pass('T9', "Error message mentions 'already verified'")
            else:
                log_fail('T9', f"Error message: {data4.get('error')}")
        else:
            log_fail('T9', f"resend-verification for verified user returned {resp4.status_code}, expected 400")
    
    except Exception as e:
        log_fail('T9', f"Exception: {e}")

# ============================================================================
# T10: Admin overview mailer status
# ============================================================================
def test_t10_admin_overview():
    print("\n" + "="*80)
    print("T10: Admin overview mailer status")
    print("="*80)
    
    try:
        # Admin login
        admin_session = admin_login()
        if not admin_session:
            log_fail('T10', "Failed to login as admin")
            return
        
        log_pass('T10', "Logged in as admin")
        
        # GET /api/admin/overview
        resp = admin_session.get(f"{API_URL}/admin/overview")
        if resp.status_code == 200:
            log_pass('T10', "GET /admin/overview returned 200")
            data = resp.json()
            
            mailer = data.get('mailer')
            if mailer:
                log_pass('T10', "Response includes mailer object")
                
                if mailer.get('provider') == 'resend':
                    log_pass('T10', "mailer.provider:'resend'")
                else:
                    log_fail('T10', f"Expected provider:'resend', got {mailer.get('provider')}")
                
                if mailer.get('configured') == False:
                    log_pass('T10', "mailer.configured:false")
                else:
                    log_fail('T10', f"Expected configured:false, got {mailer.get('configured')}")
                
                if mailer.get('hasKey') == False:
                    log_pass('T10', "mailer.hasKey:false")
                else:
                    log_fail('T10', f"Expected hasKey:false, got {mailer.get('hasKey')}")
                
                if mailer.get('hasFrom') == False:
                    log_pass('T10', "mailer.hasFrom:false")
                else:
                    log_fail('T10', f"Expected hasFrom:false, got {mailer.get('hasFrom')}")
                
                if mailer.get('from') is None:
                    log_pass('T10', "mailer.from:null")
                else:
                    log_fail('T10', f"Expected from:null, got {mailer.get('from')}")
            else:
                log_fail('T10', "Response missing mailer object")
        else:
            log_fail('T10', f"GET /admin/overview failed: {resp.status_code} - {resp.text}")
    
    except Exception as e:
        log_fail('T10', f"Exception: {e}")

# ============================================================================
# MAIN
# ============================================================================
if __name__ == '__main__':
    print("\n" + "="*80)
    print("SESSION 11: Email Verification + Password Management Backend Test")
    print("="*80)
    print(f"Base URL: {BASE_URL}")
    print(f"API URL: {API_URL}")
    print(f"MongoDB: {MONGO_URL}/{DB_NAME}")
    print("="*80)
    
    try:
        # Run all tests
        test_t1_register_unverified()
        test_t2_login_blocked()
        test_t3_verify_email()
        test_t4_login_works()
        test_t5_resend_verification()
        test_t6_forgot_password()
        test_t7_reset_password()
        test_t8_change_password()
        test_t9_admin_verify()
        test_t10_admin_overview()
        
        # Print summary
        print_summary()
        
    finally:
        # Cleanup
        cleanup_test_users()
        mongo_client.close()
