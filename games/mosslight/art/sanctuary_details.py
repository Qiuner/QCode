"""Moonwell dressing, executed in generate_assets.py's modeling context.

Keep the front-center landing and the route to the well open. Shallow floor
inlays are decorative; only the two lamps and broken column need body colliders.
"""
active = world

# Worn radial flagstones give the well a setting without covering all the moss.
for i in range(18):
    a = i * math.tau / 18
    x, z = 1.2 + math.cos(a) * 1.38, -6.65 + math.sin(a) * 1.38
    box('Sanctuary detail / radial paving', (x, 1.563, z),
        (.36, .038, .43), 'path' if i % 4 == 0 else 'stone', .035, -a)
ring('Sanctuary detail / outer inlay', (1.2, 1.568, -6.65), 1.67, .014, 'path')
for z in [-4.48, -4.90]:
    for x in [.87, 1.49]:
        box('Sanctuary detail / approach tile', (x, 1.561, z),
            (.54, .036, .33), 'lightstone', .035, .025 if x < 1 else -.035)

# Masonry courses, corner braces and three small emblems on the plain facade.
for row, y in enumerate([.38, .84]):
    for i in range(7):
        x = -1.51 + i * .9 + (.12 if row else 0)
        box('Sanctuary detail / facade ashlar', (x, y, -4.065),
            (.83, .39, .075), 'stone' if (i + row) % 3 else 'path', .028)
    for i in range(4):
        box('Sanctuary detail / east ashlar', (4.465, y, -4.68 - i * 1.02),
            (.075, .39, .94), 'stone' if i % 2 else 'path', .028)
for x in [-1.78, 4.18]:
    box('Sanctuary detail / corner brace', (x, .75, -4.02),
        (.18, .88, .13), 'lightstone', .03)
for x in [.59, 1.2, 1.81]:
    plaque = cylinder('Sanctuary detail / teal seal', (x, .84, -3.997), .20, .045, 'teal')
    plaque.rotation_euler.x = math.pi / 2
    border = ring('Sanctuary detail / seal rim', (x, .84, -3.971), .20, .016, 'gold')
    border.rotation_euler.x = math.pi / 2
    ball('Sanctuary detail / seed relief', (x, .84, -3.958), (.055, .108, .020), 'gold')

# A pair of squat stone lanterns frames the landing instead of blocking it.
for x in [-1.32, 3.70]:
    z = -4.92
    box('Sanctuary detail / lamp foot', (x, 1.64, z), (.66, .18, .64), 'stone', .055)
    box('Sanctuary detail / lamp pedestal', (x, 1.82, z), (.40, .22, .40), 'path', .045)
    box('Sanctuary detail / lamp tray', (x, 1.98, z), (.58, .11, .56), 'lightstone', .045)
    ball('Sanctuary detail / lantern pearl', (x, 2.18, z), (.13, .18, .13), 'glow')
    for dx in [-.20, .20]:
        for dz in [-.19, .19]:
            beam('Sanctuary detail / lantern frame', (x+dx, 2.01, z+dz),
                 (x+dx, 2.36, z+dz), .026, 'teal')
    box('Sanctuary detail / lamp cap', (x, 2.39, z), (.62, .12, .60), 'lightstone', .065)
    cylinder('Sanctuary detail / lamp finial', (x, 2.49, z), .09, .12, 'gold', top=.035)
    collider((x, 2.02, z), (.66, 1.00, .64), 'sanctuary detail lamp')

# An eroded column and scattered chips make the ruin feel incomplete.
box('Sanctuary detail / broken column foot', (-1.25, 1.63, -6.35),
    (.74, .18, .71), 'lightstone', .075, .08)
cylinder('Sanctuary detail / broken column', (-1.25, 1.94, -6.35), .25, .49, 'stone', vertices=10)
for i in range(5):
    a = i * math.tau / 5
    box('Sanctuary detail / broken crown',
        (-1.25+math.cos(a)*.16, 2.20+(i%3)*.035, -6.35+math.sin(a)*.16),
        (.14, .10+(i%3)*.07, .14), 'lightstone', .025, a)
collider((-1.25, 1.91, -6.35), (.74, .78, .71), 'sanctuary detail broken column')
for x, z, angle in [(3.79, -6.22, .25), (3.96, -6.67, -.4), (-.74, -7.03, .6)]:
    box('Sanctuary detail / stone fragment', (x, 1.61, z),
        (.34, .13, .23), 'stone', .06, angle)

# Ivy grows over the outer lip and up the existing arch, away from the approach.
for x, z, length in [(-1.87, -4.18, .90), (3.98, -4.18, .65), (4.48, -6.75, .70)]:
    for j in range(6):
        y = 1.57 - j * length / 6
        dx = math.sin(j * 1.3) * .08
        front = .14 if z > -5 else 0
        ball('Sanctuary detail / trailing ivy', (x+dx, y, z+front),
             (.15, .09, .11), 'leaflight' if j % 3 else 'leaf', True)
        ball('Sanctuary detail / ivy leaf pair', (x+dx+.14, y+.04, z+front),
             (.105, .07, .10), 'grass', True)
for x, height in [(-1.1, 1.62), (3.5, 2.27)]:
    for j in range(9):
        y = 1.66 + j * height / 9
        px = x + math.sin(j*.8)*.25
        ball('Sanctuary detail / arch ivy', (px, y, -7.34),
             (.16, .12, .08), 'leaf' if j % 3 == 0 else 'leaflight', True)
for x, z in [(-1.78, -5.55), (4.03, -7.37), (-.60, -8.08), (2.75, -8.09)]:
    ball('Sanctuary detail / moss cushion', (x, 1.57, z), (.28, .075, .22), 'grass', True)
    for dx, dz in [(-.12, .04), (.10, -.08)]:
        flower(x+dx, 1.59, z+dz, 'blueflower', .65)

# Small offerings reward looking closely: a dish, petals, and three candles.
cylinder('Sanctuary detail / offering dish', (2.80, 1.63, -6.25), .27, .10, 'teal')
ring('Sanctuary detail / dish rim', (2.80, 1.70, -6.25), .25, .028, 'gold')
for i in range(5):
    a = i * math.tau / 5
    ball('Sanctuary detail / offered petals', (2.80+math.cos(a)*.12, 1.704, -6.25+math.sin(a)*.12),
         (.09, .017, .055), 'pink')
for x, z, height in [(2.74, -6.88, .24), (2.99, -6.73, .17), (2.98, -7.03, .30)]:
    cylinder('Sanctuary detail / candle saucer', (x, 1.585, z), .105, .035, 'gold')
    cylinder('Sanctuary detail / candle wax', (x, 1.60+height/2, z), .055, height, 'cream')
    ball('Sanctuary detail / candle flame', (x, 1.63+height, z), (.027, .053, .027), 'glow')

print('SANCTUARY_DETAILS_OK', len(world.objects), 'environment objects', flush=True)
