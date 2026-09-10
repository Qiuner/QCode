"""Independent desert tile. Blender --background --factory-startup --python this_file.

Writes only art/desert.blend and assets/desert.glb. Helpers accept Godot Y-up
coordinates. The tile origin stays local; Godot places it 30 units east.
"""
import math
import random
import runpy
from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
random.seed(41)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
groups = {}
for name in ('Terrain', 'Walkable', 'Obstacles', 'Details'):
    group = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(group)
    groups[name] = group


def material(name, color):
    result = bpy.data.materials.new(name)
    result.diffuse_color = (*color, 1)
    result.use_nodes = True
    shader = result.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (*color, 1)
    shader.inputs['Roughness'].default_value = .82
    return result


M = {key: material(key, color) for key, color in {
    'sand': (.285, .185, .112), 'sandlight': (.365, .25, .153),
    'sandshade': (.28, .17, .095), 'strata': (.25, .13, .075),
    'rock': (.38, .205, .12), 'stone': (.46, .335, .225),
    'ivory': (.60, .48, .33), 'water': (.055, .26, .25),
    'waterlight': (.16, .43, .37), 'palm': (.12, .255, .15),
    'leaflight': (.25, .365, .18), 'trunk': (.25, .13, .065),
    'cactus': (.12, .275, .20), 'cactuslight': (.23, .385, .25),
    'flower': (.58, .18, .13), 'cloth': (.075, .225, .245),
    'gold': (.56, .34, .12), 'rug': (.38, .115, .075),
    'ink': (.075, .10, .095), 'reeds': (.235, .30, .12),
    'wetbank': (.19, .17, .095), 'ripplesand': (.305, .198, .115),
    'adobe': (.43, .245, .14), 'plaster': (.56, .39, .24),
    'plasterlight': (.65, .49, .32), 'shadowwood': (.115, .073, .045),
    'glaze': (.055, .23, .215), 'linen': (.49, .435, .32),
}.items()}


def xyz(p):
    return (p[0], -p[2], p[1])


def finish(obj, name, mat, group='Details'):
    obj.name = name
    for collection in list(obj.users_collection):
        collection.objects.unlink(obj)
    groups[group].objects.link(obj)
    obj.data.materials.append(M[mat])
    return obj


def box(name, p, size, mat, bevel=.08, group='Details', angle=0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=xyz(p))
    obj = finish(bpy.context.object, name, mat, group)
    obj.scale = (size[0], size[2], size[1])
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        modifier = obj.modifiers.new('Rounded carved edges', 'BEVEL')
        modifier.width = bevel
        modifier.segments = 3
        bpy.ops.object.modifier_apply(modifier=modifier.name)
        modifier = obj.modifiers.new('Weighted normals', 'WEIGHTED_NORMAL')
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    obj.rotation_euler.z = -angle
    return obj


def ball(name, p, size, mat, group='Details'):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=1, location=xyz(p))
    obj = finish(bpy.context.object, name, mat, group)
    obj.scale = (size[0], size[2], size[1])
    for face in obj.data.polygons:
        face.use_smooth = True
    return obj


def beam(name, a, b, radius, mat, group='Details', top=None):
    delta = Vector(xyz(b)) - Vector(xyz(a))
    mid = tuple((a[i] + b[i]) / 2 for i in range(3))
    bpy.ops.mesh.primitive_cone_add(vertices=12, radius1=radius,
                                  radius2=radius if top is None else top,
                                  depth=delta.length, location=xyz(mid))
    obj = finish(bpy.context.object, name, mat, group)
    obj.rotation_euler = delta.to_track_quat('Z', 'Y').to_euler()
    return obj


def height(x, z):
    dunes = sum(h * math.exp(-((x-cx)/sx)**2 - ((z-cz)/sz)**2)
                for cx, cz, h, sx, sz in [(-6, -6, 1.6, 3.4, 2.4),
                    (7, -6.5, 2.3, 3.4, 2.9), (8, 6.8, 1.85, 3.2, 2.1),
                    (-5, 7.2, 1.05, 3.8, 1.8)])
    edge = min(1, max(0, (12.65-abs(x))/.9), max(0, (10.65-abs(z))/.9))
    # Keep the bridge approach and oasis shore flat; outer dunes remain walkable.
    path = 1 - math.exp(-((z-3)/1.35)**4) if x < 3 else 1
    oasis = min(1, max(0, (math.hypot((x-1)/1.25, z+1)-2.8)/1.4))
    # A level earthen court supports the caravanserai; dunes rise around it.
    court_distance = max(abs(x+6.6)-3.5, abs(z+4.8)-3.5, 0)
    court = min(1, court_distance / 1.3)
    return dunes * edge * path * oasis * court


# Rounded strata and one continuous triangulated walking surface, including dunes.
box('Desert / rust foundation', (0, -.91, 0), (25, 1.4, 21), 'rock', .7)
box('Desert / warm strata', (0, -.52, 0), (25.3, .62, 21.3), 'strata', .28)
box('Desert / sandstone lip', (0, -.26, 0), (25.5, .30, 21.5), 'sandshade', .15)
nx, nz = 64, 54
verts = [xyz((x, height(x, z), z)) for z in [-10.65 + j*21.3/nz for j in range(nz+1)]
         for x in [-12.65 + i*25.3/nx for i in range(nx+1)]]
faces = []
for j in range(nz):
    for i in range(nx):
        a = j*(nx+1)+i
        faces.extend([(a, a+nx+2, a+1), (a, a+nx+1, a+nx+2)])
# Sand skirts hide the joint with the sculpted underside.
border = list(range(nx+1)) + [j*(nx+1)+nx for j in range(1,nz+1)]
border += list(range(nz*(nx+1)+nx-1,nz*(nx+1)-1,-1))
border += [j*(nx+1) for j in range(nz-1,0,-1)]
for i, a in enumerate(border):
    b = border[(i+1) % len(border)]
    c = len(verts)
    verts.extend([(verts[a][0], verts[a][1], -.25), (verts[b][0], verts[b][1], -.25)])
    faces.append((a, b, c+1, c))
mesh = bpy.data.meshes.new('Rolling sand surface')
mesh.from_pydata(verts, [], faces)
mesh.update()
terrain = bpy.data.objects.new('Desert / continuous dunes', mesh)
groups['Terrain'].objects.link(terrain)
for mat in ('sand', 'sandlight', 'sandshade'):
    mesh.materials.append(M[mat])
for i in range(5):
    t = i/4
    mesh.materials.append(material('Dune / tonal contour %d' % i,
        tuple(M['sand'].diffuse_color[j]*(1-t)+M['sandlight'].diffuse_color[j]*t for j in range(3))))
for face in mesh.polygons:
    # Broad contour bands make the walkable relief readable under shared lighting.
    face.material_index = 3 + min(4, int(max(0, face.center.z)*2.6))
    face.use_smooth = True

# Flat stone bridge: visual and collision share exactly the same mesh.
box('Bridge / continuous deck', (-15, -.20, 3), (6.8, .40, 3.4), 'stone', .05, 'Walkable')
for i in range(11):
    for side in (-1, 1):
        box('Bridge / paving', (-18+i*.6, .012, 3+side*.65), (.55, .024, 1.20),
            'ivory' if i % 3 else 'stone', .015)
for z in (1.38, 4.62):
    box('Bridge / low parapet', (-15, .43, z), (6.65, .78, .25), 'stone', .08, 'Obstacles')
    for x in (-18.1, -15, -11.9):
        box('Bridge / post', (x, .56, z), (.43, 1.08, .45), 'sandshade', .07, 'Obstacles')
        box('Bridge / post cap', (x, 1.13, z), (.56, .14, .56), 'ivory', .04)
for x in (-16.7, -13.3):
    box('Bridge / pier', (x, -.82, 3), (.65, 1.35, 2.85), 'rock', .10)

# An irregular turquoise oasis, sheltered by palms and low sandstone edging.
ball('Oasis / damp bank', (1, .015, -1), (3.65, .09, 2.85), 'wetbank')
ball('Oasis / sand rim', (1, .02, -1), (3.3, .12, 2.55), 'stone')
ball('Oasis / turquoise water', (1, .075, -1), (2.9, .08, 2.15), 'water')
for i in range(25):
    a = i*math.tau/25
    x, z = 1+3.08*math.cos(a), -1+2.35*math.sin(a)
    ball('Oasis / rounded bank', (x, .14, z), (.30, .20, .23), 'stone' if i%3 else 'ivory', 'Obstacles')
# Animated water rings are added by desert.gd and share the game's pause clock.


def palm(x, z, size):
    y = height(x, z)
    crown = (x+.6*size, y+4.8*size, z+.15*size)
    for i in range(12):
        t, u = i/12, (i+1)/12
        a = (x+.6*size*t*t, y+4.8*size*t, z+.15*size*t)
        b = (x+.6*size*u*u, y+4.8*size*u, z+.15*size*u)
        beam('Palm / leaning trunk', a, b, (.24-.1*t)*size, 'trunk', 'Obstacles', (.24-.1*u)*size)
        ball('Palm / old frond scar', a, ((.25-.1*t)*size,.065*size,(.25-.1*t)*size), 'sandshade')
    # Each drooping frond has separate narrow leaflets, giving a feathery silhouette.
    points, faces = [], []
    for i in range(13):
        a = i*math.tau/13 + .15*math.sin(i*3)
        length = (2.6+.4*math.sin(i*2))*size
        tip_drop = 1.15 if i%3 else .55
        last = crown
        for j in range(1,10):
            t = j/9
            center = (crown[0]+math.cos(a)*length*t,
                crown[1]+math.sin(math.pi*t)*.62*size-t*t*tip_drop*size,
                crown[2]+math.sin(a)*length*t)
            beam('Palm / frond rib', last, center, .022*size, 'palm')
            last = center
            if j==9:
                continue
            for side in (-1,1):
                spread = (.16+.58*math.sin(math.pi*t))*size
                tip = (center[0]-math.sin(a)*spread*side+math.cos(a)*.30*size,
                    center[1]-.22*size, center[2]+math.cos(a)*spread*side+math.sin(a)*.30*size)
                n=len(points)
                points.extend([xyz(center), xyz((center[0]+math.cos(a)*.15*size,center[1]+.04*size,center[2]+math.sin(a)*.15*size)),
                    xyz(tip), xyz((center[0]-math.cos(a)*.09*size,center[1]-.03*size,center[2]-math.sin(a)*.09*size))])
                faces.extend([(n,n+1,n+2),(n,n+2,n+3)])
    leafmesh=bpy.data.meshes.new('Pinnate palm crown')
    leafmesh.from_pydata(points,[],faces)
    leafmesh.materials.append(M['palm'])
    leafmesh.materials.append(M['leaflight'])
    for face in leafmesh.polygons:
        face.material_index=(face.index//32)%2
    leafmesh.update()
    obj=bpy.data.objects.new('Palm / hundreds of tapered leaflets',leafmesh)
    groups['Details'].objects.link(obj)
    for i in range(3):
        ball('Palm / dates', (crown[0]+(i-1)*.22, crown[1]-.17, z+.17), (.16,.23,.16), 'gold')


for x, z, scale in [(-2.6,-3,1.12),(3.9,-3.5,1.20),(4.8,.9,.95),(-8,5.8,.85),(1.6,-4.8,.9)]:
    palm(x,z,scale)

# A broken sandstone gateway and a striped wayfarer's shelter give the island a landmark.
for x in (5.3, 8.7):
    y = height(x, -5)
    for j in range(6):
        box('Sun gate / sandstone block', (x, y+.30+j*.55, -5),
            (.86,.52,.90), 'stone' if j%2 else 'sandshade', .08, 'Obstacles', angle=(j%2)*.035)
    box('Sun gate / capital', (x,y+3.42,-5), (1.12,.22,1.1), 'ivory', .07, 'Obstacles')
box('Sun gate / lintel', (7, max(height(5.3,-5),height(8.7,-5))+3.68,-5),
    (4.55,.45,1.04), 'stone', .09, 'Obstacles')
for i in range(4):
    ball('Ruins / fallen sandstone', (5.5+i*.7, height(5.5+i*.7,-2.9)+.25,-2.9),
         (.44,.32,.40), 'rock', 'Obstacles')
for x in (-7.7,-4.5):
    for z in (-2.1,.3):
        y = height(x,z)
        beam('Shelter / post',(x,y,z),(x,2.15,z),.075,'trunk','Obstacles')
for i in range(8):
    box('Shelter / woven canopy',(-7.7+i*.46,2.17,-.9),(.47,.06,2.8),
        'cloth' if i%2 else 'ivory',.02)
for x,z in [(-7,-.7),(-5.1,-1.3)]:
    ball('Shelter / clay jar',(x,.35,z),(.32,.43,.32),'rock','Obstacles')
    beam('Shelter / jar neck',(x,.55,z),(x,.84,z),.14,'sandshade')


def cactus(x, z, scale):
    y = height(x,z)
    ball('Cactus / upright',(x,y+.85*scale,z),(.30*scale,.92*scale,.30*scale),'cactus','Obstacles')
    for side in (-1,1):
        endx = x+side*.62*scale
        beam('Cactus / arm',(x,y+.65*scale,z),(endx,y+.65*scale,z),.14*scale,'cactus','Obstacles')
        ball('Cactus / upturned arm',(endx,y+1.02*scale,z),(.17*scale,.48*scale,.17*scale),'cactuslight','Obstacles')
    ball('Cactus / coral blossom',(x,y+1.78*scale,z),(.16,.11,.16),'flower')


for x,z,s in [(-10.8,-7,.9),(-10,0,.75),(-3,-8.8,.65),(10,-3,1.1),(9,3,.7),
              (5,8,1),(-8,8,.6),(11,7,.65),(-1,7,.75)]:
    cactus(x,z,s)
# Wind-carved outcrops are grouped around the dunes, leaving the central route open.
for x,z,scale in [(10.2,-8.1,1.4),(8.5,7.6,.65),(-5.3,7.8,.55)]:
    y = height(x,z)
    for j in range(3):
        box('Outcrop / eroded stratum',(x+j*.10,y+.36+j*.55*scale,z),
            ((1.9-j*.28)*scale,.68*scale,(1.5-j*.20)*scale),
            'rock' if j%2 == 0 else 'sandshade',.20*scale,'Obstacles',angle=j*.10)
    for dx,dz,s in [(-1.1,.7,.55),(.9,.6,.42),(.5,-.7,.33)]:
        px,pz = x+dx*scale,z+dz*scale
        ball('Outcrop / scattered sandstone',(px,height(px,pz)+s*.4,pz),
            (s,s*.6,s*.7),'rock','Obstacles')
# A loose route from the bridge to the oasis; stones are decoration, not ankle-high barriers.
for i in range(16):
    x = -11.6+i*.72
    z = 3-.055*i
    box('Oasis trail / worn flagstone',(x,height(x,z)+.018,z),(.48,.035,.48),
        'stone',.05,angle=random.uniform(-.25,.25))
for i in range(65):
    x,z = random.uniform(-11.5,11.5),random.uniform(-9.5,9.5)
    if (x-1)**2+(z+1)**2 < 17 or (x < 4 and 1.4 < z < 4.7) or (x < -3 and z < -1.4):
        continue
    y = height(x,z)
    if i%3 == 0:
        ball('Desert / wind polished pebble',(x,y+.10,z),(.18,.13,.13),'rock')
    else:
        for j in range(3):
            beam('Desert / dry grass',(x,y,z),(x+(j-1)*.11,y+.22+random.random()*.13,z+.08),.015,'gold')

# Wind combs, half-buried stones and paired footprints follow the sand surface.
for cx,cz,width in [(6.8,-7.5,2.8),(7.8,6.4,2.4),(-5,6.3,2.4),(-.5,7.8,1.9)]:
    for row in range(5):
        points = []
        span = width * (.55 + .25*math.sin(row*.9+1))
        for j in range(11):
            x = cx+(j/10-.5)*span*2+row*.06
            z = cz+(row-2)*.22+.20*math.sin(j/10*math.pi)
            points.append((x,height(x,z)+.014,z))
        for a,b in zip(points,points[1:]):
            beam('Dunes / wind comb',a,b,.012,'ripplesand')
for i in range(24):
    x = -10.8+i*.36
    z = 3.75+.14*math.sin(i*.30)
    box('Trail / footprint',(x,height(x,z)+.009,z+(.13 if i%2 else -.13)),
        (.14,.014,.075),'sandshade',.025,angle=.15)

# A lived-in camp: layered woven rugs, cushions, a tea tray, baskets and provisions.
box('Camp / terracotta carpet',(-6.1,.038,-.7),(2.75,.05,1.8),'rug',.03)
for side in (-1,1):
    box('Camp / carpet border',(-6.1,.069,-.7+side*.73),(2.55,.012,.12),'ivory',.005)
for i in range(7):
    box('Camp / woven diamond',(-7.15+i*.35,.072,-.7),(.17,.018,.17),'gold',.01,angle=math.pi/4)
for x in (-7.56,-4.64):
    for i in range(12):
        beam('Camp / tassel',(x,.05,-1.45+i*.13),(x+(-.15 if x < -6 else .15),.03,-1.45+i*.13),.014,'ivory')
for x,z in [(-6.95,-1.2),(-5.1,-.1),(-6.8,.12)]:
    box('Camp / cushion',(x,.16,z),(.65,.25,.48),'cloth',.12,angle=.13)
box('Camp / low tea table',(-6,.32,-.8),(.85,.15,.65),'trunk',.06,'Obstacles')
ball('Camp / brass tea tray',(-6,.414,-.8),(.38,.025,.26),'gold')
ball('Camp / teapot',(-6,.53,-.82),(.12,.13,.12),'cloth')
beam('Camp / teapot spout',(-5.92,.53,-.82),(-5.78,.62,-.82),.035,'cloth')
for x in (-6.22,-5.82):
    beam('Camp / tea cup',(x,.43,-.63),(x,.52,-.63),.055,'ivory')
for x,z in [(-8.3,-1.8),(-8.45,-.7),(-4.1,-1.7)]:
    y=height(x,z)
    beam('Camp / woven basket',(x,y,z),(x,y+.48,z),.29,'gold','Obstacles',.34)
    for j in range(4):
        bpy.ops.mesh.primitive_torus_add(major_radius=.29+j*.01,minor_radius=.025,
            major_segments=16,minor_segments=5,location=xyz((x,y+.09+j*.11,z)))
        finish(bpy.context.object,'Camp / basket weave','trunk')
    for j in range(7):
        a=j*math.tau/7
        ball('Camp / dates and fruit',(x+.17*math.cos(a),y+.49,z+.17*math.sin(a)),(.09,.10,.09),'flower' if j%3 else 'gold')
# Small stone fire ring and cold logs: a resting place, not another bright light source.
for i in range(10):
    a=i*math.tau/10
    x,z=-5.3+.55*math.cos(a),1+.45*math.sin(a)
    ball('Camp / fire ring',(x,height(x,z)+.11,z),(.15,.13,.14),'rock','Obstacles')
for dz in (-.15,.15):
    beam('Camp / charred firewood',(-5.65,.11,1+dz),(-4.98,.12,1-dz),.085,'trunk')
beam('Camp / flagpole',(-4.3,0,.4),(-4.3,3,.4),.055,'trunk','Obstacles')

# Plants grow in sheltered clusters near water and rock, rather than uniform scatter.
for i in range(18):
    a=i*math.tau/18
    if .1 < a < 1.1 or 2.3 < a < 3.2:
        continue
    x,z=1+3.38*math.cos(a),-1+2.68*math.sin(a)
    y=height(x,z)
    for j in range(5):
        dx,dz=random.uniform(-.24,.24),random.uniform(-.18,.18)
        end=(x+dx*1.7,y+.45+random.random()*.5,z+dz*1.7)
        beam('Oasis / reed',(x+dx,y,z+dz),end,.023,'reeds')
        if j%2==0:
            ball('Oasis / reed seedhead',(end[0],end[1]+.07,end[2]),(.045,.13,.045),'rock')
for cx,cz in [(-3,-4),(4.8,-2.8),(4.4,1.6),(-7.8,6.3),(-9.6,-6.8),(8.8,-8.6),(6.2,8.8)]:
    for j in range(6):
        x,z=cx+random.uniform(-.65,.65),cz+random.uniform(-.45,.45)
        y=height(x,z)
        ball('Desert garden / sage bush',(x,y+.16,z),(.28,.22,.25),'palm' if j%2 else 'leaflight')
        if j%2:
            for k in range(3):
                ball('Desert garden / bloom',(x+(k-1)*.13,y+.34,z),(.07,.065,.065),'flower')
for x,z in [(2,-2.3),(.3,-1.9),(2.5,-.6)]:
    ball('Oasis / lily pad',(x,.16,z),(.26,.017,.18),'palm')
    for i in range(5):
        a=i*math.tau/5
        ball('Oasis / lotus petal',(x+.075*math.cos(a),.20,z+.075*math.sin(a)),(.09,.04,.06),'flower')
    ball('Oasis / lotus heart',(x,.22,z),(.04,.035,.04),'gold')

# Ruin masonry and a sun medallion make the gateway feel like a place with history.
gate_y=max(height(5.3,-5),height(8.7,-5))+3.68
beam('Sun gate / teal medallion',(7,gate_y,-4.45),(7,gate_y,-4.39),.30,'cloth')
beam('Sun gate / sun disc',(7,gate_y,-4.38),(7,gate_y,-4.35),.14,'gold')
for i in range(8):
    a=i*math.tau/8
    beam('Sun gate / sun ray',(7+.19*math.cos(a),gate_y+.19*math.sin(a),-4.34),
         (7+.26*math.cos(a),gate_y+.26*math.sin(a),-4.34),.022,'gold')
for i in range(6):
    x,z=5.4+i*.55,-6.2
    y=height(x,z)
    box('Ruins / buried paving',(x,y+.025,z),(.44,.045,.52),'stone',.04,angle=i*.10)
for x,z in [(4.3,-5.6),(9.4,-4.8),(7.6,-3.4)]:
    for j in range(3):
        px,pz=x+j*.25,z+math.sin(j)*.24
        box('Ruins / broken tile',(px,height(px,pz)+.09,pz),(.33,.16,.25),'rock',.06,angle=j*.5)
for x,z in [(-10.2,4.8),(-.8,4.5)]:
    y=height(x,z)
    beam('Trail / waymarker post',(x,y,z),(x,y+1.25,z),.065,'trunk','Obstacles')
    box('Trail / arrow board',(x+.16,y+1.12,z),(.85,.25,.10),'cloth',.05)
    box('Trail / arrow tip',(x+.56,y+1.12,z),(.20,.20,.12),'gold',.025,angle=.78)

# The settlement gives the oasis a destination and a coherent cluster of lived-in details.
build_settlement = runpy.run_path(str(ROOT/'art/desert_settlement.py'))['build_settlement']
build_settlement(box, ball, beam, height, xyz, finish, groups, M)

# Preserve editable objects; merge only export copies into named collision categories.
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'art/desert.blend'))
bpy.ops.object.select_all(action='DESELECT')
merged_objects = []
for name, collection in groups.items():
    copies = []
    for source in list(collection.objects):
        obj = source.copy()
        obj.data = source.data.copy()
        bpy.context.scene.collection.objects.link(obj)
        obj.select_set(True)
        copies.append(obj)
    bpy.context.view_layer.objects.active = copies[0]
    bpy.ops.object.join()
    merged = bpy.context.object
    merged.name = name
    merged_objects.append(merged)
    bpy.ops.object.select_all(action='DESELECT')
for obj in merged_objects:
    obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(ROOT/'assets/desert.glb'),export_format='GLB',
                          use_selection=True,export_yup=True,export_animations=False)
print('DESERT_ASSETS_OK', flush=True)
