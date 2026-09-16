# agent-isles Web 插件约束

- 本目录拥有 agent-isles Host/Client 插件、Web overlay、居民交互和 React/Godot 消息桥。
- Host 入口与服务注册放在 `src/index.ts`，领域实现放在 `src/` 下对应模块；浏览器能力放在 `src/client/`。
- 优先使用 DSH/Cordis 的公开 API、slot 和 patch，不修改或复制上游 Web UI。
- `/` 是 agent-isles 产品入口；`/workbench` 保留原生 Harness 工作台内部的名称、Logo、布局和功能。浏览器标题、favicon 等全局品牌可使用 agent-isles，不替换 Harness 工作台内部 Logo。
- Harness 拥有 Workspace、Session、工具、审批及其持久化；agent-isles 管理并持久化居民关联、教程学习记录等自身领域数据，不另建 DSH 会话与执行历史；Godot 只负责呈现与交互投影。
- 修改跨 iframe 消息时，同步更新 `world-bridge.ts` 的类型和两端校验。
- 组件样式留在本插件内；不要用无范围的选择器影响 `/workbench`。
- 新增或修改用户可见文案时，复用现有语言服务并同步维护中英文语言字典；检查两种语言下的显示和切换，不将单一语言文案硬编码到界面。

验证：运行 `corepack yarn workspace @agent-isles/web-plugin typecheck`；改变构建输出或插件入口时再运行 `corepack yarn build:web`。
