# agent-isles 网页优先 MVP

## 目标

先把网页做成一个轻量的“居民工作台”：用户选择本地 Workspace，选择 Coder、Teacher 等居民，用自然语言交代一个小目标，居民复用真实 Harness Session 执行工作；Godot 只负责把状态变成可观察的居民、气泡和动画。

## MVP 闭环

```text
选择 Workspace
  -> 选择居民
  -> 复用或创建居民 Session
  -> 输入一句想法
  -> Session.prompt()
  -> Harness 执行工具/等待审批
  -> 网页读取 Session 状态
  -> Godot 展示居民状态
```

## 分层

- React 宿主：Workspace、居民选择、轻量输入框、错误提示和 `/workbench` 入口。
- Harness：Session、模型、工具、审批、文件修改和测试，保持唯一事实来源。
- Godot：场景、角色、移动、工作动画、状态气泡；不保存任务状态，也不直接调用 Harness。
- 居民绑定：第一阶段用 Workspace + ResidentId 映射 Session；后续迁移到持久化运行时投影。

## 当前落地范围

小镇是主页。首次进入打开向导面板；点击居民快捷入口或靠近居民按 E 交谈，只打开该居民的功能。

| 居民 | 职责 |
| --- | --- |
| 向导 | 选择本地文件夹、绑定 Workspace、切换项目 |
| 芽芽 Coder | 接收制作目标，实际读取、修改、验证项目 |
| 苔伯 Teacher | 结合项目文件讲解问题 |
| 阿澜 File Keeper | 列出真实目录、读取指定相对路径 |

- 同一 Workspace 下各居民使用独立 Session；关闭面板不取消任务，切回恢复会话。
- 当前项目保存在 `agent-isles.active-workspace.v1`，居民映射保存在 `agent-isles.resident-sessions.v1`；更名前的浏览器键只用于兼容读取。
- 草稿按项目和居民隔离；异步返回通过操作序号防止覆盖后来的选择。
- 通过 `beginSubmission` 和 `ISession.prompt` 调用真实 Harness，展示回复和工具调用。
- `turn/end completed` 只显示“本轮已结束”，不宣称测试通过；错误与中断显示未完成。
- 工具审批调用 Harness 原审批对象，允许一次或拒绝；其他交互转到 `/workbench`。
- Godot 仅接收同源桥接消息、显示居民状态；新增入口向导暂时复用现有模型。

## 验证与限制

- `corepack yarn build:web` 检查类型和构建；`node --test packages/agent-isles-web/tests/resident-model.test.mjs` 验证事件投影。
- `corepack yarn build:world` 包含资源导入和中文字体覆盖检查；Godot 居民测试位于 `games/mosslight/tests/residents.gd`。
- 浏览器实测使用忽略的 `agent-isles-runtime-test/` 文件夹，验证 Coder 创建并读回文件、Teacher 读取讲解、File Keeper 列目录。
- Teacher 和 File Keeper 的只读行为目前依靠提示，尚未强制限制工具权限，不能当作权限隔离。
- 文件管理员暂时通过模型和文件工具展示结果，尚无独立文件树预览器。
- 恢复项目和居民映射后，未打开会话的完整事件状态需要恢复会话才可显示。
- 文件夹绑定依赖本机 Harness；远程网页不能凭浏览器直接访问任意本地路径。
- 本地宿主与 Godot iframe 分别使用 `127.0.0.1` 和 `localhost`（相同端口），利用 Chromium 站点隔离避免 Godot 同步初始化阻塞关闭按钮。双方严格校验对应 origin、窗口和协议；操作指南也通过消息打开。远程部署目前保持同源，后续需配置独立世界站点才能获得相同隔离效果。
- `tests/panel-responsiveness.mjs`（Web 插件目录）用阻塞中的世界替身验证关闭不等待初始化；可用 `sameSite=true` 对照重现旧行为。
- 移动端支持面板布局，场景操作仍以键鼠为主。

## 下一阶段

### 首屏与运行性能

- Web 首包只含主岛，`neighbors.pck` 包含晴沙绿洲和溪间庭院，在主岛可用后后台下载。未加载的桥口有碰撞保护，失败时在桥头按 E 重试；桌面版仍直接加载三个区域。
- 导出阶段生成 Brotli/gzip 文件；Host 根据 Accept-Encoding 选择有效的压缩版本，使用流式响应降低大文件请求的内存占用。
- 静态文件通过 ETag 重新验证，未变化返回 304；更新后不继续使用旧版压缩文件。首次传输仍受网络、WASM 编译与 GPU 着色器初始化影响。
- 浏览器 Performance 标记 `world-start`、`godot-scene-ready`、`world-playable`、`godot-neighbors-ready` 区分下载、场景就绪、首帧与邻区完成；不能把场景 ready 日志当成可操作首帧。
- `tools/profile_startup.gd -- --stream-neighbors` 测量主岛加载与节点数量；不带参数对照完整场景。
- 居民列表只倒序查找最后一轮状态，不在每次输入或流式输出时重建所有历史消息；当前回复投影按事件快照缓存。

1. 为所有居民建立独立状态投影，而不是只从当前 Session 推导状态。
2. 将 `localStorage` 中的居民 Session 映射迁移到持久化运行时。
3. 扩展世界桥接协议，加入进度、审批、错误和通知事件。
4. 增加居民任务历史、恢复和“继续上次工作”。

## 明确不放进 MVP

Godot 内直接编辑代码、Godot 自己执行命令、第二套审批系统、复杂任务编排、多人协作和完整存档。
