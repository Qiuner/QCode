extends SceneTree
## Deterministic integration checks against the real scene and 3D physics.
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
	await tick(12)
	check(game.player.is_on_floor(), "traveler settles on meadow collision")
	var start: Vector3 = game.player.position
	Input.action_press("walk_right")
	await tick(20)
	Input.action_release("walk_right")
	await tick(10)
	check(game.player.position.distance_to(start) > .6, "keyboard input moves the actual CharacterBody3D")
	Input.action_press("walk_right")
	game.set_game_paused(true)
	var paused_at: Vector3 = game.player.position
	await tick(10)
	check(game.player.position.is_equal_approx(paused_at), "pausing freezes character physics")
	check(not Input.is_action_pressed("walk_right"), "pausing releases held movement input")
	game.set_game_paused(false)
	await tick(6)
	check(game.player.position.distance_to(paused_at) < .01, "resume does not leave movement stuck")
	game._interact()
	check(not game.learned, "echo cannot be learned remotely")
	game.player.position = Vector3(-3.6, .03, 5.5)
	game.player.velocity = Vector3.ZERO
	await tick(5)
	game._interact()
	check(game.learned, "nearby original crate teaches echo")
	game.player.position = Vector3(0, .05, 2.0)
	game.player.velocity = Vector3.ZERO
	game.facing = Vector3(0, 0, -1)
	await tick(5)
	check(game.placement_valid, "empty meadow gives valid placement preview")
	check(game.place_echo(), "echo can be placed on real terrain")
	await tick(3)
	var crate: StaticBody3D = game.echoes[0]
	check(absf(crate.position.y - .462) < .08, "crate is placed on the raycast surface")
	# Jump onto the actual generated crate: this is the ledge puzzle's critical step.
	game.player.position = Vector3(crate.position.x, .02, crate.position.z + 1.1)
	game.player.velocity = Vector3.ZERO
	await tick(8)
	Input.action_press("jump")
	await tick(1)
	Input.action_release("jump")
	await tick(7)
	game.player.velocity.z = -2.5
	# Camera-relative held input points toward the crate in world space.
	var forward := Vector3(0, 0, -1)
	var right: Vector3 = game.camera.global_basis.x
	var back: Vector3 = game.camera.global_basis.z
	right.y = 0
	back.y = 0
	Input.action_press("walk_right", maxf(0, forward.dot(right.normalized())))
	Input.action_press("walk_left", maxf(0, -forward.dot(right.normalized())))
	Input.action_press("walk_down", maxf(0, forward.dot(back.normalized())))
	Input.action_press("walk_up", maxf(0, -forward.dot(back.normalized())))
	await tick(13)
	for action in ["walk_left", "walk_right", "walk_up", "walk_down"]:
		Input.action_release(action)
	await tick(30)
	check(game.player.is_on_floor() and game.player.position.y > .85, "jump lands on echo crate")
	# Fill the capacity through separate valid placements; verify FIFO replacement.
	for x in [3.0, 5.0, -2.0]:
		game.player.position = Vector3(x, .05, 6)
		game.player.velocity = Vector3.ZERO
		game.facing = Vector3(0, 0, -1)
		await tick(5)
		check(game.place_echo(), "separate open placement at x=" + str(x))
		await tick(3)
	check(game.echoes.size() == 3, "echo capacity stays at three")
	check(not is_instance_valid(crate), "fourth echo removes oldest collider and art")
	game.placement_valid = false
	check(not game.place_echo() and game.echoes.size() == 3, "invalid placement preserves existing echoes")
	# The second jump must clear the sanctuary lip, not merely reach a box.
	game.player.position = Vector3(1.0, .05, -2.0)
	game.player.velocity = Vector3.ZERO
	game.facing = Vector3(0, 0, -1)
	await tick(6)
	check(game.place_echo(), "a step fits at the sanctuary entrance")
	await tick(3)
	var step: StaticBody3D = game.echoes.back()
	game.player.position = step.position + Vector3(0, .47, 0)
	game.player.velocity = Vector3.ZERO
	await tick(8)
	Input.action_press("jump")
	await tick(1)
	Input.action_release("jump")
	await tick(7)
	Input.action_press("walk_left", -forward.dot(right.normalized()))
	Input.action_press("walk_up", -forward.dot(back.normalized()))
	await tick(15)
	Input.action_release("walk_left")
	Input.action_release("walk_up")
	await tick(30)
	check(game.player.is_on_floor() and game.player.position.y > 1.45, "jump from echo reaches sanctuary platform")
	# Visiting former pickup locations must not start or complete a quest.
	game.toast.text = ""
	var ambient_energy: float = game.shrine_light.light_energy
	for point in [Vector3(-7.3, .2, 3.4), Vector3(7.4, .2, 4.1), Vector3(1.2, 2.05, -6.8)]:
		game.player.position = point
		game.player.velocity = Vector3.ZERO
		await tick(4)
	check(game.toast.text.is_empty(), "exploration does not trigger collectible objectives")
	game.player.position = game.SHRINE
	game._interact()
	check(game.shrine_light.light_energy == ambient_energy, "shrine remains scenery after exploration and interaction")
	for label in game.ui.find_children("*", "Label", true, false):
		check(not label.text.contains("萤光") and not label.text.contains("月井手记"), "HUD has no light collection objective")
	game.player.position.y = -6
	await tick(3)
	check(game.player.position.distance_to(game.START) < .4, "fall recovery returns traveler safely")
	print("MOSSLIGHT_TESTS_COMPLETE failures=", failures)
	game.queue_free()
	await tick(2)
	game = null
	quit(1 if failures else 0)
