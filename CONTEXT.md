# QCode Domain Context

- **Workspace**: DSH 拥有的项目身份，关联一个真实项目目录。
- **Resident**: QCode 拥有的稳定居民身份，与具体 Session 分离。
- **ResidentBinding**: QCode 拥有的关联，记录一个 Workspace 中某位 Resident 当前复用的 Session；关联失效时必须显式报错，不能静默创建替代 Session。
- **Session**: DSH 拥有的对话与执行记录，归属于一个 Workspace。
