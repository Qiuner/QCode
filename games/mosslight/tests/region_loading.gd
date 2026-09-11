extends SceneTree

var failures := 0


func _initialize() -> void:
	call_deferred("run")


func run() -> void:
	var game: Node3D = load("res://scenes/island.tscn").instantiate()
	root.add_child(game)
	await physics_frame
	check(game.desert == null and game.streamside == null, "primary island starts without neighbors")
	check(game.region_barriers.size() == 2, "unloaded bridges have safety barriers")
	check(game.region_signs.size() == 2, "both regions have visible signs")
	game.regions_error = true
	game._update_region_signs()
	check(game.region_signs[0].text.contains("加载失败"), "signs show failure persistently")
	game.regions_error = false
	game._update_region_signs()
	check(game.region_signs[0].text.contains("准备中"), "retry restores loading signs")
	game.learned = true
	game.use_echo()
	game._update_preview()
	game._process(.016)
	check(game.player != null and game.residents.residents.size() == 4, "player and residents work before neighbors load")
	check(await game._install_neighbor_regions(), "neighbor scenes install successfully")
	await physics_frame
	check(game.region_barriers.is_empty(), "bridges open after terrain is installed")
	check(game.region_signs.is_empty(), "loading signs disappear with barriers")
	check(game.desert != null and game.streamside != null, "both regions remain available")
	var count: int = game.get_child_count()
	await game._install_neighbor_regions()
	check(game.get_child_count() == count, "repeated installation does not duplicate regions")
	print("MOSSLIGHT_REGION_LOADING_TESTS_COMPLETE failures=", failures)
	quit(1 if failures else 0)


func check(ok: bool, label: String) -> void:
	print("PASS: " if ok else "FAIL: ", label)
	if not ok:
		failures += 1
