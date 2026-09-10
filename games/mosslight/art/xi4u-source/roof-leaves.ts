// @ts-nocheck
import * as T from 'three';

/** Sparse autumn litter resting on real tile faces. All placement/validation
 * is construction-only and deterministic; no scene RNG or update loop needed.
 */
export function createRoofLeaves({root,roof,material}){
 const group=new T.Group();group.name='autumn-roof-leaves';group.visible=false;group.userData.inkOutline=false;root.add(group);
 root.updateMatrixWorld(true);const rootInverse=root.matrixWorld.clone().invert(),tiles=[],bounds=new T.Box3();
 roof.traverse(o=>{const p=o.geometry?.parameters;if(!o.isMesh||o.geometry.type!=='CylinderGeometry'||!p?.openEnded||p.radialSegments!==10||Math.abs(p.height-.45)>.015)return;o.geometry.computeBoundingBox();const box=o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld);tiles.push({o,box});bounds.union(box);});
 const hash=(i,s=0)=>{const n=Math.sin(i*127.1+s*311.7)*43758.5453123;return n-Math.floor(n);};
 const ray=new T.Raycaster(),down=new T.Vector3(0,-1,0),normalMatrix=new T.Matrix3();let fineRays=0;
 function surfaceAt(x,z){
  ray.set(new T.Vector3(x,bounds.max.y+1,z),down);ray.far=bounds.max.y-bounds.min.y+2;let first=null;
  for(const tile of tiles){if(x<tile.box.min.x||x>tile.box.max.x||z<tile.box.min.z||z>tile.box.max.z)continue;fineRays++;const hit=ray.intersectObject(tile.o,false)[0];if(hit&&(!first||hit.distance<first.distance))first=hit;}
  if(!first)return null;const normal=first.face.normal.clone().applyMatrix3(normalMatrix.getNormalMatrix(first.object.matrixWorld)).normalize();return{point:first.point,normal,object:first.object};
 }
 function leafGeometry(kind){
  // Three small deciduous silhouettes, a slight central fold and short stems.
  const borders=[
   [[0,-.50],[-.28,-.30],[-.44,-.04],[-.43,.23],[-.20,.43],[0,.53],[.25,.34],[.46,.12],[.40,-.13],[.22,-.36]],
   [[0,-.49],[-.21,-.25],[-.48,-.23],[-.35,.01],[-.55,.17],[-.27,.21],[-.19,.46],[-.06,.30],[.03,.56],[.17,.30],[.38,.35],[.28,.10],[.53,.02],[.26,-.13],[.30,-.36],[.11,-.28]],
   [[0,-.52],[-.22,-.30],[-.36,-.03],[-.28,.29],[-.06,.55],[.20,.37],[.39,.11],[.31,-.22],[.12,-.40]]
  ];const border=borders[kind],p=[0,.0014,.015],colors=[1,.91,.73],ids=[];
  border.forEach(([x,z],i)=>{p.push(x,.00015+Math.max(0,z-.22)*.002,z);const shade=.90+.06*Math.sin(i*1.9+kind);colors.push(shade,shade*.91,shade*.76);});
  for(let i=1;i<=border.length;i++)ids.push(0,i,i===border.length?1:i+1);
  const stem=p.length/3;p.push(-.017,.0003,-.45,.017,.0003,-.45,.012,.0003,-.66,-.012,.0003,-.66);for(let i=0;i<4;i++)colors.push(.59,.47,.34);ids.push(stem,stem+1,stem+2,stem,stem+2,stem+3);
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(ids);g.computeVertexNormals();return g;
 }
 const geometries=[0,1,2].map(leafGeometry),records=[],q=new T.Quaternion(),yaw=new T.Quaternion(),up=new T.Vector3(0,1,0),worldMatrix=new T.Matrix4(),p=new T.Vector3(),scale=new T.Vector3(),origin=new T.Vector3();
 const checks=geometries.map(g=>{const list=[],a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3(),pos=g.attributes.position;for(let i=0;i<pos.count;i++)list.push(new T.Vector3().fromBufferAttribute(pos,i));for(let i=0;i<g.index.count;i+=3){a.fromBufferAttribute(pos,g.index.getX(i));b.fromBufferAttribute(pos,g.index.getX(i+1));c.fromBufferAttribute(pos,g.index.getX(i+2));list.push(a.clone().add(b).add(c).multiplyScalar(1/3));}return list;});
 const tint=['#ce8653','#b76448','#d6a451','#b87946','#d7ae68'];let attempts=0;
 for(let attempt=0;attempt<1600&&records.length<84;attempt++){
  attempts=attempt+1;const kind=records.length%3,r=Math.sqrt(hash(attempt,1)),angle=hash(attempt,2)*Math.PI*2,cluster=attempt%10;
  const cx=cluster<6?-2.82:cluster<9?-1.15:-2.10,cz=cluster<6?-2.12:cluster<9?-1.47:-2.14;
  const x=cx+Math.cos(angle)*r*(cluster<6?1.02:cluster<9?1.13:1.68),z=cz+Math.sin(angle)*r*(cluster<6?1.18:cluster<9?.77:1.28);
  if(x< -3.93||x>.32||z< -3.54||z>-.72)continue;const hit=surfaceAt(x,z);if(!hit||hit.normal.y<.82)continue;
  const length=.122+hash(attempt,4)*.055,width=.067+hash(attempt,5)*.030;
  scale.set(width,1,length);q.setFromUnitVectors(up,hit.normal);yaw.setFromAxisAngle(up,(hash(attempt,6)-.5)*1.90+(attempt%2?Math.PI:0));q.multiply(yaw);origin.copy(hit.point).addScaledVector(hit.normal,.0030);worldMatrix.compose(origin,q,scale);
  let min=Infinity,max=-Infinity,valid=true;
  for(const sample of checks[kind]){p.copy(sample).applyMatrix4(worldMatrix);const support=surfaceAt(p.x,p.z);if(!support){valid=false;break;}const gap=p.y-support.point.y;min=Math.min(min,gap);max=Math.max(max,gap);if(gap<.0015||gap>.019){valid=false;break;}}
  if(!valid)continue;
  // Keep independent leaves legible: no piles or intersecting cards.
  if(records.some(r=>Math.hypot(r.origin.x-origin.x,r.origin.z-origin.z)<.126))continue;
  const color=new T.Color(tint[Math.floor(hash(attempt,7)*tint.length)]);color.offsetHSL(0,0,(hash(attempt,8)-.5)*.045);
  records.push({kind,origin:origin.clone(),normal:hit.normal.clone(),matrix:rootInverse.clone().multiply(worldMatrix),worldMatrix:worldMatrix.clone(),color,minGap:min,maxGap:max,size:[width,length]});
 }
 const leafMat=material?material('#ffffff',{vertexColors:true,side:T.DoubleSide,roughness:.98,flatShading:true}):new T.MeshStandardMaterial({color:'#ffffff',vertexColors:true,side:T.DoubleSide,roughness:.98,flatShading:true});
 const meshes=[];for(let kind=0;kind<3;kind++){
  const list=records.filter(r=>r.kind===kind),mesh=new T.InstancedMesh(geometries[kind],leafMat,list.length);mesh.name=`roof-resting-autumn-leaves-${kind}`;mesh.castShadow=false;mesh.receiveShadow=true;mesh.userData.inkOutline=false;
  list.forEach((r,i)=>{mesh.setMatrixAt(i,r.matrix);mesh.setColorAt(i,r.color);});mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;mesh.computeBoundingBox();mesh.computeBoundingSphere();group.add(mesh);meshes.push(mesh);
 }
 const stats={count:records.length,meshes:3,tileMeshes:tiles.length,attempts,fineRays,minGap:Math.min(...records.map(r=>r.minGap)),maxGap:Math.max(...records.map(r=>r.maxGap)),triangles:meshes.reduce((n,m)=>n+m.geometry.index.count/3*m.count,0)};
 return{group,meshes,records,stats,setSeason:(season)=>{group.visible=season==='autumn';}};
}
