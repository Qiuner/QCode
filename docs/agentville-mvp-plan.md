# Agentville 网页优先 MVP

## 目标

先把网页做成一个轻量的“居民工作台”：用户选择本地 Workspace，选择 Coder、Teacher 等居民，用自然语言交代一个小目标，居民复用真实 Harness Session 执行工作；Godot 只负责把状态变成可观察的居民、气泡和动画。

## MVP 闭环

```text
选择 Workspace
  -> 选择居民
  -> 复用或创建居民 Session
  -> 输入一句想法
  -> Session.prompt()
  -> Harness 执行工具/等待审批
  -> 网页读取 Session 状态
  -> Godot 展示居民状态
```

## 分层

- React 宿主：Workspace、居民选择、轻量输入框、错误提示和 `/workbench` 入口。
- Harness：Session、模型、工具、审批、文件修改和测试，保持唯一事实来源。
- Godot：场景、角色、移动、工作动画、状态气泡；不保存任务状态，也不直接调用 Harness。
- 居民绑定：第一阶段用 Workspace + ResidentId 映射 Session；后续迁移到持久化运行时投影。

## 当前落地范围

- 复用现有 Workspace 选择流程。
- 为选中的居民增加自然语言输入框。
- 通过 `ISession.prompt([{ type: 'text', text }], 'queue')` 把请求送入 Harness。
- 沿用现有运行中、完成、审批和失败状态，并把反馈显示在网页和 Godot 世界中。
- `/workbench` 继续作为完整 Harness 高级入口。

## 下一阶段

1. 为所有居民建立独立状态投影，而不是只从当前 Session 推导状态。
2. 将 `localStorage` 中的居民 Session 映射迁移到持久化运行时。
3. 扩展世界桥接协议，加入进度、审批、错误和通知事件。
4. 增加居民任务历史、恢复和“继续上次工作”。

## 明确不放进 MVP

Godot 内直接编辑代码、Godot 自己执行命令、第二套审批系统、复杂任务编排、多人协作和完整存档。
