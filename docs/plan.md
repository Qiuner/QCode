# 计划

## 当前阶段

- [x] 确定 DeepSeek Harness runtime 与独立 Web overlay 边界
- [x] 保留 agent-isles 与完整 Harness 两个网页入口
- [x] 建立 Godot 世界的同源静态入口与版本化消息协议
- [ ] 建立 Host 侧居民注册表与 Workspace / Session 映射
- [x] 将居民点击接到真实 Session 创建 / 恢复（首版浏览器持久化）
- [ ] 将 Session events 投影为居民状态

详细设计与验收点见 `world-web-plan.md`。

## 第二阶段

- 接入工具
- 加入任务交接
- 加入持久化
- 加入基础会话历史

## 第三阶段

- 教学工作流
- 角色成长 / onboarding
- 更丰富的世界交互

## 分发阶段

- [ ] 提供轻量 Windows Launcher，将固定版本的 DSH runtime、agent-isles profile 与生产启动流程封装为可双击入口
- [ ] 支持单实例、端口选择、健康检查、默认浏览器打开、启动错误提示与子进程退出清理
- [ ] 验证无需 Node/Yarn 开发环境即可安装并启动

Launcher 只解决安装、启动和本地进程管理，产品 UI 继续由 `/` 的 agent-isles 网页和 `/workbench` 的原版 Harness 工作台承载。托盘、自动更新与独立桌面窗口在首版验证完成后再决定。
