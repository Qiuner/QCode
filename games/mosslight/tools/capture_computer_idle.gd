extends SceneTree
var game: Node3D
var computer: Node3D
var folder: String

func _initialize() -> void:
	call_deferred("run")

func advance(seconds: float) -> void:
	for i in range(roundi(seconds * 60)):
		computer.advance(1.0 / 60)

func capture(label: String, count: int, fps: float) -> void:
	for i in range(count):
		advance(1.0 / fps)
		await process_frame
		await RenderingServer.frame_post_draw
		var result := root.get_texture().get_image().save_png(folder.path_join("%s-%03d.png" % [label, i]))
		assert(result == OK)

func run() -> void:
	DisplayServer.window_set_vsync_mode(DisplayServer.VSYNC_DISABLED)
	game = load("res://scenes/island.tscn").instantiate()
	root.add_child(game)
	game.embedded_mode = true
	game.set_game_paused(false)
	game.set_process(false)
	game.set_physics_process(false)
	game.ui.visible = false
	computer = game.sanctuary_computer
	computer.idle_random.seed = 17
	game.camera.size = 8
	game.camera.position = Vector3(7, 9, 8)
	game.camera.look_at(Vector3(1.2, 3.5, -6.2))
	game.distance_haze.set_shader_parameter("focus_position", computer.ORIGIN)
	folder = ProjectSettings.globalize_path("res://captures/computer-idle")
	DirAccess.make_dir_recursive_absolute(folder)
	for i in range(8):
		await process_frame
	game.player.position = Vector3(1.2, .05, -2.2)
	await capture("greet", 36, 12)
	advance(.3)
	computer.idle_delay = .01
	await capture("tidy", 40, 12)
	game.camera.position = Vector3(-5, 8, 5)
	game.camera.look_at(Vector3(1.2, 3.5, -6.2))
	computer.idle_delay = .01
	await capture("tidy-other", 40, 12)
	game.camera.position = Vector3(7, 9, 8)
	game.camera.look_at(Vector3(1.2, 3.5, -6.2))
	game.player.position = game.START
	advance(60)
	await capture("sleep", 12, 12)
	game.player.position = Vector3(1.2, .05, -2.2)
	await capture("wake", 36, 12)
	print("MOSSLIGHT_COMPUTER_IDLE_CAPTURE_COMPLETE")
	quit()
