extends Node3D
## Blender-authored computer, with articulated hoses driven by the game clock.
const COMPUTER = preload("res://assets/grabber_computer.glb")
const SEGMENT = preload("res://assets/grabber_segment.glb")
const CLAW = preload("res://assets/grabber_claw.glb")
const SIGNAL = preload("res://assets/grabber_signal.glb")
const MAGIC_HAT = preload("res://assets/q_magic_hat.glb")
const MAGIC_DOVE = preload("res://assets/q_magic_dove.glb")
const MAGIC_STAR = preload("res://assets/q_magic_star.glb")
const MAGIC_STAND = preload("res://assets/q_magic_stand.glb")
const TRICK_CARD = preload("res://assets/q_trick_card.glb")
const TRICK_CUP = preload("res://assets/q_trick_cup.glb")
const TRICK_TRAY = preload("res://assets/q_trick_tray.glb")
const TRICK_BALL = preload("res://assets/q_trick_ball.glb")
const TRICK_LEMON = preload("res://assets/q_trick_lemon.glb")
const MAGIC_TRICKS := ["starlight", "cards", "cups"]
const MAGIC_DURATION := 8.8
const MAGIC_HAT_REST := Vector3(1.28, .62, 1.45)
const ORIGIN := Vector3(1.2, 2.12, -6.8)
const LANDING := Vector3(1.2, 1.56, -4.85)
const SEGMENTS := 18
const REACH_TIME := .55
const LIFT_TIME := .85
const CARRY_TIME := 1.0
const LOWER_TIME := .65
const RELEASE_TIME := .50
const REMOTE_ROUTE_HEIGHT := 7.0
const TRANSPORT_END := REACH_TIME + LIFT_TIME + CARRY_TIME + LOWER_TIME
const REMOTE_CALL_TIME := 1.25
const LOOK_TIME := .55

var active := false
var remote_active := false
var remote_transport := false
var review_on_landing := false
var review_dialogue: CanvasLayer
var remote_time := 0.0
var time := 0.0
var idle_time := 0.0
var start := Vector3.ZERO
var released := false
var arms: Array[Node3D] = []
var hands: Array[Node3D] = []
var housing: Node3D
var head_pivot: Node3D
var look_left := 0.0
var game: Node3D
var status_label: Label3D
var task_status := "idle"
var idle_action := "rest"
var action_time := 0.0
var idle_delay := 30.0
var alone_time := 0.0
var greeting_cooldown := 0.0
var player_near := false
var sleep_amount := 0.0
var tidy_side := 0
var idle_random := RandomNumberGenerator.new()
var signal_pivot: Node3D
var signal_materials: Array[StandardMaterial3D] = []
var magic_hat: Node3D
var magic_star: Node3D
var magic_pigeon: Node3D
var magic_wings: Array[Node3D] = []
var magic_sparks: Array[Node3D] = []
var magic_time := MAGIC_DURATION
var magic_preview := false
var magic_pending := false
var magic_review_after := false
var magic_trick := "starlight"
var magic_next := 0
var trick_cards: Array[Node3D] = []
var trick_cups: Array[Node3D] = []
var trick_tray: Node3D
var trick_ball: Node3D
var trick_lemon: Node3D
var grab_tips: Array[Vector3] = []
var grab_rotations: Array[Quaternion] = []


func _ready() -> void:
	game = get_parent()
	position = ORIGIN
	housing = COMPUTER.instantiate()
	add_child(housing)
	signal_pivot = Node3D.new()
	signal_pivot.position.y = 2.13
	add_child(signal_pivot)
	head_pivot = Node3D.new()
	head_pivot.position = Vector3(0, 1.40, -.08)
	add_child(head_pivot)
	for mesh: MeshInstance3D in housing.find_children("*", "MeshInstance3D", true, false):
		if str(mesh.name).begins_with("Monitor") or str(mesh.name).begins_with("Screen"):
			mesh.reparent(head_pivot, true)
	signal_pivot.reparent(head_pivot, true)
	var waveform: Node3D = SIGNAL.instantiate()
	waveform.position.y = -2.13
	signal_pivot.add_child(waveform)
	for mesh: MeshInstance3D in waveform.find_children("*", "MeshInstance3D", true, false):
		for surface in range(mesh.mesh.get_surface_count()):
			var material := mesh.get_active_material(surface).duplicate() as StandardMaterial3D
			if game.web_lightweight:
				material.diffuse_mode = BaseMaterial3D.DIFFUSE_LAMBERT
			mesh.set_surface_override_material(surface, material)
			signal_materials.append(material)
	magic_hat = MAGIC_HAT.instantiate()
	magic_hat.position = MAGIC_HAT_REST
	add_child(magic_hat)
	var magic_stand := MAGIC_STAND.instantiate()
	magic_stand.position = Vector3(MAGIC_HAT_REST.x, 0, MAGIC_HAT_REST.z)
	add_child(magic_stand)
	magic_star = MAGIC_STAR.instantiate()
	magic_star.visible = false
	add_child(magic_star)
	magic_pigeon = MAGIC_DOVE.instantiate()
	magic_pigeon.visible = false
	add_child(magic_pigeon)
	for wing_name in ["WingLeft", "WingRight"]:
		magic_wings.append(magic_pigeon.find_child(wing_name, true, false))
	for index in 12:
		var spark := MAGIC_STAR.instantiate()
		spark.scale = Vector3.ONE * .12
		spark.visible = false
		add_child(spark)
		magic_sparks.append(spark)
	for index in 7:
		var card := TRICK_CARD.instantiate()
		card.visible = false
		add_child(card)
		trick_cards.append(card)
	trick_tray = TRICK_TRAY.instantiate()
	trick_tray.visible = false
	add_child(trick_tray)
	for index in 3:
		var cup := TRICK_CUP.instantiate()
		trick_tray.add_child(cup)
		trick_cups.append(cup)
	trick_ball = TRICK_BALL.instantiate()
	trick_tray.add_child(trick_ball)
	trick_lemon = TRICK_LEMON.instantiate()
	trick_lemon.visible = false
	trick_tray.add_child(trick_lemon)
	idle_random.randomize()
	idle_delay = idle_random.randf_range(20, 40)
	player_near = game.player.global_position.distance_to(LANDING) < 6
	status_label = Label3D.new()
	status_label.font = preload("res://assets/fonts/MosslightUI.ttf")
	status_label.font_size = 28
	status_label.pixel_size = .006
	status_label.position = Vector3(0, 3.15, 0)
	status_label.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	status_label.outline_size = 7
	add_child(status_label)
	review_dialogue = game.resident_dialogue
	set_status("idle")
	var solid := StaticBody3D.new()
	solid.name = "ComputerHousing"
	solid.collision_layer = 3
	solid.collision_mask = 0
	var collision := CollisionShape3D.new()
	var shape := BoxShape3D.new()
	shape.size = Vector3(2.16, 1.48, 1.2)
	collision.shape = shape
	collision.position = Vector3(0, 2.05, -.03)
	solid.add_child(collision)
	add_child(solid)
	for side in [-1, 1]:
		var arm := Node3D.new()
		arm.name = "LeftTentacle" if side < 0 else "RightTentacle"
		add_child(arm)
		arms.append(arm)
		for i in range(SEGMENTS):
			arm.add_child(SEGMENT.instantiate())
		var hand: Node3D = CLAW.instantiate()
		add_child(hand)
		hands.append(hand)
	_pose(0.0)


func can_use() -> bool:
	return not active and not review_dialogue.opened and not game.game_paused and not game.qcode_panel_open and not game.garden.opened and game.player.global_position.distance_to(LANDING) < 1.25


func set_status(status: String) -> void:
	var previous := task_status
	task_status = status
	if status == "completed" and previous != "completed" and game.nature_motion:
		_reset_magic()
		magic_pending = true
	if status != "completed":
		review_on_landing = false
		review_dialogue.close()
		if previous != status:
			_reset_magic()
	if status not in ["idle", "completed"]:
		idle_action = "rest"
		action_time = 0
		alone_time = 0
		idle_delay = idle_random.randf_range(20, 40)
		if not game.nature_motion:
			sleep_amount = 0
			_update_signal()
	var labels := {"working": "q.status.working", "thinking": "q.status.thinking", "approval": "q.status.approval", "completed": "q.status.completed", "failed": "q.status.failed"}
	status_label.text = "Q" + (" · " + tr(str(labels[status])) if labels.has(status) else "")


func refresh_locale() -> void:
	set_status(task_status)


func can_grab() -> bool:
	if active or game.game_paused or game.qcode_panel_open or game.garden.opened:
		return false
	var point: Vector3 = game.player.global_position
	# Only the open front approach is reachable; the ruins and cottage stay out of range.
	return absf(point.x - ORIGIN.x) < 1.65 and point.z > -3.65 and point.z < -.7 and absf(point.y) < .25

func can_remote_grab() -> bool:
	return not active and not remote_active and magic_time >= MAGIC_DURATION and not review_dialogue.opened and not game.game_paused and not game.qcode_panel_open and not game.garden.opened and game.player.global_position.distance_to(LANDING) > 4.0

func remote_grab(for_review: bool = false) -> bool:
	if not can_remote_grab():
		return false
	var query := PhysicsShapeQueryParameters3D.new()
	query.shape = game.player.get_child(0).shape
	query.transform = Transform3D(Basis.IDENTITY, LANDING + Vector3(0, .70, 0))
	query.collision_mask = 1
	query.exclude = [game.player.get_rid()]
	if not get_world_3d().direct_space_state.intersect_shape(query).is_empty():
		game._show_toast(tr("q.platform_blocked"), 3)
		return false
	remote_active = true
	_reset_magic()
	look_left = LOOK_TIME if game.nature_motion else .10
	review_on_landing = for_review
	review_dialogue.close()
	remote_time = 0.0
	game.player.velocity = Vector3.ZERO
	game.set_echo_active(false)
	game._show_toast(tr("q.recalling"), 2)
	return true


func grab() -> bool:
	if not can_grab():
		return false
	var query := PhysicsShapeQueryParameters3D.new()
	query.shape = game.player.get_child(0).shape
	query.transform = Transform3D(Basis.IDENTITY, LANDING + Vector3(0, .70, 0))
	query.collision_mask = 1
	query.exclude = [game.player.get_rid()]
	if not get_world_3d().direct_space_state.intersect_shape(query).is_empty():
		game._show_toast(tr("q.front_blocked"), 3)
		return false
	start = game.player.global_position
	time = 0
	released = false
	active = true
	look_left = LOOK_TIME if game.nature_motion else .10
	grab_tips.clear()
	grab_rotations.clear()
	for hand: Node3D in hands:
		grab_tips.append(hand.position)
		grab_rotations.append(hand.quaternion)
	_reset_magic()
	idle_action = "rest"
	action_time = 0
	alone_time = 0
	idle_delay = idle_random.randf_range(20, 40)
	greeting_cooldown = 35
	game.player.velocity = Vector3.ZERO
	game.hero.position.y = 0
	game.hero.rotation.z = 0
	game.set_echo_active(false)
	game.first_person_feedback.reset()
	game._tone(520, .16, .12)
	return true


func advance(delta: float) -> void:
	if game.qcode_panel_open:
		review_dialogue.close()
		magic_review_after = false
	if game.game_paused or game.qcode_panel_open or game.garden.opened:
		return
	if not game.nature_motion and (magic_time < MAGIC_DURATION or magic_pending):
		var show_review := magic_review_after
		_reset_magic()
		if show_review and task_status == "completed":
			review_dialogue.open()
			return
	var direction: Vector3 = game.player.global_position - head_pivot.global_position
	var watching := active or remote_active
	var target_yaw := atan2(direction.x, direction.z) if watching else 0.0
	var target_pitch := clampf(-atan2(direction.y + .9, Vector2(direction.x, direction.z).length()), -.35, .35) if watching else 0.0
	var blend := 1.0 - exp(-delta * 10)
	if magic_time >= MAGIC_DURATION:
		head_pivot.rotation.y = lerp_angle(head_pivot.rotation.y, target_yaw, blend) if game.nature_motion else target_yaw
		head_pivot.rotation.x = lerp_angle(head_pivot.rotation.x, target_pitch, blend) if game.nature_motion else target_pitch
		head_pivot.rotation.z = lerp_angle(head_pivot.rotation.z, 0, blend)
	if look_left > 0:
		look_left = maxf(0, look_left - delta)
		game.player.velocity = Vector3.ZERO
		return
	if remote_active:
		remote_time += delta
		game.player.velocity = Vector3.ZERO
		# Keep the claws aimed at the player's world position while the signal
		# crosses the neighboring maps. The segmented arms can span the loaded
		# bridge/region seam without teleporting the player.
		var tracking := clampf(remote_time / REMOTE_CALL_TIME, 0, 1)
		signal_pivot.scale = Vector3.ONE * (1.0 + sin(remote_time * 10.0) * .08 + tracking * .12)
		_pose(smoothstep(0, 1, tracking))
		if remote_time >= REMOTE_CALL_TIME:
			remote_active = false
			active = true
			remote_transport = true
			time = 0.0
			start = game.player.global_position
			released = false
			grab_tips.clear()
			grab_rotations.clear()
			for hand: Node3D in hands:
				grab_tips.append(hand.position)
				grab_rotations.append(hand.quaternion)
			game._tone(620, .20, .12)
		return
	if not active:
		if magic_pending and game.player.global_position.distance_to(LANDING) <= 4.0 and not review_dialogue.opened:
			_start_magic(true)
		if magic_time < MAGIC_DURATION:
			if not magic_preview and game.player.global_position.distance_to(LANDING) > 6.0:
				_reset_magic()
			else:
				_advance_magic(delta)
				return
		if game.nature_motion:
			idle_time += delta
			_advance_idle(delta)
		return
	sleep_amount = move_toward(sleep_amount, 0, delta / .35)
	_update_signal()
	time += delta
	# Remote recalls travel on a high, obstacle-free rail.  The player is
	# lifted above the island before the horizontal leg, then lowered only at
	# the central platform; local grabs keep their shorter presentation.
	var route_height := REMOTE_ROUTE_HEIGHT if remote_transport else 3.0
	var lift := start + Vector3.UP * route_height
	var above := LANDING + Vector3.UP * route_height
	var target := start
	if time > REACH_TIME and time <= REACH_TIME + LIFT_TIME:
		target = start.lerp(lift, smoothstep(0, 1, (time - REACH_TIME) / LIFT_TIME))
	elif time <= REACH_TIME + LIFT_TIME + CARRY_TIME and time > REACH_TIME + LIFT_TIME:
		target = lift.lerp(above, smoothstep(0, 1, (time - REACH_TIME - LIFT_TIME) / CARRY_TIME))
	elif time > REACH_TIME + LIFT_TIME + CARRY_TIME:
		target = above.lerp(LANDING, smoothstep(0, 1, (time - REACH_TIME - LIFT_TIME - CARRY_TIME) / LOWER_TIME))
	if not released:
		# Sweep the actual player capsule every frame; never carry through props or placed echoes.
		var hit: KinematicCollision3D = game.player.move_and_collide(target - game.player.global_position)
		if hit != null:
			if remote_transport:
				# A cross-region arm can be visually occluded by a building. The
				# safe landing is the authoritative fallback once the route fails.
				game.player.global_position = LANDING
				game.player.velocity = Vector3.ZERO
				active = false
				remote_transport = false
				game.first_person_feedback.reset()
				_pose(0)
				game._show_toast(tr("q.path_blocked"), 3)
				_finish_review_recall()
				return
			released = true
			time = TRANSPORT_END
			game._show_toast(tr("q.place_blocked"), 3)
		game.player.velocity = Vector3.ZERO
	var reach := smoothstep(0, 1, time / REACH_TIME)
	if time >= TRANSPORT_END:
		released = true
		reach = 1.0 - smoothstep(0, 1, (time - TRANSPORT_END) / RELEASE_TIME)
	_pose(reach)
	if time >= TRANSPORT_END + RELEASE_TIME:
		active = false
		remote_transport = false
		game.player.velocity = Vector3.ZERO
		game.first_person_feedback.reset()
		_pose(0)
		grab_tips.clear()
		grab_rotations.clear()
		_finish_review_recall()


func _finish_review_recall() -> void:
	if review_on_landing and task_status == "completed":
		if game.nature_motion:
			_start_magic(true)
		else:
			review_dialogue.open()
	review_on_landing = false


func _advance_idle(delta: float) -> void:
	var distance: float = game.player.global_position.distance_to(LANDING)
	var entered := not player_near and distance < 6
	if distance < 6:
		player_near = true
	elif distance > 8:
		player_near = false
	greeting_cooldown = maxf(0, greeting_cooldown - delta)
	var available := task_status in ["idle", "completed"]
	if not available:
		idle_action = "rest"
		alone_time = 0
	else:
		alone_time = 0.0 if player_near else alone_time + delta
		if entered and greeting_cooldown <= 0:
			idle_action = "greet"
			action_time = 0
			greeting_cooldown = 35
		elif idle_action == "sleep" and player_near:
			idle_action = "rest"
		if idle_action in ["tidy", "greet"]:
			action_time += delta
			if action_time >= 3.0:
				idle_action = "rest"
				idle_delay = idle_random.randf_range(20, 40)
		elif alone_time >= 60:
			idle_action = "sleep"
		elif idle_action == "rest":
			idle_delay -= delta
			if idle_delay <= 0:
				idle_action = "tidy"
				tidy_side = 1 - tidy_side
				action_time = 0
	sleep_amount = move_toward(sleep_amount, 1.0 if idle_action == "sleep" else 0.0, delta / .8)
	# Blend from the current hand pose so greetings, wakeups and task changes can interrupt.
	var blend := 1.0 - exp(-delta * 9)
	for index in range(2):
		var side := -1.0 if index == 0 else 1.0
		var tip := Vector3(side * 1.33, .65 + sin(idle_time * 1.4 + index) * .065, .75)
		var rotation := Quaternion(Vector3.UP, Vector3.DOWN)
		tip += Vector3(side * .12, -.45, -.1) * sleep_amount
		if idle_action == "greet" and index == 1:
			var weight := smoothstep(0, .4, action_time) * (1.0 - smoothstep(2.3, 3.0, action_time))
			var wave := sin(clampf((action_time - .4) / 1.8, 0, 1) * TAU * 2)
			tip = tip.lerp(Vector3(1.85 + wave * .16, 1.95, 1.25), weight)
			rotation = rotation.slerp(Quaternion(Vector3.FORWARD, -.25 + wave * .2), weight)
		elif idle_action == "tidy":
			var weight := smoothstep(0, .5, action_time) * (1.0 - smoothstep(2.25, 3.0, action_time))
			if index == tidy_side:
				var stroke := smoothstep(.65, 2.1, action_time)
				tip = tip.lerp(Vector3(-side * lerpf(.65, 1.02, stroke), lerpf(1.02, .78, stroke), 1.30), weight)
				rotation = rotation.slerp(Quaternion(Vector3.UP, Vector3(-side, 0, 0)), weight)
			else:
				tip = tip.lerp(Vector3(side * 1.40, .65, 1.40), weight)
		_set_arm(index, hands[index].position.lerp(tip, blend), hands[index].quaternion.slerp(rotation, blend))
	_update_signal()


func _advance_magic(delta: float) -> void:
	magic_time = minf(magic_time + delta, MAGIC_DURATION)
	var t := magic_time
	var cues := [Vector2(1.35, 880), Vector2(3.05, 660), Vector2(4.25, 1175), Vector2(6.35, 988)]
	if magic_trick == "cards":
		cues = [Vector2(.85, 740), Vector2(2.2, 880), Vector2(4.4, 988), Vector2(6.6, 1175)]
	elif magic_trick == "cups":
		cues = [Vector2(1.5, 660), Vector2(3.4, 740), Vector2(5.1, 440), Vector2(6.6, 1175)]
	for cue in cues:
		if t - delta < cue.x and t >= cue.x:
			game._tone(cue.y, .12, .035)
	match magic_trick:
		"cards": _advance_cards(delta)
		"cups": _advance_cups(delta)
		_: _advance_starlight(delta)
	sleep_amount = move_toward(sleep_amount, 0, delta / .35)
	_update_signal()
	if magic_time >= MAGIC_DURATION:
		var show_review := magic_review_after and task_status == "completed"
		_reset_magic()
		if show_review:
			review_dialogue.open()


func _advance_starlight(delta: float) -> void:
	var t := magic_time
	# One trick, with readable pauses: empty palms, pluck, toss, two knocks,
	# dove, catch, vanish, bow. Only this function owns the arms during the act.
	var left_rest := Vector3(-1.33, .65, .75)
	var right_rest := Vector3(1.33, .65, .75)
	var present := smoothstep(0, .7, t)
	var settle := smoothstep(7.8, 8.8, t)
	var left := left_rest.lerp(Vector3(-1.65, 1.30, 2.20), present)
	left = left.lerp(Vector3(-1.85, 1.65, 2.20), smoothstep(.8, 1.35, t))
	left = left.lerp(Vector3(-1.35, 1.50, 2.20), smoothstep(1.6, 2.15, t))
	left.y += sin(smoothstep(2.15, 2.65, t) * PI) * .32
	left = left.lerp(Vector3(-1.65, 1.22, 2.20), smoothstep(2.8, 3.2, t))
	left = left.lerp(Vector3(-1.55, 1.62, 2.20), smoothstep(5.3, 6.1, t))
	left = left.lerp(left_rest, settle)
	var right := right_rest.lerp(Vector3(1.20, .78, 1.50), present)
	var knock := 0.0
	for beat in [3.35, 3.85]:
		knock += sin(clampf((t - beat) / .25, 0, 1) * PI) * .075
	right.y += knock
	right = right.lerp(right_rest, settle)
	var rest_rotation := Quaternion(Vector3.UP, Vector3.DOWN)
	var palm_rotation := rest_rotation.slerp(Quaternion.IDENTITY, present * (1.0 - settle))
	var blend := 1.0 - exp(-delta * 14.0)
	_set_arm(0, hands[0].position.lerp(left, blend), hands[0].quaternion.slerp(palm_rotation, blend))
	_set_arm(1, hands[1].position.lerp(right, blend), hands[1].quaternion.slerp(palm_rotation, blend))
	# The hat is attached to the supporting hand while lifted, with a real
	# dark cavity. It returns to exactly the same place after every show.
	var held_hat: Vector3 = hands[1].position + Vector3(0, .57, 0)
	magic_hat.position = MAGIC_HAT_REST.lerp(held_hat, present * (1.0 - settle))
	magic_hat.rotation.z = sin(t * 30) * knock
	var rim := magic_hat.position + Vector3(0, .60, 0)
	var pluck := Vector3(-1.85, 2.30, 2.20)
	var throw_from := Vector3(-1.35, 2.15, 2.20)
	magic_star.visible = t >= 1.35 and t < 3.05
	if magic_star.visible:
		magic_star.position = pluck.lerp(throw_from, smoothstep(1.6, 2.15, t))
		if t >= 2.2:
			var toss := smoothstep(2.2, 3.05, t)
			magic_star.position = throw_from.lerp(rim + Vector3(0, -.25, 0), toss) + Vector3.UP * sin(toss * PI) * .85
		magic_star.rotation = Vector3(0, .2 + sin(t * 3) * .25, t * .9)
		magic_star.scale = Vector3.ONE * lerpf(1.2, 1.35, smoothstep(1.35, 1.55, t))
	magic_pigeon.visible = t >= 4.25 and t < 7.35
	var perch := Vector3(-1.55, 2.28, 2.20)
	if magic_pigeon.visible:
		var launch := smoothstep(4.25, 4.95, t)
		var flight := smoothstep(4.95, 6.35, t)
		var high := Vector3(1.50, 3.65, 1.55)
		magic_pigeon.position = (rim + Vector3(0, -.12, 0)).lerp(high, launch)
		if t >= 4.95:
			magic_pigeon.position = high.bezier_interpolate(Vector3(.4, 4.0, 2.0), Vector3(-1.8, 3.2, 2.1), perch, flight)
		magic_pigeon.rotation = Vector3(-.12 * sin(flight * PI), lerpf(-.8, .15, flight), .18 * sin(flight * TAU))
		magic_pigeon.scale = Vector3.ONE * lerpf(.65, 1.0, launch)
		var flap := sin((t - 4.25) * 19.0) * .65 * (1.0 - smoothstep(6.1, 6.5, t))
		for index in magic_wings.size():
			magic_wings[index].rotation.z = (-1.0 if index == 0 else 1.0) * (flap + smoothstep(6.1, 6.5, t) * -.5)
	# Small authored stars form brief, bounded bursts rather than a particle
	# emitter that can keep advancing while the world is paused.
	for index in magic_sparks.size():
		var spark := magic_sparks[index]
		var burst_time := t - 1.35
		var center := pluck
		if t >= 4.25:
			burst_time = t - 4.25
			center = rim + Vector3.UP * .3
		if t >= 7.35:
			burst_time = t - 7.35
			center = perch
		spark.visible = burst_time >= 0 and burst_time < .55
		if spark.visible:
			var fraction := burst_time / .55
			var angle := index * TAU / magic_sparks.size()
			spark.position = center + Vector3(cos(angle), sin(angle), sin(angle * 2) * .25) * (.08 + fraction * .62)
			spark.position.y -= fraction * fraction * .18
			spark.scale = Vector3.ONE * (.20 * (1.0 - fraction))
			spark.rotation.z = angle + fraction * 2
	var bow := smoothstep(7.55, 8.0, t) * (1.0 - smoothstep(8.15, 8.8, t))
	var curiosity := smoothstep(3.05, 3.4, t) * (1.0 - smoothstep(4.25, 4.6, t))
	head_pivot.rotation.x = lerpf(head_pivot.rotation.x, bow * .22, blend)
	head_pivot.rotation.y = lerp_angle(head_pivot.rotation.y, sin(smoothstep(4.25, 6.5, t) * PI) * -.14, blend)
	head_pivot.rotation.z = lerpf(head_pivot.rotation.z, curiosity * -.12, blend)


func _advance_cards(delta: float) -> void:
	var t := magic_time
	var blend := 1.0 - exp(-delta * 14.0)
	var left_rest := Vector3(-1.33, .65, .75)
	var right_rest := Vector3(1.33, .65, .75)
	var left := left_rest.lerp(Vector3(-1.55, 1.42, 1.95), smoothstep(0, .8, t))
	var right := right_rest.lerp(Vector3(1.55, 1.35, 1.90), smoothstep(0, .8, t))
	_set_arm(0, hands[0].position.lerp(left, blend), hands[0].quaternion.slerp(Quaternion.IDENTITY, blend))
	_set_arm(1, hands[1].position.lerp(right, blend), hands[1].quaternion.slerp(Quaternion.IDENTITY, blend))
	trick_tray.visible = true
	trick_tray.position = Vector3(0, .62, 1.55)
	for index in trick_cups.size():
		trick_cups[index].visible = false
	trick_ball.visible = false
	trick_lemon.visible = false
	for index in trick_cards.size():
		var card := trick_cards[index]
		card.visible = t >= .65 and t < 7.7
		if not card.visible:
			continue
		var progress := smoothstep(.65, 1.25, t)
		var from_pos := left + Vector3(0, .18, 0)
		var to_pos := right + Vector3(0, .18, 0)
		var phase := clampf((t - .75 - index * .38) / 2.6, 0, 1)
		var arc := from_pos.lerp(to_pos, phase) + Vector3.UP * sin(phase * PI) * (.35 + index * .025)
		card.position = arc
		card.rotation = Vector3(0, lerpf(-.45, .45, phase), sin(phase * PI) * .55)
		if t > 4.9:
			var finale := smoothstep(4.9, 6.3, t)
			card.position = arc.lerp(Vector3(0, 2.25, 1.85) + Vector3((index - 3) * .16, abs(index - 3) * .05, 0), finale)
			card.rotation.z = lerpf(card.rotation.z, (index - 3) * .12, finale)
		if t > 6.3:
			card.position = card.position.lerp(Vector3(0, .70, 1.70), smoothstep(6.3, 7.7, t))
			card.scale = Vector3.ONE * lerpf(1.0, .2, smoothstep(6.3, 7.7, t))
	var settle := smoothstep(7.3, 8.8, t)
	_set_arm(0, hands[0].position.lerp(left_rest, settle * blend), hands[0].quaternion.slerp(Quaternion(Vector3.UP, Vector3.DOWN), settle * blend))
	_set_arm(1, hands[1].position.lerp(right_rest, settle * blend), hands[1].quaternion.slerp(Quaternion(Vector3.UP, Vector3.DOWN), settle * blend))


func _advance_cups(delta: float) -> void:
	var t := magic_time
	var blend := 1.0 - exp(-delta * 14.0)
	var left_rest := Vector3(-1.33, .65, .75)
	var right_rest := Vector3(1.33, .65, .75)
	var left := left_rest.lerp(Vector3(-1.45, 1.25, 1.85), smoothstep(0, .8, t))
	var right := right_rest.lerp(Vector3(1.45, 1.15, 1.85), smoothstep(0, .8, t))
	_set_arm(0, hands[0].position.lerp(left, blend), hands[0].quaternion.slerp(Quaternion.IDENTITY, blend))
	_set_arm(1, hands[1].position.lerp(right, blend), hands[1].quaternion.slerp(Quaternion.IDENTITY, blend))
	trick_tray.visible = true
	trick_tray.position = Vector3(0, .62, 1.58)
	for index in trick_cups.size():
		var cup := trick_cups[index]
		cup.visible = true
		cup.position = Vector3(-.66 + index * .66, .08, 0)
		var swap := 1.0 if int(t / 1.4) % 2 == index % 2 else 0.0
		cup.position.x = lerpf(cup.position.x, .66 - index * .66, swap * smoothstep(1.4, 2.5, t))
		cup.rotation.x = PI if t < 2.7 else 0.0
	trick_ball.visible = t < 4.85
	trick_ball.position = Vector3(-.66 + fmod(maxf(t, 0.0), 2.0) * .66, .22, .04)
	if t > 4.85:
		trick_ball.visible = false
	trick_lemon.visible = t >= 5.7 and t < 7.8
	trick_lemon.position = Vector3(.66, .08, .02)
	var reveal := smoothstep(5.2, 6.0, t)
	if trick_lemon.visible:
		trick_lemon.scale = Vector3.ONE * lerpf(.15, 1.0, reveal)
	var settle := smoothstep(7.4, 8.8, t)
	_set_arm(0, hands[0].position.lerp(left_rest, settle * blend), hands[0].quaternion.slerp(Quaternion(Vector3.UP, Vector3.DOWN), settle * blend))
	_set_arm(1, hands[1].position.lerp(right_rest, settle * blend), hands[1].quaternion.slerp(Quaternion(Vector3.UP, Vector3.DOWN), settle * blend))


func _reset_magic() -> void:
	magic_time = MAGIC_DURATION
	magic_pending = false
	magic_preview = false
	magic_review_after = false
	if magic_hat != null:
		magic_hat.transform = Transform3D(Basis.IDENTITY, MAGIC_HAT_REST)
	if magic_star != null:
		magic_star.visible = false
	if magic_pigeon != null:
		magic_pigeon.transform = Transform3D.IDENTITY
		magic_pigeon.visible = false
	for wing in magic_wings:
		wing.rotation = Vector3.ZERO
	for spark in magic_sparks:
		spark.visible = false
	for card in trick_cards:
		card.visible = false
		card.scale = Vector3.ONE
	if trick_tray != null:
		trick_tray.visible = false
		trick_tray.transform = Transform3D.IDENTITY
		trick_ball.visible = false
		trick_lemon.visible = false
		for cup in trick_cups:
			cup.transform = Transform3D.IDENTITY


func _start_magic(for_review: bool, trick: String = "") -> void:
	_reset_magic()
	magic_trick = trick if not trick.is_empty() else MAGIC_TRICKS[magic_next]
	if trick.is_empty():
		magic_next = (magic_next + 1) % MAGIC_TRICKS.size()
	magic_time = 0.0
	magic_review_after = for_review
	idle_action = "rest"
	action_time = 0
	alone_time = 0
	idle_delay = idle_random.randf_range(20, 40)
	greeting_cooldown = 35


func preview_magic(trick: String = "starlight") -> bool:
	if trick not in MAGIC_TRICKS:
		return false
	if active or remote_active or review_dialogue.opened or game.game_paused or game.qcode_panel_open or game.garden.opened or not game.nature_motion or magic_time < MAGIC_DURATION:
		return false
	_start_magic(false, trick)
	magic_preview = true
	return true


func _update_signal() -> void:
	signal_pivot.scale.y = lerpf(1.0 + sin(idle_time * 1.8) * .045, .12 + sin(idle_time * .5) * .025, sleep_amount)
	for material: StandardMaterial3D in signal_materials:
		material.emission_energy_multiplier = lerpf(.5, .08, sleep_amount)


func _pose(reach: float) -> void:
	for index in range(2):
		var side := -1.0 if index == 0 else 1.0
		var rest := Vector3(side * 1.33, .65 + sin(idle_time * 1.4 + index) * .065, .75)
		if grab_tips.size() == 2 and time < TRANSPORT_END:
			rest = grab_tips[index]
		var wrist: Vector3 = to_local(game.player.global_position) + Vector3(side * .65, .90, 0)
		var tip := rest.lerp(wrist, reach)
		var rest_rotation := Quaternion(Vector3.UP, Vector3.DOWN)
		if grab_rotations.size() == 2 and time < TRANSPORT_END:
			rest_rotation = grab_rotations[index]
		var grip_rotation := Quaternion(Vector3.UP, Vector3(-side, 0, 0))
		_set_arm(index, tip, rest_rotation.slerp(grip_rotation, reach))


func _set_arm(index: int, tip: Vector3, rotation: Quaternion) -> void:
	var side := -1.0 if index == 0 else 1.0
	var shoulder := Vector3(side * .57, .98, -.08)
	# Route around the lower sides before bending toward the hand in front of the housing.
	var elbow := Vector3(side * 1.50, 1.02, 1.02)
	var p1 := Vector3(side * 1.50, .98, -.08)
	var p2 := elbow - Vector3(0, 0, .25)
	var p3 := elbow + Vector3(0, 0, .25)
	var p4 := tip - Basis(rotation).y * .35
	for i in range(SEGMENTS):
		var half := SEGMENTS / 2
		var a: Vector3
		var b: Vector3
		if i < half:
			a = shoulder.bezier_interpolate(p1, p2, elbow, float(i) / half)
			b = shoulder.bezier_interpolate(p1, p2, elbow, float(i + 1) / half)
		else:
			a = elbow.bezier_interpolate(p3, p4, tip, float(i - half) / half)
			b = elbow.bezier_interpolate(p3, p4, tip, float(i + 1 - half) / half)
		var piece: Node3D = arms[index].get_child(i)
		var orientation := Basis(Quaternion(Vector3.UP, (b - a).normalized()))
		piece.transform = Transform3D(orientation * Basis.from_scale(Vector3(1, a.distance_to(b), 1)), a)
	hands[index].transform = Transform3D(Basis(rotation), tip)
