extends Node3D
## Blender-authored computer, with articulated hoses driven by the game clock.
const COMPUTER = preload("res://assets/grabber_computer.glb")
const SEGMENT = preload("res://assets/grabber_segment.glb")
const CLAW = preload("res://assets/grabber_claw.glb")
const SIGNAL = preload("res://assets/grabber_signal.glb")
const ORIGIN := Vector3(1.2, 2.12, -6.8)
const LANDING := Vector3(1.2, 1.56, -4.85)
const SEGMENTS := 18
const REACH_TIME := .55
const LIFT_TIME := .85
const CARRY_TIME := 1.0
const LOWER_TIME := .65
const RELEASE_TIME := .50
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
	return not active and not review_dialogue.opened and not game.game_paused and not game.agent_isles_panel_open and not game.garden.opened and game.player.global_position.distance_to(LANDING) < 1.25


func set_status(status: String) -> void:
	task_status = status
	if status != "completed":
		review_on_landing = false
		review_dialogue.close()
	if status not in ["idle", "completed"]:
		idle_action = "rest"
		action_time = 0
		alone_time = 0
		idle_delay = idle_random.randf_range(20, 40)
		if not game.nature_motion:
			sleep_amount = 0
			_update_signal()
	var labels := {"working": "执行中", "thinking": "思考中", "approval": "等待确认", "completed": "本轮结束", "failed": "遇到问题"}
	status_label.text = "Qiuner" + (" · " + str(labels[status]) if labels.has(status) else "")


func can_grab() -> bool:
	if active or game.game_paused or game.agent_isles_panel_open or game.garden.opened:
		return false
	var point: Vector3 = game.player.global_position
	# Only the open front approach is reachable; the ruins and cottage stay out of range.
	return absf(point.x - ORIGIN.x) < 1.65 and point.z > -3.65 and point.z < -.7 and absf(point.y) < .25

func can_remote_grab() -> bool:
	return not active and not remote_active and not review_dialogue.opened and not game.game_paused and not game.agent_isles_panel_open and not game.garden.opened and game.player.global_position.distance_to(LANDING) > 4.0

func remote_grab(for_review: bool = false) -> bool:
	if not can_remote_grab():
		return false
	var query := PhysicsShapeQueryParameters3D.new()
	query.shape = game.player.get_child(0).shape
	query.transform = Transform3D(Basis.IDENTITY, LANDING + Vector3(0, .70, 0))
	query.collision_mask = 1
	query.exclude = [game.player.get_rid()]
	if not get_world_3d().direct_space_state.intersect_shape(query).is_empty():
		game._show_toast("中央平台被占用了，请先清出位置。", 3)
		return false
	remote_active = true
	look_left = LOOK_TIME if game.nature_motion else .10
	review_on_landing = for_review
	review_dialogue.close()
	remote_time = 0.0
	game.player.velocity = Vector3.ZERO
	game.set_echo_active(false)
	game._show_toast("Qiuner 正在发出召回信号…", 2)
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
		game._show_toast("台前放不下，请先收起木箱。", 3)
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
	if game.agent_isles_panel_open:
		review_dialogue.close()
	if game.game_paused or game.agent_isles_panel_open or game.garden.opened:
		return
	var direction: Vector3 = game.player.global_position - head_pivot.global_position
	var watching := active or remote_active
	var target_yaw := atan2(direction.x, direction.z) if watching else 0.0
	var target_pitch := clampf(-atan2(direction.y + .9, Vector2(direction.x, direction.z).length()), -.35, .35) if watching else 0.0
	var blend := 1.0 - exp(-delta * 10)
	head_pivot.rotation.y = lerp_angle(head_pivot.rotation.y, target_yaw, blend) if game.nature_motion else target_yaw
	head_pivot.rotation.x = lerp_angle(head_pivot.rotation.x, target_pitch, blend) if game.nature_motion else target_pitch
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
		if game.nature_motion:
			idle_time += delta
			_advance_idle(delta)
		return
	sleep_amount = move_toward(sleep_amount, 0, delta / .35)
	_update_signal()
	time += delta
	var lift := start + Vector3.UP * 3.0
	var above := LANDING + Vector3.UP * 1.6
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
				game._show_toast("路径被建筑挡住，已安全传送回中央平台。", 3)
				_finish_review_recall()
				return
			released = true
			time = TRANSPORT_END
			game._show_toast("前面有东西挡住了，先在这里放下。", 3)
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
