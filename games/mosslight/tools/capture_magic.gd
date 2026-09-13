extends SceneTree
## Actual renderer; optional --write-movie records the full authored timeline.

func _initialize() -> void:
	call_deferred("run")

func run() -> void:
	var game = load("res://scenes/island.tscn").instantiate()
	root.add_child(game)
	await process_frame
	game.embedded_mode = true
	game.set_game_paused(false)
	game.set_process(false)
	game.set_physics_process(false)
	game.ui.visible = false
	game.player.position = Vector3(1.2, .05, -2.2)
	game.distance_haze.set_shader_parameter("focus_position", Vector3(1.2, 0, -5.5))
	game.camera.size = 8.0
	game.camera.position = Vector3(5.7, 7.3, 7.0)
	game.camera.look_at(Vector3(1.2, 3.7, -5.4))
	var folder := ProjectSettings.globalize_path("res://captures")
	DirAccess.make_dir_recursive_absolute(folder)
	for frame in 12:
		await process_frame
	game.sanctuary_computer.preview_magic()
	for frame in 282:
		game.sanctuary_computer.advance(1.0 / 30)
		await process_frame
		if frame in [20, 53, 80, 113, 146, 173, 205, 243, 281]:
			await RenderingServer.frame_post_draw
			root.get_texture().get_image().save_png(folder.path_join("q-magic-%03d.png" % frame))
	print("MOSSLIGHT_MAGIC_CAPTURE_COMPLETE")
	game.queue_free()
	await process_frame
	quit()
