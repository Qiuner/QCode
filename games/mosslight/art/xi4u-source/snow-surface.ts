import * as T from 'three';

/** A thin snow layer follows the upward-facing arc of the actual branch. */
export function branchSnowSurface(curve:T.Curve<T.Vector3>,r0:number,r1:number){
 const positions:number[]=[],indices:number[]=[],steps=40,sides=10;
 for(let i=0;i<=steps;i++){
  const t=i/steps,p=curve.getPoint(t),tangent=curve.getTangent(t).normalize();
  const up=new T.Vector3(0,1,0).addScaledVector(tangent,-tangent.y),exposure=up.length();
  if(exposure<.001)up.set(1,0,0);else up.normalize();
  const across=new T.Vector3().crossVectors(tangent,up).normalize();
  const end=Math.min(1,t*12,(1-t)*12),spread=(.02+.98*Math.sin(end*Math.PI/2))*T.MathUtils.smoothstep(exposure,.08,.5);
  const radius=T.MathUtils.lerp(r0,r1,Math.pow(t,.7));
  for(let j=0;j<=sides;j++){
   const s=j/sides*2-1,angle=s*1.12*spread;
   const thickness=(.004+.023*Math.pow(1-s*s,1.4))*spread*(.92+.08*Math.sin(t*23));
   const point=p.clone().addScaledVector(up,Math.cos(angle)*(radius+thickness)).addScaledVector(across,Math.sin(angle)*(radius+thickness));
   positions.push(...point.toArray());
   if(i<steps&&j<sides){const a=i*(sides+1)+j;indices.push(a,a+1,a+sides+1,a+1,a+sides+2,a+sides+1);}
  }
 }
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}

/** Surface coating uses the same rock triangles, so its edge cannot float off the rock. */
export function rockCoating(rock:T.BufferGeometry,offset=.009){
 const source=rock.index?rock.toNonIndexed():rock,p=source.getAttribute('position'),n=source.getAttribute('normal'),positions:number[]=[];
 for(let i=0;i<p.count;i+=3){
  const height=(p.getY(i)+p.getY(i+1)+p.getY(i+2))/3,up=(n.getY(i)+n.getY(i+1)+n.getY(i+2))/3;
  if(height<.06||up<.18)continue;
  for(let j=0;j<3;j++)positions.push(p.getX(i+j)+n.getX(i+j)*offset,p.getY(i+j)+n.getY(i+j)*offset,p.getZ(i+j)+n.getZ(i+j)*offset);
 }
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.computeVertexNormals();if(source!==rock)source.dispose();return geometry;
}
