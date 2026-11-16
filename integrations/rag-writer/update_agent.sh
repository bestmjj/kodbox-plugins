#!/bin/sh
# Deploy a pinned KodBox AI assistant + RAG API patch with offline checks,
# individual file backups and best-effort rollback on any failed step.
set -eu

REV=${1:-}
WORKDIR=${2:-/opt/backup/data/hostdzire/compose/kodbox-ai-rag}
KO_DIR=/var/www/html/plugins/aiRagLite
PLUGIN_FILES='app.php lib/DocumentWriter.php lib/IndexedFileLocator.php static/assistant.js'
RAG_FILES='agent_runtime.py drafting.py'

case "$REV" in ''|*[!0-9a-f]*) echo 'Pass a lowercase 40-character Git commit SHA' >&2; exit 2;; esac
[ "${#REV}" -eq 40 ] || { echo 'Invalid Git commit SHA length' >&2; exit 2; }
[ -f "$WORKDIR/service/rag/drafting.py" ] || { echo 'RAG source directory not found' >&2; exit 2; }
cd "$WORKDIR"
docker compose config --services | grep -qx 'rag-api' ||
    { echo 'Docker Compose rag-api service not found' >&2; exit 2; }
docker exec kodbox test -f "$KO_DIR/app.php" ||
    { echo 'KodBox plugin path not found' >&2; exit 2; }
for f in $PLUGIN_FILES; do
    docker exec kodbox test -f "$KO_DIR/$f" ||
        { echo "Missing installed KodBox dependency: $f" >&2; exit 2; }
done
for f in $RAG_FILES; do
    [ -f "$WORKDIR/service/rag/$f" ] ||
        { echo "Missing RAG source: $f" >&2; exit 2; }
done

TMP=$(mktemp -d)
STAMP=$(date +%Y%m%d-%H%M%S)
BACKUP="$WORKDIR/.ai-rag-update-backups/$STAMP-$$"
backend_changed=0
plugin_changed=0

rollback() {
    echo 'Update failed. Restoring both RAG and KodBox files...' >&2
    if [ "$plugin_changed" -eq 1 ]; then
        for f in $PLUGIN_FILES; do
            docker cp "$BACKUP/aiRagLite/$f" "kodbox:$KO_DIR/$f" || true
            docker exec kodbox chmod 644 "$KO_DIR/$f" || true
        done
        docker restart kodbox >/dev/null || true
    fi
    if [ "$backend_changed" -eq 1 ]; then
        for f in $RAG_FILES; do
            cp -p "$BACKUP/service/rag/$f" "$WORKDIR/service/rag/$f" || true
        done
        (cd "$WORKDIR" && docker compose up -d --build --no-deps rag-api) || true
    fi
    echo "Backups remain at: $BACKUP" >&2
}
cleanup() {
    code=$?
    trap - 0
    if [ "$code" -ne 0 ] && [ -d "$BACKUP" ]; then rollback; fi
    rm -rf "$TMP"
    exit "$code"
}
trap cleanup 0

BASE="https://raw.githubusercontent.com/bestmjj/kodbox-plugins/$REV"
echo '===== 1/6 Download exact source files ====='
for f in $PLUGIN_FILES; do
    mkdir -p "$TMP/aiRagLite/$(dirname "$f")"
    curl -fsSL --retry 3 "$BASE/aiRagLite/$f" -o "$TMP/aiRagLite/$f"
    chmod 644 "$TMP/aiRagLite/$f"
done
mkdir -p "$TMP/service/rag"
for f in $RAG_FILES; do
    curl -fsSL --retry 3 \
        "$BASE/integrations/rag-writer/service/rag/$f" -o "$TMP/service/rag/$f"
    chmod 644 "$TMP/service/rag/$f"
done

grep -q 'client_today' "$TMP/service/rag/agent_runtime.py"
grep -q '_model_post' "$TMP/service/rag/drafting.py"
grep -q 'client_today' "$TMP/aiRagLite/app.php"
grep -q 'client_today' "$TMP/aiRagLite/static/assistant.js"
grep -q 'readVerifiedDocument' "$TMP/aiRagLite/lib/DocumentWriter.php"
grep -q 'class AiRagLiteIndexedFileLocator' "$TMP/aiRagLite/lib/IndexedFileLocator.php"

echo '===== 2/6 Validate syntax before replacing files ====='
if command -v python3 >/dev/null 2>&1; then
    python3 -m py_compile "$TMP/service/rag/agent_runtime.py" "$TMP/service/rag/drafting.py"
fi
if command -v node >/dev/null 2>&1; then
    node --check "$TMP/aiRagLite/static/assistant.js"
fi
for f in app.php lib/DocumentWriter.php lib/IndexedFileLocator.php; do
    test_path="/tmp/airag-preflight-$$-$(basename "$f")"
    docker cp "$TMP/aiRagLite/$f" "kodbox:$test_path"
    docker exec kodbox php -l "$test_path"
    docker exec kodbox rm -f "$test_path"
done

echo '===== 3/6 Back up current versions ====='
mkdir -p "$BACKUP/aiRagLite" "$BACKUP/service/rag"
chmod 700 "$BACKUP"
for f in $PLUGIN_FILES; do
    mkdir -p "$BACKUP/aiRagLite/$(dirname "$f")"
    docker cp "kodbox:$KO_DIR/$f" "$BACKUP/aiRagLite/$f"
done
for f in $RAG_FILES; do
    cp -p "$WORKDIR/service/rag/$f" "$BACKUP/service/rag/$f"
done

echo '===== 4/6 Update and rebuild only rag-api ====='
backend_changed=1
for f in $RAG_FILES; do
    cp "$TMP/service/rag/$f" "$WORKDIR/service/rag/$f"
    chmod 644 "$WORKDIR/service/rag/$f"
done
docker compose up -d --build --no-deps rag-api
verified=0
i=0
while [ "$i" -lt 12 ]; do
    if docker compose exec -T rag-api python -c \
       'from rag.drafting import _model_post; from rag.agent_runtime import AgentStepRequest; assert "client_today" in AgentStepRequest.model_fields' >/dev/null 2>&1; then
        verified=1
        break
    fi
    i=$((i+1))
    sleep 2
done
[ "$verified" -eq 1 ] || { echo 'New RAG API import check failed' >&2; exit 1; }

echo '===== 5/6 Update KodBox plugin with readable permissions ====='
plugin_changed=1
for f in $PLUGIN_FILES; do
    docker cp "$TMP/aiRagLite/$f" "kodbox:$KO_DIR/$f"
    docker exec kodbox chmod 644 "$KO_DIR/$f"
done
for f in app.php lib/DocumentWriter.php lib/IndexedFileLocator.php; do
    docker exec kodbox php -l "$KO_DIR/$f"
done
docker exec kodbox grep -q 'client_today' "$KO_DIR/static/assistant.js"
docker restart kodbox >/dev/null

echo '===== 6/6 Completed ====='
echo "Revision: $REV"
echo "Backup: $BACKUP"
echo 'Only KodBox AI plugin and rag-api were updated.'
echo 'Refresh KodBox in a fresh browser tab before testing.'
