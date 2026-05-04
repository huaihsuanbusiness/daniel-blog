#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
WRANGLER="$ROOT_DIR/node_modules/.bin/wrangler"
WORKER_NAME="${WORKER_NAME:-daniel-blog}"
SITE_URL="${SITE_URL:-https://danielcanfly.com}"
DEPLOY_MESSAGE="${DEPLOY_MESSAGE:-manual deploy $(date -u +%Y-%m-%dT%H:%M:%SZ)}"
SKIP_BUILD="${SKIP_BUILD:-0}"

require_env() {
  local key="$1"
  if [ -z "${!key:-}" ]; then
    echo "[deploy-with-secrets] Missing required env: $key" >&2
    exit 1
  fi
}

require_env GOOGLE_SHEET_ID
require_env GOOGLE_SERVICE_ACCOUNT_EMAIL
require_env GOOGLE_PRIVATE_KEY

if [ ! -x "$WRANGLER" ]; then
  echo "[deploy-with-secrets] Wrangler not found at $WRANGLER" >&2
  exit 1
fi

if [ "$SKIP_BUILD" != "1" ]; then
  echo "[deploy-with-secrets] Building project..."
  cd "$ROOT_DIR"
  npm run build
fi

# Ensure dist/server/wrangler.json contains the existing SESSION KV namespace id.
# Source of truth lives in repo root wrangler.jsonc.
python3 - "$ROOT_DIR/wrangler.jsonc" "$ROOT_DIR/dist/server/wrangler.json" <<'PY'
import json, sys
src_path, out_path = sys.argv[1], sys.argv[2]
with open(src_path) as f:
    src = json.load(f)
session = None
for kv in src.get('kv_namespaces', []):
    if kv.get('binding') == 'SESSION':
        session = kv
        break
if not session or not session.get('id'):
    raise SystemExit('[deploy-with-secrets] Missing SESSION kv_namespaces.id in wrangler.jsonc')
session_id = session['id']
with open(out_path) as f:
    out = json.load(f)
found = False
for kv in out.get('kv_namespaces', []):
    if kv.get('binding') == 'SESSION':
        kv['id'] = session_id
        found = True
        break
if not found:
    out.setdefault('kv_namespaces', []).append({
        'binding': 'SESSION',
        'id': session_id,
    })
with open(out_path, 'w') as f:
    json.dump(out, f, indent=2)
print(f'[deploy-with-secrets] Ensured SESSION KV namespace id in dist/server/wrangler.json: {session_id}')
PY

python3 - "$ROOT_DIR/dist/server/wrangler.json" <<'PY'
import json, sys
path = sys.argv[1]
with open(path) as f:
    d = json.load(f)
for kv in d.get('kv_namespaces', []):
    if kv.get('binding') == 'SESSION' and kv.get('id'):
        print(f"[deploy-with-secrets] Verified SESSION binding id: {kv['id']}")
        break
else:
    raise SystemExit('[deploy-with-secrets] SESSION binding id missing after patch')
PY

TMP_SECRETS_FILE="$(mktemp "${TMPDIR:-/tmp}/daniel-blog-secrets.XXXXXX")"
TMP_UPLOAD_LOG="$(mktemp "${TMPDIR:-/tmp}/daniel-blog-upload.XXXXXX")"
trap 'rm -f "$TMP_SECRETS_FILE" "$TMP_UPLOAD_LOG"' EXIT

python3 - "$TMP_SECRETS_FILE" <<'PY'
import json, os, sys
out = sys.argv[1]
with open(out, 'w') as f:
    json.dump({
        'GOOGLE_SHEET_ID': os.environ['GOOGLE_SHEET_ID'],
        'GOOGLE_SERVICE_ACCOUNT_EMAIL': os.environ['GOOGLE_SERVICE_ACCOUNT_EMAIL'],
        'GOOGLE_PRIVATE_KEY': os.environ['GOOGLE_PRIVATE_KEY'],
    }, f)
PY

cd "$ROOT_DIR/dist/server"

echo "[deploy-with-secrets] Uploading new Worker version with secrets attached..."
if ! "$WRANGLER" versions upload --name "$WORKER_NAME" --config wrangler.json --message "$DEPLOY_MESSAGE" --secrets-file "$TMP_SECRETS_FILE" >"$TMP_UPLOAD_LOG" 2>&1; then
  cat "$TMP_UPLOAD_LOG"
  echo "[deploy-with-secrets] Upload failed" >&2
  exit 1
fi
UPLOAD_OUTPUT="$(cat "$TMP_UPLOAD_LOG")"
printf '%s\n' "$UPLOAD_OUTPUT"

VERSION_ID="$(printf '%s\n' "$UPLOAD_OUTPUT" | sed -n 's/.*Worker Version ID: \([a-f0-9-]*\).*/\1/p' | tail -1)"
if [ -z "$VERSION_ID" ]; then
  echo "[deploy-with-secrets] Failed to parse Worker Version ID from upload output" >&2
  exit 1
fi

echo "[deploy-with-secrets] Promoting version $VERSION_ID to production..."
"$WRANGLER" versions deploy "$VERSION_ID" --name "$WORKER_NAME" --config wrangler.json --message "$DEPLOY_MESSAGE" --yes

echo "[deploy-with-secrets] Done. Live target should now be version: $VERSION_ID"
echo "[deploy-with-secrets] Optional manual verify:"
echo "curl -s '$SITE_URL/api/campaign/ai-companion-submit' -X POST -H 'Content-Type: application/json' -d '{\"role\":\"caregiver\",\"familyId\":\"manual_check\",\"answers\":{\"Q0\":\"照顧者\"},\"locale\":\"zh\"}'"
