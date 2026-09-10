// @ts-nocheck
import * as T from 'three';

// A clipped garden vignette: a generous root pocket, a narrow forecourt,
// and asymmetrical grassy tips beside the open creek. No rectangular plinth.
const knots=[[-4.68,-4.50,3.44],[-4.02,-4.83,4.00],[-2.80,-4.71,4.43],[-1.58,-4.87,4.72],[-.55,-5.25,4.80],[.12,-5.37,4.79],[.86,-4.82,4.68],[1.67,-4.34,4.62],[2.42,-3.90,4.46],[3.15,-3.26,3.98],[3.72,-2.03,3.05],[4.12,-.72,2.14]];
export const LAND_MIN_Z=knots[0][0],LAND_MAX_Z=knots.at(-1)[0];
export function outerBank(side,z){
 let i=0;while(i<knots.length-2&&z>knots[i+1][0])i++;
 const a=knots[i],b=knots[i+1],u=T.MathUtils.clamp((z-a[0])/(b[0]-a[0]),0,1),smooth=u*u*(3-2*u),col=side<0?1:2;
 return T.MathUtils.lerp(a[col],b[col],smooth)+(.038*Math.sin(z*8.3+side)+.020*Math.sin(z*17.1-side))*(Math.sin(Math.PI*u)*.5+.5);
}
export function withinGarden(x,z,margin=0){return z>=LAND_MIN_Z+margin&&z<=LAND_MAX_Z-margin&&x>outerBank(-1,z)+margin&&x<outerBank(1,z)-margin;}
export function streamExtent(z,cx,width){
 const center=cx(z),back=T.MathUtils.clamp((z+4.94)/.44,0,1),front=T.MathUtils.clamp((4.45-z)/.55,0,1),taper=Math.min(Math.sqrt(back*(2-back)),Math.sqrt(front*(2-front)));
 return {left:center-width(z)*taper,right:center+width(z)*taper};
}
export function withinCreek(x,z,cx,width,margin=0){if(z< -4.93+margin||z>4.44-margin)return false;const e=streamExtent(z,cx,width);return x>e.left+margin&&x<e.right-margin;}

export function createOrganicTerrain({root,mesh,material,groundMat,bedMat,cx,width}){
 const group=new T.Group();group.name='organic-garden-ground';root.add(group);
 const ink=material('#292a2b',{roughness:1}),earth=material('#6e7960',{roughness:1});
 const banks=[];
 for(const side of [-1,1]){
  const inner=[],outer=[];
  for(let z=LAND_MIN_Z;z<=LAND_MAX_Z+.001;z+=.052){
   const bank=cx(z)+side*width(z)+Math.sin(z*3.4)*.09,edge=outerBank(side,z);
   if(side*(edge-bank)<.035)continue;
   inner.push(new T.Vector3(bank,.30,z));outer.push(new T.Vector3(edge,.30,z));
  }
  const contour=[...outer,...inner.slice().reverse()],shape=new T.Shape();
  contour.forEach((p,i)=>i?shape.lineTo(p.x,p.z):shape.moveTo(p.x,p.z));shape.closePath();
  const geo=new T.ExtrudeGeometry(shape,{depth:.024,bevelEnabled:true,bevelSize:.016,bevelThickness:.012,bevelSegments:1,steps:1});geo.rotateX(Math.PI/2);
  const bank=mesh(geo,groundMat,[0,.288,0],group);bank.name=side<0?'organic-left-bank':'organic-right-bank';banks.push(bank);
  // Only the creek-facing edge slopes down. The outside stays paper-thin.
  const pos=[],ids=[];
  for(let i=0;i<inner.length;i++){const p=inner[i];pos.push(p.x,.292,p.z,p.x-side*.135,-.096,p.z);if(i<inner.length-1){const n=i*2;side<0?ids.push(n,n+1,n+2,n+1,n+3,n+2):ids.push(n,n+2,n+1,n+1,n+2,n+3);}}
  for(let i=0;i<ids.length;i+=3)[ids[i+1],ids[i+2]]=[ids[i+2],ids[i+1]];
  const slopeGeo=new T.BufferGeometry();slopeGeo.setAttribute('position',new T.Float32BufferAttribute(pos,3));slopeGeo.setIndex(ids);slopeGeo.computeVertexNormals();const slope=mesh(slopeGeo,earth,[0,0,0],group);slope.name='natural-creek-cutbank';slope.material.side=T.DoubleSide;
  // Thin dark contour follows the uneven outer edge; no box frame under it.
  const outline=[...outer,...inner.slice().reverse(),outer[0]].map(p=>p.clone().setY(.282));
  const curve=new T.CatmullRomCurve3(outline,false,'centripetal');const edge=mesh(new T.TubeGeometry(curve,outline.length*2,.014,4,false),ink,[0,0,0],group);edge.name='ink-ground-edge';edge.castShadow=false;
 }
 function creekGeometry(y=0){const pos=[],uv=[],ids=[],rows=160,cols=28;
  for(let j=0;j<=rows;j++){const z=-4.94+j/rows*9.39,e=streamExtent(z,cx,width);for(let i=0;i<=cols;i++){const u=i/cols,x=T.MathUtils.lerp(e.left-.015,e.right+.015,u);pos.push(x,-z,y);uv.push(u,j/rows);if(j<rows&&i<cols){const n=j*(cols+1)+i;ids.push(n,n+cols+1,n+1,n+1,n+cols+1,n+cols+2);}}}
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(ids);geo.computeVertexNormals();return geo;
 }
 const bed=mesh(creekGeometry(),bedMat,[0,-.103,0],group);bed.rotation.x=-Math.PI/2;bed.name='irregular-creek-bed';bed.userData.inkOutline=false;
 // A broken ink edge around the exposed outlet is visible beneath clear water.
 for(const side of [-1,1]){const pts=[];for(let i=0;i<=24;i++){const z=3.74+i/24*.70,e=streamExtent(z,cx,width);pts.push(new T.Vector3(side<0?e.left:e.right,-.093,z));}const edge=mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts),56,.012,4,false),ink,[0,0,0],group);edge.name='ink-creek-outlet';edge.castShadow=false;}
 return {group,banks,waterGeometry:creekGeometry()};
}
