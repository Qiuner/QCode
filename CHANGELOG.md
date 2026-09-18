# 变更日志

**简体中文** · [English](CHANGELOG.en.md)

本文件记录 QCode 面向使用者的重要变化。项目正式确定版本策略前，所有尚未发布的变化记录在 `Unreleased`。

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)。

## Unreleased

### Added

- macOS Intel（x86_64）便携预览：菜单栏启动器、内置 Node/DSH/世界资源、`yarn build:desktop:darwin` 与 `verify:desktop:darwin`。
- macOS Apple Silicon（arm64）便携预览：复用菜单栏启动器，内置原生 arm64 Node 与依赖，并验证包内架构、服务就绪、单实例及退出清理。

### Known limitations

- macOS 预览未签名、无安装器与自动更新；Intel 与 Apple Silicon 分别提供对应架构的便携包，不提供 Universal 包。

## 0.1.0-preview.2 — 2026-09-18

QCode 品牌下的 Windows 10/11 x64 便携预览版。macOS 构建尚未公开发布。

### Added

- 世界导出新鲜度校验，在开发启动和桌面打包前检测 Godot 输入与导出资源是否匹配。
- 居民对话立绘、社区与演示入口，以及更完整的 Web、世界和桌面回归检查。

### Changed

- 产品、仓库、Web 插件、世界协议和 Windows 启动器统一更名为 QCode；Mosslight / 苔光之屿仍为世界名称。
- 新版本使用 `QCode.exe` 和 `%LOCALAPPDATA%\QCode\data`；首次启动在新目录不存在时迁移旧数据。旧路由、消息和教程存储身份保留兼容读取。

### Known limitations

- 仅发布 Windows 便携 ZIP，不发布未经完整安装、升级和卸载人工验收的安装 EXE，也不提供 macOS 下载。
- 未签名、无自动更新；需自行配置模型，并安装项目所需的 Git、Python 等工具。
- 真实模型任务、干净 Windows 系统、长安装路径与完整浏览器交互仍待验收。新旧数据目录同时存在时不会自动合并，需人工处理。

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
