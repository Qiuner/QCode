extends Node3D
## A few wind-driven details, all advanced by the desert's existing ambient clock.

const DRIFT_SHADER = preload("res://assets/desert_drift.gdshader")
const CHIME = preload("res://assets/desert_chime.wav")
const CHIME_POSITION := Vector3(-4.25, 2.14, .40)
var time := 0.0
var gust := 0.0
var sand: Array[MeshInstance3D] = []
var glints: Array[MeshInstance3D] = []
var dragonflies: Array[Node3D] = []
var chime_tubes: Array[Node3D] = []
var chime_sail: Node3D
var chime_player: AudioStreamPlayer
var audio_paused := false
var grounded := false


func _ready() -> void:
	# Shapes are tiny native meshes, sharing materials and geometry where possible.
	var bronze := StandardMaterial3D.new()
	bronze.albedo_color = Color("ad8551")
	bronze.metallic = .45
	bronze.roughness = .55
	var cord := StandardMaterial3D.new()
	cord.albedo_color = Color("62533d")
	var thread := CylinderMesh.new()
	thread.top_radius = .009
	thread.bottom_radius = .009
	thread.height = .19
	thread.radial_segments = 6
	var ring := TorusMesh.new()
	ring.inner_radius = .135
	ring.outer_radius = .165
	ring.rings = 20
	ring.ring_segments = 6
	var crown := MeshInstance3D.new()
	crown.mesh = ring
	crown.material_override = bronze
	crown.position = CHIME_POSITION
	add_child(crown)
	for i in range(5):
		var angle := i * TAU / 5
		var hinge := Node3D.new()
		hinge.position = CHIME_POSITION + Vector3(cos(angle) * .14, 0, sin(angle) * .14)
		add_child(hinge)
		var string_mesh := MeshInstance3D.new()
		string_mesh.mesh = thread
		string_mesh.material_override = cord
		string_mesh.position.y = -.095
		hinge.add_child(string_mesh)
		var tube := MeshInstance3D.new()
		var cylinder := CylinderMesh.new()
		cylinder.top_radius = .026
		cylinder.bottom_radius = .026
		cylinder.height = .27 + i * .035
		cylinder.radial_segments = 10
		tube.mesh = cylinder
		tube.material_override = bronze
		tube.position.y = -.19 - cylinder.height * .5
		hinge.add_child(tube)
		chime_tubes.append(hinge)
	chime_sail = Node3D.new()
	chime_sail.position = CHIME_POSITION
	add_child(chime_sail)
	var sail := MeshInstance3D.new()
	var sail_mesh := BoxMesh.new()
	sail_mesh.size = Vector3(.12, .18, .014)
	sail.mesh = sail_mesh
	var cloth := StandardMaterial3D.new()
	cloth.albedo_color = Color("487876")
	sail.material_override = cloth
	sail.position.y = -.75
	chime_sail.add_child(sail)
	var sail_string := MeshInstance3D.new()
	sail_string.mesh = thread
	sail_string.material_override = cord
	sail_string.scale.y = 3.5
	sail_string.position.y = -.33
	chime_sail.add_child(sail_string)
	chime_player = AudioStreamPlayer.new()
	chime_player.stream = CHIME
	chime_player.volume_db = -80
	add_child(chime_player)

	var shimmer := StandardMaterial3D.new()
	shimmer.albedo_color = Color(.86, .94, .77, .25)
	shimmer.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	shimmer.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	var gleam := SphereMesh.new()
	gleam.radius = .09
	gleam.height = .009
	gleam.radial_segments = 12
	gleam.rings = 4
	for i in range(9):
		var glint := MeshInstance3D.new()
		glint.mesh = gleam
		glint.material_override = shimmer.duplicate()
		glint.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		var angle := i * 2.4
		var radius := .35 + (i % 4) * .44
		glint.position = Vector3(1 + cos(angle) * radius, .159, -1 + sin(angle) * radius * .65)
		add_child(glint)
		glints.append(glint)
	var insect := StandardMaterial3D.new()
	insect.albedo_color = Color("387c7c")
	var wing_material := StandardMaterial3D.new()
	wing_material.albedo_color = Color(.87, .91, .72, .55)
	wing_material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	wing_material.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	var body_mesh := SphereMesh.new()
	body_mesh.radius = .026
	body_mesh.height = .052
	body_mesh.radial_segments = 8
	body_mesh.rings = 4
	var wing_mesh := SphereMesh.new()
	wing_mesh.radius = .085
	wing_mesh.height = .008
	wing_mesh.radial_segments = 10
	wing_mesh.rings = 4
	for i in range(3):
		var fly := Node3D.new()
		add_child(fly)
		var body := MeshInstance3D.new()
		body.mesh = body_mesh
		body.material_override = insect
		body.scale.z = 3.4
		fly.add_child(body)
		for side in [-1, 1]:
			for z in [-.037, .037]:
				var hinge := Node3D.new()
				hinge.position.z = z
				fly.add_child(hinge)
				var wing := MeshInstance3D.new()
				wing.mesh = wing_mesh
				wing.material_override = wing_material
				wing.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
				wing.scale.z = .32
				wing.position.x = side * .074
				hinge.add_child(wing)
		dragonflies.append(fly)
	advance(0, true, Vector3.ZERO)
	call_deferred("place_sand")


func place_sand() -> void:
	await get_tree().physics_frame
	# Conform a handful of patches to the actual dunes once, with no per-frame rays.
	for center: Vector3 in [Vector3(-4.1, 0, 6.1), Vector3(6.7, 0, 5.4), Vector3(7, 0, -7.6), Vector3(-.1, 0, 8.7)]:
		var vertices := PackedVector3Array()
		var uvs := PackedVector2Array()
		var indices := PackedInt32Array()
		for row in range(5):
			for column in range(17):
				var uv := Vector2(column / 16.0, row / 4.0)
				var point := center + Vector3((uv.x - .5) * 4.6, 0, (uv.y - .5) * 1.3)
				var world := to_global(point)
				var hit := get_world_3d().direct_space_state.intersect_ray(PhysicsRayQueryParameters3D.create(
					Vector3(world.x, global_position.y + 5, world.z), Vector3(world.x, global_position.y - .4, world.z), 1))
				if not hit.is_empty():
					point.y = to_local(hit.position).y + .055
				vertices.append(point)
				uvs.append(uv)
		for row in range(4):
			for column in range(16):
				var n := row * 17 + column
				indices.append_array(PackedInt32Array([n, n + 17, n + 1, n + 1, n + 17, n + 18]))
		var arrays := []
		arrays.resize(Mesh.ARRAY_MAX)
		arrays[Mesh.ARRAY_VERTEX] = vertices
		arrays[Mesh.ARRAY_TEX_UV] = uvs
		arrays[Mesh.ARRAY_INDEX] = indices
		var mesh := ArrayMesh.new()
		mesh.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arrays)
		var drift := MeshInstance3D.new()
		drift.mesh = mesh
		drift.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		var material := ShaderMaterial.new()
		material.shader = DRIFT_SHADER
		material.set_shader_parameter("phase", sand.size() * 2.7)
		drift.material_override = material
		add_child(drift)
		sand.append(drift)
	grounded = true


func sound_gain(traveler: Vector3) -> float:
	# Use the traveler, not the camera: overview zoom cannot change the sound's distance.
	var distance := to_global(CHIME_POSITION).distance_to(traveler + Vector3.UP)
	return pow(clampf(1.0 - distance / 8.0, 0.0, 1.0), 2) * .32


func set_paused(paused: bool) -> void:
	audio_paused = paused
	chime_player.stream_paused = paused


func advance(delta: float, motion_enabled: bool, traveler: Vector3) -> void:
	var previous_gust := gust
	if motion_enabled:
		time += maxf(0, delta)
	gust = pow(maxf(0.0, sin(time * TAU / 18.0)), 4)
	var gain := sound_gain(traveler)
	chime_player.volume_db = linear_to_db(maxf(gain, .0001))
	if audio_paused or not motion_enabled or gain <= .0001:
		chime_player.stop()
	elif gust > .65 and previous_gust <= .65 and delta > 0:
		chime_player.play()
	for drift in sand:
		drift.visible = motion_enabled
		var material := drift.material_override as ShaderMaterial
		material.set_shader_parameter("wind_time", time)
		material.set_shader_parameter("strength", gust)
	for i in range(glints.size()):
		var glint := glints[i]
		glint.visible = motion_enabled
		var glimmer := pow(maxf(0, sin(time * 1.15 + i * 2.1)), 5)
		(glint.material_override as StandardMaterial3D).albedo_color.a = glimmer * .30
		glint.scale = Vector3(1.0 + glimmer * 1.9, 1, .25)
	for i in range(dragonflies.size()):
		var fly := dragonflies[i]
		var step := fposmod(time / 3.2 + i * 1.31, 4.0)
		var angle := (floorf(step) + smoothstep(.52, 1.0, fposmod(step, 1.0))) * PI * .5
		var radius := .72 + i * .41
		fly.position = Vector3(1 + cos(angle) * radius, .63 + i * .14 + sin(time * 2.1 + i) * .045, -1 + sin(angle) * radius * .68)
		fly.rotation.y = -angle
		for wing_index in range(4):
			var wing := fly.get_child(wing_index + 1) as Node3D
			wing.rotation.z = sin(time * 32 + i) * .34 * (-1 if wing_index < 2 else 1)
	for i in range(chime_tubes.size()):
		chime_tubes[i].rotation.z = sin(time * 3.8 + i * .8) * (.018 + gust * .12)
		chime_tubes[i].rotation.x = sin(time * 2.7 + i) * gust * .065
	chime_sail.rotation.z = sin(time * 2.4) * (.025 + gust * .22)
