# 维护决策：网页产品界面与轻量 Windows Launcher

状态：已采用，尚未实施。

## 问题

agent-isles 的人物世界、对话和 Harness 工作台适合继续由 Web 承载，但面向普通 Windows 用户时，不能要求用户自行安装 Node/Yarn、运行命令并手动打开本地地址。同时，本机工作区、命令行、Godot 和 Blender 等能力仍需由本地 Harness Host 提供。

## 决定

- agent-isles 继续以网页作为唯一产品界面，不转为 Electron 或另一套桌面 UI。
- 保留 `/` 的 agent-isles 体验和 `/workbench` 的原版 Harness 工作台。
- 在核心 Web 工作流稳定后提供轻量 Windows Launcher，作为安装、启动和本地进程管理入口。
- Launcher 打包并启动固定版本的 DSH runtime，加载 agent-isles profile，等待健康检查通过后打开系统默认浏览器。
- Launcher 首版负责单实例、可用端口、启动失败提示和所启动子进程的退出清理。
- Launcher 不重新实现人物世界、聊天、设置、审批或 Harness 工作台。

## 实施时机

当前先完成 Workspace、Resident、Session、有效对话、工具执行和状态反馈闭环。待生产启动命令与 runtime 供应方式稳定后，再封装 Launcher，避免分发层反向约束产品功能开发。

## 后果

产品开发继续沿用 Web + Harness 插件路线，Launcher 不会造成第二套前端。最终用户可以通过一个 Windows 可执行入口启动本地能力并进入网页，同时保留系统浏览器的调试、可访问性和迭代优势。代价是发布流程需要额外处理 runtime 打包、进程生命周期、端口冲突、日志与 Windows 安装升级。
