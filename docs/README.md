# agent-isles 文档

根目录的 [`README.zh-CN.md`](../README.zh-CN.md) 用于快速了解产品。本目录记录当前有效的架构、实现方案和路线；日期化的维护决策放在 [`.agents/notes/implemented/`](../.agents/notes/implemented/) 中，用于解释为什么这样设计，不替代当前文档。

## 从这里开始

- **参与贡献**：看[贡献指南](../CONTRIBUTING.md)，包含开发工具版本、首次启动和 PR 验证要求。

- **使用产品**：先看根目录 [README](../README.zh-CN.md)，再看教程或自由创作相关说明。
- **开发新岛屿**：先看[岛屿与插件开发指南](../packages/agent-isles-web/docs/plugin-development.md)，再看[岛屿接入契约](world-integration-contract.md)。
- **理解系统**：先看[总体架构](architecture.md)，再按领域阅读专项契约。
- **维护与发布**：看运行恢复、启动性能、发布检查和施工记录。
- **维护文档**：先看[文档维护指南](documentation-guide.md)，了解文档类型、状态和证据规则。

## 当前文档

| 文档 | 内容 |
| --- | --- |
| [总体架构](architecture.md) | 跨领域通用契约：职责、生命周期、持久化、接口、事件与隔离 |
| [官方桌面接入施工](official-desktop-plan.md) | 固定官方版本、资源与协议兼容核验、迁移阶段及验收限制 |
| [教程与自由创作架构](tutorial-architecture.md) | 教学专项契约：学习聚合、状态转换、验收、检查时序与恢复；继承总架构 |
| [首次 Vibe Coding 教程施工](first-vibe-coding-tutorial-plan.md) | 首课流程、阿澜文件夹引导、需求续接、施工阶段与验收 |
| [角色定义](roles.md) | Coder、File Keeper、Teacher 和 Coordinator |
| [网页定制](web-customization.md) | DSH Web profile 的定制方式 |
| [世界网页方案](world-web-plan.md) | Godot 世界与 Harness Web 的组合方案 |
| [岛屿接入契约](world-integration-contract.md) | 新增岛屿必须遵守的宿主边界、对象映射、桥接协议与验收条件 |
| [岛屿与插件开发指南](../packages/agent-isles-web/docs/plugin-development.md) | 新增岛屿、Host / Client 插件的开发路径与最小交付物 |
| [文档维护指南](documentation-guide.md) | 文档分类、状态标记、证据位置与更新规则 |
| [网页优先 MVP](agent-isles-mvp-plan.md) | 当前最小业务闭环 |
| [实施计划](plan.md) | 当前进度与后续阶段 |
| [施工记录](construction-plan.md) | 工作闭环的实际交付、验证与后续施工顺序 |
| [居民工作闭环](resident-work-loop.md) | 项目恢复、居民任务入口与存储边界 |
| [居民工作闭环契约](resident-work-loop-contract.md) | 居民任务生命周期、入口、结果与状态约束 |
| [项目与 Workspace 契约](project-workspace-contract.md) | 项目归属、文件边界、创建与恢复规则 |
| [运行恢复契约](runtime-recovery-contract.md) | 刷新、断线、Host 重启和超时恢复行为 |
| [居民对话系统](dialogue-system.md) | 世界交互、统一居民面板与输入焦点规则 |

已采用但尚未实施的长期产品边界，也会记录在 `.agents/notes/implemented/`；“已采用”表示方向已经确定，不表示功能已经完成。

## 状态约定

- `docs/` 描述当前系统和仍明确标注的后续计划。
- `.agents/notes/implemented/` 保存已经采用的长期决策。
- `.agents/notes/proposed/` 只在确有待评审方案时使用；提案不能写成已实现能力。
- `deepseek-harness/` 是固定版本的上游源码，其文档不属于 agent-isles 文档。

