extends Node3D
## Local tile coordinates: art, terrain and obstacle collision move together.

var time := 0.0
var ripples: Array[MeshInstance3D] = []
var flags: Array[Node3D] = []

func _ready() -> void:
	for visual: MeshInstance3D in find_children("*", "MeshInstance3D"):
		var body := StaticBody3D.new()
		var terrain := visual.name.begins_with("Terrain")
		body.collision_layer = 3 if terrain or visual.name.begins_with("Walkable") or visual.name.begins_with("Obstacles") else 2
		if terrain:
			# Smooth shallow dunes receive prop shadows without self-shadow striping in WebGL.
			visual.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
			var sand_material := ShaderMaterial.new()
			sand_material.shader = preload("res://assets/desert_sand.gdshader")
			visual.material_override = sand_material
		body.collision_mask = 0
		var shape := CollisionShape3D.new()
		shape.shape = visual.mesh.create_trimesh_shape()
		body.add_child(shape)
		visual.add_child(body)
	# Leave the west approach open only where it meets the bridge.
	for edge: Vector3 in [Vector3(12.25, 0, 0), Vector3(-12.25, 0, -4.3), Vector3(-12.25, 0, 7.3),
			Vector3(0, 0, -10.1), Vector3(0, 0, 10.1)]:
		var body := StaticBody3D.new()
		body.name = "DesertCoastline"
		body.position = edge
		var shape := CollisionShape3D.new()
		var box := BoxShape3D.new()
		if edge.x > 12:
			box.size = Vector3(.2, 4, 22)
		elif edge.x < -12:
			box.size = Vector3(.2, 4, 11.6 if edge.z < 0 else 5.6)
		else:
			box.size = Vector3(25, 4, .2)
		shape.shape = box
		body.add_child(shape)
		add_child(body)
	# Only the water and a small pennant move; terrain and readable landmarks stay still.
	for i in range(3):
		var ripple := MeshInstance3D.new()
		var ring := TorusMesh.new()
		ring.inner_radius = .43
		ring.outer_radius = .45
		ring.rings = 48
		ring.ring_segments = 6
		ripple.mesh = ring
		ripple.position = Vector3(1, .158, -1)
		var material := StandardMaterial3D.new()
		material.albedo_color = Color(.35, .59, .51, .3)
		material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
		ripple.material_override = material
		ripple.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		add_child(ripple)
		ripples.append(ripple)
	for i in range(3):
		var hinge := Node3D.new()
		hinge.position = Vector3(-4.3, 2.85 - i * .38, .4)
		add_child(hinge)
		var pennant := MeshInstance3D.new()
		var triangle := ArrayMesh.new()
		var arrays := []
		arrays.resize(Mesh.ARRAY_MAX)
		arrays[Mesh.ARRAY_VERTEX] = PackedVector3Array([Vector3.ZERO, Vector3(.70, -.12, 0), Vector3(0, -.29, 0)])
		arrays[Mesh.ARRAY_NORMAL] = PackedVector3Array([Vector3.FORWARD, Vector3.FORWARD, Vector3.FORWARD])
		triangle.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arrays)
		pennant.mesh = triangle
		var material := StandardMaterial3D.new()
		material.albedo_color = Color("487876") if i % 2 == 0 else Color("ad664c")
		material.cull_mode = BaseMaterial3D.CULL_DISABLED
		pennant.material_override = material
		hinge.add_child(pennant)
		flags.append(hinge)
	advance(0, false)


func advance(delta: float, motion_enabled: bool) -> void:
	# Use the same clock as the island's existing ambient motion; pause never advances it.
	if motion_enabled:
		time += delta
	for i in range(ripples.size()):
		var progress := fposmod(time / 4.5 + float(i) / 3, 1.0)
		ripples[i].scale = Vector3(1 + progress * 4.2, 1, .72 + progress * 2.8)
		(ripples[i].material_override as StandardMaterial3D).albedo_color.a = sin(progress * PI) * .26
	for i in range(flags.size()):
		flags[i].rotation.y = sin(time * 1.2 + i * .6) * .16
