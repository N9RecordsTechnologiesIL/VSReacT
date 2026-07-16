#!/bin/sh
# Publishes the StashTrack v0.8 GitHub release with both installer assets.
set -eu

REPO="davad00/StashTrack"
TAG="v0.8"
INSTALLER="/h/code/11Tools/VSReacT/StashTrack/dist/StashTrackv0.8Setup.exe"
API="https://api.github.com/repos/$REPO"

TOKEN=$(printf 'protocol=https\nhost=github.com\n\n' | git credential fill 2>/dev/null | sed -n 's/^password=//p')
[ -n "$TOKEN" ] || { echo "no token"; exit 1; }
AUTH="Authorization: Bearer $TOKEN"
ACCEPT="Accept: application/vnd.github+json"

RELEASE_JSON=$(curl -sf -H "$AUTH" -H "$ACCEPT" "$API/releases/tags/$TAG" 2>/dev/null || true)

if [ -z "$RELEASE_JSON" ]; then
  BODY_FILE=$(mktemp)
  cat > "$BODY_FILE" <<'EOF'
{
  "tag_name": "v0.8",
  "target_commitish": "main",
  "name": "StashTrack v0.8",
  "draft": false,
  "prerelease": false,
  "body": "## StashTrack v0.8\n\nThe download workflow grows up: live progress, in-plugin preview, and your download history — all rendered natively by the VSReacT React engine.\n\n### What's new\n- **Live download progress**: the bar under the URL now shows real yt-dlp percentages while fetching (sweeps indeterminately until the first percent arrives).\n- **Preview playback**: PLAY/PAUSE the downloaded file through the plugin output, scrub with the bar under the waveform, and watch the playhead track across it.\n- **The Stash**: a sliding drawer (STASH pill, top right) lists your last 50 downloads — click one to reload it for preview and drag-to-DAW, REMOVE what you don't need. Persisted across sessions.\n\n### Notes\n- Installer bundles yt-dlp, uv/uvx, ffmpeg, deno, and the VC++ runtime as before.\n- Close FL Studio before finishing the installer so the loaded VST3 can be replaced."
}
EOF
  RELEASE_JSON=$(curl -sf -X POST -H "$AUTH" -H "$ACCEPT" -H "Content-Type: application/json" --data @"$BODY_FILE" "$API/releases")
  rm -f "$BODY_FILE"
  echo "created release $TAG"
else
  echo "release $TAG already exists; reusing"
fi

UPLOAD_URL=$(printf '%s' "$RELEASE_JSON" | sed -n 's/.*"upload_url": *"\([^"{]*\).*/\1/p' | head -n1)
[ -n "$UPLOAD_URL" ] || { echo "no upload_url"; exit 1; }

for NAME in "StashTrackv0.8Setup.exe" "StashTrackSetup.exe"; do
  if printf '%s' "$RELEASE_JSON" | grep -q "\"name\": *\"$NAME\""; then
    echo "$NAME already uploaded; skipping"
    continue
  fi
  echo "uploading $NAME..."
  curl -sf -X POST -H "$AUTH" -H "Content-Type: application/octet-stream" \
    --data-binary @"$INSTALLER" "$UPLOAD_URL?name=$NAME" -o /dev/null
  echo "uploaded $NAME"
done

echo "--- final state ---"
curl -sf -H "$AUTH" -H "$ACCEPT" "$API/releases/tags/$TAG" | grep -E '"tag_name"|"name": "StashTrack|"size"' | head -n 8
