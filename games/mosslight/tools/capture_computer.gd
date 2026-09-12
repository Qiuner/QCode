extends SceneTree
## Capture the authored asset and actual transport with the production renderer.

func _initialize() -> void:
	call_deferred("run")

func capture(name: String) -> void:
	for i in range(8):
		await process_frame
	await RenderingServer.frame_post_draw
	var folder := ProjectSettings.globalize_path("res://captures")
	DirAccess.make_dir_recursive_absolute(folder)
	var result := root.get_texture().get_image().save_png(folder.path_join(name + ".png"))
	assert(result == OK)

func run() -> void:
	var game = load("res://scenes/island.tscn").instantiate()
	root.add_child(game)
	game.embedded_mode = true
	game.set_game_paused(false)
	game.set_process(false)
	game.set_physics_process(false)
	game.ui.visible = false
	game.distance_haze.set_shader_parameter("focus_position", Vector3(1.2, 0, -5.5))
	game.player.position = Vector3(1.2, .05, -2.2)
	game.camera.size = 11
	game.camera.position = Vector3(9, 11, 10)
	game.camera.look_at(Vector3(1.2, 2.5, -5.5))
	await capture("sanctuary-computer-close")
	game.camera.size = 27
	game.camera.position = game.default_camera_position
	game.camera.look_at(game.camera_target)
	await capture("sanctuary-computer-island")
	game.sanctuary_computer.grab()
	for i in range(75):
		game.sanctuary_computer.advance(1.0 / 60)
		await physics_frame
	game.camera.size = 10
	game.camera.position = Vector3(8, 8, 9)
	game.camera.look_at(Vector3(1.2, 2.8, -4.5))
	await capture("sanctuary-computer-grab")
	print("MOSSLIGHT_COMPUTER_CAPTURE_COMPLETE")
	quit()
