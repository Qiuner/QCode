extends SceneTree
## Exercise the real desert collision at its production world offset.
var failures := 0

func _initialize() -> void:
	call_deferred("run")

func check(condition: bool, label: String) -> void:
	print("PASS: " if condition else "FAIL: ", label)
	if not condition:
		failures += 1

func run() -> void:
	var desert = load("res://scenes/desert.tscn").instantiate()
	desert.position = Vector3(30, 0, 0)
	root.add_child(desert)
	for i in range(4):
		await physics_frame
	var wildlife = desert.wildlife
	check(wildlife.grounded and wildlife.visible and wildlife.animals.size() == 5, "five animals settle on the translated desert")
	check(wildlife.find_children("*", "CollisionObject3D", true, false).is_empty(), "wildlife never blocks players or cameras")
	var starts: Array[Vector3] = []
	var distances: Array[float] = []
	var nodes_loaded := true
	var safe_routes := true
	for animal in wildlife.animals:
		starts.append(animal.node.position)
		distances.append(0.0)
		nodes_loaded = nodes_loaded and animal.head != null and animal.tail != null
		for foot in animal.feet:
			nodes_loaded = nodes_loaded and foot != null
		for step in range(41):
			var point: Vector3 = animal.a.lerp(animal.b, step / 40.0)
			var hit: Dictionary = wildlife.ground_at(point)
			if hit.is_empty() or hit.normal.y <= .80:
				safe_routes = false
				print("UNSAFE HABITAT ", animal.kind, " ", point)
	check(nodes_loaded, "all authored heads, tails and feet are loaded")
	check(safe_routes, "every habitat stays on walkable sand")
	if not nodes_loaded:
		quit(1)
		return
	var grounded := true
	var contained := true
	for frame in range(90 * 60):
		desert.advance(1.0 / 60, true, Vector3.ZERO)
		for i in range(wildlife.animals.size()):
			var animal: Dictionary = wildlife.animals[i]
			var point: Vector3 = animal.node.position
			distances[i] = maxf(distances[i], starts[i].distance_to(point))
			var floor_hit: Dictionary = wildlife.ground_at(point)
			grounded = grounded and not floor_hit.is_empty() and absf(point.y - wildlife.to_local(floor_hit.position).y - .025) < .01
			var lane: Vector3 = animal.b - animal.a
			var along := Vector2(point.x - animal.a.x, point.z - animal.a.z).dot(Vector2(lane.x, lane.z)) / lane.length_squared()
			contained = contained and along >= -.001 and along <= 1.001
	for i in range(distances.size()):
		check(distances[i] > 1.1, "%s %d travels its habitat (%.2fm)" % [wildlife.animals[i].kind, i, distances[i]])
	check(grounded and contained, "90 seconds of motion stays grounded and inside safe habitats")
	var poses: Array[Transform3D] = []
	for node: Node3D in wildlife.find_children("*", "Node3D", true, false):
		poses.append(node.transform)
	var before: float = wildlife.time
	for i in range(120):
		desert.advance(1.0 / 60, false, wildlife.animals[0].node.global_position)
	var frozen: bool = wildlife.time == before
	var index := 0
	for node: Node3D in wildlife.find_children("*", "Node3D", true, false):
		frozen = frozen and node.transform == poses[index]
		index += 1
	check(frozen, "reduced motion freezes every animal and ignores new approaches")
	var fox: Dictionary = wildlife.animals[0]
	fox.progress = .5
	fox.node.position = fox.a.lerp(fox.b, .5)
	fox.node.position.y = wildlife.to_local(wildlife.ground_at(fox.node.position).position).y + .025
	fox.wait = 10.0
	fox.startled = false
	var traveler: Vector3 = fox.node.global_position - Vector3(.9, 0, 0)
	var before_distance: float = fox.node.global_position.distance_to(traveler)
	for i in range(30):
		desert.advance(1.0 / 60, true, traveler)
	check(fox.startled and fox.node.global_position.distance_to(traveler) > before_distance + .25, "approaching player triggers a continuous retreat away from the player")
	var after: Vector3 = fox.node.position
	desert.advance(0, true, traveler)
	check(fox.node.position == after, "zero-time update cannot move or restart an animal")
	# Place a real obstacle in the route, as an echo crate could be placed by a player.
	var blocker := StaticBody3D.new()
	blocker.collision_layer = 1
	var shape := CollisionShape3D.new()
	var box := BoxShape3D.new()
	box.size = Vector3(.4, 1, .8)
	shape.shape = box
	blocker.add_child(shape)
	desert.add_child(blocker)
	blocker.position = fox.a.lerp(fox.b, .75) + Vector3.UP * .5
	await physics_frame
	fox.progress = .1
	fox.node.position = fox.a.lerp(fox.b, .1)
	fox.node.position.y = wildlife.to_local(wildlife.ground_at(fox.node.position).position).y + .025
	fox.direction = 1.0
	fox.wait = 0.0
	fox.alert = 0.0
	var furthest := 0.0
	for frame in range(10 * 60):
		desert.advance(1.0 / 60, true, Vector3.ZERO)
		furthest = maxf(furthest, fox.progress)
	check(furthest < .5 and furthest > .2, "a new solid obstacle causes retreat without clipping through or climbing it")
	print("MOSSLIGHT_DESERT_WILDLIFE_TESTS_COMPLETE failures=", failures)
	desert.queue_free()
	await process_frame
	quit(1 if failures else 0)
