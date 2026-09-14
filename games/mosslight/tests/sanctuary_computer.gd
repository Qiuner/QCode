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
	check(computer.status_label.text == "Q", "computer is named Q")
	check(computer.review_dialogue.portraits.size() == 2, "review dialogue loads both character illustrations")
	check(computer.review_dialogue.portraits.all(func(portrait: TextureRect): return portrait.texture != null), "review dialogue illustrations have textures")
	check(computer.review_dialogue.find_children("*", "SubViewportContainer", true, false).is_empty(), "review dialogue no longer renders 3D portraits")
	check(computer.review_dialogue.overlay.get_node("DialogueGradient") is TextureRect, "review dialogue blends into the world with a gradient")
	check(computer.review_dialogue.speaker.text == "Q" and computer.review_dialogue.role.text == "创作伙伴" and computer.review_dialogue.count.text == "1 / 1", "review dialogue metadata uses independent fields")
	check(computer.review_dialogue.portraits[1].position.y + computer.review_dialogue.portraits[1].size.y > computer.review_dialogue.words.position.y, "speaking portrait overlaps the subtitle region")
	var monitors: Array[Node] = computer.head_pivot.find_children("Monitor*", "MeshInstance3D", true, false)
	check(not monitors.is_empty() and computer.signal_pivot.get_parent() == computer.head_pivot, "monitor mesh and waveform share the head pivot")
	check(computer.housing.find_children("Monitor*", "MeshInstance3D", true, false).is_empty(), "all monitor meshes move with the head")
	computer.set_status("approval")
	check(computer.status_label.text.contains("等待确认"), "computer displays pending approval")
	computer.set_status("idle")
	check(computer.arms.size() == 2 and computer.arms[0].get_child_count() == 18, "Blender computer and both segmented tentacles load")
	var round_segments := true
	for arm: Node3D in computer.arms:
		for segment: Node3D in arm.get_children():
			round_segments = round_segments and is_equal_approx(segment.basis.x.length(), 1.0) and is_equal_approx(segment.basis.z.length(), 1.0)
	check(round_segments, "curved segments retain circular cross sections")
	check(not computer.grab(), "distant players are not grabbed")
	game._on_agent_isles_message([JSON.stringify({"source": "agent-isles-host", "version": 1, "type": "world:init", "payload": {"panelOpen": false, "sessionId": "", "residents": [{"id": "coder", "status": "working"}]}})])
	game._on_agent_isles_message([JSON.stringify({"source": "agent-isles-host", "version": 1, "type": "world:init", "payload": {"panelOpen": false, "sessionId": "", "residents": [{"id": "coder", "status": "completed"}]}})])
	game.player.position = Vector3(18, .05, 3)
	game.player.velocity = Vector3.ZERO
	await tick(310)
	check(computer.remote_active or computer.active, "completed work starts recall when no panel is opened")
	computer.remote_active = false
	computer.active = false
	computer.remote_transport = true
	computer.active = true
	computer.time = 2.0
	computer.look_left = 0
	game.player.position = Vector3(15, .05, -3.5)
	game.player.velocity = Vector3.ZERO
	await tick(2)
	check(not computer.active and game.player.position.distance_to(computer.LANDING) < .12, "blocked cross-region transport falls back to safe landing")
	check(not computer.review_dialogue.opened and computer.magic_time < computer.MAGIC_DURATION, "automatic completion recall performs magic after landing")
	await tick(540)
	check(computer.review_dialogue.opened, "automatic completion recall speaks after the magic act")
	var landed: Vector3 = game.player.position
	Input.action_press("walk_right")
	await tick(10)
	Input.action_release("walk_right")
	check(game.player.position.distance_to(landed) < .01, "review dialogue freezes player movement")
	computer.review_dialogue.words.visible_characters = 0
	computer.review_dialogue.advance()
	check(computer.review_dialogue.opened and computer.review_dialogue.words.visible_characters == computer.review_dialogue.words.text.length(), "first advance reveals the whole line")
	var escape := InputEventAction.new()
	escape.action = "close_game"
	escape.pressed = true
	computer.review_dialogue._input(escape)
	check(not computer.review_dialogue.opened and not game.game_paused, "Escape dismisses review without opening pause")
	computer.review_dialogue.open()
	computer.set_status("working")
	check(not computer.review_dialogue.opened, "new work dismisses stale review")
	computer.set_status("completed")
	computer.review_on_landing = true
	computer._finish_review_recall()
	await tick(540)
	computer.review_dialogue.advance()
	computer.review_dialogue.advance()
	check(not computer.review_dialogue.opened and not computer.review_on_landing, "confirm finishes the one-shot review handoff")
	game.player.position = Vector3(18, .05, 3)
	game.player.velocity = Vector3.ZERO
	await tick(3)
	check(computer.can_remote_grab(), "distant players can request remote recall")
	check(computer.remote_grab(), "remote recall starts from a distant location")
	var before_look: Vector3 = game.player.position
	await tick(8)
	check(absf(computer.head_pivot.rotation.y) > .1, "computer looks toward the player before reaching")
	check(computer.remote_time == 0 and game.player.position.distance_to(before_look) < .12, "look phase precedes reaching and transport")
	check(not computer.review_dialogue.opened, "manual recall clears review dialogue")
	await tick(360)
	check(not computer.remote_active and game.player.position.distance_to(computer.LANDING) < .12, "remote recall returns player to the computer")
	check(not computer.review_dialogue.opened, "manual recall does not announce task completion")
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
		await tick(85)
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
		check(computer.can_use(), "landing provides Q interaction")
		game._update_hud()
		check(game.prompt.text.contains("使用 Q"), "landing prompts Q instead of another grab")
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
	check(game.resident_dialogue.opened and game.resident_dialogue.speaker.text == "芽芽", "shared resident dialogue remains available outside the grab zone")
	check(game.residents.residents[0].get_meta("agent_isles_id") == "gardener", "gardener no longer owns the coder session")
	print("MOSSLIGHT_COMPUTER_TESTS_COMPLETE failures=", failures)
	game.queue_free()
	await tick(2)
	quit(1 if failures else 0)
