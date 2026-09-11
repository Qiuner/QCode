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

func run() -> void:
	game = load("res://scenes/island.tscn").instantiate()
	root.add_child(game)
	await tick(12)
	check(game.residents.residents.size() == 4, "four residents including project guide load")
	check(game.residents.nearest(game.player) == null, "distant residents cannot be targeted")
	var onboarding: Dictionary = game.residents.agentville_talk(game.residents.residents[0], false)
	check(onboarding.text.contains("项目文件夹") and onboarding.text.contains("工作区"), "Agentville resident explains workspace binding")
	var ready_dialogue: Dictionary = game.residents.agentville_talk(game.residents.residents[0], true)
	check(ready_dialogue.text.contains("居民面板"), "Agentville resident hands off to functional panel")
	var all_clear := true
	for npc: StaticBody3D in game.residents.residents:
		var query := PhysicsShapeQueryParameters3D.new()
		query.shape = npc.get_child(0).shape
		query.transform = npc.get_child(0).global_transform
		query.collision_mask = 1
		query.exclude = [npc.get_rid()]
		all_clear = all_clear and game.get_world_3d().direct_space_state.intersect_shape(query).is_empty()
	check(all_clear, "resident homes do not overlap terrain props or each other")
	for npc: StaticBody3D in game.residents.residents:
		game.player.position = npc.position + Vector3(0, 0, 1.15)
		game.player.velocity = Vector3.ZERO
		await tick(4)
		game._interact()
		check(game.dialogue_panel.visible and game.talking_to == npc and game.dialogue_name.text == npc.get_meta("display_name"), "nearby interaction opens " + npc.name + " dialogue")
		var previous: String = game.dialogue_text.text
		game._interact()
		check(game.dialogue_text.text != previous, "repeated interaction advances " + npc.name + " dialogue")
	var gardener: StaticBody3D = game.residents.residents[0]
	game.player.position = gardener.position + Vector3(0, 0, 1.2)
	await tick(4)
	var wall: StaticBody3D = game._add_solid(gardener.position + Vector3(0, 1.0, .6), Vector3(1.4, 2, .15), "dialogue test wall")
	await tick(4)
	check(game.residents.nearest(game.player) == null, "walls block conversation targeting")
	wall.queue_free()
	await tick(4)
	game.set_view_mode(game.ViewMode.FIRST_PERSON)
	game.look_yaw = 0
	Input.action_press("walk_up")
	await tick(30)
	Input.action_release("walk_up")
	check(game.player.position.z > gardener.position.z + .57, "resident body stops player walking through it")
	game._interact()
	game.nature_motion = false
	var visual: Node3D = gardener.get_meta("visual")
	var still: Transform3D = visual.transform
	await tick(6)
	check(visual.transform == still, "reduced nature motion freezes resident animation")
	game.nature_motion = true
	game.set_game_paused(true)
	var remaining: float = game.dialogue_left
	still = visual.transform
	await tick(6)
	check(visual.transform == still and game.dialogue_left == remaining, "pause freezes residents and dialogue timeout")
	game.set_game_paused(false)
	game.player.position = game.START
	await tick(4)
	check(not game.dialogue_panel.visible and game.talking_to == null, "walking away closes conversation")
	for npc in game.residents.residents:
		for learned in [false, true]:
			var first: String = game.residents.talk(npc, learned)
			var second: String = game.residents.talk(npc, learned)
			var third: String = game.residents.talk(npc, learned)
			check(not first.is_empty() and first != second and second != third, "resident has varied exploration dialogue")
			check(game.residents.talk(npc, learned) == first, "resident dialogue cycles")
			check(not (first + second + third).contains("萤光"), "resident dialogue has no light collection quest")
	game.player.position = Vector3(-3.6, .03, 5.5)
	await tick(4)
	game._interact()
	check(game.learned, "resident interaction preserves crate learning")
	print("MOSSLIGHT_RESIDENT_TESTS_COMPLETE failures=", failures)
	game.queue_free()
	await tick(2)
	quit(1 if failures else 0)
