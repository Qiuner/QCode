# Runtime patches

此目录只为无法通过 DSH/Cordis 公开插件接口实现的兼容补丁预留，当前没有生效的 runtime 补丁。

- 常规产品定制放在 `packages/agent-isles-web/`，不修改上游源码。
- 不手工修改 `vendor/dsh-runtime/` 中的 tarball。
- 新增补丁时必须记录目标包、固定版本、原因、应用方式和移除条件。
