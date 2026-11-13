#!/bin/sh
# Add AI drafting to an existing RAG API. Never modify WebDAV, SQLite or .env.
set -eu
ROOT="${1:-/opt/backup/data/hostdzire/compose/kodbox-ai-rag}"
HERE=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
API="$ROOT/service/rag/api.py"
REQ="$ROOT/service/requirements.txt"
[ -f "$API" ] || { echo "Missing $API" >&2; exit 1; }
[ -f "$REQ" ] || { echo "Missing $REQ" >&2; exit 1; }
STAMP=$(date +%Y%m%d-%H%M%S)
cp "$API" "$API.before-writer-$STAMP"
if [ -f "$ROOT/service/rag/drafting.py" ]; then cp "$ROOT/service/rag/drafting.py" "$ROOT/service/rag/drafting.py.before-writer-$STAMP"; fi
cp "$HERE/service/rag/drafting.py" "$ROOT/service/rag/drafting.py"
if ! grep -q "from .drafting import register_routes" "$API"; then
  printf "\n# AI writer\nfrom .drafting import register_routes\nregister_routes(app, cfg, authorize, retrieve)\n" >> "$API"
fi
if ! grep -iq "^[[:space:]]*python-docx" "$REQ"; then
  cp "$REQ" "$REQ.before-writer-$STAMP"
  printf "\npython-docx>=1.1,<2\n" >> "$REQ"
fi
python3 -m py_compile "$API" "$ROOT/service/rag/drafting.py"
echo "Installed. Build RAG API with: cd $ROOT && docker compose up -d --build --no-deps rag-api"
