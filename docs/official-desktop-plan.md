# 官方桌面接入施工

状态：实施中。现有产品 Host/Client 插件已在隔离官方桌面运行，原版角色卡片与世界资源通过；真实模型、审批、教程全程与安装包仍待验收。

## 固定输入

- 官方仓库：`deepseek-ai/deepseek-harness`。
- 发布标签：`dsh-v0.1.6-alpha.1`。
- 提交：`0a15e36e7f82b6ed45af6fa9759f29b40dcd965d`。
- `upstream.json.desktopTarget` 是接入目标；activeChannel 和 vendored runtime 仍为 0.1.3-alpha.1，不表示运行时升级已完成。
- 根目录运行 `corepack yarn upstream:desktop:prepare`，在忽略目录 `.yarn/upstream-desktop/<commit>/` 拉取隔离源码，验证标签提交与包版本；不修改上游源码。

## 2026-09-17 源码核验

以下结论来自上述固定提交，不使用移动中的 master 代替。

| 接入点 | 证据 | 判断 |
| --- | --- | --- |
| HTTP 服务 | 官方 `apps/desktop-host/config/desktop.cordis.patch.yml` 禁用 webserver；本项目 `src/index.ts`、tutorial、project-files 必需注入 webServer | 当前插件不能原样运行，领域逻辑需与 HTTP 适配解耦 |
| 世界资源 | 官方 `apps/desktop-host/src/index.ts` 的 assetHandler 只提供前端 dist 内资源和 `/plugins/`；未知文件回退首页 | `/world/` 不会自动接入，不能直接替换 URL |
| 插件资源 | 官方 `packages/client/modules/src/index.ts` 的 fetchBundle 提供登记的 bundle / source map；`packages/client/connection/src/rpc-host.ts` 的 fetch.register 提供 `/api` 下精确 Fetch 路由 | 世界文件使用共享 Fetch 注册，不使用 bundle 入口承载 |
| 桌面 origin | 官方 main 注册 standard、secure、supportFetchAPI 自定义协议；我们父子页面校验 origin 和窗口 | iframe 未判定不可行，需要 Electron 实测，禁止用放宽来源校验绕过 |
| 领域接口 | 居民恢复、模型测试校验 HTTP loopback socket；教程和文件使用自定义 HTTP 路由 | 优先核验公开 RPC 接入，保留归属、权限和身份校验 |

## 实施次序与验收

1. 资源通道：采用 `connection.fetch.register` 注册 `/api/agent-isles/world/` 下的精确文件路径，由官方共享 Fetch 通道承载，不把世界写入上游前端 dist 或禁用沙箱。
2. 最小桌面演示：加载一个真实 Godot 世界，验证 WASM MIME、PCK 与邻岛加载、iframe 握手、鼠标锁定和输入焦点。此阶段不接真实模型。
3. Runtime 与插件升级：成套更新 submodule、runtime、依赖与锁文件，执行类型、构建和回归；不能混用两套 DSH 服务实例。
4. 领域接入：迁移教程、项目文件、居民关联和模型测试接口；Web 仍可运行，桌面不再启动我们自己的 Launcher / Host。
5. 完整闭环：项目选择、Q 对话、工具审批、成果通知、关闭重开与历史恢复，分别记录各平台证据。

初始源码核验通过：目标源码拉取、标签提交 / 包版本核验、准备脚本语法检查、现有上游与 vendored runtime 校验。

## 协议与资源实验 · 2026-09-17

已执行：

- `corepack yarn upstream:desktop:prepare --install`：pnpm 11.7.0 冻结锁文件安装退出 0，但 Claude / Codex 原生 SDK 下载曾失败，不代表全部可选依赖可用。
- `corepack yarn upstream:desktop:prepare --electron --build` 与 `--shell-build`：Electron 44.0.0 下载、官方 native / Host / Client / Web 和桌面壳构建通过。
- `node scripts/probe-desktop-routes.mjs`：提取固定源码中的真实 assetHandler 执行，前端 dist 与 bundle 服务使用夹具。世界 HTML、WASM、PCK 和居民恢复路径均返回 200 / text/html 首页回退。这是路由函数隔离实验，不是完整 Host 请求验收。
- `scripts/probe-desktop-world.cjs`：用上述 Electron 44 可执行文件运行，采用官方相同 scheme privileges，保持 sandbox、contextIsolation 和禁用 nodeIntegration，加载当前真实 Godot 导出。增加仅用于实验的 `/world/` 静态处理器后，收到 world:ready、world:playable 和邻岛 ready；父子窗口及消息 origin 均为 `dsh-app://app`。offscreen 渲染使隐藏窗口也能推进场景；不代表人工视觉、键鼠或鼠标锁定验收。
- 官方 `--launch` 尝试两次均失败：开发 profile 准备对缺失的 `@anthropic-ai/claude-agent-sdk-win32-x64` 链接执行 stat，产生 ENOENT。普通冻结安装重试报告已最新，未修复该链接。未修改上游源码绕过。

复现 Electron 实验时，使用 `.yarn/upstream-desktop/<commit>/apps/desktop/node_modules/electron/dist/electron.exe` 启动根目录的 `scripts/probe-desktop-world.cjs`。测试每次使用独立 userData；结果位于忽略目录 `dist/desktop-world-probe/result.json`。路由实验结果位于 `dist/desktop-route-probe/result.json`，构建和启动日志位于 `dist/desktop-*.log`。

以上为第一轮结果；资源入口与启动问题的后续验证如下，生产 runtime 仍未切换。

## 正式入口与启动修复 · 2026-09-17

### 启动修复

实际缺失的是隔离 `node_modules` 中 Claude 0.3.263 和 Codex 0.153.4-win32-x64 的原生包内容，链接仍在。冻结安装以及 `--force --network-concurrency=1` 重试都未恢复。直接下载 npm 官方 tarball 后，逐一验证 SHA-512 与固定 `pnpm-lock.yaml` 完全一致，再解压恢复对应 virtual-store 包目录；没有改源码、锁文件或生产 vendor。下载器最初 error (23) 的底层原因尚未确定，不把单次修复描述为安装器问题已根治。

恢复后执行 `corepack yarn upstream:desktop:prepare --launch`，通过独立调试端口读取官方页面，实际显示 `DSH 本地构建`、`0.1.6-alpha.1-0a15e36`、新会话、工作区、设置和内测声明，origin 为 `dsh-app://app`。记录在 `dist/desktop-startup-result.json` 与 `dist/desktop-launch-repaired.log`；检查后已关闭本次桌面实例，未连接真实模型。

### 资源接入方案

官方 `packages/client/connection/src/rpc.ts` 公开 `ConnectionFetchRoute`；`rpc-host.ts` 的 `fetch.register` 注册精确路径，并随 Cordis Context 销毁移除。官方 desktop-host 已把 `/api/` 分派给 `connection.createSharedFetchHandler('/api')`，Web 也使用此处理器。因此不需要上游新增世界资源 API。

- 构建时形成允许发布的世界文件清单，插件启动时逐个登记 `/api/agent-isles/world/<相对路径>`，入口明确使用 `index.html`；相对引用可继续加载 JS、WASM、PCK 与邻岛。
- 正式处理器仅服务清单内文件，校验真实路径不越过世界根目录，提供正确 MIME、GET/HEAD、404 和取消/资源释放行为。后续最小 Host 插件已采用流式响应；大文件峰值内存仍待测量。
- 插件资源服务依赖 `connection`，移除强制 `webServer` 依赖；Web 旧 `/world/` 如需兼容，仅作为可选适配。品牌资源使用同样机制。
- 教程、项目文件、居民状态和模型测试迁入 `/api` 下的共享 Fetch 或官方 Typert Remote 服务。HTTP socket/origin 检查改由官方载体身份边界承担；业务仍校验会话归属、路径和权限，不能直接删除原检查后裸露接口。
- 父子页继续使用精确 origin 和 iframe 窗口校验。自定义协议下应跳过仅适用于 HTTP(S) 的 Service Worker 清理，并保留 Web 行为。

### 本轮实验与边界

用上述 Electron 44 可执行文件执行 `scripts/probe-desktop-world.cjs --shared-fetch`。脚本加载固定源码已构建的真实 `HostConnectionService`，注册世界文件后经共享 Fetch 处理器返回资源：真实主岛 playable、邻岛 ready、同源握手通过。结果位于 `dist/desktop-shared-fetch-probe/result.json`；同时检查 WASM HEAD、未知路径 404 与 Context 销毁后的路由移除。

此实验仍是隔离 Electron 载体，不是插件装入官方 Host 的管道端到端验证，也不覆盖载体身份认证。控制台发现 Service Worker 协议不支持错误，但未阻止世界 playable / 邻岛 ready；另有场景资源 UID 回退路径提示。未执行人工键鼠、鼠标锁定、模型调用或安装包验收。

上述为隔离实验的范围，后续真实管道验证如下；不等同于完整产品迁移完成。

## 最小 Host 插件与官方管道 · 2026-09-17

资源最小闭环：已验收（Windows 开发构建）。产品迁移整体仍为实施中。

- `scripts/fixtures/desktop-world-plugin/index.mjs` 是验证用 Host 插件，仅依赖 `connection`，不提供产品会话与教程功能。按导出文件清单注册精确路径，使用文件流返回内容，检查真实路径包含关系；请求取消与 Context 卸载会中止读取。
- `corepack yarn upstream:desktop:probe` 运行固定版本未改动的官方 Electron main、官方 Host 子进程及原生双向字节管道。生成独立 app/profile、DSH_HOME 和 userData，仅链接已构建的官方依赖；所有运行产物位于 `dist/official-desktop-probe/<时间戳>/`。不改上游源码、原开发 profile 或生产 vendor。
- 测试导航到插件提供的 `/api/agent-isles/preview` 独立页面，页面负责同源 iframe 和握手，不再临时覆盖官方工作台 DOM。保留严格 origin、消息版本和 iframe 窗口校验。验证后保存 `preview.png` 核对可见画面，默认关闭窗口并由官方生命周期停止 Host；`--preview` 则保留窗口供人工检查。
- 实际通过：WASM HEAD 为 200 / application/wasm 且无响应体；未知资源与未登记路径为 404；真实主岛 world:playable、邻岛 ready、world:ready/init 消息桥。资源插件单测覆盖完整字节读取、HEAD、缺失文件、符号链接越界、请求取消及卸载中止读取。
- 最终管道复验 `dist/official-desktop-probe/1789606750000/result.json`：PCK 读到首块后取消得到 AbortError，后续 HTML 请求为 200，随后世界加载通过。资源检查 604 ms，取消与后续请求 46 ms，世界达到主岛 playable 且邻岛 ready 用时 57,158 ms；这是本机单次样本，不是性能基准。测试退出码 0，官方 Host 已随壳关闭。

复现前置：运行 `upstream:desktop:prepare --install --electron --build --shell-build`，有完整世界导出，并先执行过官方 `--launch` 以建立开发依赖模板。可选 SDK 下载不完整时先按前述环境修复；probe 不自动下载或修补依赖。测试当前仅支持 Windows。`node --test scripts/fixtures/desktop-world-plugin/index.test.mjs` 运行处理器回归测试。

人工预览运行 `corepack yarn upstream:desktop:probe --preview`。预览页有独立背景与加载提示，可在原地址刷新；主岛就绪后隐藏提示，测试将窗口切到前台。此前用户看到官方工作台时，检查发现临时 iframe 仍存在并收到 playable，但文档处于 hidden、邻岛停在 waiting；截图触发的实际绘制已能看到小岛，不能用 playable 单独证明窗口画面正确。

Q 交互补齐：预览页原先未处理 `resident:selected`，导致按 E 无响应。`workbench.js` 现在只接收来自世界 iframe、同源、版本正确的 coder 选择事件，打开官方原生工作台 iframe。打开/关闭通过 `world:init.panelOpen` 同步世界输入状态；按钮或 Esc 返回小岛。两个 iframe 保留，不靠重新加载切换。已实际在 Q 附近输入 E，确认官方工作台出现。此入口没有原产品的居民会话绑定、教程、任务状态和通知同步；其余 NPC 功能仍未迁移，不能等同于完整对话系统。

持久预览复验 `dist/official-desktop-probe/1789608738249/result.json`：外部窗口伪造选择事件被拒绝、世界选择事件打开真实官方页面、返回后世界文档保持、再次打开后工作台文档保持，四项均通过；新窗口保持打开。处理器回归、脚本语法和 diff 检查通过，未执行真实模型任务。

独立预览复验通过，结果和实际画面位于 `dist/official-desktop-probe/1789607932062/` 的 `result.json`、`preview.png`：主岛、邻岛均完成，截图已人工核对，窗口保持打开。此次世界等待共 217 秒，期间窗口后台状态影响推进，激活原生窗口后完成；没有把后台加载或首屏耗时问题标记为已解决。处理器测试与脚本语法、diff 检查通过。

运行限制：初次世界初始化可能超过最初设置的 30 秒 CDP 等待；脚本对单次检查允许 120 秒，世界流程总期限为 300 秒，并关闭后台计时器节流。该调整是验证等待策略，不是性能优化。尚未测量正式安装包、内存峰值、人工键鼠与鼠标锁定；世界已有 Service Worker 自定义协议兼容项仍待处理。

此阶段之后已完成下述真实产品插件的隔离接入；生产 runtime 成套升级及项目选择、对话、审批、通知和重启恢复的完整验收仍待完成。当前生产 0.1.3-alpha.1 与 Web 启动路径未切换。

## 复用网页版产品插件 · 2026-09-17

已实现待验收。此前 E 打开整个官方工作台只是资源测试替代入口，不符合网页版功能一致的产品目标；产品预览改用 `corepack yarn upstream:desktop:probe --product --preview`，不加载该替代界面。

- `build-desktop-plugin.mjs` 从当前插件源码在隔离官方依赖图中编译 Host 与 Client，复用 `AgentIslesWorld`、角色对话、项目管理、教程、模型设置与原生聊天组件，不复制 UI。生产依赖仍固定旧版本，桌面实验编译不混入旧 runtime。
- 新增 `src/desktop.ts` 与 `desktop-transport.ts`：居民记录、文件浏览、教程与模型测试复用现有业务处理器，通过共享 Fetch 接入。只有校验过 `dsh-app://app` 的载体请求获得进程内 WeakSet 身份，不用可伪造请求头冒充 loopback；Web 原有检查仍保留。客户端仅按协议调整资源/API 路径。
- 教程持久化读取兼容旧版事件数组与新版 `{ events, eventState }`。独立构建配置须放在目标安装目录，避免 bundle 输出回源码目录导致官方客户端模块缺失。
- Windows 实测 `dist/official-desktop-probe/1789614376052/result.json`、`preview.png`：真实产品插件进入官方模块图，主岛和邻岛完成；来自世界 iframe 的 coder 选择事件打开原有角色卡片，世界文档保持。无项目时进入项目引导，这是现有 Web 逻辑；没有用测试绕过项目/API 配置。新窗口保留。
- 验证：`corepack yarn build:web` 通过；直接执行本地 TypeScript 的插件 noEmit 检查通过；桌面原生依赖图编译通过；desktop-transport、resident-recovery、project-files、tutorial、world-bridge 共 17 项测试通过。`corepack yarn workspace @agent-isles/web-plugin typecheck` 本机单独运行报找不到 tsc，未标为通过；等价本地编译器命令已验证。

剩余：实际项目创建/恢复、带会话 Q 聊天、模型调用、工具审批、后台通知、教程全程、其它 NPC 与安装包还需端到端验收。界面复用不代表功能全量已验收。测试使用焦点模拟保证后台验收推进，不代表后台渲染性能已修复。生产 pin/vendor 未切换。

原生聊天显示修复：官方新版聊天 slot 为 `main.conversation`，旧版为 `conversation`。原有 `NativeChat` 只定位旧 slot，导致已创建的原生输入框被小岛底层隐藏规则遮住。现同时匹配两种 slot，保持原生 React 树及会话不重建。当前官方桌面已有项目的 Q 面板实测：输入框、模型/权限/附件控件可见；关闭重开及 resize 后输入框仍在右侧区域，命中测试通过，世界文档保持。证据 `dist/native-chat-fixed.png`、`dist/native-chat-verification.json`。运行中旧 bundle 已应用等价样式热修复，后续源码构建包含正式改动。Web 构建及本地 TypeScript noEmit 通过；未发送真实模型请求。产品 probe 增加已有原生聊天座位时的输入框可见与边界断言，未以新建空 profile 替代带会话验收。
