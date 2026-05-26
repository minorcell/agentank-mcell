#!/bin/bash
# Publish tank.js to AgentTank
KEY="REDACTED"
NOTES=${1:-"update"}

curl -s -X POST https://agentank.ai/api/agent/tank/code \
  -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d "{\"code\": $(cat ../tanks/tank.js | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))'), \"submittedBy\": \"Claude\", \"notes\": \"$NOTES\"}" \
  | python3 -c "import json,sys; d=json.load(sys.stdin); t=d['tank']; print(f'v{t[\"codeVersion\"]} published. {t[\"wins\"]}W/{t[\"losses\"]}L Elo {t[\"elo\"]} {t[\"rankTier\"].upper()} {t[\"rankDivision\"]} ({t[\"rankPoints\"]}pts)')"
