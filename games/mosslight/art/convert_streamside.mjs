/** Convert the MIT xi4u summer courtyard into portable, batched Godot geometry.
 * Source snapshot stays unmodified. Browser UI, lighting and postprocessing are
 * omitted; the Godot world owns rendering, physics and the shared ambient clock.
 */
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { buildGarden } from './streamside_garden.mjs'

const root = path.resolve(import.meta.dirname, '..')
const runtime = path.join(root, 'build/xi4u-converter')
const require = createRequire(path.join(runtime, 'package.json'))
const { build } = require('esbuild')
const { createCanvas } = require('@napi-rs/canvas')
const T = await import(pathToFileURL(require.resolve('three')))
const threeRoot = path.resolve(path.dirname(require.resolve('three')), '..')
const { mergeGeometries, mergeVertices } = await import(pathToFileURL(path.join(threeRoot, 'examples/jsm/utils/BufferGeometryUtils.js')))
const { GLTFExporter } = await import(pathToFileURL(path.join(threeRoot, 'examples/jsm/exporters/GLTFExporter.js')))
globalThis.document = { createElement: name => {
  if (name !== 'canvas') throw new Error(`Unexpected DOM dependency: ${name}`)
  return createCanvas(128,128)
}}
globalThis.window = { devicePixelRatio: 1 }
globalThis.FileReader = class {
  readAsArrayBuffer(blob) { blob.arrayBuffer().then(value => { this.result=value; this.onloadend?.() }) }
}
let source = fs.readFileSync(path.join(root,'art/xi4u-source/world.ts'),'utf8')
source = source.slice(0, source.indexOf(' const framing=createPortraitFraming'))
source = source.replace(/ const renderer=new T.WebGLRenderer\([^\n]+\);/, ' const renderer={domElement:{style:{}},shadowMap:{},setClearColor(){},setPixelRatio(){}};')
source = source.replace(/ const controls=new OrbitControls[^\n]+/, ' const controls={};')
source = source.replace('const pixelRenderer=createPixelRenderer(renderer,scene,camera);','const pixelRenderer={setStyle(){}};')
source = source.replace('const sceneTransition=createSceneTransition({host,canvas:renderer.domElement});','const sceneTransition={};')
source = source.replace('const celestial=createCelestialBodies(scene,camera);','const celestial={};')
// Exclude the veranda sleeper after construction to preserve the source's seeded layout.
source += '\n sleeper.group.visible=false; rain.visible=false; for(const item of gustLeaves)item.o.visible=false;\n return {root,house,roof,water,terrain,fish,foliage,chime,ancient};\n}'
await build({stdin:{contents:source,loader:'ts',resolveDir:path.join(root,'art/xi4u-source')},
  outfile:path.join(runtime,'world.cjs'),bundle:true,platform:'node',format:'cjs',
  define:{__MINITOOL__:'false'},nodePaths:[path.join(runtime,'node_modules')],logLevel:'warning'})
const { createWorld } = require(path.join(runtime,'world.cjs'))
const world = createWorld({appendChild(){}})
world.roof.visible = false
world.root.getObjectByName('wooden-footbridge').visible = false
// Exclude entrance props before batching so their collision geometry is omitted too.
for (const name of ['garden-bicycle', 'farm-tool-rack', 'summer-hand-fan']) {
  world.root.getObjectByName(name).visible = false
}
// Omit the summer still-life: electric fan, coil, saucer, ember and smoke.
const electricFan = world.root.getObjectByName('summer-tatami-fan')
electricFan.parent.visible = false
world.root.updateMatrixWorld(true)
const scene = new T.Scene()
const buckets = new Map()
const matrix = new T.Matrix4(), color = new T.Color()
const sourceScale = new T.Matrix4().makeScale(1.8,1.8,1.8)
sourceScale.setPosition(0,-.54,0)
const maps = new Map()
const white = new T.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.88,side:T.DoubleSide})
function inside(object,parent){for(let item=object;item;item=item.parent)if(item===parent)return true;return false}
function category(object){
  if(inside(object,world.water))return 'Water'
  const fish=world.fish.findIndex(f=>inside(object,f.g))
  if(fish>=0)return `Fish${fish}`
  if(inside(object,world.chime))return 'Chime'
  if(inside(object,world.foliage))return 'Canopy'
  if(inside(object,world.roof))return 'Roof'
  for(let p=object;p;p=p.parent)if(p.name==='wooden-footbridge')return 'Footbridge'
  if(inside(object,world.house)||inside(object,world.ancient.group)&&object.material?.vertexColors)return 'Solid'
  if(object.name==='organic-left-bank'||object.name==='organic-right-bank')return 'Terrain'
  for(let p=object;p;p=p.parent){if(['wooden-footbridge','shore-rock'].includes(p.name))return 'Solid'}
  return 'Details'
}
function bake(object,transform,tint,kind){
  let geometry=object.geometry.clone()
  if(geometry.index)geometry=geometry.toNonIndexed()
  const count=geometry.attributes.position.count
  if(!count)return
  if(!geometry.attributes.normal)geometry.computeVertexNormals()
  const base=Array.isArray(object.material)?object.material[0]:object.material
  if(!base||base.opacity===0)return
  if(base.isShaderMaterial&&kind!=='Water')return
  const colors=new Float32Array(count*3)
  let texture=null
  if(base.map?.image?.getContext){
    if(!maps.has(base.map)){
      const image=base.map.image
      maps.set(base.map,{data:image.getContext('2d').getImageData(0,0,image.width,image.height).data,width:image.width,height:image.height})
    }
    texture=maps.get(base.map)
  }
  for(let i=0;i<count;i++){
    color.copy(base.color||new T.Color('#548f87'))
    if(tint)color.multiply(tint)
    if(base.vertexColors&&geometry.attributes.color){
      color.r*=geometry.attributes.color.getX(i);color.g*=geometry.attributes.color.getY(i);color.b*=geometry.attributes.color.getZ(i)
    }
    if(texture&&geometry.attributes.uv){
      const uv=geometry.attributes.uv
      const x=Math.floor(((uv.getX(i)%1+1)%1)*texture.width),y=Math.floor((1-(uv.getY(i)%1+1)%1)*(texture.height-1))
      const pixel=(y*texture.width+x)*4
      color.multiply(new T.Color().setRGB(texture.data[pixel]/255,texture.data[pixel+1]/255,texture.data[pixel+2]/255,T.SRGBColorSpace))
    }
    // The original renderer uses strong ACES illumination; retain its muted colors under Godot's warm light.
    colors.set([color.r,color.g,color.b],i*3)
  }
  for(const attribute of Object.keys(geometry.attributes))if(!['position','normal'].includes(attribute))geometry.deleteAttribute(attribute)
  geometry.setAttribute('color',new T.BufferAttribute(colors,3))
  geometry.applyMatrix4(transform)
  if(!buckets.has(kind))buckets.set(kind,[])
  buckets.get(kind).push(geometry)
}
world.root.traverseVisible(object=>{
  if(!object.isMesh)return
  const kind=category(object)
  if(object.isInstancedMesh){
    for(let i=0;i<object.count;i++){
      object.getMatrixAt(i,matrix)
      const transform=new T.Matrix4().multiplyMatrices(sourceScale,object.matrixWorld).multiply(matrix)
      if(Math.abs(transform.determinant())<1e-10)continue
      const tint=new T.Color(1,1,1);if(object.instanceColor)object.getColorAt(i,tint)
      bake(object,transform,tint,kind)
    }
  }else bake(object,new T.Matrix4().multiplyMatrices(sourceScale,object.matrixWorld),null,kind)
})
const garden = buildGarden(T)
garden.updateMatrixWorld(true)
garden.traverse(object=>{
  if(object.isMesh)bake(object,object.matrixWorld,null,object.userData.category)
})
for(const [name,geometries]of buckets){
  const material=white.clone()
  if(name==='Water'){material.transparent=true;material.opacity=.72;material.depthWrite=false}
  const geometry=mergeVertices(mergeGeometries(geometries),.00001)
  const mesh=new T.Mesh(geometry,material)
  mesh.name=name
  console.log(name, geometry.attributes.position.count, 'vertices')
  if(name==='Chime'){
    geometry.translate(-2.97,-5.706,1.026)
    mesh.position.set(2.97,5.706,-1.026)
  }
  if(name.startsWith('Fish')){
    const i=Number(name.slice(4));mesh.position.set(1.5+Math.sin(i)*.9,0,-5+i*1.5)
  }
  scene.add(mesh)
}
// Complete the source's irregular banks to a tile-sized landmass, keeping its creek open.
function cx(z){return .75+1.75*Math.exp(-Math.pow((z+4)/1.7,2))-.25*Math.sin(z*.85)}
function width(z){return 1.95+.36*Math.sin(z*.5+.8)-.79*Math.exp(-Math.pow((z-3.22)/1.4,2))}
function box(name,at,size,hex){const mesh=new T.Mesh(new T.BoxGeometry(...size),new T.MeshStandardMaterial({color:hex,roughness:.9}));mesh.name=name;mesh.position.set(...at);scene.add(mesh);return mesh}
for(const side of [-1,1]){
  const positions=[],indices=[]
  for(let j=0;j<=100;j++){
    const z=-10.5+j*.21,sz=Math.max(-4.68,Math.min(4.12,z/1.8))
    const edge=(cx(sz)+side*(width(sz)+.03))*1.8
    positions.push(side*12.65,-.045,z,edge,-.045,z)
    if(j<100){const a=j*2;indices.push(...(side<0?[a,a+2,a+1,a+1,a+2,a+3]:[a,a+1,a+2,a+1,a+3,a+2]))}
  }
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals()
  const mesh=new T.Mesh(geometry,new T.MeshStandardMaterial({color:'#6e855a',roughness:1,side:T.DoubleSide}));mesh.name='TerrainExtension';scene.add(mesh)
}
box('Base',[0,-1,0],[25.3,.65,21.1],'#596959')
// Extend the creek to both coast edges, underneath the original detailed water.
const waterPositions=[],waterIndices=[]
for(let j=0;j<=100;j++){
  const z=-10.5+j*.21,sz=Math.max(-4.68,Math.min(4.12,z/1.8))
  waterPositions.push((cx(sz)-width(sz))*1.8,-.46,z,(cx(sz)+width(sz))*1.8,-.46,z)
  if(j<100){const a=j*2;waterIndices.push(a,a+2,a+1,a+1,a+2,a+3)}
}
const waterGeometry=new T.BufferGeometry()
waterGeometry.setAttribute('position',new T.Float32BufferAttribute(waterPositions,3));waterGeometry.setIndex(waterIndices);waterGeometry.computeVertexNormals()
const waterExtension=new T.Mesh(waterGeometry,new T.MeshStandardMaterial({color:'#518b81',roughness:.4,transparent:true,opacity:.78,side:T.DoubleSide}))
waterExtension.name='WaterExtension';scene.add(waterExtension)
// Same world-space bridge elevation as both existing islands. East joins Mosslight.
box('Connector',[15,-.22,3],[6.9,.44,3.4],'#8f7756')
for(let i=0;i<18;i++)box('ConnectorPlanks',[11.65+i*.39,.012,3],[.35,.024,3.3],i%3?'#b39970':'#a28a65')
for(const z of[1.38,4.62]){
  box('SolidRail',[15,.55,z],[6.8,.16,.13],'#655846')
  for(const x of[11.7,13.9,16.1,18.3])box('SolidPost',[x,.44,z],[.18,.88,.18],'#625441')
}
// Collision-only support for the garden's wooden stairs and landing.
// Godot hides this mesh after creating its physics shape.
const ramp=new T.BufferGeometry()
ramp.setAttribute('position',new T.Float32BufferAttribute([-5,0,2.5,-2.7,0,2.5,-5,1.18,.3,-2.7,1.18,.3,-5,1.18,-1,-2.7,1.18,-1],3))
ramp.setIndex([0,1,2,1,3,2,2,3,4,3,5,4]);ramp.computeVertexNormals()
const rampMesh=new T.Mesh(ramp,new T.MeshStandardMaterial({color:'#927953',side:T.DoubleSide}));rampMesh.name='SolidRamp';scene.add(rampMesh)
// Populate only the added margins, leaving the source courtyard and walking routes clear.
let marginSeed=7319
function random(){marginSeed=(Math.imul(marginSeed,1664525)+1013904223)>>>0;return marginSeed/4294967296}
function marginProp(geometry,at,scale,hex){
  const mesh=new T.Mesh(geometry,new T.MeshStandardMaterial({color:hex}))
  mesh.position.set(...at);mesh.scale.set(...scale);mesh.rotation.y=random()*Math.PI*2;mesh.updateMatrix()
  bake(mesh,mesh.matrix,null,'MarginDetails')
}
const stoneShape=new T.IcosahedronGeometry(1,1)
for(let i=0;i<700;i++){
  const x=(random()-.5)*24,z=(random()-.5)*19.6
  if(Math.abs(x)<9.8&&Math.abs(z)<8.5)continue
  if(Math.abs(x/1.8-cx(Math.max(-4.68,Math.min(4.12,z/1.8))))<width(z/1.8)+.15)continue
  if(x>9&&Math.abs(z-3)<1.2)continue
  const height=.18+random()*.32
  const grass=new T.BufferGeometry()
  grass.setAttribute('position',new T.Float32BufferAttribute([-.10,0,0,.03,height,.03,.10,0,0,0,0,-.10,.03,height*.8,.04,0,0,.10],3));grass.computeVertexNormals()
  marginProp(grass,[x,-.025,z],[1,1,1],['#71855b','#8c9d68','#587960'][i%3])
  if(i%8===0)marginProp(stoneShape,[x,.04,z],[.16+random()*.3,.09,.16+random()*.2],'#969a80')
  if(i%17===0){
    marginProp(stoneShape,[x,.19,z],[.55,.3,.5],'#627e58')
    for(let j=0;j<4;j++)marginProp(stoneShape,[x+(random()-.5)*.65,.4,z+(random()-.5)*.5],[.055,.045,.055],j%2?'#ddc59d':'#b7c79b')
  }
}
for(let i=0;i<8;i++)marginProp(new T.CylinderGeometry(.44,.48,.05,7),[11.6-i*.55,-.006,3+Math.sin(i*.5)*.12],[1,.6,.75],'#b6ac8d')
for(let i=0;i<8;i++)marginProp(new T.CylinderGeometry(.4,.44,.04,7),[8-i*.31,-.006,3+i*.4],[1,.6,.75],'#b6ac8d')
const marginGeometry=mergeVertices(mergeGeometries(buckets.get('MarginDetails')),.00001)
const margins=new T.Mesh(marginGeometry,white);margins.name='MarginDetails';scene.add(margins)
const output=await new GLTFExporter().parseAsync(scene,{binary:true,onlyVisible:true})
fs.writeFileSync(path.join(root,'build/streamside-converted.glb'),Buffer.from(output))
console.log('STREAMSIDE_CONVERTED',buckets.size,'batches',Buffer.byteLength(output),'bytes')
