# Mosslight 世界约束

- 本目录同时保存 Blender 可编辑源文件、Godot 工程、资源生成脚本、游戏测试和 Web 导出配置。
- Godot 只呈现世界和居民状态，不直接调用 Harness、执行工具或持久化 Workspace、Session 和任务真相。
- 保持 Blender 生成脚本、可编辑 `.blend` 源文件、导出的 GLB 和 Godot 场景之间的来源关系清楚。
- 新增中文 UI 文案后运行字体检查；不要依赖用户系统字体。
- `build/`、`captures/`、`.godot/`、备份 `.blend1/.blend2` 和本地日志是生成产物，不提交。
- 改动 GDScript、场景或资源后运行最接近的 `tests/*.gd`；只有影响网页导出时才运行根目录的 `corepack yarn build:world`。
- 不在没有必要时重新生成全部美术资产；生成脚本可能覆盖对应 `.blend` 和 GLB 文件。
