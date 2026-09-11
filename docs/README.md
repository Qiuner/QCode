# agent-isles 文档

根目录的 [`README.md`](../README.md) 用于快速了解产品。本目录记录当前有效的架构、实现方案和路线；日期化的维护决策放在 [`.agents/notes/implemented/`](../.agents/notes/implemented/) 中，用于解释为什么这样设计，不替代当前文档。

## 当前文档

| 文档 | 内容 |
| --- | --- |
| [总体架构](architecture.md) | 跨领域通用契约：职责、生命周期、持久化、接口、事件与隔离 |
| [教程与自由创作架构](tutorial-architecture.md) | 教学专项契约：学习聚合、状态转换、验收、检查时序与恢复；继承总架构 |
| [首次 Vibe Coding 教程施工](first-vibe-coding-tutorial-plan.md) | 首课流程、阿澜文件夹引导、需求续接、施工阶段与验收 |
| [角色定义](roles.md) | Coder、File Keeper、Teacher 和 Coordinator |
| [网页定制](web-customization.md) | DSH Web profile 的定制方式 |
| [世界网页方案](world-web-plan.md) | Godot 世界与 Harness Web 的组合方案 |
| [网页优先 MVP](agent-isles-mvp-plan.md) | 当前最小业务闭环 |
| [实施计划](plan.md) | 当前进度与后续阶段 |
| [施工记录](construction-plan.md) | 工作闭环的实际交付、验证与后续施工顺序 |
| [居民工作闭环](resident-work-loop.md) | 项目恢复、居民任务入口与存储边界 |
| [居民对话系统](dialogue-system.md) | 世界交互、统一居民面板与输入焦点规则 |

已采用但尚未实施的长期产品边界，也会记录在 `.agents/notes/implemented/`；“已采用”表示方向已经确定，不表示功能已经完成。

## 状态约定

- `docs/` 描述当前系统和仍明确标注的后续计划。
- `.agents/notes/implemented/` 保存已经采用的长期决策。
- `.agents/notes/proposed/` 只在确有待评审方案时使用；提案不能写成已实现能力。
- `deepseek-harness/` 是固定版本的上游源码，其文档不属于 agent-isles 文档。
