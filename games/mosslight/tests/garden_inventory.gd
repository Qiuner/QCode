extends SceneTree
var failures := 0
var game: Node3D

func _initialize() -> void:
	call_deferred("run")

func tick(count: int) -> void:
	for i in range(count):
		await physics_frame
		await process_frame

func check(condition: bool, label: String) -> void:
	print("PASS: " if condition else "FAIL: ", label)
	if not condition:
		failures += 1

func move_to(at: Vector3) -> void:
	game.player.position = at
	game.player.velocity = Vector3.ZERO
	await tick(5)

func run() -> void:
	TranslationServer.set_locale("zh")
	game = load("res://scenes/island.tscn").instantiate()
	root.add_child(game)
	await tick(15)
	var garden: Node3D = game.garden
	check(garden.items.is_empty() and garden.world_can.visible, "new game starts with can on ground and empty bag")
	check(not garden.interact(), "cannot pick up or use distant items")
	await move_to(garden.CAN_HOME + Vector3(0, 0, .85))
	check(garden.target().get("kind") == "pickup", "can is reachable at cottage")
	game._interact()
	check(garden.items.size() == 1 and garden.equipped and not garden.world_can.visible and garden.water == 0, "pickup stores unique can and equips it empty")
	check(garden.items[0].size == Vector2i(2, 2) and garden.items[0].origin == Vector2i.ZERO and garden.occupied_cells() == 4, "watering can occupies a two-by-two grid footprint")
	check(not garden.add_item("watering_can") and garden.items.size() == 1, "unique tool cannot be duplicated")
	await move_to(Vector3(4, .05, 0))
	game._interact()
	check(garden.water == 3, "pond edge fills equipped can")
	await tick(45)
	game._interact()
	check(garden.water == 3, "repeated filling never overflows water capacity")
	garden.toggle_equipped()
	await tick(2)
	check(not garden.equipped and garden.target().is_empty(), "stored tool cannot refill from pond")
	garden.toggle_equipped()
	var first: Vector3 = garden.plots[0].position
	await move_to(first + Vector3(0, 0, .9))
	game._interact()
	check(garden.plots[0].watered and garden.water == 2, "watering consumes one charge and wets chosen plot")
	await tick(45)
	game._interact()
	check(garden.water == 2, "wet plot cannot consume water twice")
	Input.action_press("walk_up")
	garden.set_open(true)
	var at: Vector3 = game.player.position
	var growth: float = garden.plots[0].growth
	await tick(20)
	game._interact()
	check(game.game_paused and garden.opened and garden.overlay.visible and not game.pause_panel.visible and game.player.position == at and garden.plots[0].growth == growth, "inventory pauses movement, growth and interaction without pause overlay")
	check(not Input.is_action_pressed("walk_up"), "inventory clears held movement keys")
	garden.equip_button.pressed.emit()
	check(not garden.equipped, "inventory equip button stores the can")
	garden.equip_button.pressed.emit()
	check(garden.equipped, "inventory equip button equips the can")
	var close := InputEventKey.new()
	close.keycode = KEY_ESCAPE
	close.physical_keycode = KEY_ESCAPE
	close.pressed = true
	game._unhandled_input(close)
	check(not garden.opened and not game.game_paused and not garden.overlay.visible, "Escape closes inventory and resumes game")
	await tick(320)
	check(garden.plots[0].bloom.visible, "watered seedling matures into visible flower")
	game._interact()
	check(garden.items.size() == 2 and garden.items[1].id == "flower" and garden.items[1].count == 1 and not garden.plots[0].watered, "harvest stores flower and resets reusable plot")
	check(garden.items[1].size == Vector2i.ONE and garden.occupied_cells() == 5, "flower occupies one grid cell beside the larger tool")
	var original_can_origin: Vector2i = garden.items[0].origin
	check(not garden.move_item(0, Vector2i(5, 3)) and garden.items[0].origin == original_can_origin, "grid rejects a large item that extends beyond the bag")
	check(garden.move_item(0, Vector2i(3, 0)) and garden.items[0].origin == Vector2i(3, 0), "large item moves into a valid empty footprint")
	check(not garden.move_item(1, Vector2i(3, 0)), "grid rejects placement on an occupied footprint")
	check(garden.move_item(1, Vector2i(0, 3)) and garden.items[1].origin == Vector2i(0, 3), "small item moves independently into a free cell")
	for i in [1, 2]:
		await move_to(garden.plots[i].position + Vector3(0, 0, .9))
		game._interact()
		await tick(45)
	check(garden.water == 0 and garden.plots[1].watered and garden.plots[2].watered, "one full can waters three separate plots")
	await move_to(first + Vector3(0, 0, .9))
	game._interact()
	check(not garden.plots[0].watered and garden.water == 0, "empty can cannot water a dry plot")
	await tick(320)
	await move_to(garden.plots[1].position + Vector3(0, 0, .9))
	game._interact()
	check(garden.items.size() == 2 and garden.items[1].count == 2, "flowers stack into existing slot")
	garden.set_open(true)
	check(garden.item_layer.mouse_filter == Control.MOUSE_FILTER_IGNORE, "transparent item layer leaves empty grid cells clickable")
	check(garden.item_buttons[0].size == Vector2(151, 151) and garden.item_buttons[1].size == Vector2(72, 72), "inventory cards visibly span their grid footprints")
	garden.item_buttons[1].pressed.emit()
	check(garden.selected == 1 and garden.moving_index == 1 and garden.description.text.contains("小雏菊") and not garden.equip_button.visible, "flower card selects collectible details and enters arrange mode")
	garden.slots[2].pressed.emit()
	check(garden.items[1].origin == Vector2i(2, 0) and garden.moving_index == -1, "clicking a free cell places the held item through the inventory UI")
	garden.item_buttons[0].pressed.emit()
	check(garden.selected == 0 and garden.equip_button.visible, "tool slot restores equipment action")
	garden.set_open(false)
	check(not garden.add_item("flower", 100) and garden.items[1].count == 2, "stack overflow preserves existing count")
	garden.items[1].count = 99
	await move_to(garden.plots[2].position + Vector3(0, 0, .9))
	game._interact()
	check(garden.plots[2].bloom.visible and garden.items[1].count == 99, "full flower stack leaves harvest in world")
	game.set_view_mode(game.ViewMode.FIRST_PERSON)
	await tick(3)
	check(garden.eye_can.visible and not garden.held_can.visible, "equipped tool appears in first-person view")
	game.set_view_mode(game.ViewMode.THIRD_PERSON)
	await tick(3)
	check(not garden.eye_can.visible and garden.held_can.visible, "equipped tool follows third-person hero")
	print("MOSSLIGHT_GARDEN_TESTS_COMPLETE failures=", failures)
	game.queue_free()
	await tick(2)
	quit(1 if failures else 0)
