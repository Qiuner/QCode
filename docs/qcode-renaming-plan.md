# QCode 重命名施工方案

状态：已实现待验收。

本次重构将仓库、产品和自有代码从 `agent-isles` 统一为 **QCode**。它不是一次文本替换：产品品牌、内部标识、跨进程协议和用户数据路径按不同兼容要求分阶段迁移。`Mosslight / 苔光之屿` 是 QCode 中的世界名称，继续保留。

## 命名规范

| 用途 | 新名称 | 说明 |
| --- | --- | --- |
| 产品与界面 | `QCode` | 标题、菜单、安装器、文档和宣传内容 |
| URL、包、目录、文件 | `qcode` | 统一使用小写 kebab-case |
| TypeScript 类型与组件 | `QCode*` | 替换自有的 `AgentIsles*` 符号 |
| JavaScript 变量与全局桥 | `qcode*` | 替换自有的 `agentIsles*` 标识 |
| Godot 变量与方法 | `qcode_*` | 替换自有的 `agent_isles_*` 标识 |
| 世界 | `Mosslight` / `mosslight` | 保留世界、Godot 工程、场景和资产名称 |
| 核心角色 | `Q` | 保留现有角色名称与居民 ID `coder` |

`DeepSeek Harness`、`DSH_*` 和 `@deepseek-ai/*` 属于上游接口，不随产品重命名。

## 兼容边界

以下名称最终不应继续作为主要写入目标，但迁移期必须兼容读取：

- 浏览器 `localStorage` 中的 `agent-isles.*` 键：首次读取旧值后写入对应的 `qcode.*` 键，确认迁移后删除旧键。
- Host / Godot 消息来源和 `/api/agent-isles/*` 路由：两端切换为 `qcode-*` 与 `/api/qcode/*`，过渡期接受旧来源并为旧路由提供别名，避免缓存中的旧世界导出失联。
- 开发数据目录 `.agent-isles-home` 和桌面数据目录 `%LOCALAPPDATA%\agent-isles`：新版本以 QCode 路径为目标，启动时检测旧目录并执行可验证迁移；不能用空目录覆盖已有数据。
- Windows 安装器 `AppId` 和 macOS bundle identifier：它们是升级身份，不按普通变量处理。先通过安装升级测试确定是否保持稳定，再决定是否改变；若保留，必须在代码中注明这是历史兼容标识。
- DSH 教程存储 domain `agent_isles_tutorials`：这是已持久化的数据身份，当前保持不变以读取既有学习进度；若将来改为 QCode 名称，必须先设计并验证记录迁移，不能直接替换字符串。
- GitHub 的旧仓库和 Pages URL：仓库完成改名后再更新引用，并验证 GitHub 重定向、Pages、Release、Issue 与图片链接。

## 施工阶段

### 1. 品牌与文档

- [x] 将界面、HTML 元数据、README、中英文文档、Issue 模板和介绍网站中的产品名改为 QCode。
- [x] 将自有图片和计划文件中的 `agent-isles` 文件名改为 `qcode`，同步所有引用。
- [x] 保留历史记录中用于描述旧版本的名称；涉及当前命令、路径和行为的文档已更新。

验收：本地文档链接和中英文同步检查通过；介绍页在 1440px 桌面截图中品牌、Logo、导航和世界实景正常，浏览器调试协议下的真实 390px 视口无横向溢出，动态标题为 `QCode · 把想法，做成作品`。

### 2. Workspace 与 Web 插件

- [x] `packages/agent-isles-web/` 改为 `packages/qcode-web/`。
- [x] `@agent-isles/web`、`@agent-isles/web-plugin` 改为 `@qcode/web`、`@qcode/web-plugin`。
- [x] 将 TypeScript 文件、类型、组件、CSS data attribute 和测试夹具中的自有命名改为 QCode。
- [x] 使用 Yarn 重新生成 workspace 锁文件，不手工批量修改 vendor locator。

阶段性验收：`corepack yarn install --immutable --mode=skip-build`、`corepack yarn typecheck`、`corepack yarn build:web` 和 61 项插件 Node 测试通过；Yarn 保留既有 peer dependency 警告。

### 3. Web / Godot 协议

- [x] 新协议使用 `/api/qcode/*`、`qcode-host`、`qcode-world` 和 `qcode*` Bridge 名称。
- [x] Godot 脚本中的 `agent_isles_*` 符号、meta key 和测试一并重命名。
- [x] 为旧路由、旧消息来源和可能缓存的旧世界导出提供迁移期兼容，并为兼容分支增加测试。

验收：9 项消息桥与邻区下载测试、4 组受影响 Godot 场景测试、完整世界导出及新鲜度校验通过；Host 处理器、存储迁移与 Web 全套合计 61 项 Node 测试通过。

### 4. 启动器、安装包与数据迁移

- [x] Windows / macOS 应用、可执行文件、归档、安装器、快捷方式、日志和环境变量改用 QCode 命名。
- [x] 增加旧开发目录 `.agent-isles-home`、Host 状态文件、浏览器存储键和桌面用户数据目录的迁移策略与自动化测试。
- [x] 保持 Windows `AppId` 与 macOS bundle identifier 的升级身份稳定，并在构建配置中注明兼容原因。

验收：Windows `qcode-setup-x64.exe` 与 `qcode-windows-x64.zip` 构建通过；安装提取、认证页面、世界资源、退出清理、单实例、原生模块、旧数据迁移及双目录冲突验收通过。macOS 构建与验证脚本已同步，但本机不是 macOS，未执行原生构建。

### 5. 仓库与发布入口

- [x] GitHub 仓库改名为 `QCode`；本地 checkout 目录在当前任务结束前保留原路径，避免使活跃工作区失效。
- [x] 更新 Git remote、Pages、Actions、Release、Issue、SUPPORT、投稿链接及所有徽章。
- [x] 全仓定点搜索旧名称；只保留迁移代码、兼容测试、历史说明和稳定安装身份中有注释的旧值。
- [x] 增加 `check:qcode-naming` 命名守卫并接入 CI，禁止旧包作用域、组件与 camelCase/snake_case 自有标识、DOM 命名空间、发行产物名、仓库 URL 和旧命名文件重新进入当前代码；仅精确放行旧世界桥别名和教程持久化 domain。

阶段性验收：GitHub API 确认公开仓库为 `Qiuner/QCode`，remote 已更新，主分支保护规则保持不变；新 Pages 路径返回 200，旧 Pages 路径返回 404。源码构建和 Windows 发行包冒烟通过。重命名提交的远端 CI 与线上 Pages 新内容仍待验收；macOS 原生包仍待对应环境验证。

2026-09-18 补充复验：immutable 安装（保留既有 DSH peer 警告）、上游与 runtime 校验、类型检查、Web 构建、61 项插件测试、23 项启动/迁移/文档及辅助测试、世界导出哈希、Godot 4.7.2 资源导入和 7 个 CI 场景通过。开发目录迁移测试已加入 CI；CI YAML 解析通过。`check:qcode-naming` 覆盖当前 446 个仓库文件，`check:doc-i18n` 与 `git diff --check` 通过。此为本地复验，不代表远端 CI 已执行。

隔离运行时验收：使用临时 `DSH_HOME` 和 3081 端口运行 `corepack yarn dev:web --no-open --port 3081`；认证入口返回 303，带会话 Cookie 的首页、QCode favicon、世界 HTML、WASM 与 PCK 均返回 200，资源类型正确。临时服务已停止，原有 3080 服务未受影响。未在本轮验证真实浏览器 WebGL 绘制或模型请求。

## 原子提交顺序

每个阶段可拆为多个提交，但一个提交只包含一类可独立验证的变化：品牌文案、文件与包结构、Web 内部符号、跨端协议兼容、桌面与数据迁移、仓库及发布链接。重命名提交使用 Git 可识别的移动，避免同时夹带无关格式化。

## 执行 loop

后续每一轮只处理一个命名边界，并按同一顺序闭环：

1. 读取该边界的当前入口、持久化标识与测试，列出必须保留的兼容值。
2. 修改当前写入目标和自有符号；旧值只允许出现在迁移读取、兼容别名、稳定安装身份及对应测试中。
3. 运行该边界的最小类型检查、单元测试或构建，再执行 `check:qcode-naming` 与 `git diff --check`。
4. 检查 diff 和旧名称搜索结果；发现跨边界影响时记录到下一轮，不顺带扩大本轮修改。
5. 验证通过后形成一个原子提交候选，并在施工索引记录实际证据与限制。

推荐轮次依次为：品牌与文档、workspace 与文件结构、Web 内部符号、Web/Godot 协议、桌面身份与数据迁移、仓库及发布入口、最终全链路验收。提交、推送、GitHub 仓库设置和发布均需用户明确指令，且各自单独执行。

## 完成条件

- 当前产品界面、代码符号、文件与目录、包名、构建产物和发布入口统一使用 QCode。
- Mosslight 仍作为世界名称正常构建运行。
- 已有浏览器状态、开发数据和桌面用户数据有经过测试的兼容迁移路径。
- 旧名称搜索结果只剩明确记录的历史文本、兼容读取或稳定应用身份。
- Web、Godot、桌面构建及相关测试均通过，施工总索引记录实际验证和仍存在的限制。
