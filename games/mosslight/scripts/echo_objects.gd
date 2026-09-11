extends RefCounted
## Small procedural echo props share dimensions with their placement previews.

const ORDER := ["crate", "plank", "mushroom"]
const NAMES := {"crate": "木箱", "plank": "木板", "mushroom": "弹跳蘑菇"}
const SIZES := {"crate": Vector3(.96, .9, .96), "plank": Vector3(3.6, .18, 1.1), "mushroom": Vector3(1.3, .65, 1.3)}
const BOUNCE_SPEED := 10.8


static func preview_mesh(kind: String) -> PrimitiveMesh:
	if kind == "mushroom":
		var cylinder := CylinderMesh.new()
		cylinder.top_radius = .65
		cylinder.bottom_radius = .4
		cylinder.height = .65
		cylinder.radial_segments = 16
		return cylinder
	var box := BoxMesh.new()
	box.size = SIZES[kind]
	return box


static func create(kind: String, is_echo: bool) -> StaticBody3D:
	var body := StaticBody3D.new()
	body.name = "Echo" if is_echo else "EchoSource"
	body.collision_layer = 3
	body.collision_mask = 0
	body.set_meta("echo_kind", kind)
	if is_echo:
		body.set_meta("echo", true)
	else:
		body.add_to_group("echo_sources")
	var collision := CollisionShape3D.new()
	if kind == "mushroom":
		var shape := CylinderShape3D.new()
		shape.radius = .65
		shape.height = .65
		collision.shape = shape
		body.set_meta("bounce_speed", BOUNCE_SPEED)
		var stem := CylinderMesh.new()
		stem.height = 1
		part(body, stem, Vector3(0, -.10, 0), Vector3(.38, .40, .38), Color("e9d6a1"))
		var cap := SphereMesh.new()
		cap.radial_segments = 16
		cap.rings = 8
		part(body, cap, Vector3(0, .15, 0), Vector3(1.3, .35, 1.3), Color("ce7954"))
		for i in range(6):
			var angle := i * TAU / 6
			part(body, SphereMesh.new(), Vector3(cos(angle) * .38, .29, sin(angle) * .38), Vector3(.15, .03, .12), Color("fff0bf"))
	else:
		var shape := BoxShape3D.new()
		shape.size = SIZES[kind]
		collision.shape = shape
		for i in range(4):
			part(body, BoxMesh.new(), Vector3(0, 0, (i - 1.5) * .275), Vector3(3.6, .18, .26), Color("b99465") if i % 2 == 0 else Color("c7a578"))
		for x in [-1.35, 1.35]:
			part(body, BoxMesh.new(), Vector3(x, .094, 0), Vector3(.09, .008, 1.06), Color("6a8175"))
	body.add_child(collision)
	if is_echo:
		var ring := TorusMesh.new()
		ring.inner_radius = .46
		ring.outer_radius = .49
		part(body, ring, Vector3(0, -SIZES[kind].y / 2 + .025, 0), Vector3.ONE, Color("b2efd8"))
	else:
		var ring := TorusMesh.new()
		ring.inner_radius = .94
		ring.outer_radius = 1.0
		ring.rings = 64
		ring.ring_segments = 8
		var footprint := Vector3(2.4, .2, 1.0) if kind == "plank" else Vector3(.9, .2, .9)
		var marker := part(body, ring, Vector3(0, -SIZES[kind].y / 2 + .045, 0), footprint, Color("fff0b8"))
		marker.name = "LearningRing"
		marker.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		(marker.material_override as StandardMaterial3D).shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	return body


static func part(parent: Node3D, mesh: PrimitiveMesh, at: Vector3, size: Vector3, color: Color) -> MeshInstance3D:
	var visual := MeshInstance3D.new()
	visual.mesh = mesh
	visual.position = at
	visual.scale = size
	var material := StandardMaterial3D.new()
	material.albedo_color = color
	material.roughness = .85
	visual.material_override = material
	parent.add_child(visual)
	return visual
