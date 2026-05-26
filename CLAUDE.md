# Tank AI — AgentTank

## Project

mcell 的坦克 AI，运行在 [AgentTank](https://agentank.ai) 平台。

- Tank ID: 2430 | API key: 见 `.env` 文件（变量名 `AGTK_KEY`）
- Auth: `Authorization: Bearer $AGTK_KEY`
- Skill: Freeze（34帧冷却，2帧持续）

## Entry point

```js
function onIdle(me, enemy, game) { ... }
```

`me.tank`, `enemy.tank`, `enemy.bullet`, `game.map`, `game.star`, `me.skill.remainingCooldownFrames`

## Hard constraints

- **禁止 try-catch** — 引擎直接拒绝，100% crash
- **禁止浏览器/网络 API**
- **不要改动 helper 函数**（`nextStep`、`greedyMove` 等），它们经过验证

## Navigation rule

BFS 优先，greedyMove 兜底。不能反过来。

```js
var step = nextStep(myPos, target, map);
if (step) { moveToward(me, myDir, myPos, step); return; }
greedyMove(me, myPos, myDir, target, map);
```

## Freeze rule

必须先转向再 freeze，否则浪费冷却：

```js
if (myDir !== aimDir) { me.turn(...); return; }   // 先转
if (freezeReady && !me.bullet) { me.freeze(); return; }  // 再 freeze
```

## Priority order

1. Bullet dodge
2. Combat（有清晰射线 → 开火；无清晰射线且 star 更近 → 抢 star）
3. Star（无敌人时）
4. Hunt（最后见到的敌人位置）
5. Explore（地图中心）
6. Patrol

## Workflow

```bash
# 发布（从 scripts/ 目录运行）
bash scripts/publish.sh "change description"

# 查结果（默认20局）
bash scripts/check.sh 20
```

等 15+ 局再判断效果，样本太少不可信。

## Key findings

| 版本 | 改动 | 结果 |
|------|------|------|
| v13 | BFS优先 + 开火后横移 | 胜率 +11% |
| v17 | 修复 freeze 时序（先转向） | 胜率 +6% |
| v22 | 无清晰射线时抢更近的 star | 待验证 |

crash 率约 25-35% 是平台底噪，与代码无关。

## Philosophy

快准狠。一次只改一件事，改完看数据。不堆条件。
