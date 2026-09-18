# 岛屿与插件开发指南

这份文档是新增岛屿或扩展 QCode Host / Client 插件的入口。先阅读[岛屿接入契约](../../../docs/world-integration-contract.md)；跨领域生命周期和错误语义遵守[总体架构](../../../docs/architecture.md)。

## 开发路径

1. 为岛屿准备 Godot Web 导出，并确认资源可由同源 `/world/*` 提供。
2. 在 Host 插件中注册世界资源、领域服务或路由；不要在 Godot 中实现 Session、权限和文件写入。
3. 实现 `world:ready` / `world:init` 握手，以及 Workspace、居民和 Session 状态投影。
4. 为每个可交互居民声明稳定 ID，并通过 Host 创建或恢复 Session。
5. 按接入契约完成刷新、断线、工作台切换和重复发送验收。

## 插件边界

Host 插件负责权威状态、身份归属、权限校验、持久化和 DSH 调用；Client 负责界面与输入；Godot 负责世界表现。跨 iframe 消息必须同步更新 `world-bridge.ts` 的类型和两端校验。

## 最小交付物

- 世界资源和版本号
- 岛屿接入契约中定义的桥接消息
- 居民与 Workspace / Session 映射
- 断线恢复和错误展示
- 最小业务验收记录

## 验证

插件目录的类型检查和相关测试是最低检查；改变插件入口或世界构建时再运行完整 Web / World 构建。实际证据应记录在施工文档或 `docs/evidence/`，不能把未执行的检查写成通过。
