/** Agentville's own garden architecture, in tile-local Godot Y-up coordinates. */
export function buildGarden(T) {
  const root = new T.Group()
  const materials = new Map()
  function mesh(geometry, at, color, category = 'GardenDetails') {
    if (!materials.has(color)) materials.set(color, new T.MeshStandardMaterial({color, roughness:.9, side:T.DoubleSide}))
    const object = new T.Mesh(geometry, materials.get(color))
    object.position.set(...at)
    object.userData.category = category
    root.add(object)
    return object
  }
  function box(at, size, color, category) { return mesh(new T.BoxGeometry(...size), at, color, category) }
  function beam(a, b, radius, color, category) {
    const start = new T.Vector3(...a), end = new T.Vector3(...b)
    const object = mesh(new T.CylinderGeometry(radius,radius,start.distanceTo(end),8),start.clone().add(end).multiplyScalar(.5).toArray(),color,category)
    object.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),end.sub(start).normalize())
    return object
  }
  function rock(at, scale, color) {
    const object = mesh(new T.IcosahedronGeometry(1,1),at,color)
    object.scale.set(...scale)
    return object
  }
  const stone = '#a3ae9e', plaster = '#d4dccb', wood = '#697d71', tile = '#3e7776'

  // Six shallow wooden treads share the existing smooth collision ramp.
  const stairX = -3.85, stairRun = 2.2, stairRise = 1.18, stepDepth = stairRun / 6
  for (let i = 0; i < 6; i++) {
    const front = 2.5 - i * stepDepth, top = (i + 1) * stairRise / 6
    for (let plank = 0; plank < 2; plank++) {
      box([stairX, top - .045, front - (plank + .5) * stepDepth / 2],
        [2.3, .09, stepDepth / 2 - .014], (i + plank) % 2 ? '#bd9262' : '#c49a6b')
    }
    box([stairX, top - .145, front - .055], [2.12, .20, .055], '#9d764f')
    box([stairX, top - .048, front + .014], [2.34, .065, .055], '#d0a575')
  }
  // A short landing joins the veranda; side stringers support the open stair.
  for (let i = 0; i < 7; i++) {
    box([stairX, stairRise - .045, .3 - (i + .5) * 1.3 / 7], [2.3, .09, 1.3 / 7 - .014],
      i % 2 ? '#bd9262' : '#c49a6b')
  }
  for (const x of [-4.86, -2.84]) {
    const stringer = box([x, .48, 1.4], [.13, .21, Math.hypot(stairRun, stairRise)], '#796248')
    stringer.rotation.x = Math.atan2(stairRise, stairRun)
    box([x, .48, .1], [.15, .96, .15], '#796248')
    box([x, -.045, 2.37], [.32, .16, .4], stone)
  }

  // A hipped roof replaces the original single slope. Closely spaced ribs read as tiles.
  function hipRoof(cx, cz, y, halfX, halfZ, rise, category = 'GardenRoof') {
    const levels = [[halfX,halfZ,y+.16],[halfX*.86,halfZ*.82,y], [halfX*.45,.12,y+rise]]
    for(let level=0;level<2;level++) {
      const [ax,az,ay]=levels[level], [bx,bz,by]=levels[level+1]
      const ringA=[[-ax,-az],[ax,-az],[ax,az],[-ax,az]], ringB=[[-bx,-bz],[bx,-bz],[bx,bz],[-bx,bz]]
      for(let side=0;side<4;side++) {
        const next=(side+1)%4, positions=[]
        for(const [ring,h,index] of [[ringA,ay,side],[ringA,ay,next],[ringB,by,next],[ringB,by,side]])positions.push(cx+ring[index][0],h,cz+ring[index][1])
        const geometry=new T.BufferGeometry()
        geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setIndex([0,1,2,0,2,3]);geometry.computeVertexNormals()
        mesh(geometry,[0,0,0],level?tile:'#4f8783',category)
        const count=Math.ceil(new T.Vector2(...ringA[side]).distanceTo(new T.Vector2(...ringA[next]))/.28)
        for(let i=0;i<=count;i++) {
          const t=i/count
          beam([cx+T.MathUtils.lerp(ringA[side][0],ringA[next][0],t),ay+.035,cz+T.MathUtils.lerp(ringA[side][1],ringA[next][1],t)],
            [cx+T.MathUtils.lerp(ringB[side][0],ringB[next][0],t),by+.035,cz+T.MathUtils.lerp(ringB[side][1],ringB[next][1],t)],.045,i%3?'#568b86':'#79a397',category)
        }
      }
    }
    beam([cx-halfX*.5,y+rise+.08,cz],[cx+halfX*.5,y+rise+.08,cz],.13,'#789f92',category)
    for(const side of [-1,1])beam([cx+side*halfX*.47,y+rise+.08,cz],[cx+side*halfX*.60,y+rise+.32,cz],.09,tile,category)
  }
  hipRoof(-1.48,-3.65,6.65,6.65,3.8,1.85)
  // A raised clerestory gives the tea house a new layered silhouette.
  box([-1.48,8.23,-3.65],[4.6,.8,1.45],wood)
  for(let i=0;i<12;i++)box([-3.53+i*.37,8.22,-2.90],[.24,.48,.045],'#a4c6b3')
  hipRoof(-1.48,-3.65,8.6,2.75,1.05,.68)

  // Moon gate: a generous round-headed opening keeps the existing bridge route usable.
  const gateX=10.25, gateZ=3, radius=1.55, spring=1.25
  for(const side of [-1,1]) {
    box([gateX,1.8,gateZ+side*2.10],[.48,3.6,1.1],plaster,'SolidGarden')
    box([gateX,.17,gateZ+side*2.10],[.65,.34,1.2],stone,'SolidGarden')
    box([gateX,3.66,gateZ+side*2.10],[.72,.16,1.3],tile)
  }
  for(let i=0;i<24;i++) {
    const a=i*Math.PI/24,b=(i+1)*Math.PI/24
    const positions=[]
    for(const x of [gateX-.24,gateX+.24])for(const [z,y]of [[radius*Math.cos(a),spring+radius*Math.sin(a)],[radius*Math.cos(b),spring+radius*Math.sin(b)],[radius*Math.cos(b),3.6],[radius*Math.cos(a),3.6]])positions.push(x,y,gateZ+z)
    const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3))
    geometry.setIndex([0,1,2,0,2,3,4,6,5,4,7,6,0,4,5,0,5,1]);geometry.computeVertexNormals()
    mesh(geometry,[0,0,0],plaster,'SolidGarden')
    beam([gateX+.27,spring+radius*Math.sin(a),gateZ+radius*Math.cos(a)], [gateX+.27,spring+radius*Math.sin(b),gateZ+radius*Math.cos(b)],.085,stone)
  }
  box([gateX,3.73,3],[.78,.18,5.45],tile)
  for(const side of [-1,1])beam([gateX+.28,0,gateZ+side*radius],[gateX+.28,spring,gateZ+side*radius],.08,stone)
  for(const z of [-2.1,-.5,6.5,8.1]) {
    box([10.25,.8,z],[.30,1.6,1.45],plaster,'SolidGarden')
    box([10.25,1.64,z],[.48,.14,1.6],tile)
  }

  // Replace the old planks with a stone bridge using the already-tested curved support.
  const center=(.75+1.75*Math.exp(-Math.pow((3.22+4)/1.7,2))-.25*Math.sin(3.22*.85))*1.8
  for(let i=0;i<32;i++) {
    const x=-4.3+(i+.5)*8.6/32,y=Math.max(0,.46*(1-Math.pow(Math.abs(x)/4.3,2)))
    const slab=box([center+x,y-.05,5.796],[.272,.10,1.36],i%3?stone:'#bac1ad')
    slab.rotation.z=-.92*x/(4.3*4.3)
  }
  for(const z of [4.98,6.61])for(let i=0;i<9;i++) {
    const x=-3.8+i*.95,y=.46*(1-Math.pow(Math.abs(x)/4.3,2))
    box([center+x,y+.42,z],[.14,.84,.14],stone,'SolidGarden')
    rock([center+x,y+.88,z],[.15,.11,.15],'#c0c7b1')
    if(i<8) {
      const nx=x+.95,ny=.46*(1-Math.pow(Math.abs(nx)/4.3,2))
      beam([center+x,y+.67,z],[center+nx,ny+.67,z],.085,stone,'SolidGarden')
    }
  }

  // A secondary path loops between the open lawn, tree and veranda approach.
  const path=[[-3.1,6],[-4.5,5.6],[-5.8,4.5],[-7.4,3.4],[-9.6,2.0],[-10.2,-.2],[-10,-2.4]]
  for(let i=0;i<path.length-1;i++) {
    const a=path[i],b=path[i+1],n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.58)
    for(let j=0;j<n;j++) {
      const t=j/n
      const slab=mesh(new T.CylinderGeometry(.35,.38,.04,6),[T.MathUtils.lerp(a[0],b[0],t),-.005,T.MathUtils.lerp(a[1],b[1],t)],'#b5bca5')
      slab.rotation.y=i*.4+j*.7;slab.scale.z=.83
    }
  }
  // Lanterns and planted islands frame spaces; clear routes are kept between them.
  for(const [x,z]of [[8.8,1.1],[8.8,5],[-4.6,7.6],[-9.8,3.4]]) {
    box([x,.16,z],[.62,.32,.62],stone,'SolidGarden')
    beam([x,.25,z],[x,1.0,z],.14,stone,'SolidGarden')
    box([x,1.1,z],[.50,.35,.50],'#c9cbaa')
    for(const dx of [-.23,.23])for(const dz of [-.23,.23])beam([x+dx,.91,z+dz],[x+dx,1.31,z+dz],.035,wood)
    const cap=mesh(new T.ConeGeometry(.50,.27,4),[x,1.43,z],tile);cap.rotation.y=Math.PI/4
  }
  for(const [x,z]of [[-10.3,5.4],[-5.4,8.8],[8.9,-2.9],[8.1,8.3],[-10.7,-4.4]]) {
    for(let i=0;i<12;i++) {
      const a=i*2.4,r=.3+(i%4)*.24,xx=x+Math.cos(a)*r,zz=z+Math.sin(a)*r
      rock([xx,.19,zz],[.38,.3,.36],i%2?'#668f73':'#7b9f74')
      for(let j=0;j<3;j++)rock([xx+(j-1)*.14,.43+(i%3)*.04,zz],[.085,.065,.085],i%3?'#d6d2ae':'#a9b9d0')
    }
  }
  return root
}
