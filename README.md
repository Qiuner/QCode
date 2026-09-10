# Agentville

一个拟人化的 AI 工作台。这里的每个角色都像共享空间里的一个居民。

## 产品想法

Agentville 不是普通聊天框，而是一个按角色分工的 AI 工作台：

- `coding` 角色，负责实现和调试
- `file` 角色，负责整理、检索和归档
- `teaching` 角色，负责讲解和带练
- `coordinator` 角色，负责在不同角色之间分发任务

它的体验应该像走进一个会干活的小镇，而不是打开一个冷冰冰的工具面板。

## 基准架构

```text
Agentville Web / Godot world
  -> Agentville Host/Client plugin
    -> DSH Workspace / Session / tool APIs
      -> DeepSeek Harness runtime
        -> files, commands, code execution, approvals, plugins
```

## 核心原则

- 角色是第一类对象。
- runtime 通过明确的插件 seam 接入；当前先固定 DeepSeek Harness。
- UI 负责气质和人格。
- Agentville 领域层负责居民、角色和任务语义。
- 每种能力都要落到清晰的角色边界上。

## 第一版 MVP 范围

1. 3 个角色：coder、file keeper、teacher。
2. 1 个 coordinator 负责任务分发。
3. 每个用户 1 份共享对话 / 任务记录。
4. 最小化的插件式工具注册。
5. UI 不直接依赖上游内部实现。

## 当前方向

当前围绕固定版本的 DeepSeek Harness 完成 Web + Host/Client 插件闭环，直接使用公开的 DSH/Cordis 接口，不重复包装 Harness 能力。

当前默认接入路线：

- `deepseek-harness/`：作为 git submodule 固定上游源码
- `upstream.json`：记录上游版本、commit 和 runtime 产物
- `vendor/dsh-runtime/<version>`：保存上游构建出的本地 runtime tarball
- `patches/`：保存 Agentville 对 vendored runtime 的补丁
- `apps/web/`：从 vendored DSH runtime 启动 Agentville Web profile
- `packages/agentville-web/`：Agentville 的 Host/Client Web 插件与 overlay
- `apps/desktop/`：未来轻量 Windows Launcher 的预留目录，当前尚未实现桌面端

## 本地启动

```sh
corepack yarn install
corepack yarn dev:web --no-open
```

默认使用项目内的 `.agentville-home/` 保存开发环境数据。可以通过 `DSH_HOME` 覆盖。
