#!/bin/sh
# Enables GitHub Pages (workflow build) for the VSReacT repo and attaches the
# vsreact.n9records.com custom domain. Retries until the API is reachable.
set -u

REPO="N9RecordsTechnologiesIL/VSReacT"
DOMAIN="vsreact.n9records.com"
API="https://api.github.com/repos/$REPO"
TOKEN=$(printf 'protocol=https\nhost=github.com\n\n' | git credential fill 2>/dev/null | sed -n 's/^password=//p')
AUTH="Authorization: Bearer $TOKEN"
ACCEPT="Accept: application/vnd.github+json"

for i in $(seq 1 40); do
  CODE=$(curl -s -o /h/code/11Tools/VSReacT/pg-repo.json -w "%{http_code}" --max-time 25 -H "$AUTH" "$API" 2>/dev/null)
  echo "try $i: repo GET $CODE"
  [ "$CODE" = "200" ] && break
  sleep 60
done

[ "$CODE" = "200" ] || { echo "GAVE_UP_API"; exit 1; }

PRIVATE=$(grep -m1 '"private"' /h/code/11Tools/VSReacT/pg-repo.json | grep -oE 'true|false')
echo "repo private: $PRIVATE"

if [ "$PRIVATE" = "true" ]; then
  echo "REPO_IS_PRIVATE — GitHub Pages needs a public repo on the free plan."
  echo "Either make the repo public or upgrade the org, then re-run this script."
  exit 2
fi

# Enable Pages with workflow builds (409 = already enabled: fine).
ECODE=$(curl -s -o /h/code/11Tools/VSReacT/pg-enable.json -w "%{http_code}" --max-time 30 -X POST -H "$AUTH" -H "$ACCEPT" "$API/pages" -d '{"build_type":"workflow"}' 2>/dev/null)
echo "enable pages: $ECODE"
[ "$ECODE" = "201" ] || [ "$ECODE" = "409" ] || { head -c 300 /h/code/11Tools/VSReacT/pg-enable.json; echo; }

# Attach the custom domain.
CCODE=$(curl -s -o /h/code/11Tools/VSReacT/pg-cname.json -w "%{http_code}" --max-time 30 -X PUT -H "$AUTH" -H "$ACCEPT" "$API/pages" -d "{\"cname\":\"$DOMAIN\",\"build_type\":\"workflow\"}" 2>/dev/null)
echo "set custom domain: $CCODE"
[ "$CCODE" = "204" ] || { head -c 300 /h/code/11Tools/VSReacT/pg-cname.json; echo; }

# Report final pages state.
curl -s --max-time 30 -H "$AUTH" -H "$ACCEPT" "$API/pages" | grep -E '"cname"|"status"|"html_url"|"https_enforced"' | head -n 6

echo "PAGES_SETUP_DONE"
