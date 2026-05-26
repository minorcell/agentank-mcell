#!/usr/bin/env python3
"""
Poll AgentTank matches. Write a markdown record to records/ every BATCH_SIZE matches.
Usage: python3 scripts/monitor.py <start_match_id> <target_count>
"""
import sys, json, time, os, subprocess
from datetime import datetime

KEY = "REDACTED"
BASE = "https://agentank.ai"
BATCH_SIZE = 25
POLL_INTERVAL = 60  # seconds

def api(path):
    r = subprocess.run(
        ["curl", "-s", f"{BASE}{path}", "-H", f"Authorization: Bearer {KEY}"],
        capture_output=True, text=True, timeout=15
    )
    return json.loads(r.stdout)

def fetch_matches_since(since_id, limit=200):
    data = api(f"/api/agent/tank/matches?limit={limit}")
    matches = data.get("matches", [])
    return [m for m in matches if m["id"] > since_id]

def get_tank():
    return api("/api/agent/tank")["tank"]

def write_record(batch_num, matches, tank, start_w, start_l, start_elo, records_dir):
    w = sum(1 for m in matches if m.get("result") == "win")
    l = sum(1 for m in matches if m.get("result") == "loss")
    d = sum(1 for m in matches if m.get("result") == "draw")
    reasons = {}
    for m in matches:
        r = m.get("resultReason") or "unknown"
        reasons[r] = reasons.get(r, 0) + 1

    win_pct = round(100 * w / len(matches)) if matches else 0
    elo_delta = tank["elo"] - start_elo
    total_w = tank["wins"] - start_w
    total_l = tank["losses"] - start_l
    total = total_w + total_l
    total_pct = round(100 * total_w / total) if total else 0

    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    fname = f"{records_dir}/batch{batch_num:02d}_{ts}.md"

    lines = [
        f"# 复盘 Batch {batch_num}",
        f"> {datetime.now().strftime('%Y-%m-%d %H:%M')}  code v{tank['codeVersion']}",
        "",
        "## 本批结果",
        f"| 场次 | 胜 | 负 | 平 | 胜率 |",
        f"|------|----|----|-----|------|",
        f"| {len(matches)} | {w} | {l} | {d} | {win_pct}% |",
        "",
        "## 结局分布",
    ]
    for reason, cnt in sorted(reasons.items(), key=lambda x: -x[1]):
        lines.append(f"- `{reason}`: {cnt}")
    lines += [
        "",
        "## 累计进度",
        f"- 本次会话 +{total_w}W/+{total_l}L（{total}/200场）",
        f"- 胜率 {total_pct}%",
        f"- Elo {tank['elo']} ({'+' if elo_delta>=0 else ''}{elo_delta})",
        f"- 段位 {tank['rankTier'].upper()} {tank['rankDivision']} — {tank['rankPoints']}pts",
    ]

    os.makedirs(records_dir, exist_ok=True)
    with open(fname, "w") as f:
        f.write("\n".join(lines) + "\n")
    return fname

def main():
    start_id = int(sys.argv[1]) if len(sys.argv) > 1 else 0
    target = int(sys.argv[2]) if len(sys.argv) > 2 else 200

    tank0 = get_tank()
    start_w, start_l, start_elo = tank0["wins"], tank0["losses"], tank0["elo"]
    records_dir = os.path.join(os.path.dirname(__file__), "../records")

    print(f"[monitor] start_id={start_id} target={target} baseline {start_w}W/{start_l}L Elo {start_elo}")

    batch_num = 1
    last_batch_id = start_id
    total_new = 0

    while total_new < target:
        time.sleep(POLL_INTERVAL)
        try:
            new = fetch_matches_since(start_id, limit=300)
            total_new = len(new)
            batch_new = [m for m in new if m["id"] > last_batch_id]

            print(f"[{datetime.now().strftime('%H:%M')}] total_new={total_new} batch_pending={len(batch_new)}")

            if len(batch_new) >= BATCH_SIZE or (total_new >= target and batch_new):
                tank = get_tank()
                fname = write_record(batch_num, batch_new, tank, start_w, start_l, start_elo, records_dir)
                print(f"  => wrote {fname}")
                last_batch_id = max(m["id"] for m in batch_new)
                batch_num += 1

        except Exception as e:
            print(f"[warn] {e}")

    # Final record if leftover
    try:
        new = fetch_matches_since(start_id, limit=300)
        leftover = [m for m in new if m["id"] > last_batch_id]
        if leftover:
            tank = get_tank()
            fname = write_record(batch_num, leftover, tank, start_w, start_l, start_elo, records_dir)
            print(f"  => final record {fname}")
    except Exception as e:
        print(f"[warn] final: {e}")

    print("[monitor] done.")

if __name__ == "__main__":
    main()
