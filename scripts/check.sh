#!/bin/bash
# Check recent match results
KEY="REDACTED"
N=${1:-20}

curl -s "https://agentank.ai/api/agent/tank/matches?limit=$N" \
  -H "Authorization: Bearer $KEY" | python3 -c "
import json, sys
data = json.load(sys.stdin)
matches = data.get('matches', [])
w=0; l=0; d=0
reasons = {}
for m in matches:
    r = m.get('result','')
    reason = m.get('resultReason','')
    if r == 'win': w += 1
    elif r == 'loss': l += 1
    else: d += 1
    reasons[reason] = reasons.get(reason, 0) + 1
total = w+l+d
print(f'Last {len(matches)}: {w}W/{l}L/{d}D  ({100*w//total if total else 0}%)')
print('Reasons:', dict(sorted(reasons.items(), key=lambda x:-x[1])))
"
