# 维护决策：固定 DeepSeek Harness 源码与 runtime

状态：已采用。

## 问题

Agentville 需要使用 DeepSeek Harness 的 Agent、Workspace、Session、工具和 Web 能力，同时必须避免上游源码、npm runtime 与本地依赖解析各自漂移。

## 决定

- `deepseek-harness/` 作为只读 Git submodule，固定到提交 `d347e703908d0406b7a7ef80e3a0e594d86b2215`。
- `upstream.json` 是源码提交、版本和 runtime 位置的统一记录。
- 当前采用 `0.1.3-alpha.1`、`official` build profile。
- `vendor/dsh-runtime/0.1.3-alpha.1/` 保存构建后的 tarball 和包含大小、SHA-256 的清单。
- 根 `package.json` 的 resolutions 必须指向这些本地 tarball。
- 上游升级使用独立变更，同时更新 gitlink、`upstream.json`、vendored runtime、resolutions 和 lockfile。
- 不把 Agentville 修改提交到上游 submodule。

## 验证

当前工作树已运行并通过：

```text
corepack yarn check:upstream
corepack yarn check:vendored-runtime
```

主仓库记录的 submodule gitlink 必须与 `upstream.json` 完全一致，并保持 submodule 工作树无本地修改。

## 后果

日常开发不依赖上游源码目录的构建状态，发布使用可校验的固定 runtime。升级成本会更显式，但上游变化不会静默进入 Agentville。
