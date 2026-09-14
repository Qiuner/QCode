"""Author only desert_wildlife.blend and three articulated desert animal GLBs.

Run: blender --background --factory-startup --python art/generate_desert_wildlife.py
Godot-facing local coordinates use Y up and +Z forward. No terrain is regenerated.
"""
import ast
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
    'fur': mat('Desert fauna / toasted sand', (.64, .37, .16)),
    'cream': mat('Desert fauna / warm ivory', (.92, .77, .49)),
    'pink': mat('Desert fauna / ear terracotta', (.61, .26, .19)),
    'ink': mat('Desert fauna / dark eyes', (.025, .033, .025), .35),
    'glint': mat('Desert fauna / eye highlight', (.98, .91, .72), .3),
    'sage': mat('Desert fauna / sage scales', (.25, .35, .17)),
    'stripe': mat('Desert fauna / golden markings', (.69, .51, .22)),
}


def part(name, at, pieces):
    # Batch each moving part, retaining editable head / ears / tail / feet.
    bpy.ops.object.select_all(action='DESELECT')
    for obj in pieces:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = pieces[0]
    bpy.ops.object.join()
    obj = bpy.context.object
    obj.name = name
    bpy.context.scene.cursor.location = xyz(at)
    bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
    return obj


def ear(name, x, y, z, width, height):
    # Thick triangular ears retain a clear silhouette from overview and eye level.
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata([xyz(p) for p in [(x-width, y, z), (x+width, y, z),
        (x*1.35, y+height, z-.045), (x-width, y, z-.09),
        (x+width, y, z-.09), (x*1.35, y+height, z-.10)]], [],
        [(0, 1, 2), (5, 4, 3), (0, 3, 4, 1), (1, 4, 5, 2), (2, 5, 3, 0)])
    obj = bpy.data.objects.new(name, mesh)
    active.objects.link(obj)
    mesh.materials.append(M['cream'])
    inside = ball('Ear lining', (x, y+height*.40, z+.009),
                  (width*.6, height*.29, .024), 'pink')
    return part(name, (x, y, z), [obj, inside])


def eyes(y, z, x):
    pieces = []
    for side in [-1, 1]:
        pieces.append(ball('Eye', (side*x, y, z), (.048, .052, .035), 'ink'))
        pieces.append(ball('Eye light', (side*x-.009, y+.018, z+.026), (.013, .014, .009), 'glint'))
    return pieces


def save_animal(filename):
    bpy.ops.object.select_all(action='DESELECT')
    for obj in active.objects:
        obj.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(OUT / filename), export_format='GLB',
                             use_selection=True, export_yup=True, export_animations=False)


active = bpy.data.collections.new('FENNEC - big ears and brush tail')
bpy.context.scene.collection.children.link(active)
part('Body', (0, .33, 0), [ball('Fur', (0, .33, 0), (.24, .24, .40), 'fur'),
    ball('Chest', (0, .36, .23), (.20, .22, .20), 'cream')])
part('Head', (0, .49, .31), [ball('Cheeks', (0, .57, .34), (.26, .23, .23), 'cream'),
    ball('Brow', (0, .66, .30), (.23, .14, .20), 'fur'),
    ball('Muzzle', (0, .52, .56), (.12, .09, .16), 'cream'),
    ball('Nose', (0, .55, .69), (.056, .044, .04), 'ink')] + eyes(.625, .53, .135))
ear('EarLeft', -.17, .71, .30, .135, .43)
ear('EarRight', .17, .71, .30, .135, .43)
part('Tail', (0, .32, -.29), [ball('Brush', (.05, .30, -.62), (.15, .17, .39), 'fur'),
    ball('White brush tip', (.065, .32, -.91), (.12, .13, .17), 'cream')])
for i, (x, z) in enumerate([(-.17, .26), (.17, .26), (-.17, -.25), (.17, -.25)]):
    part('Foot%d' % i, (x, .28, z), [ball('Leg', (x, .17, z), (.065, .16, .075), 'fur'),
        ball('Paw', (x, .057, z+.04), (.079, .057, .115), 'cream')])
save_animal('desert_fennec.glb')

active = bpy.data.collections.new('JERBOA - hopping desert mouse')
bpy.context.scene.collection.children.link(active)
part('Body', (0, .24, 0), [ball('Round haunch', (0, .24, 0), (.16, .22, .20), 'fur'),
    ball('Belly', (0, .28, .12), (.13, .17, .10), 'cream')])
part('Head', (0, .39, .10), [ball('Cheeks', (0, .44, .15), (.17, .15, .16), 'cream'),
    ball('Nose', (0, .43, .31), (.034, .028, .027), 'pink')] + eyes(.48, .262, .092))
ear('EarLeft', -.09, .54, .12, .055, .30)
ear('EarRight', .09, .54, .12, .055, .30)
part('Tail', (0, .18, -.14), [beam('Tail stem', (0, .18, -.14), (.10, .13, -.52), .021, 'fur'),
    beam('Tail curl', (.10, .13, -.52), (.21, .25, -.70), .017, 'fur'),
    ball('Dark tail tuft', (.21, .25, -.70), (.052, .052, .09), 'ink')])
for i, side in enumerate([-1, 1]):
    part('Foot%d' % i, (side*.12, .18, -.06), [ball('Hind foot', (side*.14, .045, .055), (.063, .045, .17), 'cream')])
    part('Foot%d' % (i+2), (side*.10, .31, .15), [beam('Tiny forearm', (side*.10, .32, .14), (side*.085, .22, .24), .032, 'cream')])
save_animal('desert_jerboa.glb')

active = bpy.data.collections.new('LIZARD - striped sand runner')
bpy.context.scene.collection.children.link(active)
pieces = [ball('Low body', (0, .13, 0), (.135, .09, .28), 'sage'),
          ball('Pale throat', (0, .12, .21), (.11, .06, .16), 'cream')]
for z in [-.18, -.06, .06, .18]:
    pieces.append(ball('Back marking', (0, .213, z), (.088, .012, .025), 'stripe'))
part('Body', (0, .13, 0), pieces)
part('Head', (0, .13, .24), [ball('Head wedge', (0, .16, .30), (.135, .085, .16), 'sage'),
    ball('Muzzle', (0, .13, .42), (.09, .047, .06), 'cream')] + eyes(.197, .385, .084))
part('Tail', (0, .13, -.22), [beam('Tail base', (0, .13, -.22), (.03, .105, -.47), .071, 'sage'),
    beam('Tail middle', (.03, .105, -.47), (.11, .09, -.68), .041, 'sage'),
    beam('Tail tip', (.11, .09, -.68), (.21, .10, -.86), .019, 'stripe')])
for i, (side, z) in enumerate([(-1, .15), (1, .15), (-1, -.16), (1, -.16)]):
    part('Foot%d' % i, (side*.10, .13, z), [beam('Splayed thigh', (side*.10, .13, z), (side*.24, .065, z-.06), .037, 'sage'),
        beam('Toes', (side*.24, .065, z-.06), (side*.27, .026, z+.07), .025, 'cream')])
save_animal('desert_lizard.glb')
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / 'art/desert_wildlife.blend'))
print('MOSSLIGHT_DESERT_WILDLIFE_ASSETS_OK', flush=True)
