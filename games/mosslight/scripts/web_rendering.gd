extends RefCounted
## Share lighter diffuse lighting in Web without splitting rough and glossy surfaces.

static var material_variants: Dictionary = {}
static var shader_variants: Dictionary = {}


static func apply(root: Node) -> void:
	for visual: MeshInstance3D in root.find_children("*", "MeshInstance3D", true, false):
		if visual.material_override != null:
			visual.material_override = lightweight_variant(visual.material_override)
		elif visual.mesh != null:
			for surface in range(visual.mesh.get_surface_count()):
				var material := visual.get_active_material(surface)
				var variant := lightweight_variant(material)
				if variant != material:
					visual.set_surface_override_material(surface, variant)


static func lightweight_variant(material: Material) -> Material:
	if material == null:
		return material
	if material is StandardMaterial3D:
		var standard := material as StandardMaterial3D
		if standard.shading_mode != BaseMaterial3D.SHADING_MODE_PER_PIXEL \
				or standard.diffuse_mode != BaseMaterial3D.DIFFUSE_BURLEY:
			return material
	elif material is ShaderMaterial:
		var shader := (material as ShaderMaterial).shader
		if shader == null or shader.resource_path not in ["res://assets/streamside_vertex.gdshader", "res://assets/desert_sand.gdshader"]:
			return material
	else:
		return material
	if material_variants.has(material):
		return material_variants[material]
	var variant := material.duplicate() as Material
	if variant is StandardMaterial3D:
		(variant as StandardMaterial3D).diffuse_mode = BaseMaterial3D.DIFFUSE_LAMBERT
	else:
		var source := (material as ShaderMaterial).shader
		if not shader_variants.has(source):
			var shader := Shader.new()
			shader.code = "#define WEB_MATTE\n" + source.code
			shader_variants[source] = shader
		(variant as ShaderMaterial).shader = shader_variants[source]
	material_variants[material] = variant
	return variant
