extends SceneTree
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
		push_error("FAIL: " + label + " player=" + str(game.player.position))
		failures += 1

func walk(at: Vector3, yaw: float, count: int) -> void:
	game.player.position = at
	game.player.velocity = Vector3.ZERO
	game.look_yaw = yaw
	await tick(12)
	Input.action_press("walk_up")
	await tick(count)
	Input.action_release("walk_up")
	await tick(8)

func run() -> void:
	game = load("res://scenes/island.tscn").instantiate()
	root.add_child(game)
	await tick(10)
	game.set_view_mode(game.ViewMode.FIRST_PERSON)
	game.camera_motion = false
	game.look_pitch = 0
	await walk(Vector3(-10.5, .1, 3), PI / 2, 170)
	check(game.player.position.x < -22 and game.player.is_on_floor(), "west bridge reaches courtyard across both joins")
	check(game.in_streamside and not game.in_desert and game.overview_labels[1].text == "STREAMSIDE", "courtyard title activates")
	game.learned = true
	game.use_echo()
	await tick(2)
	check(game.placement_valid and game.place_echo(), "echo placement on courtyard land")
	game.set_view_mode(game.ViewMode.OVERVIEW)
	await tick(90)
	check(game.camera_focus.x < -29, "overview follows courtyard")
	game.camera_zoom = 80
	game.camera.size = 80
	await tick(90)
	check(absf(game.camera_focus.x) < .1, "maximum overview centers three tiles")
	game.set_view_mode(game.ViewMode.THIRD_PERSON)
	await walk(Vector3(-22, .1, 3), -PI / 2, 170)
	check(game.player.position.x > -11 and game.player.is_on_floor() and not game.in_streamside, "return west bridge in third person")
	check(game.learned and game.echoes.size() == 1, "travel preserves ability and echo")
	game.set_view_mode(game.ViewMode.FIRST_PERSON)
	await walk(Vector3(-15, .1, 3), 0, 50)
	check(game.player.position.z > 1.6 and game.player.position.y > -.1, "connector rail prevents falling")
	await walk(Vector3(-24.6, .1, 5.796), PI / 2, 115)
	check(game.player.position.x < -32.2 and game.player.is_on_floor(), "creek bridge westward without jumping")
	await walk(Vector3(-33.5, .1, 5.796), -PI / 2, 135)
	check(game.player.position.x > -24.8 and game.player.is_on_floor(), "creek bridge eastward")
	await walk(Vector3(-33.85, .1, 2.9), 0, 80)
	check(game.player.position.z < -1.3 and game.player.position.y > 1.1 and game.player.is_on_floor(), "wooden stairs reach raised veranda without jumping")
	await walk(Vector3(-33.85, 1.2, -.6), PI, 85)
	check(game.player.position.z > 2.8 and game.player.position.y < .15 and game.player.is_on_floor(), "wooden stairs descend to garden without catching an edge")
	await walk(Vector3(-20.5, .1, 0), PI / 2, 80)
	check(game.player.position.x > -26 and game.player.is_on_floor(), "creek bank keeps traveler out of water")
	check(not game.streamside.allows_echo(Vector3(-28.65, -.44, 0)), "creek rejects echo")
	await walk(Vector3(-40.8, .1, 8), PI / 2, 50)
	check(game.player.position.x > -42 and game.player.is_on_floor(), "west coastline closed")
	await walk(Vector3(-37.2, .12, 8), 0, 40)
	check(game.player.position.z < 5.5 and game.player.is_on_floor(), "former pavilion table area is walkable without invisible obstacles")
	await walk(Vector3(-18.1, .12, 5.1), PI / 2, 45)
	check(game.player.position.x > -19.3 and game.player.is_on_floor(), "moon gate side wall blocks walking through masonry")
	await walk(Vector3(-28.8, .55, 5.796), 0, 28)
	check(game.player.position.z > 5.2 and game.player.position.y > .2, "stone bridge railing keeps traveler above creek")
	game.nature_motion = true
	var ambient_time: float = game.streamside.time
	var fish_position: Vector3 = game.streamside.fish[0].position
	await tick(10)
	check(game.streamside.time > ambient_time and game.streamside.fish[0].position != fish_position, "koi and currents animate")
	game.nature_motion = false
	ambient_time = game.streamside.time
	fish_position = game.streamside.fish[0].position
	await tick(10)
	check(game.streamside.time == ambient_time and game.streamside.fish[0].position == fish_position, "reduced motion freezes decorations")
	game.nature_motion = true
	game.set_game_paused(true)
	await tick(10)
	check(game.streamside.time == ambient_time, "pause freezes courtyard")
	print("MOSSLIGHT_STREAMSIDE_TESTS_COMPLETE failures=", failures)
	game.queue_free()
	await tick(2)
	quit(1 if failures else 0)
