"""Scene dressing pass executed by generate_assets.py with its modeling context.

Decorative clusters stay outside the main walkway and the sanctuary approach.
Grass is one authored mesh; exports batch by material while source props stay editable.
"""
active = world
random.seed(203)
M['patch'] = mat('27 · soft clover patches', (.28,.41,.19))
M['fern'] = mat('28 · fern green', (.24,.38,.18))
M['blueflower'] = mat('29 · forget-me-not blue', (.36,.61,.67))


def flower(x, y, z, petal='flower', size=1):
    beam('Garden / flower stem', (x,y,z), (x,y+.27*size,z), .018*size, 'leaf')
    for n in range(5):
        a = n*math.tau/5
        ball('Garden / rounded petals', (x+math.cos(a)*.07*size,y+.27*size,z+math.sin(a)*.07*size),
             (.06*size,.028*size,.06*size),petal)
    ball('Garden / pollen', (x,y+.29*size,z),(.03*size,.023*size,.03*size),'gold')


# The cottage now reads as somebody's home: trim, shutters, garden and tools.
for x in [-8.91,-5.69]:
    box('Cottage / timber corner', (x,1.4,-1.11),(.12,2.04,.12),'plank',.025)
box('Cottage / timber lintel',(-7.3,2.41,-1.13),(3.36,.14,.12),'wood',.025)
for z in [-4.05,-1.14]:
    mesh = bpy.data.meshes.new('Cottage gable mesh')
    mesh.from_pydata([xyz((-8.92,2.43,z)),xyz((-5.68,2.43,z)),xyz((-7.3,3.38,z))],[],[(0,1,2)])
    obj=bpy.data.objects.new('Cottage / plaster gable',mesh)
    active.objects.link(obj)
    mesh.materials.append(M['cream'])
for x in [-8.42,-6.24]:
    for side in [-1,1]:
        box('Cottage / teal shutter',(x+side*.37,1.72,-1.06),(.16,.69,.12),'teal',.025)
        for y in [1.50,1.69,1.88]:
            box('Cottage / shutter slat',(x+side*.37,y,-.98),(.15,.035,.025),'leaflight',.008)
    box('Cottage / window flower box',(x,1.25,-.87),(.85,.23,.39),'plank',.04)
    box('Cottage / flower box soil',(x,1.375,-.87),(.73,.025,.28),'soil',.01)
    for dx in [-.26,0,.26]:
        ball('Cottage / window foliage',(x+dx,1.40,-.85),(.14,.11,.16),'leaflight')
        flower(x+dx,1.40,-.80,'pink' if dx == 0 else 'flower',.65)
for y in [.59,.90,1.21,1.52]:
    box('Cottage / door plank seam',(-7.4,y,-.984),(.56,.018,.015),'plank',.005)

# Bench, terracotta pots, a rain barrel and a small carrot bed.
for x in [-9.15,-8.35]:
    for z in [.4,.8]:
        box('Garden / bench leg',(x,.22,z),(.1,.43,.11),'wood',.018)
box('Garden / bench seat',(-8.75,.47,.6),(1.1,.12,.62),'plank',.04)
collider((-8.75,.25,.6),(1.1,.5,.62),'garden bench')
for x,z,r in [(-5.5,-.8,.24),(-5.15,-1.3,.32),(-8.7,-.1,.19)]:
    cylinder('Garden / terracotta pot',(x,r*.7,z),r,1.4*r,'roof',r*.85)
    ring('Garden / pot rim',(x,r*1.4,z),r*.87,.03,'rooflight')
    for j in range(3):
        a=j*math.tau/3
        ball('Garden / pot leaves',(x+math.cos(a)*.10,r*1.7,z+math.sin(a)*.10),(.16,.13,.16),'leaflight')
    flower(x,r*1.7,z,'pink',.8)
cylinder('Garden / rain barrel',(-9.45,.48,-2.0),.41,.90,'plank',.36)
for y in [.15,.75]:
    ring('Garden / barrel hoop',(-9.45,y,-2.0),.40,.035,'wood')
cylinder('Garden / barrel water',(-9.45,.94,-2.0),.31,.025,'water')
collider((-9.45,.47,-2.0),(.78,.94,.78),'rain barrel')
box('Garden / raised bed',(-9.0,.13,2.0),(2.1,.18,1.1),'soil',.10)
for z in [1.45,2.55]:
    box('Garden / bed border',(-9,.18,z),(2.2,.22,.09),'plank',.02)
for x in [-10.08,-7.92]:
    box('Garden / bed border',(x,.18,2.0),(.09,.22,1.15),'plank',.02)
for x in [-9.7,-9.25,-8.8,-8.35]:
    for z in [1.75,2.2]:
        ball('Garden / carrot shoulder',(x,.23,z),(.07,.09,.07),'coat')
        for dx in [-.08,0,.08]:
            blade=ball('Garden / carrot leaf',(x+dx,.36,z),(.055,.18,.03),'fern')
            blade.rotation_euler.y=dx*4
# The portable watering can is exported separately by art/extract_watering_can.py.
beam('Garden / leaning broom',(-5.6,.13,-2.2),(-5.55,1.37,-2.6),.027,'wood')
cylinder('Garden / broom bristles',(-5.6,.16,-2.2),.13,.30,'path',.045)

# Conifers alternate with the round canopies, giving the forest a layered edge.
for x,z,s in [(-10.9,-8.8,.95),(-8.1,-9.1,.78),(-3.7,-8.9,.93),
               (5.7,-8.8,.90),(10.7,-8.0,1.10),
               (-11.2,8.1,.84),(11.1,8.5,.83)]:
    cylinder('Fir / trunk',(x,.65*s,z),.16*s,1.3*s,'wood',.10*s)
    for j in range(4):
        crown=cylinder('Fir / soft layered bough',(x,(1.25+j*.57)*s,z),
                       (1.05-j*.19)*s,1.40*s,'leaf' if j%2 else 'leaflight',.07*s,vertices=24)
    ball('Fir / light tip',(x,3.6*s,z),(.11*s,.20*s,.11*s),'leafyellow')
    collider((x,.75,z),(.32,1.5,.32),'fir trunk')

clusters=[(-10,-5.0),(-6.3,-8.7),(-4.1,-7.0),(-10.8,2.6),(-9.5,7.5),
          (-6.7,7.8),(-3.8,8.9),(2.6,8.9),(7.4,8.3),(9.7,6.8),
          (10.4,-3.3),(8.8,-7.6),(5.6,-7.5),(-3.4,-5.9)]
for n,(x,z) in enumerate(clusters):
    for j in range(4):
        dx,dz=random.uniform(-.65,.65),random.uniform(-.40,.40)
        r=random.uniform(.28,.48)
        ball('Understory / rounded shrub',(x+dx,r*.6,z+dz),(r,r*.8,r*.85),
             'leaf' if j%3 == 0 else 'leaflight',True)
        if n%3==0 and j%2==0:
            for k in range(3):
                ball('Understory / berries',(x+dx+(k-1)*.09,r*1.35,z+dz+.09),(.05,.05,.05),'pink')
    rock=ball('Understory / mossy rock',(x+.7,.18,z+.15),(.34,.23,.29),'stone',True)
    ball('Understory / rock moss',(x+.7,.34,z+.15),(.26,.07,.20),'patch',True)

# Irregular moss patches and a single batched mesh of varied grass tufts.
grass_vertices=[]
grass_faces=[]
patch_centers=[(-5.0,5.4,1.5),(-6.7,1.6,1.0),(-3.1,-1.1,1.3),(3.0,5.6,1.3),
               (3.1,-1.2,1.0),(-10,6.5,1.1),(8.2,6.8,1.3),(10,-3.8,1.1)]
for cx,cz,radius in patch_centers:
    verts=[xyz((cx,.072,cz))]
    for i in range(16):
        a=i*math.tau/16
        r=radius*random.uniform(.7,1.15)
        verts.append(xyz((cx+math.cos(a)*r,.073,cz+math.sin(a)*r*.68)))
    mesh=bpy.data.meshes.new('Clover patch mesh')
    mesh.from_pydata(verts,[],[(0,i+1,(i+1)%16+1) for i in range(16)])
    obj=bpy.data.objects.new('Meadow / clover patch',mesh)
    world.objects.link(obj)
    mesh.materials.append(M['patch'])

for i in range(630):
    x,z=random.uniform(-11.7,11.7),random.uniform(-9.5,9.5)
    # Leave a readable walking corridor and keep the puzzle approach clear.
    if abs(x)<2.0 or (x<-5 and -4.8<z<.2) or (x>3.7 and -2.8<z<2.7) or (z<-3.6 and -3<x<5):
        continue
    if -10.4<x<-7.6 and 1.1<z<2.9:
        continue
    for j in range(4):
        a=random.random()*math.tau
        h=random.uniform(.12,.29)
        dx,dz=math.cos(a)*.06,math.sin(a)*.06
        index=len(grass_vertices)
        grass_vertices.extend([xyz((x-dx,.08,z-dz)),xyz((x+dx,.08,z+dz)),
                               xyz((x+dz*.8,h+.08,z+dx*.8))])
        grass_faces.append((index,index+1,index+2))
    if i%13==0:
        flower(x,.08,z,'blueflower' if i%2 else 'flower',.85)
mesh=bpy.data.meshes.new('All meadow blades')
mesh.from_pydata(grass_vertices,[],grass_faces)
obj=bpy.data.objects.new('Meadow / batched grass tufts',mesh)
world.objects.link(obj)
mesh.materials.append(M['fern'])
M['fern'].use_backface_culling = False

# Reed pockets, stepping pebbles and a small jetty make the pond edge specific.
for a in [.25,.55,2.2,2.5,3.5,4.0]:
    x,z=6.9+math.cos(a)*2.85,-.1+math.sin(a)*2.08
    for j in range(3):
        dx,dz=random.uniform(-.12,.12),random.uniform(-.12,.12)
        h=random.uniform(.48,.90)
        beam('Pond / reed stalk',(x+dx,.10,z+dz),(x+dx+.05,h,z+dz),.018,'fern')
        cylinder('Pond / cattail',(x+dx+.05,h,z+dz),.045,.21,'wood')
for i in range(5):
    box('Pond / little jetty',(6.6+i*.22,.25,1.85),(.19,.13,1.00),'plank',.035)
for x in [6.6,7.48]:
    cylinder('Pond / jetty post',(x,.27,2.3),.06,.56,'wood')
for x,z in [(-5.4,6.6),(3.6,7.6),(-3.8,-2.3)]:
    cylinder('Woods / old stump',(x,.25,z),.34,.46,'wood',.30)
    cylinder('Woods / cut end',(x,.49,z),.29,.035,'path')
    for r in [.10,.19]:
        ring('Woods / growth rings',(x,.515,z),r,.012,'plank')
for x,z in [(-4.4,2.2),(4.0,2.7)]:
    beam('Wayfinding / post',(x,.08,z),(x,.90,z),.045,'wood')
    box('Wayfinding / sign',(x,.82,z),(.61,.23,.10),'plank',.035,-.15)
    ball('Wayfinding / leaf emblem',(x,.84,z+.065),(.12,.055,.02),'leafyellow')

# Original small animals, exported separately for gentle in-game animation.
rabbit=bpy.data.collections.new('WILDLIFE • garden rabbit')
bpy.context.scene.collection.children.link(rabbit)
active=rabbit
ball('Rabbit / body',(0,.23,0),(.23,.24,.32),'cream')
ball('Rabbit / head',(0,.44,.22),(.20,.19,.20),'cream')
for side in [-1,1]:
    ear=ball('Rabbit / ear',(side*.09,.70,.18),(.065,.23,.07),'cream')
    ear.rotation_euler.y=side*.15
    ball('Rabbit / inner ear',(side*.09,.72,.237),(.032,.16,.013),'pink')
    ball('Rabbit / eye',(side*.105,.49,.378),(.025,.030,.016),'eye')
    ball('Rabbit / paw',(side*.13,.075,.13),(.09,.07,.14),'cream')
ball('Rabbit / nose',(0,.42,.413),(.026,.02,.017),'pink')
ball('Rabbit / tail',(0,.22,-.31),(.10,.10,.10),'cream')

duck=bpy.data.collections.new('WILDLIFE • pond duck')
bpy.context.scene.collection.children.link(duck)
active=duck
ball('Duck / floating body',(0,.15,0),(.23,.17,.34),'cream')
ball('Duck / green head',(0,.34,.24),(.15,.17,.15),'teal')
box('Duck / bill',(0,.29,.42),(.16,.075,.18),'gold',.035)
for side in [-1,1]:
    ball('Duck / eye',(side*.107,.38,.325),(.023,.023,.023),'eye')
    ball('Duck / folded wing',(side*.19,.19,-.04),(.08,.10,.20),'path')
ball('Duck / tail',(0,.20,-.33),(.12,.07,.14),'cream')
active=world
print('DETAIL_PASS_OK',len(world.objects),'editable environment objects',flush=True)
