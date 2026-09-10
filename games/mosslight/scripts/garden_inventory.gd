extends Node3D
## Session inventory and a complete, contextual pickup/fill/water/harvest loop.
const CAN = preload("res://assets/watering_can.glb")
const CAN_ICON = preload("res://assets/can_icon.svg")
const FLOWER_ICON = preload("res://assets/flower_icon.svg")
const CAN_HOME := Vector3(-6.1, .07, .1)
const CAPACITY := 6
const WATER_CAPACITY := 3
const GROW_SECONDS := 5.0
var game: Node3D
var items: Array[Dictionary] = []
var equipped := false
var water := 0
var opened := false
var selected := 0
var world_can: Node3D
var held_can: Node3D
var eye_can: Node3D
var plots: Array[Dictionary] = []
var overlay: Control
var slots: Array[Button] = []
var description: Label
var heading: Label
var equip_button: Button
var bag_hint: Label
var splash: Array[MeshInstance3D] = []
var splash_origin := Vector3.ZERO
var splash_left := 0.0
var use_left := 0.0


func _ready() -> void:
	game = get_parent()
	world_can = CAN.instantiate()
	world_can.position = CAN_HOME
	add_child(world_can)
	held_can = CAN.instantiate()
	game.hero.add_child(held_can)
	held_can.position = Vector3(.48, .55, .18)
	held_can.rotation.y = -PI / 2
	held_can.scale = Vector3.ONE * .8
	held_can.visible = false
	eye_can = CAN.instantiate()
	game.camera.add_child(eye_can)
	eye_can.position = Vector3(.35, -.36, -.8)
	eye_can.rotation.y = PI / 2
	eye_can.scale = Vector3.ONE * .65
	eye_can.visible = false
	for mesh: MeshInstance3D in eye_can.find_children("*", "MeshInstance3D"):
		mesh.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		for surface in range(mesh.mesh.get_surface_count()):
			var material := mesh.get_active_material(surface).duplicate() as BaseMaterial3D
			material.no_depth_test = true
			material.render_priority = 1
			mesh.set_surface_override_material(surface, material)
	# A flower strip alongside the existing vegetable bed, with three clear plots.
	for i in range(3):
		var origin := Vector3(-9.7 + i * .78, .10, 3.2)
		var soil := _mesh(BoxMesh.new(), origin, Vector3(.70, .12, .72), Color("705039"), self)
		for z in [-.38, .38]:
			_mesh(BoxMesh.new(), origin + Vector3(0, .06, z), Vector3(.76, .13, .07), Color("b78951"), self)
		for x in [-.37, .37]:
			_mesh(BoxMesh.new(), origin + Vector3(x, .06, 0), Vector3(.07, .13, .72), Color("b78951"), self)
		var plant := Node3D.new()
		plant.position = origin + Vector3(0, .07, 0)
		add_child(plant)
		_mesh(CylinderMesh.new(), Vector3(0, .20, 0), Vector3(.025, .22, .025), Color("558a57"), plant)
		for x in [-.10, .10]:
			_mesh(SphereMesh.new(), Vector3(x, .17, 0), Vector3(.25, .05, .10), Color("8bb768"), plant)
		var bloom := Node3D.new()
		bloom.position.y = .46
		plant.add_child(bloom)
		for petal in range(5):
			var a := petal * TAU / 5
			_mesh(SphereMesh.new(), Vector3(cos(a)*.10, 0, sin(a)*.10), Vector3(.17, .045, .17), Color("fff1bd"), bloom)
		_mesh(SphereMesh.new(), Vector3(0, .025, 0), Vector3(.10, .045, .10), Color("e8b950"), bloom)
		bloom.visible = false
		plots.append({"position": origin, "soil": soil, "plant": plant, "bloom": bloom, "watered": false, "growth": 0.0})
	for i in range(14):
		var drop := _mesh(SphereMesh.new(), Vector3.ZERO, Vector3(.035, .065, .035), Color("8ce3de"), self)
		drop.visible = false
		splash.append(drop)
	_build_inventory()
	refresh()


func _mesh(mesh: PrimitiveMesh, at: Vector3, size: Vector3, color: Color, parent: Node3D) -> MeshInstance3D:
	var part := MeshInstance3D.new()
	part.mesh = mesh
	part.position = at
	part.scale = size
	var material := StandardMaterial3D.new()
	material.albedo_color = color
	material.roughness = .8
	part.material_override = material
	parent.add_child(part)
	return part


func add_item(id: String, count: int = 1) -> bool:
	if id not in ["watering_can", "flower"] or count <= 0:
		return false
	for item: Dictionary in items:
		if item.id == id:
			if id == "watering_can" or item.count + count > 99:
				return false
			item.count += count
			return true
	if items.size() >= CAPACITY or count > (1 if id == "watering_can" else 99):
		return false
	items.append({"id": id, "count": count})
	return true


func _reachable(at: Vector3, radius: float) -> bool:
	if absf(game.player.position.y - at.y) > .8 or game.player.position.distance_to(at) > radius:
		return false
	var query := PhysicsRayQueryParameters3D.create(game.player.position + Vector3(0, .65, 0), at + Vector3(0, .65, 0))
	query.collision_mask = 1
	query.exclude = [game.player.get_rid()]
	return get_world_3d().direct_space_state.intersect_ray(query).is_empty()


func target() -> Dictionary:
	if world_can.visible and _reachable(CAN_HOME, 1.35):
		return {"kind": "pickup", "hint": "[ E ] 拾起水壶 · 收入背包"}
	var nearest := -1
	var distance := 1.45
	for i in range(plots.size()):
		var d: float = game.player.position.distance_to(plots[i].position)
		if d < distance and _reachable(plots[i].position, 1.45):
			distance = d
			nearest = i
	if nearest >= 0:
		var plot: Dictionary = plots[nearest]
		if plot.growth >= GROW_SECONDS:
			return {"kind": "harvest", "plot": nearest, "hint": "[ E ] 收获小雏菊 · 放进背包"}
		if equipped:
			return {"kind": "water", "plot": nearest, "hint": "花苗正在生长…" if plot.watered else ("水壶空了 · 去池塘按 E 接水" if water == 0 else "[ E ] 浇花 · 消耗一格水")}
	if equipped:
		for at: Vector3 in [Vector3(7.0, .1, 2.1), Vector3(4.0, .1, 0), Vector3(9.7, .1, 0), Vector3(6.9, .1, -2.3)]:
			if _reachable(at, 1.55):
				return {"kind": "fill", "position": at, "hint": "水壶已满 · 去小屋旁的花圃浇水" if water == WATER_CAPACITY else "[ E ] 从池塘接水"}
	return {}


func interact() -> bool:
	var action := target()
	if action.is_empty():
		return false
	if use_left > 0:
		return true
	match action.kind:
		"pickup":
			if not add_item("watering_can"):
				game._show_toast("背包装不下了。", 3)
				return true
			world_can.visible = false
			equipped = true
			game._show_toast("拾得水壶！去池塘边按 E 接水。I 打开背包，G 收起或拿出水壶。", 6)
		"fill":
			if water == WATER_CAPACITY:
				game._show_toast("水壶已经满了，能浇三次花。", 3)
				return true
			water = WATER_CAPACITY
			use_left = .65
			splash_origin = action.position
			splash_left = .65
			game._show_toast("接满清水 · 3 / 3。回小屋旁的三格花圃试试。", 4)
		"water":
			var plot: Dictionary = plots[action.plot]
			if plot.watered:
				game._show_toast("泥土已经湿润，等花朵长大吧。", 3)
				return true
			if water == 0:
				game._show_toast("水壶空了，先到池塘边接水。", 3)
				return true
			water -= 1
			plot.watered = true
			(plot.soil.material_override as StandardMaterial3D).albedo_color = Color("3c3028")
			use_left = .65
			splash_origin = plot.position
			splash_left = .65
			game._show_toast("花苗喝到水了。稍等片刻，就可以收花。", 3)
		"harvest":
			if not add_item("flower"):
				game._show_toast("背包中的花已满，先保留在花圃里。", 3)
				return true
			var plot: Dictionary = plots[action.plot]
			plot.watered = false
			plot.growth = 0.0
			plot.bloom.visible = false
			plot.plant.scale = Vector3.ONE
			(plot.soil.material_override as StandardMaterial3D).albedo_color = Color("705039")
			game._show_toast("收获小雏菊 × 1，已放入背包。留下的花根还能继续浇水。", 4)
	game._tone(560 if action.kind == "harvest" else 340, .12, .10)
	refresh()
	return true


func advance(delta: float) -> void:
	use_left = maxf(0, use_left - delta)
	splash_left = maxf(0, splash_left - delta)
	for plot: Dictionary in plots:
		if plot.watered and plot.growth < GROW_SECONDS:
			plot.growth = minf(GROW_SECONDS, plot.growth + delta)
			plot.plant.scale.y = 1 + .6 * plot.growth / GROW_SECONDS
			plot.bloom.visible = plot.growth >= GROW_SECONDS
	for i in range(splash.size()):
		var drop := splash[i]
		drop.visible = splash_left > 0 and game.nature_motion
		if drop.visible:
			var t := fposmod((.65-splash_left)*2 + i*.071, 1)
			drop.position = splash_origin + Vector3(sin(i*2.4)*.22*t, .75*(1-t), cos(i*2.4)*.22*t)
	var first: bool = game.view_mode == game.ViewMode.FIRST_PERSON
	held_can.visible = equipped and not first
	eye_can.visible = equipped and first
	game.first_person_feedback.visible = first
	for part: MeshInstance3D in game.first_person_feedback.lantern_parts:
		part.visible = not equipped
	eye_can.rotation.z = sin(use_left / .65 * PI) * -.32 if game.camera_motion else 0.0
	held_can.rotation.z = sin(use_left / .65 * PI) * -.32 if game.nature_motion else 0.0
	# The carried tool shares the first-person gait without altering movement.
	eye_can.position.y = -.36 + game.first_person_feedback.eye_offset * .4


func toggle_equipped() -> void:
	for item: Dictionary in items:
		if item.id == "watering_can":
			equipped = not equipped
			refresh()
			return
	game._show_toast("水壶在小屋右边，靠近按 E 拾起。", 4)


func set_open(value: bool) -> void:
	opened = value
	game.set_game_paused(value)
	game.pause_panel.visible = false
	overlay.visible = value
	if value:
		game._show_toast("", 0)
		game.prompt.text = ""
		refresh()
		(slots[min(selected, CAPACITY-1)] as Button).grab_focus()
	else:
		get_viewport().gui_release_focus()


func _build_inventory() -> void:
	bag_hint = game._label("", Vector2.ZERO, 16, Color("f5e5bd"))
	bag_hint.set_anchors_preset(Control.PRESET_TOP_RIGHT)
	bag_hint.offset_left = -302
	bag_hint.offset_right = -22
	bag_hint.offset_top = 205
	bag_hint.offset_bottom = 279
	overlay = Control.new()
	overlay.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	overlay.mouse_filter = Control.MOUSE_FILTER_STOP
	game.ui.add_child(overlay)
	var shade := ColorRect.new()
	shade.color = Color(.025, .075, .075, .65)
	shade.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	shade.mouse_filter = Control.MOUSE_FILTER_STOP
	overlay.add_child(shade)
	var panel: Panel = game._panel(Vector2.ZERO, Vector2(980, 530), Color("193c3a"))
	panel.reparent(overlay)
	panel.mouse_filter = Control.MOUSE_FILTER_STOP
	panel.set_anchors_preset(Control.PRESET_CENTER)
	panel.offset_left = -490
	panel.offset_right = 490
	panel.offset_top = -265
	panel.offset_bottom = 265
	game._label("旅人的背包", Vector2(32, 24), 34, Color("fff0cb"), panel)
	heading = game._label("", Vector2(34, 75), 17, Color("aacbbb"), panel)
	for i in range(CAPACITY):
		var button := Button.new()
		button.position = Vector2(32+(i%3)*160, 124+floori(float(i)/3)*164)
		button.size = Vector2(146, 146)
		button.add_theme_font_size_override("font_size", 18)
		button.expand_icon = true
		button.add_theme_constant_override("icon_max_width", 54)
		button.icon_alignment = HORIZONTAL_ALIGNMENT_CENTER
		button.vertical_icon_alignment = VERTICAL_ALIGNMENT_TOP
		var style := StyleBoxFlat.new()
		style.bg_color = Color("28504a")
		style.set_corner_radius_all(12)
		style.content_margin_top = 12
		style.content_margin_bottom = 12
		button.add_theme_stylebox_override("normal", style)
		button.pressed.connect(func(): selected = i; refresh())
		panel.add_child(button)
		slots.append(button)
	description = game._label("", Vector2(555, 133), 22, Color("fff0cb"), panel)
	description.size = Vector2(385, 230)
	description.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	equip_button = Button.new()
	equip_button.position = Vector2(555, 370)
	equip_button.size = Vector2(385, 56)
	equip_button.pressed.connect(toggle_equipped)
	panel.add_child(equip_button)
	var close := Button.new()
	close.text = "继续探索   I / Esc"
	close.position = Vector2(720, 33)
	close.size = Vector2(220, 46)
	close.pressed.connect(func(): set_open(false))
	panel.add_child(close)
	game._label("选择物品查看详情 · G 快速拿出 / 收起水壶 · 背包打开时游戏暂停", Vector2(32, 480), 16, Color("aacbbb"), panel)
	overlay.visible = false


func refresh() -> void:
	heading.text = "随身收纳   %d / %d 格    ·    小雏菊可叠放至 99" % [items.size(), CAPACITY]
	bag_hint.text = "I 背包 · G 拿出 / 收起\n" + ("水壶 %d / 3  ·  %s" % [water, "手持" if equipped else "已收纳"] if not world_can.visible else "小屋旁有一只水壶")
	for i in range(CAPACITY):
		var button := slots[i]
		button.icon = null
		button.text = "空格"
		if i < items.size():
			var item := items[i]
			button.icon = CAN_ICON if item.id == "watering_can" else FLOWER_ICON
			button.text = "水壶 %d / 3\n%s" % [water, "已装备" if equipped else "已收纳"] if item.id == "watering_can" else "小雏菊 × %d" % item.count
		button.modulate = Color("fff0ba") if i == selected else Color.WHITE
	equip_button.visible = false
	if selected >= items.size():
		description.text = "空的物品格\n\n在小屋旁拾起水壶，到池塘接水，再去菜畦旁的花圃浇花。"
	elif items[selected].id == "watering_can":
		description.text = "铜嘴水壶\n\n清水  %d / 3\n\n拿在手上时，靠近池塘按 E 接满水；靠近花苗按 E 浇水，每次消耗一格。" % water
		equip_button.visible = true
		equip_button.text = "收回背包" if equipped else "拿在手上"
	else:
		description.text = "小雏菊 × %d\n\n亲手浇灌的小花。收获后自动叠放在背包中。\n\n目前作为采集成果保存，尚不能出售或赠送。" % items[selected].count
