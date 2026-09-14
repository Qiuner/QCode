extends SceneTree
## Production lighting, close-ups and optional fox sequence for visual review.

func _initialize() -> void:
	call_deferred("run")

func capture_image(filename: String) -> void:
	await process_frame
	await RenderingServer.frame_post_draw
	var folder := ProjectSettings.globalize_path("res://captures")
	DirAccess.make_dir_recursive_absolute(folder)
	var result := root.get_texture().get_image().save_png(folder.path_join(filename + ".png"))
	assert(result == OK)

func run() -> void:
	var game = load("res://scenes/island.tscn").instantiate()
	root.add_child(game)
	for i in range(20):
		await process_frame
	game.set_process(false)
	game.set_physics_process(false)
	game.ui.visible = false
	game.player.position = Vector3(25, .1, 3)
	var wildlife = game.desert.wildlife
	for animal_index in [0, 1, 3]:
		var animal: Dictionary = wildlife.animals[animal_index]
		var focus: Vector3 = animal.node.global_position + Vector3.UP * .30
		game.distance_haze.set_shader_parameter("focus_position", focus)
		game.camera.size = 3.2 if animal_index == 0 else 2.3
		game.camera.position = focus + Vector3(2.8, 1.8, 3.6)
		game.camera.look_at(focus)
		await capture_image("desert-" + animal.kind)
	game.camera.size = 23
	var overview := Vector3(30, 0, 1)
	game.distance_haze.set_shader_parameter("focus_position", overview)
	game.camera.position = overview + Vector3(11, 18, 20)
	game.camera.look_at(overview)
	await capture_image("desert-wildlife-overview")
	if "--sequence" in OS.get_cmdline_user_args():
		var focus := Vector3(30.7, .45, 3.75)
		game.distance_haze.set_shader_parameter("focus_position", focus)
		game.camera.size = 5.5
		game.camera.position = focus + Vector3(1.5, 2.4, 4.6)
		game.camera.look_at(focus)
		for frame in range(60):
			for step in range(10):
				game.desert.advance(1.0 / 60, true)
			await capture_image("desert-fox-frame-%03d" % frame)
	print("MOSSLIGHT_DESERT_WILDLIFE_CAPTURE_COMPLETE")
	quit()
