# 桌面预览发行 CI 施工

状态：已实现待验收。工作流已落地并在 fork 完成 windows-2022 / macos-15 矩阵首跑（见下文证据）；上游仓库内的首跑需维护者（admin）触发，评审与合并待验收。

## 阶段与范围

- `.github/workflows/desktop-release-preview.yml`：仅 `workflow_dispatch` 手动触发，不自动发布、不创建 GitHub Release、不推送任何渠道。
- 矩阵：`windows-2022` → `windows-x64`；`macos-15` → `macos-arm64`。`fail-fast: false`，两平台独立判定，任何一方的通过都不替代另一方。
- 架构守卫：job 开始即以 `uname -m`、`node -p process.arch`（Windows 另加 `PROCESSOR_ARCHITECTURE` 与 `RUNNER_ARCH`）断言与目标矩阵一致，不一致立即失败；不凭 runner 标签推断 CPU。macOS 标签的实际架构以首跑守卫结果为准，通过后在本文件与 workflow 注释中固定。
- 构建：immutable 安装 → Godot 4.7.2（win64 / universal 固定 SHA-256）+ 官方校验和的 Web 导出模板（tpz 仅解出四个 web 变体，runner 默认不带模板）→ `build:world` + `build:web` → 各平台现有打包脚本（`apps/desktop/build.mjs` / `build:desktop:darwin`）。
- 冒烟：Windows 运行现有 `verify.ps1`（安装提取、外部链接检查、隔离数据、单实例、退出清端口），并额外从解包后的 `qcode-windows-x64.zip` 直接启动 `QCode.exe`，轮询 token 化 `browser-url.txt` 请求完整 URL（200/303），终止后断言端口释放；macOS 解包 zip 后把 `app/` 交给 `verify-darwin.sh`（含 Rosetta 拒绝门禁），并 `shasum -c SHA256SUMS.txt`。
- 产物：白名单上传 `qcode-*.zip`、`qcode-setup-x64.exe`、`SHA256SUMS.txt`；失败日志仅来自 runner 临时目录（`RUNNER_TEMP`），`QCODE_DATA_HOME` / 隔离数据全部位于临时目录。
- 汇总 job：输出各矩阵结果，并如实记录 **darwin-x64 未覆盖**（无真实 Intel runner，禁止 Rosetta 代产）。

## 验收证据

fork 首跑（https://github.com/ruijayfeng/agent-isles/actions/runs/35699586487 ，head `f778d5613e91f347303890f9c11d9a16283f31f1`）：

- 架构守卫：macos-15 输出 `runner.arch=ARM64`、`uname -m: arm64`、`process.arch=arm64`；windows-2022 输出 `runner.arch=X64`、`uname -m: x86_64`、`PROCESSOR_ARCHITECTURE=AMD64`。macOS arm64 标签按首跑结果固定为 `macos-15`。
- Windows（Microsoft Windows Server 2022）：`verify.ps1` 全过（安装提取、无外部链接、认证页面、正常 / 崩溃清理、单实例、原生模块、旧数据迁移 / 冲突），并从解包 ZIP 启动 `QCode.exe` 跟随 token 认证跳转得到 200，终止后端口释放。
- macOS：`verify-darwin.sh` 对解包 ZIP 全过（原生架构、冒烟就绪、退出清理、单实例、原生模块、迁移 / 冲突），`shasum -c SHA256SUMS.txt` 通过。
- 产物：`windows-x64-preview` 287,523,735 字节、`macos-arm64-preview` 139,974,843 字节（ZIP / 安装包 / SHA256SUMS 白名单）。
- 首跑发现并修复两个真实缺陷：`embedNodeRuntime` 只拷二进制导致官方动态链接 Node 产出坏包（补 `libnode.*.dylib`）；`Launcher.swift` 冒烟模式数据冲突经 `NSApp.terminate` 静默以 0 退出（改 `exit(1)`，否则 verify 冲突断言形同虚设）。

## 限制

- 自动冒烟不替代 #19 的真实模型端到端与干净机器人工验收。
- Dependabot / 第三方 action 版本固定为当前 major（checkout@v4、upload-artifact@v4）。
