extends Node3D
## Session inventory and a complete, contextual pickup/fill/water/harvest loop.
const CAN = preload("res://assets/watering_can.glb")
const CAN_ICON = preload("res://assets/can_icon.svg")
const FLOWER_ICON = preload("res://assets/flower_icon.svg")
const CAN_HOME := Vector3(-6.1, .07, .1)
const GRID_COLUMNS := 6
const GRID_ROWS := 4
const CAPACITY := GRID_COLUMNS * GRID_ROWS
const CELL_SIZE := 72
const CELL_GAP := 7
const WATER_CAPACITY := 3
const GROW_SECONDS := 5.0
var game: Node3D
var items: Array[Dictionary] = []
var equipped := false
var water := 0
var opened := false
var selected := -1
var moving_index := -1
var world_can: Node3D
var held_can: Node3D
var eye_can: Node3D
var plots: Array[Dictionary] = []
var overlay: Control
var slots: Array[Button] = []
var item_layer: Control
var item_buttons: Array[Button] = []
var description: Label
var heading: Label
var equip_button: Button
var equipped_slot: Button
var arrange_hint: Label
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
			refresh()
			return true
	if count > (1 if id == "watering_can" else 99):
		return false
	var size := item_size(id)
	var origin := find_free_origin(size)
	if origin.x < 0:
		return false
	items.append({"id": id, "count": count, "origin": origin, "size": size})
	if selected < 0:
		selected = items.size() - 1
	refresh()
	return true


func item_size(id: String) -> Vector2i:
	return Vector2i(2, 2) if id == "watering_can" else Vector2i.ONE


func occupied_cells() -> int:
	var total := 0
	for item: Dictionary in items:
		var size: Vector2i = item.get("size", item_size(item.id))
		total += size.x * size.y
	return total


func can_place(size: Vector2i, origin: Vector2i, ignore_index: int = -1) -> bool:
	if origin.x < 0 or origin.y < 0 or origin.x + size.x > GRID_COLUMNS or origin.y + size.y > GRID_ROWS:
		return false
	var proposed := Rect2i(origin, size)
	for i in range(items.size()):
		if i == ignore_index:
			continue
		var item: Dictionary = items[i]
		var item_origin: Vector2i = item.get("origin", Vector2i.ZERO)
		var item_dimensions: Vector2i = item.get("size", item_size(item.id))
		if proposed.intersects(Rect2i(item_origin, item_dimensions)):
			return false
	return true


func find_free_origin(size: Vector2i, ignore_index: int = -1) -> Vector2i:
	for y in range(GRID_ROWS - size.y + 1):
		for x in range(GRID_COLUMNS - size.x + 1):
			var origin := Vector2i(x, y)
			if can_place(size, origin, ignore_index):
				return origin
	return Vector2i(-1, -1)


func move_item(index: int, origin: Vector2i) -> bool:
	if index < 0 or index >= items.size():
		return false
	var size: Vector2i = items[index].get("size", item_size(items[index].id))
	if not can_place(size, origin, index):
		return false
	items[index].origin = origin
	selected = index
	moving_index = -1
	refresh()
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
		return {"kind": "pickup", "hint": tr("garden.pickup")}
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
			return {"kind": "harvest", "plot": nearest, "hint": tr("garden.harvest")}
		if equipped:
			return {"kind": "water", "plot": nearest, "hint": tr("garden.growing") if plot.watered else (tr("garden.empty") if water == 0 else tr("garden.water"))}
	if equipped:
		for at: Vector3 in [Vector3(7.0, .1, 2.1), Vector3(4.0, .1, 0), Vector3(9.7, .1, 0), Vector3(6.9, .1, -2.3)]:
			if _reachable(at, 1.55):
				return {"kind": "fill", "position": at, "hint": tr("garden.full") if water == WATER_CAPACITY else tr("garden.fill")}
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
				game._show_toast(tr("inventory.full"), 3)
				return true
			world_can.visible = false
			equipped = true
			game.set_echo_active(false)
			game._show_toast(tr("garden.can_found"), 6)
		"fill":
			if water == WATER_CAPACITY:
				game._show_toast(tr("garden.can_full"), 3)
				return true
			water = WATER_CAPACITY
			use_left = .65
			splash_origin = action.position
			splash_left = .65
			game._show_toast(tr("garden.filled"), 4)
		"water":
			var plot: Dictionary = plots[action.plot]
			if plot.watered:
				game._show_toast(tr("garden.already_watered"), 3)
				return true
			if water == 0:
				game._show_toast(tr("garden.need_water"), 3)
				return true
			water -= 1
			plot.watered = true
			(plot.soil.material_override as StandardMaterial3D).albedo_color = Color("3c3028")
			use_left = .65
			splash_origin = plot.position
			splash_left = .65
			game._show_toast(tr("garden.watered"), 3)
		"harvest":
			if not add_item("flower"):
				game._show_toast(tr("garden.flowers_full"), 3)
				return true
			var plot: Dictionary = plots[action.plot]
			plot.watered = false
			plot.growth = 0.0
			plot.bloom.visible = false
			plot.plant.scale = Vector3.ONE
			(plot.soil.material_override as StandardMaterial3D).albedo_color = Color("705039")
			game._show_toast(tr("garden.harvested"), 4)
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
			if equipped:
				game.set_echo_active(false)
			refresh()
			return
	game._show_toast(tr("garden.can_location"), 4)


func set_open(value: bool) -> void:
	opened = value
	moving_index = -1
	game.set_game_paused(value)
	game.pause_panel.visible = false
	overlay.visible = value
	if value:
		game.set_echo_active(false)
		game._show_toast("", 0)
		game.prompt.text = ""
		refresh()
		(slots[0] as Button).grab_focus()
	else:
		get_viewport().gui_release_focus()


func _style(background: Color, border: Color, border_width: int = 1, radius: int = 8) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = background
	style.border_color = border
	style.set_border_width_all(border_width)
	style.set_corner_radius_all(radius)
	return style


func _section(parent: Control, at: Vector2, dimensions: Vector2) -> Panel:
	var section := Panel.new()
	section.position = at
	section.size = dimensions
	section.mouse_filter = Control.MOUSE_FILTER_IGNORE
	section.add_theme_stylebox_override("panel", _style(Color("183f3a"), Color("55776a"), 1, 10))
	parent.add_child(section)
	return section


func _cell_pressed(index: int) -> void:
	selected = -1
	if moving_index < 0:
		arrange_hint.text = tr("inventory.choose_item")
		refresh()
		return
	var origin := Vector2i(index % GRID_COLUMNS, index / GRID_COLUMNS)
	if move_item(moving_index, origin):
		arrange_hint.text = tr("inventory.stored")
	else:
		arrange_hint.text = tr("inventory.no_space")


func _item_pressed(index: int) -> void:
	selected = index
	moving_index = -1 if moving_index == index else index
	refresh()


func _build_inventory() -> void:
	bag_hint = game._label("", Vector2.ZERO, 16, Color("f5e5bd"))
	bag_hint.set_anchors_preset(Control.PRESET_TOP_RIGHT)
	bag_hint.offset_left = -302
	bag_hint.offset_right = -22
	bag_hint.offset_top = 205
	bag_hint.offset_bottom = 279
	bag_hint.visible = not game.embedded_mode
	overlay = Control.new()
	overlay.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	overlay.mouse_filter = Control.MOUSE_FILTER_STOP
	game.ui.add_child(overlay)
	var shade := ColorRect.new()
	shade.color = Color(.025, .07, .065, .76)
	shade.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	shade.mouse_filter = Control.MOUSE_FILTER_STOP
	overlay.add_child(shade)
	var panel: Panel = game._panel(Vector2.ZERO, Vector2(1240, 680), Color("123934"))
	panel.reparent(overlay)
	panel.mouse_filter = Control.MOUSE_FILTER_STOP
	panel.set_anchors_preset(Control.PRESET_CENTER)
	panel.offset_left = -620
	panel.offset_right = 620
	panel.offset_top = -340
	panel.offset_bottom = 340
	game._label(tr("inventory.title"), Vector2(32, 24), 34, Color("fff0cb"), panel)
	heading = game._label("", Vector2(34, 72), 17, Color("b9d2c3"), panel)

	var equipment := _section(panel, Vector2(32, 118), Vector2(220, 474))
	game._label(tr("inventory.equipment"), Vector2(20, 18), 18, Color("e8c67a"), equipment)
	equipped_slot = Button.new()
	equipped_slot.position = Vector2(20, 58)
	equipped_slot.size = Vector2(180, 174)
	equipped_slot.expand_icon = true
	equipped_slot.icon_alignment = HORIZONTAL_ALIGNMENT_CENTER
	equipped_slot.vertical_icon_alignment = VERTICAL_ALIGNMENT_TOP
	equipped_slot.add_theme_constant_override("icon_max_width", 72)
	equipped_slot.add_theme_font_size_override("font_size", 15)
	equipped_slot.pressed.connect(toggle_equipped)
	equipment.add_child(equipped_slot)
	for i in range(2):
		var locked := Panel.new()
		locked.position = Vector2(20, 252 + i * 88)
		locked.size = Vector2(180, 70)
		locked.add_theme_stylebox_override("panel", _style(Color("143731"), Color("35574f"), 1, 7))
		equipment.add_child(locked)
		game._label(tr("inventory.undiscovered") if i == 0 else tr("inventory.unlock_later"), Vector2(18, 20), 14, Color("719489"), locked)

	var grid_panel := _section(panel, Vector2(272, 118), Vector2(494, 474))
	game._label(tr("inventory.space"), Vector2(20, 18), 18, Color("e8c67a"), grid_panel)
	arrange_hint = game._label(tr("inventory.arrange"), Vector2(20, 49), 14, Color("91b8aa"), grid_panel)
	var grid_origin := Vector2(18, 82)
	for i in range(CAPACITY):
		var button := Button.new()
		button.position = grid_origin + Vector2((i % GRID_COLUMNS) * (CELL_SIZE + CELL_GAP), (i / GRID_COLUMNS) * (CELL_SIZE + CELL_GAP))
		button.size = Vector2(CELL_SIZE, CELL_SIZE)
		button.focus_mode = Control.FOCUS_ALL
		button.add_theme_stylebox_override("normal", _style(Color("214b44"), Color("3b655b"), 1, 5))
		button.add_theme_stylebox_override("hover", _style(Color("295950"), Color("7da692"), 1, 5))
		button.add_theme_stylebox_override("pressed", _style(Color("315f54"), Color("e4c374"), 2, 5))
		var cell_index := i
		button.pressed.connect(func(): _cell_pressed(cell_index))
		grid_panel.add_child(button)
		slots.append(button)
	item_layer = Control.new()
	item_layer.position = grid_origin
	item_layer.size = Vector2(GRID_COLUMNS * CELL_SIZE + (GRID_COLUMNS - 1) * CELL_GAP, GRID_ROWS * CELL_SIZE + (GRID_ROWS - 1) * CELL_GAP)
	item_layer.mouse_filter = Control.MOUSE_FILTER_IGNORE
	grid_panel.add_child(item_layer)

	var detail_panel := _section(panel, Vector2(786, 118), Vector2(422, 474))
	game._label(tr("inventory.details"), Vector2(24, 18), 18, Color("e8c67a"), detail_panel)
	description = game._label("", Vector2(24, 68), 21, Color("fff0cb"), detail_panel)
	description.size = Vector2(374, 270)
	description.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	equip_button = Button.new()
	equip_button.position = Vector2(24, 365)
	equip_button.size = Vector2(374, 58)
	equip_button.add_theme_font_size_override("font_size", 17)
	equip_button.add_theme_stylebox_override("normal", _style(Color("d7b461"), Color("f4dda3"), 1, 7))
	equip_button.add_theme_stylebox_override("hover", _style(Color("e4c374"), Color("fff0cb"), 1, 7))
	equip_button.add_theme_color_override("font_color", Color("173b36"))
	equip_button.pressed.connect(toggle_equipped)
	detail_panel.add_child(equip_button)
	var close := Button.new()
	close.text = tr("inventory.close")
	close.position = Vector2(976, 28)
	close.size = Vector2(232, 48)
	close.add_theme_font_size_override("font_size", 16)
	close.add_theme_stylebox_override("normal", _style(Color("17332f"), Color("496b60"), 1, 7))
	close.add_theme_stylebox_override("hover", _style(Color("22483f"), Color("8eae9c"), 1, 7))
	close.pressed.connect(func(): set_open(false))
	panel.add_child(close)
	game._label(tr("inventory.controls"), Vector2(34, 626), 16, Color("91b8aa"), panel)
	overlay.visible = false


func _rebuild_item_buttons() -> void:
	for child in item_layer.get_children():
		item_layer.remove_child(child)
		child.queue_free()
	item_buttons.clear()
	for i in range(items.size()):
		var item: Dictionary = items[i]
		var origin: Vector2i = item.get("origin", Vector2i.ZERO)
		var size: Vector2i = item.get("size", item_size(item.id))
		var button := Button.new()
		button.position = Vector2(origin.x * (CELL_SIZE + CELL_GAP), origin.y * (CELL_SIZE + CELL_GAP))
		button.size = Vector2(size.x * CELL_SIZE + (size.x - 1) * CELL_GAP, size.y * CELL_SIZE + (size.y - 1) * CELL_GAP)
		button.icon = CAN_ICON if item.id == "watering_can" else FLOWER_ICON
		button.expand_icon = true
		button.icon_alignment = HORIZONTAL_ALIGNMENT_CENTER
		button.vertical_icon_alignment = VERTICAL_ALIGNMENT_TOP
		button.add_theme_constant_override("icon_max_width", 64 if size.x > 1 else 36)
		button.add_theme_font_size_override("font_size", 14 if size.x > 1 else 12)
		button.text = tr("inventory.can_button") % water if item.id == "watering_can" else "× %d" % item.count
		button.tooltip_text = tr("inventory.put_back") if moving_index == i else tr("inventory.pick_up")
		var active := moving_index == i
		var selected_item := selected == i
		var fill := Color("305e54") if item.id == "watering_can" else Color("486451")
		var border := Color("f2cc72") if active else (Color("d7b461") if selected_item else Color("719889"))
		button.add_theme_stylebox_override("normal", _style(fill, border, 3 if active else 2, 7))
		button.add_theme_stylebox_override("hover", _style(fill.lightened(.08), Color("ffe29a"), 3, 7))
		button.add_theme_stylebox_override("pressed", _style(fill.darkened(.08), Color("fff0cb"), 3, 7))
		var item_index := i
		button.pressed.connect(func(): _item_pressed(item_index))
		item_layer.add_child(button)
		item_buttons.append(button)


func refresh() -> void:
	heading.text = tr("inventory.used") % [occupied_cells(), CAPACITY]
	bag_hint.text = tr("inventory.quick") + "\n" + (tr("inventory.can_status") % [water, tr("inventory.held") if equipped else tr("inventory.stowed")] if not world_can.visible else tr("inventory.can_outside"))
	if item_layer != null:
		_rebuild_item_buttons()
	var has_can := false
	for item: Dictionary in items:
		if item.id == "watering_can":
			has_can = true
	equipped_slot.icon = CAN_ICON if equipped else null
	equipped_slot.text = tr("inventory.equipped_can") % water if equipped else (tr("inventory.equip_can") if has_can else tr("inventory.empty_hand"))
	equipped_slot.disabled = not has_can
	equipped_slot.add_theme_stylebox_override("normal", _style(Color("284f47") if equipped else Color("143731"), Color("e4c374") if equipped else Color("35574f"), 2 if equipped else 1, 8))
	equip_button.visible = false
	if moving_index >= 0:
		arrange_hint.text = tr("inventory.moving") % (tr("item.watering_can") if items[moving_index].id == "watering_can" else tr("item.daisy"))
	if selected < 0 or selected >= items.size():
		description.text = tr("inventory.description")
	elif items[selected].id == "watering_can":
		description.text = tr("inventory.can_description") % water
		equip_button.visible = true
		equip_button.text = tr("inventory.stow") if equipped else tr("inventory.hold")
	else:
		description.text = tr("inventory.daisy_description") % items[selected].count


func refresh_locale() -> void:
	var was_open := opened
	if overlay != null:
		overlay.get_parent().remove_child(overlay)
		overlay.free()
	if bag_hint != null:
		bag_hint.get_parent().remove_child(bag_hint)
		bag_hint.free()
	slots.clear()
	item_buttons.clear()
	_build_inventory()
	overlay.visible = was_open
	refresh()
