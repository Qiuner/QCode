// @ts-nocheck
import * as T from 'three';

/** The renderer fills the entire viewport. UI margins influence only the reset
 * pose: they are never a viewport, scissor, mask or canvas-size restriction.
 * Orbit/zoom can therefore carry the scene underneath every floating overlay.
 */
export function createPortraitFraming(camera,controls,points,safeArea={top:0,bottom:0}){
 let initialized=false,width=1,height=1;
 const baseTarget=new T.Vector3(-.25,2.7,0);
 function framing(w,h){
  const portrait=w/h<.94,phone=w<=680;
  const azimuth=T.MathUtils.degToRad(portrait?30:24),elevation=T.MathUtils.degToRad(portrait?37:35);
  const outward=new T.Vector3(Math.sin(azimuth)*Math.cos(elevation),Math.sin(elevation),Math.cos(azimuth)*Math.cos(elevation));
  const right=new T.Vector3(Math.cos(azimuth),0,-Math.sin(azimuth)),up=outward.clone().cross(right).normalize();
  let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
  for(const p of points){const x=p.dot(right),y=p.dot(up);minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}
  const spanX=maxX-minX,spanY=maxY-minY,cx=(maxX+minX)*.5,cy=(maxY+minY)*.5;
  const short=h<=730,landscape=h<=520&&!phone;
  // These are composition guides only. The canvas remains exactly w by h.
  const left=phone?8:w<=1050?22:landscape?174:212;
  const rightMargin=phone?8:w<=1050?48:70;
  const top=(phone?(short?91:104):landscape?74:106)+(safeArea.top||0);
  const bottom=(phone?(short?142:158):landscape?91:116)+(safeArea.bottom||0);
  const usableW=Math.max(1,w-left-rightMargin),usableH=Math.max(1,h-top-bottom);
  const pixelsPerUnit=Math.min(usableW/spanX,usableH/spanY)/1.025;
  const artH=spanY*pixelsPerUnit;
  // Align the projected garden silhouette with the centered control dock.
  const screenX=w*.5;
  // Tall phones feel more grounded with the island a little below centre;
  // short displays clamp the initial silhouette above the floating controls.
  const preferredY=phone?h*.52:(top+h-bottom)*.5;
  const screenY=T.MathUtils.clamp(preferredY,top+artH*.5,h-bottom-artH*.5);
  const target=baseTarget.clone()
   .addScaledVector(right,cx-(screenX-w*.5)/pixelsPerUnit-baseTarget.dot(right))
   .addScaledVector(up,cy+(screenY-h*.5)/pixelsPerUnit-baseTarget.dot(up));
  const half=h/(2*pixelsPerUnit),aspect=w/h;
  return {target,position:target.clone().addScaledVector(outward,24),half,aspect};
 }
 function projection(f){camera.left=-f.half*f.aspect;camera.right=f.half*f.aspect;camera.top=f.half;camera.bottom=-f.half;camera.updateProjectionMatrix();}
 function reset(){
  // Flush remaining drag/zoom inertia through the public controls API before
  // restoring the pose; otherwise update() would pan away from reset again.
  const damping=controls.enableDamping;controls.enableDamping=false;controls.update();controls.enableDamping=damping;
  const f=framing(width,height);camera.zoom=1;camera.position.copy(f.position);controls.target.copy(f.target);camera.lookAt(f.target);projection(f);controls.update();initialized=true;}
 return {
  resize(w,h){width=Math.max(1,w);height=Math.max(1,h);if(!initialized)reset();else projection(framing(width,height));},
  reset,
 };
}

/** Capture exact world vertex samples instead of projecting one giant world
 * bounding box (whose imaginary corners add a lot of empty space). Call once
 * after the summer canopy has been built and seasonal visibility initialized.
 * Ground/water geometry must already follow the final organic perimeter. */
export function collectGardenFramePoints(root){
 root.updateMatrixWorld(true);
 const points=[],instance=new T.Matrix4(),world=new T.Matrix4(),p=new T.Vector3();
 root.traverse(o=>{
  if(!o.isMesh || /fine-flow-ribbon|water-impact-ripple/.test(o.name))return;
  for(let a=o;a&&a!==root;a=a.parent)if(!a.visible)return;
  // Transparent sprites and trails do not define enduring scene boundaries.
  const materials=Array.isArray(o.material)?o.material:[o.material];
  if(materials.every(m=>m.transparent && m.opacity<.25))return;
  const position=o.geometry?.getAttribute('position');if(!position)return;
  const stride=o.isInstancedMesh?1:Math.max(1,Math.floor(position.count/360));
  const add=matrix=>{for(let i=0;i<position.count;i+=stride){p.fromBufferAttribute(position,i).applyMatrix4(matrix);if(p.y<-.15 || !Number.isFinite(p.x+p.y+p.z))continue;points.push(p.clone());}};
  if(o.isInstancedMesh){for(let i=0;i<o.count;i++){o.getMatrixAt(i,instance);if(Math.abs(instance.determinant())<1e-11)continue;world.multiplyMatrices(o.matrixWorld,instance);add(world);}}
  else add(o.matrixWorld);
 });
 return points;
}
