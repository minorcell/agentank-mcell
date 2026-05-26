# AgentTank 

mcell 的坦克 AI，运行在 [AgentTank](https://agentank.ai) 平台。

- **Tank ID**: 2430
- **Skill**: Freeze（34 帧冷却，2 帧持续）

## 策略优先级

1. **躲子弹** — 检测来弹方向，优先横移，次选后退
2. **战斗** — 有清晰射线 → 转向开火；子弹飞行中 → 靠近 or 横移规避反击；无射线且 star 更近 → 先抢 star
3. **抢星** — 无敌人时直奔 star
4. **追踪** — 奔向最后见到敌人的位置
5. **探索** — 奔向地图中心
6. **巡逻** — 向前走，碰墙右转

## 导航

BFS（`nextStep`）优先，贪心（`greedyMove`）兜底。

## Freeze 时序

必须**先转向再 freeze**，否则浪费冷却：

```js
if (myDir !== aimDir) { me.turn(...); return; }
if (freezeReady && !me.bullet) { me.freeze(); return; }
```

## 工作流

```bash
# 发布（从项目根目录）
bash scripts/publish.sh "change description"

# 查战绩（默认 20 局）
bash scripts/check.sh 20
```

等 **40+ 局**再判断效果，样本不足不可信。效果不达预期直接 `git revert`，不在坏改动上叠加补丁。crash 率 25–35% 是平台底噪，与代码无关。

## 版本记录

| 版本 | 改动 | 结果 |
|------|------|------|
| v13 | BFS 优先 + 开火后横移 | 胜率 +11% |
| v17 | 修复 freeze 时序（先转向） | 胜率 +6% |
| v22 | 无清晰射线时抢更近的 star | 待验证 |
| v25 | 修复躲避震荡 + 墙壁检测 | — |

## 硬性限制

- **禁止 try-catch** — 引擎直接拒绝，必然 crash
- **禁止**浏览器 / 网络 API
- **不要改动** helper 函数（`nextStep`、`greedyMove` 等），它们经过验证
