extends Node3D
## Small, bounded habitats. The island owns the clock, so no autonomous timers run.

const FENNEC = preload("res://assets/desert_fennec.glb")
const JERBOA = preload("res://assets/desert_jerboa.glb")
const LIZARD = preload("res://assets/desert_lizard.glb")
var animals: Array[Dictionary] = []
var time := 0.0
var grounded := false


func _ready() -> void:
	# Routes stay on open sand, away from the shore, inn, bridge and cacti.
	for habitat in [
		["fennec", FENNEC, Vector3(-.8, 0, 3.7), Vector3(2.3, 0, 3.8), .48, 5.5],
		["jerboa", JERBOA, Vector3(-6.7, 0, 4.5), Vector3(-4.2, 0, 5.0), .75, 3.2],
		["jerboa", JERBOA, Vector3(-3.5, 0, 5.6), Vector3(-1.5, 0, 5.2), .68, 6.1],
		["lizard", LIZARD, Vector3(6.1, 0, 2.0), Vector3(7.7, 0, 4.3), .92, 4.2],
		["lizard", LIZARD, Vector3(6.4, 0, -1.6), Vector3(8.7, 0, -.8), .84, 7.3],
	]:
		var animal := Node3D.new()
		animal.name = "DesertAnimal%d" % animals.size()
		animal.position = habitat[2]
		add_child(animal)
		var model := (habitat[1] as PackedScene).instantiate() as Node3D
		animal.add_child(model)
		var feet: Array[Node3D] = []
		for i in range(4):
			feet.append(model.find_child("Foot%d*" % i, true, false))
		animals.append({"kind": habitat[0], "node": animal, "model": model,
			"a": habitat[2], "b": habitat[3], "speed": habitat[4], "rest": habitat[5],
			"progress": 0.0, "direction": 1.0, "wait": float(animals.size()) * 1.7 + 1.0,
			"startled": false, "alert": 0.0, "stride": 0.0, "feet": feet,
			"head": model.find_child("Head*", true, false), "tail": model.find_child("Tail*", true, false),
			"left_ear": model.find_child("EarLeft*", true, false),
			"right_ear": model.find_child("EarRight*", true, false)})
		var heading: Vector3 = habitat[3] - habitat[2]
		animal.rotation.y = atan2(heading.x, heading.z)
	# Physics bodies of the desert are not registered until the next physics frame.
	visible = false
	call_deferred("settle_on_sand")


func settle_on_sand() -> void:
	await get_tree().physics_frame
	for animal in animals:
		var node: Node3D = animal.node
		var ground := ground_at(node.position)
		if not ground.is_empty():
			node.position.y = to_local(ground.position).y + .025
	grounded = true
	visible = true


func ground_at(point: Vector3) -> Dictionary:
	# Ground mask excludes decorative plants and the player's character body.
	var origin := to_global(point)
	return get_world_3d().direct_space_state.intersect_ray(PhysicsRayQueryParameters3D.create(
		Vector3(origin.x, global_position.y + 5, origin.z),
		Vector3(origin.x, global_position.y - .4, origin.z), 1))


func advance(delta: float, traveler: Vector3, motion_enabled: bool) -> void:
	if not grounded or not motion_enabled or delta <= 0:
		return
	time += delta
	var local_traveler := to_local(traveler)
	for i in range(animals.size()):
		var animal := animals[i]
		var node: Node3D = animal.node
		var model: Node3D = animal.model
		var a: Vector3 = animal.a
		var b: Vector3 = animal.b
		var lane := b - a
		var distance := node.position.distance_to(local_traveler)
		# One retreat per approach, with hysteresis: standing nearby cannot retrigger it.
		if distance > 3.4:
			animal.startled = false
		if distance < 1.9 and not animal.startled:
			animal.startled = true
			animal.alert = 2.0
			animal.wait = 0.0
			animal.direction = 1.0 if lane.dot(node.position - local_traveler) >= 0 else -1.0
		animal.alert = maxf(0.0, animal.alert - delta)
		animal.wait = maxf(0.0, animal.wait - delta)
		var moving: bool = animal.wait <= 0
		var speed: float = animal.speed * (2.0 if animal.alert > 0 else 1.0)
		if moving:
			var progress := clampf(animal.progress + animal.direction * speed * delta / lane.length(), 0, 1)
			var candidate := a.lerp(b, progress)
			var ground := ground_at(candidate)
			if not ground.is_empty() and ground.normal.y > .80:
				candidate.y = to_local(ground.position).y + .025
				# Reject obstacles / placed crates instead of climbing or passing through them.
				var clearance := .75 if animal.kind == "fennec" else .45
				var barrier := get_world_3d().direct_space_state.intersect_ray(
					PhysicsRayQueryParameters3D.create(node.global_position + Vector3.UP * .18,
					to_global(candidate) + lane.normalized() * animal.direction * clearance + Vector3.UP * .18, 1))
				if barrier.is_empty() and absf(candidate.y - node.position.y) < .18:
					animal.stride += node.position.distance_to(candidate) * (12.0 if animal.kind == "jerboa" else 10.0)
					node.position = candidate
					animal.progress = progress
				else:
					moving = false
			else:
				moving = false
			if progress <= 0 or progress >= 1 or not moving:
				animal.direction *= -1.0
				animal.wait = animal.rest
				moving = false
		var blend := 1.0 - exp(-delta * 8.0)
		if moving:
			var direction: Vector3 = lane * animal.direction
			node.rotation.y = lerp_angle(node.rotation.y, atan2(direction.x, direction.z), blend)
		var stride: float = animal.stride
		var hop := maxf(0.0, sin(stride)) * .23 if moving and animal.kind == "jerboa" else 0.0
		model.position.y = lerpf(model.position.y, hop, blend)
		var gait := sin(stride) * (.32 if animal.kind == "fennec" else .20) if moving else 0.0
		for foot_index in range(4):
			var foot: Node3D = animal.feet[foot_index]
			var sign_value := 1.0 if foot_index == 0 or foot_index == 3 else -1.0
			if animal.kind == "jerboa":
				sign_value = 1.0
			foot.rotation.x = lerpf(foot.rotation.x, gait * sign_value, blend)
		var head: Node3D = animal.head
		var watching := distance < 3.4 and not moving
		var toward := node.to_local(to_global(local_traveler))
		var glance := clampf(atan2(toward.x, toward.z), -.55, .55) if watching else sin(time * .8 + i) * .12
		head.rotation.y = lerp_angle(head.rotation.y, glance, blend)
		# Sniff the ground between trips, then lift to watch a nearby visitor.
		head.rotation.x = lerpf(head.rotation.x, .16 * sin(time * 1.9 + i) if not moving and not watching else 0.0, blend)
		var tail: Node3D = animal.tail
		tail.rotation.y = sin(stride if moving else time * 1.2 + i) * (.16 if moving else .06)
		if animal.left_ear != null:
			var twitch := pow(maxf(0.0, sin(time * 1.7 + i * 2.3)), 12) * .16
			animal.left_ear.rotation.z = twitch
			animal.right_ear.rotation.z = -twitch * .65
