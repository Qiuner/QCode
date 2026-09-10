// @ts-nocheck
import * as T from 'three';

/** Static shoreline ice. Its depth-writing translucent surface covers the fine
 * current/ripple geometry below it, while the middle of the creek stays open.
 * Does not sample or consume the garden's random stream, move terrain, or touch
 * the bird's rock/perch. Three merged draw calls; no per-frame geometry work.
 */
export function createWinterCreekIce({root,cx,width,streamExtent,inWater,bridge,birdRock,bird}){
 const group=new T.Group();group.name='winter-partial-creek-ice';group.visible=false;group.userData.inkOutline=false;root.add(group);
 root.updateMatrixWorld(true);
 const bridgeBox=bridge?new T.Box3().setFromObject(bridge):new T.Box3(new T.Vector3(-4,0,2.52),new T.Vector3(4,1,3.90));
 const birdBox=birdRock?new T.Box3().setFromObject(birdRock):new T.Box3(new T.Vector3(-1.9,0,.20),new T.Vector3(-.9,.17,.9));
 const birdPerch=bird?.userData.drinkingPerch??[cx(.55)-width(.55)+.485,.157,.532];
 const beforeBridge=bridgeBox.min.z-.13,afterBridge=bridgeBox.max.z+.13;
 // Each strip grows inward from the actual creek edge. The front bank pieces
 // stop before every bridge piling, and a generous inlet surrounds the bird.
 const definitions=[
  {side:-1,from:-4.57,to:Math.min(-.40,birdBox.min.z-.26),depth:.69,seed:1},
  {side:1,from:-4.55,to:beforeBridge,depth:.73,seed:2},
  {side:-1,from:Math.max(1.40,birdBox.max.z+.35),to:beforeBridge,depth:.71,seed:3},
  {side:1,from:afterBridge,to:4.32,depth:.30,seed:4},
  {side:-1,from:afterBridge+.025,to:4.29,depth:.25,seed:5}
 ].filter(d=>d.to-d.from>.10);
 const pos=[],colors=[],indices=[],frostPos=[],frostIndices=[],crackPos=[],crackIndices=[],bands=[];
 const iceY=.091,frostY=.093,crackY=.094;
 function push(x,y,z,u,seed){pos.push(x,y,z);const v=.91+.045*Math.sin(z*11+seed)+.02*Math.sin(z*31-x*7);colors.push(v*(.87+u*.05),v*(.95+u*.025),v);return pos.length/3-1;}
 function triangle(out,a,b,c,positions){const ax=positions[a*3],az=positions[a*3+2],bx=positions[b*3],bz=positions[b*3+2],cx=positions[c*3],cz=positions[c*3+2];if((bx-ax)*(cz-az)-(bz-az)*(cx-ax)>0)out.push(a,c,b);else out.push(a,b,c);}
 function ribbon(points,widths,out,ids,y){
  for(let j=0;j<points.length-1;j++){
   const A=points[j],B=points[j+1],dx=B.x-A.x,dz=B.z-A.z,len=Math.hypot(dx,dz);if(len<.00001)continue;
   const nx=-dz/len,nz=dx/len,wa=widths[j],wb=widths[j+1],n=out.length/3;
   out.push(A.x+nx*wa,y,A.z+nz*wa,A.x-nx*wa,y,A.z-nz*wa,B.x+nx*wb,y,B.z+nz*wb,B.x-nx*wb,y,B.z-nz*wb);
   triangle(ids,n,n+1,n+2,out);triangle(ids,n+1,n+3,n+2,out);
  }
 }
 for(const d of definitions){
  const steps=Math.max(6,Math.ceil((d.to-d.from)/.075)),rows=[];
  for(let j=0;j<=steps;j++){
   const u=j/steps,z=T.MathUtils.lerp(d.from,d.to,u),edge=streamExtent(z,cx,width),span=edge.right-edge.left;
   const margin=.076+.008*Math.sin(z*9+d.seed),outer=(d.side<0?edge.left:edge.right)-d.side*margin;
   // Tapered tips and several scales of irregularity avoid straight parallel edges.
   const taper=Math.pow(Math.sin(Math.PI*u),.42),jag=.91+.115*Math.sin(z*5.7+d.seed)+.052*Math.sin(z*18.3-d.seed)+.021*Math.sin(j*2.16);
   const depth=Math.min(d.depth*taper*jag,span*.32),inner=outer-d.side*depth;
   const row={z,outer,inner};rows.push(row);
   const start=push(outer,iceY,z,0,d.seed),mid=push(T.MathUtils.lerp(outer,inner,.48),iceY+.0008,z,.48,d.seed),end=push(inner,iceY,z,1,d.seed);row.indices=[start,mid,end];
   if(j){const old=rows[j-1].indices;for(let k=0;k<2;k++){triangle(indices,old[k],row.indices[k],old[k+1],pos);triangle(indices,old[k+1],row.indices[k],row.indices[k+1],pos);}}
  }
  const band={...d,rows,minX:Math.min(...rows.flatMap(r=>[r.outer,r.inner])),maxX:Math.max(...rows.flatMap(r=>[r.outer,r.inner]))};bands.push(band);
  // Frost stays inside the ice footprint and is strongest on the irregular
  // water-facing edge. This is a narrow ribbon, not a separate white cap.
  const rimRows=[];for(const r of rows){const depth=Math.abs(r.inner-r.outer),w=Math.min(.034,depth*.26)*(1+.22*Math.sin(r.z*15+d.seed)),n=frostPos.length/3;frostPos.push(r.inner+d.side*Math.min(.0025,depth*.02),frostY,r.z,r.inner+d.side*w,frostY,r.z);rimRows.push(n);if(rimRows.length>1){const p=rimRows.at(-2);triangle(frostIndices,p,n,p+1,frostPos);triangle(frostIndices,p+1,n,n+1,frostPos);}}
 }
 // A thin blue-grey edge closes each sheet down to the water surface. Upper
 // faces stay at .091; lower faces at .055 prevent a hovering white plane.
 for(const b of bands)for(let j=0;j<b.rows.length-1;j++)for(const outer of[true,false]){
  const A=b.rows[j],B=b.rows[j+1],xA=outer?A.outer:A.inner,xB=outer?B.outer:B.inner,n=pos.length/3,outward=outer?b.side:-b.side;
  for(const [x,y,z]of[[xA,iceY,A.z],[xA,.055,A.z],[xB,iceY,B.z],[xB,.055,B.z]]){pos.push(x,y,z);colors.push(.70,.84,.90);}
  if(outward<0)indices.push(n,n+1,n+2,n+1,n+3,n+2);else indices.push(n,n+2,n+1,n+1,n+2,n+3);
 }
 function rowAt(b,z){const f=T.MathUtils.clamp((z-b.from)/(b.to-b.from)*(b.rows.length-1),0,b.rows.length-1),i=Math.min(b.rows.length-2,Math.floor(f)),t=f-i,A=b.rows[i],B=b.rows[i+1];return{outer:T.MathUtils.lerp(A.outer,B.outer,t),inner:T.MathUtils.lerp(A.inner,B.inner,t)};}
 function inFootprint(x,z,margin=0){
  for(const b of bands){if(z<b.from-1e-6||z>b.to+1e-6||x<b.minX-1e-6||x>b.maxX+1e-6)continue;const r=rowAt(b,z),lo=Math.min(r.outer,r.inner),hi=Math.max(r.outer,r.inner);if(x>=lo+margin-1e-6&&x<=hi-margin+1e-6)return true;}return false;
 }
 // Sparse branching hairline cracks are flat tapered ribbons. Every endpoint
 // and ribbon corner is clipped against the same strip, never across open water.
 for(const b of bands){const n=Math.max(1,Math.floor((b.to-b.from)/1.15));for(let k=0;k<n;k++){
  const t=(k+.62)/(n+.25),z=T.MathUtils.lerp(b.from,b.to,t),row=rowAt(b,z),x=T.MathUtils.lerp(row.outer,row.inner,.66),depth=Math.abs(row.inner-row.outer),length=Math.min(.30,depth*.55);
  const pts=[{x:x-b.side*length*.23,z:z-.13},{x,z},{x:x+b.side*length*.45,z:z+.105},{x:x+b.side*length*.24,z:z+.18}];
  const paths=[pts,[pts[1],{x:x-b.side*length*.42,z:z+.055},{x:x-b.side*length*.58,z:z+.11}]];
  for(const path of paths){const safe=path.every(p=>inFootprint(p.x,p.z,.014));if(!safe)continue;ribbon(path,path.map((_,i)=>i===path.length-1?.0012:.0028),crackPos,crackIndices,crackY);}
 }}
 function geometry(p,ids){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(ids);g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();return g;}
 const iceGeo=geometry(pos,indices);iceGeo.setAttribute('color',new T.Float32BufferAttribute(colors,3));
 const iceMaterial=new T.MeshStandardMaterial({color:'#abc5ce',vertexColors:true,roughness:.43,metalness:.03,transparent:true,opacity:.83,depthWrite:true,side:T.DoubleSide,emissive:'#54798b',emissiveIntensity:.018});
 const frostMaterial=new T.MeshBasicMaterial({color:'#e4edef',transparent:true,opacity:.56,depthWrite:false,side:T.DoubleSide});
 const crackMaterial=new T.MeshBasicMaterial({color:'#657e8a',transparent:true,opacity:.36,depthWrite:false,side:T.DoubleSide});
 iceMaterial.forceSinglePass=frostMaterial.forceSinglePass=crackMaterial.forceSinglePass=true;
 const ice=new T.Mesh(iceGeo,iceMaterial),frost=new T.Mesh(geometry(frostPos,frostIndices),frostMaterial),cracks=new T.Mesh(geometry(crackPos,crackIndices),crackMaterial);
 ice.name='translucent-bank-ice';frost.name='fine-ice-frost-rim';cracks.name='hairline-ice-cracks';
 for(const o of[ice,frost,cracks]){o.castShadow=false;o.receiveShadow=o===ice;o.userData.inkOutline=false;group.add(o);}ice.renderOrder=2.5;frost.renderOrder=3.5;cracks.renderOrder=3.6;
 const iceDay=new T.Color('#abc5ce'),iceNight=new T.Color('#5b7e94'),frostDay=new T.Color('#e4edef'),frostNight=new T.Color('#adc4d3'),crackDay=new T.Color('#657e8a'),crackNight=new T.Color('#3f6176');let lastNight=-1;
 function update(season,night=0){group.visible=season==='winter';if(Math.abs(night-lastNight)<.0001)return;lastNight=night;iceMaterial.color.copy(iceDay).lerp(iceNight,night);iceMaterial.emissiveIntensity=T.MathUtils.lerp(.018,.07,night);frostMaterial.color.copy(frostDay).lerp(frostNight,night);frostMaterial.opacity=T.MathUtils.lerp(.56,.42,night);crackMaterial.color.copy(crackDay).lerp(crackNight,night);crackMaterial.opacity=T.MathUtils.lerp(.36,.28,night);}
 function contains(x,z){return group.visible&&inFootprint(x,z);}
 let area=0;for(let i=0;i<indices.length;i+=3){const a=indices[i]*3,b=indices[i+1]*3,c=indices[i+2]*3;area+=Math.abs((pos[b]-pos[a])*(pos[c+2]-pos[a+2])-(pos[b+2]-pos[a+2])*(pos[c]-pos[a]))*.5;}
 return {group,ice,frost,cracks,bands,update,contains,inFootprint,stats:{area,bands:bands.length,meshes:3,iceTriangles:indices.length/3,frostTriangles:frostIndices.length/3,crackTriangles:crackIndices.length/3,iceY,bridgeExclusion:[beforeBridge,afterBridge],birdPerch:[...birdPerch]},getHeight:(x,z)=>contains(x,z)?iceY+.001:null};
}
