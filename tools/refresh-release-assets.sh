#!/bin/sh
# Replaces the v0.7 release's installer assets with the freshly built one.
set -eu

REPO="N9RecordsTechnologiesIL/StashTrack"
TAG="v0.7"
INSTALLER="/h/code/11Tools/VSReacT/StashTrack/dist/StashTrackv0.7Setup.exe"
API="https://api.github.com/repos/$REPO"

TOKEN=$(printf 'protocol=https\nhost=github.com\n\n' | git credential fill 2>/dev/null | sed -n 's/^password=//p')
[ -n "$TOKEN" ] || { echo "no token"; exit 1; }
AUTH="Authorization: Bearer $TOKEN"
ACCEPT="Accept: application/vnd.github+json"

RELEASE_JSON=$(curl -sf -H "$AUTH" -H "$ACCEPT" "$API/releases/tags/$TAG")
UPLOAD_URL=$(printf '%s' "$RELEASE_JSON" | sed -n 's/.*"upload_url": *"\([^"{]*\).*/\1/p' | head -n1)

# Delete the existing assets (ids are unambiguous in each asset's url field).
printf '%s' "$RELEASE_JSON" | sed -n 's/.*"url": "https:[^"]*\/releases\/assets\/\([0-9]*\)".*/\1/p' | while read -r ASSET_ID; do
  echo "deleting asset id $ASSET_ID"
  curl -sf -X DELETE -H "$AUTH" "$API/releases/assets/$ASSET_ID"
done

for NAME in "StashTrackv0.7Setup.exe" "StashTrackSetup.exe"; do
  echo "uploading $NAME..."
  curl -sf -X POST -H "$AUTH" -H "Content-Type: application/octet-stream" \
    --data-binary @"$INSTALLER" "$UPLOAD_URL?name=$NAME" -o /dev/null
  echo "uploaded $NAME"
done

echo "--- final assets ---"
curl -sf -H "$AUTH" -H "$ACCEPT" "$API/releases/tags/$TAG" | grep -E '"name": "StashTrack|"size"' | head -n 6
