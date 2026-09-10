# Web 定制方案

Agentville 后续重点改 DeepSeek Harness 的网页体验，而不是先重做完整桌面壳。

## 做法

1. `deepseek-harness/` 作为上游 submodule 固定 commit。
2. 上游通过 `upstream:install`、`upstream:build:official`、`upstream:pack:dsh` 产出 runtime tarball。
3. `sync:vendored-runtime` 把 tarball 复制到 `vendor/dsh-runtime/<version>`。
4. 根 `package.json` 的 `resolutions` 指向 vendored tarball。
5. Agentville 的网页改动优先通过独立 Host/Client 插件和 Web overlay 接入。

## 为什么这样做

- 可以固定上游版本。
- 可以控制升级节奏。
- 可以把 Agentville 的网页改动和上游源码分开。
- 上游升级时只需要重新产出 runtime，并核对 patch 是否还能应用。

## 当前限制

`apps/web/` 已通过 vendored `@deepseek-ai/dsh` 启动 Web profile，
`packages/agentville-web/cordis.patch.yml` 负责注入 Agentville Client 插件。
当前插件已提供 Agentville 世界入口、居民选择、Workspace/Session 绑定和真实对话入口；
细粒度 Session 状态投影与 Host 侧居民注册表仍待实现。
