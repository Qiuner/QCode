"""Move the original can out of the static island and export a portable asset.

Run once against the existing mosslight.blend. Re-running retains the tool
collection. Subsequent island rebuilds use the separately saved watering_can.glb.
"""
import ast
import bpy
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets'
bpy.ops.wm.open_mainfile(filepath=str(ROOT / 'art/mosslight.blend'))
world = bpy.data.collections['ISLAND • environment']
tool = bpy.data.collections.get('TOOL • watering can')
if tool is None:
    tool = bpy.data.collections.new('TOOL • watering can')
    bpy.context.scene.collection.children.link(tool)
    for obj in list(world.objects):
        if obj.name.startswith(('Garden / watering ',)):
            world.objects.unlink(obj)
            tool.objects.link(obj)
            obj.location -= Vector((-6.1, -.1, .065))
if not tool.objects:
    raise RuntimeError('Original watering-can objects were not found')
source = ast.parse((ROOT / 'art/generate_assets.py').read_text(encoding='utf-8'))
node = next(n for n in source.body if isinstance(n, ast.FunctionDef) and n.name == 'export')
exec(compile(ast.Module(body=[node], type_ignores=[]), '<export>', 'exec'))
export(tool, 'watering_can.glb')
export(world, 'island.glb')
tool.hide_render = True
tool.hide_viewport = True
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / 'art/mosslight.blend'))
script = ROOT / 'art/bake_ground_shadows.py'
exec(compile(script.read_text(encoding='utf-8'), str(script), 'exec'),
     {'__file__': str(script), '__name__': '__main__'})
print('PORTABLE_WATERING_CAN_OK', flush=True)
