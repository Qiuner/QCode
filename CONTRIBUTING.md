# 为 agent-isles 做贡献

感谢你愿意参与 agent-isles。项目仍处于早期开发阶段，提交前请先搜索已有 Issue；较大的功能、交互改版或架构调整建议先开 Issue 对齐范围。

参与社区即表示同意遵守[社区行为准则](CODE_OF_CONDUCT.md)。一般使用问题请查看[支持说明](SUPPORT.md)，安全漏洞请遵循[安全策略](SECURITY.md)私密报告。

## 开发环境

- Windows
- Node.js `^22.19.0` 或 `>=24.0.0`
- 通过 Corepack 使用 Yarn `4.18.0`
- Git（包含 submodule 支持）
- 修改 Godot 世界时使用 Godot `4.7.x`

```powershell
git clone --recurse-submodules <repository-url>
cd agent-isles
corepack enable
corepack yarn install --immutable
corepack yarn dev:web --no-open
```

打开终端输出的本地地址。开发数据默认写入仓库内的 `.agent-isles-home/`，不要提交该目录。

## 选择贡献方式

- 可复现的错误请使用 Bug 报告，并附环境、步骤和脱敏日志。
- 新能力或明显改变用户流程的方案请先使用功能建议讨论。
- 小型文档、拼写和测试修复可以直接提交 PR。
- 安全问题不要公开到 Issue；请先查看仓库 Security 页面是否提供私密报告渠道。维护者在正式公开仓库前应启用该渠道并发布安全策略。

使用支持、安全报告和社区行为要求分别见 [SUPPORT.md](SUPPORT.md)、[SECURITY.md](SECURITY.md) 与 [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)。

## 代码边界

- 产品 Web 代码位于 `packages/agent-isles-web/`，启动 profile 位于 `apps/web/`。
- Windows 启动器和本地预览版位于 `apps/desktop/`。
- Godot 与 Blender 世界位于 `games/mosslight/`。
- 不直接修改 `deepseek-harness/` submodule。
- 不手工编辑 `vendor/dsh-runtime/` 中的 tarball 或 manifest。
- 不提交 `.agent-isles-home/`、构建产物、临时截图、编辑器缓存或个人配置。

## 实现与验证

保持改动聚焦，并遵循现有代码风格。根据改动范围运行最小且相关的检查：

```powershell
corepack yarn typecheck
corepack yarn build:web
corepack yarn build:world
corepack yarn check:upstream
corepack yarn check:vendored-runtime
git diff --check
```

不需要每次运行全部命令，但 PR 必须准确列出实际执行的验证。界面改动应附桌面和相关窄屏尺寸的截图或录屏；交互修复应说明复现方式和修复后的结果。

## 提交与 PR

提交标题使用 Conventional Commits，并同时提供中文说明和英文摘要：

```text
fix(web): 避免帮助入口遮挡关闭按钮 / Prevent help trigger from covering close button
```

每个提交只包含一组逻辑一致的变更。PR 描述需要说明关联 Issue、修改内容、验证证据、界面变化以及仍存在的限制。维护者可能要求拆分过大的 PR 或补充回归测试。
