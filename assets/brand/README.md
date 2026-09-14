# 品牌资源

此目录保存 agent-isles 共用的原始图标与 Web 角色资源。`android-chrome-512x512.png` 同时作为界面可用的最大尺寸 Logo，不另存重复副本；`q-portrait.png`、`file-keeper-portrait.png` 和 `teacher-portrait.png` 分别是 Q、阿澜和苔伯在居民界面与通知中使用的二维形象。

Web 构建通过 `scripts/copy-brand.mjs` 将图标与 Web 插件的 `static/site.webmanifest` 复制到插件 `lib/brand/`；Host 提供 `/agent-isles/brand/` 下的固定资源地址。浏览器标签图标全局使用项目品牌，不修改 DeepSeek Harness 上游文件及工作台内部 Logo。

Windows 构建将 `favicon.ico` 嵌入启动器和安装器，窗口与托盘使用可执行文件内的图标。更新源图后需重新构建 Web 和桌面发行包，不手工修改构建产物。
