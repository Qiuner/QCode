extends Node3D
## Summer courtyard adapted from xi4u, MIT (c) 2026 AC. See assets/xi4u-LICENSE.txt.

var time := 0.0
var fish: Array[MeshInstance3D] = []
var currents: Array[MeshInstance3D] = []
var chime: MeshInstance3D

static func creek_center(z: float) -> float:
	return .75 + 1.75 * exp(-pow((z + 4) / 1.7, 2)) - .25 * sin(z * .85)

static func creek_width(z: float) -> float:
	return 1.95 + .36 * sin(z * .5 + .8) - .79 * exp(-pow((z - 3.22) / 1.4, 2))

func allows_echo(point: Vector3) -> bool:
	var local := point - global_position
	var z := clampf(local.z / 1.8, -4.68, 4.12)
	var on_bank := absf(local.x / 1.8 - creek_center(z)) > creek_width(z) + .12
	var on_footbridge := absf(local.z - 5.796) < .5
	return absf(local.x) < 11.7 and absf(local.z) < 9.6 and (on_bank or on_footbridge or local.y > 1.1)

func _ready() -> void:
	for visual: MeshInstance3D in find_children("*", "MeshInstance3D"):
		# Explicitly enable baked COLOR_0; glTF's shared white material has no texture.
		for surface_index in range(visual.mesh.get_surface_count()):
			if visual.mesh.surface_get_format(surface_index) & Mesh.ARRAY_FORMAT_COLOR:
				if visual.name == "Water":
					var water_material := StandardMaterial3D.new()
					water_material.albedo_color = Color(.30, .64, .59, .72)
					water_material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
					water_material.roughness = .4
					visual.set_surface_override_material(surface_index, water_material)
				else:
					var material := ShaderMaterial.new()
					material.shader = preload("res://assets/streamside_vertex.gdshader")
					visual.set_surface_override_material(surface_index, material)
		var terrain := visual.name.begins_with("Terrain")
		var solid := visual.name.begins_with("Solid") or visual.name == "Connector"
		if terrain or solid or visual.name == "Roof" or visual.name == "GardenRoof":
			var body := StaticBody3D.new()
			body.collision_layer = 3 if terrain or solid else 2
			body.collision_mask = 0
			var shape := CollisionShape3D.new()
			shape.shape = visual.mesh.create_trimesh_shape()
			body.add_child(shape)
			visual.add_child(body)
		if visual.name == "SolidRamp":
			visual.visible = false
		if terrain or visual.name.begins_with("Water"):
			visual.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		if visual.name.begins_with("Fish"):
			fish.append(visual)
			visual.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		if visual.name == "Chime":
			chime = visual
	# Outer coast leaves only the east bridge approach open.
	for edge: Vector3 in [Vector3(-12.25, 0, 0), Vector3(12.25, 0, -4.3), Vector3(12.25, 0, 7.3),
			Vector3(0, 0, -10.1), Vector3(0, 0, 10.1)]:
		var size := Vector3(25, 4, .2)
		if edge.x < -12:
			size = Vector3(.2, 4, 22)
		elif edge.x > 12:
			size = Vector3(.2, 4, 11.6 if edge.z < 0 else 5.6)
		add_barrier(edge, size)
	# Follow the creek edge; the original footbridge remains the crossing point.
	for side in [-1, 1]:
		for i in range(60):
			var z := -10.1 + float(i) * 20.2 / 60
			if z > 4.7 and z < 6.65:
				continue
			var source_z := clampf(z / 1.8, -4.68, 4.12)
			var x: float = (creek_center(source_z) + side * (creek_width(source_z) - .08)) * 1.8
			add_barrier(Vector3(x, -.25, z), Vector3(.35, 2.1, .48))
	# Smooth support follows the old curved planks and adds gently sloped approaches.
	var vertices := PackedVector3Array()
	var center := creek_center(3.22) * 1.8
	for i in range(32):
		var x1 := -4.3 + i * 8.6 / 32
		var x2 := -4.3 + (i + 1) * 8.6 / 32
		var y1 := maxf(0, .46 * (1 - pow(absf(x1) / 4.3, 2)))
		var y2 := maxf(0, .46 * (1 - pow(absf(x2) / 4.3, 2)))
		var a := Vector3(center + x1, y1, 5.13)
		var b := Vector3(center + x2, y2, 5.13)
		var c := Vector3(center + x1, y1, 6.46)
		var d := Vector3(center + x2, y2, 6.46)
		vertices.append_array(PackedVector3Array([a, b, c, b, d, c]))
	var bridge := StaticBody3D.new()
	bridge.collision_layer = 3
	var shape := CollisionShape3D.new()
	var surface := ConcavePolygonShape3D.new()
	surface.set_faces(vertices)
	shape.shape = surface
	bridge.add_child(shape)
	add_child(bridge)
	for i in range(16):
		var current := MeshInstance3D.new()
		var ring := TorusMesh.new()
		ring.inner_radius = .19
		ring.outer_radius = .204
		ring.rings = 24
		ring.ring_segments = 4
		current.mesh = ring
		current.scale = Vector3(.6, 1, 1.8)
		var material := StandardMaterial3D.new()
		material.albedo_color = Color(.60, .77, .69, .22)
		material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
		current.material_override = material
		current.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		add_child(current)
		currents.append(current)
	advance(0, false)

func add_barrier(at: Vector3, size: Vector3) -> void:
	var body := StaticBody3D.new()
	body.name = "ShoreBoundary"
	body.position = at
	var shape := CollisionShape3D.new()
	var box := BoxShape3D.new()
	box.size = size
	shape.shape = box
	body.add_child(shape)
	add_child(body)

func advance(delta: float, motion_enabled: bool) -> void:
	if motion_enabled:
		time += delta
	for i in range(fish.size()):
		var phase := time * .17 + i * .88
		var z := sin(phase) * 3.4
		var x := creek_center(z) + sin(phase * 1.7 + i) * .55
		fish[i].position = Vector3(x * 1.8, .02, z * 1.8)
		fish[i].rotation.y = atan2(cos(phase * 1.7 + i) * .55, cos(phase) * 3.4)
	for i in range(currents.size()):
		var z := fposmod(time * .26 + i * 1.22, 18.5) - 9.25
		var source_z := clampf(z / 1.8, -4.68, 4.12)
		currents[i].position = Vector3(creek_center(source_z) * 1.8 + sin(i * 2.4) * .8, -.432, z)
	if chime != null:
		chime.rotation.z = sin(time * 1.65) * .025
