# Mosslight Isle · 苔光之屿

一个以场景和角色美术为优先的 3D 微缩岛屿原型。Blender 制作模型，Godot 驱动探索和「回响」玩法。苔光岛、晴沙绿洲、角色与合成音频在本项目内生成；第三地块「溪间庭院」改编自 AC 的 MIT 项目 xi4u，保留原作者署名与许可证。未使用《塞尔达传说》的角色、模型或音乐。

## 直接试玩

Windows 双击 **Play.cmd**。启动器优先使用本机已有的 Godot 4.7.2，也支持 PATH 中的 `godot.exe` / `godot4.exe`。首次运行会导入资产，然后打开游戏。

也可以用 Godot 4.7.2 打开 `project.godot`，按 **F5**。无需 Node、Yarn 或运行 agent-isles。游玩不需要联网。

## 网页试玩与部署

本机双击 **Play-Web.cmd**，会启动本地 HTTP 服务并打开 `http://127.0.0.1:8068/`。点击“进入世界”后可使用同一套键鼠操作。入口使用 agent-isles 标题和三岛实景全景，加载进度与重试信息按需显示。启动器需要 Python；有现成导出文件时不需要再运行 Godot。

网页版本使用 WebGL 2 Compatibility 渲染和单线程 WebAssembly，直接复用 GDScript 的移动、跳跃、碰撞、复制和拾取逻辑。Esc 释放鼠标并暂停 / 继续；切换到其他页面自动暂停，点击游戏画面或按 Esc 恢复。中文字体子集随游戏分发，不要求玩家安装字体或 Godot。

在游戏目录中重新导出：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools/build_web.ps1
```

若换电脑，先在 Godot 中安装 **4.7.2** 导出模板，或运行 `python tools/fetch_web_template.py`（仅下载官方归档中的两个 Web 单线程模板）。自定义引擎路径可通过 `-Godot '完整路径'` 传入构建脚本。

更新加载封面时，在仓库根目录运行 `godot --path games/mosslight --script res://tools/render_cover.gd`（需要显卡渲染，不能加 `--headless`），再运行 `python games/mosslight/tools/encode_cover.py`（需要 Pillow）。前者从三岛场景渲染 3840×1564 的源图到忽略目录 `build/cover-source.png`，后者生成 1920、2560、3840 三档 WebP；网页通过 `srcset` 按屏幕宽度与像素密度选择。之后重新导出世界，两套 Web 导出脚本都会复制全部封面。

将 **build/web/** 内全部文件部署到任意支持 HTTPS 的静态网站，保留文件之间的相对路径。构建脚本还会生成 **build/mosslight-web.zip**，可用于上传部署。可在现有网页中通过 iframe 嵌入：

```html
<iframe src="/mosslight/index.html" title="苔光之屿"
  style="width:100%;height:90vh;border:0" allow="autoplay; fullscreen"></iframe>
```

正式网站需要 HTTPS；本机 localhost HTTP 可测试。`.wasm` 应以 `application/wasm` 返回；`web/_headers` 为 Netlify / Cloudflare Pages 提供对应配置。单线程构建无需 COOP/COEP 跨域隔离头。不能直接双击导出的 HTML 用 `file://` 游玩。当前未发布到公网。

当前未压缩网页资源约 55 MB（其中引擎 WASM 约 40 MB），部署压缩包约 25 MB。静态服务器启用 Brotli / gzip 可减少传输量。网页仍以电脑键盘为目标，尚未实现手机触控摇杆。

| 按键 | 操作 |
| --- | --- |
| WASD / 方向键 | 相对镜头移动 |
| 空格 | 跳跃 |
| Shift | 按住奔跑 |
| 1 / 2 / 3 | 俯视角 / 第三人称 / 第一人称 |
| V | 循环切换三种视角，保留位置与关卡进度 |
| 鼠标 | 第一、第三人称点击画面锁定鼠标观察；也可按住左键或右键拖动 |
| E | 靠近木箱、木板或弹跳蘑菇学习回响；居民与园艺互动 |
| F | 拿出当前回响，再按放置；新学会时直接显示预览。所有回响合计最多 6 个，第 7 个替换最早的造物 |
| C | 循环选择已学会的回响，并显示预览 |
| T | 木板预览转向 90° |
| 鼠标右键 | 收起当前回响，保留已放置的造物 |
| Q | 撤回最后一个造物，无论当前选择哪种回响 |
| 滚轮 | 俯视角缩放；第三人称调整跟随距离；第一人称不变焦 |
| Tab | 隐藏 / 显示界面 |
| M | 静音 / 恢复声音 |
| N | 开启 / 关闭环境动态；网页默认遵循系统的减少动态设置 |
| B | 开启 / 关闭第一人称镜头与持灯手部动态，脚步声仍保留 |
| I | 打开 / 关闭背包；打开时暂停，Esc 也可关闭 |
| G | 将水壶拿在手上 / 收回背包 |
| R | 重置整个关卡 |
| Esc | 释放鼠标并暂停 / 继续；桌面版关闭窗口退出 |

第一、第三人称的 WASD 相对镜头移动，A / D 横移；木箱始终放在镜头朝向前方的地面，不跟随横移动作转向。第三人称镜头遇到屋顶、树冠或墙壁会收近。第一人称显示持灯手部，按实际步行距离产生轻微起伏和脚步声；奔跑时视野从 70° 平滑增加至最多 73°，落地有短暂下沉缓冲。停止或撞墙时反馈停止，跳跃腾空不播放步行音。B 关闭镜头和手部动态，网页初始遵循系统的减少动态设置；M 可静音。持灯模型目前是 Godot 网格组成的表现模型，没有抓取、挥动或骨骼动画。

网页鼠标锁定需要点击游戏画面；Esc 或切走页面会释放鼠标并暂停，点击画面可继续。若浏览器不允许锁定，页面会显示提示，仍可按住左键或右键拖动观察。视角切换不会自动申请锁定。桌面版使用相同操作。

## 自由探索

三岛直接开放探索，没有收集萤光或唤醒月井的剧情、任务面板与完成条件。月井保留为场景装饰。居民提供日常对话，也可以种花、散步或搭建木箱。

靠近出生点左前方石座上的木箱，按 E 学习回响。用 F 放置木箱，可以搭出登上北侧石台的落脚点。

溪间庭院月门内侧的空地上有可学习的木板，西岸南侧草坪上有弹跳蘑菇；原物件脚下的暖色光圈标明学习点。学会后立即拿出预览，C 切换回响，右键收起；切换水壶或打开背包也会收起。回响是本次游玩学会的能力，不消耗背包格子，重开后需重新学习。

木板长 3.6 米，可以搭在木箱上或连接两处等高支撑，T 调整方向；中心有支撑或两端同时有支撑才能放置，并检查整块木板是否穿过障碍。蘑菇在玩家落到顶面时自动弹起，也能放在木箱上提高起跳点。西北侧的「听风台」可以沿阶梯架木板过去、借木箱垫脚，或用蘑菇弹上去；没有指定解法，登台后按 E 看看风景。新增道具与观景台为 Godot 程序化几何，保留原有 Blender / GLB 资产不变。

薄荷色预览代表可放置，珊瑚色代表空间被占用。可以叠放木箱，Q 撤回；没有生命损失或时间压力。

## 高台计算机

月井高台中央新增蓝色屏幕计算机和两条软管机械臂。走到高台正前方石径，出现提示后按 E，机械手会伸出、夹住玩家两侧，抬升越过台沿并放到台前。放下后继续自由行走，可从台边跳下再次使用。

台前被木箱占用时不会启动；途中遇到障碍会就地放开。Esc 暂停、背包暂停及网页居民面板会暂停搬运，恢复后继续。当前仅抓玩家，不抓居民；台前可使用 Q 的开发对话入口。

空闲时，Q 每隔 20～40 秒交替整理两条机械臂。玩家进入台前约 6 米范围时挥手招呼，离开 8 米才重新计算一次靠近，招呼间隔至少 35 秒；附近无人约一分钟后双手下垂、屏幕波形收平并减弱发光，玩家回来时唤醒。执行、思考、等待确认和错误状态阻止整理与打盹；按 E 可以随时从当前姿势转入抓取。N 关闭待机动作与计时，抓取仍可用；重新开启后继续，不补播关闭期间的动作。待机不发声、不弹窗，也不会主动抓人。

Q 的近景魔术是一段约 8.8 秒的「掌中星光」：展示空手、指间变星、抛入帽子、帽子轻跳两次、纸鸽振翅飞出、落在左手、化光消失，最后点头谢幕。右手全程托帽，演完放回独立的小托台；帽子有真实内腔，纸鸽有独立翼轴。工作完成后先等玩家进入台前 4 米内，或自动召回落地后才开演，演完再进入成果对白。它表示本轮结束，不表示验收通过。

Q 会轮换三种节目：掌中星光、飞牌归一（七张牌依次从左手弹到右手，最后收成空中的弧线）和杯中奇遇（三杯换位、红球消失，最后揭出一颗大柠檬）。完成任务时自动轮换；开发者面板可分别预览三种节目。

表演期间不叠加招呼或整理动作。暂停、背包和网页面板冻结表演；主动打开网页面板会取消演完后的重复成果弹窗。新任务、手动抓取或走离 6 米范围会收纳道具；N 减少动态跳过正在进行的表演并继续待交接对白，不补播。开发者面板的「播放 Q 魔术」可独立预览，预览不改变任务状态、不进入成果对白；请在 Q 附近观看。

机械臂连接座位于显示器下方，软管分两段从身体两侧绕到前方，整理动作在支柱前完成，挥手时掌缘与屏幕保持间隔。`tests/computer_idle.gd` 逐帧检查普通待机、挥手及左右整理的软管与机壳 / 支柱间隔、两条软管间距和手部顶点；这是预设动作的几何回归，不是任意场景障碍的软体碰撞系统。

`art/generate_grabber.py` 维护计算机、机械臂与波形及其 `art/grabber.blend`。`art/generate_q_magic.py` 独立生成掌中星光的 `art/q_magic.blend` 与 `assets/q_magic_{hat,stand,dove,star}.glb`；`art/generate_q_tricks.py` 生成飞牌 / 三杯球的 `art/q_tricks.blend` 与 `assets/q_trick_{card,cup,tray,ball,lemon}.glb`，都不重建计算机或岛屿。`scripts/sanctuary_computer.gd` 按节目驱动道具和机械臂，`tests/computer_idle.gd` 包含三种节目及完整轨迹的机壳、支柱、双臂和手部顶点间距检查。

生成模型：`& 'D:\Blender\blender.exe' --background --factory-startup --python games/mosslight/art/generate_q_magic.py`（仓库根目录）。使用 Godot `--path games/mosslight --fixed-fps 30 --write-movie res://captures/q-magic.avi --script res://tools/capture_magic.gd` 录制实际渲染，截图和录像保存在被忽略的 `captures/`。
其他节目模型：`& 'D:\Blender\blender.exe' --background --factory-startup --python games/mosslight/art/generate_q_tricks.py`。

## 晴沙绿洲 · 第二地块

原岛东侧新增同尺寸的沙漠岛，中心位于 Godot `(30, 0, 0)`。从池塘南侧往东走，绕过桥头的针叶树，经短石桥即可抵达；不用切换场景或重新加载角色。岛上有可步行攀登的沙丘、棕榈绿洲、仙人掌、条纹遮阳棚、砂岩门与风蚀岩群。石桥可以双向通行，两侧有实体护栏。

三种视角继续共用玩家、背包与任务进度。俯视镜头会随过桥平滑转向沙漠，滚轮拉远可看相邻两岛，继续拉到最大可看三岛。进入沙漠会显示「晴沙绿洲」标题；沙地和桥面均支持木箱回响放置，水面禁止放置。掉入海中仍返回原岛出生点。绿洲目前是景观，没有新增居民、沙漠任务、游泳或接水互动。

沙漠使用较低亮度的赭沙、陶土与灰绿色配色，以后方的土坯驿站、通风塔与圆顶建立主景。客栈拱门可实际穿行，内部有地毯、长凳和储物箱；屋顶棚架、木格窗、马赛克门槛、陶罐和摊位围绕建筑组织。绕绿洲的小径通向遗迹，岸边增加取水凉亭、休息木台、密集草丛和花；这些生活物件目前只作景观。沙丘提高起伏并加入宽色带，棕榈改为弯曲树干和羽状细叶。水纹与营地小旗使用游戏统一的环境时钟，暂停时停止，N 或系统减少动态设置关闭时保持静止。

风吹过四片远离路线的沙丘薄痕，绿洲水面有零星流光，三只蜻蜓在水边悬停换位；驿站入口挂着五管铜风铃，靠近时偶尔响起一小段原创铃声。它们共用环境时钟，暂停、静音与减少动态都会生效。

- `scripts/desert_atmosphere.gd`、`assets/desert_drift.gdshader`、`assets/desert_chime.wav`：流沙薄痕、水面流光、蜻蜓和近距离风铃；不增加地形碰撞，声音按玩家与风铃的距离衰减。
- `art/generate_desert_audio.py`：用 Python 标准库重新合成原创风铃音频，只写入 `assets/desert_chime.wav`。
- `art/generate_desert.py`、`art/desert.blend`：独立沙漠生成脚本和可编辑源场景，不重建原岛。
- `art/desert_settlement.py`：由沙漠生成器调用，制作土坯驿站、真拱门、通风塔、院内陈设、绿洲休息区与遗迹细节。屋顶不是可达的游玩区域，客栈内外可步行往返。
- `assets/desert_sand.gdshader`：按真实沙丘高度连续混合沙色，消除离散色带的锯齿边缘；运行时保持同一套世界光照。
- `assets/desert.glb`、`scenes/desert.tscn`、`scripts/desert.gd`：地块模型与整体偏移的碰撞。导出对象分成 `Terrain`、`Walkable`、`Obstacles`、`Details` 四组，前三组生成行走和相机碰撞，最后一组仅生成相机碰撞。沙丘接收景物阴影但不投射自身阴影，避免 WebGL 下的条纹。手动编辑后按相同分组重新导出，地面形状与碰撞自动保持一致。
- `tests/desert.gd`：真实输入检查过桥往返、状态保留、回响放置、沙丘行走、边界、客栈拱门通行与镜头。
- `tests/desert_atmosphere.gd`：验证流沙、水光、蜻蜓、风铃的导入、环境时钟、减少动态和暂停行为。
- `tools/capture_desert.gd`：使用游戏实际渲染器生成沙漠总览、驿站近景和双岛总览，输出到 `captures/`。

在游戏目录重新生成并验证：

```powershell
& 'D:\Blender\blender.exe' --background --factory-startup --python art/generate_desert.py
& 'D:\Godot_v4.7.2-stable_win64.exe\Godot_v4.7.2-stable_win64_console.exe' --headless --path . --editor --import
& 'D:\Godot_v4.7.2-stable_win64.exe\Godot_v4.7.2-stable_win64_console.exe' --headless --path . --fixed-fps 60 --script res://tests/desert.gd
powershell -NoProfile -ExecutionPolicy Bypass -File tools/build_web.ps1
```

网页使用同一套场景。更改模型或 GDScript 后必须重新导出；`Play-Web.cmd` 检测到已有导出时只启动预览服务，不自动构建。

## 溪间庭院 · 第三地块

从苔光岛西侧 `(x=-12, z=3)` 的木桥进入，庭院中心是 `(-30, 0, 0)`。这是 xi4u「溪间四时」的夏季场景改编：保留古树、榻榻米与茶具、花圃和溪中锦鲤，廊下躺卧人物、自行车、农具架、团扇和盘香已移除。茶屋替换为层叠四坡青瓦顶，东侧增加白墙月洞门，南侧旧木桥替换为带石栏的弧形石桥；沿桥到左岸，可走曲径穿过西南空地，或沿坡道上主屋露台。西南小凉亭及桌椅已移除。花境、石灯和白墙围绕这些空间组织，保留青绿夏日配色。原岛与沙漠继续共用玩家和背包。俯视滚轮拉到 50 可看相邻两岛，拉到 80 可看三岛。

源项目并非 Blender 模型，而是 Three.js 程序生成几何。`art/convert_streamside.mjs` 从未修改的 TypeScript 快照提取夏季几何，展开实例并合并网格、烘焙颜色，输出 GLB；`art/import_streamside.py` 保存可编辑的 `art/streamside.blend` 并安装最终 GLB。Godot 用 `scenes/streamside.tscn` 与 `scripts/streamside.gd` 装配碰撞、溪水流纹、锦鲤和风铃。顶点颜色通过 `assets/streamside_vertex.gdshader` 适配 Compatibility 的色彩空间。装饰动画遵守 N、减少动态设置和暂停。

当前为可探索的夏季庭院；未移植四季切换、天气、昼夜、原版像素后处理或音效，也未增加新居民与园艺交互。模型约 30 MB，首次网页加载比双岛版更大。原作者 AC / annac777，MIT © 2026 AC；源码版本与改编说明见 `art/xi4u-source/PROVENANCE.md`，许可证随网页导出分发为 `xi4u-LICENSE.txt`。

在仓库根目录重建第三地块（Node 24、Blender 5.2）：

```powershell
npm install --prefix games/mosslight/build/xi4u-converter --no-audit --no-fund @napi-rs/canvas@1.0.8 esbuild@0.28.2 three@0.180.0
node games/mosslight/art/convert_streamside.mjs
& 'D:\Blender\blender.exe' --background --factory-startup --python games/mosslight/art/import_streamside.py
& 'D:\Godot_v4.7.2-stable_win64.exe\Godot_v4.7.2-stable_win64_console.exe' --headless --path games/mosslight --editor --import
& 'D:\Godot_v4.7.2-stable_win64.exe\Godot_v4.7.2-stable_win64_console.exe' --headless --path games/mosslight --fixed-fps 60 --script res://tests/streamside.gd
powershell -NoProfile -ExecutionPolicy Bypass -File games/mosslight/tools/build_web.ps1
```

`art/streamside_garden.mjs` 是本项目新增的园林建筑源代码，由转换器调用并按行走、屋顶相机碰撞、装饰分组合并；不修改 xi4u 源码快照。月洞门可通行，茶具、石灯与花境只作景观，没有新增交互。`tools/capture_streamside.gd` 使用真实 Godot 渲染生成庭院近景、月洞门角度与三岛总览，输出到 `captures/`。无须运行原 xi4u 网站，也不依赖网络或网页嵌套。

## 水壶与背包

小屋右边的青绿色水壶现在可以拾取：靠近按 E，水壶从场景移入背包并自动装备。到池塘岸边或南侧码头附近按 E 接水，一壶有三格水。回到菜畦南侧新增的三格花圃，靠近花苗按 E 浇水，每次扣一格；约五秒后开花，再按 E 收获小雏菊。花根保留，可以继续接水、浇灌和收获。

I 打开六格背包，点击物品查看说明、选择拿出或收纳水壶；G 快速收起 / 拿出。小雏菊自动叠放，最多 99 朵。已湿润的花苗不重复扣水，空壶不能浇水，满叠放时花朵保留在花圃。手持工具时优先进行附近园艺互动，收起后可照常与居民交谈。背包打开时暂停人物、环境和作物生长，关闭时释放按住的移动键。三种视角共用同一份物品和水量；第一人称有持壶和浇水表现。

目前物品与种植状态仅保留在当前这一局，刷新网页或按 R 重开会重置。尚无存档、丢弃、交易、赠礼、制作或更多可收纳物品。

岛上有三位居民：小屋菜畦旁的园丁「芽芽」、池塘南侧码头旁的钓鱼人「阿澜」、月井西侧的守井人「苔伯」。苔伯同时负责项目选择、切换与历史对话，不再另设外观重复的项目向导。靠近显示名字和 E 交谈提示，再按 E 聊下一句；走远或等待十秒会收起对话。对白会随木箱学习、收集进度和月井复苏变化。居民会转向附近玩家并轻微呼吸，有实体碰撞，隔墙不能交谈；N 可停止动作，暂停时对话计时也停止。目前没有巡逻寻路、语音、交易或独立支线任务。

## 美术与工程

- `art/mosslight.blend`：可编辑的完整 Blender 场景，按环境、旅人 Lumi、回响木箱分集合，保留独立物件与命名材质。
- `art/generate_assets.py`：可复现模型生成脚本。使用独立 Blender 后台进程，不会覆盖已打开的场景。
- `art/detail_pass.py`：花箱、菜畦、园艺工具、灌木、草丛、芦苇与原创兔子、小鸭的细节模型。导出副本按材质合并，Blender 源文件保留独立物件。
- `art/sanctuary_details.py`：月井高台的环形铺石、石灯、墙面徽记、断柱、常春藤、供花与蜡烛；保留正面跳跃落脚区，随模型生成脚本一起导出。
- `art/generate_npcs.py`、`art/npcs.blend`：三位原创居民的独立生成脚本与可编辑 Blender 场景，复用小岛配色；单独运行脚本导出 `assets/npc_*.glb`，不重建岛屿。
- `art/bake_ground_shadows.py`：从 Blender 场景烘焙地面接触阴影，输出 `assets/ground_shade.glb`。模型生成脚本会自动调用；手动移动静态模型并保存 `.blend` 后，需单独运行此脚本更新阴影。角色和动物不参与烘焙。
- `assets/island.glb`、`lumi.glb`、`echo_crate.glb`：Godot 直接加载的模型。
- `assets/rabbit.glb`、`duck.glb` 和 `scripts/environment_details.gd`：庭院兔子、池塘小鸭、蝴蝶、炊烟与水面涟漪；暂停时同步停止，N 可关闭动态。动物目前仅作环境装饰。
- `assets/colliders.json`：和场景对应的独立碰撞布局。
- `art/generate_audio.py`：标准库合成的原创轻音乐。
- `scripts/island.gd`：场景装配、运动、复制、拾取、界面、镜头与音频。
- `scripts/first_person_feedback.gd`：第一人称持灯手部、按实际距离驱动的步态与缓存脚步音，以及落地和奔跑反馈。
- `scripts/island_residents.gd`：居民位置、碰撞、朝向、附近名字、交谈距离与遮挡检查，以及进度相关对白。
- `scripts/garden_inventory.gd`：物品格、唯一水壶、数量叠放、装备、接水、浇花、成熟收获和暂停背包界面。
- `assets/watering_can.glb`、`art/extract_watering_can.py`：从静态场景拆出的原始水壶及拆分导出脚本。重新生成小岛时保留独立工具资产，由 Godot 放置可拾取实例。
- `tests/playthrough.gd`：运行真实场景和 3D 物理的集成检查。
- `tests/camera_modes.gd`：镜头避障、第一人称移动和跳跃、放置方向、视角切换及鼠标释放的集成检查。
- `tests/first_person_feel.gd`：实际行走、撞墙、腾空、落地、暂停和减少动态设置下的第一人称反馈检查。
- `tests/residents.gd`：居民出生位置、对话循环、遮挡、碰撞、进度对白、暂停与减少动态集成检查。
- `tests/garden_inventory.gd`：拾取、接水、装备、三格浇灌、重复使用、成熟收获、叠放上限与背包暂停检查。
- `export_presets.cfg`：单线程网页导出配置。
- `web/shell.html`：网页入口、加载进度、全屏及操作指南。
- `tools/build_web.ps1`、`tools/serve_web.py`：网页构建与本地预览。
- `assets/fonts/`：OFL 授权的 Noto Sans SC 衍生字体子集与许可证。增加中文文案后需运行 `tools/subset_font.py` 更新字库。两个 Web 导出入口都会先运行 `tools/check_ui_font.gd`；关闭系统字体回退后仍有缺字时会阻止导出。

Blender 原文件被 `art/.gdignore` 排除在 Godot 导入之外，避免依赖本机 Blender 自动转换设置。模型修改后需要重新导出相应 GLB；碰撞修改需同步 JSON。游戏启动时动态装配场景，Godot 编辑器中按 F5 查看完整世界。

PowerShell（将程序路径替换为本机安装路径）：

```powershell
# 重新制作全部模型；覆盖本项目的生成资产与 Blender 源文件。
& 'D:\Blender\blender.exe' --background --factory-startup --python art/generate_assets.py

# 只重烘焙地面接触阴影（手动编辑并保存 Blender 场景后）
& 'D:\Blender\blender.exe' --background --factory-startup --python art/bake_ground_shadows.py

# 类型 / 资源导入检查
& 'D:\Godot_v4.7.2-stable_win64.exe\Godot_v4.7.2-stable_win64_console.exe' --headless --path . --editor --import

# 从现有居民模型重新生成剧情对白透明立绘
& 'D:\Godot_v4.7.2-stable_win64.exe\Godot_v4.7.2-stable_win64.exe' --path . --script res://tools/render_resident_portraits.gd -- --dialogue-assets-only

# 真实场景集成检查（无窗口、无音频）
& 'D:\Godot_v4.7.2-stable_win64.exe\Godot_v4.7.2-stable_win64_console.exe' --headless --path . --fixed-fps 60 --script res://tests/playthrough.gd
& 'D:\Godot_v4.7.2-stable_win64.exe\Godot_v4.7.2-stable_win64_console.exe' --headless --path . --fixed-fps 60 --script res://tests/camera_modes.gd

# 游戏内实机截图，输出到 captures/，截图后退出
& 'D:\Godot_v4.7.2-stable_win64.exe\Godot_v4.7.2-stable_win64_console.exe' --path . -- --capture
& 'D:\Godot_v4.7.2-stable_win64.exe\Godot_v4.7.2-stable_win64_console.exe' --path . -- --portrait
```

## 当前范围

已实现一个可游玩的美术原型：岛屿、小屋、池塘、遗迹、原创旅人、简单运动动画、环境粒子与环境音、木箱复制和自由探索。桌面预览与网页统一采用 Compatibility 渲染器、同一套暖光和环境补光、MSAA 与 4096 阴影贴图。地面接触暗部由 Blender 烘焙为轻量透明层，不依赖 SSAO；已在本机 RTX 4060 Laptop 上运行并截图。

尚无战斗、敌人 AI、骨骼动画、存档、大地图或独立导出的 EXE。当前支持 Windows 原生和网页键鼠体验；浏览器缩放、显卡和驱动仍可能影响边缘清晰度。烘焙仅补充静态物件与地面的接触阴影，移动物件继续使用实时阴影。集成测试用真实输入检查移动与跳跃，部分拾取和完成条件通过设定玩家初始位置验证，并非全程人工游玩录像。
