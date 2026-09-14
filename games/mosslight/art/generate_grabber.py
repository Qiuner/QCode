"""Author the sanctuary computer and reusable mechanical arm parts in Blender.

Run: blender --background --factory-startup --python art/generate_grabber.py
Only writes grabber.blend and the seven grabber_*.glb assets.
"""
import ast
import bpy
import math
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets'
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
source = ast.parse((ROOT / 'art/generate_assets.py').read_text(encoding='utf-8'))
for node in source.body:
    if isinstance(node, ast.FunctionDef):
        exec(compile(ast.Module(body=[node], type_ignores=[]), '<island modeling helper>', 'exec'))
for node in source.body:
    if isinstance(node, ast.Assign) and any(isinstance(t, ast.Name) and t.id == 'M' for t in node.targets):
        exec(compile(ast.Module(body=[node], type_ignores=[]), '<island palette>', 'exec'))
M['shell'] = mat('Computer - blue enamel', (.13, .32, .62), .36, .18)
M['rim'] = mat('Computer - powder blue rim', (.32, .59, .72), .40, .12)
M['screen'] = mat('Computer - dark green glass', (.012, .052, .048), .24)
M['signal'] = mat('Computer - phosphor signal', (.12, .60, .02), .35, .0, .5)
M['hose'] = mat('Computer - flexible graphite', (.105, .18, .17), .62)
M['rib'] = mat('Computer - sage metal ribs', (.32, .48, .40), .45, .45)
M['magic'] = mat('Computer - magician violet', (.34, .16, .48), .38, .18)
M['magic_red'] = mat('Computer - magician vermilion', (.78, .18, .16), .4, .08)

active = bpy.data.collections.new('COMPUTER - editable housing')
bpy.context.scene.collection.children.link(active)
body = active
# A low moonwell dock replaces the former stacked circular display plinth. The
# pale octagonal shell belongs to the ruin; the recessed teal core reads as the
# machine fitted into it, with brass reserved for the three retaining clamps.
cylinder('Pedestal / limestone dock', (0, .09, 0), .82, .18, 'lightstone', top=.75, vertices=8)
cylinder('Pedestal / recessed machine core', (0, .19, 0), .61, .12, 'teal', vertices=16)
ring('Pedestal / energy channel', (0, .262, 0), .51, .022, 'glow')
for angle in [math.radians(90), math.radians(210), math.radians(330)]:
    x, z = math.cos(angle) * .48, math.sin(angle) * .48
    clamp = box('Pedestal / retaining clamp', (x, .31, z), (.31, .12, .16), 'gold', .035, -angle)
    clamp.rotation_euler.z = -angle
box('Pedestal / control deck', (0, .37, .09), (1.08, .20, .72), 'rim', .09)
for side in [-1, 1]:
    box('Pedestal / switch', (side * .22, .492, .28), (.24, .045, .16), 'roof' if side < 0 else 'signal', .025)
cylinder('Pedestal / mast socket', (0, .47, -.08), .245, .20, 'teal', vertices=16)
ring('Pedestal / socket light', (0, .575, -.08), .205, .021, 'glow')
# Q keeps a compact magic desk around the machine. The props sit outside
# the grabber shoulders and above the dock, so they read clearly without
# becoming collision obstacles for the player's transport.
active = bpy.data.collections.new('MAGIC PROPS - editable stage kit')
bpy.context.scene.collection.children.link(active)
magic = active
cylinder('Magic / top hat brim', (1.25, .52, -.12), .34, .07, 'magic', vertices=32)
cylinder('Magic / top hat crown', (1.25, .78, -.12), .22, .46, 'magic', top=.24, vertices=24)
ring('Magic / top hat band', (1.25, .74, -.12), .225, .035, 'gold')
box('Magic / card box', (-1.14, .52, .12), (.34, .16, .25), 'magic_red', .035, -.08)
box('Magic / card box lid', (-1.14, .615, .12), (.30, .035, .21), 'cream', .018, -.08)
for x in [-.48, 0, .48]:
    cylinder('Magic / cup', (x, .57, .42), .13, .16, 'gold' if x != 0 else 'magic', top=.105, vertices=20)
    ring('Magic / cup rim', (x, .66, .42), .11, .018, 'rim')
ball('Magic / revealed ball', (0, .77, .42), (.075, .075, .075), 'signal')
beam('Magic / wand', (.55, .53, .34), (1.00, .53, .34), .035, 'magic')
ball('Magic / wand tip', (1.04, .53, .34), (.07, .07, .07), 'gold')
ball('Magic / wand tip light', (1.04, .53, .34), (.035, .035, .035), 'signal')
export(magic, 'grabber_magic.glb')
active = bpy.data.collections.new('MAGIC CARD - reusable close-up prop')
bpy.context.scene.collection.children.link(active)
card = active
box('Magic card / face', (0, 0, 0), (.15, .23, .016), 'cream', .012)
export(card, 'grabber_card.glb')
active = bpy.data.collections.new('MAGIC PIGEON - folded light bird')
bpy.context.scene.collection.children.link(active)
pigeon = active
ball('Pigeon / folded body', (0, .12, 0), (.30, .18, .16), 'cream')
ball('Pigeon / head', (0, .20, .22), (.15, .15, .15), 'lightstone')
for side in [-1, 1]:
    wing = ball('Pigeon / broad paper wing', (side * .30, .23, -.01), (.38, .075, .19), 'rim')
    wing.rotation_euler.y = side * .22
    ball('Pigeon / eye', (side * .055, .24, .355), (.021, .021, .016), 'screen')
for x in [-.13, 0, .13]:
    tail = ball('Pigeon / tail feather', (x, .09, -.24), (.12, .045, .22), 'lightstone')
    tail.rotation_euler.y = -x * 1.8
beam('Pigeon / beak', (0, .20, .34), (0, .18, .50), .050, 'magic_red')
ball('Pigeon / signal core', (0, .17, .05), (.055, .055, .055), 'signal')
export(pigeon, 'grabber_pigeon.glb')
active = body
cylinder('Spine / mast', (0, 1.10, -.08), .17, 1.22, 'rib')
for y in [.65, .90, 1.15, 1.40]:
    ring('Spine / collar', (0, y, -.08), .18, .037, 'teal')
beam('Shoulder / crossbar', (-.56, .98, -.08), (.56, .98, -.08), .14, 'rib')
for side in [-1, 1]:
    ball('Shoulder / socket', (side * .57, .98, -.08), (.21, .21, .21), 'gold')
box('Monitor / housing', (0, 2.05, -.03), (2.16, 1.48, 1.06), 'shell', .22)
box('Monitor / rear casing', (0, 2.04, -.63), (1.50, 1.06, .39), 'teal', .15)
box('Monitor / front rim', (0, 2.08, .51), (1.96, 1.27, .14), 'rim', .17)
box('Monitor / screen gasket', (-.03, 2.13, .597), (1.72, 1.04, .06), 'teal', .14)
box('Monitor / convex glass', (-.03, 2.13, .637), (1.58, .91, .045), 'screen', .12)
for side in [-1, 1]:
    for y in [1.65, 2.48]:
        ball('Monitor / bezel screw', (side * .87, y, .60), (.035, .035, .018), 'gold')
for i in range(5):
    box('Monitor / side ventilation', (1.077, 1.85 + i * .10, -.20), (.015, .035, .39), 'teal', .008)
for i in range(4):
    box('Monitor / lower speaker grille', (-.35 + i * .16, 1.60, .608), (.075, .032, .025), 'teal', .01)
ball('Monitor / power light', (.68, 1.60, .618), (.055, .035, .022), 'signal')
# A readable waveform, modeled as geometry so no external texture is required.
active = bpy.data.collections.new('SCREEN - independent phosphor waveform')
bpy.context.scene.collection.children.link(active)
signal = active
wave = [(-.69, 0), (-.53, .015), (-.41, -.09), (-.27, .25), (-.10, -.21), (.06, .12), (.22, -.035), (.38, .21), (.51, -.13), (.66, .01)]
for a, b in zip(wave, wave[1:]):
    beam('Screen / phosphor waveform', (a[0], 2.13 + a[1], .670), (b[0], 2.13 + b[1], .670), .021, 'signal')
export(signal, 'grabber_signal.glb')
active = body
for x in [-.59, -.49, -.39]:
    box('Screen / status mark', (x, 1.84, .67), (.057, .018, .012), 'rim', .004)
# Keep two material batches so the monitor can look around without rotating its pedestal.
batches = []
for prefix, is_head in [('Monitor', True), ('Pedestal', False)]:
    bpy.ops.object.select_all(action='DESELECT')
    copies = []
    for obj in list(body.objects):
        if obj.name.startswith(('Monitor', 'Screen')) != is_head:
            continue
        copy = obj.copy()
        copy.data = obj.data.copy()
        bpy.context.scene.collection.objects.link(copy)
        copy.select_set(True)
        copies.append(copy)
    bpy.context.view_layer.objects.active = copies[0]
    bpy.ops.object.join()
    merged = bpy.context.view_layer.objects.active
    merged.name = prefix + ' / material batches'
    batches.append(merged)
bpy.ops.object.select_all(action='DESELECT')
for obj in batches:
    obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'grabber_computer.glb'), export_format='GLB',
                          use_selection=True, export_yup=True, export_animations=False)
for obj in batches:
    bpy.data.objects.remove(obj, do_unlink=True)

active = bpy.data.collections.new('ARM PART - unit length along Y')
bpy.context.scene.collection.children.link(active)
segment = active
cylinder('Arm / flexible core', (0, .5, 0), .106, 1, 'hose', vertices=12)
for y in [.10, .34, .58, .82]:
    cylinder('Arm / articulated rib', (0, y, 0), .135, .09, 'rib', vertices=12)
export(segment, 'grabber_segment.glb')

active = bpy.data.collections.new('HAND - rounded three finger gripper')
bpy.context.scene.collection.children.link(active)
claw = active
cylinder('Hand / wrist cuff', (0, .08, 0), .17, .16, 'gold', vertices=16)
ball('Hand / padded palm', (0, .26, 0), (.29, .24, .16), 'shell')
for x in [-.18, 0, .18]:
    beam('Hand / finger', (x, .35, .01), (x, .57, .07), .085, 'rim')
    ball('Hand / knuckle', (x, .40, .025), (.091, .088, .089), 'shell')
    beam('Hand / curled tip', (x, .57, .07), (x, .59, .22), .081, 'shell')
beam('Hand / thumb', (-.23, .22, .03), (-.36, .36, .13), .095, 'shell')
export(claw, 'grabber_claw.glb')

# Keep the reusable parts in an assembled idle pose in the editable source.
assembly = bpy.data.collections.new('ARMS - assembled preview')
bpy.context.scene.collection.children.link(assembly)
for side in [-1, 1]:
    shoulder = Vector((side * .57, .98, -.08))
    elbow = Vector((side * 1.50, 1.02, 1.02))
    tip = Vector((side * 1.33, .65, .75))
    curves = [
        (shoulder, Vector((side * 1.50, .98, -.08)), elbow - Vector((0, 0, .25)), elbow),
        (elbow, elbow + Vector((0, 0, .25)), tip + Vector((0, .35, 0)), tip),
    ]
    points = [shoulder]
    for p0, p1, p2, p3 in curves:
        points.extend((1-t)**3*p0 + 3*(1-t)**2*t*p1 + 3*(1-t)*t*t*p2 + t**3*p3 for t in [i/9 for i in range(1, 10)])
    for index, (a, b) in enumerate(zip(points, points[1:])):
        parent = bpy.data.objects.new(f'Arm {side} / segment {index:02}', None)
        assembly.objects.link(parent)
        parent.location = xyz(a)
        parent.rotation_euler = (Vector(xyz(b)) - Vector(xyz(a))).to_track_quat('Z', 'Y').to_euler()
        parent.scale.z = (b-a).length
        for item in segment.objects:
            copy = item.copy()
            assembly.objects.link(copy)
            copy.parent = parent
    for item in claw.objects:
        copy = item.copy()
        assembly.objects.link(copy)
        copy.location += Vector(xyz(p3))
for collection in [segment, claw]:
    collection.hide_viewport = True
    collection.hide_render = True
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / 'art/grabber.blend'))
print('MOSSLIGHT_GRABBER_ASSETS_OK', flush=True)
