#!/usr/bin/env python3
"""
Backend regression test for Online Spirits Club - Session 5
Focus: Mandatory email+password authentication flow
"""

import os
import sys
import requests
import json
from uuid import uuid4
from datetime import datetime
from pymongo import MongoClient
from dotenv import load_dotenv

# Load environment variables
load_dotenv('/app/.env')

BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'http://localhost:3000')
API_BASE = f"{BASE_URL}/api"
MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.getenv('DB_NAME', 'your_database_name')

# Test state
test_users = []
test_emails = []
passed = 0
failed = 0

def log(msg):
    print(f"[TEST] {msg}")

def log_pass(msg):
    global passed
    passed += 1
    print(f"✅ PASS: {msg}")

def log_fail(msg):
    global failed
    failed += 1
    print(f"❌ FAIL: {msg}")

def create_legacy_user(email, name="Legacy User", country=None, city=None, role=None, newsletter=False):
    """Insert a legacy email-only user directly into MongoDB (no passwordHash)"""
    try:
        client = MongoClient(MONGO_URL)
        db = client[DB_NAME]
        user_id = str(uuid4())
        user = {
            'id': user_id,
            'email': email,
            'name': name,
            'provider': 'email',
            'authMethod': 'email',
            'verified': True,
            'newsletter': newsletter,
            'newsletterSyncedAt': None,
            'source': 'test',
            'createdAt': datetime.utcnow(),
            'updatedAt': datetime.utcnow(),
        }
        if country:
            user['country'] = country
        if city:
            user['city'] = city
        if role:
            user['role'] = role
        
        db.users.insert_one(user)
        test_users.append(user_id)
        test_emails.append(email)
        log(f"Created legacy user: {email} (id: {user_id})")
        return user_id
    except Exception as e:
        log_fail(f"Failed to create legacy user: {e}")
        return None

def cleanup():
    """Delete all test users and newsletter docs"""
    try:
        client = MongoClient(MONGO_URL)
        db = client[DB_NAME]
        
        # Delete users
        if test_users:
            result = db.users.delete_many({'id': {'$in': test_users}})
            log(f"Deleted {result.deleted_count} test users")
        
        # Delete newsletter docs
        if test_emails:
            result = db.newsletter.delete_many({'email': {'$in': test_emails}})
            log(f"Deleted {result.deleted_count} newsletter docs")
        
        client.close()
    except Exception as e:
        log_fail(f"Cleanup error: {e}")

def test_auth_deprecated():
    """Test 1: POST /api/auth should return 410"""
    log("\n=== TEST 1: Legacy /api/auth deprecation ===")
    
    try:
        # Test with any body
        resp = requests.post(f"{API_BASE}/auth", json={'email': 'test@example.com'}, timeout=10)
        if resp.status_code == 410:
            log_pass("POST /api/auth returns 410 (Gone)")
            data = resp.json()
            if 'error' in data and ('deprecated' in data['error'].lower() or 'register' in data['error'].lower()):
                log_pass("Error message mentions deprecation/register")
            else:
                log_fail(f"Error message unclear: {data.get('error')}")
        else:
            log_fail(f"POST /api/auth returned {resp.status_code}, expected 410. Body: {resp.text}")
    except Exception as e:
        log_fail(f"POST /api/auth test failed: {e}")

def test_register_validation():
    """Test 2: POST /api/register validation"""
    log("\n=== TEST 2: Register endpoint validation ===")
    
    # 2a: Missing password
    try:
        resp = requests.post(f"{API_BASE}/register", json={
            'email': 'test1@example.com',
            'confirmPassword': 'password123',
            'country': 'USA',
            'city': 'New York',
            'role': 'Bartender'
        }, timeout=10)
        if resp.status_code == 400:
            log_pass("Missing password → 400")
        else:
            log_fail(f"Missing password returned {resp.status_code}, expected 400")
    except Exception as e:
        log_fail(f"Missing password test failed: {e}")
    
    # 2b: Password too short
    try:
        resp = requests.post(f"{API_BASE}/register", json={
            'email': 'test2@example.com',
            'password': 'short',
            'confirmPassword': 'short',
            'country': 'USA',
            'city': 'New York',
            'role': 'Bartender'
        }, timeout=10)
        if resp.status_code == 400:
            data = resp.json()
            if 'password' in data.get('error', '').lower() and '8' in data.get('error', ''):
                log_pass("Password < 8 chars → 400 with clear message")
            else:
                log_fail(f"Password < 8 chars → 400 but unclear message: {data.get('error')}")
        else:
            log_fail(f"Password < 8 chars returned {resp.status_code}, expected 400")
    except Exception as e:
        log_fail(f"Password < 8 chars test failed: {e}")
    
    # 2c: Password mismatch
    try:
        resp = requests.post(f"{API_BASE}/register", json={
            'email': 'test3@example.com',
            'password': 'password123',
            'confirmPassword': 'password456',
            'country': 'USA',
            'city': 'New York',
            'role': 'Bartender'
        }, timeout=10)
        if resp.status_code == 400:
            data = resp.json()
            if 'match' in data.get('error', '').lower():
                log_pass("Password mismatch → 400 with clear message")
            else:
                log_fail(f"Password mismatch → 400 but unclear message: {data.get('error')}")
        else:
            log_fail(f"Password mismatch returned {resp.status_code}, expected 400")
    except Exception as e:
        log_fail(f"Password mismatch test failed: {e}")
    
    # 2d: Missing country
    try:
        resp = requests.post(f"{API_BASE}/register", json={
            'email': 'test4@example.com',
            'password': 'password123',
            'confirmPassword': 'password123',
            'city': 'New York',
            'role': 'Bartender'
        }, timeout=10)
        if resp.status_code == 400:
            data = resp.json()
            if 'country' in data.get('error', '').lower():
                log_pass("Missing country → 400 with clear message")
            else:
                log_fail(f"Missing country → 400 but unclear message: {data.get('error')}")
        else:
            log_fail(f"Missing country returned {resp.status_code}, expected 400")
    except Exception as e:
        log_fail(f"Missing country test failed: {e}")
    
    # 2e: Missing city
    try:
        resp = requests.post(f"{API_BASE}/register", json={
            'email': 'test5@example.com',
            'password': 'password123',
            'confirmPassword': 'password123',
            'country': 'USA',
            'role': 'Bartender'
        }, timeout=10)
        if resp.status_code == 400:
            data = resp.json()
            if 'city' in data.get('error', '').lower():
                log_pass("Missing city → 400 with clear message")
            else:
                log_fail(f"Missing city → 400 but unclear message: {data.get('error')}")
        else:
            log_fail(f"Missing city returned {resp.status_code}, expected 400")
    except Exception as e:
        log_fail(f"Missing city test failed: {e}")
    
    # 2f: Missing role
    try:
        resp = requests.post(f"{API_BASE}/register", json={
            'email': 'test6@example.com',
            'password': 'password123',
            'confirmPassword': 'password123',
            'country': 'USA',
            'city': 'New York'
        }, timeout=10)
        if resp.status_code == 400:
            data = resp.json()
            if 'role' in data.get('error', '').lower():
                log_pass("Missing role → 400 with clear message")
            else:
                log_fail(f"Missing role → 400 but unclear message: {data.get('error')}")
        else:
            log_fail(f"Missing role returned {resp.status_code}, expected 400")
    except Exception as e:
        log_fail(f"Missing role test failed: {e}")

def test_register_success():
    """Test 3: POST /api/register successful registration"""
    log("\n=== TEST 3: Register endpoint - successful registration ===")
    
    email = f"newuser-{uuid4()}@example.com"
    test_emails.append(email)
    
    try:
        resp = requests.post(f"{API_BASE}/register", json={
            'email': email,
            'password': 'password123',
            'confirmPassword': 'password123',
            'name': 'Test User',
            'country': 'USA',
            'city': 'New York',
            'role': 'Bartender',
            'newsletter': True
        }, timeout=10)
        
        if resp.status_code == 200:
            log_pass("Valid registration → 200")
            data = resp.json()
            user = data.get('user')
            
            if not user:
                log_fail("Response missing 'user' field")
                return
            
            # Check required fields
            if user.get('id'):
                log_pass("Response contains user.id")
                test_users.append(user['id'])
            else:
                log_fail("Response missing user.id")
            
            if user.get('email') == email:
                log_pass("Response contains correct email")
            else:
                log_fail(f"Email mismatch: {user.get('email')} vs {email}")
            
            if user.get('name') == 'Test User':
                log_pass("Response contains correct name")
            else:
                log_fail(f"Name mismatch: {user.get('name')}")
            
            if user.get('country') == 'USA':
                log_pass("Response contains correct country")
            else:
                log_fail(f"Country mismatch: {user.get('country')}")
            
            if user.get('city') == 'New York':
                log_pass("Response contains correct city")
            else:
                log_fail(f"City mismatch: {user.get('city')}")
            
            if user.get('role') == 'Bartender':
                log_pass("Response contains correct role")
            else:
                log_fail(f"Role mismatch: {user.get('role')}")
            
            if user.get('newsletter') == True:
                log_pass("Response contains correct newsletter opt-in")
            else:
                log_fail(f"Newsletter mismatch: {user.get('newsletter')}")
            
            if user.get('authMethod') == 'password':
                log_pass("authMethod is 'password'")
            else:
                log_fail(f"authMethod mismatch: {user.get('authMethod')}")
            
            if user.get('verified') == True:
                log_pass("verified is true")
            else:
                log_fail(f"verified mismatch: {user.get('verified')}")
            
            # Check forbidden fields
            if 'passwordHash' in user:
                log_fail("Response contains passwordHash (SECURITY ISSUE)")
            else:
                log_pass("Response does NOT contain passwordHash")
            
            if '_id' in user:
                log_fail("Response contains _id (should be sanitized)")
            else:
                log_pass("Response does NOT contain _id")
            
            # Verify newsletter doc was created
            try:
                client = MongoClient(MONGO_URL)
                db = client[DB_NAME]
                newsletter_doc = db.newsletter.find_one({'email': email})
                if newsletter_doc:
                    log_pass("Newsletter doc created in database")
                else:
                    log_fail("Newsletter doc NOT created in database")
                client.close()
            except Exception as e:
                log_fail(f"Failed to verify newsletter doc: {e}")
        else:
            log_fail(f"Valid registration returned {resp.status_code}, expected 200. Body: {resp.text}")
    except Exception as e:
        log_fail(f"Valid registration test failed: {e}")

def test_register_duplicate():
    """Test 4: POST /api/register duplicate email with password"""
    log("\n=== TEST 4: Register endpoint - duplicate email ===")
    
    email = f"duplicate-{uuid4()}@example.com"
    test_emails.append(email)
    
    # First registration
    try:
        resp1 = requests.post(f"{API_BASE}/register", json={
            'email': email,
            'password': 'password123',
            'confirmPassword': 'password123',
            'country': 'USA',
            'city': 'New York',
            'role': 'Bartender'
        }, timeout=10)
        
        if resp1.status_code == 200:
            data = resp1.json()
            test_users.append(data['user']['id'])
            log_pass("First registration successful")
        else:
            log_fail(f"First registration failed: {resp1.status_code}")
            return
    except Exception as e:
        log_fail(f"First registration failed: {e}")
        return
    
    # Second registration (duplicate)
    try:
        resp2 = requests.post(f"{API_BASE}/register", json={
            'email': email,
            'password': 'password456',
            'confirmPassword': 'password456',
            'country': 'Canada',
            'city': 'Toronto',
            'role': 'Bar manager'
        }, timeout=10)
        
        if resp2.status_code == 409:
            log_pass("Duplicate email with password → 409")
            data = resp2.json()
            if 'error' in data and ('exists' in data['error'].lower() or 'log in' in data['error'].lower()):
                log_pass("Error message mentions account exists / log in")
            else:
                log_fail(f"Error message unclear: {data.get('error')}")
        else:
            log_fail(f"Duplicate email returned {resp2.status_code}, expected 409. Body: {resp2.text}")
    except Exception as e:
        log_fail(f"Duplicate email test failed: {e}")

def test_register_legacy_migration():
    """Test 5: POST /api/register with legacy email-only user"""
    log("\n=== TEST 5: Register endpoint - legacy user migration ===")
    
    email = f"legacy-{uuid4()}@example.com"
    test_emails.append(email)
    
    # Create legacy user with existing profile fields
    user_id = create_legacy_user(
        email=email,
        name="Legacy User",
        country="France",
        city="Paris",
        role="Wine enthusiast",
        newsletter=True
    )
    
    if not user_id:
        log_fail("Failed to create legacy user")
        return
    
    # Register with password (migration)
    try:
        resp = requests.post(f"{API_BASE}/register", json={
            'email': email,
            'password': 'newpassword123',
            'confirmPassword': 'newpassword123',
            'country': 'USA',  # Should NOT overwrite existing
            'city': 'New York',  # Should NOT overwrite existing
            'role': 'Bartender',  # Should NOT overwrite existing
            'newsletter': False  # Should NOT overwrite existing
        }, timeout=10)
        
        if resp.status_code == 200:
            log_pass("Legacy user migration → 200")
            data = resp.json()
            user = data.get('user')
            
            if data.get('migrated') == True:
                log_pass("Response contains migrated=true")
            else:
                log_fail(f"Response missing migrated flag or false: {data.get('migrated')}")
            
            # Verify existing fields were NOT overwritten
            if user.get('country') == 'France':
                log_pass("Existing country NOT overwritten")
            else:
                log_fail(f"Country was overwritten: {user.get('country')} (expected France)")
            
            if user.get('city') == 'Paris':
                log_pass("Existing city NOT overwritten")
            else:
                log_fail(f"City was overwritten: {user.get('city')} (expected Paris)")
            
            if user.get('role') == 'Wine enthusiast':
                log_pass("Existing role NOT overwritten")
            else:
                log_fail(f"Role was overwritten: {user.get('role')} (expected Wine enthusiast)")
            
            if user.get('newsletter') == True:
                log_pass("Existing newsletter NOT overwritten")
            else:
                log_fail(f"Newsletter was overwritten: {user.get('newsletter')} (expected True)")
            
            if user.get('authMethod') == 'password':
                log_pass("authMethod updated to 'password'")
            else:
                log_fail(f"authMethod not updated: {user.get('authMethod')}")
            
            if 'passwordHash' in user:
                log_fail("Response contains passwordHash (SECURITY ISSUE)")
            else:
                log_pass("Response does NOT contain passwordHash")
            
            # Verify user can now log in with new password
            try:
                login_resp = requests.post(f"{API_BASE}/login", json={
                    'email': email,
                    'password': 'newpassword123'
                }, timeout=10)
                
                if login_resp.status_code == 200:
                    log_pass("Migrated user can log in with new password")
                else:
                    log_fail(f"Migrated user login failed: {login_resp.status_code}")
            except Exception as e:
                log_fail(f"Migrated user login test failed: {e}")
        else:
            log_fail(f"Legacy user migration returned {resp.status_code}, expected 200. Body: {resp.text}")
    except Exception as e:
        log_fail(f"Legacy user migration test failed: {e}")

def test_login():
    """Test 6: POST /api/login"""
    log("\n=== TEST 6: Login endpoint ===")
    
    email = f"logintest-{uuid4()}@example.com"
    test_emails.append(email)
    password = 'testpassword123'
    
    # Create user first
    try:
        resp = requests.post(f"{API_BASE}/register", json={
            'email': email,
            'password': password,
            'confirmPassword': password,
            'country': 'USA',
            'city': 'New York',
            'role': 'Bartender'
        }, timeout=10)
        
        if resp.status_code == 200:
            data = resp.json()
            test_users.append(data['user']['id'])
            log_pass("Test user created for login tests")
        else:
            log_fail(f"Failed to create test user: {resp.status_code}")
            return
    except Exception as e:
        log_fail(f"Failed to create test user: {e}")
        return
    
    # 6a: Valid credentials
    try:
        resp = requests.post(f"{API_BASE}/login", json={
            'email': email,
            'password': password
        }, timeout=10)
        
        if resp.status_code == 200:
            log_pass("Valid credentials → 200")
            data = resp.json()
            user = data.get('user')
            
            if user and user.get('email') == email:
                log_pass("Response contains correct user")
            else:
                log_fail(f"Response user mismatch: {user}")
            
            if 'passwordHash' in user:
                log_fail("Login response contains passwordHash (SECURITY ISSUE)")
            else:
                log_pass("Login response does NOT contain passwordHash")
        else:
            log_fail(f"Valid login returned {resp.status_code}, expected 200. Body: {resp.text}")
    except Exception as e:
        log_fail(f"Valid login test failed: {e}")
    
    # 6b: Wrong password
    try:
        resp = requests.post(f"{API_BASE}/login", json={
            'email': email,
            'password': 'wrongpassword'
        }, timeout=10)
        
        if resp.status_code == 401:
            log_pass("Wrong password → 401")
        else:
            log_fail(f"Wrong password returned {resp.status_code}, expected 401")
    except Exception as e:
        log_fail(f"Wrong password test failed: {e}")
    
    # 6c: Unknown email
    try:
        resp = requests.post(f"{API_BASE}/login", json={
            'email': f"unknown-{uuid4()}@example.com",
            'password': 'anypassword'
        }, timeout=10)
        
        if resp.status_code == 401:
            log_pass("Unknown email → 401")
        else:
            log_fail(f"Unknown email returned {resp.status_code}, expected 401")
    except Exception as e:
        log_fail(f"Unknown email test failed: {e}")
    
    # 6d: Legacy user without password
    legacy_email = f"legacy-login-{uuid4()}@example.com"
    test_emails.append(legacy_email)
    legacy_id = create_legacy_user(legacy_email)
    
    if legacy_id:
        try:
            resp = requests.post(f"{API_BASE}/login", json={
                'email': legacy_email,
                'password': 'anypassword'
            }, timeout=10)
            
            if resp.status_code == 428:
                log_pass("Legacy user without password → 428")
                data = resp.json()
                
                if data.get('needsPasswordSetup') == True:
                    log_pass("Response contains needsPasswordSetup=true")
                else:
                    log_fail(f"Response missing needsPasswordSetup: {data}")
                
                if data.get('email') == legacy_email:
                    log_pass("Response contains correct email")
                else:
                    log_fail(f"Response email mismatch: {data.get('email')}")
                
                if data.get('userId'):
                    log_pass("Response contains userId")
                else:
                    log_fail("Response missing userId")
            else:
                log_fail(f"Legacy user login returned {resp.status_code}, expected 428. Body: {resp.text}")
        except Exception as e:
            log_fail(f"Legacy user login test failed: {e}")

def test_set_password():
    """Test 7: POST /api/set-password"""
    log("\n=== TEST 7: Set-password endpoint ===")
    
    # 7a: Legacy user setting password
    legacy_email = f"legacy-setpw-{uuid4()}@example.com"
    test_emails.append(legacy_email)
    legacy_id = create_legacy_user(legacy_email)
    
    if legacy_id:
        try:
            resp = requests.post(f"{API_BASE}/set-password", json={
                'email': legacy_email,
                'password': 'newpassword123',
                'confirmPassword': 'newpassword123'
            }, timeout=10)
            
            if resp.status_code == 200:
                log_pass("Legacy user set-password → 200")
                data = resp.json()
                user = data.get('user')
                
                if user and user.get('email') == legacy_email:
                    log_pass("Response contains correct user")
                else:
                    log_fail(f"Response user mismatch: {user}")
                
                if 'passwordHash' in user:
                    log_fail("Set-password response contains passwordHash (SECURITY ISSUE)")
                else:
                    log_pass("Set-password response does NOT contain passwordHash")
                
                # Verify user can now log in
                try:
                    login_resp = requests.post(f"{API_BASE}/login", json={
                        'email': legacy_email,
                        'password': 'newpassword123'
                    }, timeout=10)
                    
                    if login_resp.status_code == 200:
                        log_pass("User can log in after set-password")
                    else:
                        log_fail(f"Login after set-password failed: {login_resp.status_code}")
                except Exception as e:
                    log_fail(f"Login after set-password test failed: {e}")
            else:
                log_fail(f"Legacy user set-password returned {resp.status_code}, expected 200. Body: {resp.text}")
        except Exception as e:
            log_fail(f"Legacy user set-password test failed: {e}")
    
    # 7b: User with existing password
    email_with_pw = f"haspw-{uuid4()}@example.com"
    test_emails.append(email_with_pw)
    
    try:
        # Create user with password
        resp = requests.post(f"{API_BASE}/register", json={
            'email': email_with_pw,
            'password': 'password123',
            'confirmPassword': 'password123',
            'country': 'USA',
            'city': 'New York',
            'role': 'Bartender'
        }, timeout=10)
        
        if resp.status_code == 200:
            data = resp.json()
            test_users.append(data['user']['id'])
            
            # Try to set password again
            resp2 = requests.post(f"{API_BASE}/set-password", json={
                'email': email_with_pw,
                'password': 'newpassword456',
                'confirmPassword': 'newpassword456'
            }, timeout=10)
            
            if resp2.status_code == 409:
                log_pass("User with existing password → 409")
                data2 = resp2.json()
                if 'error' in data2 and ('already' in data2['error'].lower() or 'log in' in data2['error'].lower()):
                    log_pass("Error message mentions already has password / log in")
                else:
                    log_fail(f"Error message unclear: {data2.get('error')}")
            else:
                log_fail(f"User with existing password returned {resp2.status_code}, expected 409")
        else:
            log_fail(f"Failed to create user with password: {resp.status_code}")
    except Exception as e:
        log_fail(f"User with existing password test failed: {e}")
    
    # 7c: Password validation
    legacy_email2 = f"legacy-setpw2-{uuid4()}@example.com"
    test_emails.append(legacy_email2)
    legacy_id2 = create_legacy_user(legacy_email2)
    
    if legacy_id2:
        # Password too short
        try:
            resp = requests.post(f"{API_BASE}/set-password", json={
                'email': legacy_email2,
                'password': 'short',
                'confirmPassword': 'short'
            }, timeout=10)
            
            if resp.status_code == 400:
                log_pass("Password < 8 chars → 400")
            else:
                log_fail(f"Password < 8 chars returned {resp.status_code}, expected 400")
        except Exception as e:
            log_fail(f"Password < 8 chars test failed: {e}")
        
        # Password mismatch
        try:
            resp = requests.post(f"{API_BASE}/set-password", json={
                'email': legacy_email2,
                'password': 'password123',
                'confirmPassword': 'password456'
            }, timeout=10)
            
            if resp.status_code == 400:
                log_pass("Password mismatch → 400")
            else:
                log_fail(f"Password mismatch returned {resp.status_code}, expected 400")
        except Exception as e:
            log_fail(f"Password mismatch test failed: {e}")

def test_sanitization():
    """Test 8: Verify passwordHash is never in responses"""
    log("\n=== TEST 8: Universal sanitization check ===")
    
    email = f"sanitize-{uuid4()}@example.com"
    test_emails.append(email)
    
    # Register
    try:
        resp = requests.post(f"{API_BASE}/register", json={
            'email': email,
            'password': 'password123',
            'confirmPassword': 'password123',
            'country': 'USA',
            'city': 'New York',
            'role': 'Bartender'
        }, timeout=10)
        
        if resp.status_code == 200:
            data = resp.json()
            user = data.get('user')
            test_users.append(user['id'])
            
            if 'passwordHash' not in user:
                log_pass("POST /api/register response does NOT contain passwordHash")
            else:
                log_fail("POST /api/register response contains passwordHash (SECURITY ISSUE)")
        else:
            log_fail(f"Register failed: {resp.status_code}")
            return
    except Exception as e:
        log_fail(f"Register test failed: {e}")
        return
    
    # Login
    try:
        resp = requests.post(f"{API_BASE}/login", json={
            'email': email,
            'password': 'password123'
        }, timeout=10)
        
        if resp.status_code == 200:
            data = resp.json()
            user = data.get('user')
            
            if 'passwordHash' not in user:
                log_pass("POST /api/login response does NOT contain passwordHash")
            else:
                log_fail("POST /api/login response contains passwordHash (SECURITY ISSUE)")
        else:
            log_fail(f"Login failed: {resp.status_code}")
    except Exception as e:
        log_fail(f"Login test failed: {e}")
    
    # GET /api/me (if implemented)
    try:
        resp = requests.get(f"{API_BASE}/me?userId={test_users[-1]}", timeout=10)
        
        if resp.status_code == 200:
            data = resp.json()
            user = data.get('user')
            
            if user:
                if 'passwordHash' not in user:
                    log_pass("GET /api/me response does NOT contain passwordHash")
                else:
                    log_fail("GET /api/me response contains passwordHash (SECURITY ISSUE)")
        else:
            log(f"GET /api/me returned {resp.status_code} (may not be implemented)")
    except Exception as e:
        log(f"GET /api/me test skipped: {e}")

def main():
    print("=" * 80)
    print("BACKEND REGRESSION TEST - SESSION 5")
    print("Focus: Mandatory email+password authentication flow")
    print("=" * 80)
    
    try:
        # Run all tests
        test_auth_deprecated()
        test_register_validation()
        test_register_success()
        test_register_duplicate()
        test_register_legacy_migration()
        test_login()
        test_set_password()
        test_sanitization()
        
    finally:
        # Cleanup
        log("\n=== CLEANUP ===")
        cleanup()
        
        # Summary
        print("\n" + "=" * 80)
        print(f"TEST SUMMARY: {passed} passed, {failed} failed")
        print("=" * 80)
        
        if failed > 0:
            sys.exit(1)
        else:
            print("\n✅ ALL TESTS PASSED")
            sys.exit(0)

if __name__ == '__main__':
    main()
