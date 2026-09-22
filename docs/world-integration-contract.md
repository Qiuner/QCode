# 岛屿接入契约

本文是新增岛屿接入 QCode 的唯一规范。总体架构只定义跨领域边界；实施步骤见[世界网页实施方案](world-web-plan.md)。

## 1. 宿主边界

岛屿必须与 DSH 共用一个 Host、认证入口、`DSH_HOME`、Workspace 和 Session。岛屿页面使用 `/`，完整 DSH 工作台使用 `/workbench`；世界资源由同源 `/world/*` 提供。

Godot 只负责渲染、输入和状态演出，不持有会话真相，不执行工具、文件或权限判断。对话、审批、工具结果、设置和持久化由 Host / React 负责。

## 2. 对象映射

| 岛屿对象 | Host / DSH 对象 |
| --- | --- |
| 岛屿 / 小镇 | Workspace |
| 居民定义 | Agent preset + permission preset |
| 居民一次工作 | Session |
| 居民能力 | Host tools + permission policy |
| 居民动作 | Session event 的展示投影 |
| 作品 | Deliverable |

居民与 Session 是一对多关系；不得把居民永久绑定到单个 Session。

## 3. 世界桥接协议

协议版本从 `1` 开始。双方只接受同源、来自指定 iframe / 父页面的消息。

Host → 世界：`world:init`、`world:locale`、`world:show-guide`、`world:retry-neighbors`、`tutorial:keeper`、`workspace:changed`、`resident:status`。

世界 → Host：`world:ready`、`world:playable`、`world:regions`、`resident:selected`、`tutorial:keeper`。

React Host 侧的桥接 Session 负责 iframe 配对、来源与版本校验、`world:ready` / `world:init` 握手、状态快照和命令编码；Web shell 与 Godot 构成世界侧 Adapter，负责验证父页面并在 JavaScriptBridge 与结构化消息之间转换。调用方不得自行拼装跨 iframe 消息。

消息只允许携带 Workspace / Session 引用、居民 ID 与展示状态、语言、邻区加载状态，以及教程演出所需的有界动作和回执；不得携带主机绝对路径、令牌、提示词或权限细节。新增消息必须递增协议版本并说明兼容策略。

## 4. 接入验收

新岛屿至少必须证明：同源资源可加载；完成 `world:ready` / `world:init` 握手；能显示当前 Workspace；选择居民后能创建或恢复 Session；发送任务后的状态能投影到世界；切换 `/workbench` 后仍是同一 Workspace / Session；刷新或断线重连不会重发任务。

## 5. 安全与恢复

所有身份、归属、权限和版本校验在 Host 完成。世界输入视为不可信。Host 断线时世界显示连接状态并重新取快照；恢复只恢复连接和展示状态，不自动重发用户任务。
