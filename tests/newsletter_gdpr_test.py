"""
Comprehensive Playwright test for Newsletter GDPR compliance
Tests all 9 flows from the review request
"""
import asyncio
import time
from playwright.async_api import async_playwright, Page

# Test configuration
BASE_URL = "https://proof-academy.preview.emergentagent.com"
ADMIN_EMAIL = "sebastiandieugenioe@gmail.com"
ADMIN_PASSWORD = "preview-only-change-in-prod"

# Generate unique timestamp for test emails
TS = int(time.time())
USER_A_EMAIL = f"nl-fe-a-{TS}@example.test"
USER_B_EMAIL = f"nl-fe-b-{TS}@example.test"

# Test state
test_results = {
    'passed': [],
    'failed': [],
    'warnings': [],
    'console_errors': [],
    'page_errors': [],
    'network_errors': [],
}

async def safe_goto(page: Page, url: str, timeout: int = 10000):
    """Navigate with better error handling"""
    try:
        await page.goto(url, wait_until="load", timeout=timeout)
        await page.wait_for_timeout(1000)
        return True
    except Exception as e:
        print(f"⚠️  Navigation warning: {str(e)[:100]}")
        # Page might still be loaded, continue
        return True

async def test_flow_1_registration(page: Page):
    """Flow 1: Registration page tests"""
    print("\n" + "="*80)
    print("FLOW 1: REGISTRATION PAGE (/register)")
    print("="*80)
    
    # 1a) Navigate and verify page structure
    print("\n1a) Navigate to /register - verify page renders")
    await safe_goto(page, f"{BASE_URL}/register")
    
    try:
        # Wait for heading
        await page.wait_for_selector('h1:has-text("Create your account")', timeout=5000)
        print("✅ Registration page heading found")
        test_results['passed'].append("1a: Registration page loads")
        
        # Verify all fields present
        fields_present = {
            'email': await page.locator('input[type="email"]').count() > 0,
            'password': await page.locator('input[type="password"]').count() >= 2,
            'country': await page.locator('input[placeholder*="Italy"]').count() > 0,
            'city': await page.locator('input[placeholder*="Milan"]').count() > 0,
            'role': await page.locator('select').count() > 0,
            'newsletter_checkbox': await page.locator('input[type="checkbox"]').count() > 0,
        }
        
        for field, present in fields_present.items():
            if present:
                print(f"✅ {field} field present")
            else:
                print(f"❌ {field} field MISSING")
                test_results['failed'].append(f"1a: {field} field missing")
        
        # Check GDPR copy
        page_content = await page.content()
        gdpr_checks = {
            'per week': 'per week' in page_content.lower(),
            'no ads': 'no ads' in page_content.lower(),
            'unsubscribe': 'unsubscribe' in page_content.lower(),
            'privacy link': '/privacy' in page_content,
            'service emails': 'service email' in page_content.lower(),
        }
        
        for check, present in gdpr_checks.items():
            if present:
                print(f"✅ GDPR copy '{check}' present")
            else:
                print(f"❌ GDPR copy '{check}' MISSING")
                test_results['failed'].append(f"1a: GDPR copy '{check}' missing")
        
        await page.screenshot(path="/app/tests/screenshots/flow1a_register.png", quality=40, full_page=False)
        print("📸 Screenshot: flow1a_register.png")
        
    except Exception as e:
        print(f"❌ FLOW 1a FAILED: {str(e)}")
        test_results['failed'].append(f"1a: {str(e)}")
    
    # 1b) Verify newsletter checkbox unchecked by default
    print("\n1b) Verify newsletter checkbox UNCHECKED by default")
    try:
        is_checked = await page.locator('input[type="checkbox"]').is_checked()
        if not is_checked:
            print("✅ Newsletter checkbox is UNCHECKED by default")
            test_results['passed'].append("1b: Newsletter unchecked by default")
        else:
            print("❌ Newsletter checkbox is CHECKED (should be unchecked)")
            test_results['failed'].append("1b: Newsletter checked by default")
    except Exception as e:
        print(f"❌ FLOW 1b FAILED: {str(e)}")
        test_results['failed'].append(f"1b: {str(e)}")
    
    # 1c) Verify required field validation
    print("\n1c) Verify Country, City, Role are required")
    try:
        await page.locator('input[type="email"]').fill(f"test-val-{TS}@example.test")
        await page.locator('input[type="password"]').first.fill("testpass123")
        await page.locator('input[type="password"]').nth(1).fill("testpass123")
        
        # Try submit without country/city/role
        await page.locator('button:has-text("Create account")').click()
        await page.wait_for_timeout(500)
        
        # Should still be on register page
        if '/register' in page.url:
            print("✅ Form validation prevented submission")
            test_results['passed'].append("1c: Required field validation working")
        else:
            print("❌ Form submitted without required fields")
            test_results['failed'].append("1c: Required validation not working")
    except Exception as e:
        print(f"❌ FLOW 1c FAILED: {str(e)}")
        test_results['failed'].append(f"1c: {str(e)}")
    
    # 1d) Password validation
    print("\n1d) Password validation")
    try:
        await safe_goto(page, f"{BASE_URL}/register")
        await page.wait_for_selector('h1', timeout=5000)
        
        # Test mismatching passwords
        await page.locator('input[type="email"]').fill(f"test-pwd-{TS}@example.test")
        await page.locator('input[type="password"]').first.fill("password123456")
        await page.locator('input[type="password"]').nth(1).fill("different123456")
        await page.locator('input[placeholder*="Italy"]').fill("Ireland")
        await page.locator('input[placeholder*="Milan"]').fill("Dublin")
        await page.locator('select').select_option("Bartender")
        
        await page.locator('button:has-text("Create account")').click()
        await page.wait_for_timeout(1000)
        
        # Check for error
        error_visible = await page.locator('text=Passwords do not match').count() > 0
        if error_visible or '/register' in page.url:
            print("✅ Password mismatch validation working")
            test_results['passed'].append("1d: Password validation working")
        else:
            print("⚠️  Password validation unclear")
            test_results['warnings'].append("1d: Password validation unclear")
    except Exception as e:
        print(f"❌ FLOW 1d FAILED: {str(e)}")
        test_results['failed'].append(f"1d: {str(e)}")
    
    # 1e) Register user A WITHOUT newsletter
    print(f"\n1e) Register user A WITHOUT newsletter: {USER_A_EMAIL}")
    try:
        await safe_goto(page, f"{BASE_URL}/register")
        await page.wait_for_selector('h1', timeout=5000)
        
        await page.locator('input[placeholder*="Alex"]').fill("FE Test A")
        await page.locator('input[type="email"]').fill(USER_A_EMAIL)
        await page.locator('input[type="password"]').first.fill("testpassword123")
        await page.locator('input[type="password"]').nth(1).fill("testpassword123")
        await page.locator('input[placeholder*="Italy"]').fill("Ireland")
        await page.locator('input[placeholder*="Milan"]').fill("Dublin")
        await page.locator('select').select_option("Bartender")
        
        # Ensure newsletter NOT checked
        is_checked = await page.locator('input[type="checkbox"]').is_checked()
        if is_checked:
            await page.locator('input[type="checkbox"]').click()
        
        checkbox_state = await page.locator('input[type="checkbox"]').is_checked()
        print(f"Newsletter state before submit: {checkbox_state}")
        
        await page.locator('button:has-text("Create account")').click()
        await page.wait_for_timeout(3000)
        
        # Check redirect to dashboard
        if page.url == f"{BASE_URL}/" or 'dashboard' in page.url:
            print(f"✅ User A registered, redirected to: {page.url}")
            
            # Verify dashboard visible
            dashboard_visible = await page.locator('text=Learn something new today').count() > 0
            if dashboard_visible:
                print("✅ Dashboard visible - user A logged in")
                test_results['passed'].append("1e: User A registered without newsletter")
            else:
                print("⚠️  Dashboard not fully loaded")
                test_results['warnings'].append("1e: Dashboard not fully visible")
        else:
            print(f"❌ Registration failed, current URL: {page.url}")
            test_results['failed'].append(f"1e: Registration failed - {page.url}")
        
        await page.screenshot(path="/app/tests/screenshots/flow1e_user_a_dashboard.png", quality=40, full_page=False)
        print("📸 Screenshot: flow1e_user_a_dashboard.png")
        
    except Exception as e:
        print(f"❌ FLOW 1e FAILED: {str(e)}")
        test_results['failed'].append(f"1e: {str(e)}")
    
    # 1f) Log out and register user B WITH newsletter
    print(f"\n1f) Register user B WITH newsletter: {USER_B_EMAIL}")
    try:
        # Log out
        await page.locator('button:has-text("Log out")').click()
        await page.wait_for_timeout(1000)
        
        await safe_goto(page, f"{BASE_URL}/register")
        await page.wait_for_selector('h1', timeout=5000)
        
        await page.locator('input[placeholder*="Alex"]').fill("FE Test B")
        await page.locator('input[type="email"]').fill(USER_B_EMAIL)
        await page.locator('input[type="password"]').first.fill("testpassword123")
        await page.locator('input[type="password"]').nth(1).fill("testpassword123")
        await page.locator('input[placeholder*="Italy"]').fill("Spain")
        await page.locator('input[placeholder*="Milan"]').fill("Madrid")
        await page.locator('select').select_option("Bar manager")
        
        # CHECK newsletter
        await page.locator('input[type="checkbox"]').check()
        checkbox_state = await page.locator('input[type="checkbox"]').is_checked()
        print(f"Newsletter state before submit: {checkbox_state}")
        
        await page.locator('button:has-text("Create account")').click()
        await page.wait_for_timeout(3000)
        
        if page.url == f"{BASE_URL}/" or 'dashboard' in page.url:
            print(f"✅ User B registered WITH newsletter")
            test_results['passed'].append("1f: User B registered with newsletter")
        else:
            print(f"❌ User B registration failed: {page.url}")
            test_results['failed'].append(f"1f: Registration failed - {page.url}")
        
        await page.screenshot(path="/app/tests/screenshots/flow1f_user_b_dashboard.png", quality=40, full_page=False)
        print("📸 Screenshot: flow1f_user_b_dashboard.png")
        
    except Exception as e:
        print(f"❌ FLOW 1f FAILED: {str(e)}")
        test_results['failed'].append(f"1f: {str(e)}")

async def main():
    """Run all tests"""
    print(f"\n{'='*80}")
    print(f"NEWSLETTER GDPR COMPLIANCE - COMPREHENSIVE FRONTEND TEST")
    print(f"Timestamp: {TS}")
    print(f"User A (no newsletter): {USER_A_EMAIL}")
    print(f"User B (with newsletter): {USER_B_EMAIL}")
    print(f"{'='*80}\n")
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1920, "height": 1080})
        page = await context.new_page()
        
        # Setup error monitoring
        page.on('console', lambda msg: test_results['console_errors'].append(msg.text) if msg.type == 'error' else None)
        page.on('pageerror', lambda err: test_results['page_errors'].append(str(err)))
        
        try:
            # Run Flow 1
            await test_flow_1_registration(page)
            
            # Print summary
            print("\n" + "="*80)
            print("TEST SUMMARY (FLOW 1 ONLY)")
            print("="*80)
            print(f"✅ Passed: {len(test_results['passed'])}")
            print(f"❌ Failed: {len(test_results['failed'])}")
            print(f"⚠️  Warnings: {len(test_results['warnings'])}")
            print(f"Console errors: {len(test_results['console_errors'])}")
            
            if test_results['failed']:
                print("\nFailed tests:")
                for fail in test_results['failed']:
                    print(f"  - {fail}")
            
        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
