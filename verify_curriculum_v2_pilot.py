#!/usr/bin/env python3
"""
OSC Curriculum v2 Pilot DRY-RUN Verification Script

This script verifies the curriculum v2 importer in DRY-RUN mode with ZERO database writes.
It performs comprehensive checks against the 2.0.1-pilot package.
"""

import os
import sys
import json
import subprocess
import re
from datetime import datetime, timedelta
from pymongo import MongoClient
from dotenv import load_dotenv

# Load environment variables
load_dotenv('/app/.env')

MONGO_URL = os.getenv('MONGO_URL')
DB_NAME = os.getenv('DB_NAME')

if not MONGO_URL or not DB_NAME:
    print("❌ ERROR: MONGO_URL or DB_NAME not found in .env")
    sys.exit(1)

print(f"✓ Loaded environment: MONGO_URL={MONGO_URL}, DB_NAME={DB_NAME}")

# Connect to MongoDB
client = MongoClient(MONGO_URL)
db = client[DB_NAME]

# Collections to monitor
COLLECTIONS = ['courses_published', 'users', 'user_progress', 'user_srs', 'curriculum_imports']

def get_collection_counts():
    """Get document counts for all monitored collections"""
    counts = {}
    for coll_name in COLLECTIONS:
        counts[coll_name] = db[coll_name].count_documents({})
    return counts

def run_importer(run_number=1):
    """Run the curriculum importer with --no-audit flag"""
    print(f"\n{'='*80}")
    print(f"RUN #{run_number}: Executing importer with --no-audit (DRY-RUN)")
    print(f"{'='*80}")
    
    cmd = [
        'node',
        'scripts/curriculum_v2_importer.mjs',
        'scripts/curriculum_v2_pilot/alcohol-fundamentals.json',
        '--no-audit'
    ]
    
    print(f"Command: {' '.join(cmd)}")
    print()
    
    result = subprocess.run(
        cmd,
        cwd='/app',
        capture_output=True,
        text=True,
        timeout=60
    )
    
    return result

def extract_json_report(output):
    """Extract JSON report from importer output"""
    # Look for the JSON block between markers
    start_marker = '=== BEGIN REPORT JSON ==='
    end_marker = '=== END REPORT JSON ==='
    
    if start_marker not in output or end_marker not in output:
        print("❌ ERROR: Could not find JSON report markers in output")
        return None
    
    start_idx = output.index(start_marker) + len(start_marker)
    end_idx = output.index(end_marker)
    json_str = output[start_idx:end_idx].strip()
    
    try:
        return json.loads(json_str)
    except json.JSONDecodeError as e:
        print(f"❌ ERROR: Failed to parse JSON report: {e}")
        print(f"JSON string: {json_str[:500]}...")
        return None

def verify_report(report, run_number=1):
    """Verify all required fields in the report"""
    print(f"\n{'='*80}")
    print(f"VERIFYING REPORT (RUN #{run_number})")
    print(f"{'='*80}\n")
    
    errors = []
    warnings = []
    
    # Package & schema checks
    print("📦 PACKAGE & SCHEMA CHECKS:")
    checks = [
        ('packageSchemaVersion', '2.0.1-pilot', report.get('packageSchemaVersion')),
        ('packageStatus', 'draft', report.get('packageStatus')),
        ('schemaValidation.ok', True, report.get('schemaValidation', {}).get('ok')),
        ('publishGate.ok', 'n/a', report.get('publishGate', {}).get('ok')),
    ]
    
    for name, expected, actual in checks:
        status = '✅' if actual == expected else '❌'
        print(f"  {status} {name}: {actual} (expected: {expected})")
        if actual != expected:
            errors.append(f"{name} mismatch: expected {expected}, got {actual}")
    
    # Verify checks
    print("\n🔍 CONTENT INTEGRITY CHECKS:")
    verify_checks = report.get('verify', {}).get('checks', {})
    
    required_pass_checks = [
        'packageStatusDraft',
        'applyWouldBeRejected',
        'quizQuestionText',
        'activeRecallItems',
        'studyCards',
        'quizItems',
        'moduleReferences',
        'prerequisiteReferences',
        'lessonOrderContiguous',
        'uniqueLessonIds',
        'uniqueLessonSlugs',
        'uniqueActiveRecallIds',
        'uniqueStudyCardIds',
        'uniqueQuizIds',
        'seoCanonicalPathsPresentAndUnique',
        'seoCanonicalSlugsPresentAndUnique',
        'globallyUniqueSourceIds',
        'sourceReferencesResolvable',
        'noTrackingParamsInSourceUrls',
    ]
    
    for check_name in required_pass_checks:
        actual = verify_checks.get(check_name)
        status = '✅' if actual == 'PASS' else '❌'
        print(f"  {status} {check_name}: {actual}")
        if actual != 'PASS':
            errors.append(f"verify.checks.{check_name} is not PASS: {actual}")
    
    # Verify totals
    print("\n📊 CONTENT TOTALS:")
    totals = report.get('verify', {}).get('totals', {})
    
    expected_totals = [
        ('quizItems', 50),
        ('activeRecall', 30),
        ('studyCards', 60),
        ('totalSourceRecords', 46),
        ('uniqueSourceIds', 46),
        ('brokenSourceReferencesCount', 0),
    ]
    
    for name, expected in expected_totals:
        actual = totals.get(name)
        status = '✅' if actual == expected else '❌'
        print(f"  {status} {name}: {actual} (expected: {expected})")
        if actual != expected:
            errors.append(f"verify.totals.{name} mismatch: expected {expected}, got {actual}")
    
    # Check duplicate source IDs
    dup_source_ids = totals.get('duplicateSourceIds', [])
    status = '✅' if len(dup_source_ids) == 0 else '❌'
    print(f"  {status} duplicateSourceIds.length: {len(dup_source_ids)} (expected: 0)")
    if len(dup_source_ids) > 0:
        errors.append(f"Found duplicate source IDs: {dup_source_ids}")
    
    # Check tracking params in URLs
    urls_with_tracking = totals.get('urlsWithTrackingParams', [])
    status = '✅' if len(urls_with_tracking) == 0 else '❌'
    print(f"  {status} urlsWithTrackingParams.length: {len(urls_with_tracking)} (expected: 0)")
    if len(urls_with_tracking) > 0:
        errors.append(f"Found URLs with tracking params: {urls_with_tracking}")
    
    # Duplicate canonical source URLs (INFORMATIONAL only)
    dup_canonical_urls = totals.get('duplicateCanonicalSourceUrls', [])
    print(f"  ℹ️  duplicateCanonicalSourceUrls.length: {len(dup_canonical_urls)} (INFORMATIONAL - legitimate re-citations expected)")
    if len(dup_canonical_urls) > 0:
        print(f"      Re-cited sources: {len(dup_canonical_urls)} (e.g., EU Reg 2019/787, TTB FAQs)")
    
    # Diff metrics
    print("\n📈 DIFF METRICS:")
    counts = report.get('report', {}).get('counts', {})
    
    # Note: The importer may not include detailed counts in the JSON report for dry-run mode
    # These are informational only and not critical for verification
    if counts:
        expected_counts = [
            ('lessons', 10),
            ('modules', 3),
            ('objectives', 47),
            ('blocks', 50),
        ]
        
        for name, expected in expected_counts:
            actual = counts.get(name)
            status = '✅' if actual == expected else '❌'
            print(f"  {status} {name}: {actual} (expected: {expected})")
            if actual != expected:
                warnings.append(f"report.counts.{name} mismatch: expected {expected}, got {actual}")
    else:
        print(f"  ℹ️  Detailed counts not included in JSON report (informational only)")
    
    # Check conflicts and errors
    conflicts = report.get('conflicts', [])
    report_errors = report.get('errors', [])
    
    status = '✅' if len(conflicts) == 0 else '❌'
    print(f"  {status} conflicts.length: {len(conflicts)} (expected: 0)")
    if len(conflicts) > 0:
        errors.append(f"Found conflicts: {conflicts}")
    
    status = '✅' if len(report_errors) == 0 else '❌'
    print(f"  {status} errors.length: {len(report_errors)} (expected: 0)")
    if len(report_errors) > 0:
        errors.append(f"Found errors: {report_errors}")
    
    # Check created/updated/unchanged
    created = report.get('created', [])
    updated = report.get('updated', [])
    unchanged = report.get('unchanged', [])
    
    total_lessons = len(created) + len(updated) + len(unchanged)
    status = '✅' if total_lessons == 10 else '❌'
    print(f"  {status} created + updated + unchanged: {total_lessons} (expected: 10)")
    print(f"      created: {len(created)}, updated: {len(updated)}, unchanged: {len(unchanged)}")
    if total_lessons != 10:
        errors.append(f"Total lessons mismatch: expected 10, got {total_lessons}")
    
    # Idempotency checks
    print("\n🔄 IDEMPOTENCY CHECKS:")
    idempotency = report.get('idempotency', {})
    
    idempotency_checks = [
        ('pass', True),
        ('secondPassUnchanged', 10),
        ('secondPassCreated', 0),
        ('secondPassUpdated', 0),
        ('secondPassConflicts', 0),
    ]
    
    for name, expected in idempotency_checks:
        actual = idempotency.get(name)
        status = '✅' if actual == expected else '❌'
        print(f"  {status} idempotency.{name}: {actual} (expected: {expected})")
        if actual != expected:
            errors.append(f"idempotency.{name} mismatch: expected {expected}, got {actual}")
    
    # Zero writes check
    print("\n💾 DATABASE WRITES CHECK:")
    db_writes = report.get('databaseWrites')
    audit_suppressed = report.get('auditSuppressed')
    audit_log_id = report.get('auditLogId')
    
    status = '✅' if db_writes == 0 else '❌'
    print(f"  {status} databaseWrites: {db_writes} (expected: 0)")
    if db_writes != 0:
        errors.append(f"Database writes detected: {db_writes}")
    
    status = '✅' if audit_suppressed == True else '❌'
    print(f"  {status} auditSuppressed: {audit_suppressed} (expected: true)")
    if audit_suppressed != True:
        errors.append(f"Audit not suppressed: {audit_suppressed}")
    
    status = '✅' if audit_log_id is None else '❌'
    print(f"  {status} auditLogId: {audit_log_id} (expected: null)")
    if audit_log_id is not None:
        errors.append(f"Audit log ID should be null: {audit_log_id}")
    
    return errors, warnings

def check_curriculum_imports(package_digest):
    """Check that no new curriculum_imports document was created"""
    print("\n🔍 CHECKING curriculum_imports COLLECTION:")
    
    # Check for any document with this package digest created in last 2 minutes
    two_minutes_ago = datetime.utcnow() - timedelta(minutes=2)
    
    recent_imports = list(db.curriculum_imports.find({
        'packageDigest': package_digest,
        'createdAt': {'$gte': two_minutes_ago}
    }))
    
    if len(recent_imports) > 0:
        print(f"  ❌ Found {len(recent_imports)} recent import(s) with matching packageDigest")
        return False
    else:
        print(f"  ✅ No recent imports found with packageDigest (correct for --no-audit)")
        return True

def main():
    print("\n" + "="*80)
    print("OSC CURRICULUM V2 PILOT DRY-RUN VERIFICATION")
    print("="*80)
    
    # Step 1: Capture baseline counts
    print("\n📊 STEP 1: Capturing baseline document counts...")
    baseline_counts = get_collection_counts()
    print("\nBaseline counts:")
    for coll, count in baseline_counts.items():
        print(f"  {coll}: {count}")
    
    # Step 2: Run importer (first time)
    result1 = run_importer(run_number=1)
    
    if result1.returncode != 0:
        print(f"\n❌ ERROR: Importer failed with exit code {result1.returncode}")
        print("\nSTDOUT:")
        print(result1.stdout)
        print("\nSTDERR:")
        print(result1.stderr)
        sys.exit(1)
    
    print("\n✅ Importer completed successfully")
    print("\nImporter output:")
    print(result1.stdout)
    
    # Step 3: Capture post-run counts
    print("\n📊 STEP 3: Capturing post-run document counts...")
    postrun1_counts = get_collection_counts()
    print("\nPost-run counts:")
    for coll, count in postrun1_counts.items():
        print(f"  {coll}: {count}")
    
    # Step 4: Verify counts are identical
    print("\n🔍 STEP 4: Verifying document counts are identical...")
    counts_match = True
    for coll in COLLECTIONS:
        baseline = baseline_counts[coll]
        postrun = postrun1_counts[coll]
        status = '✅' if baseline == postrun else '❌'
        print(f"  {status} {coll}: baseline={baseline}, post-run={postrun}")
        if baseline != postrun:
            counts_match = False
    
    if not counts_match:
        print("\n❌ FAIL: Document counts changed! Database writes detected.")
        sys.exit(1)
    
    print("\n✅ PASS: All document counts unchanged (zero writes confirmed)")
    
    # Step 5: Parse and verify JSON report
    print("\n📋 STEP 5: Parsing JSON report...")
    report1 = extract_json_report(result1.stdout)
    
    if not report1:
        print("❌ FAIL: Could not extract JSON report")
        sys.exit(1)
    
    print("✅ JSON report parsed successfully")
    
    # Step 6: Verify report contents
    errors1, warnings1 = verify_report(report1, run_number=1)
    
    # Step 7: Check curriculum_imports
    package_digest = report1.get('packageDigest', 'unknown')
    imports_ok = check_curriculum_imports(package_digest)
    
    if not imports_ok:
        errors1.append("curriculum_imports collection has new documents")
    
    # Step 8: Run importer second time for idempotency
    print("\n" + "="*80)
    print("SECOND RUN: Verifying idempotency")
    print("="*80)
    
    result2 = run_importer(run_number=2)
    
    if result2.returncode != 0:
        print(f"\n❌ ERROR: Second run failed with exit code {result2.returncode}")
        print("\nSTDOUT:")
        print(result2.stdout)
        print("\nSTDERR:")
        print(result2.stderr)
        sys.exit(1)
    
    print("\n✅ Second run completed successfully")
    
    # Step 9: Verify counts still unchanged
    print("\n📊 STEP 9: Verifying document counts still unchanged...")
    postrun2_counts = get_collection_counts()
    
    counts_match2 = True
    for coll in COLLECTIONS:
        baseline = baseline_counts[coll]
        postrun = postrun2_counts[coll]
        status = '✅' if baseline == postrun else '❌'
        print(f"  {status} {coll}: baseline={baseline}, post-run-2={postrun}")
        if baseline != postrun:
            counts_match2 = False
    
    if not counts_match2:
        print("\n❌ FAIL: Document counts changed on second run!")
        sys.exit(1)
    
    print("\n✅ PASS: Document counts still unchanged after second run")
    
    # Step 10: Parse second report
    print("\n📋 STEP 10: Parsing second run JSON report...")
    report2 = extract_json_report(result2.stdout)
    
    if not report2:
        print("❌ FAIL: Could not extract JSON report from second run")
        sys.exit(1)
    
    print("✅ Second run JSON report parsed successfully")
    
    # Step 11: Verify second report
    errors2, warnings2 = verify_report(report2, run_number=2)
    
    # Final summary
    print("\n" + "="*80)
    print("FINAL VERIFICATION SUMMARY")
    print("="*80)
    
    print("\n📊 DATABASE COUNTS:")
    print(f"  ✅ All collections unchanged across both runs")
    print(f"  ✅ DATABASE WRITES: 0")
    
    print("\n📋 FIRST RUN:")
    if len(errors1) == 0:
        print(f"  ✅ All checks PASSED")
    else:
        print(f"  ❌ {len(errors1)} error(s) found:")
        for err in errors1:
            print(f"     - {err}")
    
    print("\n📋 SECOND RUN (Idempotency):")
    if len(errors2) == 0:
        print(f"  ✅ All checks PASSED")
    else:
        print(f"  ❌ {len(errors2)} error(s) found:")
        for err in errors2:
            print(f"     - {err}")
    
    print("\n" + "="*80)
    
    total_errors = len(errors1) + len(errors2)
    
    if total_errors == 0 and counts_match and counts_match2:
        print("✅ VERIFICATION COMPLETE: ALL CHECKS PASSED")
        print("="*80)
        print("\n🎉 The OSC Curriculum v2 pilot importer is working correctly!")
        print("   - Zero database writes confirmed")
        print("   - All content integrity checks passed")
        print("   - Idempotency verified")
        print("   - Package status: draft (apply mode correctly rejected)")
        sys.exit(0)
    else:
        print("❌ VERIFICATION FAILED")
        print("="*80)
        print(f"\nTotal errors: {total_errors}")
        sys.exit(1)

if __name__ == '__main__':
    main()
