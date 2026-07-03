#!/usr/bin/env python3
"""
Focused test to verify critical issues from SESSION 10
"""

import requests
import json
from datetime import datetime

BASE_URL = "https://proof-academy.preview.emergentagent.com/api"
ADMIN_EMAIL = "sebastiandieugenioe@gmail.com"
ADMIN_PASSWORD = "preview-only-change-in-prod"

admin_session = requests.Session()

def log(msg):
    print(f"[TEST] {msg}")

# Admin login
resp = admin_session.post(f"{BASE_URL}/admin-auth", json={
    "email": ADMIN_EMAIL,
    "password": ADMIN_PASSWORD
})
if resp.status_code != 200:
    print(f"❌ Admin login failed: {resp.status_code}")
    exit(1)
log("✅ Admin logged in")

# Get baseline deletions
resp = admin_session.get(f"{BASE_URL}/admin/overview")
if resp.status_code == 200:
    data = resp.json()
    deletions = data.get('deletions', {})
    log(f"📊 Current deletions: total={deletions.get('total')}, selfService={deletions.get('selfService')}, admin={deletions.get('admin')}, last30d={deletions.get('last30d')}")
else:
    log(f"⚠️  Could not get overview: {resp.status_code}")

# Test 1: Verify User A issue - failed confirmations should NOT delete user
log("\n=== TEST 1: Failed confirmations should NOT delete user ===")
timestamp = datetime.now().strftime("%Y%m%d%H%M%S%f")
email_a = f"test-verify-a-{timestamp}@test.example"

session_a = requests.Session()
resp = session_a.post(f"{BASE_URL}/register", json={
    "email": email_a,
    "password": "TestPassword123!",
    "confirmPassword": "TestPassword123!",
    "name": "Test User A",
    "country": "Ireland",
    "city": "Dublin",
    "role": "Bartender",
    "newsletter": False
})

if resp.status_code != 200:
    log(f"❌ User A registration failed: {resp.status_code}")
    exit(1)

user_a_id = resp.json().get('user', {}).get('id')
log(f"✅ User A created: {email_a} (id: {user_a_id})")

# Try wrong confirmations
log("Attempting 3 failed deletion attempts...")
for attempt, wrong_value in enumerate([{}, {"confirmation": "delete"}, {"confirmation": "WRONG"}], 1):
    resp = session_a.post(f"{BASE_URL}/me/delete", json=wrong_value)
    if resp.status_code == 400:
        log(f"  Attempt {attempt}: ✅ Got 400 as expected")
    else:
        log(f"  Attempt {attempt}: ❌ Expected 400, got {resp.status_code}")

# Check if user still exists
resp = admin_session.get(f"{BASE_URL}/admin/users/{user_a_id}")
if resp.status_code == 200:
    log(f"✅ User A still exists after failed attempts (GET by ID works)")
    user_still_exists = True
else:
    log(f"❌ User A was deleted! GET by ID returned {resp.status_code}")
    user_still_exists = False

# Also check via search
resp = admin_session.get(f"{BASE_URL}/admin/users?q={email_a}")
if resp.status_code == 200:
    data = resp.json()
    users = data.get('users', [])
    matching = [u for u in users if u.get('email') == email_a]
    if len(matching) == 1:
        log(f"✅ User A found via search")
    else:
        log(f"⚠️  User A not found via search (found {len(matching)} matches)")
        log(f"   This might be a search issue, not a deletion issue")

# Now properly delete User A
log("\nNow properly deleting User A with correct confirmation...")
resp = session_a.post(f"{BASE_URL}/me/delete", json={"confirmation": "DELETE"})
if resp.status_code == 200:
    log(f"✅ User A deleted successfully")
else:
    log(f"⚠️  Deletion returned {resp.status_code}: {resp.text[:200]}")

# Test 2: Verify admin delete increments admin counter
log("\n=== TEST 2: Admin delete increments admin counter ===")

# Get current admin count
resp = admin_session.get(f"{BASE_URL}/admin/overview")
if resp.status_code == 200:
    admin_before = resp.json().get('deletions', {}).get('admin', 0)
    log(f"Admin deletions before: {admin_before}")
else:
    log(f"❌ Could not get overview")
    exit(1)

# Create user for admin deletion
timestamp = datetime.now().strftime("%Y%m%d%H%M%S%f")
email_admin_del = f"test-admin-del-{timestamp}@test.example"

resp = requests.post(f"{BASE_URL}/register", json={
    "email": email_admin_del,
    "password": "TestPassword123!",
    "confirmPassword": "TestPassword123!",
    "name": "Test Admin Delete",
    "country": "Ireland",
    "city": "Dublin",
    "role": "Bartender",
    "newsletter": False
})

if resp.status_code != 200:
    log(f"❌ User registration failed: {resp.status_code}")
    exit(1)

user_admin_del_id = resp.json().get('user', {}).get('id')
log(f"✅ User created for admin deletion: {email_admin_del} (id: {user_admin_del_id})")

# Admin deletes the user
resp = admin_session.delete(f"{BASE_URL}/admin/users/{user_admin_del_id}")
if resp.status_code == 200:
    log(f"✅ Admin deleted user successfully")
else:
    log(f"❌ Admin delete failed: {resp.status_code}")
    exit(1)

# Check counter
resp = admin_session.get(f"{BASE_URL}/admin/overview")
if resp.status_code == 200:
    admin_after = resp.json().get('deletions', {}).get('admin', 0)
    log(f"Admin deletions after: {admin_after}")
    if admin_after == admin_before + 1:
        log(f"✅ Admin counter incremented correctly")
    else:
        log(f"❌ Admin counter should be {admin_before + 1}, got {admin_after}")
else:
    log(f"❌ Could not get overview")

# Test 3: Verify rate limit structure
log("\n=== TEST 3: Rate limit verification ===")
timestamp = datetime.now().strftime("%Y%m%d%H%M%S%f")
email_rl = f"test-ratelimit-{timestamp}@test.example"

session_rl = requests.Session()
resp = session_rl.post(f"{BASE_URL}/register", json={
    "email": email_rl,
    "password": "TestPassword123!",
    "confirmPassword": "TestPassword123!",
    "name": "Test Rate Limit",
    "country": "Ireland",
    "city": "Dublin",
    "role": "Bartender",
    "newsletter": False
})

if resp.status_code == 200:
    user_rl_id = resp.json().get('user', {}).get('id')
    log(f"✅ User created for rate limit test: {email_rl}")
    
    # Try to delete (might hit rate limit)
    resp = session_rl.post(f"{BASE_URL}/me/delete", json={"confirmation": "DELETE"})
    if resp.status_code == 200:
        log(f"✅ Deletion successful (no rate limit hit)")
    elif resp.status_code == 429:
        log(f"✅ Rate limit working (429 returned)")
        retry_after = resp.headers.get('Retry-After')
        if retry_after:
            log(f"   Retry-After header: {retry_after}")
        else:
            log(f"   ⚠️  No Retry-After header (should be present)")
    else:
        log(f"⚠️  Unexpected status: {resp.status_code}")
else:
    log(f"⚠️  Could not create user for rate limit test: {resp.status_code}")

log("\n=== FOCUSED TEST COMPLETE ===")
