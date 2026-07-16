#!/bin/sh
# Recovers the v0.8.1 multi-platform release after the GitHub/Blacksmith
# incident: waits for the API to answer, re-dispatches the release workflow,
# then watches the public releases page until all three platform assets exist.
set -u

REPO="N9RecordsTechnologiesIL/StashTrack"
TAG="v0.8.1"
API="https://api.github.com/repos/$REPO"
TOKEN=$(printf 'protocol=https\nhost=github.com\n\n' | git credential fill 2>/dev/null | sed -n 's/^password=//p')
AUTH="Authorization: Bearer $TOKEN"

# Phase 1: wait for the API to be reachable + healthy (up to ~40 min).
for i in $(seq 1 40); do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 25 -H "$AUTH" "$API" 2>/dev/null)
  echo "phase1 try $i: repo API HTTP $CODE"
  [ "$CODE" = "200" ] && break
  sleep 60
done

[ "$CODE" = "200" ] || { echo "GAVE_UP_WAITING_FOR_API"; exit 1; }

# Phase 2: show what happened to the original tag run (for the record).
curl -s --max-time 30 -H "$AUTH" "$API/actions/runs?per_page=8" -o /h/code/11Tools/VSReacT/recover-runs.json 2>/dev/null
echo "--- recent runs ---"
grep -oE '"name": "(CI|Release)"|"event": "[a-z_]+"|"status": "[a-z_]+"|"conclusion": "[a-z_]+"' /h/code/11Tools/VSReacT/recover-runs.json | paste -d' ' - - - - 2>/dev/null | head -n 8

# Phase 3: re-dispatch the release build for the tag (idempotent uploads).
DCODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 30 -X POST -H "$AUTH" \
  -H "Accept: application/vnd.github+json" \
  "$API/actions/workflows/release.yml/dispatches" \
  -d "{\"ref\":\"main\",\"inputs\":{\"tag\":\"$TAG\"}}" 2>/dev/null)
echo "phase3 dispatch: HTTP $DCODE"

# Phase 4: poll the PUBLIC releases page (avoids API pressure) for assets.
sleep 300
for i in $(seq 1 30); do
  ASSETS=$(curl -sL --max-time 30 "https://github.com/$REPO/releases/expanded_assets/$TAG" 2>/dev/null | grep -oE 'StashTrack[A-Za-z0-9.v-]*(Setup\.exe|macOS\.pkg|linux-x86_64\.tar\.gz)' | sort -u | tr '\n' ' ')
  KINDS=$(echo "$ASSETS" | grep -oE "Setup.exe|macOS.pkg|linux-x86_64" | sort -u | wc -l)
  echo "phase4 poll $i (kinds=$KINDS): $ASSETS"
  [ "$KINDS" -ge 3 ] && { echo "ALL_PLATFORMS_PRESENT"; exit 0; }
  sleep 120
done

echo "TIMED_OUT_WAITING_FOR_ASSETS"
exit 1
