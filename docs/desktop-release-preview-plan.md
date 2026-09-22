# 桌面预览发行 CI 施工

状态：实施中。跟踪 [issue #18](https://github.com/Qiuner/QCode/issues/18)。工作流已编写，待 fork 与上游首跑证据后转"已实现待验收"。

## 阶段与范围

- `.github/workflows/desktop-release-preview.yml`：仅 `workflow_dispatch` 手动触发，不自动发布、不创建 GitHub Release、不推送任何渠道。
- 矩阵：`windows-2022` → `windows-x64`；`macos-15` → `macos-arm64`。`fail-fast: false`，两平台独立判定，任何一方的通过都不替代另一方。
- 架构守卫：job 开始即以 `uname -m`、`node -p process.arch`（Windows 另加 `PROCESSOR_ARCHITECTURE` 与 `RUNNER_ARCH`）断言与目标矩阵一致，不一致立即失败；不凭 runner 标签推断 CPU。macOS 标签的实际架构以首跑守卫结果为准，通过后在本文件与 workflow 注释中固定。
- 构建：immutable 安装 → Godot 4.7.2（win64 / universal 固定 SHA-256）→ `build:world` + `build:web` → 各平台现有打包脚本（`apps/desktop/build.mjs` / `build:desktop:darwin`）。
- 冒烟：Windows 运行现有 `verify.ps1`（安装提取、外部链接检查、隔离数据、单实例、退出清端口），并额外从解包后的 `qcode-windows-x64.zip` 直接启动 `QCode.exe`，轮询 token 化 `browser-url.txt` 请求完整 URL（200/303），终止后断言端口释放；macOS 解包 zip 后把 `app/` 交给 `verify-darwin.sh`（含 Rosetta 拒绝门禁），并 `shasum -c SHA256SUMS.txt`。
- 产物：白名单上传 `qcode-*.zip`、`qcode-setup-x64.exe`、`SHA256SUMS.txt`；失败日志仅来自 runner 临时目录（`RUNNER_TEMP`），`QCODE_DATA_HOME` / 隔离数据全部位于临时目录。
- 汇总 job：输出各矩阵结果，并如实记录 **darwin-x64 未覆盖**（无真实 Intel runner，禁止 Rosetta 代产）。

## 验收证据（待首跑）

- 首跑需人工核对：守卫输出的实际 `uname -m` / `process.arch` 与矩阵一致；两平台产物 ZIP + SHA256SUMS 下载校验；冒烟日志。
- 结果与限制记录在 `docs/construction-plan.md` 对应条目。

## 限制

- 自动冒烟不替代 #19 的真实模型端到端与干净机器人工验收。
- Dependabot / 第三方 action 版本固定为当前 major（checkout@v4、upload-artifact@v4）。
