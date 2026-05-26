# AgentTank — mcell

mcell 的坦克 AI，运行在 [AgentTank](https://agentank.ai) 平台。

- **Tank ID**: 2430
- **Skill**: Freeze（34 帧冷却，2 帧持续）
- **API key**: 见 `.env` 文件（变量名 `AGTK_KEY`）

## 策略概览

每帧按优先级决策：

1. **躲子弹** — 面向安全方向直接移动，否则转向横移
2. **战斗** — 清晰射线 → 转向 → freeze(≤3 格) → 开火 → 靠近/横移
3. **抢星** — 无敌人时 BFS 直奔
4. **追踪** — 最后见到敌人的位置
5. **探索** — 地图中心
6. **巡逻** — 向前走，碰墙右转

## 关键规则

- **导航**: BFS (`nextStep`) 优先，`greedyMove` 兜底，不可反序
- **Freeze**: 先转向再 freeze，只在有清晰射线且距离 ≤ 3 时使用
- **Dodge**: 优先移动而非转向；弹道检测含同行/列 + 距行列 1 格的预测
- **Helper 函数禁止修改**: `nextStep`、`greedyMove`、`canShoot` 等已验证

## 硬性限制

- **禁止 try-catch** — 引擎直接拒绝
- **禁止** 浏览器 / 网络 API

## 工作流

```bash
# 发布
bash scripts/publish.sh "change description"

# 查战绩
bash scripts/check.sh 20
```

等 **40+ 局**再判断效果。效果不佳直接 `git revert`，不在坏改动上叠加补丁。

crash 率约 25–35% 是平台底噪，与代码无关。
