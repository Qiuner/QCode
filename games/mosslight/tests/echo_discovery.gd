extends SceneTree
## Learn, select and combine echoes using real terrain, player motion and collision.

var game: Node3D
var failures := 0


func _initialize() -> void:
	call_deferred("run")


func tick(count: int) -> void:
	for i in range(count):
		await physics_frame
		await process_frame


func check(ok: bool, label: String) -> void:
	print("PASS: " if ok else "FAIL: ", label)
	if not ok:
		failures += 1


func move_to(at: Vector3) -> void:
	game.player.position = at
	game.player.velocity = Vector3.ZERO
	await tick(5)


func clear_echoes() -> void:
	for echo: StaticBody3D in game.echoes:
		echo.queue_free()
	game.echoes.clear()
	await tick(2)


func action(name: String) -> void:
	var event := InputEventAction.new()
	event.action = name
	event.pressed = true
	game._unhandled_input(event)


func run() -> void:
	game = load("res://scenes/island.tscn").instantiate()
	root.add_child(game)
	await tick(10)
	game.select_echo("mushroom")
	check(not game.echo_active, "unlearned echoes cannot be equipped")
	await move_to(game.streamside.global_position + game.streamside.PLANK_SOURCE + Vector3(1.3, .1, 0))
	game._interact()
	check(game.knows_echo("plank") and not game.learned, "plank can be discovered before the original crate")
	check(game.selected_echo == "plank" and game.echo_active and game.preview.visible, "learning immediately selects and previews the new echo")
	check(game.garden.occupied_cells() == 0, "learned echoes do not occupy inventory cells")
	action("cycle_echo")
	check(game.selected_echo == "plank", "selection skips unknown echoes")
	await move_to(game.streamside.global_position + game.streamside.MUSHROOM_SOURCE + Vector3(0, .1, 1.2))
	game._interact()
	check(game.knows_echo("mushroom") and game.selected_echo == "mushroom", "mushroom is learned from its world source")
	await move_to(Vector3(-3.6, .03, 5.5))
	game._interact()
	check(game.learned and game.selected_echo == "crate", "crate remains learnable after other echoes")
	action("cycle_echo")
	check(game.selected_echo == "plank", "C cycles through learned echoes in a stable order")
	var before: float = game.echo_rotation
	action("rotate_echo")
	check(not is_equal_approx(before, game.echo_rotation), "T rotates the plank preview")
	action("rotate_echo")
	check(is_equal_approx(before, game.echo_rotation), "second rotation returns to the original plank axis")
	game.set_echo_active(false)
	action("photo")
	action("photo")
	check(not game.preview.visible, "stowed new echoes stay hidden after photo mode")
	game.use_echo()
	check(game.echo_active and game.echoes.is_empty(), "F restores selection without placing after stowing")
	# A plank spans the lookout gap with both ends supported, despite empty space below its center.
	game.facing = Vector3.FORWARD
	await move_to(Vector3(-39.5, 1.85, -2.2))
	game.select_echo("plank")
	await tick(2)
	check(game.placement_valid and game.preview_position.y > 1.7, "plank can bridge matching raised supports")
	check(game.place_echo(), "plank bridge is placed with a matching collision shape")
	game.set_echo_active(false)
	game.set_view_mode(game.ViewMode.FIRST_PERSON)
	game.look_yaw = 0
	game.camera_motion = false
	Input.action_press("walk_up")
	Input.action_press("jump")
	await tick(1)
	Input.action_release("jump")
	await tick(64)
	Input.action_release("walk_up")
	await tick(8)
	check(game.streamside.at_lookout(game.player.global_position), "player crosses plank to lookout using real movement")
	game._interact()
	check(game.toast.text.contains("听风台"), "lookout offers scenery feedback without a required quest")
	await clear_echoes()
	# A box provides the other climbing route to the same platform.
	await move_to(Vector3(-38.3, .08, -2.5))
	game.select_echo("crate")
	await tick(2)
	check(game.place_echo(), "crate can be used as a step beside the lookout")
	Input.action_press("walk_up")
	Input.action_press("jump")
	await tick(1)
	Input.action_release("jump")
	await tick(20)
	Input.action_release("walk_up")
	await tick(28)
	check(game.player.is_on_floor() and game.player.position.y > .8, "first jump lands on the crate step")
	Input.action_press("walk_up")
	Input.action_press("jump")
	await tick(1)
	Input.action_release("jump")
	await tick(29)
	Input.action_release("walk_up")
	await tick(25)
	check(game.streamside.at_lookout(game.player.global_position), "crate route reaches the same lookout")
	await clear_echoes()
	# The same launch point also works with a mushroom instead of a crate.
	await move_to(Vector3(-38.3, .08, -2.5))
	game.select_echo("mushroom")
	await tick(2)
	check(game.place_echo(), "mushroom can be placed beside the lookout")
	Input.action_press("walk_up")
	Input.action_press("jump")
	await tick(1)
	Input.action_release("jump")
	await tick(20)
	Input.action_release("walk_up")
	var launched := false
	for i in range(40):
		await tick(1)
		if game.player.velocity.y > 9:
			launched = true
			break
	check(launched, "landing on mushroom starts the alternate route")
	Input.action_press("walk_up")
	await tick(29)
	Input.action_release("walk_up")
	await tick(42)
	check(game.streamside.at_lookout(game.player.global_position), "mushroom route reaches the same lookout")
	await clear_echoes()
	# A mushroom bounces the player on landing; a stacked crate raises the takeoff point.
	await move_to(Vector3(3, .05, 4))
	game.select_echo("crate")
	await tick(2)
	check(game.place_echo(), "crate base for mushroom combination is placed")
	await tick(2)
	game.select_echo("mushroom")
	await tick(2)
	check(game.placement_valid and game.preview_position.y > .85 and game.place_echo(), "mushroom can be placed on a crate")
	var mushroom: StaticBody3D = game.echoes.back()
	check(mushroom.get_meta("echo_kind") == "mushroom", "mushroom keeps its bounce behavior when copied")
	game.set_echo_active(false)
	game.player.position = mushroom.position + Vector3(0, 1.4, 0)
	game.player.velocity = Vector3.ZERO
	var highest: float = game.player.position.y
	var bounced := false
	for i in range(95):
		await tick(1)
		highest = maxf(highest, game.player.position.y)
		bounced = bounced or game.player.velocity.y > 9
	check(bounced and highest > 4.1, "landing on a stacked mushroom launches above normal jump height")
	game.set_game_paused(true)
	var paused_at: Vector3 = game.player.position
	await tick(8)
	check(game.player.position == paused_at, "pause freezes mushroom flight")
	game.set_game_paused(false)
	# Undo and capacity apply across all echo types.
	await move_to(Vector3(0, .05, 4))
	game.select_echo("plank")
	game.echo_rotation = 0
	game._update_preview()
	check(game.place_echo(), "mixed echo types share the placement limit")
	var oldest: StaticBody3D = game.echoes.front()
	await move_to(Vector3(8, .05, 4))
	game.select_echo("crate")
	game._update_preview()
	check(game.place_echo() and game.echoes.size() == 3, "fourth mixed echo replaces the oldest")
	await tick(2)
	check(not is_instance_valid(oldest), "mixed capacity replacement removes the oldest collider")
	Input.action_press("undo_echo")
	await tick(1)
	Input.action_release("undo_echo")
	check(game.echoes.size() == 2, "Q removes the latest echo regardless of type")
	await clear_echoes()
	await move_to(Vector3(0, .05, 4))
	var obstacle: StaticBody3D = game._add_solid(Vector3(1.4, .45, 1.5), Vector3(.3, .9, .3), "PlankObstacle")
	await tick(2)
	game.select_echo("plank")
	game.echo_rotation = 0
	game._update_preview()
	check(not game.placement_valid and not game.place_echo(), "plank rejects obstacles away from its center")
	action("rotate_echo")
	check(game.placement_valid, "rotating plank updates its entire collision footprint")
	obstacle.queue_free()
	game.set_echo_active(false)
	# A side contact with a mushroom must not throw a walking player upward.
	await move_to(Vector3(3, .05, 4))
	game.select_echo("mushroom")
	await tick(2)
	check(game.place_echo(), "ground mushroom is available for side-contact check")
	game.set_echo_active(false)
	Input.action_press("walk_up")
	var side_bounce := false
	for i in range(30):
		await tick(1)
		side_bounce = side_bounce or game.player.velocity.y > 9
	Input.action_release("walk_up")
	check(not side_bounce, "walking into mushroom side does not trigger a bounce")
	print("MOSSLIGHT_ECHO_DISCOVERY_TESTS_COMPLETE failures=", failures)
	quit(1 if failures else 0)
