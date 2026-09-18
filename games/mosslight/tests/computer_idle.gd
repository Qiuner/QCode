extends SceneTree
var failures := 0
var game: Node3D
var computer: Node3D
var hand_vertices: Array[Vector3] = []

func _initialize() -> void:
	call_deferred("run")

func check(condition: bool, label: String) -> void:
	print("PASS: " if condition else "FAIL: ", label)
	if not condition:
		failures += 1

func advance(seconds: float) -> void:
	for i in range(roundi(seconds * 60)):
		computer.advance(1.0 / 60)

func arm_clearance() -> String:
	var housing := AABB(Vector3(-1.08, 1.31, -.825), Vector3(2.16, 1.48, 1.505)).grow(.135)
	for arm: Node3D in computer.arms:
		for piece: Node3D in arm.get_children():
			for fraction in [0.0, .25, .5, .75, 1.0]:
				var point: Vector3 = piece.transform * Vector3(0, fraction, 0)
				if housing.has_point(point):
					return "hose enters monitor at " + str(point)
				if point.y > .49 and point.y < 1.71 and Vector2(point.x, point.z + .08).length() < .352:
					return "hose enters mast at " + str(point)
	for left: Node3D in computer.arms[0].get_children():
		for right: Node3D in computer.arms[1].get_children():
			var closest := Geometry3D.get_closest_points_between_segments(left.position, left.transform * Vector3.UP, right.position, right.transform * Vector3.UP)
			if closest[0].distance_to(closest[1]) < .26:
				return "hoses overlap each other"
	for hand: Node3D in computer.hands:
		for vertex: Vector3 in hand_vertices:
			var point: Vector3 = hand.transform * vertex
			if housing.grow(-.125).has_point(point):
				return "hand enters monitor at " + str(point)
			if point.y > .49 and point.y < 1.71 and Vector2(point.x, point.z + .08).length() < .227:
				return "hand enters mast at " + str(point)
	return ""

func run() -> void:
	game = load("res://scenes/island.tscn").instantiate()
	root.add_child(game)
	await physics_frame
	game.set_physics_process(false)
	game.set_process(false)
	computer = game.sanctuary_computer
	for mesh: MeshInstance3D in computer.hands[0].find_children("*", "MeshInstance3D", true, false):
		var local: Transform3D = computer.hands[0].global_transform.affine_inverse() * mesh.global_transform
		for surface in range(mesh.mesh.get_surface_count()):
			for vertex: Vector3 in mesh.mesh.surface_get_arrays(surface)[Mesh.ARRAY_VERTEX]:
				hand_vertices.append(local * vertex)
	computer.idle_random.seed = 17
	check(computer.signal_pivot.get_child_count() == 1 and not computer.signal_materials.is_empty(), "independent Blender waveform and materials load")
	check(computer.idle_delay >= 20 and computer.idle_delay <= 40, "idle action starts after a randomized quiet interval")
	game.player.position = Vector3(1.2, .05, -2.2)
	advance(.8)
	check(computer.idle_action == "greet" and computer.hands[1].position.y > 1.6, "approaching player receives one raised-hand greeting")
	check(not computer.active, "greeting does not grab or move the player")
	advance(3)
	check(computer.idle_action == "rest", "greeting returns to rest")
	game.player.position = game.START
	advance(.1)
	game.player.position = Vector3(1.2, .05, -2.2)
	advance(.1)
	check(computer.idle_action == "rest", "rapid re-entry does not repeat the greeting")
	computer.idle_delay = .1
	advance(1.6)
	check(computer.idle_action == "tidy", "quiet interval starts arm grooming")
	var grooming_hand: Vector3 = computer.hands[computer.tidy_side].position
	check(absf(grooming_hand.x) < 1.3 and grooming_hand.y > .8, "grooming hand reaches the opposite hose")
	var first_side: int = computer.tidy_side
	advance(2)
	check(computer.idle_action == "rest" and computer.idle_delay >= 20 and computer.idle_delay <= 40, "grooming schedules a new quiet interval")
	computer.idle_delay = .1
	advance(.2)
	check(computer.tidy_side != first_side, "grooming alternates arms")
	advance(3)
	game.player.position = game.START
	advance(62)
	check(computer.idle_action == "sleep" and computer.sleep_amount > .99, "one unattended minute enters sleep")
	check(computer.signal_pivot.scale.y < .2 and computer.hands[0].position.y < .3, "sleep slows the waveform and lowers both hands")
	check(computer.signal_materials[0].emission_energy_multiplier < .1, "sleep dims only the waveform")
	var sleeping_pose: Transform3D = computer.hands[0].transform
	var sleeping_clock: float = computer.idle_time
	game.set_game_paused(true)
	advance(10)
	check(computer.hands[0].transform == sleeping_pose and computer.idle_time == sleeping_clock, "pause freezes idle pose and its clock")
	game.set_game_paused(false)
	game.qcode_panel_open = true
	advance(10)
	check(computer.idle_time == sleeping_clock, "host panel pauses all idle timers")
	game.qcode_panel_open = false
	game.garden.opened = true
	advance(10)
	check(computer.idle_time == sleeping_clock, "inventory pauses all idle timers")
	game.garden.opened = false
	game.player.position = Vector3(1.2, .05, -2.2)
	advance(1)
	check(computer.idle_action == "greet" and computer.sleep_amount == 0 and computer.signal_pivot.scale.y > .9, "returning player wakes the screen and receives a greeting")
	var before_grab: Vector3 = computer.hands[1].position
	await physics_frame
	check(computer.grab(), "grab interrupts the greeting immediately")
	check(computer.hands[1].position == before_grab, "starting grab does not snap a raised hand")
	computer.advance(1.0 / 60)
	check(computer.hands[1].position.distance_to(before_grab) < .05, "grab reaches from the actual idle pose")
	for i in range(ceili((computer.LOOK_TIME + computer.TRANSPORT_END + computer.RELEASE_TIME + .1) * 60)):
		computer.advance(1.0 / 60)
		await physics_frame
	check(not computer.active and game.player.position.distance_to(computer.LANDING) < .12, "interrupted greeting completes the original transport")
	game.player.position = game.START
	advance(62)
	computer.set_status("working")
	advance(1)
	check(computer.idle_action == "rest" and computer.sleep_amount == 0, "real work wakes a sleeping computer")
	for status in ["thinking", "working", "approval", "failed"]:
		computer.set_status(status)
		advance(65)
		check(computer.idle_action == "rest" and computer.sleep_amount == 0, status + " suppresses grooming and sleep")
	computer.set_status("idle")
	computer.idle_delay = 1
	advance(.2)
	game.nature_motion = false
	var frozen: Transform3D = computer.hands[0].transform
	var waveform: Vector3 = computer.signal_pivot.scale
	var clock: float = computer.idle_time
	advance(70)
	check(computer.idle_time == clock and computer.hands[0].transform == frozen and computer.signal_pivot.scale == waveform, "reduced motion freezes decorative actions, screen and timers")
	game.nature_motion = true
	advance(1)
	check(computer.idle_action == "tidy", "re-enabling motion resumes instead of replaying elapsed actions")
	computer.set_status("completed")
	advance(10)
	check(computer.magic_pending and computer.magic_time == computer.MAGIC_DURATION and not computer.review_dialogue.opened, "completed work waits for its audience instead of performing off screen")
	game.player.position = computer.LANDING
	advance(.8)
	check(not computer.magic_pending and not computer.magic_star.visible and not computer.magic_pigeon.visible, "Q first presents empty hands and the hat")
	check(computer.magic_hat != null and computer.magic_wings.size() == 2 and computer.magic_wings.all(func(wing): return wing != null), "Blender hollow hat and both articulated dove wings load")
	check(computer.idle_action == "rest", "greeting and grooming cannot take over the magic hands")
	advance(1)
	check(computer.magic_star.visible and not computer.magic_pigeon.visible, "starlight appears before the dove reveal")
	var magic_clock: float = computer.magic_time
	var magic_hand: Transform3D = computer.hands[0].transform
	var magic_hat: Transform3D = computer.magic_hat.transform
	game.set_game_paused(true)
	advance(5)
	check(computer.magic_time == magic_clock and computer.hands[0].transform == magic_hand and computer.magic_hat.transform == magic_hat, "pause freezes the whole magic act")
	game.set_game_paused(false)
	game.qcode_panel_open = true
	advance(3)
	check(computer.magic_time == magic_clock and not computer.magic_review_after, "opening the work panel freezes the act and cancels redundant results handoff")
	game.qcode_panel_open = false
	computer.magic_review_after = true
	game.garden.opened = true
	advance(3)
	check(computer.magic_time == magic_clock, "inventory freezes the magic timeline")
	game.garden.opened = false
	computer.set_status("completed")
	check(computer.magic_time == magic_clock, "repeated completed sync does not restart the act")
	advance(1.5)
	check(not computer.magic_star.visible and not computer.magic_pigeon.visible, "starlight disappears inside the hat before the reveal")
	advance(1.7)
	check(computer.magic_pigeon.visible and computer.magic_pigeon.position.y > 3.4, "dove emerges above the monitor with flapping wings")
	advance(1.8)
	check(computer.magic_pigeon.visible and computer.magic_pigeon.position.distance_to(computer.hands[0].position + Vector3(0, .66, 0)) < .03, "dove lands on the waiting left hand")
	advance(2.1)
	check(not computer.magic_pigeon.visible and not computer.magic_star.visible and computer.magic_hat.position.is_equal_approx(computer.MAGIC_HAT_REST), "all magic props are stored after the bow")
	check(computer.review_dialogue.opened, "results dialogue waits until the act has finished")
	computer.review_dialogue.close()
	computer.set_status("working")
	computer.set_status("completed")
	advance(1.5)
	game.nature_motion = false
	advance(.1)
	check(not computer.magic_pigeon.visible and not computer.magic_star.visible and computer.magic_hat.position.is_equal_approx(computer.MAGIC_HAT_REST), "reduced motion immediately stores the magic props")
	check(computer.review_dialogue.opened, "reduced motion skips directly to the pending results dialogue")
	computer.review_dialogue.close()
	game.nature_motion = true
	game.player.position = game.START
	advance(65)
	check(computer.idle_action == "sleep", "completed work permits idle behavior again")
	game.nature_motion = false
	computer.set_status("approval")
	check(computer.sleep_amount == 0 and computer.signal_pivot.scale.y > .9, "approval stays readable even when decorative motion is disabled")
	game.nature_motion = true
	computer.set_status("idle")
	check(computer.preview_magic(), "developer preview starts without a task")
	advance(1)
	computer.set_status("idle")
	check(computer.magic_preview and computer.magic_time < computer.MAGIC_DURATION, "same idle status sync preserves developer preview")
	computer.set_status("working")
	check(computer.magic_time == computer.MAGIC_DURATION and not computer.magic_review_after and not computer.magic_preview, "new work cancels magic and its pending dialogue")
	computer.set_status("idle")
	game.player.position = computer.LANDING
	computer.player_near = true
	computer.sleep_amount = 0
	computer._pose(0)
	for action in ["rest", "greet", "tidy", "tidy"]:
		computer.idle_action = action
		computer.action_time = 0
		computer.idle_delay = 30
		computer.tidy_side = 1 - computer.tidy_side
		var violation := ""
		for frame in range(240):
			computer.advance(1.0 / 60)
			violation = arm_clearance()
			if not violation.is_empty():
				break
		check(violation.is_empty(), action + " full path clears monitor and mast: " + violation)
	computer.preview_magic()
	var magic_violation := ""
	for frame in range(540):
		computer.advance(1.0 / 60)
		magic_violation = arm_clearance()
		if not magic_violation.is_empty():
			break
	check(magic_violation.is_empty(), "entire magic act clears monitor, mast and opposite arm: " + magic_violation)
	check(not computer.review_dialogue.opened, "developer preview never opens the results dialogue")
	game.nature_motion = false
	check(not computer.preview_magic(), "reduced motion rejects invisible developer previews")
	game.nature_motion = true
	computer.set_status("completed")
	advance(1.6)
	game.player.position = game.START
	advance(.1)
	check(not computer.magic_star.visible and not computer.magic_review_after and computer.magic_time == computer.MAGIC_DURATION, "leaving the audience area cancels the act and its handoff")
	for trick in ["cards", "cups"]:
		check(computer.preview_magic(trick), trick + " preview starts from the developer entry")
		advance(2.5)
		if trick == "cards":
			check(computer.trick_cards.any(func(card): return card.visible), "flying cards are visible during the card act")
		else:
			check(computer.trick_cups.all(func(cup): return cup.visible), "three cups stay visible during the cup act")
		advance(6.5)
		check(not computer.trick_tray.visible and not computer.trick_lemon.visible, trick + " props return to storage")
	print("MOSSLIGHT_COMPUTER_IDLE_TESTS_COMPLETE failures=", failures)
	game.queue_free()
	await process_frame
	quit(1 if failures else 0)
