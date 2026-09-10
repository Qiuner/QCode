# Agentville 架构

## 目标

做一个按角色驱动的 AI 工作台：上层是友好、拟人化的前端，下层是稳定的 runtime 边界。

## 当前分层

### 1. 前端

负责：

- 小镇 / 世界的呈现
- 角色头像
- 任务入口
- 对话面板
- 状态与活动反馈

### 2. Agentville 居民领域层

负责：

- Workspace、Resident 与 Session 的映射
- 居民身份、提示词、能力与权限配置
- 把 Session 状态投影为居民状态
- 后续的任务交接与居民历史

### 3. DSH Host / Client 插件

负责：

- 通过 Cordis patch 装入 Agentville Host 和 Client 能力
- 直接使用 DSH 的 Workspace、Session、WebServer 和 UI slots
- 保留官方对话、工具、审批和完整工作台
- 通过同源消息桥接连接 React 与 Godot

### 4. Harness/runtime

负责：

- 模型调用
- 工具执行
- 文件和终端访问
- 插件加载
- 会话持久化

当前默认 runtime 采用 `deepseek-harness`。项目通过 git submodule 固定上游源码，通过 `upstream.json` 记录上游版本和 commit，通过 `vendor/dsh-runtime/<version>` 固定构建后的 runtime 产物。

当前执行链路直接以 DSH 插件 API 为边界，不另设 Agentville 中间层。网页修改优先通过 Agentville 的 patch、Host 插件和 Client overlay 完成，不散落到上游 submodule。

### 5. Windows Launcher（规划）

Agentville 继续以网页作为唯一产品界面。未来提供一个轻量 Windows Launcher，用于打包并启动固定版本的 runtime、加载 Agentville profile、等待本地 Web 服务就绪并打开系统默认浏览器。Launcher 不复制人物世界、聊天或 Harness 工作台，也不改变当前 Web + Harness 的实现路径。

Launcher 属于分发和本地进程管理边界，目前尚未实现。第一版只考虑单实例、端口与健康检查、启动失败提示、打开浏览器和退出清理；托盘、自动更新及完整桌面窗口不进入首版范围。

## v1 不做什么

- 不深度耦合 harness 内部实现
- 不把一次性 UI 逻辑塞进 runtime
- 不把角色能力和权限只写死在前端里
- 不提前复制或重新包装整套 DSH Session API

## 升级策略

- 锁定 runtime 版本
- 保持 Agentville 插件与上游源码的所有权边界
- 升级前先做兼容测试
- 只依赖所固定版本提供的公开 DSH/Cordis 接口

当前版本和升级规则见维护决策：

- [固定 DeepSeek Harness 源码与 runtime](../.agents/notes/implemented/process/2026-09-08-pinned-deepseek-harness-runtime.md)
- [采用 DSH 插件 API 作为运行边界](../.agents/notes/implemented/architecture/2026-09-08-dsh-plugin-runtime-boundary.md)
- [网页产品界面与轻量 Windows Launcher](../.agents/notes/implemented/architecture/2026-09-09-web-ui-with-thin-windows-launcher.md)
