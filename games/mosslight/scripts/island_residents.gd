extends Node3D
## Original Blender residents; fixed homes keep the puzzle routes unobstructed.
const MODELS = [preload("res://assets/npc_gardener.glb"), preload("res://assets/npc_fisher.glb"), preload("res://assets/npc_keeper.glb")]
const FONT = preload("res://assets/fonts/MosslightUI.ttf")
const DIALOGUE_PORTRAITS := {
	"gardener": preload("res://assets/portraits/gardener.png"),
	"file_keeper": preload("res://assets/portraits/file_keeper.png"),
	"teacher": preload("res://assets/portraits/teacher.png"),
}
var residents: Array[StaticBody3D] = []
var time := 0.0
signal tutorial_motion(encounter_id: String, status: String)
var tutorial_id := ""
var tutorial_action := ""
var tutorial_tween: Tween
var tutorial_home := Vector3.ZERO
var tutorial_marker: MeshInstance3D


func guide_keeper(encounter_id: String, action: String, traveler: Vector3, reduced_motion: bool) -> void:
	if residents.size() < 2:
		return
	var keeper := residents[1]
	if action == "cancel":
		if tutorial_tween:
			tutorial_tween.kill()
		if not tutorial_id.is_empty():
			keeper.position = tutorial_home
		keeper.collision_layer = 1
		if is_instance_valid(tutorial_marker):
			tutorial_marker.queue_free()
		tutorial_marker = null
		tutorial_id = ""
		tutorial_action = ""
		tutorial_motion.emit(encounter_id, "cancelled")
		return
	if tutorial_id == encounter_id and tutorial_action == action:
		return
	if tutorial_id != encounter_id:
		guide_keeper(encounter_id, "cancel", traveler, reduced_motion)
		tutorial_home = keeper.position
	tutorial_id = encounter_id
	tutorial_action = action
	if tutorial_tween:
		tutorial_tween.kill()
	keeper.collision_layer = 0
	var target := tutorial_home if action == "home" else traveler + Vector3(1.6, 0, 1.2)
	target.y = tutorial_home.y
	if action == "home" and not is_instance_valid(tutorial_marker):
		tutorial_marker = MeshInstance3D.new()
		var mesh := CylinderMesh.new()
		mesh.top_radius = .85
		mesh.bottom_radius = .85
		mesh.height = .03
		tutorial_marker.mesh = mesh
		var material := StandardMaterial3D.new()
		material.albedo_color = Color("efce87")
		material.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
		tutorial_marker.material_override = material
		add_child(tutorial_marker)
		tutorial_marker.position = tutorial_home + Vector3(0, .08, 0)
	if reduced_motion:
		keeper.position = target
		keeper.collision_layer = 1 if action == "home" else 0
		tutorial_motion.emit(encounter_id, "home" if action == "home" else "arrived")
		return
	if action == "arrive":
		keeper.position = target + Vector3(0, 2.2, 0)
	tutorial_tween = create_tween()
	# A one-time explanatory flight; interruption always restores the original resident.
	if action == "home":
		tutorial_tween.tween_property(keeper, "position", keeper.position + Vector3(0, 2.2, 0), .25).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
		tutorial_tween.tween_property(keeper, "position", target + Vector3(0, 2.2, 0), 1.2).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_IN_OUT)
	tutorial_tween.tween_property(keeper, "position", target, .5).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
	tutorial_tween.tween_callback(func():
		keeper.collision_layer = 1 if action == "home" else 0
		tutorial_motion.emit(encounter_id, "home" if action == "home" else "arrived"))


func _ready() -> void:
	var name_keys := ["resident.gardener.name", "resident.file_keeper.name", "resident.teacher.name"]
	var agent_isles_ids := ["gardener", "file_keeper", "teacher"]
	var homes := [Vector3(-7.2, .06, 1.3), Vector3(6.6, .06, 2.9), Vector3(-4.25, .06, -4.5)]
	for i in range(3):
		var body := StaticBody3D.new()
		body.name = ["Gardener", "Fisher", "Keeper"][i]
		body.position = homes[i]
		body.collision_layer = 1
		body.collision_mask = 0
		body.set_meta("resident_id", i)
		body.set_meta("agent_isles_id", agent_isles_ids[i])
		body.set_meta("display_name_key", name_keys[i])
		body.set_meta("display_name", tr(name_keys[i]))
		body.set_meta("agent_status", "idle")
		body.set_meta("home_yaw", [.6, PI, .6][i])
		body.set_meta("line_index", 0)
		body.set_meta("dialogue_phase", "")
		add_child(body)
		var collision := CollisionShape3D.new()
		var capsule := CapsuleShape3D.new()
		capsule.height = 1.9
		capsule.radius = .34
		collision.shape = capsule
		collision.position.y = .95
		body.add_child(collision)
		var visual := MODELS[i].instantiate() as Node3D
		visual.rotation.y = body.get_meta("home_yaw")
		body.add_child(visual)
		body.set_meta("visual", visual)
		var label := Label3D.new()
		label.text = tr(name_keys[i])
		label.font = FONT
		label.font_size = 28
		label.outline_size = 7
		label.pixel_size = .006
		label.modulate = Color("fff0cb")
		label.outline_modulate = Color("244b47")
		label.billboard = BaseMaterial3D.BILLBOARD_ENABLED
		label.position.y = 2.50
		label.visible = false
		body.add_child(label)
		body.set_meta("name_label", label)
		residents.append(body)


func set_agent_status(agent_isles_id: String, status: String) -> void:
	var labels := {"working": "resident.status.working", "thinking": "resident.status.thinking", "approval": "resident.status.approval", "completed": "resident.status.completed", "failed": "resident.status.failed"}
	for npc: StaticBody3D in residents:
		if npc.get_meta("agent_isles_id") != agent_isles_id:
			continue
		var label := npc.get_meta("name_label") as Label3D
		npc.set_meta("agent_status", status)
		var suffix: String = tr(labels[status]) if labels.has(status) else ""
		label.text = str(npc.get_meta("display_name")) if suffix.is_empty() else "%s · %s" % [npc.get_meta("display_name"), suffix]
		label.modulate = Color("efce87") if status == "approval" else (Color("ef9a8c") if status == "failed" else Color("fff0cb"))


func refresh_locale() -> void:
	for npc: StaticBody3D in residents:
		var display_name := tr(str(npc.get_meta("display_name_key")))
		npc.set_meta("display_name", display_name)
		set_agent_status(str(npc.get_meta("agent_isles_id")), str(npc.get_meta("agent_status")))


func advance(delta: float, traveler: Vector3, motion_enabled: bool, labels_enabled: bool) -> void:
	if motion_enabled:
		time += delta
	for npc: StaticBody3D in residents:
		var distance := traveler.distance_to(npc.position)
		(npc.get_meta("name_label") as Label3D).visible = labels_enabled and (distance < 4.5 or npc == residents[1] and tutorial_action == "home")
		if not motion_enabled:
			continue
		var visual := npc.get_meta("visual") as Node3D
		var direction := traveler - npc.position
		var target_yaw: float = atan2(direction.x, direction.z) if distance < 3 else npc.get_meta("home_yaw")
		visual.rotation.y = lerp_angle(visual.rotation.y, target_yaw, 1 - exp(-delta * 3))
		# Breathing changes height by less than one percent; boots stay grounded.
		visual.scale.y = 1.0 + sin(time * 1.7 + int(npc.get_meta("resident_id"))) * .006


func nearest(traveler: CharacterBody3D) -> StaticBody3D:
	var result: StaticBody3D
	var best := 2.35
	for npc: StaticBody3D in residents:
		var distance := traveler.position.distance_to(npc.position)
		if distance >= best or absf(traveler.position.y - npc.position.y) > .85:
			continue
		var query := PhysicsRayQueryParameters3D.create(traveler.position + Vector3(0, 1.15, 0), npc.position + Vector3(0, 1.15, 0))
		query.collision_mask = 1
		query.exclude = [traveler.get_rid(), npc.get_rid()]
		if not get_world_3d().direct_space_state.intersect_ray(query).is_empty():
			continue
		best = distance
		result = npc
	return result


func agent_isles_talk(npc: StaticBody3D, has_workspace: bool) -> Dictionary:
	var identities := {
		"gardener": ["resident.gardener.identity", "resident.gardener.handoff"],
		"file_keeper": ["resident.file_keeper.identity", "resident.file_keeper.handoff"],
		"teacher": ["resident.teacher.identity", "resident.teacher.handoff"],
	}
	var identity: Array = identities.get(str(npc.get_meta("agent_isles_id")), ["resident.default.identity", "resident.default.handoff"])
	return {
		"name": identity[0],
		"text": tr(identity[1]) + (tr("resident.handoff.continue") if has_workspace else tr("resident.handoff.choose_project")),
	}


func dialogue_name(npc: StaticBody3D) -> String:
	return str(npc.get_meta("display_name")).get_slice(" · ", 0)


func dialogue_role(npc: StaticBody3D) -> String:
	var roles := {
		"gardener": "role.gardener",
		"file_keeper": "role.file_keeper",
		"teacher": "role.teacher",
	}
	return tr(roles.get(str(npc.get_meta("agent_isles_id")), "role.gardener"))


func dialogue_portrait(npc: StaticBody3D) -> Texture2D:
	return DIALOGUE_PORTRAITS.get(str(npc.get_meta("agent_isles_id")))


func talk(npc: StaticBody3D, learned: bool) -> String:
	var lines := dialogue_lines(npc, learned)
	var phase := "learned" if learned else "new"
	if npc.get_meta("dialogue_phase") != phase:
		npc.set_meta("line_index", 0)
		npc.set_meta("dialogue_phase", phase)
	var index := int(npc.get_meta("line_index")) % lines.size()
	npc.set_meta("line_index", index + 1)
	return lines[index]


func dialogue_progress(npc: StaticBody3D, learned: bool) -> Vector2i:
	var lines := dialogue_lines(npc, learned)
	return Vector2i(int(npc.get_meta("line_index")), lines.size())


func dialogue_lines(npc: StaticBody3D, learned: bool) -> Array[String]:
	var lines: Array[String] = []
	match int(npc.get_meta("resident_id")):
		0:
			lines = [tr("dialogue.gardener.1"), tr("dialogue.gardener.2")]
			lines.append(tr("dialogue.gardener.learn") if not learned else tr("dialogue.gardener.learned"))
		1:
			lines = [tr("dialogue.keeper.1"), tr("dialogue.keeper.2"), tr("dialogue.keeper.3")]
		2:
			lines = [tr("dialogue.teacher.1"), tr("dialogue.teacher.2"), tr("dialogue.teacher.3")]
			if not learned:
				lines[1] = tr("dialogue.teacher.learn")
	return lines
