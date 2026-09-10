// @ts-nocheck
// Standalone procedural summer event. No textures, loaders, timers, or external assets.
import * as T from 'three';

export function createSummerSleeper({root,material,mesh,box,ellipsoid,line,beam,rr}) {
  const group=new T.Group();
  group.name='event-summer-sleeper';
  // Crosswise on the open wooden engawa, below the eaves and inside the lip.
  group.position.set(-.105,.945,-.74);
  group.rotation.y=-Math.PI/2;
  group.scale.setScalar(.8);
  root.add(group);
  const v=(p)=>new T.Vector3(...p);
  const mat=(c)=>material(c,{roughness:.94,flatShading:true});
  const skin=mat('#d8a888'),skinLight=mat('#e4b99b'),skinShade=mat('#bc8971');
  const nail=mat('#e9c5ab');
  const sage=mat('#879077'),sageLight=mat('#a1a68a'),sageShade=mat('#69765f'),sageSeam=mat('#747e67');
  const indigo=mat('#626f80'),indigoLight=mat('#81909c'),indigoShade=mat('#4b596b'),stitch=mat('#a8ad9f');
  const hairDark=mat('#433b38'),hair=mat('#574641'),hairWarm=mat('#6a5045'),hairLight=mat('#806153');
  const linen=mat('#d8cead'),linenLight=mat('#e4ddc3'),linenSeam=mat('#b9b093');
  const cover=mat('#a87559'),coverShade=mat('#805944'),coverEdge=mat('#c89671');
  const pages=mat('#e9ddbe'),pageShadow=mat('#c5b79b'),pageLight=mat('#f3e9cc');
  const gilt=mat('#d9bd85');

  // Faceted elliptical sweeps create fitted, flattened limbs and deliberately
  // uneven garment silhouettes rather than overlapping spherical body parts.
  function sweep(name, rings, m, parent=group, sides=8) {
    const p=[],ids=[];
    rings.forEach((r,i)=>{
      const center=v(r.slice(0,3));
      const previous=v(rings[Math.max(0,i-1)].slice(0,3));
      const next=v(rings[Math.min(rings.length-1,i+1)].slice(0,3));
      const tangent=next.sub(previous).normalize();
      let across=new T.Vector3(0,1,0).cross(tangent).normalize();
      if(across.lengthSq()<.01) across.set(1,0,0);
      const up=tangent.clone().cross(across).normalize();
      for(let j=0;j<sides;j++) {
        const a=j/sides*Math.PI*2;
        const q=center.clone().addScaledVector(across,Math.cos(a)*r[3]).addScaledVector(up,Math.sin(a)*r[4]);
        p.push(q.x,q.y,q.z);
      }
      if(i) for(let j=0;j<sides;j++) {
        const a=(i-1)*sides+j,b=(i-1)*sides+(j+1)%sides,c=i*sides+j,d=i*sides+(j+1)%sides;
        ids.push(a,b,c,b,d,c);
      }
    });
    const last=(rings.length-1)*sides;
    for(let j=1;j<sides-1;j++) ids.push(0,j+1,j,last,last+j,last+j+1);
    const geo=new T.BufferGeometry();
    geo.setAttribute('position',new T.Float32BufferAttribute(p,3));geo.setIndex(ids);geo.computeVertexNormals();
    const o=mesh(geo,m,[0,0,0],parent);o.name=name;return o;
  }
  function patch(name,points,m,parent=group) {
    const g=new T.BufferGeometry(),ids=[];
    g.setAttribute('position',new T.Float32BufferAttribute(points.flat(),3));
    for(let i=1;i<points.length-1;i++) ids.push(0,i,i+1);
    g.setIndex(ids);g.computeVertexNormals();
    if(g.attributes.normal.getY(0)<0) { for(let i=0;i<ids.length;i+=3) [ids[i+1],ids[i+2]]=[ids[i+2],ids[i+1]];g.setIndex(ids);g.computeVertexNormals(); }
    // Garment panels have a little thickness and both faces remain readable.
    const o=mesh(g,m,[0,0,0],parent);o.name=name;return o;
  }
  function seam(points,m=sageSeam,r=.003,parent=group) {return line(points,m,r,parent);}
  function stitchRun(a,b,count,parent=group,m=stitch) {
    const start=v(a),end=v(b);
    for(let i=0;i<count;i++) {
      const p=start.clone().lerp(end,(i+.12)/count),q=start.clone().lerp(end,(i+.48)/count);
      beam(p,q,.0016,.0016,m,parent);
    }
  }

  // Only a thin, compressed linen head cushion; its lower face rests on tatami.
  const pillow=new T.Group();pillow.name='sleeper-linen-cushion';group.add(pillow);
  const cushion=box(.48,.045,.355,linen,[0,.0225,-.845],pillow,.026);cushion.rotation.y=-.035;
  const pillowTop=box(.447,.017,.325,linenLight,[0,.04,-.845],pillow,.025);pillowTop.rotation.y=-.035;
  seam([[-.206,.034,-1.005],[.195,.034,-1.02],[.23,.033,-.71],[.2,.033,-.683],[-.222,.033,-.692],[-.229,.034,-.987],[-.206,.034,-1.005]],linenSeam,.0025,pillow);
  for(const s of [-1,1]) {
    seam([[s*.231,.034,-.935],[s*.194,.043,-.927],[s*.172,.047,-.904]],linenSeam,.002,pillow);
    seam([[s*.227,.028,-.751],[s*.2,.04,-.767],[s*.179,.045,-.775]],linenSeam,.002,pillow);
    for(let i=0;i<3;i++) box(.019,.002,.002,linenLight,[s*.238,.025,-.92+i*.054],pillow);
  }

  // Softly flattened dark-brown hair under the book, with separate angular
  // raised locks spreading onto the pillow and ending beside the shoulders.
  const head=new T.Group();head.name='sleeper-head';group.add(head);
  ellipsoid(0,.118,-.823,.15,.083,.17,hairDark,head,12);
  ellipsoid(0,.159,-.805,.12,.101,.145,skin,head,12);
  ellipsoid(-.121,.145,-.787,.018,.029,.022,skinShade,head,8);
  ellipsoid(.121,.145,-.787,.018,.029,.022,skin,head,8);
  sweep('sleeper-neck',[[0,.097,-.7,.065,.052],[0,.105,-.621,.057,.055],[0,.111,-.584,.065,.05]],skin,group);
  function lock(points,widths,m,parent=head) {
    // Diamond-shaped section makes a visible ridge along every solid hair lock.
    const p=[],ids=[];
    for(let i=0;i<points.length;i++) {
      const a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)];
      const dx=b[0]-a[0],dz=b[2]-a[2],length=Math.hypot(dx,dz)||1;
      const nx=-dz/length,nz=dx/length,[x,y,z]=points[i],w=widths[i];
      p.push(x+nx*w,y,z+nz*w,x,y+.011,z,x-nx*w,y,z-nz*w,x,y-.005,z);
      if(i) for(let j=0;j<4;j++) {const a=(i-1)*4+j,b=(i-1)*4+(j+1)%4,c=i*4+j,d=i*4+(j+1)%4;ids.push(a,c,b,b,c,d);}
    }
    ids.push(0,1,2,0,2,3);const k=(points.length-1)*4;ids.push(k,k+2,k+1,k,k+3,k+2);
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(ids);g.computeVertexNormals();
    const o=mesh(g,m,[0,0,0],parent);o.name='sleeper-hair-lock';return o;
  }
  for(const side of [-1,1]) {
    for(let i=0;i<7;i++) {
      const n=i/6,x=side*(.063+.014*i),end=side*(.177+.011*Math.sin(i*1.7));
      lock([[x,.18-.014*n,-.95+.019*n],[side*(.15+.035*n),.105,-.882+.025*n],[side*(.19+.031*n),.062,-.744+.014*i],[end+side*.029,.037,-.634+.015*i],[end,.026,-.568+.02*i]],
        [.024,.027,.024,.017,.0025],[hair,hairDark,hairWarm,hair,hairLight,hair,hairWarm][i]);
      if(i===2||i===5) lock([[side*(.177+.025*n),.108,-.844],[side*(.21+.025*n),.064,-.735],[side*(.203+.03*n),.042,-.664]], [.0045,.005,.0015],hairLight);
    }
    lock([[side*.014,.155,-.986],[side*.096,.095,-1.009],[side*.175,.054,-.972],[side*.215,.038,-.924]], [.025,.025,.018,.002],hairWarm);
    lock([[side*.038,.146,-.974],[side*.123,.076,-1.004],[side*.208,.038,-.988]], [.019,.019,.002],hairDark);
  }

  // Loose indigo walking shorts, including separate leg openings, rolled hems,
  // fly, waistband, pocket seams and localized folds.
  box(.246,.024,.19,indigoShade,[0,.012,.087],group,.009).name='sleeper-shorts-flattened-back';
  sweep('sleeper-shorts-seat',[[0,.105,-.039,.151,.09],[0,.114,.057,.171,.105],[.007,.113,.176,.172,.101],[.009,.11,.237,.147,.094]],indigo);
  // Each shorts leg rotates around its own hip with the thigh. All seams,
  // folds and the rolled hem share that transform, preserving the opening.
  const legPose={
    left:{hip:v([-.092,.114,.17]),knee:v([-.183,.184,.530]),ankle:v([-.144,.051,.881])},
    right:{hip:v([.092,.114,.17]),knee:v([.109641129,.081237903,.545]),ankle:v([.127,.049,.914])}
  };
  for(const pose of Object.values(legPose))pose.q=new T.Quaternion().setFromUnitVectors(v([0,0,1]),pose.knee.clone().sub(pose.hip).normalize());
  const thighPoint=(pose,p)=>v(p).sub(pose.hip).applyQuaternion(pose.q).add(pose.hip);
  for(const side of [-1,1]) {
    const x=side*.092,offset=side===1?-.026:.012,pose=side<0?legPose.left:legPose.right;
    const legCloth=new T.Group();legCloth.name=side<0?'sleeper-left-shorts-pose':'sleeper-right-shorts-pose';
    legCloth.quaternion.copy(pose.q);legCloth.position.copy(pose.hip).sub(pose.hip.clone().applyQuaternion(pose.q));group.add(legCloth);
    sweep('sleeper-shorts-leg',[[x,.115,.151,.09,.092],[x+side*.01,.119,.263+offset,.101,.091],[x+side*.015,.106,.399+offset,.095,.079]],indigo,legCloth);
    sweep('sleeper-shorts-rolled-hem',[[x+side*.015,.106,.371+offset,.099,.081],[x+side*.016,.104,.403+offset,.10,.08],[x+side*.017,.101,.422+offset,.093,.074]],indigoLight,legCloth);
    seam([[x+side*.079,.133,.13],[x+side*.093,.126,.248],[x+side*.081,.12,.366+offset]],indigoShade,.003,legCloth);
    seam([[x-side*.038,.197,.116],[x-side*.021,.204,.18],[x-side*.013,.196,.223]],indigoShade,.003,legCloth);
    seam([[x+side*.068,.177,.219],[x+side*.041,.195,.239],[x+side*.013,.202,.257]],indigoLight,.0038,legCloth);
    seam([[x+side*.014,.185,.314+offset],[x+side*.05,.169,.333+offset],[x+side*.076,.139,.339+offset]],indigoShade,.0035,legCloth);
    stitchRun([x-side*.063,.164,.409+offset],[x+side*.064,.162,.409+offset],6,legCloth);
  }
  sweep('sleeper-shorts-waistband',[[0,.114,-.026,.156,.095],[0,.117,.009,.165,.102]],indigoShade);
  seam([[0,.214,.016],[.016,.214,.089],[.012,.203,.166]],indigoShade,.004);
  box(.016,.006,.016,stitch,[0,.217,.019],group,.003);
  for(let x of [-.115,.101]) box(.021,.005,.048,indigoLight,[x,.195,.005],group,.003);

  // Left thigh rises gently and opens outward; the lower leg returns to a
  // grounded heel. The right hip, knee and ankle lie on one straight axis.
  const lp=legPose.left,rp=legPose.right;
  const leftStart=thighPoint(lp,[-.098,.105,.397]),leftExit=thighPoint(lp,[-.109,.110,.453]);
  const leftLeg=sweep('sleeper-left-leg',[
    [...leftStart.toArray(),.064,.062],[...leftExit.toArray(),.062,.060],
    [-.177,.180,.494,.061,.060],[...lp.knee.toArray(),.060,.058],
    [-.178,.169,.581,.057,.054],[-.163,.113,.726,.049,.045],[...lp.ankle.toArray(),.037,.033]
  ],skin);
  const rightAt=z=>rp.hip.clone().lerp(rp.ankle,(z-rp.hip.z)/(rp.ankle.z-rp.hip.z));
  const rightLeg=sweep('sleeper-right-leg',[
    [...rightAt(.374).toArray(),.064,.061],[...rightAt(.459).toArray(),.061,.061],
    [...rp.knee.toArray(),.060,.063],[...rightAt(.679).toArray(),.053,.049],
    [...rightAt(.810).toArray(),.043,.038],[...rp.ankle.toArray(),.036,.033]
  ],skin);
  // Shin highlights are projected onto the actual posed skin, so they cannot
  // bridge empty air when the knee bends.
  function skinPoint(o,x,z,lift=.002) {
    const p=o.geometry.attributes.position,idx=o.geometry.index.array,ray=new T.Ray(v([x,2,z]),v([0,-1,0]));
    const a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3(),hit=new T.Vector3();let highest=-Infinity;
    for(let i=0;i<idx.length;i+=3){a.fromBufferAttribute(p,idx[i]);b.fromBufferAttribute(p,idx[i+1]);c.fromBufferAttribute(p,idx[i+2]);if(ray.intersectTriangle(a,b,c,false,hit))highest=Math.max(highest,hit.y);}
    return [x,(Number.isFinite(highest)?highest:0)+lift,z];
  }
  seam([[-.174,.607],[-.160,.736],[-.145,.848]].map(([x,z])=>skinPoint(leftLeg,x,z)),skinLight,.0043);
  seam([.591,.724,.863].map(z=>{const p=rightAt(z);return skinPoint(rightLeg,p.x-.004,z);}),skinLight,.0043);
  const leftKneecap=ellipsoid(lp.knee.x,lp.knee.y+.040,lp.knee.z+.004,.042,.024,.041,skinLight,group,8);leftKneecap.rotation.x=.13;
  ellipsoid(rp.knee.x,rp.knee.y+.044,rp.knee.z,.042,.023,.043,skinLight,group,8);
  for(const [side,pose] of [['left',lp],['right',rp]]) {
    const anchor=new T.Group();anchor.name='sleeper-'+side+'-knee-anchor';anchor.position.copy(pose.knee);group.add(anchor);
  }
  function foot(name,x,z,angle) {
    const g=new T.Group();g.name=name;g.position.set(x,.0261,z);g.rotation.y=angle;group.add(g);
    // Heel is exactly supported; the instep is a faceted taper.
    sweep(name+'-instep',[[0,.005,-.023,.034,.033],[0,.021,.021,.042,.047],[0,.02,.08,.05,.036],[.003,.011,.118,.049,.022]],skin,g);
    for(let i=0;i<5;i++) {
      const side=i-2,tx=side*.018,tip=.143-Math.abs(i-1)*.007;
      sweep(name+'-toe-'+i,[[tx,.009,.101,.0105,.018],[tx+.002,.01,tip,.0102,.016],[tx+.002,.008,tip+.016,.0075,.0105]],i<2?skinLight:skin,g,6);
      const n=box(.011,.0018,.012,nail,[tx+.002,.026,tip+.002],g,.002);n.rotation.x=-.18;
    }
    seam([[-.026,.065,.012],[.001,.07,.024],[.028,.05,.052]],skinShade,.002,g);
    return g;
  }
  foot('sleeper-left-foot',-.145,.889,-.18);
  foot('sleeper-right-foot',.128,.921,.08);

  // Shirt and the resting forearm share a tiny breath; the back stays anchored.
  const breathing=new T.Group();breathing.name='sleeper-breathing-torso';group.add(breathing);
  box(.276,.036,.437,sageShade,[0,.018,-.303],breathing,.014).name='sleeper-shirt-flattened-back';
  sweep('sleeper-sage-shirt',[[0,.111,-.603,.081,.072],[0,.13,-.53,.179,.108],[0,.137,-.442,.198,.118],[.004,.128,-.322,.186,.117],[.005,.112,-.16,.162,.103],[.003,.108,-.024,.163,.092],[.005,.105,.043,.176,.083]],sage,breathing);
  // Camp collar folded away from the visible neck; faces lie on the shirt.
  patch('sleeper-left-collar',[[-.056,.192,-.602],[-.132,.222,-.525],[-.081,.254,-.458],[-.014,.222,-.554]],sageLight,breathing);
  patch('sleeper-right-collar',[[.056,.192,-.602],[.014,.222,-.553],[.072,.252,-.461],[.128,.219,-.526]],sageLight,breathing);
  seam([[-.056,.194,-.6],[-.13,.224,-.525],[-.081,.256,-.46],[-.015,.225,-.552]],sageSeam,.003,breathing);
  seam([[.056,.194,-.6],[.128,.222,-.526],[.074,.255,-.461],[.015,.225,-.552]],sageSeam,.003,breathing);
  seam([[.006,.243,-.483],[.009,.255,-.391],[.012,.232,-.236],[.011,.207,-.057],[.013,.189,.021]],sageLight,.008,breathing);
  seam([[-.006,.245,-.478],[-.003,.257,-.39],[.002,.234,-.235],[.002,.21,-.055]],sageSeam,.0022,breathing);
  for(const [z,y] of [[-.439,.25],[-.337,.252],[-.225,.234],[-.111,.215],[.012,.196]]) {
    const b=mesh(new T.CylinderGeometry(.0055,.0055,.0035,8),linenLight,[.011,y,z],breathing);b.name='sleeper-shirt-button';
    box(.0015,.001,.003,sageShade,[.011,y+.0022,z],breathing);
  }
  // A real raised chest pocket and tiny stitching; asymmetry keeps it relaxed.
  patch('sleeper-shirt-pocket',[[.067,.245,-.429],[.143,.229,-.429],[.137,.229,-.341],[.101,.24,-.318],[.068,.249,-.34]],sageLight,breathing);
  seam([[.068,.25,-.341],[.1,.243,-.32],[.137,.232,-.342],[.144,.232,-.429]],sageSeam,.0022,breathing);
  seam([[.066,.249,-.426],[.143,.232,-.426]],sageShade,.003,breathing);
  for(const s of [-1,1]) {
    seam([[s*.124,.224,-.491],[s*.172,.208,-.445],[s*.176,.189,-.379]],sageLight,.0035,breathing);
    seam([[s*.166,.175,-.248],[s*.126,.203,-.193],[s*.11,.212,-.167]],sageShade,.0035,breathing);
    seam([[s*.17,.145,-.111],[s*.131,.18,-.057],[s*.122,.184,-.025]],sageLight,.0038,breathing);
    seam([[s*.17,.107,.035],[s*.143,.147,.023],[s*.107,.17,.026]],sageShade,.0035,breathing);
  }
  seam([[-.137,.151,.04],[-.075,.18,.053],[.011,.19,.041],[.085,.18,.048],[.147,.147,.038]],sageLight,.003,breathing);

  // Upper arms emerge from hollow-looking rolled short sleeves.
  sweep('sleeper-left-upper-arm',[[-.171,.125,-.501,.065,.062],[-.24,.091,-.351,.051,.047],[-.281,.055,-.22,.044,.039]],skin);
  sweep('sleeper-left-forearm',[[-.281,.055,-.22,.044,.039],[-.305,.051,-.105,.039,.034],[-.313,.048,.044,.027,.023]],skin);
  sweep('sleeper-right-upper-arm',[[.171,.13,-.502,.065,.062],[.246,.106,-.351,.051,.05],[.302,.073,-.189,.046,.041]],skin);
  sweep('sleeper-right-forearm',[[.302,.073,-.189,.045,.041],[.228,.132,-.204,.043,.04],[.105,.229,-.27,.029,.027]],skin,breathing);
  for(const side of [-1,1]) {
    const shoulder=[side*.169,.13,-.501],middle=[side*.209,.118,-.431],end=[side*.25,.097,-.331];
    sweep('sleeper-shirt-sleeve',[ [...shoulder,.08,.08],[...middle,.081,.074],[...end,.072,.06]],sage,breathing);
    sweep('sleeper-shirt-sleeve-cuff',[[side*.242,.102,-.352,.075,.065],[side*.257,.094,-.321,.073,.061]],sageLight,breathing);
    seam([[side*.189,.2,-.487],[side*.233,.172,-.425],[side*.253,.153,-.36]],sageShade,.0034,breathing);
    seam([[side*.236,.16,-.349],[side*.265,.143,-.329],[side*.285,.116,-.321]],sageSeam,.0025,breathing);
  }
  seam([[-.307,.08,-.106],[-.317,.072,.027]],skinLight,.003);
  seam([[.27,.116,-.183],[.192,.18,-.212],[.118,.25,-.252]],skinLight,.0035,breathing);

  const fingerRecords=[];
  function hand(name,position,angle,parent,movingHand=false) {
    const g=new T.Group();g.name=name;g.position.set(...position);g.rotation.y=angle;parent.add(g);
    sweep(name+'-palm',[[0,0,-.045,.025,.018],[0,.002,-.012,.038,.021],[0,0,.03,.036,.018],[.002,-.001,.046,.03,.015]],skin,g);
    const knuckles=[-.027,-.009,.010,.028];
    knuckles.forEach((x,i)=>{
      const f=new T.Group();f.name=name+'-finger-'+i;f.position.set(x,0,.033);f.rotation.y=(i-1.45)*.075;g.add(f);
      const length=[.061,.071,.067,.051][i],bend=[.006,.002,.004,.009][i];
      sweep(f.name,[[0,0,0,.009,.012],[0,.002,length*.45,.0085,.0105],[.002,-bend,length*.78,.0075,.009],[.003,-bend-.002,length,.005,.006]],skinLight,f,6);
      const n=box(.009,.0018,.012,nail,[.002,.008-bend,length-.011],f,.002);n.rotation.x=.11;
      seam([[-.006,.011,length*.47],[.006,.011,length*.47]],skinShade,.0012,f);
      fingerRecords.push({g:f,base:0,side:movingHand?1:0,index:i});
    });
    const thumb=new T.Group();thumb.name=name+'-thumb';thumb.position.set(-.028,-.002,-.013);thumb.rotation.y=-.68;g.add(thumb);
    sweep(name+'-thumb-shape',[[0,0,0,.013,.014],[0,.001,.027,.012,.012],[.005,-.004,.048,.008,.01],[.008,-.006,.06,.005,.006]],skin,thumb,6);
    box(.01,.0018,.013,nail,[.006,.005,.047],thumb,.002);
    fingerRecords.push({g:thumb,base:0,side:movingHand?1:0,index:4});
    seam([[-.024,.021,-.014],[-.008,.023,.005],[.019,.019,.016]],skinShade,.0014,g);
    return g;
  }
  const leftHand=hand('sleeper-relaxed-hand',[-.313,.048,.083],-.09,group);
  const rightHand=hand('sleeper-resting-hand',[.066,.257,-.302],Math.PI+.35,breathing,true);
  rightHand.rotation.z=-.08;

  // Face-down book: two solid hardback covers form an actual pitched tent.
  // Its paper blocks and fore-edges hang inside that tent, over the entire face.
  const book=new T.Group();book.name='sleeper-face-book';book.position.set(0,.398,-.819);book.rotation.y=-.055;group.add(book);
  const pageWidth=.303,pageDepth=.439,angle=.733;
  for(const side of [-1,1]) {
    const wing=new T.Group();wing.name=side<0?'sleeper-book-back-cover':'sleeper-book-front-cover';wing.rotation.z=-side*angle;book.add(wing);
    box(pageWidth,.012,pageDepth,cover,[side*(pageWidth/2+.005),0,0],wing,.003);
    box(pageWidth-.018,.031,pageDepth-.018,pages,[side*(pageWidth/2+.009),-.022,0],wing,.002);
    box(.015,.014,pageDepth+.002,coverShade,[side*.011,-.002,0],wing,.002);
    // Individual strata at the head and tail edges are real geometry.
    for(let i=0;i<6;i++) {
      const y=-.0095-i*.0052;
      for(const z of [-(pageDepth/2-.008),pageDepth/2-.008]) box(pageWidth-.023,.0015,.0026,i%2?pageLight:pageShadow,[side*(pageWidth/2+.009),y,z],wing);
      box(.0028,.0017,pageDepth-.027,i%2?pageShadow:pageLight,[side*(pageWidth+.001),y,0],wing);
    }
    // Slim border and quiet geometric embossing, all modeled on the cover.
    const c=side*(pageWidth/2+.004);
    for(let z of [-.185,.185]) box(.241,.0018,.004,gilt,[c,.007,z],wing);
    for(let x of [c-.12,c+.12]) box(.004,.0018,.37,gilt,[x,.007,0],wing);
    box(.073,.0018,.003,coverEdge,[c,.007,-.112],wing);
    box(.1,.0018,.003,coverEdge,[c,.007,-.101],wing);
    const stem=seam([[c-.031,.008,.063],[c,.008,.011],[c+.027,.008,-.048]],gilt,.002,wing);
    for(let j=0;j<3;j++) {
      const z=.039-j*.033,x=c-.018+j*.016;
      const leaf=box(.027,.0022,.012,gilt,[x+(j%2?-.012:.012),.008,z],wing,.003);leaf.rotation.y=j%2?-.7:.7;
    }
  }
  const spine=mesh(new T.CylinderGeometry(.013,.013,pageDepth+.009,8),coverShade,[0,.004,0],book);spine.rotation.x=Math.PI/2;
  for(let z of [-.17,.17]) {const band=mesh(new T.CylinderGeometry(.014,.014,.012,8),gilt,[0,.004,z],book);band.rotation.x=Math.PI/2;}
  // A small soft bookmark peeks from the book, never beyond the pillow.
  const ribbon=box(.018,.002,.084,material('#708176',{roughness:1}),[.029,.33,-1.07],group);ribbon.rotation.x=-.7;ribbon.rotation.z=.18;

  function update(time=0) {
    if(!group.visible) return;
    const t=Number.isFinite(time)?time:0;
    const breath=Math.sin(t*.82)*.5+.5;
    breathing.scale.y=1+breath*.011;
    // Head and book only settle a fraction of a millimetre, retaining contact.
    head.rotation.z=Math.sin(t*.41)*.0012;
    book.position.y=.398+breath*.00065;
    book.rotation.z=Math.sin(t*.41)*.0011;
    const stir=Math.pow(Math.max(0,Math.sin(t*.225-1.2)),18);
    for(const r of fingerRecords) {
      const pulse=r.side?Math.sin(t*.82+.4+r.index*.15)*.007:stir*Math.sin(t*1.3+r.index*.38)*.047;
      r.g.rotation.x=r.base+pulse;
    }
  }
  function setSeason(season) {group.visible=season==='summer';if(group.visible) update(0);}
  setSeason('summer');
  return {group,setSeason,update};
}
