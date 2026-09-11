extends SceneTree
## Exercise camera-relative input, placement, obstacle sweeps and mode lifecycle.
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
	game.player.position = Vector3(0, .05, 2)
	await tick(8)
	check(game.camera.projection == Camera3D.PROJECTION_ORTHOGONAL, "starts in overview")
	game.learned = true
	game.use_echo()
	var start: Vector3 = game.player.position
	game.set_view_mode(game.ViewMode.THIRD_PERSON)
	await tick(2)
	check(game.hero.visible and game.camera.projection == Camera3D.PROJECTION_PERSPECTIVE, "third person shows traveler with perspective")
	check(game.player.position.distance_to(start) < .02 and game.learned, "switch preserves player position and learned echo")
	# A real collider behind the traveler must retract the swept camera sphere.
	game.look_yaw = 0
	game.look_pitch = 0
	var obstacle: StaticBody3D = game._add_solid(start + Vector3(0, 1.1, 2), Vector3(3, 3, .3), "camera test wall")
	obstacle.collision_layer = 2
	await tick(4)
	check(game.camera.position.z < obstacle.position.z - .25, "third-person camera stops at camera-only geometry")
	obstacle.queue_free()
	await tick(50)
	check(game.camera_arm_length > 4.5, "camera extends after obstacle is removed")
	game.set_view_mode(game.ViewMode.FIRST_PERSON)
	await tick(2)
	check(not game.hero.visible and game.crosshair.visible, "first person hides head and shows reticle")
	check(game.camera.position.distance_to(game.player.position + Vector3(0, 1.30, 0)) < .01, "first-person camera stays at eye height")
	game.look_yaw = PI / 2
	game.look_pitch = -.8
	await tick(2)
	start = game.player.position
	Input.action_press("walk_up")
	await tick(18)
	Input.action_release("walk_up")
	await tick(5)
	check(game.player.position.x < start.x - .8 and absf(game.player.position.z - start.z) < .05, "W follows yaw without flying when looking down")
	Input.action_press("walk_right")
	await tick(10)
	Input.action_release("walk_right")
	await tick(4)
	check(game.facing.dot(Vector3.LEFT) > .99, "strafing keeps echo placement facing the camera")
	check(game.preview_position.x < game.player.position.x - 1, "first-person echo preview is ahead of the view")
	check(game.place_echo(), "first-person echo can be placed despite camera-only colliders")
	Input.action_press("walk_down")
	Input.action_press("sprint")
	await tick(18)
	check(Vector2(game.player.velocity.x, game.player.velocity.z).length() > 6, "Shift increases actual movement speed")
	Input.action_release("walk_down")
	Input.action_release("sprint")
	await tick(15)
	Input.action_press("jump")
	await tick(1)
	Input.action_release("jump")
	await tick(7)
	check(game.player.position.y > .4 and absf(game.camera.position.y - game.player.position.y - 1.30) < .01, "first-person view follows a real jump")
	var motion := InputEventMouseMotion.new()
	motion.button_mask = MOUSE_BUTTON_MASK_RIGHT
	motion.screen_relative = Vector2(100, 10000)
	var yaw: float = game.look_yaw
	game._unhandled_input(motion)
	check(game.look_yaw < yaw and game.look_pitch >= -1.21, "right drag rotates and clamps vertical look")
	motion.button_mask = MOUSE_BUTTON_MASK_LEFT
	motion.screen_relative = Vector2(-30, 0)
	yaw = game.look_yaw
	game._unhandled_input(motion)
	check(game.look_yaw > yaw, "left drag remains usable when pointer lock is unavailable")
	Input.action_press("walk_up")
	Input.action_press("sprint")
	game.set_game_paused(true)
	start = game.player.position
	yaw = game.look_yaw
	game._unhandled_input(motion)
	await tick(4)
	check(game.player.position == start and game.look_yaw == yaw, "pause freezes movement and mouse look")
	check(not Input.is_action_pressed("sprint") and not Input.is_action_pressed("walk_up"), "pause releases held controls")
	game.set_game_paused(false)
	game.mouse_was_captured = true
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	await tick(2)
	check(game.game_paused, "losing pointer lock pauses safely")
	game.set_game_paused(false)
	game.set_view_mode(game.ViewMode.OVERVIEW)
	await tick(2)
	check(game.hero.visible and not game.crosshair.visible and Input.mouse_mode == Input.MOUSE_MODE_VISIBLE, "overview restores hero and releases cursor")
	check(game.echoes.size() == 1 and game.learned, "switching back preserves placed echo and progress")
	print("MOSSLIGHT_CAMERA_TESTS_COMPLETE failures=", failures)
	game.queue_free()
	await tick(2)
	quit(1 if failures else 0)
