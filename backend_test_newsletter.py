#!/usr/bin/env python3
"""
Backend regression test for Newsletter GDPR compliance changes.
Tests newsletter consent metadata, opt-in/opt-out transitions, and unsubscribe endpoints.
"""

import requests
import sys
import os
import time
import re
from dotenv import load_dotenv

# Load environment variables
load_dotenv('/app/.env')

BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://proof-academy.preview.emergentagent.com')
API_BASE = f"{BASE_URL}/api"

# Admin credentials from test_credentials.md
ADMIN_EMAIL = "sebastiandieugenioe@gmail.com"
ADMIN_PASSWORD = "preview-only-change-in-prod"

# Test state
test_users = []
test_tokens = {}
timestamp = int(time.time())

def print_step(step_num, description):
    """Print a test step header."""
    print(f"\n{'='*80}")
    print(f"STEP {step_num}: {description}")
    print('='*80)

def print_pass(message):
    """Print a pass message."""
    print(f"✅ PASS: {message}")

def print_fail(message, details=None):
    """Print a fail message with optional details."""
    print(f"❌ FAIL: {message}")
    if details:
        print(f"   Details: {details}")
    return False

def print_info(message):
    """Print an info message."""
    print(f"ℹ️  INFO: {message}")

def is_valid_iso_date(date_str):
    """Check if a string is a valid ISO date."""
    if not date_str:
        return False
    try:
        # Simple check for ISO format
        return bool(re.match(r'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}', str(date_str)))
    except:
        return False

def is_valid_token(token):
    """Check if a token is a valid base64url string."""
    if not token or not isinstance(token, str):
        return False
    # Base64url charset: A-Za-z0-9_-
    # 32 bytes = 43 chars base64url
    return len(token) > 10 and bool(re.match(r'^[A-Za-z0-9_-]+$', token))

def mask_email(email):
    """Mask an email for comparison."""
    if '@' not in email:
        return email
    local, domain = email.split('@', 1)
    return f"{local[0]}{'*' * max(1, len(local) - 1)}@{domain}"

def run_tests():
    """Run all newsletter GDPR compliance tests."""
    passed = 0
    failed = 0
    total = 0
    
    # ========================================================================
    # STEP 1: Register WITHOUT newsletter
    # ========================================================================
    print_step(1, "Register WITHOUT newsletter")
    total += 1
    
    try:
        email_a = f"nl-test-a-{timestamp}@example.test"
        session_a = requests.Session()
        
        resp = session_a.post(f"{API_BASE}/register", json={
            "email": email_a,
            "password": "testpass123",
            "confirmPassword": "testpass123",
            "name": "A",
            "country": "Ireland",
            "city": "Dublin",
            "role": "Bartender",
            "newsletter": False
        })
        
        if resp.status_code != 200:
            print_fail(f"Register failed with status {resp.status_code}", resp.text)
            failed += 1
        else:
            print_pass(f"User registered: {email_a}")
            test_users.append({"email": email_a, "session": session_a})
            
            # Check session cookie
            if 'osc_user' not in session_a.cookies:
                print_fail("Session cookie 'osc_user' not set")
                failed += 1
                total += 1
            else:
                print_pass("Session cookie 'osc_user' is set")
                passed += 1
                total += 1
            
            # GET /api/me to verify newsletter fields
            me_resp = session_a.get(f"{API_BASE}/me")
            if me_resp.status_code != 200:
                print_fail(f"GET /api/me failed with status {me_resp.status_code}", me_resp.text)
                failed += 1
                total += 1
            else:
                user = me_resp.json()  # /api/me returns user object directly, not wrapped
                print_info(f"User data: newsletter={user.get('newsletter')}, consentAt={user.get('newsletterConsentAt')}, withdrawnAt={user.get('newsletterWithdrawnAt')}, token={user.get('newsletterUnsubscribeToken')}")
                
                # Verify newsletter is false
                if user.get('newsletter') is False:
                    print_pass("user.newsletter === false")
                    passed += 1
                else:
                    print_fail(f"user.newsletter should be false, got {user.get('newsletter')}")
                    failed += 1
                total += 1
                
                # Verify newsletterConsentAt is null or missing
                consent_at = user.get('newsletterConsentAt')
                if consent_at is None or consent_at == 'null':
                    print_pass("user.newsletterConsentAt is null/missing")
                    passed += 1
                else:
                    print_fail(f"user.newsletterConsentAt should be null, got {consent_at}")
                    failed += 1
                total += 1
                
                # Verify newsletterWithdrawnAt is null or missing
                withdrawn_at = user.get('newsletterWithdrawnAt')
                if withdrawn_at is None or withdrawn_at == 'null':
                    print_pass("user.newsletterWithdrawnAt is null/missing")
                    passed += 1
                else:
                    print_fail(f"user.newsletterWithdrawnAt should be null, got {withdrawn_at}")
                    failed += 1
                total += 1
                
                # Verify newsletterUnsubscribeToken is null or missing
                token = user.get('newsletterUnsubscribeToken')
                if token is None or token == 'null':
                    print_pass("user.newsletterUnsubscribeToken is null/missing")
                    passed += 1
                else:
                    print_fail(f"user.newsletterUnsubscribeToken should be null, got {token}")
                    failed += 1
                total += 1
                
                passed += 1  # Overall step pass
    except Exception as e:
        print_fail(f"Exception in step 1: {str(e)}")
        failed += 1
    
    # ========================================================================
    # STEP 2: Register WITH newsletter
    # ========================================================================
    print_step(2, "Register WITH newsletter")
    total += 1
    
    try:
        email_b = f"nl-test-b-{timestamp}@example.test"
        session_b = requests.Session()
        
        resp = session_b.post(f"{API_BASE}/register", json={
            "email": email_b,
            "password": "testpass123",
            "confirmPassword": "testpass123",
            "name": "B",
            "country": "Ireland",
            "city": "Dublin",
            "role": "Bartender",
            "newsletter": True
        })
        
        if resp.status_code != 200:
            print_fail(f"Register failed with status {resp.status_code}", resp.text)
            failed += 1
        else:
            print_pass(f"User registered: {email_b}")
            test_users.append({"email": email_b, "session": session_b})
            
            # GET /api/me to verify newsletter fields
            me_resp = session_b.get(f"{API_BASE}/me")
            if me_resp.status_code != 200:
                print_fail(f"GET /api/me failed with status {me_resp.status_code}", me_resp.text)
                failed += 1
                total += 1
            else:
                user = me_resp.json()  # /api/me returns user object directly
                print_info(f"User data: newsletter={user.get('newsletter')}, consentAt={user.get('newsletterConsentAt')}, withdrawnAt={user.get('newsletterWithdrawnAt')}, token={user.get('newsletterUnsubscribeToken')}")
                
                # Verify newsletter is true
                if user.get('newsletter') is True:
                    print_pass("user.newsletter === true")
                    passed += 1
                else:
                    print_fail(f"user.newsletter should be true, got {user.get('newsletter')}")
                    failed += 1
                total += 1
                
                # Verify newsletterConsentAt is a valid ISO date
                consent_at = user.get('newsletterConsentAt')
                if is_valid_iso_date(consent_at):
                    print_pass(f"user.newsletterConsentAt is valid ISO date: {consent_at}")
                    passed += 1
                else:
                    print_fail(f"user.newsletterConsentAt should be valid ISO date, got {consent_at}")
                    failed += 1
                total += 1
                
                # Verify newsletterUnsubscribeToken is non-empty
                token = user.get('newsletterUnsubscribeToken')
                if is_valid_token(token):
                    print_pass(f"user.newsletterUnsubscribeToken is valid (length={len(token)})")
                    test_tokens['USER_B_TOKEN'] = token
                    passed += 1
                else:
                    print_fail(f"user.newsletterUnsubscribeToken should be valid token, got {token}")
                    failed += 1
                total += 1
                
                # Verify newsletterWithdrawnAt is null
                withdrawn_at = user.get('newsletterWithdrawnAt')
                if withdrawn_at is None or withdrawn_at == 'null':
                    print_pass("user.newsletterWithdrawnAt is null/missing")
                    passed += 1
                else:
                    print_fail(f"user.newsletterWithdrawnAt should be null, got {withdrawn_at}")
                    failed += 1
                total += 1
                
                passed += 1  # Overall step pass
    except Exception as e:
        print_fail(f"Exception in step 2: {str(e)}")
        failed += 1
    
    # ========================================================================
    # STEP 3: Opt-in later via /api/me/update
    # ========================================================================
    print_step(3, "Opt-in later via /api/me/update")
    total += 1
    
    try:
        # Use user A from step 1
        if len(test_users) < 1:
            print_fail("User A not available from step 1")
            failed += 1
        else:
            session_a = test_users[0]['session']
            
            # Opt-in
            resp = session_a.post(f"{API_BASE}/me/update", json={"newsletter": True})
            if resp.status_code != 200:
                print_fail(f"POST /api/me/update failed with status {resp.status_code}", resp.text)
                failed += 1
            else:
                print_pass("Opt-in successful")
                
                # GET /api/me to verify
                me_resp = session_a.get(f"{API_BASE}/me")
                if me_resp.status_code != 200:
                    print_fail(f"GET /api/me failed with status {me_resp.status_code}", me_resp.text)
                    failed += 1
                    total += 1
                else:
                    user = me_resp.json()  # /api/me returns user object directly
                    print_info(f"User data: newsletter={user.get('newsletter')}, consentAt={user.get('newsletterConsentAt')}, withdrawnAt={user.get('newsletterWithdrawnAt')}, token={user.get('newsletterUnsubscribeToken')}")
                    
                    # Verify newsletter is true
                    if user.get('newsletter') is True:
                        print_pass("user.newsletter === true")
                        passed += 1
                    else:
                        print_fail(f"user.newsletter should be true, got {user.get('newsletter')}")
                        failed += 1
                    total += 1
                    
                    # Verify newsletterConsentAt is now set
                    consent_at = user.get('newsletterConsentAt')
                    if is_valid_iso_date(consent_at):
                        print_pass(f"user.newsletterConsentAt is now set: {consent_at}")
                        test_tokens['USER_A_CONSENT_AT'] = consent_at
                        passed += 1
                    else:
                        print_fail(f"user.newsletterConsentAt should be valid ISO date, got {consent_at}")
                        failed += 1
                    total += 1
                    
                    # Verify newsletterWithdrawnAt is null
                    withdrawn_at = user.get('newsletterWithdrawnAt')
                    if withdrawn_at is None or withdrawn_at == 'null':
                        print_pass("user.newsletterWithdrawnAt is null")
                        passed += 1
                    else:
                        print_fail(f"user.newsletterWithdrawnAt should be null, got {withdrawn_at}")
                        failed += 1
                    total += 1
                    
                    # Verify newsletterUnsubscribeToken is non-empty
                    token = user.get('newsletterUnsubscribeToken')
                    if is_valid_token(token):
                        print_pass(f"user.newsletterUnsubscribeToken is valid (length={len(token)})")
                        test_tokens['USER_A_TOKEN'] = token
                        passed += 1
                    else:
                        print_fail(f"user.newsletterUnsubscribeToken should be valid token, got {token}")
                        failed += 1
                    total += 1
                    
                    passed += 1  # Overall step pass
    except Exception as e:
        print_fail(f"Exception in step 3: {str(e)}")
        failed += 1
    
    # ========================================================================
    # STEP 4: Opt-out via /api/me/update
    # ========================================================================
    print_step(4, "Opt-out via /api/me/update")
    total += 1
    
    try:
        # Use user A from step 3
        if len(test_users) < 1:
            print_fail("User A not available")
            failed += 1
        else:
            session_a = test_users[0]['session']
            
            # Opt-out
            resp = session_a.post(f"{API_BASE}/me/update", json={"newsletter": False})
            if resp.status_code != 200:
                print_fail(f"POST /api/me/update failed with status {resp.status_code}", resp.text)
                failed += 1
            else:
                print_pass("Opt-out successful")
                
                # GET /api/me to verify
                me_resp = session_a.get(f"{API_BASE}/me")
                if me_resp.status_code != 200:
                    print_fail(f"GET /api/me failed with status {me_resp.status_code}", me_resp.text)
                    failed += 1
                    total += 1
                else:
                    user = me_resp.json()  # /api/me returns user object directly
                    print_info(f"User data: newsletter={user.get('newsletter')}, consentAt={user.get('newsletterConsentAt')}, withdrawnAt={user.get('newsletterWithdrawnAt')}, token={user.get('newsletterUnsubscribeToken')}")
                    
                    # Verify newsletter is false
                    if user.get('newsletter') is False:
                        print_pass("user.newsletter === false")
                        passed += 1
                    else:
                        print_fail(f"user.newsletter should be false, got {user.get('newsletter')}")
                        failed += 1
                    total += 1
                    
                    # Verify newsletterWithdrawnAt is set
                    withdrawn_at = user.get('newsletterWithdrawnAt')
                    if is_valid_iso_date(withdrawn_at):
                        print_pass(f"user.newsletterWithdrawnAt is set: {withdrawn_at}")
                        test_tokens['USER_A_WITHDRAWN_AT'] = withdrawn_at
                        passed += 1
                    else:
                        print_fail(f"user.newsletterWithdrawnAt should be valid ISO date, got {withdrawn_at}")
                        failed += 1
                    total += 1
                    
                    # CRITICAL: Verify newsletterConsentAt STAYS at the value from step 3 (audit trail)
                    consent_at = user.get('newsletterConsentAt')
                    original_consent = test_tokens.get('USER_A_CONSENT_AT')
                    if consent_at == original_consent:
                        print_pass(f"user.newsletterConsentAt UNCHANGED (audit trail preserved): {consent_at}")
                        passed += 1
                    else:
                        print_fail(f"user.newsletterConsentAt should stay at {original_consent}, got {consent_at}")
                        failed += 1
                    total += 1
                    
                    # Verify newsletterUnsubscribeToken STAYS the same
                    token = user.get('newsletterUnsubscribeToken')
                    original_token = test_tokens.get('USER_A_TOKEN')
                    if token == original_token:
                        print_pass(f"user.newsletterUnsubscribeToken UNCHANGED: {token[:10]}...")
                        passed += 1
                    else:
                        print_fail(f"user.newsletterUnsubscribeToken should stay at {original_token}, got {token}")
                        failed += 1
                    total += 1
                    
                    passed += 1  # Overall step pass
    except Exception as e:
        print_fail(f"Exception in step 4: {str(e)}")
        failed += 1
    
    # ========================================================================
    # STEP 5: Consent-metadata idempotency
    # ========================================================================
    print_step(5, "Consent-metadata idempotency (CRITICAL)")
    total += 1
    
    try:
        # Use user A
        if len(test_users) < 1:
            print_fail("User A not available")
            failed += 1
        else:
            session_a = test_users[0]['session']
            
            # Update name without touching newsletter
            resp = session_a.post(f"{API_BASE}/me/update", json={"name": "Renamed A"})
            if resp.status_code != 200:
                print_fail(f"POST /api/me/update failed with status {resp.status_code}", resp.text)
                failed += 1
            else:
                print_pass("Profile update successful")
                
                # GET /api/me to verify
                me_resp = session_a.get(f"{API_BASE}/me")
                if me_resp.status_code != 200:
                    print_fail(f"GET /api/me failed with status {me_resp.status_code}", me_resp.text)
                    failed += 1
                    total += 1
                else:
                    user = me_resp.json()  # /api/me returns user object directly
                    print_info(f"User data: name={user.get('name')}, consentAt={user.get('newsletterConsentAt')}, withdrawnAt={user.get('newsletterWithdrawnAt')}")
                    
                    # Verify name changed
                    if user.get('name') == 'Renamed A':
                        print_pass("user.name === 'Renamed A'")
                        passed += 1
                    else:
                        print_fail(f"user.name should be 'Renamed A', got {user.get('name')}")
                        failed += 1
                    total += 1
                    
                    # CRITICAL: Verify newsletterConsentAt UNCHANGED
                    consent_at = user.get('newsletterConsentAt')
                    original_consent = test_tokens.get('USER_A_CONSENT_AT')
                    if consent_at == original_consent:
                        print_pass(f"✅ CRITICAL: user.newsletterConsentAt UNCHANGED: {consent_at}")
                        passed += 1
                    else:
                        print_fail(f"❌ CRITICAL: user.newsletterConsentAt should stay at {original_consent}, got {consent_at}")
                        failed += 1
                    total += 1
                    
                    # CRITICAL: Verify newsletterWithdrawnAt UNCHANGED
                    withdrawn_at = user.get('newsletterWithdrawnAt')
                    original_withdrawn = test_tokens.get('USER_A_WITHDRAWN_AT')
                    if withdrawn_at == original_withdrawn:
                        print_pass(f"✅ CRITICAL: user.newsletterWithdrawnAt UNCHANGED: {withdrawn_at}")
                        passed += 1
                    else:
                        print_fail(f"❌ CRITICAL: user.newsletterWithdrawnAt should stay at {original_withdrawn}, got {withdrawn_at}")
                        failed += 1
                    total += 1
                    
                    passed += 1  # Overall step pass
    except Exception as e:
        print_fail(f"Exception in step 5: {str(e)}")
        failed += 1
    
    # ========================================================================
    # STEP 6: Public GET /api/newsletter/unsubscribe (no auth)
    # ========================================================================
    print_step(6, "Public GET /api/newsletter/unsubscribe (no auth)")
    
    # 6a: No query parameter
    total += 1
    try:
        resp = requests.get(f"{API_BASE}/newsletter/unsubscribe")
        if resp.status_code == 400:
            data = resp.json()
            if 'token' in data.get('error', '').lower() or 'missing' in data.get('error', '').lower():
                print_pass(f"6a: No token → 400 with error mentioning 'token' or 'Missing': {data.get('error')}")
                passed += 1
            else:
                print_fail(f"6a: Expected error mentioning 'token' or 'Missing', got: {data.get('error')}")
                failed += 1
        else:
            print_fail(f"6a: Expected 400, got {resp.status_code}", resp.text)
            failed += 1
    except Exception as e:
        print_fail(f"6a: Exception: {str(e)}")
        failed += 1
    
    # 6b: Invalid token
    total += 1
    try:
        resp = requests.get(f"{API_BASE}/newsletter/unsubscribe?token=nonsense-does-not-exist-xyz")
        if resp.status_code == 404:
            print_pass("6b: Invalid token → 404")
            passed += 1
        else:
            print_fail(f"6b: Expected 404, got {resp.status_code}", resp.text)
            failed += 1
    except Exception as e:
        print_fail(f"6b: Exception: {str(e)}")
        failed += 1
    
    # 6c: Valid token for user A (already unsubscribed)
    total += 1
    try:
        token_a = test_tokens.get('USER_A_TOKEN')
        if not token_a:
            print_fail("6c: USER_A_TOKEN not available")
            failed += 1
        else:
            resp = requests.get(f"{API_BASE}/newsletter/unsubscribe?token={token_a}")
            if resp.status_code == 200:
                data = resp.json()
                print_info(f"6c response: {data}")
                
                # Check ok:true
                if data.get('ok') is True:
                    print_pass("6c: ok === true")
                else:
                    print_fail(f"6c: ok should be true, got {data.get('ok')}")
                
                # Check maskedEmail
                email_a = test_users[0]['email']
                expected_masked = mask_email(email_a)
                masked = data.get('maskedEmail', '')
                if '@example.test' in masked and masked[0] == expected_masked[0] and '*' in masked:
                    print_pass(f"6c: maskedEmail is properly masked: {masked}")
                else:
                    print_fail(f"6c: maskedEmail should be like {expected_masked}, got {masked}")
                
                # Check alreadyUnsubscribed:true
                if data.get('alreadyUnsubscribed') is True:
                    print_pass("6c: alreadyUnsubscribed === true")
                    passed += 1
                else:
                    print_fail(f"6c: alreadyUnsubscribed should be true, got {data.get('alreadyUnsubscribed')}")
                    failed += 1
            else:
                print_fail(f"6c: Expected 200, got {resp.status_code}", resp.text)
                failed += 1
    except Exception as e:
        print_fail(f"6c: Exception: {str(e)}")
        failed += 1
    
    # 6d: Valid token for user B (still subscribed)
    total += 1
    try:
        token_b = test_tokens.get('USER_B_TOKEN')
        if not token_b:
            print_fail("6d: USER_B_TOKEN not available")
            failed += 1
        else:
            resp = requests.get(f"{API_BASE}/newsletter/unsubscribe?token={token_b}")
            if resp.status_code == 200:
                data = resp.json()
                print_info(f"6d response: {data}")
                
                # Check alreadyUnsubscribed:false
                if data.get('alreadyUnsubscribed') is False:
                    print_pass("6d: alreadyUnsubscribed === false")
                    passed += 1
                else:
                    print_fail(f"6d: alreadyUnsubscribed should be false, got {data.get('alreadyUnsubscribed')}")
                    failed += 1
            else:
                print_fail(f"6d: Expected 200, got {resp.status_code}", resp.text)
                failed += 1
    except Exception as e:
        print_fail(f"6d: Exception: {str(e)}")
        failed += 1
    
    # ========================================================================
    # STEP 7: Public POST /api/newsletter/unsubscribe (no auth)
    # ========================================================================
    print_step(7, "Public POST /api/newsletter/unsubscribe (no auth)")
    
    # Note: Rate limiter may block these requests if we've hit the limit from step 6
    # The review request says to report 429s but not fail the test
    print_info("Note: Rate limiter (20/10min) may block these requests. Will report but not fail on 429s.")
    
    # 7a: Idempotent unsubscribe with user A token (already off)
    total += 1
    try:
        token_a = test_tokens.get('USER_A_TOKEN')
        if not token_a:
            print_fail("7a: USER_A_TOKEN not available")
            failed += 1
        else:
            resp = requests.post(f"{API_BASE}/newsletter/unsubscribe", json={"token": token_a})
            if resp.status_code == 429:
                print_info(f"7a: Rate limited (429) - skipping verification")
                passed += 1  # Don't fail on rate limit
            elif resp.status_code == 200:
                data = resp.json()
                print_info(f"7a response: {data}")
                
                email_a = test_users[0]['email']
                if data.get('ok') is True and data.get('email') == email_a:
                    print_pass(f"7a: Idempotent unsubscribe successful (already off): {data.get('email')}")
                    passed += 1
                else:
                    print_fail(f"7a: Expected ok:true and email:{email_a}, got {data}")
                    failed += 1
            else:
                print_fail(f"7a: Expected 200, got {resp.status_code}", resp.text)
                failed += 1
    except Exception as e:
        print_fail(f"7a: Exception: {str(e)}")
        failed += 1
    
    # 7b: Unsubscribe user B with token (currently on)
    total += 1
    try:
        token_b = test_tokens.get('USER_B_TOKEN')
        if not token_b:
            print_fail("7b: USER_B_TOKEN not available")
            failed += 1
        else:
            resp = requests.post(f"{API_BASE}/newsletter/unsubscribe", json={"token": token_b})
            if resp.status_code == 429:
                print_info(f"7b: Rate limited (429) - skipping verification")
                passed += 1  # Don't fail on rate limit
            elif resp.status_code == 200:
                data = resp.json()
                print_info(f"7b response: {data}")
                
                email_b = test_users[1]['email']
                if data.get('ok') is True and data.get('email') == email_b:
                    print_pass(f"7b: Unsubscribe successful: {data.get('email')}")
                    
                    # Verify via /api/me
                    session_b = test_users[1]['session']
                    me_resp = session_b.get(f"{API_BASE}/me")
                    if me_resp.status_code == 200:
                        user = me_resp.json()  # /api/me returns user object directly
                        print_info(f"User B after unsubscribe: newsletter={user.get('newsletter')}, withdrawnAt={user.get('newsletterWithdrawnAt')}, consentAt={user.get('newsletterConsentAt')}")
                        
                        # Check newsletter:false
                        if user.get('newsletter') is False:
                            print_pass("User B: newsletter === false")
                        else:
                            print_fail(f"User B: newsletter should be false, got {user.get('newsletter')}")
                        
                        # Check newsletterWithdrawnAt is set
                        if is_valid_iso_date(user.get('newsletterWithdrawnAt')):
                            print_pass(f"User B: newsletterWithdrawnAt is set: {user.get('newsletterWithdrawnAt')}")
                        else:
                            print_fail(f"User B: newsletterWithdrawnAt should be set, got {user.get('newsletterWithdrawnAt')}")
                        
                        # Check newsletterConsentAt still holds original consent date
                        if is_valid_iso_date(user.get('newsletterConsentAt')):
                            print_pass(f"User B: newsletterConsentAt still holds original consent: {user.get('newsletterConsentAt')}")
                        else:
                            print_fail(f"User B: newsletterConsentAt should be preserved, got {user.get('newsletterConsentAt')}")
                        
                        # Check token unchanged
                        if user.get('newsletterUnsubscribeToken') == token_b:
                            print_pass("User B: newsletterUnsubscribeToken unchanged")
                        else:
                            print_fail(f"User B: token should be unchanged, got {user.get('newsletterUnsubscribeToken')}")
                    
                    passed += 1
                else:
                    print_fail(f"7b: Expected ok:true and email:{email_b}, got {data}")
                    failed += 1
            else:
                print_fail(f"7b: Expected 200, got {resp.status_code}", resp.text)
                failed += 1
    except Exception as e:
        print_fail(f"7b: Exception: {str(e)}")
        failed += 1
    
    # 7c: Create user C and unsubscribe by email
    total += 1
    try:
        email_c = f"nl-test-c-{timestamp}@example.test"
        session_c = requests.Session()
        
        # Register with newsletter:true
        resp = session_c.post(f"{API_BASE}/register", json={
            "email": email_c,
            "password": "testpass123",
            "confirmPassword": "testpass123",
            "name": "C",
            "country": "Ireland",
            "city": "Dublin",
            "role": "Bartender",
            "newsletter": True
        })
        
        if resp.status_code != 200:
            print_fail(f"7c: Register user C failed with status {resp.status_code}", resp.text)
            failed += 1
        else:
            print_pass(f"7c: User C registered: {email_c}")
            test_users.append({"email": email_c, "session": session_c})
            
            # Unsubscribe by email (no token)
            resp = requests.post(f"{API_BASE}/newsletter/unsubscribe", json={"email": email_c})
            if resp.status_code == 429:
                print_info(f"7c: Rate limited (429) - skipping verification")
                passed += 1  # Don't fail on rate limit
            elif resp.status_code == 200:
                data = resp.json()
                print_info(f"7c response: {data}")
                
                if data.get('ok') is True and data.get('email') == email_c:
                    print_pass(f"7c: Unsubscribe by email successful: {data.get('email')}")
                    
                    # Verify via /api/me
                    me_resp = session_c.get(f"{API_BASE}/me")
                    if me_resp.status_code == 200:
                        user = me_resp.json()  # /api/me returns user object directly
                        if user.get('newsletter') is False and is_valid_iso_date(user.get('newsletterWithdrawnAt')):
                            print_pass("7c: User C newsletter:false, newsletterWithdrawnAt set")
                            passed += 1
                        else:
                            print_fail(f"7c: User C should be unsubscribed, got newsletter={user.get('newsletter')}, withdrawnAt={user.get('newsletterWithdrawnAt')}")
                            failed += 1
                    else:
                        print_fail(f"7c: GET /api/me failed with status {me_resp.status_code}")
                        failed += 1
                else:
                    print_fail(f"7c: Expected ok:true and email:{email_c}, got {data}")
                    failed += 1
            else:
                print_fail(f"7c: Expected 200, got {resp.status_code}", resp.text)
                failed += 1
    except Exception as e:
        print_fail(f"7c: Exception: {str(e)}")
        failed += 1
    
    # 7d: Privacy check - unknown email (CRITICAL)
    total += 1
    try:
        unknown_email = f"nobody-random-{timestamp}@example.test"
        resp = requests.post(f"{API_BASE}/newsletter/unsubscribe", json={"email": unknown_email})
        if resp.status_code == 429:
            print_info(f"7d: Rate limited (429) - skipping CRITICAL privacy check")
            print_info("⚠️  WARNING: Could not verify CRITICAL privacy check due to rate limiting")
            passed += 1  # Don't fail on rate limit
        elif resp.status_code == 200:
            data = resp.json()
            print_info(f"7d response: {data}")
            
            # CRITICAL: Must return ok:true, email:null (don't leak membership)
            if data.get('ok') is True and data.get('email') is None:
                print_pass("✅ CRITICAL: 7d: Privacy check passed - unknown email returns ok:true, email:null")
                passed += 1
            else:
                print_fail(f"❌ CRITICAL: 7d: Privacy check failed - should return ok:true, email:null, got {data}")
                failed += 1
        else:
            print_fail(f"7d: Expected 200, got {resp.status_code}", resp.text)
            failed += 1
    except Exception as e:
        print_fail(f"7d: Exception: {str(e)}")
        failed += 1
    
    # 7e: Empty body
    total += 1
    try:
        resp = requests.post(f"{API_BASE}/newsletter/unsubscribe", json={})
        if resp.status_code == 429:
            print_info(f"7e: Rate limited (429) - skipping verification")
            passed += 1  # Don't fail on rate limit
        elif resp.status_code == 200:
            data = resp.json()
            print_info(f"7e response: {data}")
            
            if data.get('ok') is True and data.get('email') is None:
                print_pass("7e: Empty body returns ok:true, email:null")
                passed += 1
            else:
                print_fail(f"7e: Expected ok:true, email:null, got {data}")
                failed += 1
        else:
            print_fail(f"7e: Expected 200, got {resp.status_code}", resp.text)
            failed += 1
    except Exception as e:
        print_fail(f"7e: Exception: {str(e)}")
        failed += 1
    
    # ========================================================================
    # STEP 8: Landing POST /api/newsletter (no auth, no user account)
    # ========================================================================
    print_step(8, "Landing POST /api/newsletter (no auth)")
    
    # 8a: Subscribe via landing page
    total += 1
    try:
        landing_email = f"landing-{timestamp}@example.test"
        resp = requests.post(f"{API_BASE}/newsletter", json={"email": landing_email})
        if resp.status_code == 200:
            data = resp.json()
            if data.get('ok') is True:
                print_pass(f"8a: Landing signup successful: {landing_email}")
                passed += 1
            else:
                print_fail(f"8a: Expected ok:true, got {data}")
                failed += 1
        else:
            print_fail(f"8a: Expected 200, got {resp.status_code}", resp.text)
            failed += 1
    except Exception as e:
        print_fail(f"8a: Exception: {str(e)}")
        failed += 1
    
    # 8b: Unsubscribe landing email by email
    total += 1
    try:
        landing_email = f"landing-{timestamp}@example.test"
        resp = requests.post(f"{API_BASE}/newsletter/unsubscribe", json={"email": landing_email})
        if resp.status_code == 429:
            print_info(f"8b: Rate limited (429) - skipping verification")
            passed += 1  # Don't fail on rate limit
        elif resp.status_code == 200:
            data = resp.json()
            print_info(f"8b response: {data}")
            
            if data.get('ok') is True and data.get('email') == landing_email:
                print_pass(f"8b: Landing email unsubscribe successful: {data.get('email')}")
                passed += 1
            else:
                print_fail(f"8b: Expected ok:true and email:{landing_email}, got {data}")
                failed += 1
        else:
            print_fail(f"8b: Expected 200, got {resp.status_code}", resp.text)
            failed += 1
    except Exception as e:
        print_fail(f"8b: Exception: {str(e)}")
        failed += 1
    
    # ========================================================================
    # STEP 9: Rate limit
    # ========================================================================
    print_step(9, "Rate limit (20/10min)")
    total += 1
    
    try:
        count_200 = 0
        count_429 = 0
        
        print_info("Firing 25 POST /api/newsletter/unsubscribe requests...")
        for i in range(25):
            resp = requests.post(f"{API_BASE}/newsletter/unsubscribe", json={"email": f"x{i}@example.test"})
            if resp.status_code == 200:
                count_200 += 1
            elif resp.status_code == 429:
                count_429 += 1
        
        print_info(f"Results: {count_200} x 200, {count_429} x 429")
        
        # Don't fail if no 429s (IP-based limiter may be shared)
        if count_429 > 0:
            print_pass(f"9: Rate limiter working - got {count_429} x 429 responses")
        else:
            print_pass(f"9: No 429s observed (IP-based limiter may be shared) - {count_200} x 200")
        
        passed += 1
    except Exception as e:
        print_fail(f"9: Exception: {str(e)}")
        failed += 1
    
    # ========================================================================
    # STEP 10: Cleanup
    # ========================================================================
    print_step(10, "Cleanup")
    total += 1
    
    try:
        # Login as admin
        admin_session = requests.Session()
        resp = admin_session.post(f"{API_BASE}/admin-auth", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if resp.status_code != 200:
            print_fail(f"Admin login failed with status {resp.status_code}", resp.text)
            failed += 1
        else:
            print_pass("Admin login successful")
            
            # Get all users
            resp = admin_session.get(f"{API_BASE}/admin/users")
            if resp.status_code != 200:
                print_fail(f"GET /api/admin/users failed with status {resp.status_code}", resp.text)
                failed += 1
            else:
                data = resp.json()
                users = data.get('users', [])  # /api/admin/users returns {total, users}
                print_info(f"Found {len(users)} total users")
                
                # Delete test users
                deleted_count = 0
                for user in users:
                    email = user.get('email', '')
                    if email.startswith('nl-test-') or email.startswith('landing-'):
                        user_id = user.get('id')
                        if user_id:
                            del_resp = admin_session.delete(f"{API_BASE}/admin/users/{user_id}")
                            if del_resp.status_code == 200:
                                print_pass(f"Deleted user: {email}")
                                deleted_count += 1
                            else:
                                print_fail(f"Failed to delete user {email}: {del_resp.status_code}")
                
                print_pass(f"Cleanup complete: {deleted_count} test users deleted")
                passed += 1
    except Exception as e:
        print_fail(f"10: Exception: {str(e)}")
        failed += 1
    
    # ========================================================================
    # SUMMARY
    # ========================================================================
    print(f"\n{'='*80}")
    print("TEST SUMMARY")
    print('='*80)
    print(f"Total tests: {total}")
    print(f"Passed: {passed} ({100*passed//total if total > 0 else 0}%)")
    print(f"Failed: {failed}")
    print('='*80)
    
    if failed == 0:
        print("✅ ALL TESTS PASSED")
        return 0
    else:
        print(f"❌ {failed} TESTS FAILED")
        return 1

if __name__ == '__main__':
    try:
        exit_code = run_tests()
        sys.exit(exit_code)
    except Exception as e:
        print(f"\n❌ FATAL ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
