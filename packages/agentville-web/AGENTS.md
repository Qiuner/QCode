# Agentville Web 插件约束

- 本目录拥有 Agentville Host/Client 插件、Web overlay、居民交互和 React/Godot 消息桥。
- Host 能力放在 `src/index.ts`；浏览器能力放在 `src/client/`。
- 优先使用 DSH/Cordis 的公开 API、slot 和 patch，不修改或复制上游 Web UI。
- `/` 是 Agentville 产品入口；`/workbench` 必须保留原版 Harness 的名称、图标、布局和完整工作台。
- Harness 继续拥有 Workspace、Session、工具、审批和持久化；Godot 只负责呈现与交互投影。
- 修改跨 iframe 消息时，同步更新 `world-bridge.ts` 的类型和两端校验。
- 组件样式留在本插件内；不要用无范围的选择器影响 `/workbench`。

验证：运行 `corepack yarn workspace @agentville/web-plugin typecheck`；改变构建输出或插件入口时再运行 `corepack yarn build:web`。
