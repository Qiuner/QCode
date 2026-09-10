extends SceneTree
## Real travel, collision, landing and pause must drive presentation consistently.
var failures := 0
var game: Node3D

func _initialize() -> void:
	call_deferred("run")

func tick(count: int) -> void:
	for i in range(count):
		await physics_frame
		await process_frame

func check(condition: bool, label: String) -> void:
	print("PASS: " if condition else "FAIL: ", label)
	if not condition:
		failures += 1

func run() -> void:
	game = load("res://scenes/island.tscn").instantiate()
	root.add_child(game)
	await tick(20)
	game.set_view_mode(game.ViewMode.FIRST_PERSON)
	game.look_yaw = 0
	game.look_pitch = 0
	var feedback: Node3D = game.first_person_feedback
	check(feedback.visible and not game.hero.visible, "held lantern is exclusive to first person")
	var initial: Vector3 = game.player.position
	var lowest := 1.0
	var highest := -1.0
	Input.action_press("walk_up")
	for i in range(42):
		await tick(1)
		var offset: float = game.camera.position.y - game.player.position.y - 1.30
		lowest = minf(lowest, offset)
		highest = maxf(highest, offset)
	check(initial.distance_to(game.player.position) > 2 and feedback.steps_played >= 1, "real walking distance triggers footsteps")
	check(highest - lowest > .025 and maxf(absf(highest), absf(lowest)) < .03, "walking has subtle bounded vertical gait")
	Input.action_press("sprint")
	await tick(28)
	check(game.camera.fov > 72 and game.camera.fov <= 73.01, "real sprint smoothly widens field of view")
	Input.action_release("walk_up")
	Input.action_release("sprint")
	await tick(40)
	var steps: int = feedback.steps_played
	await tick(15)
	check(absf(feedback.eye_offset) < .001 and game.camera.fov < 70.1 and feedback.steps_played == steps, "idle settles camera and stops footsteps")
	# Pressing forward into a wall must not keep gait or sprint feedback running.
	var wall: StaticBody3D = game._add_solid(game.player.position + Vector3(0, 1, -.8), Vector3(3, 2, .3), "gait test wall")
	Input.action_press("walk_up")
	Input.action_press("sprint")
	await tick(45)
	steps = feedback.steps_played
	initial = game.player.position
	await tick(25)
	check(initial.distance_to(game.player.position) < .02 and feedback.steps_played == steps and absf(feedback.eye_offset) < .001 and game.camera.fov < 70.1, "blocked movement produces no walking or sprint illusion")
	Input.action_release("walk_up")
	Input.action_release("sprint")
	wall.queue_free()
	await tick(4)
	Input.action_press("jump")
	await tick(1)
	Input.action_release("jump")
	await tick(10)
	steps = feedback.steps_played
	await tick(10)
	check(not game.player.is_on_floor() and feedback.steps_played == steps, "airborne movement produces no footstep sounds")
	lowest = 0
	for i in range(40):
		await tick(1)
		lowest = minf(lowest, feedback.eye_offset)
	check(game.player.is_on_floor() and lowest < -.025 and lowest >= -.076 and feedback.steps_played == steps + 1, "landing gives one sound and a bounded settling dip")
	game.camera_motion = false
	Input.action_press("walk_up")
	Input.action_press("sprint")
	await tick(24)
	check(feedback.eye_offset == 0 and game.camera.fov == 70 and feedback.position == feedback.REST, "reduced motion removes camera and hand sway")
	check(feedback.steps_played > steps + 1, "reduced motion retains footstep feedback")
	game.camera_motion = true
	await tick(8)
	game.set_game_paused(true)
	var camera_position: Vector3 = game.camera.position
	var hand_position: Vector3 = feedback.position
	steps = feedback.steps_played
	await tick(15)
	check(game.camera.position == camera_position and feedback.position == hand_position and feedback.steps_played == steps, "pause freezes camera, hand gait and footsteps")
	game.set_game_paused(false)
	game.set_view_mode(game.ViewMode.THIRD_PERSON)
	await tick(2)
	check(not feedback.visible and game.camera.fov == 70 and feedback.eye_offset == 0, "leaving first person clears all presentation offsets")
	print("MOSSLIGHT_FEEL_TESTS_COMPLETE failures=", failures)
	game.queue_free()
	await tick(2)
	quit(1 if failures else 0)
