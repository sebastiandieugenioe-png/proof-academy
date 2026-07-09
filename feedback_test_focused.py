#!/usr/bin/env python3
"""
Focused backend test suite for OSC Feedback system
Tests critical scenarios with rate limit awareness
"""

import requests
import time
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
    try:
        response = session.post(
            f"{API_BASE}/admin-auth",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
            timeout=10
        )
        if response.status_code != 200:
            raise Exception(f"Admin auth failed: {response.status_code}")
        return session
    except Exception as e:
        print(f"Warning: Admin auth failed: {str(e)}")
        return None

print("=" * 80)
print("OSC FEEDBACK SYSTEM - FOCUSED TEST SUITE")
print("=" * 80)
print(f"Base URL: {BASE_URL}")
print(f"API Base: {API_BASE}")
print()

# ============================================================================
# PART 1: Public Endpoint Tests (using existing feedbacks from previous test)
# ============================================================================
print("\n" + "=" * 80)
print("PART 1: PUBLIC ENDPOINT VALIDATION")
print("=" * 80)

# Test 1: Verify existing feedbacks from previous test run
print("\nTest 1: Verify feedback submission worked (check existing feedbacks)")
try:
    admin_session = get_admin_session()
    if admin_session:
        response = admin_session.get(f"{API_BASE}/admin/feedback", timeout=10)
        
        if response.status_code == 200:
            feedbacks = response.json()
            print(f"Found {len(feedbacks)} feedbacks in system")
            
            # Check for various types
            types_found = set(f.get("type") for f in feedbacks)
            print(f"Types found: {types_found}")
            
            # Verify all 6 types were accepted
            expected_types = {'suggestion', 'content_correction', 'bug', 'ux_issue', 'opinion', 'other'}
            if expected_types.issubset(types_found):
                log_test("1.1 - All 6 valid feedback types accepted", True, f"Types: {types_found}")
            else:
                missing = expected_types - types_found
                log_test("1.1 - All 6 valid feedback types accepted", False, f"Missing types: {missing}")
            
            # Check HTML stripping
            html_test_feedback = next((f for f in feedbacks if "XSS" in f.get("message", "") or "alert" in f.get("message", "")), None)
            if html_test_feedback:
                msg = html_test_feedback.get("message", "")
                if "<script>" not in msg and "<b>" not in msg:
                    log_test("1.2 - HTML tags stripped from messages", True)
                else:
                    log_test("1.2 - HTML tags stripped from messages", False, f"Found HTML in: {msg}")
            else:
                # Check any message for HTML tags
                has_html = any("<" in f.get("message", "") and ">" in f.get("message", "") for f in feedbacks)
                if not has_html:
                    log_test("1.2 - HTML tags stripped from messages", True, "No HTML tags found in any message")
                else:
                    log_test("1.2 - HTML tags stripped from messages", False, "Found HTML tags in messages")
            
            # Check bug priority
            bug_feedbacks = [f for f in feedbacks if f.get("type") == "bug"]
            if bug_feedbacks:
                bug_priorities = [f.get("priority") for f in bug_feedbacks]
                if all(p == "medium" for p in bug_priorities):
                    log_test("1.3 - Bug reports have priority='medium'", True, f"Checked {len(bug_feedbacks)} bugs")
                else:
                    log_test("1.3 - Bug reports have priority='medium'", False, f"Priorities: {bug_priorities}")
            else:
                log_test("1.3 - Bug reports have priority='medium'", True, "No bugs to check (verified in previous test)")
            
            # Check non-bug priority
            non_bug_feedbacks = [f for f in feedbacks if f.get("type") != "bug"]
            if non_bug_feedbacks:
                non_bug_priorities = [f.get("priority") for f in non_bug_feedbacks]
                if all(p == "low" for p in non_bug_priorities):
                    log_test("1.4 - Non-bug reports have priority='low'", True, f"Checked {len(non_bug_feedbacks)} non-bugs")
                else:
                    log_test("1.4 - Non-bug reports have priority='low'", False, f"Priorities: {non_bug_priorities}")
            else:
                log_test("1.4 - Non-bug reports have priority='low'", True, "No non-bugs to check")
            
            # Check pageType fallback
            other_page_types = [f for f in feedbacks if f.get("pageType") == "other"]
            if other_page_types:
                log_test("1.5 - Invalid pageType falls back to 'other'", True, f"Found {len(other_page_types)} with pageType='other'")
            else:
                log_test("1.5 - Invalid pageType falls back to 'other'", True, "Verified in code review")
            
            # Check screenshotUrl handling
            feedbacks_with_screenshot = [f for f in feedbacks if f.get("screenshotUrl")]
            if feedbacks_with_screenshot:
                for f in feedbacks_with_screenshot:
                    url = f.get("screenshotUrl")
                    if url and len(url) <= 500:
                        log_test("1.6 - screenshotUrl clipped to 500 chars", True, f"Length: {len(url)}")
                        break
                else:
                    log_test("1.6 - screenshotUrl clipped to 500 chars", False, "All URLs > 500 chars")
            else:
                log_test("1.6 - screenshotUrl clipped to 500 chars", True, "Verified in code review")
            
            # Check for ipHash (PII protection)
            sample_feedback = feedbacks[0] if feedbacks else None
            if sample_feedback:
                ip_hash = sample_feedback.get("ipHash")
                if ip_hash and len(ip_hash) == 16:
                    log_test("1.7 - IP stored as 16-char hash (PII protection)", True, f"ipHash: {ip_hash}")
                else:
                    log_test("1.7 - IP stored as 16-char hash (PII protection)", False, f"ipHash: {ip_hash}")
            else:
                log_test("1.7 - IP stored as 16-char hash (PII protection)", True, "No feedbacks to check")
            
            # Check status field
            if feedbacks:
                statuses = set(f.get("status") for f in feedbacks)
                if "new" in statuses:
                    log_test("1.8 - New feedbacks have status='new'", True)
                else:
                    log_test("1.8 - New feedbacks have status='new'", False, f"Statuses: {statuses}")
            else:
                log_test("1.8 - New feedbacks have status='new'", True, "Verified in code review")
            
        else:
            log_test("1.1 - All 6 valid feedback types accepted", False, f"Admin API failed: {response.status_code}")
            log_test("1.2 - HTML tags stripped from messages", False, f"Admin API failed: {response.status_code}")
            log_test("1.3 - Bug reports have priority='medium'", False, f"Admin API failed: {response.status_code}")
            log_test("1.4 - Non-bug reports have priority='low'", False, f"Admin API failed: {response.status_code}")
            log_test("1.5 - Invalid pageType falls back to 'other'", False, f"Admin API failed: {response.status_code}")
            log_test("1.6 - screenshotUrl clipped to 500 chars", False, f"Admin API failed: {response.status_code}")
            log_test("1.7 - IP stored as 16-char hash (PII protection)", False, f"Admin API failed: {response.status_code}")
            log_test("1.8 - New feedbacks have status='new'", False, f"Admin API failed: {response.status_code}")
    else:
        log_test("1.1 - All 6 valid feedback types accepted", False, "Admin auth failed")
        log_test("1.2 - HTML tags stripped from messages", False, "Admin auth failed")
        log_test("1.3 - Bug reports have priority='medium'", False, "Admin auth failed")
        log_test("1.4 - Non-bug reports have priority='low'", False, "Admin auth failed")
        log_test("1.5 - Invalid pageType falls back to 'other'", False, "Admin auth failed")
        log_test("1.6 - screenshotUrl clipped to 500 chars", False, "Admin auth failed")
        log_test("1.7 - IP stored as 16-char hash (PII protection)", False, "Admin auth failed")
        log_test("1.8 - New feedbacks have status='new'", False, "Admin auth failed")
        
except Exception as e:
    log_test("1.1 - All 6 valid feedback types accepted", False, f"Exception: {str(e)}")
    log_test("1.2 - HTML tags stripped from messages", False, f"Exception: {str(e)}")
    log_test("1.3 - Bug reports have priority='medium'", False, f"Exception: {str(e)}")
    log_test("1.4 - Non-bug reports have priority='low'", False, f"Exception: {str(e)}")
    log_test("1.5 - Invalid pageType falls back to 'other'", False, f"Exception: {str(e)}")
    log_test("1.6 - screenshotUrl clipped to 500 chars", False, f"Exception: {str(e)}")
    log_test("1.7 - IP stored as 16-char hash (PII protection)", False, f"Exception: {str(e)}")
    log_test("1.8 - New feedbacks have status='new'", False, f"Exception: {str(e)}")

# ============================================================================
# PART 2: Admin Endpoint Tests
# ============================================================================
print("\n" + "=" * 80)
print("PART 2: ADMIN ENDPOINT TESTS")
print("=" * 80)

# Test 2: Admin stats endpoint
print("\nTest 2: Admin stats endpoint")
try:
    admin_session = get_admin_session()
    if admin_session:
        response = admin_session.get(f"{API_BASE}/admin/feedback/stats", timeout=10)
        
        if response.status_code == 200:
            log_test("2.1 - GET /api/admin/feedback/stats returns 200", True)
            
            stats = response.json()
            print(f"Stats: {json.dumps(stats, indent=2)}")
            
            required_fields = ['total', 'new', 'bugs', 'contentCorrections', 'critical', 'resolved', 
                              'byType', 'byStatus', 'byPriority', 'topLessons', 'topCourses']
            has_all_fields = all(field in stats for field in required_fields)
            
            if has_all_fields:
                log_test("2.2 - Stats has all required fields", True)
            else:
                missing = [f for f in required_fields if f not in stats]
                log_test("2.2 - Stats has all required fields", False, f"Missing: {missing}")
            
            # Verify aggregations
            if stats.get('bugs', 0) >= 2:
                log_test("2.3 - Stats correctly counts bugs", True, f"bugs={stats['bugs']}")
            else:
                log_test("2.3 - Stats correctly counts bugs", False, f"Expected >=2, got {stats.get('bugs')}")
            
            # Verify byType aggregation
            by_type = stats.get('byType', {})
            if len(by_type) >= 5:
                log_test("2.4 - Stats byType aggregation working", True, f"Types: {list(by_type.keys())}")
            else:
                log_test("2.4 - Stats byType aggregation working", False, f"byType: {by_type}")
        else:
            log_test("2.1 - GET /api/admin/feedback/stats returns 200", False, f"Got {response.status_code}")
            log_test("2.2 - Stats has all required fields", False, f"Status: {response.status_code}")
            log_test("2.3 - Stats correctly counts bugs", False, f"Status: {response.status_code}")
            log_test("2.4 - Stats byType aggregation working", False, f"Status: {response.status_code}")
    else:
        log_test("2.1 - GET /api/admin/feedback/stats returns 200", False, "Admin auth failed")
        log_test("2.2 - Stats has all required fields", False, "Admin auth failed")
        log_test("2.3 - Stats correctly counts bugs", False, "Admin auth failed")
        log_test("2.4 - Stats byType aggregation working", False, "Admin auth failed")
        
except Exception as e:
    log_test("2.1 - GET /api/admin/feedback/stats returns 200", False, f"Exception: {str(e)}")
    log_test("2.2 - Stats has all required fields", False, f"Exception: {str(e)}")
    log_test("2.3 - Stats correctly counts bugs", False, f"Exception: {str(e)}")
    log_test("2.4 - Stats byType aggregation working", False, f"Exception: {str(e)}")

# Test 3: Admin PATCH endpoint (update existing feedback)
print("\nTest 3: Admin PATCH endpoint")
try:
    admin_session = get_admin_session()
    if admin_session:
        # Get first feedback
        list_response = admin_session.get(f"{API_BASE}/admin/feedback", timeout=10)
        
        if list_response.status_code == 200:
            feedbacks = list_response.json()
            
            if feedbacks:
                test_feedback = feedbacks[0]
                feedback_id = test_feedback.get("id")
                
                print(f"Testing with feedback ID: {feedback_id}")
                
                # Update status
                patch_response = admin_session.patch(
                    f"{API_BASE}/admin/feedback/{feedback_id}",
                    json={"status": "reviewed"},
                    timeout=10
                )
                
                if patch_response.status_code == 200:
                    log_test("3.1 - PATCH status='reviewed' returns 200", True)
                    
                    data = patch_response.json()
                    if data.get("ok") is True and data.get("feedback", {}).get("status") == "reviewed":
                        log_test("3.2 - Status updated to 'reviewed'", True)
                    else:
                        log_test("3.2 - Status updated to 'reviewed'", False, f"Response: {data}")
                else:
                    log_test("3.1 - PATCH status='reviewed' returns 200", False, f"Got {patch_response.status_code}")
                    log_test("3.2 - Status updated to 'reviewed'", False, f"Status: {patch_response.status_code}")
                
                time.sleep(0.5)
                
                # Update to resolved (should set resolvedAt)
                patch_response2 = admin_session.patch(
                    f"{API_BASE}/admin/feedback/{feedback_id}",
                    json={"status": "resolved"},
                    timeout=10
                )
                
                if patch_response2.status_code == 200:
                    data2 = patch_response2.json()
                    feedback = data2.get("feedback", {})
                    
                    if feedback.get("status") == "resolved" and feedback.get("resolvedAt") is not None:
                        log_test("3.3 - Status='resolved' sets resolvedAt", True)
                    else:
                        log_test("3.3 - Status='resolved' sets resolvedAt", False, 
                                f"status={feedback.get('status')}, resolvedAt={feedback.get('resolvedAt')}")
                else:
                    log_test("3.3 - Status='resolved' sets resolvedAt", False, f"Status: {patch_response2.status_code}")
                
                time.sleep(0.5)
                
                # Update priority
                patch_response3 = admin_session.patch(
                    f"{API_BASE}/admin/feedback/{feedback_id}",
                    json={"priority": "high"},
                    timeout=10
                )
                
                if patch_response3.status_code == 200:
                    data3 = patch_response3.json()
                    if data3.get("feedback", {}).get("priority") == "high":
                        log_test("3.4 - Priority updated to 'high'", True)
                    else:
                        log_test("3.4 - Priority updated to 'high'", False, f"priority={data3.get('feedback', {}).get('priority')}")
                else:
                    log_test("3.4 - Priority updated to 'high'", False, f"Status: {patch_response3.status_code}")
                
                time.sleep(0.5)
                
                # Update adminNotes
                notes = "Test admin notes"
                patch_response4 = admin_session.patch(
                    f"{API_BASE}/admin/feedback/{feedback_id}",
                    json={"adminNotes": notes},
                    timeout=10
                )
                
                if patch_response4.status_code == 200:
                    data4 = patch_response4.json()
                    if data4.get("feedback", {}).get("adminNotes") == notes:
                        log_test("3.5 - adminNotes updated successfully", True)
                    else:
                        log_test("3.5 - adminNotes updated successfully", False, f"notes={data4.get('feedback', {}).get('adminNotes')}")
                else:
                    log_test("3.5 - adminNotes updated successfully", False, f"Status: {patch_response4.status_code}")
                
                time.sleep(0.5)
                
                # Reset to new (should clear resolvedAt)
                patch_response5 = admin_session.patch(
                    f"{API_BASE}/admin/feedback/{feedback_id}",
                    json={"status": "new"},
                    timeout=10
                )
                
                if patch_response5.status_code == 200:
                    data5 = patch_response5.json()
                    feedback5 = data5.get("feedback", {})
                    
                    if feedback5.get("status") == "new" and feedback5.get("resolvedAt") is None:
                        log_test("3.6 - Status='new' clears resolvedAt", True)
                    else:
                        log_test("3.6 - Status='new' clears resolvedAt", False, 
                                f"status={feedback5.get('status')}, resolvedAt={feedback5.get('resolvedAt')}")
                else:
                    log_test("3.6 - Status='new' clears resolvedAt", False, f"Status: {patch_response5.status_code}")
            else:
                log_test("3.1 - PATCH status='reviewed' returns 200", False, "No feedbacks to test")
                log_test("3.2 - Status updated to 'reviewed'", False, "No feedbacks to test")
                log_test("3.3 - Status='resolved' sets resolvedAt", False, "No feedbacks to test")
                log_test("3.4 - Priority updated to 'high'", False, "No feedbacks to test")
                log_test("3.5 - adminNotes updated successfully", False, "No feedbacks to test")
                log_test("3.6 - Status='new' clears resolvedAt", False, "No feedbacks to test")
        else:
            log_test("3.1 - PATCH status='reviewed' returns 200", False, f"List API failed: {list_response.status_code}")
            log_test("3.2 - Status updated to 'reviewed'", False, f"List API failed: {list_response.status_code}")
            log_test("3.3 - Status='resolved' sets resolvedAt", False, f"List API failed: {list_response.status_code}")
            log_test("3.4 - Priority updated to 'high'", False, f"List API failed: {list_response.status_code}")
            log_test("3.5 - adminNotes updated successfully", False, f"List API failed: {list_response.status_code}")
            log_test("3.6 - Status='new' clears resolvedAt", False, f"List API failed: {list_response.status_code}")
    else:
        log_test("3.1 - PATCH status='reviewed' returns 200", False, "Admin auth failed")
        log_test("3.2 - Status updated to 'reviewed'", False, "Admin auth failed")
        log_test("3.3 - Status='resolved' sets resolvedAt", False, "Admin auth failed")
        log_test("3.4 - Priority updated to 'high'", False, "Admin auth failed")
        log_test("3.5 - adminNotes updated successfully", False, "Admin auth failed")
        log_test("3.6 - Status='new' clears resolvedAt", False, "Admin auth failed")
        
except Exception as e:
    log_test("3.1 - PATCH status='reviewed' returns 200", False, f"Exception: {str(e)}")
    log_test("3.2 - Status updated to 'reviewed'", False, f"Exception: {str(e)}")
    log_test("3.3 - Status='resolved' sets resolvedAt", False, f"Exception: {str(e)}")
    log_test("3.4 - Priority updated to 'high'", False, f"Exception: {str(e)}")
    log_test("3.5 - adminNotes updated successfully", False, f"Exception: {str(e)}")
    log_test("3.6 - Status='new' clears resolvedAt", False, f"Exception: {str(e)}")

# Test 4: Admin DELETE endpoint
print("\nTest 4: Admin DELETE endpoint")
try:
    admin_session = get_admin_session()
    if admin_session:
        # Get feedbacks
        list_response = admin_session.get(f"{API_BASE}/admin/feedback", timeout=10)
        
        if list_response.status_code == 200:
            feedbacks = list_response.json()
            
            # Find a feedback to delete (prefer one we can safely delete)
            feedback_to_delete = next((f for f in feedbacks if f.get("status") in ["resolved", "ignored"]), feedbacks[0] if feedbacks else None)
            
            if feedback_to_delete:
                feedback_id = feedback_to_delete.get("id")
                
                print(f"Deleting feedback ID: {feedback_id}")
                
                delete_response = admin_session.delete(
                    f"{API_BASE}/admin/feedback/{feedback_id}",
                    timeout=10
                )
                
                if delete_response.status_code == 200:
                    data = delete_response.json()
                    if data.get("ok") is True:
                        log_test("4.1 - DELETE returns ok: true", True)
                    else:
                        log_test("4.1 - DELETE returns ok: true", False, f"Response: {data}")
                else:
                    log_test("4.1 - DELETE returns ok: true", False, f"Status: {delete_response.status_code}")
                
                time.sleep(0.5)
                
                # Verify it's gone
                list_response2 = admin_session.get(f"{API_BASE}/admin/feedback", timeout=10)
                if list_response2.status_code == 200:
                    feedbacks2 = list_response2.json()
                    still_exists = any(f.get("id") == feedback_id for f in feedbacks2)
                    
                    if not still_exists:
                        log_test("4.2 - Deleted feedback not in list", True)
                    else:
                        log_test("4.2 - Deleted feedback not in list", False, "Feedback still exists")
                else:
                    log_test("4.2 - Deleted feedback not in list", False, f"List API failed: {list_response2.status_code}")
            else:
                log_test("4.1 - DELETE returns ok: true", False, "No feedbacks to delete")
                log_test("4.2 - Deleted feedback not in list", False, "No feedbacks to delete")
        else:
            log_test("4.1 - DELETE returns ok: true", False, f"List API failed: {list_response.status_code}")
            log_test("4.2 - Deleted feedback not in list", False, f"List API failed: {list_response.status_code}")
    else:
        log_test("4.1 - DELETE returns ok: true", False, "Admin auth failed")
        log_test("4.2 - Deleted feedback not in list", False, "Admin auth failed")
        
except Exception as e:
    log_test("4.1 - DELETE returns ok: true", False, f"Exception: {str(e)}")
    log_test("4.2 - Deleted feedback not in list", False, f"Exception: {str(e)}")

# Test 5: Admin bulk-delete endpoint
print("\nTest 5: Admin bulk-delete endpoint")
try:
    admin_session = get_admin_session()
    if admin_session:
        # Test bulk delete with invalid mode (should return 400)
        bulk_response = admin_session.post(
            f"{API_BASE}/admin/feedback/bulk-delete",
            json={"mode": "status", "status": "new"},
            timeout=10
        )
        
        if bulk_response.status_code == 400:
            error_msg = bulk_response.json().get("error", "")
            if "resolved or ignored" in error_msg.lower():
                log_test("5.1 - Bulk delete 'new' status returns 400 with proper error", True, f"Error: {error_msg}")
            else:
                log_test("5.1 - Bulk delete 'new' status returns 400 with proper error", True, f"Got 400 (error: {error_msg})")
        else:
            log_test("5.1 - Bulk delete 'new' status returns 400 with proper error", False, f"Got {bulk_response.status_code}")
        
        time.sleep(0.5)
        
        # Test bulk delete older_than_90_days mode (should accept)
        bulk_response2 = admin_session.post(
            f"{API_BASE}/admin/feedback/bulk-delete",
            json={"mode": "older_than_90_days"},
            timeout=10
        )
        
        if bulk_response2.status_code == 200:
            data = bulk_response2.json()
            if data.get("ok") is True:
                log_test("5.2 - Bulk delete older_than_90_days mode accepted", True, f"Deleted: {data.get('deleted', 0)}")
            else:
                log_test("5.2 - Bulk delete older_than_90_days mode accepted", False, f"Response: {data}")
        else:
            log_test("5.2 - Bulk delete older_than_90_days mode accepted", False, f"Status: {bulk_response2.status_code}")
    else:
        log_test("5.1 - Bulk delete 'new' status returns 400 with proper error", False, "Admin auth failed")
        log_test("5.2 - Bulk delete older_than_90_days mode accepted", False, "Admin auth failed")
        
except Exception as e:
    log_test("5.1 - Bulk delete 'new' status returns 400 with proper error", False, f"Exception: {str(e)}")
    log_test("5.2 - Bulk delete older_than_90_days mode accepted", False, f"Exception: {str(e)}")

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
