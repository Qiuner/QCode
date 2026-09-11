extends SceneTree


func _initialize() -> void:
	call_deferred("run")


func run() -> void:
	var failures := 0
	for size in [Vector2i(1920, 1000), Vector2i(2560, 1080), Vector2i(390, 844)]:
		root.size = size
		await process_frame
		await process_frame
		var visible := root.get_visible_rect().size
		var actual_aspect := float(root.size.x) / root.size.y
		if absf(visible.aspect() - actual_aspect) > .005:
			push_error("Viewport has letterboxing: window=%s visible=%s" % [root.size, visible])
			failures += 1
	print("MOSSLIGHT_VIEWPORT_RESIZE_TESTS_COMPLETE failures=", failures)
	quit(failures)
