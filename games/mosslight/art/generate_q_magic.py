"""Build Q's hollow hat, articulated paper dove and starlight prop only.

Run with Blender --background --factory-startup --python art/generate_q_magic.py.
Preserves the computer/arm assets and their editable grabber.blend source.
"""
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
    'velvet': mat('Q magic / midnight plum velvet', (.16, .065, .25), .7),
    'inside': mat('Q magic / dark felt interior', (.018, .009, .03), .95),
    'ribbon': mat('Q magic / peacock silk', (.07, .43, .43), .35, .12),
    'gold': mat('Q magic / warm brass', (.96, .66, .23), .3, .5),
    'paper': mat('Q magic / ivory folded paper', (.96, .91, .74), .65),
    'fold': mat('Q magic / mint folded paper', (.45, .75, .70), .65),
    'eye': mat('Q magic / ink', (.025, .055, .055), .4),
    'light': mat('Q magic / warm starlight', (1.0, .56, .10), .3, .1, .65),
}

active = bpy.data.collections.new('HAT - hollow velvet cup')
bpy.context.scene.collection.children.link(active)
hat = active
# Four concentric loops form a real open shell, with an inset dark lining.
vertices = []
for radius, height in [(.29, .04), (.35, .60), (.305, .60), (.245, .095)]:
    vertices.extend(xyz((radius * math.cos(i * math.tau / 64), height,
                         radius * math.sin(i * math.tau / 64))) for i in range(64))
faces = []
for level in range(3):
    for i in range(64):
        j = (i + 1) % 64
        faces.append((level * 64 + i, level * 64 + j, (level + 1) * 64 + j, (level + 1) * 64 + i))
faces.append(tuple(reversed(range(192, 256))))
mesh = bpy.data.meshes.new('Hollow hat shell')
mesh.from_pydata(vertices, [], faces)
obj = bpy.data.objects.new('Hat / open crown and lining', mesh)
active.objects.link(obj)
mesh.materials.append(M['velvet'])
mesh.materials.append(M['inside'])
for polygon in mesh.polygons:
    polygon.material_index = 1 if polygon.index >= 128 else 0
    polygon.use_smooth = polygon.index < 192
ring('Hat / broad rolled brim', (0, .60, 0), .39, .065, 'velvet')
ring('Hat / silk band', (0, .49, 0), .339, .029, 'ribbon')
ring('Hat / fine brass rim', (0, .60, 0), .323, .010, 'gold')
ball('Hat / brass clasp', (0, .49, .352), (.055, .055, .018), 'gold')
export(hat, 'q_magic_hat.glb')

active = bpy.data.collections.new('STAND - small brass side table')
bpy.context.scene.collection.children.link(active)
cylinder('Stand / weighted foot', (0, -.50, 0), .25, .10, 'velvet', vertices=32)
cylinder('Stand / brass stem', (0, .04, 0), .045, 1.0, 'gold', vertices=16)
cylinder('Stand / velvet top', (0, .59, 0), .35, .055, 'velvet', vertices=32)
ring('Stand / brass edge', (0, .59, 0), .35, .016, 'gold')
export(active, 'q_magic_stand.glb')

active = bpy.data.collections.new('DOVE - independent wing pivots')
bpy.context.scene.collection.children.link(active)
dove = active
ball('DoveBody', (0, .07, 0), (.15, .15, .28), 'paper')
ball('DoveHead', (0, .22, .24), (.12, .12, .13), 'paper')
beam('DoveBeak', (0, .20, .34), (0, .19, .45), .042, 'gold')
for side in [-1, 1]:
    ball('DoveEye', (side * .095, .24, .31), (.018, .022, .018), 'eye')
    beam('DoveFoot', (side * .07, -.075, .06), (side * .07, -.085, .18), .014, 'gold')
for i in [-1, 0, 1]:
    tail = ball('DoveTail', (i * .075, .035, -.29), (.06, .025, .18), 'fold')
    tail.rotation_euler.z = i * .22
# Angular folded wings read clearly in silhouette; hinges survive GLB export.
for side, name in [(-1, 'WingLeft'), (1, 'WingRight')]:
    pivot = bpy.data.objects.new(name, None)
    active.objects.link(pivot)
    pivot.location = xyz((side * .11, .10, 0))
    points = [(0, 0, .12), (side * .26, .08, .06), (side * .67, -.015, -.20),
              (side * .48, -.045, -.27), (side * .25, -.025, -.23), (0, 0, -.13)]
    wing_mesh = bpy.data.meshes.new(name + ' folded mesh')
    wing_mesh.from_pydata([xyz(p) for p in points], [], [(0, 1, 5), (1, 4, 5), (1, 2, 3, 4)])
    wing = bpy.data.objects.new(name + 'Paper', wing_mesh)
    active.objects.link(wing)
    wing.parent = pivot
    wing_mesh.materials.append(M['paper'])
    wing_mesh.materials.append(M['fold'])
    wing_mesh.polygons[1].material_index = 1
    solid = wing.modifiers.new('Folded paper thickness', 'SOLIDIFY')
    solid.thickness = .014
    bpy.context.view_layer.objects.active = wing
    bpy.ops.object.modifier_apply(modifier=solid.name)
bpy.ops.object.select_all(action='DESELECT')
for obj in dove.objects:
    obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT / 'q_magic_dove.glb'), export_format='GLB',
                          use_selection=True, export_yup=True, export_animations=False)

active = bpy.data.collections.new('STAR - faceted warm light')
bpy.context.scene.collection.children.link(active)
points = [(0, 0, .065), (0, 0, -.065)]
for i in range(10):
    angle = math.pi / 2 + i * math.tau / 10
    radius = .22 if i % 2 == 0 else .095
    points.append((math.cos(angle) * radius, math.sin(angle) * radius, 0))
faces = []
for i in range(10):
    faces.extend([(0, 2 + i, 2 + (i + 1) % 10), (1, 2 + (i + 1) % 10, 2 + i)])
mesh = bpy.data.meshes.new('Five point starlight')
mesh.from_pydata([xyz(p) for p in points], [], faces)
obj = bpy.data.objects.new('Starlight', mesh)
active.objects.link(obj)
mesh.materials.append(M['light'])
export(active, 'q_magic_star.glb')
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / 'art/q_magic.blend'))
print('MOSSLIGHT_Q_MAGIC_ASSETS_OK', flush=True)
