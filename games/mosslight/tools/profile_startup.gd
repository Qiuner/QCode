extends SceneTree


func _initialize() -> void:
	call_deferred("run")


func run() -> void:
	var started := Time.get_ticks_msec()
	var scene := load("res://scenes/island.tscn") as PackedScene
	var loaded := Time.get_ticks_msec()
	var game := scene.instantiate()
	var instantiated := Time.get_ticks_msec()
	root.add_child(game)
	var ready_at := Time.get_ticks_msec()
	await process_frame
	print("MOSSLIGHT_STARTUP ", JSON.stringify({
		"load_ms": loaded - started,
		"instantiate_ms": instantiated - loaded,
		"ready_ms": ready_at - instantiated,
		"total_ms": Time.get_ticks_msec() - started,
		"nodes": game.find_children("*", "", true, false).size(),
		"meshes": game.find_children("*", "MeshInstance3D", true, false).size(),
		"shapes": game.find_children("*", "CollisionShape3D", true, false).size(),
	}))
	quit()
