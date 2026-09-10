// @ts-nocheck
import * as T from 'three';

/** Small shared ribbon meshes: no RNG, no shader displacement, fixed roots. */
export function createCurvedGrassGeometry(heights,{rootRadius=.06,reach=.063,bladeWidth=.032,segments=6,angleStep=2.399}={}){
 const positions=[],indices=[],tones=[];
 for(let leaf=0;leaf<heights.length;leaf++){
  const angle=leaf*angleStep,height=heights[leaf],direction=angle+Math.sin(leaf*1.71)*.12;
  const rx=Math.cos(angle)*rootRadius,rz=Math.sin(angle)*rootRadius;
  const dx=Math.cos(direction),dz=Math.sin(direction),sx=-dz,sz=dx,start=positions.length/3;
  function center(t){
   const s=1-t;
   // The tip falls gently from the arc: these are bent blades, not straight spikes.
   const distance=reach*(3*s*s*t*.05+3*s*t*t*.83+t*t*t);
   return [rx+dx*distance,height*(3*s*s*t*.50+3*s*t*t*1.24+t*t*t*.74),rz+dz*distance];
  }
  for(let j=0;j<segments;j++){
   const t=j/segments,c=center(t),half=bladeWidth*.5*(.58+.7*Math.sin(Math.PI*t))*Math.pow(1-t,.7);
   for(const side of [-1,0,1]){
    positions.push(c[0]+side*sx*half,c[1]+(side===0?half*.13*Math.sin(Math.PI*t):0),c[2]+side*sz*half);
    tones.push(leaf,t,side);
   }
   if(j<segments-1){const a=start+j*3,b=a+3;indices.push(a,b,a+1,a+1,b,b+1,a+1,b+1,a+2,a+2,b+1,b+2);}
  }
  const tip=positions.length/3;positions.push(...center(1));tones.push(leaf,1,0);
  const last=start+(segments-1)*3;indices.push(last,tip,last+1,last+1,tip,last+2);
 }
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
 geometry.setIndex(indices);geometry.computeVertexNormals();
 geometry.setAttribute('color',new T.Float32BufferAttribute(new Float32Array(positions.length),3));
 geometry.computeBoundingBox();geometry.computeBoundingSphere();geometry.boundingSphere.radius+=.03;
 geometry.userData.curvedGrass={rest:new Float32Array(positions),tones:new Float32Array(tones),
  height:geometry.boundingBox.max.y,rootRadius,reach,segments,leaves:heights.length,lastTime:null,lastGust:null};
 paintCurvedGrass(geometry,'summer');return geometry;
}

/** Pink upper shoots are limited to two blades per clump; summer stays green. */
export function paintCurvedGrass(geometry,season){
 const data=geometry.userData.curvedGrass;if(!data)return;
 const spring=season==='spring',autumn=season==='autumn',winter=season==='winter';
 const base=new T.Color(spring?'#7eaa87':autumn?'#948857':winter?'#a6b5a7':'#5f9967');
 const young=new T.Color(spring?'#bbcca7':autumn?'#c3ad79':winter?'#bdc9bc':'#a4bf7e');
 const blush=new T.Color('#d9a1b2'),pinkTip=new T.Color('#e9c8c7'),color=new T.Color(),attr=geometry.attributes.color;
 const smooth=(a,b,t)=>{const u=T.MathUtils.clamp((t-a)/(b-a),0,1);return u*u*(3-2*u);};
 for(let i=0;i<attr.count;i++){
  const leaf=data.tones[i*3],t=data.tones[i*3+1],side=data.tones[i*3+2];
  color.copy(base).lerp(young,.15+smooth(.05,.95,t)*.68);
  if(spring&&(leaf%7===2||leaf%7===5))color.lerp(blush,smooth(.24,.72,t)*.93).lerp(pinkTip,smooth(.76,1,t)*.53);
  // One broad lit ridge keeps the folded leaf legible without fine texture noise.
  color.multiplyScalar(side===0?1.025:.965);attr.setXYZ(i,color.r,color.g,color.b);
 }
 attr.needsUpdate=true;
}

/** Only a few hundred shared vertices move, so normals and shadow geometry agree. */
export function bendCurvedGrass(geometry,time,gust=0){
 const data=geometry.userData.curvedGrass;if(!data||data.lastTime===time&&data.lastGust===gust)return;
 data.lastTime=time;data.lastGust=gust;
 const breeze=T.MathUtils.clamp(gust,0,1),dx=Math.sin(time*.90)*(.005+.010*breeze),dz=Math.cos(time*.71+.8)*(.003+.006*breeze);
 const p=geometry.attributes.position,rest=data.rest,inv=1/Math.max(.001,data.height);
 for(let i=0;i<p.count;i++){
  const k=i*3,weight=Math.pow(rest[k+1]*inv,2);
  p.setXYZ(i,rest[k]+dx*weight,rest[k+1],rest[k+2]+dz*weight);
 }
 p.needsUpdate=true;geometry.computeVertexNormals();
}
