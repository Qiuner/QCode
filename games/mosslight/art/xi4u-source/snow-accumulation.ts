// @ts-nocheck
import * as T from 'three';

/** Bounded, procedural winter accumulation. Existing branch/shore/bird snow
 * is deliberately excluded. Only tiles, plank caps and two empty ground pockets
 * grow; all receiving objects retain their transforms and contact heights.
 */
export function createSnowAccumulation({root,roof,legacyRoofSnow,terrain,bridge,snowMat,house,water,ripple}){
 const hash=(i,s=0)=>{const n=Math.sin(i*127.1+s*311.7)*43758.5453123;return n-Math.floor(n);};
 const group=new T.Group();group.name='winter-growing-snow';group.visible=false;root.add(group);
 const coatMat=snowMat.clone();coatMat.roughness=1;coatMat.side=T.DoubleSide;
 const looseMat=snowMat.clone();looseMat.roughness=1;looseMat.transparent=true;looseMat.depthWrite=false;
 const up=new T.Vector3(0,1,0),v=new T.Vector3(),n=new T.Vector3(),a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3(),cross=new T.Vector3(),nm=new T.Matrix3();
 root.updateMatrixWorld(true);if(legacyRoofSnow)legacyRoofSnow.visible=false;
 const layers=[],tileAnchors=[],tileMeshes=[];
 const basePositions=[],weights=[],edges=new Map();
 function key(p){return `${Math.round(p.x*1e5)},${Math.round(p.y*1e5)},${Math.round(p.z*1e5)}`;}
 function addEdge(a,b){const ka=key(a),kb=key(b),id=ka<kb?ka+'|'+kb:kb+'|'+ka;const e=edges.get(id);if(e)e.count++;else edges.set(id,{a:a.clone(),b:b.clone(),count:1});}
 // Real open curved kawara tiles only: not the timber slab or the legacy white box.
 roof.traverse(o=>{
  if(!o.isMesh||o===legacyRoofSnow)return;const p=o.geometry.parameters;
  if(o.geometry.type!=='CylinderGeometry'||!p?.openEnded||Math.abs(p.height-.45)>.015||p.radialSegments!==10)return;
  tileMeshes.push(o);const geometry=o.geometry,index=geometry.index,pos=geometry.attributes.position;let forward=null;
  for(let i=0;i<(index?index.count:pos.count);i+=3){
   a.fromBufferAttribute(pos,index?index.getX(i):i).applyMatrix4(o.matrixWorld);b.fromBufferAttribute(pos,index?index.getX(i+1):i+1).applyMatrix4(o.matrixWorld);c.fromBufferAttribute(pos,index?index.getX(i+2):i+2).applyMatrix4(o.matrixWorld);
   n.subVectors(b,a).cross(cross.subVectors(c,a)).normalize();if(n.y<.45)continue;
   for(const p of[a,b,c]){basePositions.push(p.x,p.y+.004,p.z);weights.push(.92+.08*Math.sin(p.x*5.9+p.z*3.1));if(!forward||p.z>forward.point.z)forward={point:p.clone(),normal:n.clone()};}
   addEdge(a,b);addEdge(b,c);addEdge(c,a);
  }
  if(forward)tileAnchors.push(forward);
 });
 const topCount=basePositions.length/3;
 // Boundary skirts reveal the accumulating depth. There are no internal walls.
 for(const edge of edges.values())if(edge.count===1){const A=edge.a,B=edge.b;for(const [p,isTop]of[[A,0],[B,0],[B,1],[A,0],[B,1],[A,1]]){basePositions.push(p.x,p.y+.004,p.z);weights.push(isTop?(.92+.08*Math.sin(p.x*5.9+p.z*3.1)):0);}}
 const roofGeometry=new T.BufferGeometry(),roofBase=new Float32Array(basePositions);roofGeometry.setAttribute('position',new T.BufferAttribute(roofBase.slice(),3));roofGeometry.computeVertexNormals();
 const roofSnow=new T.Mesh(roofGeometry,coatMat);roofSnow.name='accumulating-tile-snow';roofSnow.castShadow=true;roofSnow.receiveShadow=true;group.add(roofSnow);layers.push({mesh:roofSnow,base:roofBase,weights:new Float32Array(weights),kind:'roof'});
 // Frontmost actual tile end points form a small, fixed eave emission strip.
 const roofBounds=new T.Box3(),ridgeBounds=[];let roofPlane=-Infinity;
 const roofSlope=tileAnchors.length?tileAnchors.reduce((sum,a)=>sum+a.normal.z/a.normal.y,0)/tileAnchors.length:Math.tan(.235);
 for(let i=0;i<topCount;i++)roofPlane=Math.max(roofPlane,roofBase[i*3+1]+roofSlope*roofBase[i*3+2]);
 roof.traverse(o=>{if(!o.isMesh||o===legacyRoofSnow)return;o.geometry.computeBoundingBox();const box=o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld);roofBounds.union(box);const p=o.geometry.parameters;if(o.geometry.type==='CylinderGeometry'&&p?.openEnded&&Math.abs(p.radiusTop-.21)<.005)ridgeBounds.push(box);});
 function getRoofTop(x,z){
  if(x<roofBounds.min.x||x>roofBounds.max.x||z<roofBounds.min.z||z>roofBounds.max.z)return null;
  let height=roofPlane-roofSlope*z+(currentSeason==='winter'?.012+amount*.11:0);
  for(const box of ridgeBounds)if(x>=box.min.x&&x<=box.max.x&&z>=box.min.z&&z<=box.max.z)height=Math.max(height,box.max.y+.005);
  return height;
 }
 const frontZ=Math.max(...tileAnchors.map(a=>a.point.z));const anchors=tileAnchors.filter(a=>a.point.z>frontZ-.08).sort((a,b)=>a.point.x-b.point.x);
 const planks=[];bridge.traverse(o=>{
  if(!o.isMesh||o.material!==snowMat||o.parent?.name!=='weathered-plank')return;
  o.geometry.computeBoundingBox();const min=o.geometry.boundingBox.min.y,max=o.geometry.boundingBox.max.y;
  planks.push({o,y:o.position.y,scale:o.scale.y,min,height:max-min,bottom:o.position.y+min*o.scale.y});
 });
 const banks=terrain.banks,groundRay=new T.Raycaster();
 function landAt(x,z){groundRay.set(new T.Vector3(x,2,z),new T.Vector3(0,-1,0));return groundRay.intersectObjects(banks,false)[0]?.point.y;}
 // Low organic drifts in empty ground, away from the tree base/bird landing area.
 for(const [id,cx,cz,rx,rz]of[[0,-3.08,2.36,.84,.64],[1,3.58,2.02,.43,.73]]){
  const source=[],amounts=[],valid=[],triangles=[],rings=6,sides=28;
  function vertex(x,z,t){const y=landAt(x,z);const vegetation=id===1?1-T.MathUtils.smoothstep(x,3.78,3.96):1;source.push(x,(y??.3)+.0018,z);amounts.push(Math.pow(Math.max(0,1-t*t),1.7)*vegetation);valid.push(y!==undefined);}
  vertex(cx,cz,0);
  for(let r=1;r<=rings;r++)for(let j=0;j<sides;j++){const t=r/rings,angle=j/sides*Math.PI*2,irregular=1+.06*Math.sin(angle*5+id)+.035*Math.sin(angle*9-id);vertex(cx+Math.cos(angle)*rx*t*irregular,cz+Math.sin(angle)*rz*t*irregular,t);}
  function tri(a,b,c){if(valid[a]&&valid[b]&&valid[c])triangles.push(a,c,b);}
  for(let j=0;j<sides;j++)tri(0,1+j,1+(j+1)%sides);
  for(let r=1;r<rings;r++)for(let j=0;j<sides;j++){const a=1+(r-1)*sides+j,b=1+(r-1)*sides+(j+1)%sides,c=1+r*sides+j,d=1+r*sides+(j+1)%sides;tri(a,c,b);tri(b,c,d);}
  const g=new T.BufferGeometry(),base=new Float32Array(source);g.setAttribute('position',new T.BufferAttribute(base.slice(),3));g.setIndex(triangles);g.computeVertexNormals();const patch=new T.Mesh(g,coatMat);patch.name='shallow-ground-snow-drift';patch.userData.inkOutline=false;patch.receiveShadow=true;group.add(patch);layers.push({mesh:patch,base,weights:new Float32Array(amounts),kind:'ground'});
 }
 const chunkGeometry=new T.IcosahedronGeometry(1,1),chunks=[];
 for(let i=0;i<8;i++){const mat=looseMat.clone(),mesh=new T.Mesh(chunkGeometry,mat);mesh.name='pooled-falling-eave-snow';mesh.visible=false;mesh.userData.inkOutline=false;mesh.renderOrder=5;group.add(mesh);chunks.push({mesh,mat,active:false,index:i});}
 looseMat.dispose();
 // Pre-index only static receiving meshes once. A drop does at most 26 segment
 // checks, screened against these bounds; normal animation frames do no raycasts.
 const receivers=[],seen=new Set();for(const object of[house,...banks,water,bridge])object.traverse(o=>{
  if(!o.isMesh||o===legacyRoofSnow||seen.has(o)||o.material===snowMat)return;seen.add(o);o.geometry.computeBoundingBox();receivers.push({o,bounds:o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld),water:o===water});
 });
 const hitRay=new T.Raycaster(),segmentBounds=new T.Box3(),direction=new T.Vector3(),q=new T.Quaternion(),yaw=new T.Quaternion();
 let currentSeason=null,lastTime=null,amount=0,snowSeconds=0,eventClock=0,nextEvent=8,serial=0,geometryClock=0,shapeDirty=true;
 const notches=[],stats={tileMeshes:tileMeshes.length,roofTriangles:roofGeometry.attributes.position.count/3,groundTriangles:layers.filter(l=>l.kind==='ground').reduce((s,l)=>s+l.mesh.geometry.index.count/3,0),bridgeCaps:planks.length,chunkPool:8,events:0,rayTests:0};
 function visible(o){for(let p=o;p;p=p.parent)if(!p.visible)return false;return true;}
 function extraAt(x,z,time){let depth=.012+amount*.11;if(z>frontZ-.62)for(const k of notches){if(Math.abs(x-k.x)>.66||Math.abs(z-k.z)>.76)continue;const distance=Math.pow((x-k.x)/.22,2)+Math.pow((z-k.z)/.42,2);depth-=.028*Math.exp(-distance*2)*Math.exp(-(snowSeconds-k.snowTime)/9);}return Math.max(.01,depth);}
 function updateGeometry(time){
  for(const layer of layers){const pos=layer.mesh.geometry.attributes.position;
   for(let i=0;i<pos.count;i++){const x=layer.base[i*3],y=layer.base[i*3+1],z=layer.base[i*3+2],w=layer.weights[i];pos.setY(i,y+(w===0?0:w*(layer.kind==='roof'?extraAt(x,z,time):amount*.048)));}
   pos.needsUpdate=true;layer.mesh.geometry.computeVertexNormals();layer.mesh.geometry.computeBoundingBox();layer.mesh.geometry.computeBoundingSphere();
  }
  for(const p of planks){p.o.scale.y=p.scale+amount*.06/p.height;p.o.position.y=p.bottom-p.min*p.o.scale.y;}
 }
 function firstImpact(chunk){
  const position=new T.Vector3(),next=new T.Vector3(),delta=new T.Vector3();let previous=0;
  function at(t,target){target.copy(chunk.release).addScaledVector(chunk.velocity,t);target.y-=1.8*t*t+chunk.clearance;return target;}
  at(0,position);
  for(let step=1;step<=26;step++){
   const t=step/26*2.8;at(t,next);direction.subVectors(next,position);const length=direction.length();segmentBounds.setFromPoints([position,next]);hitRay.set(position,direction.normalize());hitRay.far=length;
   let first=null;for(const surface of receivers){if(!visible(surface.o)||!segmentBounds.intersectsBox(surface.bounds))continue;stats.rayTests++;const hit=hitRay.intersectObject(surface.o,false)[0];if(hit&&(!first||hit.distance<first.hit.distance))first={hit,water:surface.water};}
   if(first){const n=first.hit.face.normal.clone().applyMatrix3(nm.getNormalMatrix(first.hit.object.matrixWorld)).normalize();if(n.y<0)n.negate();if(n.y>.45)return{time:previous+(t-previous)*first.hit.distance/length,point:first.hit.point.clone(),normal:n,water:first.water};}
   position.copy(next);previous=t;
  }
  return null;
 }
 function drop(time){
  if(!anchors.length)return;const count=serial%3===0?2:1;
  for(let j=0;j<count;j++){const chunk=chunks.find(c=>!c.active);if(!chunk)break;const anchor=anchors[Math.floor(hash(serial*7+j,4)*anchors.length)],key=serial*5+j;
   chunk.active=true;chunk.birth=time;chunk.slide=.64+hash(key,8)*.18;chunk.mesh.visible=true;chunk.mat.opacity=1;chunk.size=new T.Vector3(.075+hash(key,1)*.05,.033+hash(key,2)*.027,.068+hash(key,3)*.05);chunk.mesh.scale.copy(chunk.size);
   const tangent=new T.Vector3(0,-anchor.normal.z/Math.max(.4,anchor.normal.y),1).normalize();
   const surface=anchor.point.clone();surface.y+=extraAt(surface.x,surface.z,time);
   chunk.start=surface.clone().addScaledVector(tangent,-.18);chunk.release=surface.clone().addScaledVector(tangent,.045);
   chunk.baseQ=new T.Quaternion().setFromUnitVectors(up,anchor.normal);chunk.spin=(hash(key,5)-.5)*1.5;
   chunk.clearance=Math.sqrt(Math.pow(chunk.size.y*anchor.normal.y,2)+Math.pow(chunk.size.z*anchor.normal.z,2))+.004;
   chunk.start.y+=chunk.clearance*.45;chunk.release.y+=chunk.clearance;
   chunk.velocity=new T.Vector3((hash(key,6)-.5)*.05,-.10,.16+hash(key,7)*.075);chunk.impact=firstImpact(chunk);chunk.splashed=false;
   notches.push({x:surface.x,z:surface.z,snowTime:snowSeconds});if(notches.length>8)notches.shift();
  }
  serial++;stats.events++;shapeDirty=true;
 }
 function update(time,season,weather){
  const changed=season!==currentSeason;let delta=lastTime===null?0:Math.max(0,time-lastTime);lastTime=time;
  if(changed){currentSeason=season;amount=0;snowSeconds=0;eventClock=0;serial=0;nextEvent=8;stats.events=0;notches.length=0;delta=0;shapeDirty=true;for(const c of chunks){c.active=false;c.mesh.visible=false;}}
  if(legacyRoofSnow)legacyRoofSnow.visible=false;
  group.visible=season==='winter';if(!group.visible){if(shapeDirty){updateGeometry(time);shapeDirty=false;}return false;}
  const old=amount,falling=weather==='snow';amount=T.MathUtils.clamp(amount+delta*(falling?1/65:weather==='rain'?-1/160:weather==='clear'?-1/420:-1/650),0,1);
  if(falling)snowSeconds+=delta;
  if(falling&&amount>.60){eventClock+=delta;if(eventClock>=nextEvent){drop(time);eventClock=0;nextEvent=11+hash(serial,9)*8;}}else eventClock=0;
  geometryClock+=delta;if(shapeDirty||geometryClock>=.35&&(Math.abs(amount-old)>0||notches.length>0)){updateGeometry(time);geometryClock=0;shapeDirty=false;}
  for(const chunk of chunks){if(!chunk.active)continue;const age=time-chunk.birth;
   if(age<chunk.slide){const u=T.MathUtils.smoothstep(age,0,chunk.slide);chunk.mesh.position.lerpVectors(chunk.start,chunk.release,u);chunk.mesh.quaternion.copy(chunk.baseQ);continue;}
   const t=age-chunk.slide,impact=chunk.impact;
   if(impact&&t>=impact.time){
    const rest=t-impact.time,fade=impact.water?.72:1.15;
    if(rest>=fade){chunk.active=false;chunk.mesh.visible=false;continue;}
    if(impact.water&&!chunk.splashed){ripple?.(impact.point.x,impact.point.z,.24);chunk.splashed=true;}
    const flat=1-.63*T.MathUtils.smoothstep(rest,0,.2);chunk.mesh.scale.set(chunk.size.x*(1+.16*(1-flat)),chunk.size.y*flat,chunk.size.z*(1+.16*(1-flat)));
    q.setFromUnitVectors(up,impact.normal);yaw.setFromAxisAngle(up,chunk.spin);chunk.mesh.quaternion.copy(q.multiply(yaw));
    chunk.mesh.position.copy(impact.point).addScaledVector(impact.normal,chunk.size.y*flat+.003);chunk.mat.opacity=1-T.MathUtils.smoothstep(rest,fade*.22,fade);
   }else{
    if(t>2.8){chunk.active=false;chunk.mesh.visible=false;continue;}
    chunk.mesh.position.copy(chunk.release).addScaledVector(chunk.velocity,t);chunk.mesh.position.y-=1.8*t*t;
    yaw.setFromAxisAngle(up,t*chunk.spin);chunk.mesh.quaternion.copy(yaw.multiply(chunk.baseQ));chunk.mat.opacity=impact?1:1-T.MathUtils.smoothstep(t,1.6,2.8);
   }
  }
  return delta>0;
 }
 return{update,getRoofTop,group,layers,planks,chunks,stats,snapshot:()=>({season:currentSeason,amount,snowSeconds,roofExtra:amount*.11,groundExtra:amount*.048,bridgeExtra:amount*.06,activeChunks:chunks.filter(c=>c.active).length,events:stats.events})};
}
