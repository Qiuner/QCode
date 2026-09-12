extends SceneTree

func _initialize() -> void:
	call_deferred("run")

func run() -> void:
	var game = load("res://scenes/island.tscn").instantiate()
	root.add_child(game)
	await process_frame
	game.set_game_paused(true)
	assert(game.game_paused and game.pause_panel.visible)
	var click := InputEventMouseButton.new()
	click.button_index = MOUSE_BUTTON_LEFT
	click.pressed = true
	game._unhandled_input(click)
	assert(game.game_paused, "background click must not resume")
	game._on_agent_isles_message([JSON.stringify({"source": "agent-isles-host", "version": 1, "type": "world:pause-action", "payload": {"action": "nature"}})])
	assert(not game.nature_motion)
	game._on_agent_isles_message([JSON.stringify({"source": "agent-isles-host", "version": 1, "type": "world:pause-action", "payload": {"action": "resume"}})])
	assert(not game.game_paused and not game.pause_panel.visible)
	print("PAUSE_MENU_TESTS_PASSED")
	quit()
