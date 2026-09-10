extends SceneTree

func _initialize() -> void:
	call_deferred("run")

func run() -> void:
	var game = load("res://scenes/island.tscn").instantiate()
	root.add_child(game)
	game.set_process(false)
	game.set_physics_process(false)
	game.ui.visible = false
	game.player.position = Vector3(-22, .05, 3)
	game.camera.size = 33
	game.camera.position = Vector3(-8, 23, 32) + game.STREAMSIDE_ORIGIN
	game.camera.look_at(Vector3(0, 5, 0) + game.STREAMSIDE_ORIGIN)
	for i in range(12):
		await process_frame
		game.ui.visible = false
	await RenderingServer.frame_post_draw
	var folder := ProjectSettings.globalize_path("res://captures")
	DirAccess.make_dir_recursive_absolute(folder)
	var result := root.get_texture().get_image().save_png(folder.path_join("streamside-garden.png"))
	if result != OK:
		quit(result)
		return
	game.camera.size = 32
	game.camera.position = Vector3(25, 17, 29) + game.STREAMSIDE_ORIGIN
	game.camera.look_at(Vector3(1, 5, 0) + game.STREAMSIDE_ORIGIN)
	for i in range(6):
		await process_frame
		game.ui.visible = false
	await RenderingServer.frame_post_draw
	result = root.get_texture().get_image().save_png(folder.path_join("streamside-moon-gate.png"))
	if result != OK:
		quit(result)
		return
	game.camera.size = 11
	game.camera.position = Vector3(3, 10, 14) + game.STREAMSIDE_ORIGIN
	game.camera.look_at(Vector3(-3.85, 1.3, .8) + game.STREAMSIDE_ORIGIN)
	for i in range(6):
		await process_frame
		game.ui.visible = false
	await RenderingServer.frame_post_draw
	result = root.get_texture().get_image().save_png(folder.path_join("streamside-stairs.png"))
	if result != OK:
		quit(result)
		return
	game.camera.size = 80
	game.camera.position = Vector3(16, 38, 52)
	game.camera.look_at(Vector3(0, 2, 0))
	for i in range(6):
		await process_frame
		game.ui.visible = false
	await RenderingServer.frame_post_draw
	result = root.get_texture().get_image().save_png(folder.path_join("mosslight-three-islands.png"))
	print("STREAMSIDE_CAPTURE_COMPLETE result=", result)
	quit(result)
