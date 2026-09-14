# agent-isles 世界网页实施方案`r`n`r`n> 接入边界、对象映射和桥接消息以[岛屿接入契约](world-integration-contract.md)为准；本文只记录当前组合方式与分阶段落地计划。

## 产品边界

agent-isles 与原版 DeepSeek Harness 共用一个 Host、一个认证入口、一个
`DSH_HOME` 和同一套 Workspace / Session 数据：

- `/`：agent-isles 世界。Godot 渲染世界，React/Cordis 显示真实对话。
- `/workbench`：完整的 Harness 工作台，作为高级操作与故障回退入口。
- `/world/*`：同源提供的 Godot Web 导出资源，不是第二个应用后端。

Godot 不持有会话真相，也不执行工具权限判断。它只接收可展示的工作区、
居民与任务状态；对话、审批、工具结果、设置和文件仍由 Harness UI 与 Host 负责。

## 页面组合

桌面端沿用 Harness `AppFrame`。agent-isles 插件只在 `shell.overlay` 中覆盖左侧世界区域，
右侧保留原生 conversation 树，因此 composer、trajectory、approval 和 session scope
无需复制。移动端第一版显示完整世界，通过顶部入口进入完整工作台；后续再把对话做成底部 sheet。

## 数据映射

| agent-isles | DeepSeek Harness |
| --- | --- |
| 小镇 / 岛屿 | Workspace |
| 居民定义 | Agent preset + permission preset |
| 居民的一次工作 | Session |
| 居民能力 | Host 侧 tools + permission policy |
| 居民动作 | Session event 的 UI 投影 |
| 产出物 | Deliverable |

居民与 Session 是一对多关系。持久化映射由 Host 侧 registry 管理，不能把一个居民永久绑死到一个 Session。

## 桥接协议

桥接版本从 `1` 开始。父页面只接受同源且来自目标 iframe 的消息，iframe 只接受同源且来自父页面的消息。

Host 到世界：

- `world:init`
- `workspace:changed`
- `resident:status`

世界到 Host：

- `world:ready`
- `resident:selected`

消息只携带 `workspaceId`、工作区标题、`sessionId`、居民 id 与展示状态，不向 iframe 暴露主机绝对路径。

## 分阶段落地

### M1：同源世界与桥接基础

- Host 提供 `/world/*`，含正确的 WASM MIME 与路径穿越防护。
- `/` 组合 Godot 世界和 Harness conversation，`/workbench` 可回退。
- React、Web shell、Godot 完成 `world:ready` / `world:init` 握手。
- 当前 Workspace 与 Session 以只读状态投影到世界。

### M2：居民注册表与真实会话

- 点击居民时创建或恢复该居民在当前 Workspace 下的 Session。首版映射保存在浏览器并按 Host 清单校验。
- 后续把浏览器映射迁移为 Host `ResidentDefinition` 与 `ResidentSession` 持久化，以支持多浏览器共享。
- 创建 Session 时绑定 agent preset；权限在 Host 侧强制执行。
- 世界选择与 Harness 当前 Session 双向同步。

### M3：任务状态与结果

- 将 session events 归一为 `idle / thinking / working / approval / completed / failed`。
- Godot 用移动、动作、头顶提示和建筑位置展示状态，不显示完整对话文本。
- Deliverable 创建后在世界中出现结果提示，详情仍由 React 打开。

### M4：移动端与恢复能力

- 对话改为可拖动的底部 / 全屏 sheet。
- 刷新、断线重连、切换 Workspace 后恢复居民与 Session 映射。
- 验证 `/` 与 `/workbench` 使用同一个 Host 且会话连续。

## 第一个业务验收点

1. 选择一个真实 DSH Workspace。
2. 世界显示该 Workspace。
3. 点击 Coder，创建或恢复真实 Session。
4. 发送消息后，居民依次显示思考、工作、审批与完成状态。
5. 切到 `/workbench` 后能看到同一个 Workspace 和 Session。

M1 只建立这条链路的可靠基础；居民点击创建 Session 与细粒度事件映射属于 M2 / M3。

