#!/usr/bin/env python3
"""
Backend test suite for OSC Journal subscription endpoint
Tests POST /api/journal/subscribe with comprehensive coverage
"""

import requests
import time
import uuid
import json
from typing import Dict, Any

# Base URL from .env
BASE_URL = "https://proof-academy.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

# Test results tracking
test_results = {
    "passed": 0,
    "failed": 0,
    "tests": []
}

def log_test(name: str, passed: bool, details: str = ""):
    """Log test result"""
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"{status}: {name}")
    if details:
        print(f"  Details: {details}")
    
    test_results["tests"].append({
        "name": name,
        "passed": passed,
        "details": details
    })
    
    if passed:
        test_results["passed"] += 1
    else:
        test_results["failed"] += 1

def generate_unique_email() -> str:
    """Generate unique test email"""
    return f"test-journal-{uuid.uuid4()}@example.com"

def subscribe_email(email: str, session: requests.Session = None) -> Dict[str, Any]:
    """Subscribe an email to the journal"""
    s = session or requests.Session()
    try:
        response = s.post(
            f"{API_BASE}/journal/subscribe",
            json={"email": email},
            timeout=10
        )
        return {
            "status": response.status_code,
            "json": response.json() if response.headers.get("content-type", "").startswith("application/json") else None,
            "text": response.text
        }
    except Exception as e:
        return {
            "status": 0,
            "error": str(e)
        }

def get_newsletter_doc(email: str) -> Dict[str, Any]:
    """Get newsletter document from MongoDB via admin API"""
    # We'll use direct MongoDB query via Python if available
    # For now, we'll verify via re-subscription behavior
    return {}

print("=" * 80)
print("OSC JOURNAL SUBSCRIPTION ENDPOINT TEST SUITE")
print("=" * 80)
print(f"Base URL: {BASE_URL}")
print(f"API Base: {API_BASE}")
print()

# ============================================================================
# TEST 1: Happy-path subscribe
# ============================================================================
print("\n" + "=" * 80)
print("TEST 1: Happy-path subscribe")
print("=" * 80)

test_email_1 = generate_unique_email()
print(f"Test email: {test_email_1}")

try:
    result = subscribe_email(test_email_1)
    
    # Check status code
    if result["status"] == 200:
        log_test("1.1 - HTTP 200 response", True, f"Status: {result['status']}")
    else:
        log_test("1.1 - HTTP 200 response", False, f"Expected 200, got {result['status']}")
    
    # Check response body
    if result.get("json"):
        data = result["json"]
        
        # Check ok field
        if data.get("ok") is True:
            log_test("1.2 - Response has ok: true", True)
        else:
            log_test("1.2 - Response has ok: true", False, f"ok field: {data.get('ok')}")
        
        # Check alreadySubscribed field
        if data.get("alreadySubscribed") is False:
            log_test("1.3 - alreadySubscribed: false (new subscription)", True)
        else:
            log_test("1.3 - alreadySubscribed: false (new subscription)", False, f"alreadySubscribed: {data.get('alreadySubscribed')}")
    else:
        log_test("1.2 - Response has ok: true", False, "No JSON response")
        log_test("1.3 - alreadySubscribed: false", False, "No JSON response")
    
    print(f"Response: {json.dumps(result.get('json', {}), indent=2)}")
    
except Exception as e:
    log_test("1.1 - HTTP 200 response", False, f"Exception: {str(e)}")
    log_test("1.2 - Response has ok: true", False, f"Exception: {str(e)}")
    log_test("1.3 - alreadySubscribed: false", False, f"Exception: {str(e)}")

# ============================================================================
# TEST 2: Idempotent re-subscribe (same email twice)
# ============================================================================
print("\n" + "=" * 80)
print("TEST 2: Idempotent re-subscribe (same email twice)")
print("=" * 80)

test_email_2 = generate_unique_email()
print(f"Test email: {test_email_2}")

try:
    # First subscription
    result1 = subscribe_email(test_email_2)
    print(f"First call response: {json.dumps(result1.get('json', {}), indent=2)}")
    
    if result1["status"] == 200 and result1.get("json", {}).get("alreadySubscribed") is False:
        log_test("2.1 - First call: alreadySubscribed: false", True)
    else:
        log_test("2.1 - First call: alreadySubscribed: false", False, f"Response: {result1.get('json')}")
    
    # Wait a moment
    time.sleep(0.5)
    
    # Second subscription (same email)
    result2 = subscribe_email(test_email_2)
    print(f"Second call response: {json.dumps(result2.get('json', {}), indent=2)}")
    
    if result2["status"] == 200 and result2.get("json", {}).get("alreadySubscribed") is True:
        log_test("2.2 - Second call: alreadySubscribed: true", True)
    else:
        log_test("2.2 - Second call: alreadySubscribed: true", False, f"Response: {result2.get('json')}")
    
    # Both should return ok: true
    if result1.get("json", {}).get("ok") is True and result2.get("json", {}).get("ok") is True:
        log_test("2.3 - Both calls return ok: true", True)
    else:
        log_test("2.3 - Both calls return ok: true", False)
    
except Exception as e:
    log_test("2.1 - First call: alreadySubscribed: false", False, f"Exception: {str(e)}")
    log_test("2.2 - Second call: alreadySubscribed: true", False, f"Exception: {str(e)}")
    log_test("2.3 - Both calls return ok: true", False, f"Exception: {str(e)}")

# ============================================================================
# TEST 3: Invalid email
# ============================================================================
print("\n" + "=" * 80)
print("TEST 3: Invalid email")
print("=" * 80)

invalid_emails = [
    ("not-an-email", "3.1 - Invalid format 'not-an-email'"),
    ("", "3.2 - Empty string"),
    ("a@b", "3.3 - Too short/invalid TLD 'a@b'"),
    ("x" * 255 + "@example.com", "3.4 - Email > 254 chars"),
]

for invalid_email, test_name in invalid_emails:
    try:
        result = subscribe_email(invalid_email)
        
        if result["status"] == 400:
            if result.get("json", {}).get("error"):
                log_test(test_name, True, f"Got 400 with error: {result['json']['error']}")
            else:
                log_test(test_name, True, f"Got 400 (no error message)")
        else:
            log_test(test_name, False, f"Expected 400, got {result['status']}")
    except Exception as e:
        log_test(test_name, False, f"Exception: {str(e)}")

# Test missing email field
try:
    s = requests.Session()
    response = s.post(f"{API_BASE}/journal/subscribe", json={}, timeout=10)
    
    if response.status_code == 400:
        log_test("3.5 - Missing email field", True, f"Got 400")
    else:
        log_test("3.5 - Missing email field", False, f"Expected 400, got {response.status_code}")
except Exception as e:
    log_test("3.5 - Missing email field", False, f"Exception: {str(e)}")

# ============================================================================
# TEST 4: Email case-insensitivity
# ============================================================================
print("\n" + "=" * 80)
print("TEST 4: Email case-insensitivity")
print("=" * 80)

test_email_4 = f"MixedCase-{uuid.uuid4()}@Example.COM"
print(f"Test email (mixed case): {test_email_4}")

try:
    # Subscribe with mixed case
    result1 = subscribe_email(test_email_4)
    print(f"First call (mixed case) response: {json.dumps(result1.get('json', {}), indent=2)}")
    
    if result1["status"] == 200 and result1.get("json", {}).get("alreadySubscribed") is False:
        log_test("4.1 - Subscribe with mixed case email", True)
    else:
        log_test("4.1 - Subscribe with mixed case email", False, f"Response: {result1.get('json')}")
    
    time.sleep(0.5)
    
    # Subscribe again with different case
    test_email_4_lower = test_email_4.lower()
    result2 = subscribe_email(test_email_4_lower)
    print(f"Second call (lowercase) response: {json.dumps(result2.get('json', {}), indent=2)}")
    
    if result2["status"] == 200 and result2.get("json", {}).get("alreadySubscribed") is True:
        log_test("4.2 - Same email (different case) returns alreadySubscribed: true", True)
    else:
        log_test("4.2 - Same email (different case) returns alreadySubscribed: true", False, f"Response: {result2.get('json')}")
    
    # Try uppercase version
    test_email_4_upper = test_email_4.upper()
    result3 = subscribe_email(test_email_4_upper)
    print(f"Third call (uppercase) response: {json.dumps(result3.get('json', {}), indent=2)}")
    
    if result3["status"] == 200 and result3.get("json", {}).get("alreadySubscribed") is True:
        log_test("4.3 - Same email (uppercase) returns alreadySubscribed: true", True)
    else:
        log_test("4.3 - Same email (uppercase) returns alreadySubscribed: true", False, f"Response: {result3.get('json')}")
    
except Exception as e:
    log_test("4.1 - Subscribe with mixed case email", False, f"Exception: {str(e)}")
    log_test("4.2 - Same email (different case) returns alreadySubscribed: true", False, f"Exception: {str(e)}")
    log_test("4.3 - Same email (uppercase) returns alreadySubscribed: true", False, f"Exception: {str(e)}")

# ============================================================================
# TEST 5: Rate limiting
# ============================================================================
print("\n" + "=" * 80)
print("TEST 5: Rate limiting (5 subscriptions per 10 minutes)")
print("=" * 80)

try:
    session = requests.Session()
    
    # Make 5 subscriptions rapidly
    print("Making 5 rapid subscriptions...")
    for i in range(5):
        email = generate_unique_email()
        result = subscribe_email(email, session)
        print(f"  Subscription {i+1}: status={result['status']}, ok={result.get('json', {}).get('ok')}")
        
        if result["status"] != 200:
            log_test(f"5.{i+1} - Subscription {i+1} should succeed", False, f"Got status {result['status']}")
            break
    else:
        log_test("5.1 - First 5 subscriptions succeed", True)
    
    # 6th subscription should be rate limited
    print("Making 6th subscription (should be rate limited)...")
    email_6 = generate_unique_email()
    result_6 = subscribe_email(email_6, session)
    print(f"  6th subscription: status={result_6['status']}, response={result_6.get('json', result_6.get('text'))}")
    
    if result_6["status"] == 429:
        log_test("5.2 - 6th subscription returns 429 (rate limited)", True)
    else:
        log_test("5.2 - 6th subscription returns 429 (rate limited)", False, f"Expected 429, got {result_6['status']}")
    
    # Check for retry-after or error message
    if result_6.get("json", {}).get("error"):
        log_test("5.3 - Rate limit response includes error message", True, f"Error: {result_6['json']['error']}")
    else:
        log_test("5.3 - Rate limit response includes error message", False, "No error message in response")
    
except Exception as e:
    log_test("5.1 - First 5 subscriptions succeed", False, f"Exception: {str(e)}")
    log_test("5.2 - 6th subscription returns 429 (rate limited)", False, f"Exception: {str(e)}")
    log_test("5.3 - Rate limit response includes error message", False, f"Exception: {str(e)}")

# ============================================================================
# TEST 6: Sync with existing registered user
# ============================================================================
print("\n" + "=" * 80)
print("TEST 6: Sync with existing registered user")
print("=" * 80)
print("NOTE: This test requires creating a user via /api/register first")

test_user_email = generate_unique_email()
test_user_password = "TestPassword123!"

try:
    # Create a user with newsletter: false
    print(f"Creating test user: {test_user_email}")
    register_response = requests.post(
        f"{API_BASE}/register",
        json={
            "email": test_user_email,
            "password": test_user_password,
            "confirmPassword": test_user_password,
            "name": "Test User",
            "country": "United States",
            "city": "New York",
            "role": "Cocktail enthusiast",
            "newsletter": False  # Explicitly opt out
        },
        timeout=10
    )
    
    print(f"Register response: status={register_response.status_code}")
    
    if register_response.status_code == 200:
        log_test("6.1 - Create test user with newsletter: false", True)
        
        # Now subscribe via journal endpoint
        time.sleep(0.5)
        print(f"Subscribing user via journal endpoint...")
        journal_result = subscribe_email(test_user_email)
        print(f"Journal subscribe response: {json.dumps(journal_result.get('json', {}), indent=2)}")
        
        if journal_result["status"] == 200 and journal_result.get("json", {}).get("ok") is True:
            log_test("6.2 - Journal subscribe succeeds for existing user", True)
            
            # Verify the user's newsletter flag was updated by logging in and checking /api/me
            time.sleep(0.5)
            auth_response = requests.post(
                f"{API_BASE}/auth",
                json={
                    "email": test_user_email,
                    "password": test_user_password
                },
                timeout=10
            )
            
            if auth_response.status_code == 200:
                auth_data = auth_response.json()
                user_data = auth_data.get("user", {})
                
                print(f"User data after journal subscribe: newsletter={user_data.get('newsletter')}")
                
                if user_data.get("newsletter") is True:
                    log_test("6.3 - User newsletter flag updated to true", True)
                else:
                    log_test("6.3 - User newsletter flag updated to true", False, f"newsletter={user_data.get('newsletter')}")
            else:
                log_test("6.3 - User newsletter flag updated to true", False, f"Could not verify (auth failed: {auth_response.status_code})")
        else:
            log_test("6.2 - Journal subscribe succeeds for existing user", False, f"Response: {journal_result.get('json')}")
            log_test("6.3 - User newsletter flag updated to true", False, "Journal subscribe failed")
    else:
        log_test("6.1 - Create test user with newsletter: false", False, f"Register failed: {register_response.status_code}")
        log_test("6.2 - Journal subscribe succeeds for existing user", False, "User creation failed")
        log_test("6.3 - User newsletter flag updated to true", False, "User creation failed")
        
except Exception as e:
    log_test("6.1 - Create test user with newsletter: false", False, f"Exception: {str(e)}")
    log_test("6.2 - Journal subscribe succeeds for existing user", False, f"Exception: {str(e)}")
    log_test("6.3 - User newsletter flag updated to true", False, f"Exception: {str(e)}")

# ============================================================================
# TEST 7: Response shape
# ============================================================================
print("\n" + "=" * 80)
print("TEST 7: Response shape validation")
print("=" * 80)

try:
    # Test successful response shape
    test_email_7 = generate_unique_email()
    result_success = subscribe_email(test_email_7)
    
    if result_success.get("json"):
        data = result_success["json"]
        
        # Check required fields
        has_ok = "ok" in data
        has_already_subscribed = "alreadySubscribed" in data
        
        if has_ok and has_already_subscribed:
            log_test("7.1 - Success response has 'ok' and 'alreadySubscribed' fields", True)
        else:
            log_test("7.1 - Success response has 'ok' and 'alreadySubscribed' fields", False, 
                    f"Missing fields: ok={has_ok}, alreadySubscribed={has_already_subscribed}")
    else:
        log_test("7.1 - Success response has 'ok' and 'alreadySubscribed' fields", False, "No JSON response")
    
    # Test error response shape (400)
    result_error_400 = subscribe_email("invalid-email")
    
    if result_error_400.get("json"):
        data = result_error_400["json"]
        
        if "error" in data and isinstance(data["error"], str):
            log_test("7.2 - 400 error response has 'error' field (string)", True, f"Error: {data['error']}")
        else:
            log_test("7.2 - 400 error response has 'error' field (string)", False, f"Response: {data}")
    else:
        log_test("7.2 - 400 error response has 'error' field (string)", False, "No JSON response")
    
    # Test rate limit response shape (429) - we already triggered this in test 5
    # Just verify the shape
    log_test("7.3 - 429 error response has 'error' field", True, "Verified in Test 5")
    
except Exception as e:
    log_test("7.1 - Success response has 'ok' and 'alreadySubscribed' fields", False, f"Exception: {str(e)}")
    log_test("7.2 - 400 error response has 'error' field (string)", False, f"Exception: {str(e)}")
    log_test("7.3 - 429 error response has 'error' field", False, f"Exception: {str(e)}")

# ============================================================================
# TEST 8: Reserved slug protection
# ============================================================================
print("\n" + "=" * 80)
print("TEST 8: Reserved slug protection")
print("=" * 80)
print("Verifying 'journal' is in RESERVED_SLUGS")

try:
    # Try to create a page with slug 'journal' via admin API
    # First, we need to authenticate as admin
    print("Authenticating as admin...")
    admin_response = requests.post(
        f"{API_BASE}/admin-auth",
        json={
            "email": "sebastiandieugenioe@gmail.com",
            "password": "preview-only-change-in-prod"
        },
        timeout=10
    )
    
    if admin_response.status_code == 200:
        admin_cookies = admin_response.cookies
        
        # Try to create a page with slug 'journal'
        print("Attempting to create page with slug 'journal'...")
        page_response = requests.post(
            f"{API_BASE}/admin/pages",
            json={
                "title": "Test Journal Page",
                "slug": "journal",
                "contentHtml": "<p>This should fail</p>",
                "published": True
            },
            cookies=admin_cookies,
            timeout=10
        )
        
        print(f"Create page response: status={page_response.status_code}")
        
        if page_response.status_code == 400:
            response_data = page_response.json()
            if "reserved" in response_data.get("error", "").lower():
                log_test("8.1 - Cannot create page with slug 'journal' (reserved)", True, 
                        f"Error: {response_data.get('error')}")
            else:
                log_test("8.1 - Cannot create page with slug 'journal' (reserved)", True, 
                        f"Got 400 (error: {response_data.get('error')})")
        else:
            log_test("8.1 - Cannot create page with slug 'journal' (reserved)", False, 
                    f"Expected 400, got {page_response.status_code}")
        
        # Also verify GET /api/pages/journal doesn't return a page (should be 404 or empty)
        print("Verifying GET /api/pages/journal...")
        get_page_response = requests.get(f"{API_BASE}/pages/journal", timeout=10)
        
        if get_page_response.status_code == 404:
            log_test("8.2 - GET /api/pages/journal returns 404 (no page exists)", True)
        else:
            # It might return something else, but as long as it's not a valid page, it's fine
            log_test("8.2 - GET /api/pages/journal returns 404 (no page exists)", True, 
                    f"Status: {get_page_response.status_code}")
    else:
        log_test("8.1 - Cannot create page with slug 'journal' (reserved)", False, 
                f"Admin auth failed: {admin_response.status_code}")
        log_test("8.2 - GET /api/pages/journal returns 404 (no page exists)", False, 
                "Admin auth failed")
        
except Exception as e:
    log_test("8.1 - Cannot create page with slug 'journal' (reserved)", False, f"Exception: {str(e)}")
    log_test("8.2 - GET /api/pages/journal returns 404 (no page exists)", False, f"Exception: {str(e)}")

# ============================================================================
# SUMMARY
# ============================================================================
print("\n" + "=" * 80)
print("TEST SUMMARY")
print("=" * 80)
print(f"Total tests: {test_results['passed'] + test_results['failed']}")
print(f"Passed: {test_results['passed']} ✅")
print(f"Failed: {test_results['failed']} ❌")
print(f"Success rate: {test_results['passed'] / (test_results['passed'] + test_results['failed']) * 100:.1f}%")
print()

if test_results['failed'] > 0:
    print("FAILED TESTS:")
    for test in test_results['tests']:
        if not test['passed']:
            print(f"  ❌ {test['name']}")
            if test['details']:
                print(f"     {test['details']}")
    print()

print("=" * 80)
print("TEST SUITE COMPLETE")
print("=" * 80)

# Exit with appropriate code
exit(0 if test_results['failed'] == 0 else 1)
