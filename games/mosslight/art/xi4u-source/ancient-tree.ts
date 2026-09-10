// @ts-nocheck
import * as T from 'three';
import {ANCIENT_TREE_ORIGIN,ANCIENT_TRUNK_POINTS,ANCIENT_CROWN_SPREADS,ANCIENT_TOP_SPREAD,createAncientCurve,liftTreeLocalPoint,liftTreeWorldPoint,liftTreeMeshes} from './tree-profile';

/** Old, buttressed tree with arched limbs leaning over the left roof. */
export function createAncientTree({root,material,mesh,ellipsoid,line,addLeaves,snowOnBranch,rr,v}){
 const tree=new T.Group();tree.name='ancient-tree';tree.position.set(...ANCIENT_TREE_ORIGIN);root.add(tree);
 const bark=material('#655644',{roughness:1,vertexColors:true}),groove=material('#403e31'),lichen=material('#87996b'),moss=material('#658765');
 function limb(points,r0,r1){const curve=createAncientCurve(points),base=curve.base,steps=40,sides=22,frames=base.computeFrenetFrames(steps,false),p=[],colors=[],idx=[];
 for(let i=0;i<=steps;i++){let t=i/steps,center=base.getPoint(t),r=T.MathUtils.lerp(r0,r1,Math.pow(t,.7));for(let j=0;j<=sides;j++){let a=j/sides*Math.PI*2,ridge=1+Math.sin(a*9+t*5)*.045+Math.sin(a*17-t*3)*.025,point=center.clone().addScaledVector(frames.normals[i],Math.cos(a)*r*ridge).addScaledVector(frames.binormals[i],Math.sin(a)*r*ridge);p.push(...point.toArray());let c=new T.Color().setHSL(.105,.19,.61+Math.sin(a*9+t*5)*.1);colors.push(c.r,c.g,c.b);if(i<steps&&j<sides){let n=i*(sides+1)+j;idx.push(n,n+1,n+sides+1,n+1,n+sides+2,n+sides+1);}}}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(idx);g.computeVertexNormals();curve.supportMesh=mesh(g,bark,[0,0,0],tree);return curve;}
 const trunkTip=.035,trunk=limb(ANCIENT_TRUNK_POINTS,.48,trunkTip);
 // Low roots spread across the soil; each one tapers back into the ground.
 for(let i=0;i<9;i++){let a=i*2.4,r=rr(.65,1.12);limb([[.04,.65,-.03],[Math.cos(a)*.31,.24,Math.sin(a)*.29],[Math.cos(a)*r,.05,Math.sin(a)*r],[Math.cos(a)*(r+.18),0,Math.sin(a)*(r+.18)]],.18,.014);}
 // Vertical bark grooves follow the crooked trunk, with interrupted moss patches.
 const climbers=new T.Group();climbers.name='ancient-tree-climbers';tree.add(climbers);
 for(let j=0;j<18;j++){let a=j/18*Math.PI*2,pts=[];for(let i=0;i<24;i++){let t=i/26,c=trunk.base.getPoint(t),r=T.MathUtils.lerp(.49,trunkTip,Math.pow(t,.7));pts.push([c.x+Math.cos(a+Math.sin(t*6)*.06)*r,c.y,c.z+Math.sin(a+Math.sin(t*6)*.06)*r]);}line(pts,groove,.006,tree);}
 const ivyShape=new T.Shape();ivyShape.moveTo(0,-.1);ivyShape.lineTo(-.075,-.025);ivyShape.lineTo(-.09,.055);ivyShape.lineTo(-.034,.035);ivyShape.lineTo(0,.13);ivyShape.lineTo(.038,.037);ivyShape.lineTo(.088,.055);ivyShape.lineTo(.07,-.027);ivyShape.closePath();
 const ivyGeo=new T.ShapeGeometry(ivyShape);moss.side=T.DoubleSide;lichen.side=T.DoubleSide;
 for(let i=0;i<36;i++){let t=rr(.03,.64),c=trunk.base.getPoint(t),a=rr(-.9,2.3),r=T.MathUtils.lerp(.48,.105,Math.pow(t,.7))+.009;let o=mesh(ivyGeo,i%3?moss:lichen,[c.x+Math.cos(a)*r,c.y,c.z+Math.sin(a)*r],climbers);o.rotation.set(0,Math.PI/2-a,rr(-.3,.3));o.scale.setScalar(rr(.62,1));}
 const crowns=[],birdGripSurfaces=[];let birdPerch=null,birdPerchCurve=null,birdPerchYaw=0;
 const limbs=[
 [[.18,2.15,-.12],[-.35,2.8,.28],[-1.12,3.3,.65],[-1.45,4.25,.68]],
 [[.28,2.9,-.27],[.9,3.4,-.52],[1.7,4.42,-.9],[2.2,5.15,-1.25]],
 [[.45,3.65,-.44],[-.13,4.25,-.82],[-.75,4.95,-1.3],[-.8,5.6,-1.6]],
 [[.78,4.3,-.65],[1.45,4.7,.02],[2.05,5.22,.45],[2.65,5.85,.62]],
 [[.94,4.9,-.76],[.32,5.28,.17],[-.2,5.84,.62],[-.12,6.3,.65]],
 [[1.0,5.25,-.8],[1.58,5.65,-1.27],[1.75,6.2,-1.64],[1.84,6.5,-1.84]],
 ];
 limbs.forEach((pts,i)=>{const radius=.21-i*.016,curve=limb(pts,radius,.025);const cap=snowOnBranch(curve.base,null,radius,.025,tree.position,liftTreeLocalPoint);
 for(let k of [-1,1]){let end=pts.at(-1),mid=pts[2],a=i*1.47+k*.8,d=[end[0]+Math.cos(a)*.7,end[1]+rr(.17,.5),end[2]+Math.sin(a)*.58];const twigCurve=limb([mid,[end[0]*.94,end[1]-.08,end[2]*.94],d],.055,.006);crowns.push(liftTreeWorldPoint(v(-4.12+d[0],.47+d[1],.1+d[2])));snowOnBranch(twigCurve.base,null,.055,.006,tree.position,liftTreeLocalPoint);}
 const end=pts.at(-1);crowns.push(liftTreeWorldPoint(v(-4.12+end[0],.48+end[1],.1+end[2])));});
 // Many overlapping, irregular foliage layers leave small skylight gaps.
 crowns.forEach((c,i)=>{
  // Keep the same leaf budget, but fill the long upper limbs instead of
  // concentrating every leaf at their tips. The outer crown turns inward.
  if(c.x<-4.5)c.x+=.35;
  addLeaves(c,170,ANCIENT_CROWN_SPREADS[i%3===0?0:1],1.08,0);
  const limbCurve=createAncientCurve(limbs[Math.floor(i/3)]);
  const shoulder=limbCurve.getPoint(.70+(i%3)*.065).add(tree.position);
  shoulder.y+=.22;
  addLeaves(shoulder,60,.53,1.06,0);
 });
 addLeaves(liftTreeWorldPoint(v(-3.16,6.27,-.64)),440,ANCIENT_TOP_SPREAD,1.07,0);
 // Layered middle growth fills the open lower-left/roof-side crown. All
 // attachments use the actual parent spline; new growth consumes no rr calls.
 const newWood=[],newSnow=[],growthCrowns=[];
 function growingBranch(points,r0,r1,name){
  const curve=limb(points,r0,r1);curve.supportMesh.name=name;newWood.push(curve.supportMesh);
  curve.snowCap=snowOnBranch(curve.base,null,r0,r1,tree.position,liftTreeLocalPoint);newSnow.push(curve.snowCap);return curve;
 }
 function leafAlong(curve,t,count,spread,seed){
  const p=curve.base.getPoint(t);p.y+=.09;
  const center=liftTreeLocalPoint(p).add(tree.position);growthCrowns.push(center.clone());
  addLeaves(center,count,spread,1.04,0,seed);
 }
 const middleGrowth=[
  {parent:0,at:.40,r:.090,points:[[-.42,3.16,.60],[-.23,3.48,.43],[-.32,3.94,.39]]},
  {parent:1,at:.18,r:.090,points:[[.72,3.42,-.02],[1.02,3.79,.20],[1.11,4.30,.25]]},
  {parent:0,at:.84,r:.075,points:[[-.81,3.82,.82],[-.43,4.20,.20],[-.18,4.70,.17]]},
  {parent:3,at:.42,r:.070,points:[[1.11,4.86,-.18],[.76,5.13,-.05],[.56,5.50,.12]]},
 ];
 middleGrowth.forEach((spec,i)=>{
  const source=createAncientCurve(limbs[spec.parent]).base,anchor={p:source.getPoint(spec.at),tangent:source.getTangent(spec.at)},neck=anchor.p.clone().addScaledVector(anchor.tangent,.13);
  const parent=growingBranch([anchor.p.toArray(),neck.toArray(),...spec.points],spec.r,.022,'middle-canopy-bough');
  leafAlong(parent,.74,235,.47,0x5f900+i*97);
  for(let j=0;j<3;j++){
   const t=.30+j*.245,start=parent.base.getPoint(t),direction=parent.base.getTangent(t);
   const sign=(i%2===0?-1:1)*(j===1?-1:1),dx=sign*(.20+j*.018),dz=.14-j*.055+(i%2)*.08;
   const neck=start.clone().addScaledVector(direction,.105);
   const mid=start.clone().add(v(dx*.55,.14+j*.013,dz*.60));
   const end=start.clone().add(v(dx,.27+j*.04,dz));
   const twig=growingBranch([start.toArray(),neck.toArray(),mid.toArray(),end.toArray()],.040-j*.006,.006,'middle-canopy-fork');
   leafAlong(twig,.56,145,.36,0x6a700+i*97+j*13);
   leafAlong(twig,.94,145,.40,0x7bc00+i*97+j*13);
  }
 });
 // Two long, layered boughs lean over the left and middle roof. Both attach
 // to the existing rightward mother bough; animal/support branches stay exact.
 const roofGrowth=[
  {at:.38,r:.105,points:[[1.12,3.84,-.78],[2.42,3.88,-1.22],[3.57,4.06,-1.42]]},
  {at:.51,r:.090,points:[[1.87,4.14,-1.08],[2.98,4.18,-1.70],[4.08,4.32,-2.19]]},
 ];
 roofGrowth.forEach((spec,i)=>{
  const source=createAncientCurve(limbs[1]).base,start=source.getPoint(spec.at),tangent=source.getTangent(spec.at);
  const neck=start.clone().addScaledVector(tangent,.15);
  const parent=growingBranch([start.toArray(),neck.toArray(),...spec.points],spec.r,.022,'roof-canopy-bough');
  if(i===1){
   // Keep exactly this broad horizontal bough and its snow as real support surfaces.
   birdPerchCurve=parent;parent.supportMesh.name='bird-roof-perch-bough';parent.snowCap.name='bird-roof-perch-snow';
   birdGripSurfaces.push(parent.supportMesh,parent.snowCap);newWood.splice(newWood.indexOf(parent.supportMesh),1);newSnow.splice(newSnow.indexOf(parent.snowCap),1);
  }
  leafAlong(parent,.94,240,.48,0x9d310+i*173);
  for(let j=0;j<3;j++){
   const start=parent.base.getPoint(.40+j*.21),direction=parent.base.getTangent(.40+j*.21);
   const dx=.35+(j===1?.04:0),dy=.17+j*.04,dz=(j%2===0?1:-1)*(i===0?1:-1)*(.29+j*.025);
   const neck=start.clone().addScaledVector(direction,.13);
   const mid=start.clone().add(v(dx*.56,dy*.65,dz*.58));
   const end=start.clone().add(v(dx,dy,dz));
   const twig=growingBranch([start.toArray(),neck.toArray(),mid.toArray(),end.toArray()],.045-j*.005,.006,'roof-canopy-fork');
   leafAlong(twig,.56,125,.40,0xa6200+i*173+j*19);
   leafAlong(twig,.94,125,.46,0xb8e00+i*173+j*19);
  }
 });
 // The other 5 boughs + 18 forks share two draw calls; the bird's bough
 // and its actual snow remain separate, precise foot-support surfaces.
 function mergeGrowth(objects,name){
  const geo=new T.BufferGeometry(),names=Object.keys(objects[0].geometry.attributes),indices=[];
  let offset=0;
  for(const name of names){const source=objects[0].geometry.attributes[name],values=[];for(const o of objects)values.push(...o.geometry.attributes[name].array);geo.setAttribute(name,new T.Float32BufferAttribute(values,source.itemSize));}
  for(const o of objects){const g=o.geometry,index=g.index;if(index)for(const n of index.array)indices.push(n+offset);else for(let n=0;n<g.attributes.position.count;n++)indices.push(n+offset);offset+=g.attributes.position.count;}
  geo.setIndex(indices);geo.computeVertexNormals();
  const merged=mesh(geo,objects[0].material,[0,0,0],objects[0].parent);merged.name=name;
  for(const o of objects){o.removeFromParent();o.geometry.dispose();}
  return merged;
 }
 mergeGrowth(newWood,'ancient-tree-middle-branches');mergeGrowth(newSnow,'ancient-tree-middle-branch-snow');
 tree.userData.middleGrowth={boughs:6,forks:18,addedLeaves:6400,roofBoughs:2,roofForks:6,roofLeaves:1980,crowns:growthCrowns.map(p=>p.toArray())};

 liftTreeMeshes(tree);root.updateMatrixWorld(true);
 const perchT=.68,perchCenter=birdPerchCurve.getPoint(perchT).add(tree.position),perchTangent=birdPerchCurve.getTangent(perchT);
 const perchRay=new T.Raycaster(perchCenter.clone().add(v(0,.45,0)),v(0,-1,0),0,.9),perchHit=perchRay.intersectObjects(birdGripSurfaces,false)[0];
 if(!perchHit)throw new Error('Roof bough has no bird support surface');
 birdPerch=perchHit.point.clone().add(v(0,.012,0));birdPerchYaw=Math.atan2(-perchTangent.x,-perchTangent.z);
 tree.userData.birdRoofPerch={t:perchT,point:birdPerch.toArray(),yaw:birdPerchYaw,slope:Math.atan2(perchTangent.y,Math.hypot(perchTangent.x,perchTangent.z))};
 return {group:tree,crowns,birdPerch,birdPerchYaw,birdGripSurfaces,trunk,setSeason(s){climbers.visible=s!=='winter';climbers.children.forEach((o,i)=>o.visible=s==='spring'?i%3===0:s==='autumn'?i%5!==0:true);moss.color.set(s==='autumn'?'#c67c42':'#658765');lichen.color.set(s==='autumn'?'#deac62':'#87996b');}};
}
