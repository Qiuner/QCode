# 维护决策：采用 DSH 插件 API 作为运行边界

状态：已采用。

## 问题

Agentville 需要接入消息、取消、Workspace、Session、工具和审批。另设一层通用运行时接口会重复包装大部分 DSH API，同时增加两套概念和维护成本。

## 决定

- 当前以固定版本的 DSH/Cordis 公开接口作为真实运行边界。
- Agentville 以 Host/Client 插件组合进 DSH Web profile，不修改上游源码。
- React 继续复用官方 Workspace、Session、conversation、approval 和 UI slots。
- Agentville 自己拥有居民领域能力：Resident 定义、Resident 与 Session 映射、角色配置、状态投影和任务交接。
- Godot 只负责世界呈现，通过版本化、同源消息协议与 React 交换展示状态和居民选择，不直接执行工具或保存会话真相。
- 不保留独立的 Agentville runtime 接口或实现包。

## 依据

DSH Desktop 采用相同方向：官方 DSH Host 是运行核心，产品能力通过 Cordis Host/Client 插件加入；只为自身拥有的稳定领域能力公开窄服务，不在 DSH 外重建 Agent、Session 和工具体系。

## 后果

当前实现可以完整复用 DSH 的会话、审批、工具和持久化能力，减少重复抽象。代价是 Agentville v1 与所固定的 DSH API 版本绑定；版本升级必须通过兼容测试。
