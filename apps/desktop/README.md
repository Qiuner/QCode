# QCode 桌面启动器（本地预览版）

**简体中文** · [English](README.en.md)

发行包内置 Node、固定 DSH 依赖、Web 插件和 Godot 导出资源，不需要源码、Yarn 或预先安装 Node。当前支持：

| 平台 | 产物 | 状态 |
| --- | --- | --- |
| Windows 10/11 x64 | 安装 EXE + 便携 ZIP | 已有 |
| macOS Intel（x86_64） | 便携 ZIP（`QCode.app`） | 已实现待发布 |
| macOS Apple Silicon（arm64） | 便携 ZIP（`QCode.app`） | 已实现待发布 |

## Windows 用户使用

运行 `qcode-setup-x64.exe`，安装后点击桌面或开始菜单中的 QCode。启动器等待服务和页面就绪后，使用当前认证链接打开默认浏览器；重复点击图标或通知区域的“打开小岛”复用同一服务。端口由系统自动分配，仅监听本机回环地址。

关闭浏览器不会终止正在进行的工作。要停止服务，请在通知区域的 QCode 菜单中选择“退出”。进程树放入 Windows Job Object，启动器正常退出或被终止时，其后台子进程一起清理。

Host 服务异常退出时，现有 Node 托管进程按 1、3、10 秒有限重试，保持本次启动已分配的端口，不重新提交任务。正常退出不重试，连续失败超过三次后显示停止提示。`service.log` 记录带时间的退出码和重试原因，并轮转、脱敏入口令牌；Launcher 本身退出仍由 Job Object 清理进程树。

个人数据位于 `%LOCALAPPDATA%\QCode\data`，安装文件位于 `%LOCALAPPDATA%\Programs\QCode`。首次启动时，若只有旧的 `%LOCALAPPDATA%\agent-isles` 数据目录，QCode 会将其整体迁移；若新旧目录同时存在则停止并提示人工处理，绝不覆盖。可用 `QCODE_DATA_HOME` 指定数据目录，旧的 `AGENT_ISLES_DATA_HOME` 仍兼容读取。卸载会保留个人数据。当前版本不覆盖已有安装目录，升级预览版前仍需先卸载旧程序。便携 ZIP 解压后也可直接运行，但不注册卸载项。

## macOS 用户使用

macOS 便携包尚未公开发布；当前可按下方构建说明在对应架构的 Mac 上生成。发布后，Intel Mac 使用 `qcode-darwin-x64.zip`，M 芯片 Mac 使用 `qcode-darwin-arm64.zip`。完整解压到较短路径后双击 `QCode.app`。启动器在菜单栏显示图标；就绪后打开默认浏览器。重复打开应用会通知已运行的实例重新打开小岛。退出请使用菜单栏「退出 QCode」。

个人数据位于 `~/Library/Application Support/QCode/data`，旧目录迁移与冲突处理规则同 Windows。预览版未签名：若 Gatekeeper 拦截，请右键打开或在系统设置中允许。当前不提供 `.pkg` 安装器与自动更新。

模型仍需用户自行配置；项目执行所需 Git、Python 等工具不包含在本安装包中。当前预览包未签名，没有自动更新和在线账号系统。

## 构建与验证

### Windows x64

```powershell
corepack yarn build:web
corepack yarn build:world
node apps/desktop/build.mjs
powershell -NoProfile -File apps/desktop/verify.ps1 -BuildDirectory (Get-Content dist/desktop-latest.txt)
```

构建使用 Windows 自带 .NET Framework C# 编译器和 Inno Setup 6（用户安装或系统安装，其他位置通过 `ISCC` 环境变量指定），将当前 Node 可执行文件和已安装依赖复制进包；依赖应先通过仓库锁文件安装。安装向导使用现代样式，采用 LZMA2 normal 压缩；安装包与便携包均排除类型声明及 JavaScript 调试映射，保留源码、包元数据和许可证。构建下载对应 Node 版本的许可证；发行运行不需要联网安装依赖。`dist/desktop-*/` 包含安装 EXE、便携 ZIP 和 SHA256 校验文件，均不提交 Git。开发者 home、凭证和项目不会复制到发行包。

验证脚本使用 Inno 静默安装到带空格的独立目录，记录安装耗时，通过 `/TESTINSTALL=1` 跳过卸载注册与快捷方式，避免影响已有安装。随后检查没有指向源码的链接，使用仓库外全新数据目录测试认证、首页、世界资源、退出清理、原生模块加载，以及旧数据迁移和新旧目录冲突。安装向导、桌面快捷方式、升级、卸载 UI 和完整模型工作流仍需发布前人工验收。

### macOS Intel / Apple Silicon

在目标架构的 Mac 上原生执行，不要从 Rosetta 终端构建。需已安装 Godot 4.7.2 与 Web 导出模板，或设置 `GODOT_BIN`：

```bash
corepack yarn build:web
corepack yarn build:world
corepack yarn build:desktop:darwin
corepack yarn verify:desktop:darwin
```

Swift 菜单栏启动器源码在 `apps/desktop/macos/Launcher.swift`，用系统 `swiftc` 编译（Command Line Tools 即可），最低系统版本固定为 macOS 13.5，与允许用于打包的 Node 24 官方二进制兼容边界一致。打包逻辑与 Windows 共用 `apps/desktop/pack-app.mjs`，复制当前架构的 Node 与原生依赖；Intel 和 Apple Silicon 必须分别在对应架构环境安装依赖、构建和验证。产物位于 `dist/desktop-darwin-*/`，含对应的 `qcode-darwin-x64.zip` 或 `qcode-darwin-arm64.zip` 与 `SHA256SUMS.txt`。验证覆盖二进制架构、冒烟就绪、退出清进程、单实例、原生模块加载与数据迁移。

在线版本需要另行设计账号认证和权限隔离；本地临时凭证不作为在线登录方案。

安装目录建议使用较短路径；当前深层依赖在过长的目标路径下可能出现 MoveFile code 3。类型声明及 JS 调试映射不包含在发行包中，需要调试依赖时使用开发环境。
