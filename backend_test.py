#!/usr/bin/env python3
"""
Backend regression test for POST /api/admin/seed-legal-pages endpoint.
Tests the new bulk-seed endpoint for legal pages (privacy, terms, cookies, contact, data-rights, about).
"""

import requests
import sys
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('/app/.env')

BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://proof-academy.preview.emergentagent.com')
API_BASE = f"{BASE_URL}/api"

# Admin credentials from test_credentials.md
ADMIN_EMAIL = "sebastiandieugenioe@gmail.com"
ADMIN_PASSWORD = "preview-only-change-in-prod"

# Expected legal page slugs
EXPECTED_SLUGS = ['privacy', 'terms', 'cookies', 'contact', 'data-rights', 'about']

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

def print_info(message):
    """Print an info message."""
    print(f"ℹ️  INFO: {message}")

def validate_response_shape(data, force_expected):
    """Validate the response shape from seed-legal-pages endpoint."""
    errors = []
    
    # Check top-level fields
    if not isinstance(data.get('ok'), bool):
        errors.append(f"'ok' should be boolean, got {type(data.get('ok'))}")
    if not isinstance(data.get('force'), bool):
        errors.append(f"'force' should be boolean, got {type(data.get('force'))}")
    if data.get('force') != force_expected:
        errors.append(f"'force' should be {force_expected}, got {data.get('force')}")
    
    # Check summary object
    summary = data.get('summary', {})
    if not isinstance(summary, dict):
        errors.append(f"'summary' should be dict, got {type(summary)}")
    else:
        for key in ['created', 'updatedMetadata', 'updatedContent', 'preserved']:
            if not isinstance(summary.get(key), int):
                errors.append(f"summary.{key} should be int, got {type(summary.get(key))}")
    
    # Check results array
    results = data.get('results', [])
    if not isinstance(results, list):
        errors.append(f"'results' should be list, got {type(results)}")
    else:
        for i, item in enumerate(results):
            if not isinstance(item.get('slug'), str):
                errors.append(f"results[{i}].slug should be string, got {type(item.get('slug'))}")
            if not isinstance(item.get('action'), str):
                errors.append(f"results[{i}].action should be string, got {type(item.get('action'))}")
            if 'published' in item and not isinstance(item.get('published'), bool):
                errors.append(f"results[{i}].published should be boolean when present, got {type(item.get('published'))}")
    
    return errors

def main():
    """Run the comprehensive backend test suite."""
    session = requests.Session()
    test_results = {
        'total': 9,
        'passed': 0,
        'failed': 0,
        'details': []
    }
    
    privacy_page_id = None  # Will store the privacy page ID for later tests
    
    try:
        # =====================================================================
        # STEP 1: Auth guard - POST without cookie should return 401
        # =====================================================================
        print_step(1, "Auth guard - POST without admin cookie")
        
        try:
            resp = requests.post(f"{API_BASE}/admin/seed-legal-pages", json={})
            print_info(f"Status: {resp.status_code}")
            
            if resp.status_code == 401:
                data = resp.json()
                if 'error' in data and 'Admin authentication required' in data['error']:
                    print_pass("Auth guard working - 401 with correct error message")
                    test_results['passed'] += 1
                    test_results['details'].append("Step 1: PASS - Auth guard working")
                else:
                    print_fail("Got 401 but error message incorrect", data)
                    test_results['failed'] += 1
                    test_results['details'].append(f"Step 1: FAIL - Wrong error message: {data}")
            else:
                print_fail(f"Expected 401, got {resp.status_code}", resp.text[:200])
                test_results['failed'] += 1
                test_results['details'].append(f"Step 1: FAIL - Expected 401, got {resp.status_code}")
        except Exception as e:
            print_fail(f"Exception during auth guard test: {e}")
            test_results['failed'] += 1
            test_results['details'].append(f"Step 1: FAIL - Exception: {e}")
        
        # =====================================================================
        # STEP 2: Login as admin
        # =====================================================================
        print_step(2, "Login as admin")
        
        try:
            resp = session.post(f"{API_BASE}/admin-auth", json={
                'email': ADMIN_EMAIL,
                'password': ADMIN_PASSWORD
            })
            print_info(f"Status: {resp.status_code}")
            
            if resp.status_code == 200:
                data = resp.json()
                if data.get('ok'):
                    # Check for osc_admin cookie
                    if 'osc_admin' in session.cookies:
                        print_pass("Admin login successful, osc_admin cookie captured")
                        test_results['passed'] += 1
                        test_results['details'].append("Step 2: PASS - Admin login successful")
                    else:
                        print_fail("Login returned 200 but no osc_admin cookie set")
                        test_results['failed'] += 1
                        test_results['details'].append("Step 2: FAIL - No cookie set")
                else:
                    print_fail("Login returned 200 but ok=false", data)
                    test_results['failed'] += 1
                    test_results['details'].append(f"Step 2: FAIL - ok=false: {data}")
            else:
                print_fail(f"Login failed with status {resp.status_code}", resp.text[:200])
                test_results['failed'] += 1
                test_results['details'].append(f"Step 2: FAIL - Status {resp.status_code}")
                return  # Can't continue without login
        except Exception as e:
            print_fail(f"Exception during login: {e}")
            test_results['failed'] += 1
            test_results['details'].append(f"Step 2: FAIL - Exception: {e}")
            return
        
        # =====================================================================
        # STEP 3: Baseline - Check current pages
        # =====================================================================
        print_step(3, "Baseline - Check current list of pages")
        
        try:
            resp = session.get(f"{API_BASE}/admin/pages")
            print_info(f"Status: {resp.status_code}")
            
            if resp.status_code == 200:
                pages = resp.json()  # Returns array directly
                existing_slugs = [p['slug'] for p in pages if p['slug'] in EXPECTED_SLUGS]
                print_info(f"Found {len(pages)} total pages, {len(existing_slugs)} legal pages already exist: {existing_slugs}")
                print_pass(f"Baseline check complete - {len(existing_slugs)} legal pages exist")
                test_results['passed'] += 1
                test_results['details'].append(f"Step 3: PASS - Baseline: {len(existing_slugs)} legal pages exist")
            else:
                print_fail(f"Failed to get admin pages, status {resp.status_code}", resp.text[:200])
                test_results['failed'] += 1
                test_results['details'].append(f"Step 3: FAIL - Status {resp.status_code}")
        except Exception as e:
            print_fail(f"Exception during baseline check: {e}")
            test_results['failed'] += 1
            test_results['details'].append(f"Step 3: FAIL - Exception: {e}")
        
        # =====================================================================
        # STEP 4: First run (no force)
        # =====================================================================
        print_step(4, "First run - POST with force=false")
        
        try:
            resp = session.post(f"{API_BASE}/admin/seed-legal-pages", json={'force': False})
            print_info(f"Status: {resp.status_code}")
            
            if resp.status_code == 200:
                data = resp.json()
                print_info(f"Response: {data}")
                
                # Validate response shape
                shape_errors = validate_response_shape(data, force_expected=False)
                if shape_errors:
                    print_fail("Response shape validation failed", shape_errors)
                    test_results['failed'] += 1
                    test_results['details'].append(f"Step 4: FAIL - Shape errors: {shape_errors}")
                else:
                    # Check results
                    results = data.get('results', [])
                    result_slugs = [r['slug'] for r in results]
                    
                    # Verify all 6 slugs present
                    if set(result_slugs) == set(EXPECTED_SLUGS):
                        print_pass(f"All 6 expected slugs present: {result_slugs}")
                        
                        # Verify summary counts add up to 6
                        summary = data.get('summary', {})
                        total = summary.get('created', 0) + summary.get('updatedMetadata', 0) + summary.get('updatedContent', 0) + summary.get('preserved', 0)
                        
                        if total == 6:
                            print_pass(f"Summary counts add up to 6: created={summary.get('created')}, updatedMetadata={summary.get('updatedMetadata')}, updatedContent={summary.get('updatedContent')}, preserved={summary.get('preserved')}")
                            
                            # Now verify all pages are accessible
                            all_accessible = True
                            for slug in EXPECTED_SLUGS:
                                page_resp = session.get(f"{API_BASE}/pages/{slug}")
                                if page_resp.status_code != 200:
                                    print_fail(f"Page /{slug} not accessible (status {page_resp.status_code})")
                                    all_accessible = False
                                else:
                                    page_data = page_resp.json()
                                    if not page_data.get('published'):
                                        print_fail(f"Page /{slug} exists but published={page_data.get('published')}")
                                        all_accessible = False
                            
                            if all_accessible:
                                print_pass("All 6 pages accessible via GET /api/pages/{slug} with published=true")
                                test_results['passed'] += 1
                                test_results['details'].append(f"Step 4: PASS - All 6 pages seeded and accessible")
                            else:
                                test_results['failed'] += 1
                                test_results['details'].append("Step 4: FAIL - Some pages not accessible")
                        else:
                            print_fail(f"Summary counts don't add up to 6, got {total}")
                            test_results['failed'] += 1
                            test_results['details'].append(f"Step 4: FAIL - Summary total={total}, expected 6")
                    else:
                        print_fail(f"Expected slugs {EXPECTED_SLUGS}, got {result_slugs}")
                        test_results['failed'] += 1
                        test_results['details'].append(f"Step 4: FAIL - Wrong slugs: {result_slugs}")
            else:
                print_fail(f"Expected 200, got {resp.status_code}", resp.text[:200])
                test_results['failed'] += 1
                test_results['details'].append(f"Step 4: FAIL - Status {resp.status_code}")
        except Exception as e:
            print_fail(f"Exception during first run: {e}")
            test_results['failed'] += 1
            test_results['details'].append(f"Step 4: FAIL - Exception: {e}")
        
        # =====================================================================
        # STEP 5: Idempotency - Re-run with force=false
        # =====================================================================
        print_step(5, "Idempotency - Re-run with force=false")
        
        try:
            resp = session.post(f"{API_BASE}/admin/seed-legal-pages", json={'force': False})
            print_info(f"Status: {resp.status_code}")
            
            if resp.status_code == 200:
                data = resp.json()
                print_info(f"Response: {data}")
                
                summary = data.get('summary', {})
                if summary.get('created') == 0:
                    print_pass("No new pages created (created=0)")
                    
                    # Check for duplicates
                    resp_pages = session.get(f"{API_BASE}/admin/pages")
                    if resp_pages.status_code == 200:
                        pages = resp_pages.json()  # Returns array directly
                        slug_counts = {}
                        for p in pages:
                            if p['slug'] in EXPECTED_SLUGS:
                                slug_counts[p['slug']] = slug_counts.get(p['slug'], 0) + 1
                        
                        duplicates = [slug for slug, count in slug_counts.items() if count > 1]
                        if not duplicates:
                            print_pass("No duplicate slugs found")
                            test_results['passed'] += 1
                            test_results['details'].append("Step 5: PASS - Idempotency verified, no duplicates")
                        else:
                            print_fail(f"Found duplicate slugs: {duplicates}")
                            test_results['failed'] += 1
                            test_results['details'].append(f"Step 5: FAIL - Duplicates: {duplicates}")
                    else:
                        print_fail(f"Failed to get pages for duplicate check, status {resp_pages.status_code}")
                        test_results['failed'] += 1
                        test_results['details'].append(f"Step 5: FAIL - Can't check duplicates")
                else:
                    print_fail(f"Expected created=0, got {summary.get('created')}")
                    test_results['failed'] += 1
                    test_results['details'].append(f"Step 5: FAIL - created={summary.get('created')}, expected 0")
            else:
                print_fail(f"Expected 200, got {resp.status_code}", resp.text[:200])
                test_results['failed'] += 1
                test_results['details'].append(f"Step 5: FAIL - Status {resp.status_code}")
        except Exception as e:
            print_fail(f"Exception during idempotency test: {e}")
            test_results['failed'] += 1
            test_results['details'].append(f"Step 5: FAIL - Exception: {e}")
        
        # =====================================================================
        # STEP 6: Preserve user edits (default behaviour)
        # =====================================================================
        print_step(6, "Preserve user edits - PATCH privacy page, then seed with force=false")
        
        try:
            # First, get the privacy page ID
            resp_pages = session.get(f"{API_BASE}/admin/pages")
            if resp_pages.status_code == 200:
                pages = resp_pages.json()  # Returns array directly
                privacy_page = next((p for p in pages if p['slug'] == 'privacy'), None)
                
                if privacy_page:
                    privacy_page_id = privacy_page['id']
                    print_info(f"Found privacy page with id={privacy_page_id}")
                    
                    # PATCH the privacy page with custom content and published=false
                    custom_content = '<h2>User edit — do not overwrite</h2><p>Manual body.</p>'
                    patch_resp = session.patch(f"{API_BASE}/admin/pages/{privacy_page_id}", json={
                        'contentHtml': custom_content,
                        'published': False
                    })
                    
                    if patch_resp.status_code == 200:
                        print_pass("Privacy page patched with custom content and published=false")
                        
                        # Verify public endpoint returns 404 (unpublished)
                        public_resp = session.get(f"{API_BASE}/pages/privacy")
                        if public_resp.status_code == 404:
                            print_pass("GET /api/pages/privacy returns 404 (unpublished)")
                        else:
                            print_fail(f"Expected 404 for unpublished page, got {public_resp.status_code}")
                        
                        # Verify admin endpoint shows custom content
                        admin_resp = session.get(f"{API_BASE}/admin/pages/{privacy_page_id}")
                        if admin_resp.status_code == 200:
                            admin_data = admin_resp.json()
                            if 'User edit' in admin_data.get('contentHtml', ''):
                                print_pass("Admin endpoint shows custom content with 'User edit'")
                                
                                # Now seed with force=false
                                seed_resp = session.post(f"{API_BASE}/admin/seed-legal-pages", json={'force': False})
                                if seed_resp.status_code == 200:
                                    seed_data = seed_resp.json()
                                    print_info(f"Seed response: {seed_data}")
                                    
                                    # Check privacy result
                                    privacy_result = next((r for r in seed_data.get('results', []) if r['slug'] == 'privacy'), None)
                                    if privacy_result:
                                        action = privacy_result.get('action')
                                        if action in ['preserved', 'updated-metadata']:
                                            print_pass(f"Privacy page action='{action}' (not 'updated-content' or 'created')")
                                            
                                            # Verify content still contains "User edit"
                                            verify_resp = session.get(f"{API_BASE}/admin/pages/{privacy_page_id}")
                                            if verify_resp.status_code == 200:
                                                verify_data = verify_resp.json()
                                                if 'User edit — do not overwrite' in verify_data.get('contentHtml', ''):
                                                    print_pass("Content still contains 'User edit — do not overwrite'")
                                                    
                                                    if verify_data.get('published') == False:
                                                        print_pass("published still false")
                                                        test_results['passed'] += 1
                                                        test_results['details'].append("Step 6: PASS - User edits preserved")
                                                    else:
                                                        print_fail(f"published should be false, got {verify_data.get('published')}")
                                                        test_results['failed'] += 1
                                                        test_results['details'].append("Step 6: FAIL - published changed")
                                                else:
                                                    print_fail("Content no longer contains 'User edit — do not overwrite'")
                                                    test_results['failed'] += 1
                                                    test_results['details'].append("Step 6: FAIL - Content overwritten")
                                            else:
                                                print_fail(f"Failed to verify content, status {verify_resp.status_code}")
                                                test_results['failed'] += 1
                                                test_results['details'].append("Step 6: FAIL - Can't verify")
                                        else:
                                            print_fail(f"Expected action 'preserved' or 'updated-metadata', got '{action}'")
                                            test_results['failed'] += 1
                                            test_results['details'].append(f"Step 6: FAIL - Wrong action: {action}")
                                    else:
                                        print_fail("Privacy page not in results")
                                        test_results['failed'] += 1
                                        test_results['details'].append("Step 6: FAIL - Privacy not in results")
                                else:
                                    print_fail(f"Seed failed with status {seed_resp.status_code}")
                                    test_results['failed'] += 1
                                    test_results['details'].append(f"Step 6: FAIL - Seed status {seed_resp.status_code}")
                            else:
                                print_fail("Admin endpoint doesn't show custom content")
                                test_results['failed'] += 1
                                test_results['details'].append("Step 6: FAIL - Custom content not saved")
                        else:
                            print_fail(f"Failed to get admin page, status {admin_resp.status_code}")
                            test_results['failed'] += 1
                            test_results['details'].append(f"Step 6: FAIL - Admin get failed")
                    else:
                        print_fail(f"PATCH failed with status {patch_resp.status_code}", patch_resp.text[:200])
                        test_results['failed'] += 1
                        test_results['details'].append(f"Step 6: FAIL - PATCH failed")
                else:
                    print_fail("Privacy page not found")
                    test_results['failed'] += 1
                    test_results['details'].append("Step 6: FAIL - Privacy page not found")
            else:
                print_fail(f"Failed to get pages, status {resp_pages.status_code}")
                test_results['failed'] += 1
                test_results['details'].append(f"Step 6: FAIL - Can't get pages")
        except Exception as e:
            print_fail(f"Exception during preserve user edits test: {e}")
            test_results['failed'] += 1
            test_results['details'].append(f"Step 6: FAIL - Exception: {e}")
        
        # =====================================================================
        # STEP 7: Force overwrite (still preserves published state)
        # =====================================================================
        print_step(7, "Force overwrite - POST with force=true")
        
        try:
            if privacy_page_id:
                # Seed with force=true
                resp = session.post(f"{API_BASE}/admin/seed-legal-pages", json={'force': True})
                print_info(f"Status: {resp.status_code}")
                
                if resp.status_code == 200:
                    data = resp.json()
                    print_info(f"Response: {data}")
                    
                    # Verify force=true in response
                    if data.get('force') == True:
                        print_pass("Response has force=true")
                        
                        # Check privacy result
                        privacy_result = next((r for r in data.get('results', []) if r['slug'] == 'privacy'), None)
                        if privacy_result and privacy_result.get('action') == 'updated-content':
                            print_pass("Privacy page action='updated-content'")
                            
                            # Verify content no longer contains "User edit"
                            verify_resp = session.get(f"{API_BASE}/admin/pages/{privacy_page_id}")
                            if verify_resp.status_code == 200:
                                verify_data = verify_resp.json()
                                if 'User edit — do not overwrite' not in verify_data.get('contentHtml', ''):
                                    print_pass("Content no longer contains 'User edit — do not overwrite' (overwritten)")
                                    
                                    if verify_data.get('published') == False:
                                        print_pass("published still false (preserved)")
                                        
                                        # Verify public endpoint still returns 404
                                        public_resp = session.get(f"{API_BASE}/pages/privacy")
                                        if public_resp.status_code == 404:
                                            print_pass("GET /api/pages/privacy still returns 404 (still unpublished)")
                                            test_results['passed'] += 1
                                            test_results['details'].append("Step 7: PASS - Force overwrite working, published state preserved")
                                        else:
                                            print_fail(f"Expected 404, got {public_resp.status_code}")
                                            test_results['failed'] += 1
                                            test_results['details'].append(f"Step 7: FAIL - Public endpoint status {public_resp.status_code}")
                                    else:
                                        print_fail(f"published should still be false, got {verify_data.get('published')}")
                                        test_results['failed'] += 1
                                        test_results['details'].append("Step 7: FAIL - published changed")
                                else:
                                    print_fail("Content still contains 'User edit — do not overwrite' (not overwritten)")
                                    test_results['failed'] += 1
                                    test_results['details'].append("Step 7: FAIL - Content not overwritten")
                            else:
                                print_fail(f"Failed to verify content, status {verify_resp.status_code}")
                                test_results['failed'] += 1
                                test_results['details'].append(f"Step 7: FAIL - Verify failed")
                        else:
                            print_fail(f"Expected action='updated-content', got {privacy_result}")
                            test_results['failed'] += 1
                            test_results['details'].append(f"Step 7: FAIL - Wrong action")
                    else:
                        print_fail(f"Expected force=true, got {data.get('force')}")
                        test_results['failed'] += 1
                        test_results['details'].append(f"Step 7: FAIL - force={data.get('force')}")
                else:
                    print_fail(f"Expected 200, got {resp.status_code}", resp.text[:200])
                    test_results['failed'] += 1
                    test_results['details'].append(f"Step 7: FAIL - Status {resp.status_code}")
            else:
                print_fail("No privacy_page_id from previous step")
                test_results['failed'] += 1
                test_results['details'].append("Step 7: FAIL - No privacy_page_id")
        except Exception as e:
            print_fail(f"Exception during force overwrite test: {e}")
            test_results['failed'] += 1
            test_results['details'].append(f"Step 7: FAIL - Exception: {e}")
        
        # =====================================================================
        # STEP 8: Restore state for the user
        # =====================================================================
        print_step(8, "Restore state - Set privacy published=true and verify SSR")
        
        try:
            if privacy_page_id:
                # PATCH privacy to set published=true
                patch_resp = session.patch(f"{API_BASE}/admin/pages/{privacy_page_id}", json={
                    'published': True
                })
                
                if patch_resp.status_code == 200:
                    print_pass("Privacy page set to published=true")
                    
                    # Verify GET /api/pages/privacy returns 200
                    api_resp = session.get(f"{API_BASE}/pages/privacy")
                    if api_resp.status_code == 200:
                        print_pass("GET /api/pages/privacy returns 200")
                        
                        # Verify SSR GET /privacy returns 200 with correct title
                        ssr_resp = session.get(f"{BASE_URL}/privacy")
                        if ssr_resp.status_code == 200:
                            html = ssr_resp.text
                            if '<title>' in html and 'Privacy Policy' in html:
                                print_pass("GET /privacy (SSR) returns 200 with <title> containing 'Privacy Policy'")
                                
                                # Spot-check other SSR pages
                                other_slugs = ['terms', 'cookies', 'contact', 'data-rights', 'about']
                                all_ok = True
                                for slug in other_slugs:
                                    import time
                                    time.sleep(0.5)  # Small delay to avoid overwhelming the server
                                    check_resp = session.get(f"{BASE_URL}/{slug}")
                                    if check_resp.status_code != 200:
                                        print_fail(f"SSR GET /{slug} returned {check_resp.status_code}")
                                        all_ok = False
                                
                                if all_ok:
                                    print_pass("All 6 SSR pages return 200")
                                    test_results['passed'] += 1
                                    test_results['details'].append("Step 8: PASS - State restored, all SSR pages working")
                                else:
                                    test_results['failed'] += 1
                                    test_results['details'].append("Step 8: FAIL - Some SSR pages failed")
                            else:
                                print_fail("SSR page doesn't contain expected title")
                                test_results['failed'] += 1
                                test_results['details'].append("Step 8: FAIL - SSR title missing")
                        else:
                            print_fail(f"SSR GET /privacy returned {ssr_resp.status_code}")
                            test_results['failed'] += 1
                            test_results['details'].append(f"Step 8: FAIL - SSR status {ssr_resp.status_code}")
                    else:
                        print_fail(f"GET /api/pages/privacy returned {api_resp.status_code}")
                        test_results['failed'] += 1
                        test_results['details'].append(f"Step 8: FAIL - API status {api_resp.status_code}")
                else:
                    print_fail(f"PATCH failed with status {patch_resp.status_code}")
                    test_results['failed'] += 1
                    test_results['details'].append(f"Step 8: FAIL - PATCH failed")
            else:
                print_fail("No privacy_page_id from previous step")
                test_results['failed'] += 1
                test_results['details'].append("Step 8: FAIL - No privacy_page_id")
        except Exception as e:
            print_fail(f"Exception during restore state test: {e}")
            test_results['failed'] += 1
            test_results['details'].append(f"Step 8: FAIL - Exception: {e}")
        
        # =====================================================================
        # STEP 9: Response shape validation (already done in step 4, but verify again)
        # =====================================================================
        print_step(9, "Response shape validation - Verify all POST calls return correct shape")
        
        try:
            # Do one final call to verify shape
            resp = session.post(f"{API_BASE}/admin/seed-legal-pages", json={'force': False})
            if resp.status_code == 200:
                data = resp.json()
                shape_errors = validate_response_shape(data, force_expected=False)
                
                if not shape_errors:
                    print_pass("Response shape validation passed")
                    print_info(f"  - ok: {type(data.get('ok')).__name__} = {data.get('ok')}")
                    print_info(f"  - force: {type(data.get('force')).__name__} = {data.get('force')}")
                    print_info(f"  - summary: {data.get('summary')}")
                    print_info(f"  - results: {len(data.get('results', []))} items")
                    test_results['passed'] += 1
                    test_results['details'].append("Step 9: PASS - Response shape valid")
                else:
                    print_fail("Response shape validation failed", shape_errors)
                    test_results['failed'] += 1
                    test_results['details'].append(f"Step 9: FAIL - Shape errors: {shape_errors}")
            else:
                print_fail(f"Final call failed with status {resp.status_code}")
                test_results['failed'] += 1
                test_results['details'].append(f"Step 9: FAIL - Status {resp.status_code}")
        except Exception as e:
            print_fail(f"Exception during response shape validation: {e}")
            test_results['failed'] += 1
            test_results['details'].append(f"Step 9: FAIL - Exception: {e}")
        
    except Exception as e:
        print(f"\n❌ CRITICAL ERROR: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    finally:
        # Print summary
        print("\n" + "="*80)
        print("TEST SUMMARY")
        print("="*80)
        print(f"Total tests: {test_results['total']}")
        print(f"Passed: {test_results['passed']}")
        print(f"Failed: {test_results['failed']}")
        print(f"Success rate: {test_results['passed']}/{test_results['total']} ({100*test_results['passed']//test_results['total']}%)")
        print("\nDetails:")
        for detail in test_results['details']:
            print(f"  {detail}")
        
        if test_results['failed'] > 0:
            print("\n❌ SOME TESTS FAILED")
            return 1
        else:
            print("\n✅ ALL TESTS PASSED")
            return 0

if __name__ == '__main__':
    sys.exit(main())
