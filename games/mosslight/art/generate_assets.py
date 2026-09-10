"""Run with Blender --background --factory-startup --python art/generate_assets.py.

All forms and materials are original procedural assets. Coordinates in helpers use
Godot's X/Y-up/Z convention. Output: editable .blend, six GLBs, collision layout.
This runs in a separate factory-startup process, never in the user's open scene.
"""
import bpy
import math
import random
import json
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets'
OUT.mkdir(parents=True, exist_ok=True)
random.seed(17)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for collection in list(bpy.data.collections):
    if collection.name != 'Collection':
        bpy.data.collections.remove(collection)
world = bpy.data.collections.get('Collection')
world.name = 'ISLAND • environment'
active = world
colliders = []


def mat(name, color, rough=0.65, metallic=0, emission=0):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Roughness'].default_value = rough
    bsdf.inputs['Metallic'].default_value = metallic
    bsdf.inputs['Emission Color'].default_value = (*color, 1)
    bsdf.inputs['Emission Strength'].default_value = emission
    return m


M = {
    'grass': mat('01 · pistachio moss', (.34, .49, .23)),
    'edge': mat('02 · deep moss lip', (.25, .39, .18)),
    'soil': mat('03 · warm clay strata', (.38, .28, .19)),
    'rock': mat('04 · slate underside', (.23, .31, .30)),
    'stone': mat('05 · old ivory limestone', (.66, .66, .50)),
    'lightstone': mat('06 · sunlit limestone', (.81, .78, .61)),
    'path': mat('07 · honey sandstone', (.75, .64, .43)),
    'wood': mat('08 · walnut wood', (.28, .17, .11)),
    'plank': mat('09 · cut cedar', (.57, .34, .16)),
    'gold': mat('10 · brushed brass', (.91, .63, .19), .3, .55),
    'leaf': mat('11 · jade canopy', (.18, .42, .28)),
    'leaflight': mat('12 · sage canopy', (.36, .55, .28)),
    'leafyellow': mat('13 · chartreuse canopy', (.60, .64, .24)),
    'water': mat('14 · pond turquoise', (.10, .49, .51), .2, .2),
    'ripple': mat('15 · water glints', (.46, .83, .72), .3, .1),
    'cream': mat('16 · warm porcelain', (.95, .85, .64)),
    'roof': mat('17 · terracotta roof', (.67, .28, .19)),
    'rooflight': mat('18 · apricot tile', (.81, .39, .24)),
    'teal': mat('19 · petrol teal', (.075, .32, .34)),
    'coat': mat('20 · saffron cape', (.93, .49, .17)),
    'skin': mat('21 · peach porcelain', (.94, .71, .50)),
    'hair': mat('22 · cocoa hair', (.23, .12, .09)),
    'eye': mat('23 · ink', (.035, .06, .06), .28),
    'pink': mat('24 · coral petals', (.91, .42, .38)),
    'flower': mat('25 · chamomile petals', (.97, .87, .62)),
    'glow': mat('26 · bottled starlight', (.65, .98, .73), .25, .1, 2.0),
}


def xyz(p):
    return (p[0], -p[2], p[1])


def finish(obj, name, material):
    obj.name = name
    for c in list(obj.users_collection):
        c.objects.unlink(obj)
    active.objects.link(obj)
    obj.data.materials.append(M[material])
    return obj


def box(name, p, size, material, bevel=.08, angle=0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=xyz(p))
    o = finish(bpy.context.object, name, material)
    o.scale = (size[0], size[2], size[1])
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        mod = o.modifiers.new('Soft sculpted edges', 'BEVEL')
        mod.width = bevel
        mod.segments = 3
        bpy.ops.object.modifier_apply(modifier=mod.name)
        mod = o.modifiers.new('Weighted corner normals', 'WEIGHTED_NORMAL')
        bpy.ops.object.modifier_apply(modifier=mod.name)
    o.rotation_euler.z = -angle
    return o


def ball(name, p, size, material, ico=False):
    if ico:
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=1, location=xyz(p))
    else:
        bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=12, radius=1, location=xyz(p))
    o = finish(bpy.context.object, name, material)
    o.scale = (size[0], size[2], size[1])
    for poly in o.data.polygons:
        poly.use_smooth = True
    return o


def cylinder(name, p, radius, depth, material, top=None, vertices=20):
    bpy.ops.mesh.primitive_cone_add(vertices=vertices, radius1=radius,
                                  radius2=radius if top is None else top,
                                  depth=depth, location=xyz(p))
    o = finish(bpy.context.object, name, material)
    mod = o.modifiers.new('Rounded rim', 'BEVEL')
    mod.width = min(.045, depth / 5)
    mod.segments = 2
    bpy.ops.object.modifier_apply(modifier=mod.name)
    for poly in o.data.polygons:
        poly.use_smooth = True
    return o


def beam(name, a, b, radius, material):
    mid = tuple((a[i] + b[i]) / 2 for i in range(3))
    d = Vector(xyz(b)) - Vector(xyz(a))
    o = cylinder(name, mid, radius, d.length, material)
    o.rotation_euler = d.to_track_quat('Z', 'Y').to_euler()
    return o


def ring(name, p, radius, thickness, material, scale_z=1):
    bpy.ops.mesh.primitive_torus_add(major_radius=radius, minor_radius=thickness,
                                    major_segments=48, minor_segments=8, location=xyz(p))
    o = finish(bpy.context.object, name, material)
    o.scale.y = scale_z
    for poly in o.data.polygons:
        poly.use_smooth = True
    return o


def collider(p, size, name):
    colliders.append({'name': name, 'position': p, 'size': size})


# A layered, rounded landmass with visible handmade strata.
box('Island / deep stone', (0, -.92, 0), (25, 1.6, 21), 'rock', 1.25)
box('Island / warm earth', (0, -.56, 0), (25.2, .85, 21.2), 'soil', .6)
box('Island / moss overhang', (0, -.19, 0), (25.5, .55, 21.5), 'edge', .5)
box('Island / soft meadow', (0, -.10, 0), (25.3, .32, 21.3), 'grass', .30)
collider((0, -.35, 0), (24.8, .7, 20.8), 'meadow')
for i in range(32):
    x = random.uniform(-11.8, 11.8)
    z = random.choice([-10.1, 10.1])
    ball('Lichen on strata', (x, -.55, z), (.30, .22, .17), 'edge', True)

# Meandering cobbled route, each stone intentionally imperfect.
for i in range(23):
    z = 8.7 - i * .62
    x = math.sin(i * .25) * 1.25 - .6
    for side in [-1, 1]:
        box('Walkway / worn cobble', (x + side * .39, .10, z),
            (.64 + random.random() * .16, .12, .43 + random.random() * .16),
            'path' if i % 4 else 'lightstone', .09, random.uniform(-.15, .15))
for side in [-1, 1]:
    for i in range(9):
        x = side * (1.3 + i * .75)
        z = 3.3 - math.sin(i * .35) * 1.1
        box('Garden path', (x, .09, z), (.65, .1, .55), 'path', .1, random.uniform(-.2, .2))

# The moonwell and its three broken arch segments.
box('Sanctuary / foundation', (1.2, .62, -6.3), (6.5, 1.25, 4.4), 'stone', .25)
box('Sanctuary / cornice', (1.2, 1.34, -6.3), (6.7, .24, 4.6), 'lightstone', .10)
box('Sanctuary / moss floor', (1.2, 1.49, -6.3), (6.2, .12, 4.1), 'edge', .08)
collider((1.2, .76, -6.3), (6.7, 1.52, 4.6), 'sanctuary ledge')
cylinder('Moonwell / plinth', (1.2, 1.72, -6.8), .94, .35, 'stone')
cylinder('Moonwell / basin', (1.2, 1.96, -6.8), 1.10, .20, 'lightstone')
cylinder('Moonwell / light pool', (1.2, 2.07, -6.8), .83, .04, 'water')
ring('Moonwell / brass inlay', (1.2, 2.11, -6.8), .88, .04, 'gold')
for x, height in [(-1.1, 2.5), (3.5, 3.2)]:
    for j in range(int(height / .43)):
        box('Arch / stacked limestone', (x, 1.55 + j * .43 + .2, -7.75), (.69, .40, .73),
            'stone' if j % 2 else 'lightstone', .08, random.uniform(-.035, .035))
    box('Arch / capital', (x, 1.55 + int(height/.43)*.43, -7.75), (.94, .24, .93), 'lightstone', .07)
box('Arch / remaining lintel', (2.7, 4.65, -7.75), (2.4, .46, .75), 'lightstone', .10, -.07)
for i in range(7):
    ball('Arch / creeping moss', (-1.2 + i*.72, 1.57, -8.0), (.46, .10, .30), 'grass', True)
for x in [-1.1, 3.5]:
    collider((x, 2.72, -7.75), (.75, 2.4, .8), 'ruin pillar')

# Quiet turquoise garden pond, bounded by chunky river stones.
pond = (6.9, .10, -.1)
water = cylinder('Pond / enamel water', pond, 2.7, .12, 'water', vertices=64)
water.scale.y = .72
collider((6.9, .15, -.1), (4.3, .5, 2.8), 'pond bank')
for i in range(23):
    a = i * math.tau / 23
    ball('Pond / river stone', (6.9 + math.cos(a)*2.72, .20, -.1 + math.sin(a)*1.98),
         (.33 + random.random()*.18, .20, .29), 'stone' if i % 3 else 'lightstone', True)
for r in [.65, 1.3, 2.0]:
    ring('Pond / ripples', (6.9, .175, -.1), r, .012, 'ripple', .72)
for x, z in [(5.7, -.8), (7.8, .5), (7.5, -1.0)]:
    cylinder('Pond / lily leaf', (x, .20, z), .28, .03, 'leaflight', vertices=14)
    for i in range(5):
        a = math.tau * i/5
        ball('Pond / lotus petal', (x+math.cos(a)*.10, .25, z+math.sin(a)*.10), (.11,.045,.07), 'pink')

# A small terracotta-roofed keeper's cottage.
box('Cottage / foundation', (-7.3, .19, -2.6), (3.8, .4, 3.25), 'stone', .13)
box('Cottage / plaster walls', (-7.3, 1.38, -2.6), (3.35, 2.1, 2.9), 'cream', .13)
collider((-7.3, 1.4, -2.6), (3.7, 2.8, 3.25), 'keeper cottage')
for side in [-1, 1]:
    for row in range(5):
        x = -7.3 + side * (.23 + row*.40)
        h = 3.37 - row*.22
        for j in range(7):
            tile = box('Cottage / overlapping roof tile', (x, h, -4.20+j*.50),
                       (.64,.19,.57), 'rooflight' if (row+j)%4 == 0 else 'roof', .065)
            tile.rotation_euler.y = side * .48
box('Cottage / ridge', (-7.3, 3.55, -2.7), (.35,.29,3.8), 'rooflight', .13)
box('Cottage / chimney', (-8.45, 3.13, -3.5), (.55,1.55,.60), 'stone', .08)
box('Cottage / chimney cap', (-8.45, 3.95, -3.5), (.72,.17,.76), 'lightstone', .05)
box('Cottage / doorway shadow', (-7.4, 1.03, -1.125), (.94,1.64,.1), 'wood', .22)
box('Cottage / teal door', (-7.4, 1.02, -1.06), (.72,1.45,.12), 'teal', .18)
ball('Cottage / brass door knob', (-7.15,.99,-.96), (.055,.055,.055), 'gold')
for x in [-8.42, -6.24]:
    box('Cottage / window frame', (x,1.72,-1.10), (.61,.72,.14), 'wood', .08)
    box('Cottage / warm window', (x,1.72,-1.01), (.44,.56,.04), 'gold', .06)
    box('Cottage / window mullion', (x,1.72,-.96), (.045,.60,.05), 'wood', .01)
box('Cottage / front step', (-7.4,.18,-.57), (1.5,.32,.76), 'lightstone', .08)
for i in range(5):
    beam('Firewood', (-9.25,.27+i%2*.15,-.9+i*.22), (-8.5,.27+i%2*.15,-.9+i*.22), .11, 'plank')


def tree(x, z, s=1, palette='leaflight'):
    cylinder('Tree / tapered trunk', (x, 1.05*s, z), .23*s, 2.1*s, 'wood', .14*s)
    beam('Tree / branch', (x,1.2*s,z), (x+.58*s,2.3*s,z+.14*s), .10*s, 'wood')
    for dx, dy, dz, r in [(-.5,2.65,.03,.91),(.5,2.7,.06,.91),(0,3.27,-.08,.95),
                          (-.08,2.77,.51,.86),(.02,2.7,-.52,.85)]:
        ball('Tree / cloud canopy', (x+dx*s,dy*s,z+dz*s), (r*s,r*.90*s,r*s), palette)
    collider((x,.9*s,z), (.48*s,1.8*s,.48*s), 'tree trunk')
    for a in [0, 2.1, 4.2]:
        beam('Tree / root', (x,.1,z), (x+math.cos(a)*.55*s,.05,z+math.sin(a)*.55*s), .09*s, 'wood')


for args in [(-10,-6.7,1.2,'leaf'),(-6.8,-7.8,1.1,'leaflight'),(-4.5,-7.6,.85,'leafyellow'),
             (7.1,-6.8,1.15,'leaflight'),(9.8,-5.5,1.25,'leaf'),(10.2,-2.4,.82,'leafyellow'),
             (-10.5,4.9,1,'leaflight'),(-8.9,7.5,.82,'leafyellow'),(10.2,5.3,1.05,'leaf'),
             (8.7,7.9,.80,'leaflight'),(-11.1,-.3,.75,'leaf')]:
    tree(*args)

# Low, open fences and lanterns frame rather than obscure the playable space.
for center, z in [(-4.7,8.9),(4.2,8.9),(-6.6,-9.3),(7.5,-9.3)]:
    for dx in [-1.5,0,1.5]:
        box('Fence / post', (center+dx,.47,z), (.16,.91,.17), 'wood', .04)
        ball('Fence / post cap', (center+dx,.96,z), (.13,.10,.13), 'gold')
    for y in [.32,.70]:
        box('Fence / rail', (center,y,z), (3.2,.10,.11), 'plank', .025)
for x,z in [(-2.7,6.7),(2.3,2.4),(-3.3,-3.1),(5.1,-4.0)]:
    cylinder('Lantern / stone footing',(x,.17,z),.31,.32,'stone')
    cylinder('Lantern / stem',(x,.87,z),.08,1.25,'wood')
    box('Lantern / paper globe',(x,1.66,z),(.41,.53,.40),'cream',.09)
    box('Lantern / copper cap',(x,1.98,z),(.57,.12,.55),'gold',.05)
    box('Lantern / base',(x,1.36,z),(.48,.10,.47),'wood',.025)

# Small-scale detail: reeds, grass blades, flowers and spotted mushrooms.
for i in range(160):
    x,z = random.uniform(-11.7,11.7),random.uniform(-9.6,9.6)
    if abs(x)<2.3 or (x<-5.2 and -4.7<z<-.4) or (x>3.8 and -3<z<2.5) or (z<-4 and -3<x<5):
        continue
    for j in range(3):
        tip=(x+random.uniform(-.18,.18),random.uniform(.23,.43),z+random.uniform(-.15,.15))
        beam('Meadow / little blade',(x,.07,z),tip,.028,'leaflight')
    if i%3 == 0:
        y=.35
        beam('Wildflower / stem',(x,.03,z),(x,y,z),.025,'leaf')
        for j in range(5):
            a=math.tau*j/5
            ball('Wildflower / petal',(x+math.cos(a)*.075,y,z+math.sin(a)*.075),(.065,.035,.065),
                 'flower' if i%2 else 'pink')
        ball('Wildflower / pollen',(x,y+.025,z),(.042,.035,.042),'gold')
for x,z in [(-9.2,5.3),(-9.7,5.7),(8.9,-5.1),(9.2,-4.8),(-4.4,-6.9)]:
    cylinder('Mushroom / stem',(x,.19,z),.08,.31,'cream')
    ball('Mushroom / cap',(x,.37,z),(.25,.13,.25),'roof')
    for dx,dz in [(-.09,.04),(.07,.1),(.03,-.08)]:
        ball('Mushroom / spot',(x+dx,.49,z+dz),(.045,.02,.045),'cream')

# A brass-ringed pedestal holding the learnable crate.
cylinder('Echo / lesson pedestal',(-3.6,.14,4.0),.88,.25,'lightstone')
ring('Echo / lesson inlay',(-3.6,.28,4.0),.69,.025,'gold')

# A cozy original hero, separate from the environment for game animation.
hero = bpy.data.collections.new('TRAVELER • Lumi')
bpy.context.scene.collection.children.link(hero)
active=hero
for x in [-.16,.16]:
    ball('Lumi / boot',(x,.14,.035),(.145,.145,.23),'wood')
    cylinder('Lumi / sock',(x,.29,.015),.09,.20,'cream')
cylinder('Lumi / saffron cloak',(0,.66,0),.40,.68,'coat',.23,32)
ring('Lumi / cloak hem',(0,.345,0),.365,.036,'gold')
ball('Lumi / head',(0,1.22,-.015),(.37,.37,.32),'skin')
ball('Lumi / hair cap',(0,1.43,-.09),(.39,.23,.30),'hair')
for x in [-.32,.32]:
    ball('Lumi / hair curl',(x,1.20,-.035),(.10,.21,.15),'hair')
    ball('Lumi / ear',(x*1.03,1.22,.03),(.075,.09,.07),'skin')
for x in [-.115,.115]:
    ball('Lumi / bright eye',(x,1.265,.281),(.043,.060,.025),'eye')
    ball('Lumi / eye catchlight',(x-.01,1.289,.305),(.014,.019,.008),'cream')
    ball('Lumi / rosy cheek',(x*1.65,1.17,.266),(.066,.024,.014),'pink')
ball('Lumi / button nose',(0,1.18,.30),(.035,.045,.036),'skin')
cylinder('Lumi / teal beret brim',(0,1.59,-.04),.40,.09,'teal',vertices=32)
ball('Lumi / teal beret',(0,1.68,-.075),(.37,.16,.32),'teal')
beam('Lumi / sprout stem',(.07,1.80,-.08),(.12,1.99,-.08),.024,'gold')
ball('Lumi / sprout leaf',(.22,1.94,-.08),(.14,.05,.07),'leafyellow')
ring('Lumi / scarf',(0,.94,0),.25,.075,'teal')
box('Lumi / scarf tail',(-.22,.76,-.26),(.16,.40,.08),'teal',.04,-.14)
for x in [-.36,.36]:
    ball('Lumi / sleeve',(x,.73,.02),(.14,.22,.14),'coat')
    ball('Lumi / hand',(x*1.13,.59,.07),(.09,.11,.09),'skin')
box('Lumi / satchel',(0,.67,-.31),(.43,.46,.18),'plank',.09)
box('Lumi / satchel clasp',(0,.68,-.42),(.1,.1,.025),'gold',.015)
beam('Lumi / lantern staff',(.49,.16,.11),(.49,1.27,.11),.034,'wood')
ball('Lumi / lantern light',(.49,1.32,.11),(.13,.18,.13),'glow')
cylinder('Lumi / lantern crown',(.49,1.52,.11),.16,.07,'gold')

crate = bpy.data.collections.new('ECHO • carved cedar box')
bpy.context.scene.collection.children.link(crate)
active=crate
box('Echo box / core',(0,.43,0),(.91,.86,.91),'wood',.065)
for side in [-1,1]:
    for i in range(4):
        box('Echo box / cedar boards',(side*.463,.13+i*.20,0),(.045,.17,.83),'plank',.015)
        box('Echo box / cedar boards',(0,.13+i*.20,side*.463),(.83,.17,.045),'plank',.015)
    for x in [-.32,.32]:
        box('Echo box / metal strap',(x,.90,0),(.07,.045,.95),'gold',.015)
        box('Echo box / upright strap',(x,.46,side*.49),(.06,.90,.035),'gold',.012)
for i in range(4):
    box('Echo box / lid',(-.33+i*.22,.88,0),(.19,.045,.86),'plank',.014)


def export(collection, filename):
    bpy.ops.object.select_all(action='DESELECT')
    # Join export copies only. The .blend retains independently editable props.
    copies = []
    for source in list(collection.objects):
        obj = source.copy()
        obj.data = source.data.copy()
        bpy.context.scene.collection.objects.link(obj)
        obj.select_set(True)
        copies.append(obj)
    bpy.context.view_layer.objects.active = copies[0]
    bpy.ops.object.join()
    merged = bpy.context.view_layer.objects.active
    merged.name = filename.removesuffix('.glb') + ' / material batches'
    bpy.ops.export_scene.gltf(filepath=str(OUT/filename), export_format='GLB',
                              use_selection=True, export_yup=True, export_animations=False)
    bpy.data.objects.remove(merged, do_unlink=True)


# Extend the environment using the same material palette and modeling helpers.
exec(compile((ROOT/'art'/'detail_pass.py').read_text(encoding='utf-8'),
             str(ROOT/'art'/'detail_pass.py'), 'exec'))
exec(compile((ROOT/'art'/'sanctuary_details.py').read_text(encoding='utf-8'),
             str(ROOT/'art'/'sanctuary_details.py'), 'exec'))
export(world,'island.glb')
export(hero,'lumi.glb')
export(crate,'echo_crate.glb')
export(rabbit,'rabbit.glb')
export(duck,'duck.glb')
(OUT/'colliders.json').write_text(json.dumps(colliders,indent=2),encoding='utf-8')

# Stage the Blender source as a complete art scene, ready for further editing.
for obj in hero.objects:
    obj.location += Vector(xyz((0,.09,6.3)))
for obj in crate.objects:
    obj.location += Vector(xyz((-3.6,.28,4.0)))
for obj in rabbit.objects:
    obj.location += Vector(xyz((-6.2,.08,1.5)))
for obj in duck.objects:
    obj.location += Vector(xyz((6.9,.2,-.1)))
bpy.ops.object.camera_add(location=xyz((15,25,29)))
cam=bpy.context.object
cam.name='ART CAMERA • island overview'
cam.rotation_euler=(Vector(xyz((0,0,0)))-cam.location).to_track_quat('-Z','Y').to_euler()
cam.data.type='ORTHO'
cam.data.ortho_scale=34
bpy.context.scene.camera=cam
bpy.ops.object.light_add(type='AREA', location=xyz((-8,16,8)))
bpy.context.object.data.energy=2200
bpy.context.object.data.shape='DISK'
bpy.context.object.data.size=10
bpy.context.scene.world.color=(.35,.35,.35)
bpy.context.scene.render.engine='CYCLES'
bpy.context.scene.cycles.samples=32
bpy.context.scene.render.resolution_x=1600
bpy.context.scene.render.resolution_y=1000
bpy.context.scene.render.resolution_percentage=100
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'art'/'mosslight.blend'))
print('MOSSLIGHT_ASSETS_OK',len(world.objects),'environment objects',len(colliders),'colliders')

# Keep the WebGL contact-shading layer aligned whenever static props are rebuilt.
shadow_script = ROOT / 'art' / 'bake_ground_shadows.py'
exec(compile(shadow_script.read_text(encoding='utf-8'), str(shadow_script), 'exec'),
     {'__file__': str(shadow_script), '__name__': '__main__'})
