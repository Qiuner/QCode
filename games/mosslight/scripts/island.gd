extends Node3D
## Original art-first micro adventure. GLBs are authored by art/generate_assets.py.

const START := Vector3(0, 0.15, 6.5)
const SOURCE := Vector3(-3.6, 0.28, 4.0)
const SHRINE := Vector3(1.2, 1.52, -6.8)
const CRATE_SIZE := Vector3(0.96, 0.9, 0.96)
const MAX_ECHOES := 3
const SPEED := 4.2
const JUMP := 6.8
const GRAVITY := 20.0
const CRATE_SCENE = preload("res://assets/echo_crate.glb")
const HERO_SCENE = preload("res://assets/lumi.glb")
const WORLD_SCENE = preload("res://assets/island.glb")
const DESERT_PATH := "res://scenes/desert.tscn"
const DESERT_ORIGIN := Vector3(30, 0, 0)
const STREAMSIDE_PATH := "res://scenes/streamside.tscn"
const STREAMSIDE_ORIGIN := Vector3(-30, 0, 0)
const GROUND_SHADE = preload("res://assets/ground_shade.glb")
const ENVIRONMENT_DETAILS = preload("res://scripts/environment_details.gd")
const FIRST_PERSON_FEEDBACK = preload("res://scripts/first_person_feedback.gd")
const ISLAND_RESIDENTS = preload("res://scripts/island_residents.gd")
const GARDEN_INVENTORY = preload("res://scripts/garden_inventory.gd")
const WEB_RENDERING = preload("res://scripts/web_rendering.gd")
const ECHO_OBJECTS = preload("res://scripts/echo_objects.gd")
const SANCTUARY_COMPUTER = preload("res://scripts/sanctuary_computer.gd")
enum ViewMode { OVERVIEW, THIRD_PERSON, FIRST_PERSON }

var player: CharacterBody3D
var hero: Node3D
var camera: Camera3D
var source_body: StaticBody3D
var echoes: Array[StaticBody3D] = []
var motes: Array[MeshInstance3D] = []
var learned := false
var echo_active := false
var learned_echoes: Array[String] = []
var selected_echo := "crate"
var echo_rotation := 0.0
var facing := Vector3(0, 0, -1)
var elapsed := 0.0
var preview: MeshInstance3D
var preview_material: ShaderMaterial
var preview_position := Vector3.ZERO
var placement_valid := false
var prompt: Label
var echo_label: Label
var game_hud: Panel
var toast: Label
var toast_left := 0.0
var ui: Control
var photo_mode := false
var sound: AudioStreamPlayer
var music: AudioStreamPlayer
var shrine_light: OmniLight3D
var camera_zoom := 26.0
var default_camera_position := Vector3(13.2, 25.5, 29.5)
var camera_target := Vector3(0, .2, -.5)
var camera_focus := Vector3.ZERO
var in_desert := false
var desert: Node3D
var in_streamside := false
var streamside: Node3D
var screenshot_frames := -1
var game_paused := false
var pause_panel: Panel
var environment_details: Node3D
var nature_motion := true
var nature_time := 0.0
var view_mode := ViewMode.OVERVIEW
var look_yaw := 0.0
var look_pitch := -.30
var third_person_distance := 5.0
var camera_arm_length := 5.0
var camera_obstacle_shape := SphereShape3D.new()
var view_hint: Label
var crosshair: Label
var overview_labels: Array[Label] = []
var mouse_was_captured := false
var first_person_feedback: Node3D
var camera_motion := true
var residents: Node3D
var talking_to: StaticBody3D
var dialogue_panel: Panel
var dialogue_name: Label
var dialogue_text: Label
var dialogue_left := 0.0
var garden: Node3D
var sanctuary_computer: Node3D
var agent_isles_message_handler: JavaScriptObject
var agent_isles_bridge: JavaScriptObject
var agent_isles_connected := false
var agent_isles_workspace_id := ""
var agent_isles_session_id := ""
var embedded_mode := false
var agent_isles_panel_open := false
var region_barriers: Array[StaticBody3D] = []
var region_signs: Array[Label3D] = []
var regions_loading := false
var regions_error := false
var regions_installing := false
var web_lightweight := false
var distance_haze: ShaderMaterial


func _ready() -> void:
	web_lightweight = (OS.has_feature("web") or "--web-lightweight" in OS.get_cmdline_user_args()) and not "--full-materials" in OS.get_cmdline_user_args()
	embedded_mode = _is_embedded_web()
	_setup_input()
	_build_world()
	_build_player()
	_build_distance_haze()
	environment_details = ENVIRONMENT_DETAILS.new()
	add_child(environment_details)
	residents = ISLAND_RESIDENTS.new()
	add_child(residents)
	residents.tutorial_motion.connect(func(encounter_id: String, status: String): _emit_agent_isles("tutorial:keeper", {"encounterId": encounter_id, "status": status}))
	if OS.has_feature("web"):
		nature_motion = not bool(JavaScriptBridge.eval("window.matchMedia('(prefers-reduced-motion: reduce)').matches"))
		camera_motion = nature_motion
	first_person_feedback = FIRST_PERSON_FEEDBACK.new()
	camera.add_child(first_person_feedback)
	first_person_feedback.visible = false
	_build_ui()
	_setup_agent_isles_bridge()
	garden = GARDEN_INVENTORY.new()
	add_child(garden)
	sanctuary_computer = SANCTUARY_COMPUTER.new()
	add_child(sanctuary_computer)
	_apply_embedded_hud()
	camera_obstacle_shape.radius = .22
	_update_view_hint()
	_setup_audio()
	if web_lightweight:
		WEB_RENDERING.apply(self)
	_show_toast("苔光之屿", 3.0) if embedded_mode else _show_toast("欢迎来到苔光之屿。沿小径漫步，靠近木箱按 E 学习回响。", 9.0)
	if "--capture" in OS.get_cmdline_user_args():
		screenshot_frames = 12
	if "--portrait" in OS.get_cmdline_user_args():
		camera.projection = Camera3D.PROJECTION_ORTHOGONAL
		camera.size = 4.8
		camera.position = player.position + Vector3(3, 2.5, 5)
		camera.look_at(player.position + Vector3(0, .9, 0))
		photo_mode = true
		ui.visible = false
		screenshot_frames = 12
	print("MOSSLIGHT_READY: Blender assets loaded; island, traveler and echo systems ready.")
	if OS.has_feature("web"):
		JavaScriptBridge.eval("performance.mark('godot-scene-ready')")
		get_tree().create_timer(2.0).timeout.connect(_request_neighbor_regions)


func _is_embedded_web() -> bool:
	if not OS.has_feature("web"):
		return false
	return bool(JavaScriptBridge.eval("new URLSearchParams(window.location.search).get('embed') === '1'"))


func _build_distance_haze() -> void:
	var overlay := MeshInstance3D.new()
	overlay.name = "DistanceHaze"
	var quad := QuadMesh.new()
	quad.size = Vector2(2, 2)
	overlay.mesh = quad
	overlay.position.z = -1
	overlay.extra_cull_margin = 16384
	overlay.ignore_occlusion_culling = true
	overlay.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	distance_haze = ShaderMaterial.new()
	distance_haze.shader = preload("res://assets/distance_haze.gdshader")
	distance_haze.render_priority = 100
	distance_haze.set_shader_parameter("focus_position", player.global_position)
	overlay.material_override = distance_haze
	camera.add_child(overlay)


func _apply_embedded_hud() -> void:
	for label: Label in overview_labels:
		label.visible = not embedded_mode
	view_hint.visible = not embedded_mode
	game_hud.visible = not embedded_mode
	if garden != null:
		garden.bag_hint.visible = not embedded_mode


func _setup_agent_isles_bridge() -> void:
	if not OS.has_feature("web"):
		return
	agent_isles_bridge = JavaScriptBridge.get_interface("agentIslesWorldBridge")
	if agent_isles_bridge == null:
		return
	agent_isles_message_handler = JavaScriptBridge.create_callback(_on_agent_isles_message)
	agent_isles_bridge.attachGodot(agent_isles_message_handler)


func _emit_agent_isles(type: String, payload: Dictionary) -> void:
	if not OS.has_feature("web") or agent_isles_bridge == null:
		return
	# JavaScriptBridge cannot marshal Dictionary arguments; pass JSON across the boundary.
	agent_isles_bridge.emit(type, JSON.stringify(payload))


func _on_agent_isles_message(arguments: Array) -> void:
	if arguments.is_empty():
		return
	var parsed: Variant = JSON.parse_string(str(arguments[0]))
	if typeof(parsed) != TYPE_DICTIONARY:
		return
	var message := parsed as Dictionary
	if message.get("source") != "agent-isles-host" or int(message.get("version", 0)) != 1:
		return
	if message.get("type") == "tutorial:keeper":
		var cue: Variant = message.get("payload")
		if typeof(cue) != TYPE_DICTIONARY:
			return
		var encounter: Variant = cue.get("encounterId")
		var action: Variant = cue.get("action")
		if typeof(encounter) != TYPE_STRING or encounter.length() < 1 or encounter.length() > 160 or typeof(cue.get("reducedMotion")) != TYPE_BOOL:
			return
		var valid_id := RegEx.new()
		valid_id.compile("^[A-Za-z0-9_-]+$")
		if valid_id.search(encounter) == null or action not in ["arrive", "home", "cancel"]:
			return
		residents.guide_keeper(encounter, action, player.position, cue.reducedMotion)
		return
	if message.get("type") == "world:neighbors-started":
		regions_loading = true
		regions_error = false
		_update_region_signs()
		return
	if message.get("type") == "world:neighbors-downloaded":
		if regions_installing:
			return
		regions_installing = true
		var installed := ProjectSettings.load_resource_pack("/neighbors.pck", false)
		if installed:
			installed = await _install_neighbor_regions(true)
		regions_installing = false
		regions_loading = false
		regions_error = not installed
		_update_region_signs()
		JavaScriptBridge.eval("window.finishNeighborRegions(%s)" % ("true" if installed else "false"))
		if installed:
			print("MOSSLIGHT_REGIONS_READY")
			JavaScriptBridge.eval("performance.mark('godot-neighbors-ready')")
		else:
			_show_toast("邻近区域暂未加载，靠近桥头可重试。", 5)
		return
	if message.get("type") == "world:neighbors-failed":
		regions_loading = false
		regions_error = true
		_update_region_signs()
		_show_toast("邻近区域暂未加载，靠近桥头可重试。", 5)
		return
	if message.get("type") != "world:init":
		return
	agent_isles_connected = true
	var payload: Dictionary = message.get("payload", {})
	var panel_open := bool(payload.get("panelOpen", false))
	if panel_open != agent_isles_panel_open:
		agent_isles_panel_open = panel_open
		mouse_was_captured = false
		player.velocity = Vector3.ZERO
		for action in ["walk_left", "walk_right", "walk_up", "walk_down", "jump", "sprint", "interact", "echo", "undo_echo"]:
			Input.action_release(action)
		if panel_open:
			Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	# The host owns the conversation; never leave a second dialogue behind it.
	talking_to = null
	dialogue_panel.visible = false
	dialogue_left = 0
	prompt.visible = not panel_open
	agent_isles_session_id = str(payload.get("sessionId", ""))
	for resident: Dictionary in payload.get("residents", []):
		residents.set_agent_status(str(resident.get("id", "")), str(resident.get("status", "idle")))
	var workspace: Variant = payload.get("workspace")
	if typeof(workspace) != TYPE_DICTIONARY:
		agent_isles_workspace_id = ""
		return
	var previous_workspace_id := agent_isles_workspace_id
	agent_isles_workspace_id = str((workspace as Dictionary).get("workspaceId", ""))
	var workspace_title := str((workspace as Dictionary).get("title", ""))
	if not workspace_title.is_empty() and agent_isles_workspace_id != previous_workspace_id:
		_show_toast("已连接工作区：%s" % workspace_title, 4.0)


func _setup_input() -> void:
	var keys := {
		"walk_left": [KEY_A, KEY_LEFT], "walk_right": [KEY_D, KEY_RIGHT],
		"walk_up": [KEY_W, KEY_UP], "walk_down": [KEY_S, KEY_DOWN],
		"jump": [KEY_SPACE], "interact": [KEY_E], "echo": [KEY_F],
		"undo_echo": [KEY_Q], "reset_island": [KEY_R], "photo": [KEY_TAB],
		"mute": [KEY_M], "close_game": [KEY_ESCAPE], "nature_motion": [KEY_N],
		"camera_motion": [KEY_B],
		"inventory": [KEY_I], "equip_tool": [KEY_G],
		"cycle_echo": [KEY_C], "rotate_echo": [KEY_T],
		"cycle_view": [KEY_V], "overview": [KEY_1], "third_person": [KEY_2],
		"first_person": [KEY_3], "sprint": [KEY_SHIFT]
	}
	for action: String in keys:
		if not InputMap.has_action(action):
			InputMap.add_action(action)
		for key: int in keys[action]:
			var event := InputEventKey.new()
			event.physical_keycode = key
			InputMap.action_add_event(action, event)


func _build_world() -> void:
	var island_art := WORLD_SCENE.instantiate()
	add_child(island_art)
	# Camera-only geometry includes the roofs and treetops that walking colliders omit.
	for visual: MeshInstance3D in island_art.find_children("*", "MeshInstance3D"):
		var obstacle := StaticBody3D.new()
		obstacle.collision_layer = 2
		obstacle.collision_mask = 0
		var shape := CollisionShape3D.new()
		shape.shape = visual.mesh.create_trimesh_shape()
		obstacle.add_child(shape)
		visual.add_child(obstacle)
	# Blender-baked contact shading works in the same WebGL renderer as gameplay.
	var ground_shade := GROUND_SHADE.instantiate()
	for mesh: MeshInstance3D in ground_shade.find_children("*", "MeshInstance3D"):
		mesh.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	add_child(ground_shade)
	var layout: Array = JSON.parse_string(FileAccess.get_file_as_string("res://assets/colliders.json"))
	for item: Dictionary in layout:
		var p: Array = item.position
		var s: Array = item.size
		_add_solid(Vector3(p[0], p[1], p[2]), Vector3(s[0], s[1], s[2]), item.name)
	if OS.has_feature("web") or "--stream-neighbors" in OS.get_cmdline_user_args():
		# Bridges stay closed until their walking surfaces and collisions are ready.
		for x in [-12.0, 12.0]:
			var barrier := _add_solid(Vector3(x, 1, 3), Vector3(.35, 8, 3.2), "RegionLoadingBoundary")
			region_barriers.append(barrier)
			for z in [-1.25, 1.25]:
				var post := MeshInstance3D.new()
				var post_mesh := BoxMesh.new()
				post_mesh.size = Vector3(.16, 1.4, .16)
				post.mesh = post_mesh
				post.position = Vector3(0, -.3, z)
				post.material_override = _material(Color("715540"), .9)
				barrier.add_child(post)
			for y in [-.4, .1]:
				var rail := MeshInstance3D.new()
				var rail_mesh := BoxMesh.new()
				rail_mesh.size = Vector3(.12, .18, 2.7)
				rail.mesh = rail_mesh
				rail.position.y = y
				rail.material_override = _material(Color("d3a44c"), .9)
				barrier.add_child(rail)
			var sign := Label3D.new()
			sign.font = preload("res://assets/fonts/MosslightUI.ttf")
			sign.font_size = 42
			sign.pixel_size = .01
			sign.position.y = 1.25
			sign.billboard = BaseMaterial3D.BILLBOARD_ENABLED
			sign.no_depth_test = true
			sign.render_priority = 110
			sign.set_meta("region_name", "溪间庭院" if x < 0 else "晴沙绿洲")
			barrier.add_child(sign)
			region_signs.append(sign)
		_update_region_signs()
	else:
		_install_neighbor_regions()
	# Invisible coastline fences keep the land's rounded visual edge forgiving.
	_add_solid(Vector3(-12.25, 0, -4.3), Vector3(.2, 4, 11.6), "coastline")
	_add_solid(Vector3(-12.25, 0, 7.3), Vector3(.2, 4, 5.6), "coastline")
	# The east bridge spans z=1.5..4.5; retain the rest of the original coastline.
	_add_solid(Vector3(12.25, 0, -4.3), Vector3(.2, 4, 11.6), "coastline")
	_add_solid(Vector3(12.25, 0, 7.3), Vector3(.2, 4, 5.6), "coastline")
	for edge: Vector3 in [Vector3(0, 0, -10.1), Vector3(0, 0, 10.1)]:
		_add_solid(edge, Vector3(25, 4, .2), "coastline")
	source_body = _make_crate(SOURCE, false)
	var sea := MeshInstance3D.new()
	var sea_mesh := PlaneMesh.new()
	sea_mesh.size = Vector2(200, 200)
	sea.mesh = sea_mesh
	sea.position.y = -1.5
	sea.material_override = _material(Color("4c7f7d"), .85)
	add_child(sea)
	# Matte concentric ripples anchor the miniature landmass in a quiet sea.
	for i in range(4):
		var ripple := MeshInstance3D.new()
		var mesh := TorusMesh.new()
		mesh.inner_radius = 15.0 + i * 2.8
		mesh.outer_radius = mesh.inner_radius + .045
		mesh.rings = 96
		mesh.ring_segments = 6
		ripple.mesh = mesh
		ripple.position.y = -1.47
		ripple.scale.z = .78
		ripple.material_override = _material(Color("579093"), .9)
		ripple.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		add_child(ripple)
	var environment := WorldEnvironment.new()
	var env := Environment.new()
	env.background_mode = Environment.BG_COLOR
	env.background_color = Color("4c7f7d")
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color("d1e3ef")
	env.ambient_light_energy = .55
	env.tonemap_mode = Environment.TONE_MAPPER_LINEAR
	environment.environment = env
	add_child(environment)
	var sun := DirectionalLight3D.new()
	sun.rotation_degrees = Vector3(-48, -35, 0)
	# One calibrated lighting setup for both the desktop preview and Web export.
	sun.light_color = Color("ffc68f")
	sun.light_energy = .45
	sun.shadow_enabled = true
	sun.directional_shadow_mode = DirectionalLight3D.SHADOW_ORTHOGONAL
	sun.directional_shadow_max_distance = 70
	sun.shadow_bias = .03
	sun.shadow_blur = 2.0
	add_child(sun)
	var fill := DirectionalLight3D.new()
	fill.rotation_degrees = Vector3(-35, 125, 0)
	fill.light_color = Color("a4d7e4")
	fill.light_energy = .20
	add_child(fill)
	camera = Camera3D.new()
	camera.projection = Camera3D.PROJECTION_ORTHOGONAL
	camera.size = camera_zoom
	camera.position = default_camera_position
	camera.far = 200
	add_child(camera)
	camera.look_at(camera_target)
	camera.current = true
	shrine_light = OmniLight3D.new()
	shrine_light.position = SHRINE + Vector3(0, 1.1, 0)
	shrine_light.light_color = Color("bfffac")
	shrine_light.light_energy = .35
	shrine_light.omni_range = 5
	add_child(shrine_light)
	var rng := RandomNumberGenerator.new()
	rng.seed = 43
	for i in range(28):
		var mote := MeshInstance3D.new()
		var mesh := SphereMesh.new()
		mesh.radius = rng.randf_range(.025, .048)
		mesh.height = mesh.radius * 2
		mesh.radial_segments = 8
		mesh.rings = 4
		mote.mesh = mesh
		mote.material_override = _material(Color("f3e2a2"), .4, true)
		mote.position = Vector3(rng.randf_range(-10, 10), rng.randf_range(.4, 2.7), rng.randf_range(-8, 8))
		mote.set_meta("origin", mote.position)
		mote.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		add_child(mote)
		motes.append(mote)


func _install_neighbor_regions(staged: bool = false) -> bool:
	if desert == null:
		if staged:
			JavaScriptBridge.eval("window.prepareNeighborRegion('晴沙绿洲')")
			await get_tree().process_frame
		var desert_scene := load(DESERT_PATH) as PackedScene
		if desert_scene == null:
			return false
		desert = desert_scene.instantiate()
		desert.position = DESERT_ORIGIN
		add_child(desert)
		if web_lightweight:
			WEB_RENDERING.apply(desert)
		if staged:
			await RenderingServer.frame_post_draw
			await get_tree().process_frame
	if streamside == null:
		if staged:
			JavaScriptBridge.eval("window.prepareNeighborRegion('溪间庭院')")
			await get_tree().process_frame
		var streamside_scene := load(STREAMSIDE_PATH) as PackedScene
		if streamside_scene == null:
			return false
		streamside = streamside_scene.instantiate()
		streamside.position = STREAMSIDE_ORIGIN
		add_child(streamside)
		if web_lightweight:
			WEB_RENDERING.apply(streamside)
		if staged:
			await RenderingServer.frame_post_draw
			await get_tree().process_frame
	for barrier: StaticBody3D in region_barriers:
		barrier.queue_free()
	region_barriers.clear()
	region_signs.clear()
	return true


func _update_region_signs() -> void:
	for sign: Label3D in region_signs:
		sign.text = str(sign.get_meta("region_name")) + ("\n暂未开放 · 加载失败" if regions_error else "\n区域准备中")
		sign.modulate = Color("ffb6a3") if regions_error else Color("fff2cb")


func _request_neighbor_regions() -> void:
	if regions_loading or (desert != null and streamside != null):
		return
	regions_loading = true
	regions_error = false
	_update_region_signs()
	JavaScriptBridge.eval("window.loadNeighborRegions()")


func _add_solid(at: Vector3, size: Vector3, label: String) -> StaticBody3D:
	var body := StaticBody3D.new()
	body.name = label
	var collision := CollisionShape3D.new()
	var shape := BoxShape3D.new()
	shape.size = size
	collision.shape = shape
	body.add_child(collision)
	add_child(body)
	body.position = at
	return body


func _make_crate(at: Vector3, is_echo: bool) -> StaticBody3D:
	var body := _add_solid(at + Vector3(0, .45, 0), CRATE_SIZE, "Echo" if is_echo else "Original")
	body.set_meta("echo_kind", "crate")
	if not is_echo:
		body.add_to_group("echo_sources")
	var art := CRATE_SCENE.instantiate() as Node3D
	art.position.y = -.45
	body.add_child(art)
	if is_echo:
		body.set_meta("echo", true)
		var trim := MeshInstance3D.new()
		var torus := TorusMesh.new()
		torus.inner_radius = .54
		torus.outer_radius = .565
		trim.mesh = torus
		trim.position.y = -.37
		trim.material_override = _material(Color("b2efd8"), .5, true)
		body.add_child(trim)
	if web_lightweight:
		WEB_RENDERING.apply(body)
	return body


func _build_player() -> void:
	player = CharacterBody3D.new()
	player.name = "Lumi"
	player.floor_snap_length = .18
	player.floor_stop_on_slope = true
	var collision := CollisionShape3D.new()
	var capsule := CapsuleShape3D.new()
	capsule.radius = .27
	capsule.height = 1.38
	collision.shape = capsule
	collision.position.y = .70
	player.add_child(collision)
	add_child(player)
	player.position = START
	hero = HERO_SCENE.instantiate() as Node3D
	player.add_child(hero)
	preview = MeshInstance3D.new()
	var box_mesh := BoxMesh.new()
	box_mesh.size = CRATE_SIZE
	preview.mesh = box_mesh
	preview_material = ShaderMaterial.new()
	preview_material.shader = preload("res://assets/echo_preview.gdshader")
	preview_material.render_priority = 101
	preview.material_override = preview_material
	preview.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	preview.visible = false
	add_child(preview)
	if OS.has_feature("web"):
		_warm_echo_preview()


func _warm_echo_preview() -> void:
	# Submit the actual preview shader during startup, before the first interaction.
	var warmup := MeshInstance3D.new()
	warmup.mesh = preview.mesh
	warmup.material_override = preview_material
	warmup.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	warmup.scale = Vector3.ONE * .001
	warmup.position = Vector3(0, 0, -2)
	camera.add_child(warmup)
	await RenderingServer.frame_post_draw
	warmup.queue_free()


func _material(color: Color, roughness: float, glow: bool = false) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = color
	m.roughness = roughness
	if glow:
		m.emission_enabled = true
		m.emission = Color(color.r, color.g, color.b)
		m.emission_energy_multiplier = .45
	return m


func _physics_process(delta: float) -> void:
	if game_paused or agent_isles_panel_open:
		return
	sanctuary_computer.advance(delta)
	if sanctuary_computer.active:
		_update_camera(delta)
		_update_hud()
		return
	var input := Input.get_vector("walk_left", "walk_right", "walk_up", "walk_down")
	var right := camera.global_basis.x
	var back := camera.global_basis.z
	right.y = 0
	back.y = 0
	var direction := (right.normalized() * input.x + back.normalized() * input.y).normalized()
	var speed := SPEED * (1.55 if Input.is_action_pressed("sprint") else 1.0)
	player.velocity.x = move_toward(player.velocity.x, direction.x * speed, delta * 26)
	player.velocity.z = move_toward(player.velocity.z, direction.z * speed, delta * 26)
	if not player.is_on_floor() or player.velocity.y > 0:
		player.velocity.y -= GRAVITY * delta
	elif Input.is_action_just_pressed("jump"):
		player.velocity.y = JUMP
		_tone(420, .10, .12)
	else:
		player.velocity.y = 0
	var previous_position := player.position
	var was_grounded := player.is_on_floor()
	var fall_speed := maxf(0, -player.velocity.y)
	player.move_and_slide()
	if player.velocity.y <= 0:
		for i in range(player.get_slide_collision_count()):
			var contact := player.get_slide_collision(i)
			if contact.get_normal().y > .7 and contact.get_collider().has_meta("bounce_speed"):
				player.velocity.y = contact.get_collider().get_meta("bounce_speed")
				_tone(660, .16, .12)
				break
	if view_mode == ViewMode.FIRST_PERSON:
		first_person_feedback.advance(delta, player.position - previous_position,
			player.is_on_floor(), fall_speed if not was_grounded else 0.0, camera_motion)
	if direction.length_squared() > .01:
		if view_mode == ViewMode.OVERVIEW:
			facing = direction
		hero.rotation.y = lerp_angle(hero.rotation.y, atan2(direction.x, direction.z), delta * 14)
	if view_mode != ViewMode.OVERVIEW:
		# Strafing does not move the echo target away from the viewing direction.
		facing = Vector3(-sin(look_yaw), 0, -cos(look_yaw))
	var running := Vector2(player.velocity.x, player.velocity.z).length() > .15
	hero.position.y = absf(sin(elapsed * 12)) * .055 if running and player.is_on_floor() else 0.0
	hero.rotation.z = sin(elapsed * 12) * .055 if running else sin(elapsed * 1.8) * .015
	if player.position.y < -4:
		player.position = START
		player.velocity = Vector3.ZERO
		first_person_feedback.reset()
	var now_in_desert := player.position.x > 17.6
	var now_in_streamside := player.position.x < -17.6
	if now_in_desert != in_desert or now_in_streamside != in_streamside:
		in_desert = now_in_desert
		in_streamside = now_in_streamside
		overview_labels[0].text = "FIELD NOTES     /     002" if in_desert else "FIELD NOTES     /     001"
		overview_labels[1].text = "SUNWAKE" if in_desert else "MOSSLIGHT"
		overview_labels[2].text = "晴 沙 绿 洲" if in_desert else "苔 光 之 屿"
		overview_labels[3].text = "越过石桥，沿着砂岩小径寻找绿洲。" if in_desert else "沿着石径，穿过树影。"
		if in_streamside:
			overview_labels[0].text = "FIELD NOTES     /     003"
			overview_labels[1].text = "STREAMSIDE"
			overview_labels[2].text = "溪 间 庭 院"
			overview_labels[3].text = "古树荫下，沿溪过桥，去廊下坐一会儿。"
			_show_toast("溪间庭院" if embedded_mode else "抵达溪间庭院。沿溪向南过石桥，坡道通向茶屋。", 3 if embedded_mode else 5)
		else:
			var region_message := "晴沙绿洲" if in_desert else "苔光之屿"
			if not embedded_mode:
				region_message = "抵达晴沙绿洲。沙丘可步行攀登，石桥通往苔光之屿。" if in_desert else "回到苔光之屿。"
			_show_toast(region_message, 3 if embedded_mode else 5)
	if not "--portrait" in OS.get_cmdline_user_args():
		_update_camera(delta)
	if echo_active:
		_update_preview()
	if Input.is_action_just_pressed("interact"):
		_interact()
	if Input.is_action_just_pressed("echo"):
		use_echo()
	if Input.is_action_just_pressed("undo_echo") and not echoes.is_empty():
		var last: StaticBody3D = echoes.pop_back()
		last.queue_free()
		_tone(270, .12, .12)
	_update_hud()


func set_echo_active(value: bool) -> void:
	echo_active = value and knows_echo(selected_echo)
	preview.visible = false
	placement_valid = false
	if echo_active:
		garden.equipped = false
		garden.refresh()
		preview.mesh = ECHO_OBJECTS.preview_mesh(selected_echo)
		_update_preview()
	_update_hud()


func use_echo() -> void:
	if game_paused or agent_isles_panel_open or not knows_echo(selected_echo):
		return
	if not echo_active:
		set_echo_active(true)
	else:
		_update_preview()
		place_echo()


func knows_echo(kind: String) -> bool:
	return learned if kind == "crate" else learned_echoes.has(kind)


func select_echo(kind: String) -> void:
	if not knows_echo(kind):
		return
	selected_echo = kind
	echo_rotation = PI / 2 if absf(facing.z) > absf(facing.x) else 0.0
	set_echo_active(true)


func _nearby_echo_source() -> StaticBody3D:
	var nearest: StaticBody3D
	var distance := 2.6
	for source: StaticBody3D in get_tree().get_nodes_in_group("echo_sources"):
		if knows_echo(source.get_meta("echo_kind")):
			continue
		var separation := player.global_position.distance_to(source.global_position)
		if separation >= distance:
			continue
		var ray := PhysicsRayQueryParameters3D.create(player.global_position + Vector3.UP * .7, source.global_position, 1, [player.get_rid(), source.get_rid()])
		if not get_world_3d().direct_space_state.intersect_ray(ray).is_empty():
			continue
		nearest = source
		distance = separation
	return nearest


func _update_preview() -> void:
	if not echo_active:
		preview.visible = false
		placement_valid = false
		return
	var size: Vector3 = ECHO_OBJECTS.SIZES[selected_echo]
	var rotation := echo_rotation if selected_echo == "plank" else 0.0
	var basis := Basis(Vector3.UP, rotation)
	var candidate := player.position + facing * (2.3 if selected_echo == "plank" else 1.65)
	candidate.x = snappedf(candidate.x, .5)
	candidate.z = snappedf(candidate.z, .5)
	var samples: Array[Vector3] = [candidate]
	if selected_echo == "plank":
		var end := basis.x * (size.x / 2 - .15)
		samples.append_array([candidate - end, candidate + end])
	var heights: Array[float] = []
	for sample: Vector3 in samples:
		var ray := PhysicsRayQueryParameters3D.create(
			Vector3(sample.x, player.position.y + 2.0, sample.z), Vector3(sample.x, -1, sample.z), 1, [player.get_rid()])
		var hit := get_world_3d().direct_space_state.intersect_ray(ray)
		heights.append(hit.position.y if not hit.is_empty() and _echo_surface_allowed(hit.position) else -INF)
	var height: float = heights.max()
	placement_valid = false
	preview.visible = not photo_mode
	if not is_finite(height):
		preview.visible = false
		return
	preview_position = Vector3(candidate.x, height + .012, candidate.z)
	preview.position = preview_position + Vector3(0, size.y / 2, 0)
	preview.rotation.y = rotation
	var shape := BoxShape3D.new()
	shape.size = size - Vector3(.06, .02, .06)
	var query := PhysicsShapeQueryParameters3D.new()
	query.collision_mask = 1
	query.shape = shape
	query.transform = Transform3D(basis, preview.position)
	var overlaps := get_world_3d().direct_space_state.intersect_shape(query, 4)
	var supported := absf(heights[0] - height) < .12
	if selected_echo == "plank":
		supported = supported or (absf(heights[1] - height) < .12 and absf(heights[2] - height) < .12)
	placement_valid = overlaps.is_empty() and supported
	placement_valid = placement_valid and preview_position.y <= player.position.y + 1.05
	preview_material.set_shader_parameter("tint", Color(.55, .95, .82, .30) if placement_valid else Color(.96, .40, .32, .30))


func _echo_surface_allowed(point: Vector3) -> bool:
	var on_meadow := absf(point.x) < 11.7 and absf(point.z) < 9.6
	var on_desert := absf(point.x - DESERT_ORIGIN.x) < 11.7 and absf(point.z) < 9.6
	var on_bridge := point.x >= 11.7 and point.x <= 18.3 and absf(point.z - 3) < .95
	var on_west_bridge := point.x <= -11.7 and point.x >= -18.3 and absf(point.z - 3) < .95
	return on_meadow or on_desert or on_bridge or on_west_bridge or (streamside != null and streamside.allows_echo(point))


func place_echo() -> bool:
	if not echo_active or not placement_valid:
		_show_toast("这里放不下回响。朝空地走一步，再试试。", 2.5)
		return false
	if echoes.size() == MAX_ECHOES:
		var oldest: StaticBody3D = echoes.pop_front()
		oldest.queue_free()
	var echo: StaticBody3D
	if selected_echo == "crate":
		echo = _make_crate(preview_position, true)
	else:
		echo = ECHO_OBJECTS.create(selected_echo, true)
		echo.position = preview_position + Vector3(0, ECHO_OBJECTS.SIZES[selected_echo].y / 2, 0)
		echo.rotation.y = echo_rotation if selected_echo == "plank" else 0.0
		add_child(echo)
		if web_lightweight:
			WEB_RENDERING.apply(echo)
	echoes.append(echo)
	_tone(520, .20, .16)
	return true


func _interact() -> void:
	if game_paused or agent_isles_panel_open or sanctuary_computer.active:
		return
	if sanctuary_computer.can_grab():
		sanctuary_computer.grab()
		return
	if garden.interact():
		return
	if regions_error and absf(player.position.x) > 9.5 and absf(player.position.z - 3) < 2:
		_request_neighbor_regions()
		return
	var source := _nearby_echo_source()
	if source != null:
		var kind: String = source.get_meta("echo_kind")
		if kind == "crate":
			learned = true
		else:
			learned_echoes.append(kind)
		select_echo(kind)
		_tone(880, .4, .20)
		var tip := "踩上去可以弹得更高。" if kind == "mushroom" else "按 T 转向，可以架桥或搭在木箱上。" if kind == "plank" else ""
		_show_toast("已学会「%s回响」！%s F 放置 · C 切换 · 右键收起" % [ECHO_OBJECTS.NAMES[kind], tip], 8)
	elif streamside != null and streamside.at_lookout(player.global_position):
		_show_toast("听风台 · 树梢就在身旁，溪水从脚下流过。歇一会儿，再去别处走走吧。", 7)
	else:
		var npc: StaticBody3D = residents.nearest(player)
		if npc != null:
			if embedded_mode or agent_isles_connected:
				talking_to = null
				dialogue_panel.visible = false
				dialogue_left = 0
				mouse_was_captured = false
				Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
				_emit_agent_isles("resident:selected", {"residentId": npc.get_meta("agent_isles_id")})
				return
			talking_to = npc
			dialogue_name.text = npc.get_meta("display_name")
			dialogue_text.text = residents.talk(npc, learned)
			dialogue_left = 10
			dialogue_panel.visible = true
			toast.visible = false


func set_view_mode(mode: ViewMode) -> void:
	if view_mode == mode:
		return
	if view_mode == ViewMode.OVERVIEW:
		look_yaw = atan2(camera.global_basis.z.x, camera.global_basis.z.z)
	view_mode = mode
	first_person_feedback.reset()
	first_person_feedback.visible = mode == ViewMode.FIRST_PERSON
	look_pitch = -.08 if mode == ViewMode.FIRST_PERSON else -.30
	camera.projection = Camera3D.PROJECTION_ORTHOGONAL if mode == ViewMode.OVERVIEW else Camera3D.PROJECTION_PERSPECTIVE
	camera.size = camera_zoom
	camera.fov = 70
	camera.near = .06
	camera_arm_length = third_person_distance
	hero.visible = mode != ViewMode.FIRST_PERSON
	crosshair.visible = mode == ViewMode.FIRST_PERSON
	for label: Label in overview_labels:
		label.visible = mode == ViewMode.OVERVIEW and not embedded_mode
	view_hint.visible = not embedded_mode
	view_hint.position = Vector2(48, 192) if mode == ViewMode.OVERVIEW else Vector2(48, 34)
	if mode == ViewMode.OVERVIEW:
		Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
		camera_focus = Vector3.ZERO
	else:
		facing = Vector3(-sin(look_yaw), 0, -cos(look_yaw))
		hero.rotation.y = atan2(facing.x, facing.z)
	_update_view_hint()
	if not embedded_mode:
		_show_toast(["俯视角：滚轮观察小岛。", "第三人称：点击锁定鼠标，或按住鼠标拖动镜头。", "第一人称：点击锁定或拖动观察，WASD 行走，空格跳跃。"][mode], 5)
	_update_camera(1.0)


func _update_camera(delta: float) -> void:
	if view_mode == ViewMode.OVERVIEW:
		# Follow either bridge; medium zoom frames the neighboring pair, far zoom all three.
		var region_center := DESERT_ORIGIN * clampf((player.position.x - 9) / 12, 0, 1)
		region_center += STREAMSIDE_ORIGIN * clampf((-player.position.x - 9) / 12, 0, 1)
		region_center.y = 3 * clampf((-player.position.x - 9) / 12, 0, 1) + 1.5 * clampf((player.position.x - 9) / 12, 0, 1)
		var focus := region_center.lerp(player.position, clampf((26 - camera_zoom) / 16, 0, 1))
		var pair_center := STREAMSIDE_ORIGIN * .5 if player.position.x < -9 else DESERT_ORIGIN * .5
		focus = focus.lerp(pair_center, clampf((camera_zoom - 26) / 24, 0, 1))
		focus = focus.lerp(Vector3(0, 2, 0), clampf((camera_zoom - 50) / 30, 0, 1))
		camera_focus = camera_focus.lerp(focus, 1 - exp(-delta * 5))
		camera.position = default_camera_position + camera_focus
		camera.look_at(camera_target + camera_focus)
		return
	camera.rotation = Vector3(look_pitch, look_yaw, 0)
	if view_mode == ViewMode.FIRST_PERSON:
		camera.position = player.position + Vector3(0, 1.30 + first_person_feedback.eye_offset, 0)
		camera.fov = 70 + first_person_feedback.fov_bonus
		return
	var pivot := player.position + Vector3(0, 1.10, 0)
	var offset := camera.basis.z * third_person_distance
	var query := PhysicsShapeQueryParameters3D.new()
	query.shape = camera_obstacle_shape
	query.transform = Transform3D(Basis.IDENTITY, pivot)
	query.motion = offset
	query.collision_mask = 3
	query.exclude = [player.get_rid()]
	var motion := get_world_3d().direct_space_state.cast_motion(query)
	var safe_length := maxf(0, third_person_distance * motion[0] - .04)
	# Retract immediately at obstacles; ease out only into space already checked.
	camera_arm_length = minf(safe_length, lerpf(camera_arm_length, third_person_distance, 1 - exp(-delta * 8)))
	camera.position = pivot + camera.basis.z * camera_arm_length
	hero.visible = camera_arm_length > .65


func _update_view_hint() -> void:
	var mode_name: String = ["俯视", "第三人称", "第一人称"][view_mode]
	view_hint.text = "视角：" + mode_name + "  ·  V 切换 / 1、2、3 直达"
	if view_mode != ViewMode.OVERVIEW:
		view_hint.text += "\n鼠标观察 · 按住拖动 / 点击锁定 · Esc 释放并暂停"
	if view_mode == ViewMode.FIRST_PERSON:
		view_hint.text += "\nB 镜头动态：" + ("开启" if camera_motion else "关闭")


func _process(delta: float) -> void:
	distance_haze.set_shader_parameter("focus_position", player.global_position)
	distance_haze.set_shader_parameter("clear_radius", 10.0 if view_mode == ViewMode.OVERVIEW else 7.0)
	if game_paused:
		return
	var captured := Input.mouse_mode == Input.MOUSE_MODE_CAPTURED
	if mouse_was_captured and not captured and view_mode != ViewMode.OVERVIEW:
		# Browsers may consume Escape to exit pointer lock before Godot sees the key.
		set_game_paused(true)
		return
	mouse_was_captured = captured
	elapsed += delta
	if nature_motion:
		nature_time += delta
	environment_details.advance(delta, player.position, nature_motion)
	if desert != null:
		desert.advance(delta, nature_motion)
	if streamside != null:
		streamside.advance(delta, nature_motion)
	garden.advance(delta)
	residents.advance(delta, player.position, nature_motion, not photo_mode)
	if talking_to != null:
		dialogue_left -= delta
		if dialogue_left <= 0 or residents.nearest(player) != talking_to:
			talking_to = null
			dialogue_panel.visible = false
			toast.visible = true
	for i in range(motes.size()):
		var origin: Vector3 = motes[i].get_meta("origin")
		motes[i].position = origin + Vector3(sin(nature_time * .35 + i) * .35, sin(nature_time * .7 + i) * .18, cos(nature_time * .4 + i) * .3)
	if toast_left > 0:
		toast_left -= delta
		toast.modulate.a = minf(toast_left, 1)
	if screenshot_frames >= 0:
		screenshot_frames -= 1
		if screenshot_frames == 0:
			_capture_and_quit()


func _unhandled_input(event: InputEvent) -> void:
	if agent_isles_panel_open:
		return
	if garden.opened:
		if event.is_action_pressed("inventory") or event.is_action_pressed("close_game"):
			garden.set_open(false)
		return
	if event.is_action_pressed("inventory") and not game_paused:
		garden.set_open(true)
		return
	if event.is_action_pressed("close_game"):
		set_game_paused(not game_paused)
		return
	if game_paused:
		if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
			set_game_paused(false)
			if view_mode != ViewMode.OVERVIEW:
				Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
		return
	if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_RIGHT and echo_active:
		set_echo_active(false)
		get_viewport().set_input_as_handled()
		return
	if event.is_action_pressed("cycle_view"):
		set_view_mode(((view_mode + 1) % 3) as ViewMode)
	elif event.is_action_pressed("cycle_echo"):
		var unlocked: Array = ECHO_OBJECTS.ORDER.filter(func(kind: String): return knows_echo(kind))
		if not unlocked.is_empty():
			select_echo(unlocked[(unlocked.find(selected_echo) + 1) % unlocked.size()])
			_show_toast("%s回响 · F 放置 · C 切换 · 右键收起" % ECHO_OBJECTS.NAMES[selected_echo], 3)
	elif event.is_action_pressed("rotate_echo") and echo_active and selected_echo == "plank":
		echo_rotation = fposmod(echo_rotation + PI / 2, PI)
		_update_preview()
	elif event.is_action_pressed("equip_tool"):
		garden.toggle_equipped()
	elif event.is_action_pressed("overview"):
		set_view_mode(ViewMode.OVERVIEW)
	elif event.is_action_pressed("third_person"):
		set_view_mode(ViewMode.THIRD_PERSON)
	elif event.is_action_pressed("first_person"):
		set_view_mode(ViewMode.FIRST_PERSON)
	elif event is InputEventMouseMotion and view_mode != ViewMode.OVERVIEW:
		if Input.mouse_mode == Input.MOUSE_MODE_CAPTURED or event.button_mask & (MOUSE_BUTTON_MASK_RIGHT | MOUSE_BUTTON_MASK_LEFT):
			look_yaw = wrapf(look_yaw - event.screen_relative.x * .0025, -PI, PI)
			look_pitch = clampf(look_pitch - event.screen_relative.y * .0025, -1.20, .95 if view_mode == ViewMode.FIRST_PERSON else .25)
	elif event.is_action_pressed("reset_island"):
		Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
		get_tree().reload_current_scene()
	elif event.is_action_pressed("photo"):
		photo_mode = not photo_mode
		ui.visible = not photo_mode
		_update_preview()
	elif event.is_action_pressed("mute"):
		AudioServer.set_bus_mute(0, not AudioServer.is_bus_mute(0))
	elif event.is_action_pressed("nature_motion"):
		nature_motion = not nature_motion
		_show_toast("环境动态已开启。" if nature_motion else "环境动态已关闭，仍可正常探索。", 3)
	elif event.is_action_pressed("camera_motion"):
		camera_motion = not camera_motion
		first_person_feedback.reset()
		_update_view_hint()
		_show_toast("镜头动态已开启。" if camera_motion else "镜头动态已关闭，脚步声仍保留。", 3)
	elif event is InputEventMouseButton and event.pressed:
		if event.button_index == MOUSE_BUTTON_LEFT and view_mode != ViewMode.OVERVIEW:
			Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
			return
		if view_mode == ViewMode.FIRST_PERSON:
			return
		var step := -1.0 if event.button_index == MOUSE_BUTTON_WHEEL_UP else 1.0
		if event.button_index not in [MOUSE_BUTTON_WHEEL_UP, MOUSE_BUTTON_WHEEL_DOWN]:
			return
		if view_mode == ViewMode.THIRD_PERSON:
			third_person_distance = clampf(third_person_distance + step * .5, 2.0, 8.0)
			return
		if event.button_index == MOUSE_BUTTON_WHEEL_UP:
			camera_zoom = maxf(10, camera_zoom - 2)
		elif event.button_index == MOUSE_BUTTON_WHEEL_DOWN:
			camera_zoom = minf(80, camera_zoom + 2)
		else:
			return
		camera.size = camera_zoom


func set_game_paused(value: bool) -> void:
	if garden != null and garden.opened and not value:
		garden.opened = false
		garden.overlay.visible = false
	game_paused = value
	mouse_was_captured = false
	for action in ["walk_left", "walk_right", "walk_up", "walk_down", "jump", "sprint", "interact", "echo", "undo_echo"]:
		Input.action_release(action)
	player.velocity = Vector3.ZERO
	pause_panel.visible = value and (garden == null or not garden.opened)
	if value:
		Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
		photo_mode = false
		ui.visible = true
		preview.visible = false
	if music != null:
		music.stream_paused = value
	if sound != null and value:
		sound.stop()
	if first_person_feedback != null and value:
		first_person_feedback.footstep.stop()


func _notification(what: int) -> void:
	if what == NOTIFICATION_APPLICATION_FOCUS_OUT and pause_panel != null:
		if embedded_mode:
			# Focus moves to the host conversation without opening the game pause menu.
			mouse_was_captured = false
			player.velocity = Vector3.ZERO
			for action in ["walk_left", "walk_right", "walk_up", "walk_down", "jump", "sprint", "interact", "echo", "undo_echo"]:
				Input.action_release(action)
			return
		set_game_paused(true)


func _build_ui() -> void:
	var canvas := CanvasLayer.new()
	add_child(canvas)
	ui = Control.new()
	ui.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	ui.mouse_filter = Control.MOUSE_FILTER_IGNORE
	canvas.add_child(ui)
	var theme := Theme.new()
	theme.default_font = preload("res://assets/fonts/MosslightUI.ttf")
	theme.default_font_size = 18
	ui.theme = theme
	overview_labels.append(_label("FIELD NOTES     /     001", Vector2(48, 34), 15, Color("f0d79d")))
	overview_labels.append(_label("MOSSLIGHT", Vector2(44, 57), 48, Color("fff2d6")))
	overview_labels.append(_label("苔 光 之 屿", Vector2(48, 121), 19, Color("f6e4bf")))
	overview_labels.append(_label("沿着石径，穿过树影。", Vector2(48, 160), 16, Color("deede0")))
	view_hint = _label("", Vector2(48, 192), 15, Color("eef2df"))
	for label: Label in overview_labels:
		label.visible = not embedded_mode
	view_hint.visible = not embedded_mode
	crosshair = _label("·", Vector2.ZERO, 32, Color("fff3d8"))
	crosshair.set_anchors_and_offsets_preset(Control.PRESET_CENTER)
	crosshair.offset_left = -12
	crosshair.offset_right = 12
	crosshair.offset_top = -24
	crosshair.offset_bottom = 24
	crosshair.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	crosshair.visible = false
	game_hud = _panel(Vector2(40, -112), Vector2(1520, 78), Color(.055, .15, .16, .90))
	game_hud.set_anchors_preset(Control.PRESET_BOTTOM_WIDE)
	game_hud.offset_left = 40
	game_hud.offset_right = -40
	game_hud.offset_top = -112
	game_hud.offset_bottom = -34
	echo_label = _label("01   未知回响", Vector2(22, 12), 21, Color("fae6b7"), game_hud)
	_label("WASD 移动    空格 跳跃    E 互动    F 拿出 / 放置    C 回响    T 转向    右键 收起    Q 撤回", Vector2(400, 15), 16, Color("eef2df"), game_hud)
	_label("Shift 奔跑    滚轮 缩放    V 视角    Tab 隐藏界面    N 动态    M 静音    R 重开    Esc 暂停", Vector2(400, 45), 14, Color("a5c4b9"), game_hud)
	_label("回响之杖  /  最多保留 3 个造物", Vector2(22, 45), 13, Color("a5c4b9"), game_hud)
	game_hud.visible = not embedded_mode
	prompt = _label("", Vector2(0, -185), 22, Color("fff5d6"))
	prompt.set_anchors_preset(Control.PRESET_CENTER_BOTTOM)
	prompt.offset_left = -430
	prompt.offset_right = 430
	prompt.offset_top = -185
	prompt.offset_bottom = -145
	prompt.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	toast = _label("", Vector2(0, -226), 17, Color("fff3d8"))
	toast.set_anchors_preset(Control.PRESET_CENTER_BOTTOM)
	toast.offset_left = -620
	toast.offset_right = 620
	toast.offset_top = -226
	toast.offset_bottom = -190
	toast.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	if embedded_mode:
		prompt.offset_top = -100
		prompt.offset_bottom = -60
		toast.offset_top = -144
		toast.offset_bottom = -108
	dialogue_panel = _panel(Vector2.ZERO, Vector2(1040, 140), Color(.055, .15, .16, .96))
	dialogue_panel.set_anchors_preset(Control.PRESET_CENTER_BOTTOM)
	dialogue_panel.offset_left = -520
	dialogue_panel.offset_right = 520
	dialogue_panel.offset_top = -350
	dialogue_panel.offset_bottom = -210
	if embedded_mode:
		dialogue_panel.offset_top = -250
		dialogue_panel.offset_bottom = -110
	dialogue_name = _label("", Vector2(26, 14), 21, Color("efce87"), dialogue_panel)
	dialogue_text = _label("", Vector2(26, 49), 23, Color("fff3d8"), dialogue_panel)
	dialogue_text.size = Vector2(988, 58)
	dialogue_text.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_label("E 再聊一句 · 走远自动结束", Vector2(26, 111), 14, Color("a5c4b9"), dialogue_panel)
	dialogue_panel.visible = false
	pause_panel = _panel(Vector2.ZERO, Vector2(560, 170), Color(.055, .15, .16, .97))
	pause_panel.set_anchors_preset(Control.PRESET_CENTER)
	pause_panel.offset_left = -280
	pause_panel.offset_right = 280
	pause_panel.offset_top = -85
	pause_panel.offset_bottom = 85
	_label("在树荫下歇一会儿", Vector2(34, 25), 29, Color("fff0cb"), pause_panel)
	_label("游戏已暂停。点击画面或按 Esc 继续。", Vector2(34, 88), 19, Color("c5ddd0"), pause_panel)
	pause_panel.visible = false


func _panel(at: Vector2, dimensions: Vector2, color: Color) -> Panel:
	var panel := Panel.new()
	panel.position = at
	panel.size = dimensions
	panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var style := StyleBoxFlat.new()
	style.bg_color = color
	style.corner_radius_top_left = 16
	style.corner_radius_top_right = 16
	style.corner_radius_bottom_left = 16
	style.corner_radius_bottom_right = 16
	style.border_color = Color(.85, .82, .62, .22)
	style.set_border_width_all(1)
	panel.add_theme_stylebox_override("panel", style)
	ui.add_child(panel)
	return panel


func _label(text: String, at: Vector2, font_size: int, color: Color, parent: Control = null) -> Label:
	var label := Label.new()
	label.text = text
	label.position = at
	label.add_theme_font_size_override("font_size", font_size)
	label.add_theme_color_override("font_color", color)
	label.add_theme_color_override("font_shadow_color", Color(0.04, .12, .12, .55))
	label.add_theme_constant_override("shadow_offset_y", 2)
	label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	(parent if parent != null else ui).add_child(label)
	return label


func _update_hud() -> void:
	echo_label.text = "%s回响    %d / 3" % [ECHO_OBJECTS.NAMES[selected_echo], echoes.size()] if knows_echo(selected_echo) else "未知回响"
	if sanctuary_computer != null and sanctuary_computer.active:
		prompt.text = "计算机正在接你上台"
		return
	if sanctuary_computer != null and sanctuary_computer.can_grab():
		prompt.text = "[ E ]  让计算机接你上台"
		return
	var source := _nearby_echo_source()
	if source != null:
		prompt.text = "[ E ]  学习%s回响" % ECHO_OBJECTS.NAMES[source.get_meta("echo_kind")]
	elif streamside != null and streamside.at_lookout(player.global_position):
		prompt.text = "[ E ]  在听风台看看风景"
	else:
		var npc: StaticBody3D = residents.nearest(player)
		prompt.text = "[ E ]  与%s交谈" % npc.get_meta("display_name") if npc != null else ""
	var garden_target: Dictionary = garden.target()
	if not garden_target.is_empty():
		prompt.text = garden_target.hint
	if not region_barriers.is_empty() and absf(player.position.x) > 9.5 and absf(player.position.z - 3) < 2:
		prompt.text = "[ E ]  重新加载邻近区域" if regions_error else "邻近区域正在加载…"
	if echo_active:
		prompt.text += ("\n" if not prompt.text.is_empty() else "") + "F 放置%s · C 切换 · Q 撤回 · 右键收起" % ECHO_OBJECTS.NAMES[selected_echo]
		if selected_echo == "plank":
			prompt.text += " · T 转向"


func _show_toast(text: String, seconds: float) -> void:
	if toast == null:
		return
	talking_to = null
	if dialogue_panel != null:
		dialogue_panel.visible = false
	toast.visible = true
	toast.text = text
	toast.modulate.a = 1
	toast_left = seconds


func _setup_audio() -> void:
	if DisplayServer.get_name() == "headless":
		return
	sound = AudioStreamPlayer.new()
	add_child(sound)
	if ResourceLoader.exists("res://assets/island_ambience.wav"):
		music = AudioStreamPlayer.new()
		music.stream = load("res://assets/island_ambience.wav")
		music.volume_db = -23
		add_child(music)
		music.finished.connect(music.play)
		music.play()


func _tone(frequency: float, seconds: float, volume: float) -> void:
	if sound == null:
		return
	var stream := AudioStreamWAV.new()
	stream.format = AudioStreamWAV.FORMAT_16_BITS
	stream.mix_rate = 22050
	var count := int(seconds * 22050)
	var data := PackedByteArray()
	data.resize(count * 2)
	for i in range(count):
		var t := float(i) / 22050
		var envelope := minf(t * 50, 1) * pow(1 - float(i) / count, 2)
		var value := int(sin(t * frequency * TAU) * envelope * volume * 32767)
		data.encode_s16(i * 2, value)
	stream.data = data
	sound.stream = stream
	sound.play()


func _capture_and_quit() -> void:
	await RenderingServer.frame_post_draw
	var folder := ProjectSettings.globalize_path("res://captures")
	DirAccess.make_dir_recursive_absolute(folder)
	var filename := "lumi-portrait.png" if "--portrait" in OS.get_cmdline_user_args() else "mosslight-island.png"
	var error := get_viewport().get_texture().get_image().save_png(folder.path_join(filename))
	print("MOSSLIGHT_CAPTURE: ", filename, " result=", error)
	get_tree().quit(error)
