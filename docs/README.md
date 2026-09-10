# Agentville 文档

根目录的 [`README.md`](../README.md) 用于快速了解产品。本目录记录当前有效的架构、实现方案和路线；日期化的维护决策放在 [`.agents/notes/implemented/`](../.agents/notes/implemented/) 中，用于解释为什么这样设计，不替代当前文档。

## 当前文档

| 文档 | 内容 |
| --- | --- |
| [架构说明](architecture.md) | Agentville、DSH、React 和 Godot 的当前边界 |
| [角色定义](roles.md) | Coder、File Keeper、Teacher 和 Coordinator |
| [网页定制](web-customization.md) | DSH Web profile 的定制方式 |
| [世界网页方案](world-web-plan.md) | Godot 世界与 Harness Web 的组合方案 |
| [网页优先 MVP](agentville-mvp-plan.md) | 当前最小业务闭环 |
| [实施计划](plan.md) | 当前进度与后续阶段 |

已采用但尚未实施的长期产品边界，也会记录在 `.agents/notes/implemented/`；“已采用”表示方向已经确定，不表示功能已经完成。

## 状态约定

- `docs/` 描述当前系统和仍明确标注的后续计划。
- `.agents/notes/implemented/` 保存已经采用的长期决策。
- `.agents/notes/proposed/` 只在确有待评审方案时使用；提案不能写成已实现能力。
- `deepseek-harness/` 是固定版本的上游源码，其文档不属于 Agentville 文档。
