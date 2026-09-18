extends SceneTree

var failures := 0


func _initialize() -> void:
	call_deferred("run")


func run() -> void:
	TranslationServer.set_locale("zh")
	var game = load("res://scenes/island.tscn").instantiate()
	root.add_child(game)
	await process_frame
	game.embedded_mode = true
	game._apply_embedded_hud()
	check(game.overview_labels.all(func(label: Label): return not label.visible), "embedded world hides location heading")
	check(not game.view_hint.visible, "embedded world hides persistent camera help")
	check(not game.game_hud.visible, "embedded world hides echo and keyboard HUD")
	check(not game.garden.bag_hint.visible, "embedded world hides persistent inventory hint")
	check(game.prompt.visible and game.toast.visible, "embedded world keeps contextual feedback")
	var npc: StaticBody3D = game.residents.residents[2]
	game.player.position = npc.position + Vector3(0, 0, 1.15)
	game.player.velocity = Vector3.ZERO
	await physics_frame
	game._interact()
	check(game.resident_dialogue.opened and game.resident_dialogue.speaker.text == "苔伯", "embedded resident opens shared dialogue before Host handoff")
	game._on_qcode_message([JSON.stringify({"source": "agent-isles-host", "version": 1, "type": "world:init", "payload": {"panelOpen": false, "residents": [], "workspace": null}})])
	check(game.qcode_connected, "legacy host source remains compatible")
	var message := {"source": "qcode-host", "version": 1, "type": "world:init", "payload": {"panelOpen": true, "residents": [], "workspace": null}}
	game.mouse_was_captured = true
	Input.action_press("walk_up")
	game._on_qcode_message([JSON.stringify(message)])
	check(game.qcode_panel_open and not game.resident_dialogue.opened and not Input.is_action_pressed("walk_up"), "host panel replaces shared dialogue and releases held movement")
	check(not game.mouse_was_captured and not game.prompt.visible, "host panel hides E prompt without triggering pause")
	game._notification(Node.NOTIFICATION_APPLICATION_FOCUS_OUT)
	check(not game.game_paused and not game.pause_panel.visible, "focusing host conversation does not open game pause menu")
	var position: Vector3 = game.player.position
	Input.action_press("walk_up")
	game._physics_process(.1)
	game._interact()
	check(game.player.position == position and not game.resident_dialogue.opened, "host panel blocks movement and duplicate interaction")
	message.payload.panelOpen = false
	game._on_qcode_message([JSON.stringify(message)])
	check(not game.qcode_panel_open and game.prompt.visible and not Input.is_action_pressed("walk_up"), "closing panel restores world controls without held keys")
	game._interact()
	check(game.resident_dialogue.opened and game.resident_dialogue.next_resident_id == "teacher", "functional resident dialogue keeps its Host handoff")
	game.resident_dialogue.close()
	game.player.position = game.residents.residents[0].position + Vector3(0, 0, 1.15)
	await physics_frame
	game._interact()
	check(game.resident_dialogue.opened and game.resident_dialogue.next_resident_id.is_empty(), "gardener uses shared local dialogue in embedded world")
	game._on_qcode_message([JSON.stringify(message)])
	check(game.resident_dialogue.opened, "background host updates preserve gardener dialogue")
	game.player.position = game.sanctuary_computer.LANDING
	await physics_frame
	game._interact()
	message.payload.panelOpen = true
	message.payload.residents = [{"id": "coder", "status": "working"}]
	game._on_qcode_message([JSON.stringify(message)])
	check(game.sanctuary_computer.status_label.text.contains("执行中"), "coder status is shown on Q")
	check(not game.resident_dialogue.opened, "Q host panel clears shared dialogue")
	print("MOSSLIGHT_EMBEDDED_HUD_TESTS_COMPLETE failures=%d" % failures)
	quit(1 if failures else 0)


func check(ok: bool, label: String) -> void:
	if ok:
		print("PASS: " + label)
	else:
		failures += 1
		push_error("FAIL: " + label)
