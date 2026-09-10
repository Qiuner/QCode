// @ts-nocheck
import * as T from 'three';

/** Day/night props stay inside the existing house footprint; no layout RNG is consumed. */
export function createDayNightLife({root,material,mesh,box,ellipsoid,line,lathe,
 wood,woodDark,woodEdge,seasonalLife,seasonalTea,verandaTeaBase,
 summerProps,sleeper,brazier,openInteriorScreen}){
 const DECK=.945,TATAMI=1.0175,SPRING_TEA_SHIFT=3.32;
 const dayNightRoot=new T.Group();dayNightRoot.name='day-night-interior';root.add(dayNightRoot);
 const group=(name)=>{const g=new T.Group();g.name=name;g.visible=false;dayNightRoot.add(g);return g;};
 const cotton=material('#dedac4',{roughness:1}),cottonEdge=material('#b9b6a0',{roughness:1});
 const sage=material('#859a90',{roughness:1}),sageLight=material('#b2c0ab',{roughness:1});
 const quiltColor=material('#a97759',{roughness:1}),quiltEdge=material('#d0ab84',{roughness:1});

 // A closed, gently lofted cloth volume, with a level underside resting on its support.
 // Analytic folds avoid random-number side effects on the old garden layout.
 function cloth(name,w,d,h,m,position,parent,loft=.022){
  const nx=16,nz=24,verts=[],indices=[];
  function top(x,z){
   const u=x/w+.5,v=z/d+.5;
   const pillow=Math.pow(Math.max(0,Math.sin(Math.PI*u)*Math.sin(Math.PI*v)),.48);
   const fold=(Math.sin(u*23+v*3)+.45*Math.sin(v*31-u*5))*loft;
   return .018+(h-.018)*pillow+fold*pillow*.28;
  }
  for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){
   const x=(i/nx-.5)*w,z=(j/nz-.5)*d;verts.push(x,top(x,z),z);
  }
  for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){
   const a=j*(nx+1)+i,b=a+1,c=a+nx+1,e=c+1;indices.push(a,c,b,b,c,e);
  }
  const rim=[];
  for(let i=0;i<=nx;i++)rim.push(i);
  for(let j=1;j<=nz;j++)rim.push(j*(nx+1)+nx);
  for(let i=nx-1;i>=0;i--)rim.push(nz*(nx+1)+i);
  for(let j=nz-1;j>0;j--)rim.push(j*(nx+1));
  const bottomStart=verts.length/3;
  rim.forEach(i=>verts.push(verts[i*3],0,verts[i*3+2]));
  const center=verts.length/3;verts.push(0,0,0);
  for(let k=0;k<rim.length;k++){
   const next=(k+1)%rim.length,a=rim[k],b=rim[next],c=bottomStart+k,e=bottomStart+next;
   indices.push(a,b,c,b,e,c,center,c,e);
  }
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(verts,3));
  geo.setIndex(indices);geo.computeVertexNormals();
  const o=mesh(geo,m,position,parent);o.name=name;return {o,top};
 }

 const springBed=group('spring-night-futon');springBed.position.set(-.30,TATAMI,-2.56);
 const mattress=box(.98,.068,1.66,cotton,[0,.034,0],springBed,.025);mattress.name='spring-futon-contact-mattress';
 for(const x of [-.48,.48])line([[x,.035,-.78],[x,.034,-.34],[x,.036,.33],[x,.035,.78]],cottonEdge,.004,springBed);
 const cover=cloth('spring-futon-sage-quilt',.946,1.16,.117,sage,[0,.068,.195],springBed,.014);
 // A turned cotton cuff and restrained stitch lines make the bedding legible at phone scale.
 cloth('spring-futon-turned-cuff',.944,.155,.044,cotton,[0,.106,-.356],springBed,.003);
 for(const x of [-.31,0,.31]){
  const points=[];for(let j=0;j<15;j++){const z=-.50+j/14*1.00;points.push([x,.071+cover.top(x,z),z+.195]);}
  line(points,sageLight,.002,springBed);
 }
 cloth('spring-futon-pillow',.52,.315,.086,cotton,[.015,.068,-.588],springBed,.004);
 for(const x of [-.22,.25])line([[x,.083,-.713],[x,.089,-.59],[x,.083,-.46]],cottonEdge,.0025,springBed);

 const soup=group('winter-day-soup-bowl');soup.position.set(.22,DECK,-.70);
 const glaze=material('#9faaa0',{roughness:.4}),rimColor=material('#ddd4bc',{roughness:.4});
 const broth=material('#b88951',{roughness:.22});
 lathe([[.052,0],[.060,.008],[.071,.018],[.104,.041],[.135,.086],
  [.147,.137],[.145,.150],[.134,.150],[.130,.136],[.120,.094],[.093,.054],[.055,.028]],glaze,[0,0,0],soup).name='winter-soup-bowl-body';
 const lip=mesh(new T.TorusGeometry(.1395,.006,6,40),rimColor,[0,.15,0],soup);lip.rotation.x=Math.PI/2;
 const surface=mesh(new T.CircleGeometry(.126,40),broth,[0,.121,0],soup);surface.rotation.x=-Math.PI/2;surface.castShadow=false;
 const tofu=material('#eee2ba'),scallion=material('#70865a');
 for(const [x,z,a] of [[-.051,.009,-.25],[.033,-.036,.34]]){
  const bit=box(.038,.008,.031,tofu,[x,.125,z],soup,.004);bit.rotation.y=a;
 }
 for(const [x,z,a] of [[.013,.044,.2],[-.028,-.045,-.4],[.065,.012,.8]]){
  const ring=mesh(new T.TorusGeometry(.012,.0033,5,12),scallion,[x,.127,z],soup);ring.rotation.set(Math.PI/2,0,a);
 }

 const folded=group('winter-night-folded-quilt');folded.position.set(1.59,DECK,-.87);
 box(.61,.026,.56,cottonEdge,[0,.013,0],folded,.012).name='winter-folded-quilt-contact';
 for(let layer=0;layer<3;layer++){
  const w=.616-layer*.016,d=.552-layer*.012,y=.026+layer*.042;
  cloth(`winter-folded-quilt-layer-${layer+1}`,w,d,.054,layer===1?quiltEdge:quiltColor,[0,y,0],folded,.003);
  // The front edge exposes the folds instead of forming a single solid block.
  line([[-w*.44,y+.016,d/2+.001],[0,y+.014,d/2+.002],[w*.44,y+.018,d/2+.001]],cotton,.0035,folded);
 }
 for(const x of [-.19,.19])line([[x,.131,-.22],[x,.157,-.05],[x,.154,.14],[x,.129,.22]],quiltEdge,.005,folded);

 const closedScreens=group('summer-night-closed-shoji');
 const paperNight=material('#d8d1b6',{roughness:1,emissive:'#d3a15e',emissiveIntensity:0,side:T.DoubleSide});
 const left=-3.92,right=2.29,span=right-left,count=4,w=span/count,h=2.232;
 // Threshold reaches the deck: the panels sit on a track, with no floating lower edge.
 box(span+.04,TATAMI-DECK,.126,woodDark,[(left+right)/2,(TATAMI+DECK)/2,-1.55],closedScreens).name='night-shoji-supported-threshold';
 box(span+.045,.078,.132,woodDark,[(left+right)/2,TATAMI+h+.02,-1.55],closedScreens);
 // One opaque sheet behind all four tracks prevents oblique views through panel seams.
 const paperBacking=material('#67685b',{roughness:1,side:T.DoubleSide});
 box(span+.025,h+.018,.022,paperBacking,[(left+right)/2,TATAMI+h/2,-1.611],closedScreens).name='closed-shoji-continuous-paper-backing';
 for(let i=0;i<count;i++){
  const panel=new T.Group();panel.name=`closed-shoji-panel-${i+1}`;
  panel.position.set(left+(i+.5)*w,TATAMI,-1.55+(i%2?-.021:.021));closedScreens.add(panel);
  // Paper reaches the panel edges and overlaps the lattice backs by 6.5 mm.
  box(w,h,.032,paperNight,[0,h/2,.009],panel).name=`closed-shoji-paper-${i+1}`;
  for(const x of [-w/2+.021,w/2-.021])box(.047,h,.07,woodDark,[x,h/2,.017],panel);
  for(const y of [.024,h-.024])box(w,.048,.073,woodDark,[0,y,.017],panel);
  box(w-.055,.226,.053,wood,[0,.139,.023],panel);
  for(let k=1;k<6;k++)box(.018,h-.10,.027,woodEdge,[-w/2+k*w/6,h/2,.032],panel);
  for(let k=1;k<7;k++)box(w-.052,.020,.027,woodEdge,[0,.26+k*.279,.032],panel);
  const hx=(i%2?-1:1)*(w/2-.087);
  ellipsoid(hx,.985,.056,.019,.047,.008,woodDark,panel,12);
 }

 brazier.name='winter-veranda-brazier';brazier.position.z=-.64;
 let lastKey='';
 function setState(season,night){
  const key=season+':'+Boolean(night);if(key===lastKey)return false;lastKey=key;
  const day=!night;
  // This is the sole owner of these props' visibility and offsets.
  seasonalTea.position.set(season==='spring'?SPRING_TEA_SHIFT:season==='autumn'?2.70:0,season==='autumn'?-.036:0,0);
  seasonalTea.visible=day&&(season==='spring'||season==='autumn');
  verandaTeaBase.visible=season==='spring';
  summerProps.visible=day&&season==='summer';sleeper.group.visible=day&&season==='summer';
  brazier.visible=season==='winter';soup.visible=day&&season==='winter';
  springBed.visible=night&&season==='spring';folded.visible=night&&season==='winter';
  closedScreens.visible=night&&season==='summer';openInteriorScreen.visible=!closedScreens.visible;
  seasonalLife.setNight(Boolean(night));
  return true;
 }
 return {setState,group:dayNightRoot,refs:{springBed,soup,folded,closedScreens}};
}
