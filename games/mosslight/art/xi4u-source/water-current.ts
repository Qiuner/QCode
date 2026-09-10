// @ts-nocheck
import * as T from 'three';

/** Fine tapered current streaks travel downstream along the same bank curve. */
export function createWaterCurrent({root,mesh,cx,width,streamExtent}){
 const group=new T.Group();group.name='fine-downstream-current';root.add(group);const records=[];
 for(let i=0;i<34;i++){
  const steps=22,g=new T.BufferGeometry(),p=new Float32Array((steps+1)*6),ids=[];
  for(let j=0;j<steps;j++){const n=j*2;ids.push(n,n+2,n+1,n+1,n+2,n+3);}g.setAttribute('position',new T.BufferAttribute(p,3));g.setIndex(ids);
  const mat=new T.MeshBasicMaterial({color:i%3?'#c2e0d9':'#e0eee1',transparent:true,opacity:.16,depthWrite:false,side:T.DoubleSide});
  const object=mesh(g,mat,[0,0,0],group);object.name='fine-flow-ribbon';object.castShadow=false;object.receiveShadow=false;object.renderOrder=3;object.frustumCulled=false;
  records.push({object,p,steps,lane:Math.sin(i*2.399)*.81,phase:(i*.6180339)%1,length:.55+(i%7)*.12,halfWidth:.007+(i%4)*.0023,speed:.16+(i%5)*.018,seed:i*1.73});
 }
 function update(time,night=0,rain=0){
  for(const r of records){const z0=-5.5+((time*r.speed+r.phase*11)%11);
   for(let j=0;j<=r.steps;j++){
    const u=j/r.steps,z=z0+(u-.5)*r.length,e=streamExtent(z,cx,width),center=(e.left+e.right)*.5+r.lane*Math.max(.02,(e.right-e.left)*.5-.18)+Math.sin(z*2.2+r.seed+time*.14)*.034;
    const taper=Math.pow(Math.sin(Math.PI*u),.72)*T.MathUtils.smoothstep(z,-4.90,-4.55)*(1-T.MathUtils.smoothstep(z,3.88,4.35));
    const w=r.halfWidth*taper,gleam=1+Math.sin(u*17+r.seed-time*.8)*.11;
    r.p.set([center-w*gleam,.078,z,center+w*gleam,.078,z],j*6);
   }
   r.object.geometry.attributes.position.needsUpdate=true;r.object.material.opacity=(.13+.07*(.5+.5*Math.sin(time*.5+r.seed)))*(1-night*.22)*(1-rain*.26);
  }
 }
 update(0);return {group,update};
}
