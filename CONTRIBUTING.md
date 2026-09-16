# 为 agent-isles 做贡献

**简体中文** · [English](CONTRIBUTING.en.md)

感谢你愿意参与 agent-isles。项目仍处于早期开发阶段，提交前请先搜索已有 Issue；较大的功能、交互改版或架构调整建议先开 Issue 对齐范围。

参与社区即表示同意遵守[社区行为准则](CODE_OF_CONDUCT.md)。一般使用问题请查看[支持说明](SUPPORT.md)，安全漏洞请遵循[安全策略](SECURITY.md)私密报告。

## 开发环境

当前完整开发与发行验证以 **Windows 10/11 x64** 为基准；macOS / Linux 的完整开发流程尚未验收。只修改文档不必安装整套工具。

| 工具 | 版本要求或推荐基线 | 何时需要 |
| --- | --- | --- |
| Node.js | 推荐 **24.x**（Windows CI 使用 24）；仓库允许 `^22.19.0` 或 `>=24.0.0` | Web 开发、依赖安装和打包 |
| Yarn | 固定 **4.18.0**，通过 Corepack 调用 | 安装与运行 workspace 脚本 |
| Corepack | 仓库未固定版本；需支持上述 Yarn | 包管理器入口 |
| Git | 仓库未固定版本；推荐维护中的 Git for Windows 2.x，支持 submodule | 克隆、分支、提交 |
| Godot | **4.7.2 stable**，使用同版本 Web 导出模板 | 世界开发、首次完整源码启动和世界导出 |
| Blender | **5.2**（现有世界重建说明使用的版本） | 修改或重新生成模型；使用已有 GLB 不需要 |
| Python | **3.x**，仓库未固定最低小版本 | 字体、图片、模板下载工具及部分原生依赖编译 |
| Inno Setup | **6.x** | Windows 打包；当前总打包脚本同时生成 EXE 和 ZIP |
| .NET Framework | **4.x**，构建脚本使用系统 `v4.0.30319/csc.exe` | 编译 Windows Launcher |

Python 美术工具按需使用 Pillow、fontTools；目前没有统一锁定这些工具依赖的版本。原生依赖需要源码编译时，还可能需要 Visual Studio Build Tools 的 C++ 工具链与 Windows SDK。编辑器可选 VS Code 或其他工具，仓库没有强制版本。不要把推荐基线当作所有版本均已验证。

先检查命令是否可用：

```powershell
git --version
node --version
corepack --version
corepack yarn --version
```

## 从源码启动

外部贡献者先 Fork 仓库，再克隆自己的 Fork；下面是直接克隆官方仓库的示例。已有克隆可执行 `git submodule update --init --recursive` 补齐固定上游。不要使用 `--remote` 更新到上游最新版本。

```powershell
git clone --recurse-submodules https://github.com/Qiuner/agent-isles.git
cd agent-isles
corepack enable
corepack yarn install --immutable
corepack yarn check:upstream
corepack yarn check:vendored-runtime
```

首次启动需要先导出世界。安装 Godot 4.7.2 及匹配的导出模板，将 `godot` 加入 PATH，或在当前 PowerShell 中指定实际安装路径：

```powershell
$env:GODOT_BIN = 'C:\Tools\Godot\Godot_v4.7.2-stable_win64_console.exe'
& $env:GODOT_BIN --version
corepack yarn build:world
corepack yarn dev:web --no-open
```

每一步成功后再继续。`dev:web` 会构建 Web 插件并启动服务，不会自动导出世界。打开终端输出的本地地址，Ctrl+C 停止前台服务。修改 Web 后重新构建并重启，修改世界后重新导出；不要假定所有代码都有热更新。

开发数据默认写入仓库内的 `.agent-isles-home/`，不要提交该目录或带认证令牌的启动链接。真实 AI 任务需要自行配置模型；界面、文档及多数自动测试不需要模型 Key。任务可能修改文件，请选择专门的测试项目，并先检查会话权限设置。

若 `corepack` 不存在，先按 Node.js / Corepack 官方说明安装 Corepack。若 `install --immutable` 在 `fs-ext` / `node-gyp` 阶段失败，查看输出中的构建日志，确认 Python 和 C++ 工具链可用；不能把跳过构建脚本当作依赖安装成功。Godot 导出报缺少模板时，检查模板与引擎是否都为 4.7.2。

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

按改动领域选择入口：

- Web / Host 插件：[插件开发指南](packages/agent-isles-web/docs/plugin-development.md)。
- 新岛屿与世界交互：[岛屿接入契约](docs/world-integration-contract.md)、[世界开发说明](games/mosslight/README.md)。
- Windows 启动器与分发：[桌面说明](apps/desktop/README.md)。
- 文档：[文档门户](docs/README.md)、[文档维护指南](docs/documentation-guide.md)。

先阅读目标目录的 `AGENTS.md`。GitHub Pages 介绍站位于 `docs/index.html`、`docs/site.css`，与运行产品的小岛页面分开。

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

Web 行为改动还应运行相关测试；运行全部 Web 测试使用：

```powershell
node --test (Get-ChildItem packages/agent-isles-web/tests/*.test.mjs | ForEach-Object FullName)
```

Godot 改动按世界说明运行对应 `tests/*.gd`，单纯导出成功不等于交互验收通过。仅文档改动检查链接、内容与 `git diff --check` 即可。功能、验收结果或限制变化时同步 `docs/construction-plan.md` 及相关专项文档，区分“已实现待验收”和“已验收”。

根目录和桌面说明中的公开中英文文档按对维护。修改其中任一语言时，必须在同一变更中同步另一语言；`corepack yarn check:doc-i18n` 会检查当前工作区，GitHub CI 会检查 PR 或推送的提交范围。该检查只确认配对文件同时变更，内容是否准确对应仍需人工审阅。

## 提交与 PR

从最新默认分支创建工作分支，在自己的 Fork 推送后向本仓库 `master` 发起 PR。先用 `git diff` 检查修改，再明确暂存相关文件；不要混入个人数据或无关格式化。

提交标题使用 Conventional Commits，并同时提供中文说明和英文摘要：

```text
fix(web): 避免帮助入口遮挡关闭按钮 / Prevent help trigger from covering close button
```

每个提交只包含一组逻辑一致的变更。PR 描述需要说明关联 Issue、修改内容、验证证据、界面变化以及仍存在的限制。维护者可能要求拆分过大的 PR 或补充回归测试。

提交贡献即表示你有权提供相关内容，并同意按照仓库根目录的 [MIT License](LICENSE) 授权这些贡献。第三方内容仍须遵守其原始许可证，并在 Pull Request 中说明来源和授权条件。
