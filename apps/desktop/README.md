# agent-isles Windows Launcher（预留）

此目录预留给未来的轻量 Windows Launcher，目前没有桌面应用实现。

Launcher 的职责将限定为：

- 启动固定版本的 DeepSeek Harness runtime 和 agent-isles Web profile；
- 等待本地 Web 服务健康后打开系统默认浏览器；
- 处理单实例、端口冲突、启动错误和所启动子进程的退出清理。

人物世界、对话、审批和 Harness 工作台继续由网页承载，不在这里复制一套桌面 UI。当前开发请使用根目录的 `corepack yarn dev:web`。
