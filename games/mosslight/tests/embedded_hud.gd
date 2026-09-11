extends SceneTree

var failures := 0


func _initialize() -> void:
	call_deferred("run")


func run() -> void:
	var game = load("res://scenes/island.tscn").instantiate()
	root.add_child(game)
	await process_frame
	game.embedded_mode = true
	game._apply_embedded_hud()
	check(game.overview_labels.all(func(label: Label): return not label.visible), "embedded world hides location heading")
	check(not game.view_hint.visible, "embedded world hides persistent camera help")
	check(not game.game_hud.visible, "embedded world hides echo and keyboard HUD")
	check(not game.garden.bag_hint.visible, "embedded world hides persistent inventory hint")
	check(game.prompt.visible and game.toast.visible, "embedded world keeps contextual feedback")
	print("MOSSLIGHT_EMBEDDED_HUD_TESTS_COMPLETE failures=%d" % failures)
	quit(1 if failures else 0)


func check(ok: bool, label: String) -> void:
	if ok:
		print("PASS: " + label)
	else:
		failures += 1
		push_error("FAIL: " + label)
