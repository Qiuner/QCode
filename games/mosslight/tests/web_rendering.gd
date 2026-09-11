extends SceneTree

const WEB_RENDERING = preload("res://scripts/web_rendering.gd")


func _initialize() -> void:
	var matte := StandardMaterial3D.new()
	matte.roughness = .85
	matte.albedo_color = Color("819e66")
	var variant: StandardMaterial3D = WEB_RENDERING.lightweight_variant(matte)
	assert(variant != matte and variant.diffuse_mode == BaseMaterial3D.DIFFUSE_LAMBERT)
	assert(matte.diffuse_mode == BaseMaterial3D.DIFFUSE_BURLEY)
	assert(variant.albedo_color == matte.albedo_color and variant.roughness == matte.roughness)
	assert(WEB_RENDERING.lightweight_variant(matte) == variant, "Repeated material references share one variant")
	for kind in ["water", "metal", "glow", "smooth", "clearcoat", "roughness_map"]:
		var special := matte.duplicate() as StandardMaterial3D
		match kind:
			"water": special.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
			"metal": special.metallic = .5
			"glow": special.emission_enabled = true
			"smooth": special.roughness = .2
			"clearcoat": special.clearcoat_enabled = true
			"roughness_map": special.set_texture(BaseMaterial3D.TEXTURE_ROUGHNESS, GradientTexture2D.new())
		var optimized: StandardMaterial3D = WEB_RENDERING.lightweight_variant(special)
		assert(optimized.diffuse_mode == BaseMaterial3D.DIFFUSE_LAMBERT)
		assert(optimized.specular_mode == special.specular_mode and optimized.metallic == special.metallic, kind + " keeps its highlights")
		assert(optimized.roughness == special.roughness and optimized.transparency == special.transparency)
		assert(optimized.emission_enabled == special.emission_enabled and optimized.clearcoat_enabled == special.clearcoat_enabled)
		assert(optimized.get_texture(BaseMaterial3D.TEXTURE_ROUGHNESS) == special.get_texture(BaseMaterial3D.TEXTURE_ROUGHNESS))
	var unshaded := matte.duplicate() as StandardMaterial3D
	unshaded.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	assert(WEB_RENDERING.lightweight_variant(unshaded) == unshaded, "Unlit effects stay unchanged")
	assert(WEB_RENDERING.lightweight_variant(variant) == variant, "Applying twice keeps the same material")
	var colored := ShaderMaterial.new()
	colored.shader = preload("res://assets/streamside_vertex.gdshader")
	var colored_variant: ShaderMaterial = WEB_RENDERING.lightweight_variant(colored)
	assert(colored_variant.shader != colored.shader and colored_variant.shader.code.begins_with("#define WEB_MATTE"))
	var root_node := Node3D.new()
	var mesh := MeshInstance3D.new()
	mesh.mesh = BoxMesh.new()
	mesh.mesh.material = matte
	root_node.add_child(mesh)
	WEB_RENDERING.apply(root_node)
	assert(mesh.get_active_material(0) == variant)
	root_node.free()
	print("MOSSLIGHT_WEB_RENDERING_TESTS_COMPLETE failures=0")
	quit()
