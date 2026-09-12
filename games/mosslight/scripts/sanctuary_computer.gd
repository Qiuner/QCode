extends Node3D
## Blender-authored computer, with articulated hoses driven by the game clock.
const COMPUTER = preload("res://assets/grabber_computer.glb")
const SEGMENT = preload("res://assets/grabber_segment.glb")
const CLAW = preload("res://assets/grabber_claw.glb")
const ORIGIN := Vector3(1.2, 2.12, -6.8)
const LANDING := Vector3(1.2, 1.56, -4.85)
const SEGMENTS := 18
const REACH_TIME := .55
const LIFT_TIME := .85
const CARRY_TIME := 1.0
const LOWER_TIME := .65
const RELEASE_TIME := .50
const TRANSPORT_END := REACH_TIME + LIFT_TIME + CARRY_TIME + LOWER_TIME

var active := false
var time := 0.0
var idle_time := 0.0
var start := Vector3.ZERO
var released := false
var arms: Array[Node3D] = []
var hands: Array[Node3D] = []
var housing: Node3D
var game: Node3D
var status_label: Label3D


func _ready() -> void:
	game = get_parent()
	position = ORIGIN
	housing = COMPUTER.instantiate()
	add_child(housing)
	status_label = Label3D.new()
	status_label.font = preload("res://assets/fonts/MosslightUI.ttf")
	status_label.font_size = 28
	status_label.pixel_size = .006
	status_label.position = Vector3(0, 3.15, 0)
	status_label.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	status_label.outline_size = 7
	add_child(status_label)
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
	return not active and not game.game_paused and not game.agent_isles_panel_open and not game.garden.opened and game.player.global_position.distance_to(LANDING) < 1.25


func set_status(status: String) -> void:
	var labels := {"working": "执行中", "thinking": "思考中", "approval": "等待确认", "completed": "本轮结束", "failed": "遇到问题"}
	status_label.text = "Qiuner" + (" · " + str(labels[status]) if labels.has(status) else "")


func can_grab() -> bool:
	if active or game.game_paused or game.agent_isles_panel_open or game.garden.opened:
		return false
	var point: Vector3 = game.player.global_position
	# Only the open front approach is reachable; the ruins and cottage stay out of range.
	return absf(point.x - ORIGIN.x) < 1.65 and point.z > -3.65 and point.z < -.7 and absf(point.y) < .25


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
	game.player.velocity = Vector3.ZERO
	game.hero.position.y = 0
	game.hero.rotation.z = 0
	game.set_echo_active(false)
	game.first_person_feedback.reset()
	game._tone(520, .16, .12)
	return true


func advance(delta: float) -> void:
	if not active:
		if game.nature_motion:
			idle_time += delta
		_pose(0)
		return
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
		game.player.velocity = Vector3.ZERO
		game.first_person_feedback.reset()
		_pose(0)


func _pose(reach: float) -> void:
	for index in range(2):
		var side := -1.0 if index == 0 else 1.0
		var shoulder := Vector3(side * .57, 1.35, -.08)
		var rest := Vector3(side * 1.33, .65 + sin(idle_time * 1.4 + index) * .065, .75)
		var wrist: Vector3 = to_local(game.player.global_position) + Vector3(side * .65, .90, 0)
		var tip := rest.lerp(wrist, reach)
		var p1 := shoulder + Vector3(side * 1.1, .30, .12)
		var p2 := tip + Vector3(side * .5, .55, -.30)
		for i in range(SEGMENTS):
			var a := shoulder.bezier_interpolate(p1, p2, tip, float(i) / SEGMENTS)
			var b := shoulder.bezier_interpolate(p1, p2, tip, float(i + 1) / SEGMENTS)
			var piece: Node3D = arms[index].get_child(i)
			var orientation := Basis(Quaternion(Vector3.UP, (b - a).normalized()))
			piece.transform = Transform3D(orientation * Basis.from_scale(Vector3(1, a.distance_to(b), 1)), a)
		var rest_rotation := Quaternion(Vector3.UP, Vector3.DOWN)
		var grip_rotation := Quaternion(Vector3.UP, Vector3(-side, 0, 0))
		hands[index].transform = Transform3D(Basis(rest_rotation.slerp(grip_rotation, reach)), tip)
