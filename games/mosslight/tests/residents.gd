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
	check(game.residents.residents.size() == 3, "three distinct residents load without a duplicate project guide")
	var gardener_portrait: Texture2D = game.residents.dialogue_portrait(game.residents.residents[0])
	check(gardener_portrait.get_width() >= 1000 and gardener_portrait.get_height() >= 1400, "gardener uses the authored high-resolution dialogue portrait")
	game._on_agent_isles_message([JSON.stringify({"source": "agent-isles-host", "version": 1, "type": "world:locale", "payload": {"locale": "en"}})])
	check(TranslationServer.get_locale() == "en" and str(game.residents.residents[0].get_meta("display_name")).begins_with("Sprout"), "English locale refreshes resident labels")
	check(game.residents.dialogue_lines(game.residents.residents[2], true)[0].begins_with("I'm Uncle Moss"), "English locale translates resident dialogue")
	game._on_agent_isles_message([JSON.stringify({"source": "agent-isles-host", "version": 1, "type": "world:locale", "payload": {"locale": "invalid"}})])
	check(TranslationServer.get_locale() == "en", "unknown bridge locale is ignored")
	game._on_agent_isles_message([JSON.stringify({"source": "agent-isles-host", "version": 1, "type": "world:locale", "payload": {"locale": "zh"}})])
	check(str(game.residents.residents[0].get_meta("display_name")).begins_with("芽芽"), "Chinese locale restores resident labels")
	check(game.residents.nearest(game.player) == null, "distant residents cannot be targeted")
	var onboarding: Dictionary = game.residents.agent_isles_talk(game.residents.residents[0], false)
	check(onboarding.text.contains("项目文件夹") and onboarding.text.contains("工作区"), "agent-isles resident explains workspace binding")
	var ready_dialogue: Dictionary = game.residents.agent_isles_talk(game.residents.residents[0], true)
	check(ready_dialogue.text.contains("居民面板"), "agent-isles resident hands off to functional panel")
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
		check(game.resident_dialogue.opened and game.resident_dialogue.speaker.text == game.residents.dialogue_name(npc), "nearby interaction opens shared " + npc.name + " dialogue")
		check(game.resident_dialogue.role.text == game.residents.dialogue_role(npc) and game.resident_dialogue.portraits[1].texture == game.residents.dialogue_portrait(npc), "shared dialogue uses " + npc.name + " identity and portrait")
		var previous: String = game.resident_dialogue.words.text
		game.resident_dialogue.advance()
		game.resident_dialogue.advance()
		check(game.resident_dialogue.words.text != previous, "shared dialogue advances " + npc.name + " pages")
		game.resident_dialogue.close()
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
	game.nature_motion = false
	var visual: Node3D = gardener.get_meta("visual")
	var still: Transform3D = visual.transform
	await tick(6)
	check(visual.transform == still, "reduced nature motion freezes resident animation")
	game.nature_motion = true
	game.set_game_paused(true)
	still = visual.transform
	await tick(6)
	check(visual.transform == still, "pause freezes resident animation")
	game.set_game_paused(false)
	game.player.position = game.START
	await tick(4)
	check(not game.resident_dialogue.opened, "closed shared dialogue returns to exploration")
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
