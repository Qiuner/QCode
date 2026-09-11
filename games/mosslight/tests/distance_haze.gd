extends SceneTree


func _initialize() -> void:
	call_deferred("run")


func run() -> void:
	var game: Node3D = load("res://scenes/island.tscn").instantiate()
	root.add_child(game)
	await process_frame
	game._process(0)
	var overlay: MeshInstance3D = game.camera.get_node("DistanceHaze")
	assert(overlay != null and overlay.cast_shadow == GeometryInstance3D.SHADOW_CASTING_SETTING_OFF)
	assert(game.distance_haze.get_shader_parameter("focus_position").is_equal_approx(game.player.global_position))
	game.player.position = Vector3(20, 1, 3)
	game._process(0)
	assert(game.distance_haze.get_shader_parameter("focus_position").is_equal_approx(game.player.global_position))
	game.set_view_mode(game.ViewMode.FIRST_PERSON)
	game._process(0)
	assert(game.distance_haze.get_shader_parameter("clear_radius") == 7.0)
	print("MOSSLIGHT_DISTANCE_HAZE_TESTS_COMPLETE failures=0")
	quit()
