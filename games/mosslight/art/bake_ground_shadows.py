"""Bake soft ground contact shadows from the editable island for WebGL.

Run with Blender --background --factory-startup --python art/bake_ground_shadows.py
after generate_assets.py. Reads mosslight.blend without modifying it. The exported
transparent ground layer adds one draw call and needs no screen-space effects.
"""
from array import array
from pathlib import Path
import bpy

ROOT = Path(__file__).resolve().parents[1]
bpy.ops.wm.open_mainfile(filepath=str(ROOT / 'art/mosslight.blend'))
scene = bpy.context.scene
for collection in bpy.data.collections:
    if collection.name.startswith(('LUMI', 'WILDLIFE')):
        collection.hide_render = True
# Also exclude the traveler by object name, independent of collection naming.
for obj in scene.objects:
    if obj.name.startswith(('Lumi /', 'Rabbit /', 'Duck /')):
        obj.hide_render = True

bpy.ops.object.select_all(action='DESELECT')
bpy.ops.mesh.primitive_plane_add(size=2, location=(0, 0, .067))
ground = bpy.context.object
ground.name = 'Baked ground contact shade'
ground.scale = (12.325, 10.325, 1)
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
material = bpy.data.materials.new('Ground contact shade • baked for WebGL')
material.use_nodes = True
ground.data.materials.append(material)
nodes = material.node_tree.nodes
links = material.node_tree.links
nodes.clear()
output = nodes.new('ShaderNodeOutputMaterial')
emission = nodes.new('ShaderNodeEmission')
occlusion = nodes.new('ShaderNodeAmbientOcclusion')
occlusion.inputs['Distance'].default_value = 1.1
occlusion.samples = 32
links.new(occlusion.outputs['AO'], emission.inputs['Color'])
links.new(emission.outputs[0], output.inputs['Surface'])

size = 1024
texture = bpy.data.images.new('Ground contact shade', width=size, height=size, alpha=True)
texture.colorspace_settings.name = 'Non-Color'
target = nodes.new('ShaderNodeTexImage')
target.image = texture
nodes.active = target
scene.render.engine = 'CYCLES'
scene.cycles.samples = 1
scene.render.threads_mode = 'FIXED'
scene.render.threads = 8
scene.render.bake.use_selected_to_active = False
scene.render.bake.margin = 2
bpy.ops.object.bake(type='EMIT')

# Store only a gentle black alpha mask. The original meadow keeps its own color
# and real-time lighting; the near-surface layer supplies the contact shading.
pixels = array('f', [0.0]) * (size * size * 4)
texture.pixels.foreach_get(pixels)
max_alpha = 0.0
for y in range(size):
    for x in range(size):
        i = (y * size + x) * 4
        edge = min(1.0, min(x, y, size - 1 - x, size - 1 - y) / 8.0)
        alpha = .34 * (1 - min(1.0, max(0.0, pixels[i]))) ** .8 * edge
        max_alpha = max(max_alpha, alpha)
        pixels[i:i + 4] = array('f', (0, 0, 0, alpha))
if max_alpha < .1:
    raise RuntimeError('Ground bake contains no meaningful contact occlusion.')
texture.pixels.foreach_set(pixels)
texture.filepath_raw = str(ROOT / 'art/ground-contact-shade.png')
texture.file_format = 'PNG'
texture.save()

nodes.remove(occlusion)
nodes.remove(emission)
shader = nodes.new('ShaderNodeBsdfPrincipled')
shader.inputs['Base Color'].default_value = (0, 0, 0, 1)
shader.inputs['Roughness'].default_value = 1
links.new(target.outputs['Alpha'], shader.inputs['Alpha'])
links.new(shader.outputs[0], output.inputs['Surface'])
material.surface_render_method = 'BLENDED'
bpy.ops.export_scene.gltf(filepath=str(ROOT / 'assets/ground_shade.glb'),
                          export_format='GLB', use_selection=True,
                          export_yup=True, export_animations=False)
print('GROUND_SHADOW_BAKE_OK', 'max_alpha=', round(max_alpha, 3), flush=True)
