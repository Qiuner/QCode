extends SceneTree
var failures := 0

func _initialize() -> void:
	call_deferred("run")

func check(value: bool, label: String) -> void:
	print("PASS: " if value else "FAIL: ", label)
	if not value:
		failures += 1

func run() -> void:
	var game = load("res://scenes/island.tscn").instantiate()
	root.add_child(game)
	await process_frame
	var residents = game.residents
	var keeper = residents.residents[1]
	var home: Vector3 = keeper.position
	residents.guide_keeper("course", "arrive", Vector3.ZERO, true)
	check(keeper.position != home and keeper.collision_layer == 0, "reduced motion arrives without blocking the player")
	residents.guide_keeper("course", "arrive", Vector3(9, 0, 9), true)
	check(is_equal_approx(keeper.position.x, 1.6) and residents.residents.size() == 3, "duplicate encounter does not move or duplicate the keeper")
	residents.guide_keeper("course", "home", Vector3.ZERO, true)
	check(keeper.position == home and is_instance_valid(residents.tutorial_marker), "home has a visible destination")
	residents.guide_keeper("reset", "cancel", Vector3.ZERO, true)
	check(keeper.position == home and keeper.collision_layer == 1 and residents.tutorial_marker == null, "cancel restores the original resident")
	residents.guide_keeper("next", "arrive", Vector3.ZERO, false)
	await create_timer(.65).timeout
	check(keeper.position.distance_to(Vector3(1.6, home.y, 1.2)) < .01, "animated arrival reaches the conversation")
	residents.guide_keeper("next", "home", Vector3.ZERO, false)
	await create_timer(.2).timeout
	residents.guide_keeper("reset", "cancel", Vector3.ZERO, true)
	await create_timer(2).timeout
	check(keeper.position == home and residents.tutorial_id.is_empty(), "interrupted flight cannot finish late")
	print("tutorial keeper failures=", failures)
	quit(failures)
