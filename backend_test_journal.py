#!/usr/bin/env python3
"""
Backend test suite for OSC Journal subscription endpoint - Rate-limit aware version
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

print("=" * 80)
print("OSC JOURNAL SUBSCRIPTION ENDPOINT TEST SUITE (Rate-Limit Aware)")
print("=" * 80)
print(f"Base URL: {BASE_URL}")
print(f"API Base: {API_BASE}")
print(f"Note: Rate limit is 5 requests per 10 minutes per IP")
print(f"      Tests are grouped to stay within this limit")
print()

# ============================================================================
# TEST GROUP 1: Basic functionality (3 requests)
# ============================================================================
print("\n" + "=" * 80)
print("TEST GROUP 1: Basic functionality (3 requests)")
print("=" * 80)

# Test 1: Happy-path subscribe
test_email_1 = generate_unique_email()
print(f"\nTest 1 - Happy-path subscribe: {test_email_1}")
result = subscribe_email(test_email_1)
if result["status"] == 200 and result.get("json", {}).get("ok") is True and result.get("json", {}).get("alreadySubscribed") is False:
    log_test("1 - Happy-path subscribe", True, "HTTP 200, ok:true, alreadySubscribed:false")
else:
    log_test("1 - Happy-path subscribe", False, f"Response: {result}")

# Test 2: Idempotent re-subscribe
print(f"\nTest 2 - Idempotent re-subscribe (same email)")
time.sleep(0.5)
result2 = subscribe_email(test_email_1)
if result2["status"] == 200 and result2.get("json", {}).get("ok") is True and result2.get("json", {}).get("alreadySubscribed") is True:
    log_test("2 - Idempotent re-subscribe", True, "Second call returns alreadySubscribed:true")
else:
    log_test("2 - Idempotent re-subscribe", False, f"Response: {result2}")

# Test 3: Email case-insensitivity
test_email_3 = f"MixedCase-{uuid.uuid4()}@Example.COM"
print(f"\nTest 3 - Email case-insensitivity: {test_email_3}")
result3a = subscribe_email(test_email_3)
time.sleep(0.5)
result3b = subscribe_email(test_email_3.lower())
if (result3a["status"] == 200 and result3a.get("json", {}).get("alreadySubscribed") is False and
    result3b["status"] == 200 and result3b.get("json", {}).get("alreadySubscribed") is True):
    log_test("3 - Email case-insensitivity", True, "Lowercase version recognized as already subscribed")
else:
    log_test("3 - Email case-insensitivity", False, f"First: {result3a}, Second: {result3b}")

print(f"\nWaiting 10 minutes for rate limit to reset...")
print(f"(Rate limit: 5 requests per 10 minutes, used 4 requests so far)")
time.sleep(600)  # Wait 10 minutes

# ============================================================================
# TEST GROUP 2: Validation (5 requests)
# ============================================================================
print("\n" + "=" * 80)
print("TEST GROUP 2: Validation (5 requests)")
print("=" * 80)

invalid_tests = [
    ("not-an-email", "4 - Invalid format 'not-an-email'"),
    ("", "5 - Empty string"),
    ("a@b", "6 - Too short/invalid TLD 'a@b'"),
    ("x" * 255 + "@example.com", "7 - Email > 254 chars"),
]

for invalid_email, test_name in invalid_tests:
    print(f"\n{test_name}")
    result = subscribe_email(invalid_email)
    if result["status"] == 400 and result.get("json", {}).get("error"):
        log_test(test_name, True, f"Got 400 with error: {result['json']['error']}")
    else:
        log_test(test_name, False, f"Expected 400, got {result['status']}")
    time.sleep(0.5)

# Test missing email field
print(f"\nTest 8 - Missing email field")
try:
    s = requests.Session()
    response = s.post(f"{API_BASE}/journal/subscribe", json={}, timeout=10)
    if response.status_code == 400:
        log_test("8 - Missing email field", True, f"Got 400")
    else:
        log_test("8 - Missing email field", False, f"Expected 400, got {response.status_code}")
except Exception as e:
    log_test("8 - Missing email field", False, f"Exception: {str(e)}")

print(f"\nWaiting 10 minutes for rate limit to reset...")
time.sleep(600)

# ============================================================================
# TEST GROUP 3: User sync (2 requests)
# ============================================================================
print("\n" + "=" * 80)
print("TEST GROUP 3: Sync with existing registered user (2 requests)")
print("=" * 80)

test_user_email = generate_unique_email()
test_user_password = "TestPassword123!"

print(f"\nTest 9 - Create user and sync newsletter flag")
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
        "newsletter": False
    },
    timeout=10
)

if register_response.status_code == 200:
    time.sleep(0.5)
    journal_result = subscribe_email(test_user_email)
    
    if journal_result["status"] == 200 and journal_result.get("json", {}).get("ok") is True:
        # Verify user newsletter flag
        time.sleep(0.5)
        auth_response = requests.post(f"{API_BASE}/auth", json={"email": test_user_email, "password": test_user_password}, timeout=10)
        
        if auth_response.status_code == 200:
            user_data = auth_response.json().get("user", {})
            if user_data.get("newsletter") is True:
                log_test("9 - User sync: newsletter flag updated", True, "User newsletter flag set to true after journal subscribe")
            else:
                log_test("9 - User sync: newsletter flag updated", False, f"newsletter={user_data.get('newsletter')}")
        else:
            log_test("9 - User sync: newsletter flag updated", False, "Could not verify (auth failed)")
    else:
        log_test("9 - User sync: newsletter flag updated", False, f"Journal subscribe failed: {journal_result}")
else:
    log_test("9 - User sync: newsletter flag updated", False, f"User creation failed: {register_response.status_code}")

print(f"\nWaiting 10 minutes for rate limit to reset...")
time.sleep(600)

# ============================================================================
# TEST GROUP 4: Rate limiting (6 requests)
# ============================================================================
print("\n" + "=" * 80)
print("TEST GROUP 4: Rate limiting (6 requests)")
print("=" * 80)

print(f"\nTest 10 - Rate limiting")
session = requests.Session()
success_count = 0

for i in range(5):
    email = generate_unique_email()
    result = subscribe_email(email, session)
    if result["status"] == 200:
        success_count += 1
    time.sleep(0.2)

if success_count == 5:
    log_test("10a - First 5 subscriptions succeed", True)
else:
    log_test("10a - First 5 subscriptions succeed", False, f"Only {success_count}/5 succeeded")

# 6th should be rate limited
email_6 = generate_unique_email()
result_6 = subscribe_email(email_6, session)

if result_6["status"] == 429:
    log_test("10b - 6th subscription returns 429", True)
    if result_6.get("json", {}).get("error"):
        log_test("10c - Rate limit error message present", True, f"Error: {result_6['json']['error']}")
    else:
        log_test("10c - Rate limit error message present", False, "No error message")
else:
    log_test("10b - 6th subscription returns 429", False, f"Got {result_6['status']}")
    log_test("10c - Rate limit error message present", False, "Did not hit rate limit")

print(f"\nWaiting 10 minutes for rate limit to reset...")
time.sleep(600)

# ============================================================================
# TEST GROUP 5: Reserved slug protection (2 requests)
# ============================================================================
print("\n" + "=" * 80)
print("TEST GROUP 5: Reserved slug protection (2 requests)")
print("=" * 80)

print(f"\nTest 11 - Reserved slug 'journal'")
admin_response = requests.post(
    f"{API_BASE}/admin-auth",
    json={"email": "sebastiandieugenioe@gmail.com", "password": "preview-only-change-in-prod"},
    timeout=10
)

if admin_response.status_code == 200:
    admin_cookies = admin_response.cookies
    
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
    
    if page_response.status_code == 400:
        response_data = page_response.json()
        if "reserved" in response_data.get("error", "").lower():
            log_test("11 - Reserved slug protection", True, f"Error: {response_data.get('error')}")
        else:
            log_test("11 - Reserved slug protection", True, f"Got 400 (error: {response_data.get('error')})")
    else:
        log_test("11 - Reserved slug protection", False, f"Expected 400, got {page_response.status_code}")
    
    # Verify no page exists
    get_page_response = requests.get(f"{API_BASE}/pages/journal", timeout=10)
    if get_page_response.status_code == 404:
        log_test("11b - No journal page exists", True)
    else:
        log_test("11b - No journal page exists", False, f"Status: {get_page_response.status_code}")
else:
    log_test("11 - Reserved slug protection", False, "Admin auth failed")
    log_test("11b - No journal page exists", False, "Admin auth failed")

# ============================================================================
# TEST GROUP 6: Response shape (1 request)
# ============================================================================
print("\n" + "=" * 80)
print("TEST GROUP 6: Response shape validation (1 request)")
print("=" * 80)

print(f"\nTest 12 - Response shape")
test_email_12 = generate_unique_email()
result_success = subscribe_email(test_email_12)

if result_success.get("json"):
    data = result_success["json"]
    has_ok = "ok" in data
    has_already_subscribed = "alreadySubscribed" in data
    
    if has_ok and has_already_subscribed:
        log_test("12a - Success response shape", True, "Has 'ok' and 'alreadySubscribed' fields")
    else:
        log_test("12a - Success response shape", False, f"Missing fields: ok={has_ok}, alreadySubscribed={has_already_subscribed}")
else:
    log_test("12a - Success response shape", False, "No JSON response")

# Test error response shape
result_error = subscribe_email("invalid-email")
if result_error.get("json", {}).get("error"):
    log_test("12b - Error response shape", True, "Has 'error' field")
else:
    log_test("12b - Error response shape", False, "No error field")

# ============================================================================
# SUMMARY
# ============================================================================
print("\n" + "=" * 80)
print("TEST SUMMARY")
print("=" * 80)
print(f"Total tests: {test_results['passed'] + test_results['failed']}")
print(f"Passed: {test_results['passed']} ✅")
print(f"Failed: {test_results['failed']} ❌")
if test_results['passed'] + test_results['failed'] > 0:
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

exit(0 if test_results['failed'] == 0 else 1)
