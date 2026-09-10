"""Build three original residents in a separate editable Blender scene.

Run with Blender --background --factory-startup --python art/generate_npcs.py.
Reuses the island's palette and modeling helpers without rebuilding the island.
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
        exec(compile(ast.Module(body=[node], type_ignores=[]), '<model helper>', 'exec'))
for node in source.body:
    if isinstance(node, ast.Assign) and any(isinstance(t, ast.Name) and t.id == 'M' for t in node.targets):
        exec(compile(ast.Module(body=[node], type_ignores=[]), '<island palette>', 'exec'))

residents = []
for index, (role, outfit, hat) in enumerate([
    ('gardener', 'leaflight', 'path'),
    ('fisher', 'teal', 'roof'),
    ('keeper', 'cream', 'teal'),
]):
    active = bpy.data.collections.new('RESIDENT • ' + role)
    bpy.context.scene.collection.children.link(active)
    residents.append(active)
    for x in [-.16, .16]:
        ball(role+' / boot', (x, .12, .05), (.14, .12, .21), 'wood')
        cylinder(role+' / trouser', (x, .33, 0), .10, .30, 'plank' if index == 0 else 'teal')
    cylinder(role+' / coat', (0, .70, 0), .36, .67, outfit, top=.25, vertices=28)
    ring(role+' / hem', (0, .40, 0), .33, .025, 'gold')
    ball(role+' / head', (0, 1.28, -.02), (.35, .35, .31), 'skin')
    ball(role+' / hair', (0, 1.46, -.10), (.36, .20, .28), 'cream' if index == 2 else 'hair')
    for x in [-.34, .34]:
        ball(role+' / ear', (x, 1.26, 0), (.065, .09, .065), 'skin')
    for x in [-.115, .115]:
        ball(role+' / eye', (x, 1.32, .271), (.035, .047, .023), 'eye')
        ball(role+' / eye glint', (x-.008, 1.34, .291), (.010, .013, .007), 'cream')
        ball(role+' / cheek', (x*1.7, 1.22, .264), (.055, .023, .012), 'pink')
    ball(role+' / nose', (0, 1.23, .29), (.035, .043, .035), 'skin')
    for side in [-1, 1]:
        hand = (side*.24, .78, .43) if role == 'gardener' else (side*.37, .68, .23)
        beam(role+' / sleeve', (side*.26, .91, .01), hand, .12, outfit)
        ball(role+' / hand', hand, (.08, .09, .085), 'skin')
    if role == 'gardener':
        cylinder('Gardener / straw brim', (0, 1.60, -.02), .53, .07, hat, vertices=40)
        cylinder('Gardener / straw crown', (0, 1.74, -.06), .32, .25, hat, top=.26, vertices=32)
        ring('Gardener / hat ribbon', (0, 1.65, -.06), .315, .035, 'roof')
        box('Gardener / apron', (0, .68, .295), (.39, .46, .065), 'cream', .035)
        box('Gardener / pocket', (0, .57, .337), (.23, .13, .035), 'path', .018)
        cylinder('Gardener / flower pot', (0, .79, .46), .20, .29, 'roof', top=.24)
        ring('Gardener / pot rim', (0, .93, .46), .235, .027, 'rooflight')
        for x, y, z in [(-.10, 1.07, .43), (.11, 1.03, .50), (0, 1.18, .47)]:
            beam('Gardener / flower stem', (x, .91, z), (x, y, z), .018, 'leaf')
            for i in range(5):
                a = i * math.tau / 5
                ball('Gardener / daisy', (x+math.cos(a)*.05, y, z+math.sin(a)*.05), (.045, .025, .045), 'flower')
            ball('Gardener / pollen', (x, y+.016, z), (.024, .02, .024), 'gold')
    elif role == 'fisher':
        cylinder('Fisher / bucket hat brim', (0, 1.61, -.02), .43, .08, hat, vertices=32)
        cylinder('Fisher / bucket hat crown', (0, 1.74, -.06), .34, .22, hat, top=.28)
        ring('Fisher / hat band', (0, 1.68, -.06), .325, .027, 'cream')
        ring('Fisher / scarf', (0, 1.04, 0), .23, .065, 'gold')
        for x in [-.16, .16]:
            box('Fisher / waistcoat pocket', (x, .65, .30), (.17, .21, .07), 'path', .025)
        beam('Fisher / fishing rod', (.38, .40, .24), (.46, 2.35, .91), .023, 'plank')
        beam('Fisher / fishing tip', (.46, 2.35, .91), (.43, 2.38, 1.19), .016, 'plank')
        beam('Fisher / line', (.43, 2.38, 1.19), (.43, .55, 1.32), .005, 'cream')
        ball('Fisher / float', (.43, .54, 1.32), (.047, .09, .047), 'roof')
        cylinder('Fisher / creel', (-.40, .44, -.06), .19, .37, 'path', top=.16)
        for y in [.30, .40, .50]:
            ring('Fisher / woven basket', (-.40, y, -.06), .185, .013, 'plank')
    else:
        cylinder('Keeper / hood brim', (0, 1.58, -.06), .39, .07, hat)
        ball('Keeper / hood', (0, 1.70, -.09), (.32, .22, .30), hat)
        for side in [-1, 1]:
            glass = ring('Keeper / spectacles', (side*.115, 1.32, .296), .083, .013, 'gold')
            glass.rotation_euler.x = math.pi / 2
        beam('Keeper / glasses bridge', (-.03, 1.32, .31), (.03, 1.32, .31), .011, 'gold')
        ball('Keeper / beard', (0, 1.08, .22), (.23, .25, .15), 'cream')
        box('Keeper / stole', (.18, .68, .30), (.15, .52, .055), 'teal', .02)
        for y in [.50, .64, .78]:
            ball('Keeper / embroidered seeds', (.18, y, .34), (.027, .042, .012), 'gold')
        beam('Keeper / walking staff', (.40, .05, .22), (.40, 1.72, .22), .034, 'wood')
        ball('Keeper / staff crystal', (.40, 1.80, .22), (.09, .14, .09), 'water')
        scroll = cylinder('Keeper / rolled map', (-.38, .71, .28), .08, .39, 'cream')
        scroll.rotation_euler.y = .65
        ring('Keeper / map tie', (-.38, .71, .28), .083, .018, 'roof')
    export(active, 'npc_' + role + '.glb')

# Keep an editable, spaced lineup in its own source; never alter mosslight.blend.
for index, collection in enumerate(residents):
    for obj in collection.objects:
        obj.location.x += (index-1) * 2.2
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / 'art/npcs.blend'))
print('MOSSLIGHT_NPCS_OK', len(residents), 'original resident models', flush=True)
