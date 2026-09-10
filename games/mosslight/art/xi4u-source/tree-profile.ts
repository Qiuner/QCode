import * as T from 'three';

/** Tree-local metres. Roots and the squirrel's lower route stay unchanged. */
export const ANCIENT_TREE_ORIGIN = [-4.12, .25, .1] as const;
export const ANCIENT_TRUNK_POINTS = [
  [0,0,0], [.06,.8,-.02], [.22,1.75,-.1], [.18,2.65,-.2],
  [.48,3.6,-.43], [.9,4.45,-.65], [1,5.8,-.8],
  [1.08,6.08,-.91], [1.23,6.36,-1.08],
] as const;
export const TREE_LIFT_START = 2.7;
export const TREE_LIFT_END = 6.3;
export const TREE_CROWN_LIFT = 3.4;
export const ANCIENT_CROWN_SPREADS = [.86,.66] as const;
export const ANCIENT_TOP_SPREAD = 1.05;
export const TREE_PROFILE = {origin:ANCIENT_TREE_ORIGIN,liftStart:TREE_LIFT_START,liftEnd:TREE_LIFT_END,crownLift:TREE_CROWN_LIFT,crownSpreads:ANCIENT_CROWN_SPREADS,topSpread:ANCIENT_TOP_SPREAD} as const;

/** C1-continuous monotone map; derivative is 1 at both joins. */
export function treeHeight(y:number) {
  const u=T.MathUtils.clamp((y-TREE_LIFT_START)/(TREE_LIFT_END-TREE_LIFT_START),0,1);
  return y+TREE_CROWN_LIFT*u*u*(3-2*u);
}
function treeHeightSlope(y:number) {
  const u=T.MathUtils.clamp((y-TREE_LIFT_START)/(TREE_LIFT_END-TREE_LIFT_START),0,1);
  return 1+TREE_CROWN_LIFT*6*u*(1-u)/(TREE_LIFT_END-TREE_LIFT_START);
}
export function liftTreeLocalPoint(p:T.Vector3) {
  return new T.Vector3(p.x,treeHeight(p.y),p.z);
}
/** Deform the actual tree mesh vertices once, in tree-local space. This also
 * carries bark grooves/ivy with the wood and leaves every low vertex exact. */
export function liftTreeMeshes(tree:T.Object3D) {
  tree.updateMatrixWorld(true);
  tree.traverse(o=>{
    const mesh=o as T.Mesh;if(!mesh.isMesh)return;
    const matrix=o.matrix.clone();
    for(let parent=o.parent;parent&&parent!==tree;parent=parent.parent)matrix.premultiply(parent.matrix);
    const inverse=matrix.clone().invert(),geometry=mesh.geometry.clone(),p=geometry.getAttribute('position');
    let changed=false;
    for(let i=0;i<p.count;i++){
      const v=new T.Vector3().fromBufferAttribute(p,i).applyMatrix4(matrix);
      if(v.y<=TREE_LIFT_START)continue;
      v.y=treeHeight(v.y);v.applyMatrix4(inverse);p.setXYZ(i,v.x,v.y,v.z);changed=true;
    }
    if(changed){p.needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();mesh.geometry=geometry;}
    else geometry.dispose();
  });
}
export function liftTreeWorldPoint(p:T.Vector3) {
  return new T.Vector3(p.x,ANCIENT_TREE_ORIGIN[1]+treeHeight(p.y-ANCIENT_TREE_ORIGIN[1]),p.z);
}
export function unliftTreeWorldPoint(p:T.Vector3) {
  const y=p.y-ANCIENT_TREE_ORIGIN[1];
  if(y<=TREE_LIFT_START)return p.clone();
  let lo=y-TREE_CROWN_LIFT,hi=y;
  for(let i=0;i<40;i++){const m=(lo+hi)/2;if(treeHeight(m)<y)lo=m;else hi=m;}
  return new T.Vector3(p.x,(lo+hi)/2+ANCIENT_TREE_ORIGIN[1],p.z);
}

/** Map the evaluated curve, not its control points: unchanged lower sections
 * retain their exact Catmull–Rom shape and the upper section has no kink. */
class LiftedTreeCurve extends T.Curve<T.Vector3> {
  constructor(public base:T.Curve<T.Vector3>,public originY=0){super();this.arcLengthDivisions=400;}
  getPoint(t:number,target=new T.Vector3()) {
    this.base.getPoint(t,target);target.y=this.originY+treeHeight(target.y-this.originY);return target;
  }
  getTangent(t:number,target=new T.Vector3()) {
    const y=this.base.getPoint(t).y-this.originY;
    this.base.getTangent(t,target);target.y*=treeHeightSlope(y);return target.normalize();
  }
}
export function createAncientCurve(points:ReadonlyArray<ReadonlyArray<number>>) {
  return new LiftedTreeCurve(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(p[0],p[1],p[2]))));
}
export function createAncientTrunkCurve(){return createAncientCurve(ANCIENT_TRUNK_POINTS);}
export function createTreeFlightCurve(points:T.Vector3[]) {
  return new LiftedTreeCurve(new T.CatmullRomCurve3(points.map(p=>p.clone())),ANCIENT_TREE_ORIGIN[1]);
}
