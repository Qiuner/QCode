extends CanvasLayer
## One-shot, in-world handoff from completed recall to the existing coder conversation.
const LINE := "我输出完了，快点验收！"
var opened := false
var game: Node3D
var overlay: Control
var words: Label
var elapsed := 0.0
var portraits: Array[SubViewport] = []

func _ready() -> void:
	game = get_parent().game
	layer = 30
	overlay = Control.new()
	overlay.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(overlay)
	var shade := ColorRect.new()
	shade.color = Color(.015, .025, .035, .82)
	shade.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	overlay.add_child(shade)
	_add_portrait(preload("res://assets/lumi.glb"), .02, .43, false)
	_add_portrait(preload("res://assets/grabber_computer.glb"), .48, .98, true)
	var bottom := ColorRect.new()
	bottom.color = Color(.025, .045, .055, .96)
	bottom.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	bottom.anchor_top = .70
	overlay.add_child(bottom)
	var column := VBoxContainer.new()
	column.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	column.anchor_left = .07
	column.anchor_right = .93
	column.anchor_top = .73
	column.anchor_bottom = .97
	column.add_theme_constant_override("separation", 12)
	overlay.add_child(column)
	for text in ["Qiuner    /    创作伙伴                                       1 / 1", LINE, "E / 点击  继续，查看结果                         Esc  返回探索"]:
		var label := Label.new()
		label.text = text
		label.add_theme_font_override("font", preload("res://assets/fonts/MosslightUI.ttf"))
		label.add_theme_font_size_override("font_size", 36 if text == LINE else 20)
		label.add_theme_color_override("font_color", Color("fff3d8") if text == LINE else Color("9fbab7"))
		label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		column.add_child(label)
		if text == LINE:
			words = label
			label.size_flags_vertical = Control.SIZE_EXPAND_FILL
	overlay.hide()

func _add_portrait(scene: PackedScene, left: float, right: float, speaking: bool) -> void:
	var container := SubViewportContainer.new()
	container.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	container.anchor_left = left
	container.anchor_right = right
	container.anchor_top = .06
	container.anchor_bottom = .72
	container.stretch = true
	container.mouse_filter = Control.MOUSE_FILTER_IGNORE
	container.modulate = Color.WHITE if speaking else Color(.50, .56, .59, .8)
	overlay.add_child(container)
	var viewport := SubViewport.new()
	viewport.transparent_bg = true
	viewport.own_world_3d = true
	viewport.render_target_update_mode = SubViewport.UPDATE_DISABLED
	container.add_child(viewport)
	portraits.append(viewport)
	container.resized.connect(func():
		if opened:
			viewport.render_target_update_mode = SubViewport.UPDATE_ONCE
	)
	var model: Node3D = scene.instantiate()
	viewport.add_child(model)
	model.rotation.y = -.18 if speaking else .22
	var bounds := AABB()
	var first := true
	for mesh: MeshInstance3D in model.find_children("*", "MeshInstance3D", true, false):
		var box: AABB = mesh.global_transform * mesh.get_aabb()
		bounds = box if first else bounds.merge(box)
		first = false
	var center := bounds.get_center()
	var camera := Camera3D.new()
	viewport.add_child(camera)
	camera.projection = Camera3D.PROJECTION_ORTHOGONAL
	camera.size = maxf(bounds.size.y, bounds.size.x * 1.4) * 1.16
	camera.position = center + Vector3(0, .15, 10)
	camera.look_at(center)
	var light := DirectionalLight3D.new()
	light.rotation_degrees = Vector3(-25, -25, 0)
	light.light_energy = 1.4
	viewport.add_child(light)
	var environment := WorldEnvironment.new()
	environment.environment = Environment.new()
	environment.environment.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	environment.environment.ambient_light_color = Color("c6dce5")
	environment.environment.ambient_light_energy = .7
	viewport.add_child(environment)

func open() -> void:
	opened = true
	elapsed = 0
	words.visible_characters = 0
	overlay.show()
	for viewport in portraits:
		viewport.render_target_update_mode = SubViewport.UPDATE_ONCE
	game.player.velocity = Vector3.ZERO
	game.mouse_was_captured = false
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	for action in ["walk_left", "walk_right", "walk_up", "walk_down", "jump", "sprint", "interact"]:
		Input.action_release(action)

func close() -> void:
	opened = false
	overlay.hide()
	game.mouse_was_captured = false

func advance() -> void:
	if words.visible_characters < LINE.length():
		elapsed = 100
		words.visible_characters = LINE.length()
	else:
		close()
		game._emit_agent_isles("resident:selected", {"residentId": "coder"})

func _process(delta: float) -> void:
	if not opened:
		return
	if game.agent_isles_panel_open:
		close()
		return
	elapsed += delta
	words.visible_characters = mini(LINE.length(), int(elapsed * 24))

func _input(event: InputEvent) -> void:
	if not opened:
		return
	if event.is_action_pressed("close_game"):
		close()
	elif event.is_action_pressed("interact") and not event.is_echo():
		advance()
	elif event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		advance()
	get_viewport().set_input_as_handled()
