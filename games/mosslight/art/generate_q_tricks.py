"""Build the flying-card and cups-and-lemon kits; preserve q_magic.blend."""
import ast
import math
from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets'
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
source = ast.parse((ROOT / 'art/generate_assets.py').read_text(encoding='utf-8'))
for node in source.body:
    if isinstance(node, ast.FunctionDef):
        exec(compile(ast.Module(body=[node], type_ignores=[]), '<island modeling helper>', 'exec'))
M = {
    'paper': mat('Q tricks / ivory card stock', (.98, .94, .79), .65),
    'red': mat('Q tricks / vermilion velvet', (.70, .055, .055), .65),
    'back': mat('Q tricks / deep peacock', (.035, .25, .28), .6),
    'gold': mat('Q tricks / satin brass', (.83, .48, .12), .32, .55),
    'velvet': mat('Q tricks / midnight felt', (.11, .035, .19), .85),
    'inside': mat('Q tricks / cup interior', (.13, .06, .015), .8),
    'lemon': mat('Q tricks / lemon peel', (.98, .66, .06), .7),
    'leaf': mat('Q tricks / lemon leaf', (.16, .42, .16), .75),
}
active = bpy.data.collections.new('CARDS - double sided ace')
bpy.context.scene.collection.children.link(active)
box('Card / rounded stock', (0, 0, 0), (.42, .62, .022), 'paper', .028)
box('Card / inset back', (0, 0, -.015), (.35, .54, .01), 'back', .022)
for x in [-.14, .14]:
    box('Card / back pinstripe', (x, 0, -.023), (.008, .46, .006), 'gold', .002)
for y in [-.23, .23]:
    box('Card / back pinstripe', (0, y, -.023), (.28, .008, .006), 'gold', .002)
diamond = box('Card / back diamond', (0, 0, -.025), (.15, .15, .008), 'gold', .003)
diamond.rotation_euler.y = math.pi / 4
# A heart silhouette readable at game scale, with small corner pips.
for x, y, scale in [(0, 0, 1), (-.14, .22, .24), (.14, -.22, .24)]:
    points = [(0, -.14), (-.12, -.015), (-.12, .075), (-.06, .12), (0, .07), (.06, .12), (.12, .075), (.12, -.015)]
    mesh = bpy.data.meshes.new('Heart pip')
    mesh.from_pydata([xyz((x + a * scale, y + b * scale, .016)) for a, b in points], [], [tuple(range(8))])
    obj = bpy.data.objects.new('Card / heart', mesh)
    active.objects.link(obj)
    mesh.materials.append(M['red'])
export(active, 'q_trick_card.glb')

active = bpy.data.collections.new('CUP - inverted hollow brass bell')
bpy.context.scene.collection.children.link(active)
vertices = []
for radius, height in [(.27, 0), (.19, .43), (.155, .40), (.23, .018)]:
    vertices.extend(xyz((radius * math.cos(i * math.tau / 48), height,
                         radius * math.sin(i * math.tau / 48))) for i in range(48))
faces = []
for level in range(3):
    for i in range(48):
        j = (i + 1) % 48
        faces.append((level * 48 + i, level * 48 + j, (level + 1) * 48 + j, (level + 1) * 48 + i))
faces.append(tuple(range(48, 96)))
mesh = bpy.data.meshes.new('Hollow inverted cup')
mesh.from_pydata(vertices, [], faces)
obj = bpy.data.objects.new('Cup / bell shell', mesh)
active.objects.link(obj)
mesh.materials.append(M['gold'])
mesh.materials.append(M['inside'])
for polygon in mesh.polygons:
    polygon.material_index = 1 if 96 <= polygon.index < 144 else 0
    polygon.use_smooth = polygon.index < 144
ring('Cup / rolled lip', (0, .025, 0), .26, .022, 'gold')
ring('Cup / colored band', (0, .30, 0), .214, .016, 'back')
ball('Cup / knob', (0, .48, 0), (.065, .065, .065), 'velvet')
export(active, 'q_trick_cup.glb')

active = bpy.data.collections.new('TRAY - handheld close-up stage')
bpy.context.scene.collection.children.link(active)
box('Tray / brass rim', (0, 0, 0), (2.30, .09, .96), 'gold', .09)
box('Tray / velvet inset', (0, .054, 0), (2.16, .025, .82), 'velvet', .07)
export(active, 'q_trick_tray.glb')

active = bpy.data.collections.new('BALL - red velvet')
bpy.context.scene.collection.children.link(active)
ball('Ball / red velvet', (0, 0, 0), (.13, .13, .13), 'red')
export(active, 'q_trick_ball.glb')

active = bpy.data.collections.new('LEMON - oversized final load')
bpy.context.scene.collection.children.link(active)
ball('Lemon / peel', (0, .27, 0), (.37, .27, .25), 'lemon', ico=True)
ball('Lemon / pointed ends', (-.35, .27, 0), (.075, .065, .06), 'lemon')
ball('Lemon / pointed ends', (.35, .27, 0), (.075, .065, .06), 'lemon')
leaf = ball('Lemon / leaf', (.15, .52, 0), (.18, .027, .085), 'leaf')
leaf.rotation_euler.y = -.35
export(active, 'q_trick_lemon.glb')
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / 'art/q_tricks.blend'))
print('MOSSLIGHT_Q_TRICKS_ASSETS_OK', flush=True)
