// @ts-nocheck
import * as T from 'three';

/** Glazed pot with soil, green petioles, and closed curved leaf blades. */
export function createVerandaPlant({root,material,mesh,lathe,line},x,z,name){
 const group=new T.Group();group.name=name;group.position.set(x,.945,z);root.add(group);
 const glaze=material('#658777',{roughness:.55}),rim=material('#91ab83',{roughness:.6});
 const earth=material('#675444'),stem=material('#527d49'),vein=material('#9bb477');
 lathe([[.10,0],[.115,.008],[.119,.035],[.157,.244],[.173,.258],[.173,.279],[.155,.291],[.145,.28],[.143,.249]],glaze,[0,0,0],group);
 mesh(new T.TorusGeometry(.159,.013,6,36),rim,[0,.275,0],group).rotation.x=Math.PI/2;
 mesh(new T.CylinderGeometry(.143,.14,.018,28),earth,[0,.242,0],group);
 const leafMat=material('#ffffff',{vertexColors:true,roughness:.8,side:T.DoubleSide});
 for(let i=0;i<8;i++){
  const a=i*2.399+.4,dx=Math.cos(a),dz=Math.sin(a),h=.30+(i%3)*.043,spread=.16+(i%3)*.035;
  const base=new T.Vector3(dx*.024,.247,dz*.024),start=new T.Vector3(dx*.035,.32,dz*.035);
  line([base.toArray(),start.toArray(),[dx*.055,.40,dz*.055]],stem,.006,group);
  const curve=new T.CatmullRomCurve3([start,new T.Vector3(dx*.045,.32+h*.63,dz*.045),new T.Vector3(dx*spread*.7,.32+h,dz*spread*.7),new T.Vector3(dx*spread,.30+h*.81,dz*spread)]);
  const p=[],c=[],indices=[],steps=24,sides=8;
  for(let j=0;j<=steps;j++){
   const u=j/steps,at=curve.getPoint(u),t=curve.getTangent(u).normalize(),across=new T.Vector3(-dz,0,dx),up=t.clone().cross(across).normalize();
   const breadth=.003+Math.pow(Math.sin(Math.PI*u),.8)*(.033+(i%2)*.01);
   for(let k=0;k<=sides;k++){
    const b=k/sides*Math.PI*2,v=at.clone().addScaledVector(across,Math.cos(b)*breadth).addScaledVector(up,Math.sin(b)*(.0025+Math.sin(Math.PI*u)*.003));p.push(...v.toArray());
    const color=new T.Color(Math.sin(b)>.1?(i%2?'#568b54':'#477d4c'):'#37654a');color.offsetHSL(0,0,u*.06);c.push(color.r,color.g,color.b);
    if(j<steps&&k<sides){const n=j*(sides+1)+k;indices.push(n,n+sides+1,n+1,n+1,n+sides+1,n+sides+2);}
   }
  }
  const cap=p.length/3;p.push(...curve.getPoint(0).toArray(),...curve.getPoint(1).toArray());c.push(.1,.25,.12,.1,.25,.12);
  for(let k=0;k<sides;k++){indices.push(cap,k,k+1);const n=steps*(sides+1)+k;indices.push(cap+1,n+1,n);}
  for(let j=0;j<indices.length;j+=3)[indices[j+1],indices[j+2]]=[indices[j+2],indices[j+1]];
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('color',new T.Float32BufferAttribute(c,3));g.setIndex(indices);g.computeVertexNormals();mesh(g,leafMat,[0,0,0],group).name='potted-curved-green-leaf';
  const veins=[];for(let j=0;j<=12;j++){const u=j/12,t=curve.getTangent(u).normalize(),up=t.clone().cross(new T.Vector3(-dz,0,dx)).normalize();veins.push(curve.getPoint(u).addScaledVector(up,.006).toArray());}line(veins,vein,.0016,group);
 }
 return group;
}
