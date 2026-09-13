extends SceneTree
## Render a real 4K source image; run with a graphics driver (not --headless).
## godot --path games/mosslight --script res://tools/render_cover.gd

func _initialize() -> void:
	call_deferred("run")

func run() -> void:
	var viewport := SubViewport.new()
	viewport.size = Vector2i(3840, 1564)
	viewport.own_world_3d = true
	viewport.msaa_3d = Viewport.MSAA_8X
	viewport.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	root.add_child(viewport)
	var game = load("res://scenes/island.tscn").instantiate()
	viewport.add_child(game)
	await game._install_neighbor_regions()
	game.process_mode = Node.PROCESS_MODE_DISABLED
	for layer in game.find_children("*", "CanvasLayer", true, false):
		layer.hide()
	for label in game.find_children("*", "Label3D", true, false):
		label.hide()
	for overlay in game.camera.get_children():
		if overlay is MeshInstance3D:
			overlay.hide()
	game.camera.size = 48
	game.camera.position = Vector3(13.2, 28.5, 29.5)
	game.camera.look_at(Vector3(0, 3.2, -.5))
	for frame in range(12):
		await process_frame
	await RenderingServer.frame_post_draw
	var image := viewport.get_texture().get_image()
	var output := "res://build/cover-source.png"
	var error := image.save_png(output)
	print("COVER_RENDER: ", image.get_size(), " result=", error, " ", output)
	quit(error)
