extends SceneTree
## Walk across both bridge joins using real input and physics, then test the dunes.
var failures := 0
var game: Node3D

func _initialize() -> void:
	call_deferred("run")

func tick(count: int) -> void:
	for i in range(count):
		await physics_frame
		await process_frame

func check(condition: bool, label: String) -> void:
	if condition:
		print("PASS: ", label)
	else:
		push_error("FAIL: " + label)
		failures += 1

func run() -> void:
	game = load("res://scenes/island.tscn").instantiate()
	root.add_child(game)
	await tick(10)
	game.set_view_mode(game.ViewMode.FIRST_PERSON)
	game.camera_motion = false
	game.look_yaw = -PI / 2
	game.look_pitch = 0
	# The bridge center must be reachable directly, without detouring around trees.
	game.player.position = Vector3(10.5, .1, 3.0)
	game.player.velocity = Vector3.ZERO
	await tick(10)
	Input.action_press("walk_up")
	var lowest := 100.0
	for i in range(180):
		await tick(1)
		lowest = minf(lowest, game.player.position.y)
	Input.action_release("walk_up")
	await tick(10)
	check(game.player.position.x > 22 and lowest > -.15, "walk from meadow across both bridge joins without falling or invisible walls")
	check(game.player.is_on_floor() and game.in_desert, "arrive grounded in the desert")
	game.learned = true
	game.use_echo()
	await tick(2)
	check(game.player.position.x > 18.3 and game.placement_valid and game.place_echo(), "place an echo on desert terrain")
	game.set_view_mode(game.ViewMode.OVERVIEW)
	await tick(90)
	check(game.camera_focus.x > 29, "default overview follows the player to the desert")
	game.camera_zoom = 50
	game.camera.size = 50
	await tick(90)
	check(absf(game.camera_focus.x - 15) < .1, "wide overview centers both islands")
	game.set_view_mode(game.ViewMode.THIRD_PERSON)
	game.look_pitch = -.3
	game.look_yaw = PI / 2
	Input.action_press("walk_up")
	await tick(100)
	check(game.player.position.x > 14 and game.player.position.x < 18
		and game.camera.position.y > game.player.position.y + 1
		and not game.camera.is_position_behind(game.player.position + Vector3.UP),
		"third-person camera keeps the traveler visible during bridge crossing")
	await tick(80)
	Input.action_release("walk_up")
	await tick(10)
	check(game.player.position.x < 12 and game.player.position.x > 9 and game.player.is_on_floor(), "walk back across bridge to original island")
	check(game.learned and game.echoes.size() == 1, "crossing preserves learned ability and placed echo")
	game.set_view_mode(game.ViewMode.FIRST_PERSON)
	game.player.position = Vector3(15, .1, 3)
	game.player.velocity = Vector3.ZERO
	game.look_yaw = -PI / 2
	await tick(12)
	check(game.placement_valid and game.place_echo(), "bridge supports echo placement")
	game.player.position = Vector3(15, .1, 3)
	game.look_yaw = 0
	Input.action_press("walk_up")
	await tick(55)
	Input.action_release("walk_up")
	check(game.player.position.z > 1.7 and game.player.position.y > -.1, "bridge parapet prevents walking into the sea")
	game.player.position = Vector3(38, 4, 6.8)
	game.player.velocity = Vector3.ZERO
	await tick(65)
	check(game.player.is_on_floor() and game.player.position.y > .65, "dune collision matches the raised sand surface")
	game.look_yaw = PI / 2
	var dune_start: Vector3 = game.player.position
	Input.action_press("walk_up")
	await tick(55)
	Input.action_release("walk_up")
	await tick(15)
	check(game.player.position.x < dune_start.x - 2 and game.player.is_on_floor(), "walk down dune slopes without hovering or getting stuck")
	game.player.position = Vector3(40.8, .1, 0)
	game.player.velocity = Vector3.ZERO
	game.look_yaw = -PI / 2
	Input.action_press("walk_up")
	await tick(50)
	Input.action_release("walk_up")
	check(game.player.position.x < 42 and game.player.is_on_floor(), "desert outer coastline remains closed")
	# The new inn must be a walkable destination, not a solid architectural prop.
	game.player.position = Vector3(23.95, .12, -2)
	game.player.velocity = Vector3.ZERO
	game.look_yaw = 0
	await tick(12)
	Input.action_press("walk_up")
	await tick(62)
	Input.action_release("walk_up")
	await tick(8)
	check(game.player.position.z < -5.8 and game.player.is_on_floor(), "walk through the inn arch into the furnished courtyard")
	check(game.camera.position.y > 1 and game.camera.position.y < 2, "first-person eye stays below the inn roof")
	game.set_view_mode(game.ViewMode.THIRD_PERSON)
	game.look_yaw = PI
	await tick(10)
	Input.action_press("walk_up")
	await tick(60)
	Input.action_release("walk_up")
	await tick(8)
	check(game.player.position.z > -3 and game.player.is_on_floor(), "leave the inn through its arch in third person")
	game.set_view_mode(game.ViewMode.FIRST_PERSON)
	game.player.position = Vector3(15, .1, -3)
	game.player.velocity = Vector3.ZERO
	await tick(2)
	check(not game.placement_valid, "water between islands outside bridge rejects echo placement")
	game.player.position.y = -6
	await tick(3)
	check(game.player.position.distance_to(game.START) < .4, "fall recovery still returns to the original safe spawn")
	game.nature_motion = true
	var ambient_time: float = game.desert.time
	await tick(10)
	check(game.desert.time > ambient_time, "desert ambient water and pennants animate")
	game.nature_motion = false
	ambient_time = game.desert.time
	var ripple_scale: Vector3 = game.desert.ripples[1].scale
	var flag_rotation: Vector3 = game.desert.flags[0].rotation
	await tick(10)
	check(game.desert.time == ambient_time and game.desert.ripples[1].scale == ripple_scale
		and game.desert.flags[0].rotation == flag_rotation, "N and reduced motion freeze desert decorations")
	game.nature_motion = true
	game.set_game_paused(true)
	var wildlife_time: float = game.desert.wildlife.time
	var fox_pose: Transform3D = game.desert.wildlife.animals[0].node.transform
	await tick(10)
	check(game.desert.time == ambient_time, "pause freezes desert ambient clock")
	check(game.desert.wildlife.time == wildlife_time and game.desert.wildlife.animals[0].node.transform == fox_pose,
		"game pause freezes desert wildlife through the island update loop")
	print("MOSSLIGHT_DESERT_TESTS_COMPLETE failures=", failures)
	game.queue_free()
	await tick(2)
	quit(1 if failures else 0)
