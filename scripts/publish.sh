#!/bin/bash
# Publish tank.js to AgentTank
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
KEY="${AGTK_KEY:-$(grep '^AGTK_KEY=' "$SCRIPT_DIR/../.env" 2>/dev/null | cut -d= -f2)}"
if [ -z "$KEY" ]; then echo "Error: AGTK_KEY not set. Add to .env or export AGTK_KEY=..."; exit 1; fi
NOTES=${1:-"update"}

curl -s -X POST https://agentank.ai/api/agent/tank/code \
  -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d "{\"code\": $(cat ../tanks/tank.js | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))'), \"submittedBy\": \"Claude\", \"notes\": \"$NOTES\"}" \
  | python3 -c "import json,sys; d=json.load(sys.stdin); t=d['tank']; print(f'v{t[\"codeVersion\"]} published. {t[\"wins\"]}W/{t[\"losses\"]}L Elo {t[\"elo\"]} {t[\"rankTier\"].upper()} {t[\"rankDivision\"]} ({t[\"rankPoints\"]}pts)')"
