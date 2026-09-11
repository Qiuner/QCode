# agent-isles 仓库约束

Node.js `^22.19.0` 或 `>=24.0.0`，通过 Corepack 使用 Yarn `4.18.0`。

## 目录

| 目录 | 职责 |
| --- | --- |
| `apps/web/` | 启动 DSH Web profile |
| `apps/desktop/` | 未来轻量 Windows Launcher，当前未实现 |
| `packages/agent-isles-web/` | agent-isles Host/Client Web 插件 |
| `games/mosslight/` | Blender 与 Godot 世界 |
| `deepseek-harness/` | 固定版本的上游 Git submodule |
| `vendor/dsh-runtime/` | 固定并校验过的 DSH runtime 包 |

## 规则

- 不修改 `deepseek-harness/`；上游操作只使用根目录的 `upstream:*` 脚本。
- 不手工编辑 `vendor/dsh-runtime/` 中的 tarball 或 manifest。
- 保留用户已有修改，不做与当前需求无关的重构或格式化。
- 不提交本地状态和构建产物；遵循各目录的 `.gitignore`。
- 未经用户明确要求，不执行 `git add`、`git commit`、`git push`、创建分支或改写历史。
- 提交标题使用 `type(scope): 中文说明 / English summary` 格式的 Conventional Commits。
- 每个提交只包含一组逻辑一致的变更；不同性质的改动必须分别暂存和提交。
- 提交前检查 staged diff，排除无关文件、生成物、调试输出和未说明的格式化。

## 常用命令

- 安装：`corepack yarn install --immutable`
- 启动：`corepack yarn dev:web --no-open`
- 类型检查：`corepack yarn typecheck`
- Web 构建：`corepack yarn build:web`
- 世界导出：`corepack yarn build:world`
- 上游校验：`corepack yarn check:upstream`
- runtime 校验：`corepack yarn check:vendored-runtime`

修改后运行与改动直接相关的最小检查和 `git diff --check`，不要声称未运行的检查已通过。架构说明与长期决策分别维护在 `docs/` 和 `.agents/notes/`。
