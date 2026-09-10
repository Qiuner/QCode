extends Node3D
## Slow ambient motion, advanced by the island so pause freezes the whole world.
## Static dressing stays in Blender; only these few moving props need scene nodes.

const RABBIT = preload("res://assets/rabbit.glb")
const DUCK = preload("res://assets/duck.glb")
var time := 0.0
var rabbit: Node3D
var duck: Node3D
var smoke: Array[MeshInstance3D] = []
var ripples: Array[MeshInstance3D] = []
var butterflies: Array[Node3D] = []


func _ready() -> void:
	rabbit = RABBIT.instantiate() as Node3D
	rabbit.position = Vector3(-6.2, .08, 1.5)
	add_child(rabbit)
	duck = DUCK.instantiate() as Node3D
	duck.position = Vector3(6.9, .20, -.1)
	add_child(duck)
	var puff_mesh := SphereMesh.new()
	puff_mesh.radius = .25
	puff_mesh.height = .42
	puff_mesh.radial_segments = 12
	puff_mesh.rings = 6
	for i in range(6):
		var puff := MeshInstance3D.new()
		puff.mesh = puff_mesh
		var material := StandardMaterial3D.new()
		material.albedo_color = Color(.86, .87, .79, .0)
		material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
		material.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
		puff.material_override = material
		puff.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		add_child(puff)
		smoke.append(puff)
	for i in range(3):
		var ripple := MeshInstance3D.new()
		var mesh := TorusMesh.new()
		mesh.inner_radius = .40
		mesh.outer_radius = .42
		mesh.rings = 40
		mesh.ring_segments = 6
		ripple.mesh = mesh
		var material := StandardMaterial3D.new()
		material.albedo_color = Color(.61, .86, .72, .4)
		material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
		material.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
		ripple.material_override = material
		ripple.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		ripple.position = Vector3(6.9, .195, -.1)
		add_child(ripple)
		ripples.append(ripple)
	for origin: Vector3 in [Vector3(-5.1, .9, -.2), Vector3(-4.5, .65, 5.5), Vector3(8.4, .8, 2.7)]:
		var butterfly := Node3D.new()
		butterfly.position = origin
		butterfly.set_meta("origin", origin)
		add_child(butterfly)
		for side in [-1, 1]:
			var hinge := Node3D.new()
			butterfly.add_child(hinge)
			var wing := MeshInstance3D.new()
			var mesh := SphereMesh.new()
			mesh.radius = .11
			mesh.height = .035
			mesh.radial_segments = 10
			mesh.rings = 4
			wing.mesh = mesh
			wing.position.x = side * .095
			wing.scale.z = .65
			var material := StandardMaterial3D.new()
			material.albedo_color = Color("edc975")
			wing.material_override = material
			wing.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
			hinge.add_child(wing)
		butterflies.append(butterfly)
	advance(0, Vector3.ZERO, true)


func advance(delta: float, traveler: Vector3, motion_enabled: bool) -> void:
	for puff: MeshInstance3D in smoke:
		puff.visible = motion_enabled
	if not motion_enabled:
		return
	time += delta
	# Each puff drifts for six seconds; its opacity avoids popping at the loop seam.
	for i in range(smoke.size()):
		var progress := fposmod(time / 6.0 + float(i) / 6.0, 1.0)
		var puff := smoke[i]
		puff.position = Vector3(-8.45 + progress * .70, 4.05 + progress * 1.65, -3.5 + sin(progress * PI) * .15)
		puff.scale = Vector3.ONE * (.55 + progress * 1.1)
		(puff.material_override as StandardMaterial3D).albedo_color.a = sin(progress * PI) * .24
	duck.position = Vector3(6.9 + sin(time * TAU / 18.0) * .66, .205 + sin(time * 1.7) * .018, -.1 + cos(time * TAU / 18.0) * .45)
	duck.rotation.y = atan2(cos(time * TAU / 18.0) * .66, -sin(time * TAU / 18.0) * .45)
	for i in range(ripples.size()):
		var progress := fposmod(time / 4.5 + float(i) / 3, 1.0)
		ripples[i].scale = Vector3(1 + progress * 3.4, 1, .72 + progress * 2.45)
		(ripples[i].material_override as StandardMaterial3D).albedo_color.a = sin(progress * PI) * .30
	var phase := fposmod(time, 7.0)
	rabbit.position.y = .08 + (sin(phase / .65 * PI) * .16 if phase < .65 else 0.0)
	var nearby := traveler.distance_to(rabbit.position) < 2.6
	var direction := traveler - rabbit.position if nearby else Vector3(sin(time * .18), 0, 1)
	rabbit.rotation.y = lerp_angle(rabbit.rotation.y, atan2(direction.x, direction.z), 1 - exp(-delta * 3))
	for i in range(butterflies.size()):
		var butterfly := butterflies[i]
		var origin: Vector3 = butterfly.get_meta("origin")
		butterfly.position = origin + Vector3(sin(time * .45 + i) * .38, sin(time * 1.2 + i) * .12, cos(time * .5 + i) * .25)
		butterfly.rotation.y = time * .4 + i
		butterfly.get_child(0).rotation.z = .15 + sin(time * 12) * .60
		butterfly.get_child(1).rotation.z = -.15 - sin(time * 12) * .60
