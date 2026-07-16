#!/bin/sh
# Finishes VSReacT publication: waits for the GitHub API, flips the repo
# public, enables Pages (workflow builds), attaches vsreact.n9records.com,
# and dispatches the site deploy. Idempotent.
set -u

REPO="N9RecordsTechnologiesIL/VSReacT"
DOMAIN="vsreact.n9records.com"
API="https://api.github.com/repos/$REPO"
TOKEN=$(printf 'protocol=https\nhost=github.com\n\n' | git credential fill 2>/dev/null | sed -n 's/^password=//p')
AUTH="Authorization: Bearer $TOKEN"
ACCEPT="Accept: application/vnd.github+json"

# Wait for the API (GitHub incident + local network flaps).
for i in $(seq 1 60); do
  CODE=$(curl -s -o /h/code/11Tools/VSReacT/pub-repo.json -w "%{http_code}" --max-time 25 -H "$AUTH" "$API" 2>/dev/null)
  echo "wait $i: repo GET $CODE"
  [ "$CODE" = "200" ] && break
  sleep 60
done
[ "$CODE" = "200" ] || { echo "GAVE_UP_API"; exit 1; }

PRIVATE=$(grep -m1 '"private"' /h/code/11Tools/VSReacT/pub-repo.json | grep -oE 'true|false')
echo "private: $PRIVATE"

if [ "$PRIVATE" = "true" ]; then
  PCODE=$(curl -s -o /h/code/11Tools/VSReacT/pub-flip.json -w "%{http_code}" --max-time 30 -X PATCH -H "$AUTH" -H "$ACCEPT" "$API" -d '{"private":false,"homepage":"https://vsreact.n9records.com"}' 2>/dev/null)
  echo "flip public: $PCODE"
  [ "$PCODE" = "200" ] || { head -c 300 /h/code/11Tools/VSReacT/pub-flip.json; echo; echo "FLIP_FAILED"; exit 1; }
else
  curl -s -o /dev/null --max-time 30 -X PATCH -H "$AUTH" -H "$ACCEPT" "$API" -d '{"homepage":"https://vsreact.n9records.com"}' 2>/dev/null
  echo "already public; homepage set"
fi

# Enable Pages (workflow builds). 201 created / 409 exists.
ECODE=$(curl -s -o /h/code/11Tools/VSReacT/pub-pages.json -w "%{http_code}" --max-time 30 -X POST -H "$AUTH" -H "$ACCEPT" "$API/pages" -d '{"build_type":"workflow"}' 2>/dev/null)
echo "enable pages: $ECODE"

# Attach the custom domain.
CCODE=$(curl -s -o /h/code/11Tools/VSReacT/pub-cname.json -w "%{http_code}" --max-time 30 -X PUT -H "$AUTH" -H "$ACCEPT" "$API/pages" -d "{\"cname\":\"$DOMAIN\",\"build_type\":\"workflow\"}" 2>/dev/null)
echo "set domain: $CCODE"
[ "$CCODE" = "204" ] || { head -c 300 /h/code/11Tools/VSReacT/pub-cname.json; echo; }

# Deploy the site.
DCODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 30 -X POST -H "$AUTH" -H "$ACCEPT" "$API/actions/workflows/deploy-site.yml/dispatches" -d '{"ref":"main"}' 2>/dev/null)
echo "dispatch deploy: $DCODE"

# Wait for the site to answer on the domain (cert can take a while).
sleep 240
for i in $(seq 1 25); do
  SCODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 25 -L "https://$DOMAIN" 2>/dev/null)
  echo "site check $i: HTTP $SCODE"
  [ "$SCODE" = "200" ] && { echo "SITE_LIVE"; exit 0; }
  sleep 90
done

echo "SITE_NOT_YET_LIVE (cert/DNS may still be propagating)"
curl -s --max-time 30 -H "$AUTH" -H "$ACCEPT" "$API/pages" | grep -E '"cname"|"status"|"https_enforced"|protected_domain_state' | head -n 5
exit 0
