extends CanvasLayer
## Shared in-world resident dialogue presentation and optional Host handoff.
const LINE := "我输出完了，快点验收！"
const PLAYER_PORTRAIT := preload("res://assets/portraits/player.png")
const Q_PORTRAIT := preload("res://assets/portraits/q.png")
const UI_FONT := preload("res://assets/fonts/MosslightUI.ttf")
var opened := false
var game: Node3D
var overlay: Control
var words: Label
var speaker: Label
var role: Label
var count: Label
var continue_hint: Label
var escape_hint: Label
var elapsed := 0.0
var lines: Array[String] = []
var line_index := 0
var next_resident_id := ""
var portraits: Array[TextureRect] = []
var portrait_shadows: Array[TextureRect] = []

func _ready() -> void:
	game = get_parent()
	layer = 30
	overlay = Control.new()
	overlay.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	overlay.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(overlay)
	_add_gradient()
	_add_portrait(PLAYER_PORTRAIT, "PlayerPortrait", false)
	_add_portrait(Q_PORTRAIT, "ResidentPortrait", true)
	speaker = _add_label("Speaker", "Q", Color("f4d37b"))
	role = _add_label("Role", "创作伙伴", Color("89d9de"))
	count = _add_label("Count", "1 / 1", Color("a6b9b5"))
	count.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	words = _add_label("Words", LINE, Color("fff8df"))
	words.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	words.add_theme_color_override("font_shadow_color", Color(0, 0, 0, .82))
	words.add_theme_constant_override("shadow_offset_y", 3)
	continue_hint = _add_label("ContinueHint", "E / 点击  继续，查看结果", Color("a6b9b5"))
	escape_hint = _add_label("EscapeHint", "Esc  返回探索", Color("a6b9b5"))
	escape_hint.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	overlay.resized.connect(_layout)
	_layout()
	overlay.hide()

func _add_gradient() -> void:
	var gradient := Gradient.new()
	gradient.offsets = PackedFloat32Array([0.0, .38, .64, .78, 1.0])
	gradient.colors = PackedColorArray([
		Color(.01, .025, .03, .18), Color(.01, .025, .03, .30),
		Color(.01, .02, .025, .58), Color(.008, .018, .022, .88), Color(.006, .014, .018, .98)
	])
	var texture := GradientTexture2D.new()
	texture.gradient = gradient
	texture.fill_from = Vector2(.5, 0)
	texture.fill_to = Vector2(.5, 1)
	var shade := TextureRect.new()
	shade.name = "DialogueGradient"
	shade.texture = texture
	shade.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	shade.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	shade.mouse_filter = Control.MOUSE_FILTER_IGNORE
	shade.z_index = 0
	overlay.add_child(shade)

func _add_label(label_name: String, text: String, color: Color) -> Label:
	var label := Label.new()
	label.name = label_name
	label.text = text
	label.add_theme_font_override("font", UI_FONT)
	label.add_theme_color_override("font_color", color)
	label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	label.z_index = 3
	overlay.add_child(label)
	return label

func _add_portrait(texture: Texture2D, portrait_name: String, speaking: bool) -> void:
	var shadow := TextureRect.new()
	shadow.name = portrait_name + "Shadow"
	shadow.texture = texture
	shadow.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	shadow.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	shadow.mouse_filter = Control.MOUSE_FILTER_IGNORE
	shadow.modulate = Color(0, 0, 0, .48)
	shadow.z_index = 1
	overlay.add_child(shadow)
	portrait_shadows.append(shadow)
	var portrait := TextureRect.new()
	portrait.name = portrait_name
	portrait.texture = texture
	portrait.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	portrait.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	portrait.mouse_filter = Control.MOUSE_FILTER_IGNORE
	portrait.modulate = Color(1.05, 1.05, 1.02, 1) if speaking else Color(.42, .49, .50, .68)
	portrait.z_index = 2
	overlay.add_child(portrait)
	portraits.append(portrait)

func _layout() -> void:
	if overlay == null or portraits.size() != 2:
		return
	var viewport_size := overlay.size
	if viewport_size.x <= 0 or viewport_size.y <= 0:
		return
	var narrow := viewport_size.x / viewport_size.y < 1.15
	var player_width := minf(viewport_size.x * (.46 if narrow else .29), viewport_size.y * .64 * .75)
	var q_width := minf(viewport_size.x * (.56 if narrow else .39), viewport_size.y * .82 * .75)
	var player_size := Vector2(player_width, player_width / .75)
	var q_size := Vector2(q_width, q_width / .75)
	_set_portrait_rect(0, Vector2(viewport_size.x * (.015 if narrow else .055), viewport_size.y * (.80 if narrow else .86)) - Vector2(0, player_size.y), player_size)
	_set_portrait_rect(1, Vector2(viewport_size.x - q_size.x - viewport_size.x * (.015 if narrow else .035), viewport_size.y * (.84 if narrow else .90)) - Vector2(0, q_size.y), q_size)
	var content_width := minf(viewport_size.x - (44 if narrow else 96), 980)
	var content_left := (viewport_size.x - content_width) * .5
	var dialogue_top := viewport_size.y * (.69 if narrow else .66)
	var meta_size := clampi(int(viewport_size.y * .021), 17, 23)
	var words_size := clampi(int(viewport_size.y * .038), 28, 42)
	var hint_size := clampi(int(viewport_size.y * .018), 15, 19)
	var meta_y := dialogue_top + viewport_size.y * (.045 if narrow else .055)
	_set_label_rect(speaker, Vector2(content_left, meta_y), Vector2(54, 34), meta_size)
	_set_label_rect(role, Vector2(content_left + 70, meta_y), Vector2(content_width * .48, 34), meta_size)
	_set_label_rect(count, Vector2(content_left + content_width - 90, meta_y), Vector2(90, 34), meta_size)
	_set_label_rect(words, Vector2(content_left, meta_y + 43), Vector2(content_width, viewport_size.y * .14), words_size)
	var hints_y := viewport_size.y - maxf(34, viewport_size.y * .045)
	var hint_left := maxf(content_left, 108 if narrow else content_left)
	_set_label_rect(continue_hint, Vector2(hint_left, hints_y), Vector2(content_width * .58, 28), hint_size)
	_set_label_rect(escape_hint, Vector2(content_left + content_width * .62, hints_y), Vector2(content_width * .38, 28), hint_size)

func _set_portrait_rect(index: int, position: Vector2, size: Vector2) -> void:
	portraits[index].position = position
	portraits[index].size = size
	portrait_shadows[index].position = position + Vector2(10, 16)
	portrait_shadows[index].size = size

func _set_label_rect(label: Label, position: Vector2, size: Vector2, font_size: int) -> void:
	label.position = position
	label.size = size
	label.add_theme_font_size_override("font_size", font_size)

func open() -> void:
	open_dialogue("Q", "创作伙伴", [LINE], Q_PORTRAIT, "coder")


func open_dialogue(resident_name: String, resident_role: String, dialogue_lines: Array[String], portrait: Texture2D, followup_resident_id := "") -> void:
	if dialogue_lines.is_empty():
		return
	opened = true
	lines = dialogue_lines
	line_index = 0
	next_resident_id = followup_resident_id
	speaker.text = resident_name
	role.text = resident_role
	portraits[1].texture = portrait
	portrait_shadows[1].texture = portrait
	continue_hint.text = "E / 点击  继续，打开面板" if not next_resident_id.is_empty() else "E / 点击  继续"
	_show_line()
	overlay.show()
	game.player.velocity = Vector3.ZERO
	game.mouse_was_captured = false
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	for action in ["walk_left", "walk_right", "walk_up", "walk_down", "jump", "sprint", "interact"]:
		Input.action_release(action)

func close() -> void:
	var was_opened := opened
	opened = false
	overlay.hide()
	game.mouse_was_captured = false
	lines.clear()
	next_resident_id = ""
	if was_opened and not game.agent_isles_panel_open and game.toast != null:
		game.toast.visible = true


func _show_line() -> void:
	elapsed = 0
	words.text = lines[line_index]
	words.visible_characters = 0
	count.text = "%d / %d" % [line_index + 1, lines.size()]

func advance() -> void:
	if words.visible_characters < words.text.length():
		elapsed = 100
		words.visible_characters = words.text.length()
	elif line_index + 1 < lines.size():
		line_index += 1
		_show_line()
	else:
		var followup := next_resident_id
		close()
		if not followup.is_empty():
			game._emit_agent_isles("resident:selected", {"residentId": followup})

func _process(delta: float) -> void:
	if not opened:
		return
	if game.agent_isles_panel_open:
		close()
		return
	elapsed += delta
	words.visible_characters = mini(words.text.length(), int(elapsed * 24))

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
