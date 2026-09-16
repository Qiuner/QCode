extends SceneTree
## Validate the desert mood accents without requiring the rest of the island.
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
	var atmosphere = desert.atmosphere
	check(atmosphere.grounded and atmosphere.sand.size() == 4 and atmosphere.glints.size() == 9,
		"four wind drift patches and nine oasis glints settle on the sand")
	check(atmosphere.dragonflies.size() == 3 and atmosphere.chime_player.stream != null,
		"three dragonflies and the original chime stream load")
	var before: float = atmosphere.time
	desert.advance(1.0 / 60, true, Vector3(30, 0, 0))
	check(atmosphere.time > before and atmosphere.sand[0].visible and atmosphere.glints[0].visible,
		"wind, shimmer and flight advance with the shared environment clock")
	var pose: Transform3D = atmosphere.chime_sail.transform
	var frozen_at: float = atmosphere.time
	for i in range(30):
		desert.advance(1.0 / 60, false, Vector3(30, 0, 0))
	check(atmosphere.time == frozen_at and atmosphere.chime_sail.transform == pose
		and not atmosphere.sand[0].visible and not atmosphere.glints[0].visible,
		"reduced motion freezes or hides all atmospheric movement")
	atmosphere.set_paused(true)
	check(atmosphere.audio_paused and not atmosphere.chime_player.playing, "pause reaches the nearby chime audio")
	atmosphere.set_paused(false)
	check(atmosphere.find_children("*", "CollisionObject3D", true, false).is_empty(),
		"atmospheric accents do not add player or camera obstacles")
	var listener: Vector3 = atmosphere.to_global(atmosphere.CHIME_POSITION) - Vector3.UP
	check(atmosphere.sound_gain(listener) > .3 and atmosphere.sound_gain(listener + Vector3.RIGHT * 12) == 0,
		"chime is audible nearby and silent outside the camp")
	for i in range(240):
		desert.advance(1.0 / 60, true, listener)
	check(atmosphere.chime_player.playing, "a nearby gust starts the chime stream")
	atmosphere.set_paused(true)
	check(atmosphere.chime_player.stream_paused, "pause suspends a playing chime")
	atmosphere.set_paused(false)
	check(not atmosphere.chime_player.stream_paused and atmosphere.chime_player.playing,
		"resume continues the existing chime")
	desert.advance(1.0 / 60, true, listener + Vector3.RIGHT * 12)
	check(not atmosphere.chime_player.playing, "leaving the camp stops the chime")
	print("MOSSLIGHT_DESERT_ATMOSPHERE_TESTS_COMPLETE failures=", failures)
	atmosphere.chime_player.stream = null
	desert.queue_free()
	# Audio playback releases its mixer references asynchronously after detaching the stream.
	await create_timer(.15).timeout
	quit(1 if failures else 0)
