#!/usr/bin/env python3
"""Run 100 AgentTank challenge matches, record results to markdown."""

import subprocess
import time
import json
import sys
import os
from datetime import datetime

KEY = "agtk_07c1ead7f370b23265c1312c2e003c7d6250"
URL = "https://agentank.ai/api/agent/tank/challenge"
TOTAL = 100
BATCH_SIZE = 10
DELAY_BETWEEN_REQUESTS = 3  # seconds

results = []
start_time = time.time()

def run_match(index):
    """Run a single match via curl."""
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"[{timestamp}] Match {index+1}/{TOTAL}...", end=" ", flush=True)

    curl_cmd = [
        "curl", "-s", "-w", "\n%{http_code}",
        "-X", "POST",
        URL,
        "-H", f"Authorization: Bearer {KEY}",
        "-H", "Content-Type: application/json",
        "-d", '{"randomOpponent": true, "mapId": "random"}',
        "--max-time", "60"
    ]

    try:
        proc = subprocess.run(curl_cmd, capture_output=True, text=True, timeout=90)
        output = proc.stdout.strip()

        # Split response body and HTTP code
        parts = output.rsplit("\n", 1)
        http_code = parts[-1] if len(parts) > 1 else "000"
        body = parts[0] if len(parts) > 1 else output

        print(f"HTTP {http_code}", end="", flush=True)

        if http_code != "200":
            print(f" - {body[:200]}", flush=True)
            return {
                "match": index + 1,
                "http_code": http_code,
                "success": False,
                "result": "http_error",
                "reason": body[:200],
                "raw": body[:500]
            }

        data = json.loads(body)
        result_str = json.dumps(data, ensure_ascii=False)
        print(f" -> {result_str[:200]}", flush=True)

        return {
            "match": index + 1,
            "http_code": http_code,
            "success": True,
            "result": data.get("result", "unknown"),
            "reason": data.get("reason", ""),
            "raw": body[:500]
        }

    except subprocess.TimeoutExpired:
        print("TIMEOUT", flush=True)
        return {
            "match": index + 1,
            "http_code": "TIMEOUT",
            "success": False,
            "result": "timeout",
            "reason": "request timed out",
            "raw": ""
        }
    except Exception as e:
        print(f"ERROR: {e}", flush=True)
        return {
            "match": index + 1,
            "http_code": "ERROR",
            "success": False,
            "result": "exception",
            "reason": str(e)[:200],
            "raw": ""
        }


# ── Run all matches ──────────────────────────────────────────────
for i in range(TOTAL):
    result = run_match(i)
    results.append(result)
    if i < TOTAL - 1:
        time.sleep(DELAY_BETWEEN_REQUESTS)

elapsed = time.time() - start_time

# ── Aggregate stats ──────────────────────────────────────────────
wins = [r for r in results if r.get("reason") == "star"]
losses = [r for r in results if r.get("reason") in ("bullet", "runTime", "crashed")]
crashed = [r for r in results if r.get("reason") == "crashed"]
star_wins = wins
bullet_losses = [r for r in results if r.get("reason") == "bullet"]
runtime_losses = [r for r in results if r.get("reason") == "runTime"]
errors = [r for r in results if not r.get("success")]

reason_counts = {}
for r in results:
    reason = r.get("reason", "unknown")
    reason_counts[reason] = reason_counts.get(reason, 0) + 1

# Also count successful matches with a result field
result_counts = {}
for r in results:
    res = r.get("result", "unknown")
    result_counts[res] = result_counts.get(res, 0) + 1

win_count = reason_counts.get("star", 0)
total_valid = len([r for r in results if r.get("success") and r.get("reason") in ("star", "bullet", "runTime", "crashed")])
win_rate = (win_count / total_valid * 100) if total_valid > 0 else 0

# ── Write markdown report ────────────────────────────────────────
output_path = "/Users/mcell/workspace/projects/tank/records/batch_v31_100.md"

with open(output_path, "w", encoding="utf-8") as f:
    f.write(f"# Batch v31 - 100 Matches\n\n")
    f.write(f"**Date:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    f.write(f"**Duration:** {elapsed:.0f}s ({elapsed/60:.1f}min)\n\n")

    f.write("## Summary\n\n")
    f.write(f"| Metric | Value |\n")
    f.write(f"|--------|-------|\n")
    f.write(f"| Total Matches | {TOTAL} |\n")
    f.write(f"| Wins (star) | {win_count} |\n")
    f.write(f"| Losses | {total_valid - win_count} |\n")
    f.write(f"| Win Rate | {win_rate:.1f}% |\n")
    f.write(f"| HTTP Errors | {len(errors)} |\n")
    f.write(f"| Total Valid (excl errors) | {total_valid} |\n\n")

    f.write("## By Reason\n\n")
    f.write("| Reason | Count | Percentage |\n")
    f.write("|--------|-------|------------|\n")
    for reason in sorted(reason_counts.keys()):
        count = reason_counts[reason]
        pct = count / TOTAL * 100
        f.write(f"| {reason} | {count} | {pct:.1f}% |\n")

    f.write("\n## By Result Field\n\n")
    f.write("| Result | Count |\n")
    f.write("|--------|-------|\n")
    for res in sorted(result_counts.keys()):
        f.write(f"| {res} | {result_counts[res]} |\n")

    f.write("\n## HTTP Errors Detail\n\n")
    for r in errors:
        f.write(f"- Match {r['match']}: HTTP {r.get('http_code','?')} - {r.get('reason','')}\n")

    f.write("\n## Full Match List\n\n")
    f.write("| # | HTTP | Result | Reason | Raw (truncated) |\n")
    f.write("|---|------|--------|--------|------------------|\n")
    for r in results:
        raw = r.get("raw", "")[:80].replace("\n", " ").replace("|", "/")
        f.write(f"| {r['match']} | {r.get('http_code','?')} | {r.get('result','?')} | {r.get('reason','?')} | {raw} |\n")

    f.write("\n## Conclusion\n\n")
    f.write(f"- **Win Rate: {win_rate:.1f}%** ({win_count}/{total_valid})\n")
    f.write(f"- HTTP Errors: {len(errors)}/{TOTAL}\n")
    f.write(f"- Duration: {elapsed:.0f}s\n")

print(f"\n{'='*50}")
print(f"  FINISHED - {TOTAL} matches in {elapsed:.0f}s ({elapsed/60:.1f}min)")
print(f"  Wins: {win_count} | Losses: {total_valid - win_count}")
print(f"  Win Rate: {win_rate:.1f}%")
print(f"  Errors: {len(errors)}")
print(f"  Report: {output_path}")
print(f"{'='*50}")
