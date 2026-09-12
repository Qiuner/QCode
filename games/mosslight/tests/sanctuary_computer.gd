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
	print("PASS: " if condition else "FAIL: ", label)
	if not condition:
		failures += 1

func approach() -> void:
	game.player.position = Vector3(1.2, .05, -2.2)
	game.player.velocity = Vector3.ZERO
	await tick(5)

func run() -> void:
	game = load("res://scenes/island.tscn").instantiate()
	root.add_child(game)
	await tick(12)
	var computer: Node3D = game.sanctuary_computer
	check(computer.arms.size() == 2 and computer.arms[0].get_child_count() == 18, "Blender computer and both segmented tentacles load")
	var round_segments := true
	for arm: Node3D in computer.arms:
		for segment: Node3D in arm.get_children():
			round_segments = round_segments and is_equal_approx(segment.basis.x.length(), 1.0) and is_equal_approx(segment.basis.z.length(), 1.0)
	check(round_segments, "curved segments retain circular cross sections")
	check(not computer.grab(), "distant players are not grabbed")
	for mode in [game.ViewMode.OVERVIEW, game.ViewMode.THIRD_PERSON, game.ViewMode.FIRST_PERSON]:
		game.set_view_mode(mode)
		await approach()
		check(computer.can_grab(), "front approach is reachable in view " + str(mode))
		Input.action_press("interact")
		await tick(1)
		Input.action_release("interact")
		check(computer.active, "real E input starts grabbing")
		check(not computer.grab(), "repeat grab is ignored while carrying")
		Input.action_press("walk_down")
		Input.action_press("jump")
		await tick(50)
		Input.action_release("walk_down")
		Input.action_release("jump")
		check(game.player.position.y > .5, "tentacles lift the player despite movement input")
		game.set_game_paused(true)
		var frozen: Vector3 = game.player.position
		var frozen_time: float = computer.time
		await tick(8)
		check(game.player.position == frozen and computer.time == frozen_time, "pause freezes player and tentacles together")
		game.set_game_paused(false)
		game.agent_isles_panel_open = true
		await tick(8)
		check(game.player.position == frozen and computer.time == frozen_time, "web panel suspends transport")
		game.agent_isles_panel_open = false
		await tick(240)
		check(not computer.active and game.player.position.distance_to(computer.LANDING) < .12, "player is released on the sanctuary landing")
		check(game.player.is_on_floor(), "landing has real floor support")
		var before: Vector3 = game.player.position
		Input.action_press("walk_down")
		await tick(8)
		Input.action_release("walk_down")
		check(game.player.position.distance_to(before) > .10, "movement is restored after release")
	await approach()
	var blockage: StaticBody3D = game._add_solid(computer.LANDING + Vector3(0, .45, 0), Vector3(.9, .9, .9), "occupied landing")
	await tick(3)
	check(not computer.grab(), "occupied landing rejects transport")
	blockage.queue_free()
	await tick(3)
	var wall: StaticBody3D = game._add_solid(Vector3(1.2, 2.2, -3.7), Vector3(3.5, 4.4, .3), "transport obstruction")
	await tick(3)
	check(computer.grab(), "clear landing allows initial reach")
	await tick(300)
	check(not computer.active and game.player.position.z > -3.5, "capsule sweep stops at an obstacle and releases control")
	wall.queue_free()
	await approach()
	game.nature_motion = false
	var idle_pose: Transform3D = computer.hands[0].transform
	await tick(8)
	check(computer.hands[0].transform == idle_pose, "reduced nature motion stops decorative arm sway")
	check(computer.grab(), "essential grab interaction still works with decorative motion disabled")
	await tick(300)
	check(game.player.position.distance_to(computer.LANDING) < .12, "reduced motion transport reaches the same landing")
	game.player.position = Vector3(-7.2, .05, 2.45)
	await tick(5)
	game._interact()
	check(game.dialogue_panel.visible, "resident dialogue remains available outside the grab zone")
	print("MOSSLIGHT_COMPUTER_TESTS_COMPLETE failures=", failures)
	game.queue_free()
	await tick(2)
	quit(1 if failures else 0)
