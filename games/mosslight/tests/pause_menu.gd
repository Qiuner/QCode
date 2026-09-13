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
	game._on_agent_isles_message([JSON.stringify({"source": "agent-isles-host", "version": 1, "type": "world:pause-action", "payload": {"action": "developer"}})])
	assert(game.game_paused, "developer panel pauses the world")
	var previous_status: String = game.sanctuary_computer.task_status
	game._on_agent_isles_message([JSON.stringify({"source": "agent-isles-host", "version": 1, "type": "world:pause-action", "payload": {"action": "preview-review"}})])
	assert(not game.game_paused and game.sanctuary_computer.review_dialogue.opened, "preview replaces pause with the real dialogue")
	assert(game.sanctuary_computer.task_status == previous_status, "preview does not fake task completion")
	game.sanctuary_computer.review_dialogue.close()
	game.sanctuary_computer.active = true
	game._on_agent_isles_message([JSON.stringify({"source": "agent-isles-host", "version": 1, "type": "world:pause-action", "payload": {"action": "preview-review"}})])
	assert(not game.sanctuary_computer.review_dialogue.opened, "preview cannot interrupt transport")
	print("PAUSE_MENU_TESTS_PASSED")
	quit()
