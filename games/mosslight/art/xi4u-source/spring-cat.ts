// @ts-nocheck
import * as T from 'three';

/** A small curled orange-and-white shorthair, supported on the engawa decking.
 * Anatomical references (author/tutorial primary sources):
 * https://monikazagrobelna.com/2019/07/24/sketchbook-original-how-to-draw-cats/
 * https://design.tutsplus.com/articles/how-to-draw-animals-cats-and-their-anatomy--vector-17417
 * Modeling workflow reference (reference -> shape -> details -> color):
 * https://www.youtube.com/watch?v=C1CFWDWTamo
 * All geometry, coat markings and animation are generated in code.
 */
export function createSpringCat({root,material,mesh,ellipsoid,line,beam}) {
  const group=new T.Group();group.name='event-spring-cat';group.position.set(.35,.945,-.94);group.rotation.y=.1;root.add(group);
  const body=new T.Group();body.name='cat-breathing-ribcage';group.add(body);
  const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
  const orange=new T.Color('#d99b56'),orangeLight=new T.Color('#e2ae70'),orangeShadow=new T.Color('#c38445');
  const tabby=new T.Color('#bc8147'),ivory=new T.Color('#f1e9d8'),creamColor=new T.Color('#e7dbc3');
  const coat=material('#ffffff',{vertexColors:true,roughness:.96});
  const fur=material('#d99b56',{roughness:.96}),furLight=material('#e3ae71',{roughness:.96});
  const milk=material('#f1e9d8',{roughness:.96}),cream=material('#e7dbc3',{roughness:.96});
  const earPink=material('#cc9e8d',{roughness:1}),earShade=material('#a87966',{roughness:1});
  const nosePink=material('#bb8375',{roughness:.9}),noseShade=material('#9c6f62',{roughness:1});
  const ink=material('#54483c',{roughness:1}),toeLine=material('#bcad98',{roughness:1});
  const whisker=material('#f7f0dd',{roughness:1});
  const smoothMin=(a,b,k)=>{const h=Math.max(k-Math.abs(a-b),0)/k;return Math.min(a,b)-h*h*k*.25;};
  function ellipsoidDistance(x,y,z,cx,cy,cz,rx,ry,rz,angle=0) {
    x-=cx;y-=cy;z-=cz;const c=Math.cos(angle),s=Math.sin(angle),xx=x*c-z*s,zz=x*s+z*c;
    const k0=Math.hypot(xx/rx,y/ry,zz/rz),k1=Math.hypot(xx/(rx*rx),y/(ry*ry),zz/(rz*rz));
    return k1<1e-8?-Math.min(rx,ry,rz):k0*(k0-1)/k1;
  }

  // Ribcage, shoulder and folded pelvis are smoothly merged into one watertight
  // skin. The inner abdomen fills the curl, avoiding both a torus hole and
  // overlapping spherical bulges. No separate spheres form the outer torso.
  const masses=[
    [-.150,.085,-.035,.090,.088,.092,.24],
    [-.055,.119,-.102,.139,.121,.111,.12],
    [.104,.105,-.051,.132,.109,.126,-.30],
    [.047,.052,.034,.112,.053,.097,-.20]
  ];
  function torsoField(x,y,z) {
    let d=ellipsoidDistance(x,y,z,...masses[0]);
    for(let i=1;i<masses.length;i++)d=smoothMin(d,ellipsoidDistance(x,y,z,...masses[i]),.041);
    // A softly flattened contact area lets the belly rest on the boards.
    return Math.max(d,-y);
  }
  function torsoColor(x,y,z) {
    if(y<.055||z>.010&&x<.115||x<-.133&&z>-.075)return ivory;
    const flowing=x+.020*Math.sin(z*18)+.014*Math.sin(y*17);
    if(y>.12&&z<.018&&[[-.092,.0075],[.028,.009],[.137,.007]].some(([a,w])=>Math.abs(flowing-a)<w))return tabby;
    return y>.205?orangeLight:orange;
  }
  function implicitGeometry(field,color,min,max,spacing=.011) {
    const nx=Math.ceil((max[0]-min[0])/spacing),ny=Math.ceil((max[1]-min[1])/spacing),nz=Math.ceil((max[2]-min[2])/spacing);
    const dx=(max[0]-min[0])/nx,dy=(max[1]-min[1])/ny,dz=(max[2]-min[2])/nz;
    const strideX=ny+1,strideZ=(nx+1)*(ny+1),values=new Float32Array((nx+1)*(ny+1)*(nz+1));
    const index=(x,y,z)=>z*strideZ+x*strideX+y;
    for(let z=0;z<=nz;z++)for(let x=0;x<=nx;x++)for(let y=0;y<=ny;y++)values[index(x,y,z)]=field(min[0]+x*dx,min[1]+y*dy,min[2]+z*dz);
    const pos=[],normals=[],colors=[],edgeCache=new Map(),normalCache=new WeakMap();
    const cube=[[0,0,0],[1,0,0],[1,1,0],[0,1,0],[0,0,1],[1,0,1],[1,1,1],[0,1,1]];
    const tetra=[[0,5,1,6],[0,1,2,6],[0,2,3,6],[0,3,7,6],[0,7,4,6],[0,4,5,6]];
    const gradient=(p)=>{const e=.0006;return V(field(p.x+e,p.y,p.z)-field(p.x-e,p.y,p.z),field(p.x,p.y+e,p.z)-field(p.x,p.y-e,p.z),field(p.x,p.y,p.z+e)-field(p.x,p.y,p.z-e)).normalize();};
    function emit(a,b,c) {
      const cross=b.clone().sub(a).cross(c.clone().sub(a));if(cross.lengthSq()<1e-28)return;
      const mid=a.clone().add(b).add(c).multiplyScalar(1/3),out=gradient(mid);
      if(cross.dot(out)<0)[b,c]=[c,b];
      // Individual triangle colors make clear, low-noise coat boundaries.
      const col=color(mid.x,mid.y,mid.z);
      for(const p of [a,b,c]){let n=normalCache.get(p);if(!n){n=gradient(p);normalCache.set(p,n);}pos.push(...p.toArray());normals.push(...n.toArray());colors.push(col.r,col.g,col.b);}
    }
    for(let z=0;z<nz;z++)for(let x=0;x<nx;x++)for(let y=0;y<ny;y++) {
      const gridIds=cube.map(q=>index(x+q[0],y+q[1],z+q[2])),f=gridIds.map(i=>values[i]);if(f.every(a=>a>=0)||f.every(a=>a<0))continue;
      const p=cube.map(q=>V(min[0]+(x+q[0])*dx,min[1]+(y+q[1])*dy,min[2]+(z+q[2])*dz));
      for(const ids of tetra) {
        const inside=ids.filter(k=>f[k]<0),outside=ids.filter(k=>f[k]>=0);if(!inside.length||!outside.length)continue;
        const edge=(a,b)=>{const ia=gridIds[a],ib=gridIds[b],key=Math.min(ia,ib)*values.length+Math.max(ia,ib);let q=edgeCache.get(key);if(!q){q=p[a].clone().lerp(p[b],f[a]/(f[a]-f[b]));edgeCache.set(key,q);}return q;};
        if(inside.length===1)emit(...outside.map(k=>edge(inside[0],k)));
        else if(outside.length===1)emit(...inside.map(k=>edge(outside[0],k)));
        else {const a=edge(inside[0],outside[0]),b=edge(inside[0],outside[1]),c=edge(inside[1],outside[0]),d=edge(inside[1],outside[1]);emit(a,b,c);emit(b,d,c);}
      }
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('normal',new T.Float32BufferAttribute(normals,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));return g;
  }
  const torso=mesh(implicitGeometry(torsoField,torsoColor,[-.27,-.014,-.252],[.261,.266,.174]),coat,[0,0,0],body);
  torso.name='cat-continuous-curled-torso';

  // A compact skull with cheek planes, a short nasal bridge, a small chin,
  // and a broad shallow muzzle. +Z is the face direction in this local rig.
  const head=new T.Group();head.name='cat-resting-head';
  const profile=[[-.081,.013,.002,.008],[-.071,.013,.045,.044],[-.052,.011,.073,.064],[-.024,.004,.088,.072],[.005,-.005,.09,.068],[.03,-.013,.079,.056],[.05,-.022,.060,.039],[.067,-.033,.039,.026],[.079,-.039,.019,.015],[.083,-.040,.001,.001]];
  const hpos=[],hidx=[],hcolors=[],hsides=24;
  profile.forEach(([z,cy,w,h],i)=>{
    for(let j=0;j<=hsides;j++) {
      const a=j/hsides*Math.PI*2,x=Math.cos(a)*w,y=cy+Math.sin(a)*h;
      hpos.push(x,y,z);
      let c=orange;
      if(y<-.012&&z>.015||Math.abs(x)<Math.max(.004,.022-y*.31)&&z>.027)c=ivory;
      else if(y>.026&&z>.008&&Math.abs(x)>.008&&Math.abs(x)<.057&&Math.abs(Math.sin((x+y*.1)*96))>.92)c=tabby;
      else if(y>.041)c=orangeLight;
      hcolors.push(c.r,c.g,c.b);
      if(i<profile.length-1&&j<hsides){const n=i*(hsides+1)+j;hidx.push(n,n+1,n+hsides+1,n+1,n+hsides+2,n+hsides+1);}
    }
  });
  const capStart=hpos.length/3;hpos.push(0,profile[0][1],profile[0][0],0,profile.at(-1)[1],profile.at(-1)[0]);hcolors.push(orange.r,orange.g,orange.b,ivory.r,ivory.g,ivory.b);
  for(let j=0;j<hsides;j++){hidx.push(capStart,j+1,j);const n=(profile.length-1)*(hsides+1)+j;hidx.push(capStart+1,n,n+1);}
  const hg=new T.BufferGeometry();hg.setAttribute('position',new T.Float32BufferAttribute(hpos,3));hg.setAttribute('color',new T.Float32BufferAttribute(hcolors,3));hg.setIndex(hidx);hg.computeVertexNormals();
  const skull=mesh(hg,coat,[0,0,0],head);skull.name='cat-shaped-skull';
  // Features are seated on the head's real surface, rather than guessed z values.
  skull.updateMatrixWorld(true);
  function onFace(x,y,offset=.0015) {
    const hit=new T.Raycaster(V(x,y,.3),V(0,0,-1)).intersectObject(skull,false)[0];
    return [x,y,(hit?hit.point.z:.045)+offset];
  }
  const muzzleGeo=new T.SphereGeometry(1,20,12),mp=muzzleGeo.attributes.position;
  for(let i=0;i<mp.count;i++){
    const x=mp.getX(i),y=mp.getY(i),z=mp.getZ(i);
    mp.setXYZ(i,x*.053,-.040+y*.022,.066+z*.022+.005*Math.sin(Math.abs(x)*Math.PI)*Math.max(0,z));
  }
  muzzleGeo.computeVertexNormals();const muzzle=mesh(muzzleGeo,milk,[0,0,0],head);muzzle.name='cat-bilobed-whisker-muzzle';
  const noseGeo=new T.BufferGeometry();noseGeo.setAttribute('position',new T.Float32BufferAttribute([-.012,-.024,.091,.012,-.024,.091,0,-.035,.097,0,-.024,.099,0,-.031,.086],3));
  noseGeo.setIndex([0,2,3,3,2,1,0,3,1,0,4,2,2,4,1,1,4,0]);noseGeo.computeVertexNormals();mesh(noseGeo,nosePink,[0,0,0],head).name='cat-small-nose';
  line([[-.009,-.028,.094],[-.005,-.029,.097]],noseShade,.001,head);
  line([[.009,-.028,.094],[.005,-.029,.097]],noseShade,.001,head);
  line([[0,-.035,.095],[0,-.043,.090],[-.012,-.049,.087]],ink,.0013,head);
  line([[0,-.043,.090],[.012,-.049,.087]],ink,.0013,head);
  for(const side of [-1,1]) {
    line([[side*.074,.000],[side*.059,-.006],[side*.039,-.006],[side*.027,-.001]].map(([x,y])=>onFace(x,y,.0017)),ink,.0021,head);
    // Thin, tapered-looking three-strand fans stay subordinate to the face.
    for(let j=0;j<3;j++) {
      const y=-.038-j*.008;
      line([[side*.038,y,.086],[side*.079,y+.007-j*.008,.102],[side*(.112+j*.005),y+.014-j*.011,.091-j*.005]],whisker,.00085,head);
      ellipsoid(side*(.03+j*.008),-.043+(j%2)*.006,.09,.0017,.0017,.0012,noseShade,head,6);
    }
  }

  // Open ear shells: convex backs, solid fur rims, recessed inner bowls and
  // a small basal fold. Their silhouettes are angled leaves with volume.
  const ears=[];
  function ear(side) {
    const rig=new T.Group();rig.name='cat-cupped-ear';rig.position.set(side*.068,.047,-.033);rig.rotation.z=-side*.12;rig.rotation.y=side*.17;head.add(rig);
    const boundary=[[-.034,-.01,.010],[-.036,.015,.003],[-.022,.052,-.005],[.014,.087,-.014],[.033,.034,-.006],[.036,.004,.008],[.018,-.018,.019],[-.015,-.018,.019]].map(([x,y,z])=>V(x*side,y,z));
    const inner=boundary.map(p=>V(p.x*.63,.022+(p.y-.022)*.71,p.z-.002));
    const back=boundary.map(p=>V(p.x*.96,p.y,p.z-.013));
    const positions=[],indices=[],parts=[];
    function face(a,b,c,m,desired) {
      const normal=b.clone().sub(a).cross(c.clone().sub(a));if(normal.dot(desired)<0)[b,c]=[c,b];
      const i=positions.length/3;positions.push(...a.toArray(),...b.toArray(),...c.toArray());indices.push(i,i+1,i+2);parts.push(m);
    }
    const backCenter=V(0,.025,-.032),bowl=V(side*.002,.019,-.008),forward=V(0,0,1);
    for(let i=0;i<8;i++) {
      const k=(i+1)%8;
      face(boundary[i],boundary[k],inner[i],0,forward);face(boundary[k],inner[k],inner[i],0,forward);
      face(inner[i],inner[k],bowl,i<4?1:2,forward);
      face(back[i],backCenter,back[k],0,V(0,0,-1));
      const outward=boundary[i].clone().add(boundary[k]).multiplyScalar(.5).sub(V(0,.025,-.008));outward.z=0;
      face(boundary[i],back[i],boundary[k],0,outward);face(boundary[k],back[i],back[k],0,outward);
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();parts.forEach((m,i)=>g.addGroup(i*3,3,m));
    mesh(g,[fur,earPink,earShade],[0,0,0],rig);
    line([[side*.017,-.011,.019],[side*.028,.002,.013],[side*.021,.01,.004]],cream,.0032,rig);
    line([[-side*.023,-.004,.019],[-side*.018,.016,.009]],milk,.0022,rig);
    ears.push(rig);
  }
  ear(-1);ear(1);
  head.position.set(-.157,.104,.066);head.rotation.set(.14,.28,-.1);group.add(head);

  // Bent forelegs disappear under the chest; only compact mitt-shaped paws
  // and their four toe divisions show beneath the resting muzzle.
  function paw(name,x,z,w=.040,d=.047,angle=0) {
    const geo=new T.SphereGeometry(1,18,10),p=geo.attributes.position;
    for(let i=0;i<p.count;i++) {
      const u=p.getX(i),v=p.getY(i),q=p.getZ(i);
      const toes=.0017*Math.cos((u+1)*Math.PI*3.5)*Math.pow(Math.max(0,q),4);
      p.setXYZ(i,u*w,Math.max(0,.018+v*.021),q*d+toes);
    }
    geo.computeVertexNormals();const g=new T.Group();g.name=name;g.position.set(x,0,z);g.rotation.y=angle;group.add(g);mesh(geo,milk,[0,0,0],g);
    for(let i=-1;i<=1;i++)line([[i*w*.44,.024,d*.90],[i*w*.43,.033,d*.72]],toeLine,.0011,g);
    return g;
  }
  paw('cat-tucked-left-forepaw',-.127,.154,.039,.047,.16);
  paw('cat-tucked-right-forepaw',-.057,.134,.035,.042,-.22);
  paw('cat-tucked-hind-toes',.072,.102,.044,.049,-.68);

  // One tapered wrapped tail, rooted at the folded pelvis. Bands share its
  // vertices; there are no overlaid rings, separate sausages or spherical tip.
  const tailCurve=new T.CatmullRomCurve3([[.170,.080,.018],[.223,.052,.080],[.208,.030,.143],[.132,.024,.178],[.025,.020,.180],[-.075,.014,.148]].map(p=>V(...p)));
  const radiusStops=[.029,.026,.023,.019,.012,.0013],tsteps=52,tsides=12,tp=[],ti=[],tc=[];
  const radiusAt=t=>{const q=t*(radiusStops.length-1),k=Math.min(radiusStops.length-2,Math.floor(q));return T.MathUtils.lerp(radiusStops[k],radiusStops[k+1],q-k);};
  for(let i=0;i<=tsteps;i++) {
    const t=i/tsteps,p=tailCurve.getPoint(t),tangent=tailCurve.getTangent(t).normalize(),across=V(0,1,0).cross(tangent).normalize(),up=tangent.clone().cross(across).normalize(),r=radiusAt(t);
    for(let j=0;j<=tsides;j++) {
      const a=j/tsides*Math.PI*2,q=p.clone().addScaledVector(across,Math.cos(a)*r).addScaledVector(up,Math.sin(a)*r*.84);
      tp.push(q.x,Math.max(.001,q.y),q.z);
      const c=t>.91?ivory:(t>.36&&t<.41||t>.64&&t<.70)?tabby:orange;
      tc.push(c.r,c.g,c.b);
      if(i<tsteps&&j<tsides){const n=i*(tsides+1)+j;ti.push(n,n+1,n+tsides+1,n+1,n+tsides+2,n+tsides+1);}
    }
  }
  const tcap=tp.length/3;tp.push(...tailCurve.getPoint(0).toArray(),...tailCurve.getPoint(1).toArray());tc.push(orange.r,orange.g,orange.b,ivory.r,ivory.g,ivory.b);
  for(let j=0;j<tsides;j++){ti.push(tcap,j+1,j);const n=tsteps*(tsides+1)+j;ti.push(tcap+1,n,n+1);}
  const tg=new T.BufferGeometry();tg.setAttribute('position',new T.Float32BufferAttribute(tp,3));tg.setAttribute('color',new T.Float32BufferAttribute(tc,3));tg.setIndex(ti);tg.computeVertexNormals();
  mesh(tg,coat,[0,0,0],group).name='cat-continuous-short-wrapped-tail';

  // A clear patch on the tree's right-front bank, below the engawa; the old day spot stays exact.
  const sleepSpots={day:V(.35,.945,-.94),night:V(-2.95,.3005,.39)};
  const fadeMeshes=[],fadeMaterials=new Set();
  group.traverse(o=>{if(!o.isMesh)return;fadeMeshes.push({o,shadow:o.castShadow});for(const m of Array.isArray(o.material)?o.material:[o.material])fadeMaterials.add(m);});
  let lastTime=null,restingNight=false,targetNight=false,visibility=1,phase='rest';
  function settle(night) {restingNight=night;group.position.copy(night?sleepSpots.night:sleepSpots.day);group.userData.sleepSite=night?'tree-ground':'veranda';}
  function update(time=0,night=false) {
    const t=Number.isFinite(time)?time:0;
    if(lastTime===null||t<lastTime){targetNight=!!night;settle(targetNight);visibility=1;phase='rest';lastTime=t;}
    let dt=Math.max(0,t-lastTime);lastTime=t;
    if(!!night!==targetNight){targetNight=!!night;phase=targetNight===restingNight?'in':'out';dt=0;}
    // Quietly change sleeping places while fully faded. The same simulation
    // clock drives this transition and breathing, so pausing freezes both.
    for(let pass=0;pass<3&&dt>0&&phase!=='rest';pass++){
      if(phase==='out'){
        const step=Math.min(visibility,dt/.65);visibility-=step;dt-=step*.65;
        if(visibility<=1e-8){visibility=0;settle(targetNight);phase='in';dt=0;}
      }else{
        const step=Math.min(1-visibility,dt/.80);visibility+=step;dt-=step*.80;
        if(visibility>=1-1e-8){visibility=1;phase='rest';}
      }
    }
    const opacity=visibility*visibility*(3-2*visibility),fading=opacity<.999999;
    for(const m of fadeMaterials){if(m.transparent!==fading){m.transparent=fading;m.depthWrite=!fading;m.needsUpdate=true;}m.opacity=opacity;}
    for(const {o,shadow} of fadeMeshes)o.castShadow=shadow&&!fading;
    group.visible=opacity>1e-6;group.userData.sleepOpacity=opacity;group.userData.sleepTransition=phase;
    const breath=.5+.5*Math.sin(t*1.1);body.scale.y=1+breath*.006;
    const twitch=Math.pow(Math.max(0,Math.sin(t*.18-.8)),22)*Math.sin(t*4.4)*.032;
    ears[0].rotation.z=.12+twitch;ears[1].rotation.z=-.12-twitch*.26;
  }
  function reset(){lastTime=null;}
  return {group,update,reset};

}
