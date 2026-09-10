// @ts-nocheck
import * as T from 'three';

// One slow breath of wind shared by foliage, falling leaves and the furin.
// Pure simulation-time functions: pausing or seeking cannot desynchronise them.
export function gardenWind(time:number){
 const phase=((time-4)%26+26)%26;
 const envelope=phase<7?Math.pow(Math.sin(Math.PI*phase/7),2):0;
 return {gust:envelope,cycle:Math.floor((time-4)/26),
  x:Math.sin(time*.63)*.0015+envelope*(.003+Math.sin(time*1.5)*.0017),
  z:Math.sin(time*.5)*.0018+envelope*(.005+Math.sin(time*1.2)*.002)};
}
export function normalizeGardenWeather(season:string,weather:string){
 return (weather==='snow'&&season!=='winter')||(weather==='rain'&&season==='winter')?'clear':weather;
}
export function springStorm(time:number,season:string,night:boolean,weather:string){
 if(season!=='spring'||!night||weather!=='rain')return {flash:0,rumble:0,cycle:-1};
 const p=((time-9)%43+43)%43;
 // A distant, broad cloud glow; no rapid repeated screen flashes.
 return {flash:p<1.4?Math.sin(p/1.4*Math.PI)**2*.26:0,
  rumble:p>2.4&&p<7.8?Math.sin((p-2.4)/5.4*Math.PI)**2:0,cycle:Math.floor((time-9)/43)};
}

/** Five small night butterflies, ten instanced wings and five bodies. */
export function createNightButterflies({root,material}){
 const group=new T.Group();group.name='autumn-night-butterflies';root.add(group);
 const shape=new T.Shape();shape.moveTo(0,0);shape.bezierCurveTo(.012,.03,.041,.039,.049,.020);shape.bezierCurveTo(.061,-.001,.03,-.006,.042,-.024);shape.bezierCurveTo(.016,-.046,.004,-.017,0,0);
 const geo=new T.ShapeGeometry(shape,6);geo.rotateX(-Math.PI/2);
 const mat=material('#bcb5a2',{side:T.DoubleSide,emissive:'#a7b5c0',emissiveIntensity:.13,roughness:1});
 const wings=new T.InstancedMesh(geo,mat,10);wings.name='night-butterfly-wings';group.add(wings);
 const bodies=new T.InstancedMesh(new T.SphereGeometry(1,8,6),material('#554f48'),5);bodies.name='night-butterfly-bodies';group.add(bodies);
 for(const o of [wings,bodies]){o.castShadow=false;o.userData.inkOutline=false;o.frustumCulled=false;}
 const dummy=new T.Object3D(),parent=new T.Object3D(),matrix=new T.Matrix4();
 const anchors=[[-2.7,.70,1.05],[-3.25,.85,1.64],[-1.5,.84,1.45],[.6,.61,2.0],[2.9,.74,1.25]];
 function update(time,season,night){
  group.visible=season==='autumn'&&night;if(!group.visible)return;
  for(let i=0;i<5;i++){
   const [x,y,z]=anchors[i],p=time*(.30+i*.016)+i*2.2;
   parent.position.set(x+Math.sin(p)*.32,y+Math.sin(p*1.7)*.12,z+Math.cos(p*.83)*.25);parent.rotation.set(0,Math.atan2(Math.cos(p),-Math.sin(p*.83)*.83),Math.sin(p*1.2)*.15);parent.updateMatrix();
   for(const side of [-1,1]){
    const flap=.23+Math.sin(time*8.5+i)*.68;dummy.position.set(side*.003,0,0);dummy.rotation.set(0,0,side<0?Math.PI-flap:flap);dummy.scale.setScalar(.86);dummy.updateMatrix();matrix.multiplyMatrices(parent.matrix,dummy.matrix);wings.setMatrixAt(i*2+(side>0?1:0),matrix);
   }
   dummy.position.set(0,0,0);dummy.rotation.set(0,0,0);dummy.scale.set(.0045,.0045,.025);dummy.updateMatrix();matrix.multiplyMatrices(parent.matrix,dummy.matrix);bodies.setMatrixAt(i,matrix);
  }
  wings.instanceMatrix.needsUpdate=true;bodies.instanceMatrix.needsUpdate=true;
 }
 group.visible=false;return {group,update};
}
