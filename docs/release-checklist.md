# 发布检查清单

本清单用于 agent-isles 的公开预览版和 Windows 安装包发布。每次发布只记录本次实际证据，不沿用历史验证结果。

## 仓库与社区

- [ ] 根目录已有明确的 `LICENSE`，README 与发布页标注一致。
- [ ] GitHub Private Vulnerability Reporting 已启用，`SECURITY.md` 中的入口可用。
- [ ] 默认分支启用保护规则，合并前必须通过 CI，禁止 force push。
- [ ] `bug`、`enhancement`、`documentation`、`dependencies`、`good first issue` 和 `help wanted` 标签已创建。
- [ ] Issue 表单、PR 模板、贡献指南和行为准则在 GitHub 上显示正常。

## 版本与变更

- [ ] 版本号、tag 和发布标题一致。
- [ ] `CHANGELOG.md` 已将本次内容从 `Unreleased` 整理到对应版本。
- [ ] 发布说明区分新增、修复、破坏性变更与已知限制。
- [ ] README、专项施工文档和 `docs/construction-plan.md` 与实际交付状态一致。
- [ ] `deepseek-harness` commit、`upstream.json` 与 vendored runtime 一致。
- [ ] Git 工作区干净，发布提交不包含本地状态、临时文件或调试输出。

## 自动检查

```powershell
corepack yarn install --immutable
corepack yarn check:upstream
corepack yarn check:vendored-runtime
corepack yarn typecheck
corepack yarn build:web
node --test (Get-ChildItem packages/agent-isles-web/tests/*.test.mjs | ForEach-Object FullName)
git diff --check
```

- [ ] 上述命令全部通过，失败项已有明确阻断结论，不能以旧结果替代。
- [ ] 受改动影响的 Godot 测试、浏览器交互和窄屏布局已额外验证。

## 第三方内容

- [ ] Node.js、Yarn、DSH runtime、Godot、字体、模型、音频和其他素材允许当前分发方式。
- [ ] 必需的许可证、NOTICE 和来源信息随发布物提供。
- [ ] 安装包不包含开发数据、模型凭证、API Key、访问令牌或用户项目。
- [ ] 对仓库和待发布文件执行敏感信息检查。

## Windows 发布物

```powershell
corepack yarn build:web
corepack yarn build:world
node apps/desktop/build.mjs
powershell -NoProfile -File apps/desktop/verify.ps1 -BuildDirectory (Get-Content dist/desktop-latest.txt)
```

- [ ] 安装 EXE、便携 ZIP 和 `SHA256SUMS.txt` 均已生成并相互匹配。
- [ ] 在干净的 Windows 10/11 x64 环境完成安装、首次启动、重复启动、退出和卸载验证。
- [ ] 验证项目选择、模型配置、一次真实任务、人工审批和数据保留。
- [ ] 未签名时，发布页和安装说明醒目标注预览风险；不得暗示已完成代码签名。
- [ ] 自动更新未实现时，发布说明写明升级和回滚步骤。

## macOS Intel 发布物

```bash
corepack yarn build:web
corepack yarn build:world
corepack yarn build:desktop:darwin
corepack yarn verify:desktop:darwin
```

- [ ] `agent-isles-darwin-x64.zip` 与 `SHA256SUMS.txt` 已生成并相互匹配。
- [ ] 在干净的 macOS Intel 环境完成解压、首次启动、重复启动、菜单栏退出与进程清理验证。
- [ ] 验证项目选择、模型配置、一次真实任务、人工审批和数据保留。
- [ ] 未签名时，发布页醒目标注 Gatekeeper / 预览风险；不得暗示已完成公证。
- [ ] 明确本预览不含 Apple Silicon 专用包与 `.pkg` 安装器。

## 发布后

- [ ] 从 GitHub Release 下载公开产物并重新核对 SHA-256。
- [ ] README 下载链接和安装说明指向正确版本。
- [ ] 创建一次最小安装冒烟测试记录。
- [ ] 监控首批 Bug 与安全报告；高风险问题必要时撤下发布物并发布说明。
