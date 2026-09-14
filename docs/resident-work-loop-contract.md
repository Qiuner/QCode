# 居民工作闭环契约

居民是用户与 DSH Session 之间的交互入口。一次工作必须关联当前 Workspace 和居民身份；居民与 Session 为一对多关系。

## 生命周期

`unbound → ready → working → waiting-approval → completed | failed | interrupted`。

Host 保存关联和事实状态；Client 与世界只显示投影。刷新、断线或切换页面后按 Workspace、居民和 Session 标识恢复，不重发原任务。

## 入口与结果

选择居民时由 Host 校验 Workspace 归属并创建或恢复 Session。用户消息通过 DSH 原生 composer 发送。工具、审批和文件操作遵守 DSH 权限策略。完成后以 Deliverable 或明确失败原因作为结果，详情由工作台查看。

## 约束

所有改变状态的请求携带 `requestId` 和预期 `revision`；超时不得直接重试。居民提示词和世界消息不能替代 Host 的身份、归属和权限校验。
