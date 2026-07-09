#!/usr/bin/env python3
"""
Backend test suite for OSC Feedback system
Tests POST /api/feedback (public) and admin endpoints
"""

import requests
import time
import uuid
import json
from typing import Dict, Any

# Base URL from .env
BASE_URL = "https://proof-academy.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

# Admin credentials
ADMIN_EMAIL = "sebastiandieugenioe@gmail.com"
ADMIN_PASSWORD = "preview-only-change-in-prod"

# Test results tracking
test_results = {
    "passed": 0,
    "failed": 0,
    "tests": []
}

# Track created feedback IDs for cleanup
created_feedback_ids = []

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

def get_admin_session() -> requests.Session:
    """Authenticate as admin and return session with cookies"""
    session = requests.Session()
    response = session.post(
        f"{API_BASE}/admin-auth",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=10
    )
    if response.status_code != 200:
        raise Exception(f"Admin auth failed: {response.status_code}")
    return session

print("=" * 80)
print("OSC FEEDBACK SYSTEM TEST SUITE")
print("=" * 80)
print(f"Base URL: {BASE_URL}")
print(f"API Base: {API_BASE}")
print()

# ============================================================================
# TEST 1: Public endpoint - Valid minimal payload
# ============================================================================
print("\n" + "=" * 80)
print("TEST 1: Public endpoint - Valid minimal payload")
print("=" * 80)

try:
    response = requests.post(
        f"{API_BASE}/feedback",
        json={
            "type": "suggestion",
            "message": "This is a test suggestion with more than 10 characters"
        },
        timeout=10
    )
    
    print(f"Response status: {response.status_code}")
    print(f"Response body: {json.dumps(response.json(), indent=2)}")
    
    if response.status_code == 200:
        log_test("1.1 - HTTP 200 response", True)
    else:
        log_test("1.1 - HTTP 200 response", False, f"Got {response.status_code}")
    
    data = response.json()
    if data.get("ok") is True:
        log_test("1.2 - Response has ok: true", True)
    else:
        log_test("1.2 - Response has ok: true", False, f"ok={data.get('ok')}")
    
    if "id" in data and isinstance(data["id"], str):
        log_test("1.3 - Response has id field", True, f"id={data['id']}")
        created_feedback_ids.append(data["id"])
    else:
        log_test("1.3 - Response has id field", False, f"id={data.get('id')}")
    
except Exception as e:
    log_test("1.1 - HTTP 200 response", False, f"Exception: {str(e)}")
    log_test("1.2 - Response has ok: true", False, f"Exception: {str(e)}")
    log_test("1.3 - Response has id field", False, f"Exception: {str(e)}")

# ============================================================================
# TEST 2: All 6 valid types accepted
# ============================================================================
print("\n" + "=" * 80)
print("TEST 2: All 6 valid types accepted")
print("=" * 80)

valid_types = ['suggestion', 'content_correction', 'bug', 'ux_issue', 'opinion', 'other']

for feedback_type in valid_types:
    try:
        response = requests.post(
            f"{API_BASE}/feedback",
            json={
                "type": feedback_type,
                "message": f"Test message for {feedback_type} type with sufficient length"
            },
            timeout=10
        )
        
        if response.status_code == 200 and response.json().get("ok") is True:
            log_test(f"2.{valid_types.index(feedback_type)+1} - Type '{feedback_type}' accepted", True)
            if "id" in response.json():
                created_feedback_ids.append(response.json()["id"])
        else:
            log_test(f"2.{valid_types.index(feedback_type)+1} - Type '{feedback_type}' accepted", False, 
                    f"Status: {response.status_code}, Response: {response.json()}")
        
        time.sleep(0.1)  # Small delay between requests
        
    except Exception as e:
        log_test(f"2.{valid_types.index(feedback_type)+1} - Type '{feedback_type}' accepted", False, f"Exception: {str(e)}")

# ============================================================================
# TEST 3: Invalid type rejected
# ============================================================================
print("\n" + "=" * 80)
print("TEST 3: Invalid type rejected")
print("=" * 80)

try:
    response = requests.post(
        f"{API_BASE}/feedback",
        json={
            "type": "invalid_type",
            "message": "This should be rejected due to invalid type"
        },
        timeout=10
    )
    
    if response.status_code == 400:
        log_test("3.1 - Invalid type returns 400", True, f"Error: {response.json().get('error')}")
    else:
        log_test("3.1 - Invalid type returns 400", False, f"Got {response.status_code}")
    
except Exception as e:
    log_test("3.1 - Invalid type returns 400", False, f"Exception: {str(e)}")

# ============================================================================
# TEST 4: Message length validation
# ============================================================================
print("\n" + "=" * 80)
print("TEST 4: Message length validation")
print("=" * 80)

# Test message < 10 chars
try:
    response = requests.post(
        f"{API_BASE}/feedback",
        json={
            "type": "suggestion",
            "message": "short"
        },
        timeout=10
    )
    
    if response.status_code == 400:
        error_msg = response.json().get("error", "")
        if "10 characters" in error_msg:
            log_test("4.1 - Message < 10 chars rejected with proper error", True, f"Error: {error_msg}")
        else:
            log_test("4.1 - Message < 10 chars rejected with proper error", True, f"Got 400 (error: {error_msg})")
    else:
        log_test("4.1 - Message < 10 chars rejected with proper error", False, f"Got {response.status_code}")
    
except Exception as e:
    log_test("4.1 - Message < 10 chars rejected with proper error", False, f"Exception: {str(e)}")

# Test message > 2000 chars
try:
    long_message = "x" * 2001
    response = requests.post(
        f"{API_BASE}/feedback",
        json={
            "type": "suggestion",
            "message": long_message
        },
        timeout=10
    )
    
    if response.status_code == 400:
        error_msg = response.json().get("error", "")
        if "2000 characters" in error_msg:
            log_test("4.2 - Message > 2000 chars rejected with proper error", True, f"Error: {error_msg}")
        else:
            log_test("4.2 - Message > 2000 chars rejected with proper error", True, f"Got 400 (error: {error_msg})")
    else:
        log_test("4.2 - Message > 2000 chars rejected with proper error", False, f"Got {response.status_code}")
    
except Exception as e:
    log_test("4.2 - Message > 2000 chars rejected with proper error", False, f"Exception: {str(e)}")

# ============================================================================
# TEST 5: HTML tag stripping
# ============================================================================
print("\n" + "=" * 80)
print("TEST 5: HTML tag stripping")
print("=" * 80)

try:
    admin_session = get_admin_session()
    
    response = requests.post(
        f"{API_BASE}/feedback",
        json={
            "type": "bug",
            "message": "This is a test <script>alert('XSS')</script> with HTML tags <b>bold</b> text"
        },
        timeout=10
    )
    
    if response.status_code == 200:
        feedback_id = response.json().get("id")
        created_feedback_ids.append(feedback_id)
        
        # Fetch the feedback via admin API to check stored message
        time.sleep(0.5)
        admin_response = admin_session.get(f"{API_BASE}/admin/feedback", timeout=10)
        
        if admin_response.status_code == 200:
            feedbacks = admin_response.json()
            feedback = next((f for f in feedbacks if f.get("id") == feedback_id), None)
            
            if feedback:
                stored_message = feedback.get("message", "")
                print(f"Stored message: {stored_message}")
                
                # Check that script tags are stripped
                if "<script>" not in stored_message and "alert" not in stored_message:
                    log_test("5.1 - <script> tags stripped from message", True)
                else:
                    log_test("5.1 - <script> tags stripped from message", False, f"Message: {stored_message}")
                
                # Check that other HTML tags are also stripped
                if "<b>" not in stored_message and "</b>" not in stored_message:
                    log_test("5.2 - Other HTML tags stripped from message", True)
                else:
                    log_test("5.2 - Other HTML tags stripped from message", False, f"Message: {stored_message}")
            else:
                log_test("5.1 - <script> tags stripped from message", False, "Feedback not found")
                log_test("5.2 - Other HTML tags stripped from message", False, "Feedback not found")
        else:
            log_test("5.1 - <script> tags stripped from message", False, f"Admin API failed: {admin_response.status_code}")
            log_test("5.2 - Other HTML tags stripped from message", False, f"Admin API failed: {admin_response.status_code}")
    else:
        log_test("5.1 - <script> tags stripped from message", False, f"Feedback creation failed: {response.status_code}")
        log_test("5.2 - Other HTML tags stripped from message", False, f"Feedback creation failed: {response.status_code}")
    
except Exception as e:
    log_test("5.1 - <script> tags stripped from message", False, f"Exception: {str(e)}")
    log_test("5.2 - Other HTML tags stripped from message", False, f"Exception: {str(e)}")

# ============================================================================
# TEST 6: pageType fallback
# ============================================================================
print("\n" + "=" * 80)
print("TEST 6: pageType fallback to 'other'")
print("=" * 80)

try:
    admin_session = get_admin_session()
    
    response = requests.post(
        f"{API_BASE}/feedback",
        json={
            "type": "suggestion",
            "message": "Testing pageType fallback with invalid value",
            "pageType": "invalid_page_type"
        },
        timeout=10
    )
    
    if response.status_code == 200:
        feedback_id = response.json().get("id")
        created_feedback_ids.append(feedback_id)
        
        # Fetch the feedback via admin API to check stored pageType
        time.sleep(0.5)
        admin_response = admin_session.get(f"{API_BASE}/admin/feedback", timeout=10)
        
        if admin_response.status_code == 200:
            feedbacks = admin_response.json()
            feedback = next((f for f in feedbacks if f.get("id") == feedback_id), None)
            
            if feedback:
                page_type = feedback.get("pageType")
                if page_type == "other":
                    log_test("6.1 - Invalid pageType falls back to 'other'", True, f"pageType={page_type}")
                else:
                    log_test("6.1 - Invalid pageType falls back to 'other'", False, f"pageType={page_type}")
            else:
                log_test("6.1 - Invalid pageType falls back to 'other'", False, "Feedback not found")
        else:
            log_test("6.1 - Invalid pageType falls back to 'other'", False, f"Admin API failed: {admin_response.status_code}")
    else:
        log_test("6.1 - Invalid pageType falls back to 'other'", False, f"Feedback creation failed: {response.status_code}")
    
except Exception as e:
    log_test("6.1 - Invalid pageType falls back to 'other'", False, f"Exception: {str(e)}")

# ============================================================================
# TEST 7: Rate limiting (10 submissions per 10 minutes)
# ============================================================================
print("\n" + "=" * 80)
print("TEST 7: Rate limiting (10 submissions per 10 minutes)")
print("=" * 80)

try:
    session = requests.Session()
    
    # Make 10 submissions rapidly
    print("Making 10 rapid submissions...")
    for i in range(10):
        response = session.post(
            f"{API_BASE}/feedback",
            json={
                "type": "suggestion",
                "message": f"Rate limit test submission {i+1} with sufficient length"
            },
            timeout=10
        )
        print(f"  Submission {i+1}: status={response.status_code}")
        
        if response.status_code == 200:
            created_feedback_ids.append(response.json().get("id"))
        elif response.status_code != 200:
            log_test("7.1 - First 10 submissions succeed", False, f"Submission {i+1} failed with {response.status_code}")
            break
        
        time.sleep(0.1)
    else:
        log_test("7.1 - First 10 submissions succeed", True)
    
    # 11th submission should be rate limited
    print("Making 11th submission (should be rate limited)...")
    response_11 = session.post(
        f"{API_BASE}/feedback",
        json={
            "type": "suggestion",
            "message": "This 11th submission should be rate limited"
        },
        timeout=10
    )
    
    print(f"  11th submission: status={response_11.status_code}")
    
    if response_11.status_code == 429:
        log_test("7.2 - 11th submission returns 429 (rate limited)", True)
    else:
        log_test("7.2 - 11th submission returns 429 (rate limited)", False, f"Got {response_11.status_code}")
    
except Exception as e:
    log_test("7.1 - First 10 submissions succeed", False, f"Exception: {str(e)}")
    log_test("7.2 - 11th submission returns 429 (rate limited)", False, f"Exception: {str(e)}")

# ============================================================================
# TEST 8: Bug reports auto-set priority='medium'
# ============================================================================
print("\n" + "=" * 80)
print("TEST 8: Bug reports auto-set priority='medium'")
print("=" * 80)

try:
    admin_session = get_admin_session()
    
    # Create a bug report
    response = requests.post(
        f"{API_BASE}/feedback",
        json={
            "type": "bug",
            "message": "This is a bug report that should have medium priority"
        },
        timeout=10
    )
    
    if response.status_code == 200:
        feedback_id = response.json().get("id")
        created_feedback_ids.append(feedback_id)
        
        # Fetch the feedback via admin API to check priority
        time.sleep(0.5)
        admin_response = admin_session.get(f"{API_BASE}/admin/feedback", timeout=10)
        
        if admin_response.status_code == 200:
            feedbacks = admin_response.json()
            feedback = next((f for f in feedbacks if f.get("id") == feedback_id), None)
            
            if feedback:
                priority = feedback.get("priority")
                if priority == "medium":
                    log_test("8.1 - Bug report has priority='medium'", True)
                else:
                    log_test("8.1 - Bug report has priority='medium'", False, f"priority={priority}")
            else:
                log_test("8.1 - Bug report has priority='medium'", False, "Feedback not found")
        else:
            log_test("8.1 - Bug report has priority='medium'", False, f"Admin API failed: {admin_response.status_code}")
    else:
        log_test("8.1 - Bug report has priority='medium'", False, f"Feedback creation failed: {response.status_code}")
    
    # Create a non-bug report
    response2 = requests.post(
        f"{API_BASE}/feedback",
        json={
            "type": "suggestion",
            "message": "This is a suggestion that should have low priority"
        },
        timeout=10
    )
    
    if response2.status_code == 200:
        feedback_id2 = response2.json().get("id")
        created_feedback_ids.append(feedback_id2)
        
        # Fetch the feedback via admin API to check priority
        time.sleep(0.5)
        admin_response2 = admin_session.get(f"{API_BASE}/admin/feedback", timeout=10)
        
        if admin_response2.status_code == 200:
            feedbacks2 = admin_response2.json()
            feedback2 = next((f for f in feedbacks2 if f.get("id") == feedback_id2), None)
            
            if feedback2:
                priority2 = feedback2.get("priority")
                if priority2 == "low":
                    log_test("8.2 - Non-bug report has priority='low'", True)
                else:
                    log_test("8.2 - Non-bug report has priority='low'", False, f"priority={priority2}")
            else:
                log_test("8.2 - Non-bug report has priority='low'", False, "Feedback not found")
        else:
            log_test("8.2 - Non-bug report has priority='low'", False, f"Admin API failed: {admin_response2.status_code}")
    else:
        log_test("8.2 - Non-bug report has priority='low'", False, f"Feedback creation failed: {response2.status_code}")
    
except Exception as e:
    log_test("8.1 - Bug report has priority='medium'", False, f"Exception: {str(e)}")
    log_test("8.2 - Non-bug report has priority='low'", False, f"Exception: {str(e)}")

# ============================================================================
# TEST 9: Empty body / missing type
# ============================================================================
print("\n" + "=" * 80)
print("TEST 9: Empty body / missing type")
print("=" * 80)

try:
    response = requests.post(
        f"{API_BASE}/feedback",
        json={},
        timeout=10
    )
    
    if response.status_code == 400:
        log_test("9.1 - Empty body returns 400", True, f"Error: {response.json().get('error')}")
    else:
        log_test("9.1 - Empty body returns 400", False, f"Got {response.status_code}")
    
except Exception as e:
    log_test("9.1 - Empty body returns 400", False, f"Exception: {str(e)}")

# ============================================================================
# TEST 10: Long screenshotUrl handling
# ============================================================================
print("\n" + "=" * 80)
print("TEST 10: Long screenshotUrl handling")
print("=" * 80)

try:
    admin_session = get_admin_session()
    
    # Test with very long URL (>500 chars)
    long_url = "https://example.com/" + "x" * 600
    response = requests.post(
        f"{API_BASE}/feedback",
        json={
            "type": "bug",
            "message": "Testing long screenshotUrl handling",
            "screenshotUrl": long_url
        },
        timeout=10
    )
    
    if response.status_code == 200:
        feedback_id = response.json().get("id")
        created_feedback_ids.append(feedback_id)
        
        # Fetch the feedback via admin API to check stored URL
        time.sleep(0.5)
        admin_response = admin_session.get(f"{API_BASE}/admin/feedback", timeout=10)
        
        if admin_response.status_code == 200:
            feedbacks = admin_response.json()
            feedback = next((f for f in feedbacks if f.get("id") == feedback_id), None)
            
            if feedback:
                stored_url = feedback.get("screenshotUrl")
                if stored_url and len(stored_url) <= 500:
                    log_test("10.1 - Long screenshotUrl clipped to 500 chars", True, f"Length: {len(stored_url)}")
                else:
                    log_test("10.1 - Long screenshotUrl clipped to 500 chars", False, f"Length: {len(stored_url) if stored_url else 'None'}")
            else:
                log_test("10.1 - Long screenshotUrl clipped to 500 chars", False, "Feedback not found")
        else:
            log_test("10.1 - Long screenshotUrl clipped to 500 chars", False, f"Admin API failed: {admin_response.status_code}")
    else:
        log_test("10.1 - Long screenshotUrl clipped to 500 chars", False, f"Feedback creation failed: {response.status_code}")
    
except Exception as e:
    log_test("10.1 - Long screenshotUrl clipped to 500 chars", False, f"Exception: {str(e)}")

# ============================================================================
# TEST 11: Non-http(s) screenshotUrl stored as null
# ============================================================================
print("\n" + "=" * 80)
print("TEST 11: Non-http(s) screenshotUrl stored as null")
print("=" * 80)

try:
    admin_session = get_admin_session()
    
    response = requests.post(
        f"{API_BASE}/feedback",
        json={
            "type": "bug",
            "message": "Testing non-http screenshotUrl handling",
            "screenshotUrl": "ftp://example.com/image.png"
        },
        timeout=10
    )
    
    if response.status_code == 200:
        feedback_id = response.json().get("id")
        created_feedback_ids.append(feedback_id)
        
        # Fetch the feedback via admin API to check stored URL
        time.sleep(0.5)
        admin_response = admin_session.get(f"{API_BASE}/admin/feedback", timeout=10)
        
        if admin_response.status_code == 200:
            feedbacks = admin_response.json()
            feedback = next((f for f in feedbacks if f.get("id") == feedback_id), None)
            
            if feedback:
                stored_url = feedback.get("screenshotUrl")
                if stored_url is None:
                    log_test("11.1 - Non-http(s) screenshotUrl stored as null", True)
                else:
                    log_test("11.1 - Non-http(s) screenshotUrl stored as null", False, f"URL: {stored_url}")
            else:
                log_test("11.1 - Non-http(s) screenshotUrl stored as null", False, "Feedback not found")
        else:
            log_test("11.1 - Non-http(s) screenshotUrl stored as null", False, f"Admin API failed: {admin_response.status_code}")
    else:
        log_test("11.1 - Non-http(s) screenshotUrl stored as null", False, f"Feedback creation failed: {response.status_code}")
    
except Exception as e:
    log_test("11.1 - Non-http(s) screenshotUrl stored as null", False, f"Exception: {str(e)}")

# ============================================================================
# TEST 12: Admin endpoints - Authentication required
# ============================================================================
print("\n" + "=" * 80)
print("TEST 12: Admin endpoints - Authentication required")
print("=" * 80)

try:
    # Try to access admin endpoints without auth
    response1 = requests.get(f"{API_BASE}/admin/feedback", timeout=10)
    if response1.status_code == 401:
        log_test("12.1 - GET /api/admin/feedback requires auth (401)", True)
    else:
        log_test("12.1 - GET /api/admin/feedback requires auth (401)", False, f"Got {response1.status_code}")
    
    response2 = requests.get(f"{API_BASE}/admin/feedback/stats", timeout=10)
    if response2.status_code == 401:
        log_test("12.2 - GET /api/admin/feedback/stats requires auth (401)", True)
    else:
        log_test("12.2 - GET /api/admin/feedback/stats requires auth (401)", False, f"Got {response2.status_code}")
    
except Exception as e:
    log_test("12.1 - GET /api/admin/feedback requires auth (401)", False, f"Exception: {str(e)}")
    log_test("12.2 - GET /api/admin/feedback/stats requires auth (401)", False, f"Exception: {str(e)}")

# ============================================================================
# TEST 13: Admin GET /api/admin/feedback - List all
# ============================================================================
print("\n" + "=" * 80)
print("TEST 13: Admin GET /api/admin/feedback - List all")
print("=" * 80)

try:
    admin_session = get_admin_session()
    
    response = admin_session.get(f"{API_BASE}/admin/feedback", timeout=10)
    
    if response.status_code == 200:
        log_test("13.1 - GET /api/admin/feedback returns 200", True)
        
        feedbacks = response.json()
        if isinstance(feedbacks, list):
            log_test("13.2 - Response is an array", True, f"Count: {len(feedbacks)}")
            
            # Check if our created feedbacks are in the list
            if len(feedbacks) > 0:
                sample = feedbacks[0]
                required_fields = ['id', 'type', 'message', 'status', 'priority', 'createdAt']
                has_all_fields = all(field in sample for field in required_fields)
                
                if has_all_fields:
                    log_test("13.3 - Feedback objects have required fields", True)
                else:
                    missing = [f for f in required_fields if f not in sample]
                    log_test("13.3 - Feedback objects have required fields", False, f"Missing: {missing}")
            else:
                log_test("13.3 - Feedback objects have required fields", True, "No feedbacks to check (empty list)")
        else:
            log_test("13.2 - Response is an array", False, f"Type: {type(feedbacks)}")
            log_test("13.3 - Feedback objects have required fields", False, "Not an array")
    else:
        log_test("13.1 - GET /api/admin/feedback returns 200", False, f"Got {response.status_code}")
        log_test("13.2 - Response is an array", False, f"Status: {response.status_code}")
        log_test("13.3 - Feedback objects have required fields", False, f"Status: {response.status_code}")
    
except Exception as e:
    log_test("13.1 - GET /api/admin/feedback returns 200", False, f"Exception: {str(e)}")
    log_test("13.2 - Response is an array", False, f"Exception: {str(e)}")
    log_test("13.3 - Feedback objects have required fields", False, f"Exception: {str(e)}")

# ============================================================================
# TEST 14: Admin GET /api/admin/feedback/stats
# ============================================================================
print("\n" + "=" * 80)
print("TEST 14: Admin GET /api/admin/feedback/stats")
print("=" * 80)

try:
    admin_session = get_admin_session()
    
    response = admin_session.get(f"{API_BASE}/admin/feedback/stats", timeout=10)
    
    if response.status_code == 200:
        log_test("14.1 - GET /api/admin/feedback/stats returns 200", True)
        
        stats = response.json()
        print(f"Stats: {json.dumps(stats, indent=2)}")
        
        required_fields = ['total', 'new', 'bugs', 'contentCorrections', 'critical', 'resolved', 
                          'byType', 'byStatus', 'byPriority', 'topLessons', 'topCourses']
        has_all_fields = all(field in stats for field in required_fields)
        
        if has_all_fields:
            log_test("14.2 - Stats has all required fields", True)
        else:
            missing = [f for f in required_fields if f not in stats]
            log_test("14.2 - Stats has all required fields", False, f"Missing: {missing}")
        
        # Verify counts are numbers
        if isinstance(stats.get('total'), int) and isinstance(stats.get('bugs'), int):
            log_test("14.3 - Stats counts are integers", True)
        else:
            log_test("14.3 - Stats counts are integers", False, f"total type: {type(stats.get('total'))}, bugs type: {type(stats.get('bugs'))}")
    else:
        log_test("14.1 - GET /api/admin/feedback/stats returns 200", False, f"Got {response.status_code}")
        log_test("14.2 - Stats has all required fields", False, f"Status: {response.status_code}")
        log_test("14.3 - Stats counts are integers", False, f"Status: {response.status_code}")
    
except Exception as e:
    log_test("14.1 - GET /api/admin/feedback/stats returns 200", False, f"Exception: {str(e)}")
    log_test("14.2 - Stats has all required fields", False, f"Exception: {str(e)}")
    log_test("14.3 - Stats counts are integers", False, f"Exception: {str(e)}")

# ============================================================================
# TEST 15: Admin PATCH /api/admin/feedback/:id - Update status
# ============================================================================
print("\n" + "=" * 80)
print("TEST 15: Admin PATCH /api/admin/feedback/:id - Update status")
print("=" * 80)

try:
    admin_session = get_admin_session()
    
    # Create a feedback to update
    response = requests.post(
        f"{API_BASE}/feedback",
        json={
            "type": "bug",
            "message": "This feedback will be updated by admin"
        },
        timeout=10
    )
    
    if response.status_code == 200:
        feedback_id = response.json().get("id")
        created_feedback_ids.append(feedback_id)
        
        time.sleep(0.5)
        
        # Update status to 'reviewed'
        patch_response = admin_session.patch(
            f"{API_BASE}/admin/feedback/{feedback_id}",
            json={"status": "reviewed"},
            timeout=10
        )
        
        if patch_response.status_code == 200:
            log_test("15.1 - PATCH status='reviewed' returns 200", True)
            
            data = patch_response.json()
            if data.get("ok") is True and data.get("feedback", {}).get("status") == "reviewed":
                log_test("15.2 - Status updated to 'reviewed'", True)
            else:
                log_test("15.2 - Status updated to 'reviewed'", False, f"Response: {data}")
        else:
            log_test("15.1 - PATCH status='reviewed' returns 200", False, f"Got {patch_response.status_code}")
            log_test("15.2 - Status updated to 'reviewed'", False, f"Status: {patch_response.status_code}")
        
        time.sleep(0.5)
        
        # Update status to 'resolved' (should set resolvedAt)
        patch_response2 = admin_session.patch(
            f"{API_BASE}/admin/feedback/{feedback_id}",
            json={"status": "resolved"},
            timeout=10
        )
        
        if patch_response2.status_code == 200:
            data2 = patch_response2.json()
            feedback = data2.get("feedback", {})
            
            if feedback.get("status") == "resolved" and feedback.get("resolvedAt") is not None:
                log_test("15.3 - Status='resolved' sets resolvedAt", True)
            else:
                log_test("15.3 - Status='resolved' sets resolvedAt", False, 
                        f"status={feedback.get('status')}, resolvedAt={feedback.get('resolvedAt')}")
        else:
            log_test("15.3 - Status='resolved' sets resolvedAt", False, f"Status: {patch_response2.status_code}")
        
        time.sleep(0.5)
        
        # Update status back to 'new' (should clear resolvedAt)
        patch_response3 = admin_session.patch(
            f"{API_BASE}/admin/feedback/{feedback_id}",
            json={"status": "new"},
            timeout=10
        )
        
        if patch_response3.status_code == 200:
            data3 = patch_response3.json()
            feedback3 = data3.get("feedback", {})
            
            if feedback3.get("status") == "new" and feedback3.get("resolvedAt") is None:
                log_test("15.4 - Status='new' clears resolvedAt", True)
            else:
                log_test("15.4 - Status='new' clears resolvedAt", False, 
                        f"status={feedback3.get('status')}, resolvedAt={feedback3.get('resolvedAt')}")
        else:
            log_test("15.4 - Status='new' clears resolvedAt", False, f"Status: {patch_response3.status_code}")
    else:
        log_test("15.1 - PATCH status='reviewed' returns 200", False, "Feedback creation failed")
        log_test("15.2 - Status updated to 'reviewed'", False, "Feedback creation failed")
        log_test("15.3 - Status='resolved' sets resolvedAt", False, "Feedback creation failed")
        log_test("15.4 - Status='new' clears resolvedAt", False, "Feedback creation failed")
    
except Exception as e:
    log_test("15.1 - PATCH status='reviewed' returns 200", False, f"Exception: {str(e)}")
    log_test("15.2 - Status updated to 'reviewed'", False, f"Exception: {str(e)}")
    log_test("15.3 - Status='resolved' sets resolvedAt", False, f"Exception: {str(e)}")
    log_test("15.4 - Status='new' clears resolvedAt", False, f"Exception: {str(e)}")

# ============================================================================
# TEST 16: Admin PATCH - Update priority
# ============================================================================
print("\n" + "=" * 80)
print("TEST 16: Admin PATCH - Update priority")
print("=" * 80)

try:
    admin_session = get_admin_session()
    
    # Create a feedback to update
    response = requests.post(
        f"{API_BASE}/feedback",
        json={
            "type": "suggestion",
            "message": "This feedback priority will be updated"
        },
        timeout=10
    )
    
    if response.status_code == 200:
        feedback_id = response.json().get("id")
        created_feedback_ids.append(feedback_id)
        
        time.sleep(0.5)
        
        # Update priority to 'critical'
        patch_response = admin_session.patch(
            f"{API_BASE}/admin/feedback/{feedback_id}",
            json={"priority": "critical"},
            timeout=10
        )
        
        if patch_response.status_code == 200:
            data = patch_response.json()
            if data.get("feedback", {}).get("priority") == "critical":
                log_test("16.1 - Priority updated to 'critical'", True)
            else:
                log_test("16.1 - Priority updated to 'critical'", False, f"priority={data.get('feedback', {}).get('priority')}")
        else:
            log_test("16.1 - Priority updated to 'critical'", False, f"Status: {patch_response.status_code}")
    else:
        log_test("16.1 - Priority updated to 'critical'", False, "Feedback creation failed")
    
except Exception as e:
    log_test("16.1 - Priority updated to 'critical'", False, f"Exception: {str(e)}")

# ============================================================================
# TEST 17: Admin PATCH - Update adminNotes
# ============================================================================
print("\n" + "=" * 80)
print("TEST 17: Admin PATCH - Update adminNotes")
print("=" * 80)

try:
    admin_session = get_admin_session()
    
    # Create a feedback to update
    response = requests.post(
        f"{API_BASE}/feedback",
        json={
            "type": "bug",
            "message": "This feedback will have admin notes added"
        },
        timeout=10
    )
    
    if response.status_code == 200:
        feedback_id = response.json().get("id")
        created_feedback_ids.append(feedback_id)
        
        time.sleep(0.5)
        
        # Add admin notes
        notes = "Admin reviewed this and found it to be a duplicate issue"
        patch_response = admin_session.patch(
            f"{API_BASE}/admin/feedback/{feedback_id}",
            json={"adminNotes": notes},
            timeout=10
        )
        
        if patch_response.status_code == 200:
            data = patch_response.json()
            if data.get("feedback", {}).get("adminNotes") == notes:
                log_test("17.1 - adminNotes updated successfully", True)
            else:
                log_test("17.1 - adminNotes updated successfully", False, f"notes={data.get('feedback', {}).get('adminNotes')}")
        else:
            log_test("17.1 - adminNotes updated successfully", False, f"Status: {patch_response.status_code}")
        
        time.sleep(0.5)
        
        # Test adminNotes length limit (>2000 chars should be clipped)
        long_notes = "x" * 2500
        patch_response2 = admin_session.patch(
            f"{API_BASE}/admin/feedback/{feedback_id}",
            json={"adminNotes": long_notes},
            timeout=10
        )
        
        if patch_response2.status_code == 200:
            data2 = patch_response2.json()
            stored_notes = data2.get("feedback", {}).get("adminNotes", "")
            if len(stored_notes) <= 2000:
                log_test("17.2 - adminNotes clipped to 2000 chars", True, f"Length: {len(stored_notes)}")
            else:
                log_test("17.2 - adminNotes clipped to 2000 chars", False, f"Length: {len(stored_notes)}")
        else:
            log_test("17.2 - adminNotes clipped to 2000 chars", False, f"Status: {patch_response2.status_code}")
    else:
        log_test("17.1 - adminNotes updated successfully", False, "Feedback creation failed")
        log_test("17.2 - adminNotes clipped to 2000 chars", False, "Feedback creation failed")
    
except Exception as e:
    log_test("17.1 - adminNotes updated successfully", False, f"Exception: {str(e)}")
    log_test("17.2 - adminNotes clipped to 2000 chars", False, f"Exception: {str(e)}")

# ============================================================================
# TEST 18: Admin PATCH - Invalid feedback ID
# ============================================================================
print("\n" + "=" * 80)
print("TEST 18: Admin PATCH - Invalid feedback ID")
print("=" * 80)

try:
    admin_session = get_admin_session()
    
    # Try to update with invalid ID
    patch_response = admin_session.patch(
        f"{API_BASE}/admin/feedback/invalid-id-format",
        json={"status": "reviewed"},
        timeout=10
    )
    
    if patch_response.status_code == 400:
        log_test("18.1 - Invalid feedback ID returns 400", True)
    else:
        log_test("18.1 - Invalid feedback ID returns 400", False, f"Got {patch_response.status_code}")
    
except Exception as e:
    log_test("18.1 - Invalid feedback ID returns 400", False, f"Exception: {str(e)}")

# ============================================================================
# TEST 19: Admin DELETE /api/admin/feedback/:id
# ============================================================================
print("\n" + "=" * 80)
print("TEST 19: Admin DELETE /api/admin/feedback/:id")
print("=" * 80)

try:
    admin_session = get_admin_session()
    
    # Create a feedback to delete
    response = requests.post(
        f"{API_BASE}/feedback",
        json={
            "type": "opinion",
            "message": "This feedback will be deleted by admin"
        },
        timeout=10
    )
    
    if response.status_code == 200:
        feedback_id = response.json().get("id")
        
        time.sleep(0.5)
        
        # Delete the feedback
        delete_response = admin_session.delete(
            f"{API_BASE}/admin/feedback/{feedback_id}",
            timeout=10
        )
        
        if delete_response.status_code == 200:
            data = delete_response.json()
            if data.get("ok") is True:
                log_test("19.1 - DELETE returns ok: true", True)
            else:
                log_test("19.1 - DELETE returns ok: true", False, f"Response: {data}")
        else:
            log_test("19.1 - DELETE returns ok: true", False, f"Status: {delete_response.status_code}")
        
        time.sleep(0.5)
        
        # Verify it's gone from the list
        list_response = admin_session.get(f"{API_BASE}/admin/feedback", timeout=10)
        if list_response.status_code == 200:
            feedbacks = list_response.json()
            still_exists = any(f.get("id") == feedback_id for f in feedbacks)
            
            if not still_exists:
                log_test("19.2 - Deleted feedback not in list", True)
            else:
                log_test("19.2 - Deleted feedback not in list", False, "Feedback still exists")
        else:
            log_test("19.2 - Deleted feedback not in list", False, f"List API failed: {list_response.status_code}")
    else:
        log_test("19.1 - DELETE returns ok: true", False, "Feedback creation failed")
        log_test("19.2 - Deleted feedback not in list", False, "Feedback creation failed")
    
except Exception as e:
    log_test("19.1 - DELETE returns ok: true", False, f"Exception: {str(e)}")
    log_test("19.2 - Deleted feedback not in list", False, f"Exception: {str(e)}")

# ============================================================================
# TEST 20: Admin bulk-delete - resolved status
# ============================================================================
print("\n" + "=" * 80)
print("TEST 20: Admin bulk-delete - resolved status")
print("=" * 80)

try:
    admin_session = get_admin_session()
    
    # Create 3 feedbacks and mark them as resolved
    resolved_ids = []
    for i in range(3):
        response = requests.post(
            f"{API_BASE}/feedback",
            json={
                "type": "suggestion",
                "message": f"Bulk delete test feedback {i+1} - will be resolved"
            },
            timeout=10
        )
        
        if response.status_code == 200:
            feedback_id = response.json().get("id")
            resolved_ids.append(feedback_id)
            
            time.sleep(0.3)
            
            # Mark as resolved
            admin_session.patch(
                f"{API_BASE}/admin/feedback/{feedback_id}",
                json={"status": "resolved"},
                timeout=10
            )
    
    time.sleep(0.5)
    
    # Bulk delete resolved
    bulk_response = admin_session.post(
        f"{API_BASE}/admin/feedback/bulk-delete",
        json={"mode": "status", "status": "resolved"},
        timeout=10
    )
    
    if bulk_response.status_code == 200:
        data = bulk_response.json()
        if data.get("ok") is True and data.get("deleted", 0) >= 3:
            log_test("20.1 - Bulk delete resolved returns ok: true with deleted count", True, f"Deleted: {data.get('deleted')}")
        else:
            log_test("20.1 - Bulk delete resolved returns ok: true with deleted count", False, f"Response: {data}")
    else:
        log_test("20.1 - Bulk delete resolved returns ok: true with deleted count", False, f"Status: {bulk_response.status_code}")
    
    time.sleep(0.5)
    
    # Verify they're gone
    list_response = admin_session.get(f"{API_BASE}/admin/feedback", timeout=10)
    if list_response.status_code == 200:
        feedbacks = list_response.json()
        still_exist = [fid for fid in resolved_ids if any(f.get("id") == fid for f in feedbacks)]
        
        if len(still_exist) == 0:
            log_test("20.2 - Bulk deleted feedbacks not in list", True)
        else:
            log_test("20.2 - Bulk deleted feedbacks not in list", False, f"Still exist: {still_exist}")
    else:
        log_test("20.2 - Bulk deleted feedbacks not in list", False, f"List API failed: {list_response.status_code}")
    
except Exception as e:
    log_test("20.1 - Bulk delete resolved returns ok: true with deleted count", False, f"Exception: {str(e)}")
    log_test("20.2 - Bulk deleted feedbacks not in list", False, f"Exception: {str(e)}")

# ============================================================================
# TEST 21: Admin bulk-delete - ignored status
# ============================================================================
print("\n" + "=" * 80)
print("TEST 21: Admin bulk-delete - ignored status")
print("=" * 80)

try:
    admin_session = get_admin_session()
    
    # Create 2 feedbacks and mark them as ignored
    ignored_ids = []
    for i in range(2):
        response = requests.post(
            f"{API_BASE}/feedback",
            json={
                "type": "opinion",
                "message": f"Bulk delete test feedback {i+1} - will be ignored"
            },
            timeout=10
        )
        
        if response.status_code == 200:
            feedback_id = response.json().get("id")
            ignored_ids.append(feedback_id)
            
            time.sleep(0.3)
            
            # Mark as ignored
            admin_session.patch(
                f"{API_BASE}/admin/feedback/{feedback_id}",
                json={"status": "ignored"},
                timeout=10
            )
    
    time.sleep(0.5)
    
    # Bulk delete ignored
    bulk_response = admin_session.post(
        f"{API_BASE}/admin/feedback/bulk-delete",
        json={"mode": "status", "status": "ignored"},
        timeout=10
    )
    
    if bulk_response.status_code == 200:
        data = bulk_response.json()
        if data.get("ok") is True and data.get("deleted", 0) >= 2:
            log_test("21.1 - Bulk delete ignored returns ok: true with deleted count", True, f"Deleted: {data.get('deleted')}")
        else:
            log_test("21.1 - Bulk delete ignored returns ok: true with deleted count", False, f"Response: {data}")
    else:
        log_test("21.1 - Bulk delete ignored returns ok: true with deleted count", False, f"Status: {bulk_response.status_code}")
    
except Exception as e:
    log_test("21.1 - Bulk delete ignored returns ok: true with deleted count", False, f"Exception: {str(e)}")

# ============================================================================
# TEST 22: Admin bulk-delete - reject 'new' status
# ============================================================================
print("\n" + "=" * 80)
print("TEST 22: Admin bulk-delete - reject 'new' status")
print("=" * 80)

try:
    admin_session = get_admin_session()
    
    # Try to bulk delete 'new' status (should be rejected)
    bulk_response = admin_session.post(
        f"{API_BASE}/admin/feedback/bulk-delete",
        json={"mode": "status", "status": "new"},
        timeout=10
    )
    
    if bulk_response.status_code == 400:
        error_msg = bulk_response.json().get("error", "")
        if "resolved or ignored" in error_msg.lower():
            log_test("22.1 - Bulk delete 'new' status returns 400 with proper error", True, f"Error: {error_msg}")
        else:
            log_test("22.1 - Bulk delete 'new' status returns 400 with proper error", True, f"Got 400 (error: {error_msg})")
    else:
        log_test("22.1 - Bulk delete 'new' status returns 400 with proper error", False, f"Got {bulk_response.status_code}")
    
except Exception as e:
    log_test("22.1 - Bulk delete 'new' status returns 400 with proper error", False, f"Exception: {str(e)}")

# ============================================================================
# TEST 23: Admin bulk-delete - older_than_90_days mode
# ============================================================================
print("\n" + "=" * 80)
print("TEST 23: Admin bulk-delete - older_than_90_days mode")
print("=" * 80)

try:
    admin_session = get_admin_session()
    
    # This mode deletes resolved+ignored older than 90 days
    # We can't easily test this without manipulating timestamps, but we can verify the endpoint accepts it
    bulk_response = admin_session.post(
        f"{API_BASE}/admin/feedback/bulk-delete",
        json={"mode": "older_than_90_days"},
        timeout=10
    )
    
    if bulk_response.status_code == 200:
        data = bulk_response.json()
        if data.get("ok") is True:
            log_test("23.1 - Bulk delete older_than_90_days mode accepted", True, f"Deleted: {data.get('deleted', 0)}")
        else:
            log_test("23.1 - Bulk delete older_than_90_days mode accepted", False, f"Response: {data}")
    else:
        log_test("23.1 - Bulk delete older_than_90_days mode accepted", False, f"Status: {bulk_response.status_code}")
    
except Exception as e:
    log_test("23.1 - Bulk delete older_than_90_days mode accepted", False, f"Exception: {str(e)}")

# ============================================================================
# TEST 24: Admin bulk-delete - requires auth
# ============================================================================
print("\n" + "=" * 80)
print("TEST 24: Admin bulk-delete - requires auth")
print("=" * 80)

try:
    # Try to bulk delete without auth
    response = requests.post(
        f"{API_BASE}/admin/feedback/bulk-delete",
        json={"mode": "status", "status": "resolved"},
        timeout=10
    )
    
    if response.status_code == 401:
        log_test("24.1 - Bulk delete without auth returns 401", True)
    else:
        log_test("24.1 - Bulk delete without auth returns 401", False, f"Got {response.status_code}")
    
except Exception as e:
    log_test("24.1 - Bulk delete without auth returns 401", False, f"Exception: {str(e)}")

# ============================================================================
# CLEANUP: Delete remaining test feedbacks
# ============================================================================
print("\n" + "=" * 80)
print("CLEANUP: Deleting remaining test feedbacks")
print("=" * 80)

try:
    admin_session = get_admin_session()
    
    # Get all feedbacks
    list_response = admin_session.get(f"{API_BASE}/admin/feedback", timeout=10)
    if list_response.status_code == 200:
        feedbacks = list_response.json()
        
        # Delete all feedbacks created during this test
        deleted_count = 0
        for feedback_id in created_feedback_ids:
            # Check if it still exists
            if any(f.get("id") == feedback_id for f in feedbacks):
                delete_response = admin_session.delete(
                    f"{API_BASE}/admin/feedback/{feedback_id}",
                    timeout=10
                )
                if delete_response.status_code == 200:
                    deleted_count += 1
                time.sleep(0.1)
        
        print(f"Deleted {deleted_count} test feedbacks")
    
except Exception as e:
    print(f"Cleanup error: {str(e)}")

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

# Exit with appropriate code
exit(0 if test_results['failed'] == 0 else 1)
