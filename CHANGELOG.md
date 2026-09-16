# 变更日志

本文件记录 agent-isles 面向使用者的重要变化。项目正式确定版本策略前，所有尚未发布的变化记录在 `Unreleased`。

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)。

## Unreleased

### Added

- macOS Intel（x86_64）便携预览：菜单栏启动器、内置 Node/DSH/世界资源、`yarn build:desktop:darwin` 与 `verify:desktop:darwin`。

### Known limitations

- macOS 预览未签名、无安装器与自动更新；暂不提供 Apple Silicon 专用包。

## 0.1.0-preview.1 — 2026-09-15

首个 Windows 10/11 x64 便携预览版，只提供 ZIP，不发布安装器。

### Added

- 可探索的岛屿、Q 编程入口、项目文件与历史会话管理，以及教程 / 自由创作入口。
- 复用 DeepSeek Harness 原生对话、工具执行和审批；内置运行时与世界资源。
- Web 与世界中英文切换、任务状态提示及中央计算机召回。
- 建立公开贡献所需的 Issue 表单、Pull Request 模板、贡献指南、安全策略、行为准则、支持说明和 CI。
- 采用 MIT License 发布 agent-isles 自有代码，版权所有者为 Qiuner，并补充第三方许可证索引。

### Known limitations

- 未签名，无自动更新；macOS 尚不支持。
- 需自行配置模型，Git / Python 等项目工具需自行安装。
- 便携指解压运行，用户数据仍保存到 `%LOCALAPPDATA%\agent-isles\data`。
- 完整真实模型流程、长路径和干净 Windows 环境尚未完成验收。
