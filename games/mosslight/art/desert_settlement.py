"""Caravanserai, oasis court and clustered everyday details for the desert tile.

Called only by generate_desert.py. All coordinates use Godot's Y-up convention.
"""
import math
import random

import bpy


def build_settlement(box, ball, beam, height, xyz, finish, groups, materials):
    rng = random.Random(617)

    def arch(name, x, y, z, radius, spring, depth, mat='plaster'):
        # A true open arch, with individual wedge stones and physical side piers.
        for side in (-1, 1):
            box(name+' / pier', (x+side*(radius+.25), y+spring/2, z),
                (.5, spring, depth), mat, .055, 'Obstacles')
            box(name+' / foot', (x+side*(radius+.25), y+.15, z),
                (.66,.30,depth+.18), 'stone', .055, 'Obstacles')
        for i in range(13):
            a, b = i*math.pi/13+.009, (i+1)*math.pi/13-.009
            vertices=[]
            for dz in (-depth/2,depth/2):
                for r,t in [(radius,a),(radius,b),(radius+.48,b),(radius+.48,a)]:
                    vertices.append(xyz((x+r*math.cos(t),y+spring+r*math.sin(t),z+dz)))
            mesh=bpy.data.meshes.new(name+' wedge')
            mesh.from_pydata(vertices,[],[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)])
            mesh.update()
            obj=bpy.data.objects.new(name+' / voussoir',mesh)
            groups['Obstacles'].objects.link(obj)
            mesh.materials.append(materials['plasterlight' if i%3==0 else mat])

    def jar(name, x, y, z, size=1, mat='rock'):
        # Open neck, rolled lip, decorative bands and two curved handles.
        profile=[(.14,0),(.30,.13),(.33,.43),(.26,.65),(.13,.77),(.13,.87),(.17,.90),(.17,.96),(.11,.96),(.10,.83)]
        vertices=[xyz((x+r*size*math.cos(i*math.tau/20),y+h*size,z+r*size*math.sin(i*math.tau/20)))
            for r,h in profile for i in range(20)]
        faces=[]
        for row in range(len(profile)-1):
            for i in range(20):
                a=row*20+i;b=row*20+(i+1)%20
                faces.append((a,b,b+20,a+20))
        mesh=bpy.data.meshes.new('Thrown ceramic profile');mesh.from_pydata(vertices,[],faces);mesh.update()
        obj=bpy.data.objects.new(name,mesh);groups['Details'].objects.link(obj);mesh.materials.append(materials[mat])
        for polygon in mesh.polygons:polygon.use_smooth=True
        for h,r in [(.18,.31),(.57,.29),(.91,.17)]:
            bpy.ops.mesh.primitive_torus_add(major_radius=r*size,minor_radius=.018*size,
                major_segments=20,minor_segments=5,location=xyz((x,y+h*size,z)))
            finish(bpy.context.object,name+' / painted band','linen' if mat=='rock' else 'gold')
        for side in (-1,1):
            points=[(x+side*.14*size,y+.80*size,z),(x+side*.38*size,y+.77*size,z),
                (x+side*.42*size,y+.50*size,z),(x+side*.28*size,y+.40*size,z)]
            for a,b in zip(points,points[1:]):beam(name+' / handle',a,b,.035*size,mat)

    def lattice(x, y, z, w, h):
        box('Window / deep recess',(x,y,z),(w,h,.10),'shadowwood',.08)
        for dx in (-w/2,w/2):box('Window / carved jamb',(x+dx,y,z+.075),(.12,h+.18,.15),'plasterlight',.035)
        for dy in (-h/2,h/2):box('Window / lintel',(x,y+dy,z+.09),(w+.22,.12,.18),'plasterlight',.03)
        for i in range(1,6):
            dx=-w/2+i*w/6
            beam('Window / mashrabiya',(x+dx,y-h/2,z+.11),(x+dx,y+h/2,z+.11),.025,'trunk')
        for i in range(1,5):
            dy=-h/2+i*h/5
            beam('Window / lattice',(x-w/2,y+dy,z+.13),(x+w/2,y+dy,z+.13),.025,'trunk')

    # The main landmark is a shaded adobe inn, open toward the spring and market.
    box('Caravanserai / flush courtyard',(-6.4,-.065,-5.4),(7.1,.13,5.6),'stone',.08,'Walkable')
    box('Caravanserai / rear wall',(-6.4,2.1,-8),(7.2,4.2,.52),'adobe',.15,'Obstacles')
    for x in (-9.8,-3.0):
        box('Caravanserai / side wall',(x,2.1,-5.7),(.48,4.2,4.6),'adobe',.15,'Obstacles')
        box('Caravanserai / buttress',(x,1,-3.8),(.70,2,.78),'plaster',.12,'Obstacles')
    arch('Caravanserai / welcoming arch',-6.05,0,-3.3,1.12,1.8,.5)
    box('Caravanserai / left facade',(-8.8,2.05,-3.3),(2.15,4.1,.5),'adobe',.12,'Obstacles')
    box('Caravanserai / right facade',(-3.67,2.05,-3.3),(1.15,4.1,.5),'adobe',.12,'Obstacles')
    box('Caravanserai / arch head',(-6.05,3.85,-3.3),(3.1,.50,.5),'adobe',.06,'Obstacles')
    box('Caravanserai / deep roof',(-6.4,4.17,-5.5),(7.4,.27,5.7),'plaster',.1,'Obstacles')
    for z in (-8.22,-2.75):
        box('Caravanserai / roof coping',(-6.4,4.47,z),(7.5,.34,.25),'plasterlight',.065,'Obstacles')
    for x in (-10,-2.8):box('Caravanserai / roof side',(x,4.47,-5.5),(.24,.34,5.7),'plasterlight',.065,'Obstacles')
    for x in [-9.65+i*.59 for i in range(12)]:
        beam('Caravanserai / projecting timber',(x,3.91,-3.5),(x,3.91,-2.55),.085,'shadowwood')
    for x in (-8.7,-3.65):lattice(x,2.45,-3.005,.68,1.05)
    for row in range(3):
        for i in range(6):
            box('Caravanserai / exposed bricks',(-9.6+i*.27+(row%2)*.12,.24+row*.17,-3.02),(.23,.12,.04),
                'stone' if (row+i)%3 else 'sandshade',.018)
    # A taller windcatcher anchors the silhouette; its openings have real depth.
    box('Wind tower / tapered base',(-9,3.4,-6.6),(2.65,6.8,2.75),'adobe',.23,'Obstacles')
    box('Wind tower / belt',(-9,5.45,-6.6),(2.8,.2,2.9),'plasterlight',.065)
    box('Wind tower / top floor',(-9,6.87,-6.6),(2.9,.20,3),'stone',.07,'Obstacles')
    for x in (-10.05,-7.95):
        for z in (-7.65,-5.55):box('Wind tower / ventilation pier',(x,7.55,z),(.45,1.3,.45),'plaster',.07,'Obstacles')
    for x in (-9.45,-8.55):box('Wind tower / air divider',(x,7.56,-6.6),(.10,1.3,2.1),'adobe',.02)
    box('Wind tower / cap',(-9,8.24,-6.6),(3.10,.25,3.2),'plasterlight',.10,'Obstacles')
    for x in (-10.2,-9.4,-8.6,-7.8):
        for z in (-7.8,-5.4):box('Wind tower / crown',(x,8.54,z),(.35,.45,.45),'adobe',.06)
    lattice(-9,4.2,-5.19,.74,1.1)
    lattice(-9,1.75,-5.19,.60,.88)
    # Rounded roof dome and a small shaded roof terrace.
    ball('Caravanserai / terracotta dome',(-5.4,4.35,-6.25),(1.45,1.40,1.45),'plaster')
    beam('Caravanserai / dome finial',(-5.4,5.7,-6.25),(-5.4,6.16,-6.25),.06,'gold')
    ball('Caravanserai / finial bead',(-5.4,6.03,-6.25),(.11,.12,.11),'glaze')
    for x in (-7.6,-3.35):
        for z in (-4.7,-3.2):beam('Roof terrace / pergola post',(x,4.4,z),(x,5.65,z),.06,'trunk')
    for i in range(13):box('Roof terrace / reed shade',(-7.6+i*.35,5.68,-3.95),(.20,.07,1.9),'trunk',.015)
    box('Roof terrace / rolled rug',(-4.4,4.54,-3.6),(1.6,.22,.40),'rug',.1)
    jar('Roof terrace / urn',-3.6,4.35,-4.05,.67,'glaze')
    # Interior furnishings remain visible through the entry arch.
    box('Inn / inner rug',(-6.15,.02,-5.65),(2.9,.04,3.1),'rug',.02)
    for side in (-1,1):box('Inn / woven border',(-6.15+side*1.31,.047,-5.65),(.10,.015,2.9),'gold',.005)
    box('Inn / low bench',(-3.7,.30,-6.25),(.9,.6,2.4),'trunk',.08,'Obstacles')
    for z in (-7,-6.2,-5.4):box('Inn / pillows',(-3.7,.69,z),(.75,.19,.61),'cloth',.1)
    box('Inn / supply chest',(-8.85,.38,-7.2),(1.25,.76,.82),'trunk',.09,'Obstacles')
    for dx in (-.43,.43):box('Inn / chest binding',(-8.85+dx,.4,-6.775),(.07,.65,.04),'gold',.01)
    for x,z,s,mat in [(-7.6,-7.1,.95,'rock'),(-7.1,-7.25,.7,'glaze'),(-4.2,-7.35,1,'rock')]:jar('Inn / stored amphora',x,0,z,s,mat)
    # A mosaic threshold gives the entrance a focal detail at walking distance.
    for i in range(9):
        for j in range(3):
            box('Inn / threshold mosaic',(-7.05+i*.25,.018,-2.98+j*.25),(.21,.035,.21),
                'glaze' if (i+j)%2 else 'ivory',.01)

    # Market overflow is attached to the inn, not scattered across empty sand.
    for x,z,s,mat in [(-8.9,-2.05,1.1,'rock'),(-9.5,-1.6,.68,'glaze'),(-3.1,-2.5,.95,'glaze'),(-3.65,-2.05,.62,'rock')]:
        jar('Potter / painted amphora',x,height(x,z),z,s,mat)
    for row in range(3):
        for col in range(3-row):
            x=-9.45+col*.44+row*.12;z=-2.75
            box('Merchant / cloth bundle',(x,.16+row*.29,z),(.46,.28,.48),'linen' if col%2 else 'rug',.08)
            box('Merchant / bundle strap',(x,.16+row*.29,z+.247),(.055,.25,.02),'trunk',.005)
    box('Merchant / produce counter',(-3.3,.47,-.6),(1.1,.94,1.5),'trunk',.06,'Obstacles')
    for z in (-1.02,-.22):
        box('Merchant / shallow crate',(-3.3,.99,z),(.98,.12,.61),'sandshade',.03)
        for i in range(8):ball('Merchant / lemons and dates',(-3.64+(i%4)*.22,1.12,z-.13+(i//4)*.25),(.10,.10,.09),'gold' if z<-.5 else 'flower')
    for x in (-3.9,-2.75):beam('Merchant / canopy upright',(x,0,-1.4),(x,2.5,-1.4),.045,'trunk','Obstacles')
    for i in range(6):box('Merchant / hanging rug',(-3.8+i*.2,1.65,-1.4),(.205,1.6,.03),'rug' if i%3 else 'gold',.01)
    # Hanging lanterns are small warm brass forms rather than new bright lights.
    for x,y,z in [(-4.55,2.8,-2.9),(-7.55,2.8,-2.9),(-3.6,5.4,-3.35)]:
        beam('Lantern / suspension',(x,y+.38,z),(x,y,z),.015,'shadowwood')
        ball('Lantern / amber glass',(x,y-.15,z),(.14,.22,.14),'gold')
        for dx in (-.12,.12):beam('Lantern / brass frame',(x+dx,y+.04,z),(x+dx,y-.36,z),.018,'trunk')
        box('Lantern / cap',(x,y+.065,z),(.34,.075,.30),'trunk',.045)

    # A shaded stone water pavilion sits on the rear shore, balancing the inn.
    for x in (.1,1.8):
        for z in (-4.9,-3.8):beam('Spring pavilion / column',(x,0,z),(x,2.45,z),.11,'stone','Obstacles')
    for i in range(10):box('Spring pavilion / slatted roof',(.0+i*.21,2.5,-4.35),(.13,.11,1.55),'trunk',.025)
    box('Spring pavilion / draw basin',(.95,.31,-4.32),(1.45,.62,.86),'stone',.14,'Obstacles')
    ball('Spring pavilion / water',(.95,.63,-4.32),(.56,.018,.25),'water')
    jar('Spring pavilion / drinking pitcher',1.96,0,-3.56,.68,'glaze')
    # Boarded overlook, woven screen and a pair of resting cushions beside the water.
    for i in range(9):box('Oasis / little boardwalk',(3.15+i*.19,.16,1.35),(.16,.08,1.05),'trunk',.02,'Walkable')
    for x in (3.05,4.85):beam('Oasis / shade pole',(x,0,1.9),(x,1.55,1.9),.045,'trunk','Obstacles')
    for i in range(11):box('Oasis / woven reed screen',(3.1+i*.17,.8,1.93),(.09,1.3,.035),'reeds',.01)
    for x in (3.45,4.15):box('Oasis / resting cushion',(x,.28,1.38),(.5,.16,.6),'cloth',.085)

    # Dense growth follows the damp shore, fading into sparse desert scrub.
    for i in range(85):
        a=rng.random()*math.tau
        # Leave the southwest arrival and the little boardwalk readable and open.
        if .5<a<1.15 or 1.6<a<2.5:continue
        r=rng.uniform(1,1.25)
        x,z=1+3.1*r*math.cos(a),-1+2.5*r*math.sin(a)
        y=height(x,z)
        for j in range(3):
            dx,dz=rng.uniform(-.15,.15),rng.uniform(-.15,.15)
            beam('Oasis / waterside grass',(x+dx,y,z+dz),(x+dx*2,y+.24+rng.random()*.4,z+dz*2),.022,'palm' if i%2 else 'reeds')
        if i%4==0:
            ball('Oasis / clustered foliage',(x,y+.18,z),(.31,.27,.29),'palm')
            for j in range(3):ball('Oasis / small white flower',(x+(j-1)*.13,y+.37,z+.08),(.06,.05,.05),'ivory')
    # A curved sequence leads from the arrival path around the east shore to the ruins.
    for i in range(19):
        a=1.48-i*.14
        x,z=1+5*math.cos(a),-1+4.3*math.sin(a)
        box('Pilgrim route / worn stone',(x,height(x,z)+.02,z),(.54,.04,.48),'stone',.045,angle=a)
    # The old gate gains a broken enclosure and carved, alternating bands.
    for x,z,n in [(9.55,-5.8,4),(5.0,-6.8,3)]:
        y=height(x,z)
        for row in range(n):
            for col in range(3 if row<n-1 else 2):
                box('Ruins / broken enclosure',(x+(.42*col),y+.2+row*.42,z),(.40,.39,.66),
                    'adobe' if row%2 else 'stone',.07,'Obstacles')
    for x in (5.3,8.7):
        y=height(x,-5)
        for row in (1,3,5):
            box('Sun gate / turquoise inlay',(x,y+.3+row*.55,-4.535),(.62,.10,.025),'glaze',.01)
    # Weathered foundations and grouped stones tie the silhouettes into the sand.
    for i in range(38):
        x,z=rng.choice([(-10.4,-4.8),(-2.6,-7.6),(10,-7.8),(7.8,-8.5)])
        x+=rng.uniform(-.7,.7);z+=rng.uniform(-.6,.6)
        y=height(x,z);s=rng.uniform(.10,.25)
        ball('Foundation / wind gathered rubble',(x,y+s*.35,z),(s,s*.5,s*.7),'sandshade' if i%3 else 'stone')
