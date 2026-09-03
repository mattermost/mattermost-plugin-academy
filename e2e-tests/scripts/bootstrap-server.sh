#!/usr/bin/env bash
# Create the first system admin if the server is empty, then enable plugin uploads.
set -euo pipefail

SITE="${MM_SERVICESETTINGS_SITEURL:-http://localhost:8065}"
USER="${MM_ADMIN_USERNAME:-sysadmin}"
PASS="${MM_ADMIN_PASSWORD:-Sys@dmin-sample1}"
EMAIL="${MM_ADMIN_EMAIL:-sysadmin@sample.mattermost.com}"

echo "Waiting for Mattermost at ${SITE}..."
for _ in $(seq 1 60); do
    if curl -fsS "${SITE}/api/v4/system/ping" >/dev/null 2>&1; then
        echo "Mattermost is up."
        break
    fi
    sleep 5
done
curl -fsS "${SITE}/api/v4/system/ping" >/dev/null

login() {
    curl -sS -D - -o /tmp/mm-login-body.json \
        -X POST "${SITE}/api/v4/users/login" \
        -H 'Content-Type: application/json' \
        -d "{\"login_id\":\"${USER}\",\"password\":\"${PASS}\"}"
}

HEADERS="$(login || true)"
if ! echo "${HEADERS}" | grep -qi '^token:'; then
    echo "Creating first admin user ${USER}..."
    curl -fsS -X POST "${SITE}/api/v4/users" \
        -H 'Content-Type: application/json' \
        -d "{\"email\":\"${EMAIL}\",\"username\":\"${USER}\",\"password\":\"${PASS}\"}" >/dev/null
    HEADERS="$(login)"
fi

TOKEN="$(echo "${HEADERS}" | tr -d '\r' | awk -F': ' 'tolower($1)=="token"{print $2; exit}')"
if [ -z "${TOKEN}" ]; then
    echo "Failed to log in as ${USER}" >&2
    exit 1
fi

python3 - "${SITE}" "${TOKEN}" <<'PY'
import json, sys, urllib.request
site, token = sys.argv[1], sys.argv[2]
req = urllib.request.Request(
    site + "/api/v4/config",
    headers={"Authorization": "Bearer " + token},
)
with urllib.request.urlopen(req) as resp:
    cfg = json.load(resp)
cfg.setdefault("PluginSettings", {})["EnableUploads"] = True
cfg.setdefault("PluginSettings", {})["AutomaticPrepackagedPlugins"] = False
cfg.setdefault("ServiceSettings", {})["EnableOnboardingFlow"] = False
cfg.setdefault("TeamSettings", {})["EnableOpenServer"] = True
body = json.dumps(cfg).encode()
put = urllib.request.Request(
    site + "/api/v4/config",
    data=body,
    method="PUT",
    headers={
        "Authorization": "Bearer " + token,
        "Content-Type": "application/json",
        "Content-Length": str(len(body)),
    },
)
urllib.request.urlopen(put).read()
print("Plugin uploads enabled.")
PY
