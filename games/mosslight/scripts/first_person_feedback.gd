extends Node3D
## Presentation only: measured travel drives gait, never input or wall pressure.
const STEP_DISTANCE := 1.7
const REST := Vector3(.38, -.30, -.64)
var eye_offset := 0.0
var fov_bonus := 0.0
var stride := 0.0
var step_distance := 0.0
var gait_weight := 0.0
var landing_dip := 0.0
var steps_played := 0
var footstep: AudioStreamPlayer
var step_sounds: Array[AudioStreamWAV] = []
var lantern_parts: Array[MeshInstance3D] = []


func _ready() -> void:
	scale = Vector3.ONE * .58
	# A compact matching Lumi sleeve, hand and lantern, clear of the crosshair.
	for part in [
		[Vector3(0, -.11, .06), Vector3(.09, .16, .11), Color("ef9a45")],
		[Vector3(0, -.015, .005), Vector3(.072, .052, .075), Color("287c80")],
		[Vector3(0, .025, -.02), Vector3(.065, .07, .065), Color("f3c48c")],
		[Vector3(.018, .29, -.025), Vector3(.065, .085, .065), Color("b9f4c8")],
	]:
		var mesh := SphereMesh.new()
		mesh.radius = 1
		mesh.height = 2
		mesh.radial_segments = 16
		mesh.rings = 8
		_add_part(mesh, part[0], part[1], part[2])
	for part in [
		[Vector3(.018, .06, -.025), .018, .42, Color("775137")],
		[Vector3(.018, .20, -.025), .080, .032, Color("cdab55")],
		[Vector3(.018, .38, -.025), .083, .032, Color("cdab55")],
		[Vector3(.018, .415, -.025), .024, .043, Color("cdab55")],
	]:
		var mesh := CylinderMesh.new()
		mesh.top_radius = part[1]
		mesh.bottom_radius = part[1]
		mesh.height = part[2]
		mesh.radial_segments = 16
		_add_part(mesh, part[0], Vector3.ONE, part[3])
	for x in [-.047, .083]:
		var mesh := CylinderMesh.new()
		mesh.top_radius = .006
		mesh.bottom_radius = .006
		mesh.height = .17
		mesh.radial_segments = 8
		_add_part(mesh, Vector3(x, .29, -.025), Vector3.ONE, Color("287c80"))
	for child in get_children():
		if child is MeshInstance3D and child.get_index() >= 3:
			lantern_parts.append(child)
	footstep = AudioStreamPlayer.new()
	add_child(footstep)
	# Cache four original soft boot sounds; movement does no audio synthesis.
	var rng := RandomNumberGenerator.new()
	rng.seed = 217
	for variant in range(4):
		var stream := AudioStreamWAV.new()
		stream.format = AudioStreamWAV.FORMAT_16_BITS
		stream.mix_rate = 22050
		var data := PackedByteArray()
		data.resize(6616)
		var noise := 0.0
		for i in range(3308):
			var t := float(i) / 22050
			noise = lerpf(noise, rng.randf_range(-1, 1), .25)
			var attack := minf(t / .005, 1)
			var thud := sin(TAU * (90 + variant * 7) * t) * exp(-t * 42)
			var scuff := noise * exp(-t * 28)
			data.encode_s16(i * 2, int((thud * .24 + scuff * .50) * attack * 32767))
		stream.data = data
		step_sounds.append(stream)
	reset()


func _add_part(mesh: PrimitiveMesh, origin: Vector3, size: Vector3, color: Color) -> void:
	var part := MeshInstance3D.new()
	part.mesh = mesh
	part.position = origin
	part.scale = size
	part.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	var material := StandardMaterial3D.new()
	material.albedo_color = color
	material.roughness = .7
	# Viewmodel overlay stays legible when the capsule is next to a wall.
	material.no_depth_test = true
	material.render_priority = 1
	part.material_override = material
	add_child(part)


func reset() -> void:
	eye_offset = 0
	fov_bonus = 0
	stride = 0
	step_distance = 0
	gait_weight = 0
	landing_dip = 0
	position = REST
	rotation = Vector3.ZERO
	if footstep != null:
		footstep.stop()


func advance(delta: float, travel: Vector3, grounded: bool, landing_speed: float, motion_enabled: bool) -> void:
	var distance := Vector2(travel.x, travel.z).length()
	var speed := distance / maxf(delta, .001)
	var walking := grounded and speed > .15
	if walking:
		stride += distance / STEP_DISTANCE
		step_distance += distance
		if step_distance >= STEP_DISTANCE:
			step_distance = fmod(step_distance, STEP_DISTANCE)
			_play_step(-10 if speed > 4.6 else -14)
	else:
		step_distance = 0
	landing_dip *= exp(-delta * 18)
	if grounded and landing_speed > 2:
		landing_dip = minf(landing_speed * .009, .075)
		_play_step(-8)
	if not motion_enabled:
		eye_offset = 0
		fov_bonus = 0
		gait_weight = 0
		landing_dip = 0
		position = REST
		rotation = Vector3.ZERO
		return
	gait_weight = lerpf(gait_weight, minf(speed / 4.2, 1.35) if walking else 0.0, 1 - exp(-delta * 12))
	eye_offset = sin(stride * TAU) * .020 * gait_weight - landing_dip
	var running := clampf((speed - 4.2) / 2.3, 0, 1) if grounded else 0.0
	fov_bonus = lerpf(fov_bonus, running * 3.0, 1 - exp(-delta * 8))
	position = REST + Vector3(sin(stride * PI) * .014, cos(stride * TAU) * .015, 0) * gait_weight
	position.y -= landing_dip * .5
	rotation.z = sin(stride * PI) * .035 * gait_weight


func _play_step(volume: float) -> void:
	footstep.stream = step_sounds[steps_played % step_sounds.size()]
	footstep.volume_db = volume
	steps_played += 1
	if DisplayServer.get_name() != "headless":
		footstep.play()
