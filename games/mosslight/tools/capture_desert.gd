extends SceneTree
## Render review images with the real Godot lighting and Compatibility renderer.

func _initialize() -> void:
	call_deferred("run")

func run() -> void:
	var game = load("res://scenes/island.tscn").instantiate()
	root.add_child(game)
	game.embedded_mode = true
	game.set_game_paused(false)
	game.set_process(false)
	game.set_physics_process(false)
	game.ui.visible = false
	game.player.position = Vector3(26.5, .05, 3)
	game.camera.size = 26
	game.camera.position = game.default_camera_position + game.DESERT_ORIGIN + Vector3.UP * 1.5
	game.camera.look_at(game.camera_target + game.DESERT_ORIGIN + Vector3.UP * 1.5)
	for i in range(12):
		await process_frame
	await RenderingServer.frame_post_draw
	var folder := ProjectSettings.globalize_path("res://captures")
	DirAccess.make_dir_recursive_absolute(folder)
	var result := root.get_texture().get_image().save_png(folder.path_join("sunwake-desert.png"))
	if result != OK:
		quit(result)
		return
	game.camera.size = 50
	game.camera.position = game.default_camera_position + game.DESERT_ORIGIN * .5
	game.camera.look_at(game.camera_target + game.DESERT_ORIGIN * .5)
	for i in range(6):
		await process_frame
	await RenderingServer.frame_post_draw
	result = root.get_texture().get_image().save_png(folder.path_join("mosslight-two-islands.png"))
	if result != OK:
		quit(result)
		return
	game.camera.size = 18
	game.camera.position = Vector3(36, 10, 15)
	game.camera.look_at(Vector3(25, 2.5, -3))
	for i in range(6):
		await process_frame
	await RenderingServer.frame_post_draw
	result = root.get_texture().get_image().save_png(folder.path_join("sunwake-caravanserai.png"))
	for step in range(270):
		game.desert.advance(1.0 / 60, true, Vector3.ZERO)
	for shot in [
		["sunwake-wind", Vector3(36.7, .7, 5.4), 6.0],
		["sunwake-oasis", Vector3(31, .35, -1), 5.0],
		["sunwake-chime", Vector3(25.75, 1.65, .40), 2.0],
	]:
		game.camera.size = shot[2]
		game.camera.position = shot[1] + Vector3(3, 3, 4)
		game.camera.look_at(shot[1])
		game.distance_haze.set_shader_parameter("focus_position", shot[1])
		for frame in range(4):
			await process_frame
		await RenderingServer.frame_post_draw
		result = root.get_texture().get_image().save_png(folder.path_join(shot[0] + ".png"))
		if result != OK:
			quit(result)
			return
	print("DESERT_CAPTURE_COMPLETE result=", result)
	quit(result)
