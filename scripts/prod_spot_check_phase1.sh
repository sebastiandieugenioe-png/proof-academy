#!/usr/bin/env bash
# Phase 1 Production spot-check for Online Spirits Club.
#
# What it verifies (public paths only \u2014 no admin auth needed):
#   1. Middleware sets osc_vid + osc_sid on plain page load.
#   2. Middleware sets osc_ft + osc_lt when UTM params are present.
#   3. First-touch NEVER overwrites; last-touch always overwrites.
#   4. /api/tracking/ingest 200 with cookies, safe without.
#   5. Middleware skips /api routes (no cookies set on API calls).
#   6. /api/health responds.
#
# Usage:
#   BASE=https://onlinespiritsclub.com bash prod_spot_check_phase1.sh
#
# Non-destructive. No login. No user creation. Runs in ~5 seconds.
set -euo pipefail

BASE="${BASE:-https://onlinespiritsclub.com}"
JAR="$(mktemp)"
PASS=0
FAIL=0

pass() { echo "  \u2713 $1"; PASS=$((PASS + 1)); }
fail() { echo "  \u2717 $1"; FAIL=$((FAIL + 1)); }

cookie_value() {
  # Cookie jar lines may be prefixed with "#HttpOnly_" on the domain column.
  # awk field layout is: domain flag path secure expiry name value
  awk -v n="$1" '$0 !~ /^# / && NF >= 7 && $6 == n { print $7 }' "$JAR"
}

echo ""
echo "Phase 1 Production spot-check against: $BASE"
echo "\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500"

# 1. Health endpoint responds
echo ""
echo "[1] /api/health responds"
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/health")
[ "$CODE" = "200" ] && pass "/api/health returned 200" || fail "/api/health returned $CODE"

# 2. Middleware sets visitor/session cookies on plain home load
echo ""
echo "[2] Middleware sets osc_vid + osc_sid on plain home load"
: > "$JAR"
curl -s -c "$JAR" -o /dev/null "$BASE/"
VID=$(cookie_value osc_vid)
SID=$(cookie_value osc_sid)
[ -n "$VID" ] && pass "osc_vid set: ${VID:0:8}..." || fail "osc_vid NOT set on home load"
[ -n "$SID" ] && pass "osc_sid set: ${SID:0:8}..." || fail "osc_sid NOT set on home load"

# 3. Middleware sets attribution cookies on UTM landing
echo ""
echo "[3] Middleware sets osc_ft + osc_lt when UTMs are present"
: > "$JAR"
curl -s -c "$JAR" -o /dev/null "$BASE/?utm_source=spotcheck&utm_medium=curl&utm_campaign=prod-verify&utm_content=first"
FT=$(cookie_value osc_ft)
LT=$(cookie_value osc_lt)
[ -n "$FT" ] && pass "osc_ft set: ${FT:0:16}..." || fail "osc_ft NOT set on UTM landing"
[ -n "$LT" ] && pass "osc_lt set: ${LT:0:16}..." || fail "osc_lt NOT set on UTM landing"

# 4. First-touch never overwrites; last-touch always overwrites
echo ""
echo "[4] First-touch immutable, last-touch mutable"
FT_BEFORE="$FT"
curl -s -b "$JAR" -c "$JAR" -o /dev/null "$BASE/?utm_source=spotcheck2&utm_medium=curl&utm_campaign=prod-verify-2"
FT_AFTER=$(cookie_value osc_ft)
LT_AFTER=$(cookie_value osc_lt)
[ "$FT_BEFORE" = "$FT_AFTER" ] && pass "osc_ft preserved across 2nd UTM visit" || fail "osc_ft WAS OVERWRITTEN \u2014 first-touch rule broken"
[ "$LT_AFTER" != "$FT_BEFORE" ] && pass "osc_lt updated on 2nd UTM visit" || fail "osc_lt did NOT change on 2nd UTM visit"

# 5. Middleware does NOT set cookies on /api routes
echo ""
echo "[5] Middleware skips /api routes"
: > "$JAR"
curl -s -c "$JAR" -o /dev/null "$BASE/api/health?utm_source=should-not-track"
[ -z "$(cookie_value osc_vid)" ] && pass "no osc_vid on /api call" || fail "middleware ran on /api and set osc_vid"
[ -z "$(cookie_value osc_ft)" ] && pass "no osc_ft on /api call" || fail "middleware ran on /api and set osc_ft"

# 6. Ingest beacon responds 200 with and without cookies
echo ""
echo "[6] /api/tracking/ingest responds"
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" \
  -d '{"url":"/","referrer":null}' "$BASE/api/tracking/ingest")
[ "$CODE" = "200" ] && pass "beacon returns 200 without cookies" || fail "beacon returned $CODE without cookies"

: > "$JAR"
curl -s -c "$JAR" -o /dev/null "$BASE/?utm_source=beacon-check&utm_medium=curl&utm_campaign=beacon-check"
CODE=$(curl -s -b "$JAR" -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" \
  -d '{"url":"/","referrer":null}' "$BASE/api/tracking/ingest")
[ "$CODE" = "200" ] && pass "beacon returns 200 with cookies" || fail "beacon returned $CODE with cookies"

# 7. Attribution cookies survive across mixed-request browsing
echo ""
echo "[7] Cookies survive across pages"
: > "$JAR"
curl -s -c "$JAR" -o /dev/null "$BASE/?utm_source=persist&utm_medium=test&utm_campaign=persist"
VID1=$(cookie_value osc_vid)
curl -s -b "$JAR" -c "$JAR" -o /dev/null "$BASE/learn/alcohol-fundamentals"
VID2=$(cookie_value osc_vid)
[ -n "$VID1" ] && [ "$VID1" = "$VID2" ] && pass "osc_vid stable across pages" || fail "osc_vid changed between pages"

# 8. /go/[slug] behaviour on an unknown slug (should 302 home, not 500)
echo ""
echo "[8] /go/[unknown-slug] safely redirects home"
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/go/definitely-not-a-real-slug-$(date +%s)")
[ "$CODE" = "302" ] || [ "$CODE" = "307" ] && pass "unknown /go slug returned $CODE (redirect)" || fail "unknown /go slug returned $CODE"

# ---- Summary ------------------------------------------------------------
echo ""
echo "\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500"
echo "Passed: $PASS   Failed: $FAIL"
[ "$FAIL" -eq 0 ] && echo "\u2713 Production Phase 1 attribution looks healthy." || echo "\u2717 Some checks failed. Inspect above."
rm -f "$JAR"
exit "$FAIL"
