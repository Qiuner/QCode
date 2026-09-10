// @ts-nocheck
import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {createCurvedGrassGeometry,paintCurvedGrass,bendCurvedGrass} from './curved-grass';
import {gardenWind} from './garden-atmosphere';

export function createGardenPlanting({garden,material,mesh,line,leafGeometry,rr,cx,width,bridgeZ,center,half,withinGarden}){
 const meadow=new T.Group();meadow.name='seasonal-flowerbed';garden.add(meadow);
 // Tiny shader-swayed flowers stay painterly; only solid structures receive ink.
 meadow.userData.inkOutline=false;
 const records=[];
 // A staggered carpet follows the actual bank, with clearance for tree roots and bridge.
 for(let z=.86;z<4.72;z+=.19)for(let x=-4.71;x<-.7;x+=.195){
  const px=x+rr(-.058,.058),pz=z+rr(-.055,.055),bank=cx(pz)-width(pz);
  if(!withinGarden(px,pz,.23)||pz>3.48||px>bank-.23||Math.abs(pz-bridgeZ)<.83&&px>center-half-.2)continue;
  if(Math.hypot((px+4.12)/.75,(pz-.1)/1.2)<1)continue;
  if(Math.hypot(px+3.95,pz-1.85)<.47||Math.hypot(px+3.8,pz-1)<.7)continue;
  records.push({x:px,z:pz,height:rr(.27,.54),angle:rr(0,6.28),shade:rr(0,1),kind:Math.floor(rr(0,5))});
 }
 function joined(parts){parts.forEach(g=>g.deleteAttribute('uv'));const result=mergeGeometries(parts);parts.forEach(g=>g.dispose());return result;}
 const stemParts=[new T.CylinderGeometry(.009,.014,1,5).translate(0,.5,0)];
 for(let i=0;i<3;i++){const leaf=leafGeometry.clone();leaf.scale(.37,.37,.5);leaf.rotateX(-.35);leaf.rotateY(i*2.4);leaf.translate(0,.24+i*.18,0);stemParts.push(leaf);}
 const stemGeometry=joined(stemParts),petalParts=[];
 for(let k=0;k<6;k++){const a=k*Math.PI/3,g=new T.SphereGeometry(1,8,4);g.scale(.114,.032,.066);g.rotateY(-a);g.translate(Math.cos(a)*.13,1,Math.sin(a)*.13);petalParts.push(g);}
 const petalGeometry=joined(petalParts),heartGeometry=new T.SphereGeometry(.066,8,4).scale(1,.44,1).translate(0,1.023,0);
 const wind={value:0};
 function sway(mat){mat.onBeforeCompile=shader=>{
  shader.uniforms.flowerTime=wind;
  shader.vertexShader='uniform float flowerTime;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
   #ifdef USE_INSTANCING
    float phase=instanceMatrix[3].x*1.7+instanceMatrix[3].z*2.3;
    transformed.x+=sin(flowerTime*.95+phase)*.065*pow(max(position.y,0.),1.6);
    transformed.z+=cos(flowerTime*.73+phase)*.035*pow(max(position.y,0.),1.6);
   #endif`);
 };return mat;}
 const greens=new T.InstancedMesh(stemGeometry,sway(material('#ffffff',{side:T.DoubleSide})),records.length);
 const petals=new T.InstancedMesh(petalGeometry,sway(material('#ffffff')),records.length);
 const hearts=new T.InstancedMesh(heartGeometry,sway(material('#f2ca6b')),records.length);
 greens.name='flower-carpet-foliage';petals.name='flower-carpet-blossoms';hearts.name='flower-carpet-centers';
 for(const object of [greens,petals,hearts]){object.castShadow=true;object.receiveShadow=true;meadow.add(object);}
 const dummy=new T.Object3D();
 records.forEach((r,i)=>{dummy.position.set(r.x,.26,r.z);dummy.rotation.set(0,r.angle,0);dummy.scale.set(r.height,r.height,r.height);dummy.updateMatrix();for(const object of [greens,petals,hearts])object.setMatrixAt(i,dummy.matrix);});
 for(const object of [greens,petals,hearts]){object.instanceMatrix.needsUpdate=true;object.computeBoundingSphere();object.boundingSphere.radius+=.1;}

 // Spring starts with soft grass and rare closed buds; autumn leaves cover the plot.
 const meadowGrassGeometry=createCurvedGrassGeometry(Array.from({length:7},(_,i)=>.2+(i%3)*.075));
 const meadowGrass=new T.InstancedMesh(meadowGrassGeometry,material('#ffffff',{side:T.DoubleSide,vertexColors:true}),records.length);meadowGrass.name='spring-meadow-grass';meadowGrass.castShadow=true;meadowGrass.receiveShadow=true;meadow.add(meadowGrass);
 const budGeometry=new T.SphereGeometry(1,7,5).scale(.055,.10,.055).translate(0,.85,0);
 const buds=new T.InstancedMesh(budGeometry,sway(material('#d7d9a0')),records.length);buds.name='spring-flower-buds';buds.castShadow=true;meadow.add(buds);
 const litterGeometry=leafGeometry.clone();litterGeometry.translate(0,0,-.48);
 const litter=new T.InstancedMesh(litterGeometry,material('#ffffff',{side:T.DoubleSide,roughness:1}),records.length*7);litter.name='autumn-meadow-leaf-litter';litter.receiveShadow=true;meadow.add(litter);
 const dryHeads=new T.InstancedMesh(new T.SphereGeometry(.046,6,4).scale(1,.55,1).translate(0,.89,0),sway(material('#87784b')),records.length);dryHeads.name='autumn-spent-flower-heads';meadow.add(dryHeads);
 records.forEach((r,i)=>{
  dummy.position.set(r.x,.26,r.z);dummy.rotation.set(0,r.angle,0);dummy.scale.setScalar(.72+r.shade*.42);dummy.updateMatrix();meadowGrass.setMatrixAt(i,dummy.matrix);meadowGrass.setColorAt(i,new T.Color('#ffffff').multiplyScalar(.84+r.shade*.24));
  for(let j=0;j<7;j++){dummy.position.set(r.x+rr(-.12,.12),.312+rr(.001,.010),r.z+rr(-.10,.10));dummy.rotation.set(rr(-.055,.055),rr(0,6.28),rr(-.045,.045));dummy.scale.setScalar(rr(.16,.25));if(!withinGarden(dummy.position.x,dummy.position.z,.10)){dummy.position.x=r.x;dummy.position.z=r.z;}dummy.updateMatrix();litter.setMatrixAt(i*7+j,dummy.matrix);litter.setColorAt(i*7+j,new T.Color(['#9e5538','#cc783e','#dfac59','#b86c3c','#dfbc70'][(i+j)%5]));}
 });
 meadowGrass.instanceColor.needsUpdate=true;litter.instanceColor.needsUpdate=true;

 const pond=new T.Group();pond.name='summer-lily-pads';garden.add(pond);const pads=[];
 const veinMat=material('#a7cc78',{side:T.DoubleSide,roughness:1}),rimMat=material('#3d8a67',{side:T.DoubleSide});
 // Clusters hug calm shallows before and after the bridge, leaving the channel open.
 const anchors=[[.92,-.67,.28],[1.32,-.75,.23],[1.76,-.65,.27],[1.66,.69,.26],[2.12,.7,.3],[2.26,.35,.18],[4.14,-.52,.13],[4.13,-.18,.18],[4.12,.49,.15],[.35,.67,.24]];
 for(const [z,fraction,radius]of anchors){
  const x=cx(z)+fraction*width(z),g=new T.Group();g.name='floating-lily-pad';g.position.set(x,.09,z);pond.add(g);
  const border=[],count=30;
  // Radial slit and stepped, gently cupped outline are actual three-dimensional geometry.
  for(let i=0;i<=count;i++){const a=.23+i/count*(Math.PI*2-.46),r=radius*(1+.025*Math.sin(i*2.8));border.push(new T.Vector3(Math.cos(a)*r,.008+Math.sin(a*3)*.006,Math.sin(a)*r));}
  const positions=[0,-.007,0],indices=[];for(const point of border)positions.push(...point.toArray());
  for(let i=1;i<border.length;i++)indices.push(0,i+1,i);
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setIndex(indices);geo.computeVertexNormals();
  const mat=material(['#8dbe68','#afd375','#65ab78','#92c779'][pads.length%4],{side:T.DoubleSide,roughness:.64});
  mesh(geo,mat,[0,0,0],g);line(border.map(v=>v.toArray()),rimMat,.003,g);
  for(let j=0;j<7;j++){const a=.48+j*.84;line([[0,-.002,0],[Math.cos(a)*radius*.43,.009,Math.sin(a)*radius*.43],[Math.cos(a)*radius*.88,.014,Math.sin(a)*radius*.88]],veinMat,.002,g);}
  const angle=rr(0,6.28);g.rotation.y=angle;pads.push({g,x,z,angle,phase:rr(0,6.28),radius});
 }
 return {
  setSeason(season){
   paintCurvedGrass(meadowGrassGeometry,season);buds.material.color.set(season==='spring'?'#dfb6bf':'#d7d9a0');
   pond.visible=season==='summer';greens.visible=season==='summer'||season==='autumn'||season==='spring';petals.visible=hearts.visible=season==='summer';
   meadowGrass.visible=season==='spring'||season==='summer';buds.visible=season==='spring';litter.visible=dryHeads.visible=season==='autumn';
   const colors={spring:['#f3bec7','#f7dfac','#dfbedb','#f5e9d0','#d6c5e5'],summer:['#86bcd0','#f5e4ac','#e9b7c7','#b6acd6','#f3edcd'],autumn:['#d78c4d','#ebba61','#c27056','#e8d195','#d99968']}[season]||['#d2cbbb'];
   records.forEach((r,i)=>{
    petals.setColorAt(i,new T.Color(colors[r.kind%colors.length]));greens.setColorAt(i,new T.Color(season==='autumn'?'#998554':'#659967').offsetHSL(0,0,(r.shade-.5)*.12));
    const sparse=season==='spring'?i%23===0:season==='autumn'?i%11===0:true;
    dummy.position.set(r.x,.26,r.z);dummy.rotation.set(season==='autumn'?.18:0,r.angle,season==='autumn'?.24:0);dummy.scale.setScalar(sparse?r.height*(season==='spring'?.57:season==='autumn'?.63:1):0);dummy.updateMatrix();greens.setMatrixAt(i,dummy.matrix);buds.setMatrixAt(i,dummy.matrix);dryHeads.setMatrixAt(i,dummy.matrix);
   });
   for(const object of [greens,buds,dryHeads]){object.instanceMatrix.needsUpdate=true;object.computeBoundingSphere();object.boundingSphere.radius+=.1;}
   petals.instanceColor.needsUpdate=true;greens.instanceColor.needsUpdate=true;
  },
  update(time){wind.value=time;if(meadowGrass.visible)bendCurvedGrass(meadowGrassGeometry,time,gardenWind(time).gust);for(const p of pads){p.g.position.set(p.x+Math.sin(time*.36+p.phase)*.012,.091+Math.sin(time*1.1+p.phase)*.006,p.z+Math.cos(time*.31+p.phase)*.012);p.g.rotation.set(Math.sin(time*.71+p.phase)*.022,p.angle+Math.sin(time*.23+p.phase)*.035,Math.cos(time*.64+p.phase)*.018);}}
 };
}
