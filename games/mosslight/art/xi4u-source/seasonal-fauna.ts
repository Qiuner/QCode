// @ts-nocheck
import * as T from 'three';
import {rockCoating} from './snow-surface';
import {createSpringCat} from './spring-cat';
import {ANCIENT_TREE_ORIGIN,createAncientTrunkCurve,treeHeight} from './tree-profile';

/** Small seasonal visitors. `time` is the world's elapsed simulation time.
 * No wall clock, timers, per-frame randomness, external images or loaders.
 * Mesh helpers have the same argument order as world.ts. */
export function createSeasonalFauna(ctx) {
  const {root,material,mesh,ellipsoid,line,beam,cx,width,ripple,birdPerch}=ctx;
  const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
  const clamp=T.MathUtils.clamp,lerp=T.MathUtils.lerp;
  const ease=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
  const blend=(a,b,t)=>lerp(a,b,ease(t));
  const group=(name,parent=root)=>{const g=new T.Group();g.name=name;parent.add(g);return g;};
  const spring=group('event-spring-cat'),autumn=group('event-autumn-squirrel'),winter=group('event-winter-birds');
  const cream=material('#fff0cb'),milk=material('#f6f3df'),ginger=material('#d88737'),gold=material('#e7aa55');
  const stripe=material('#b76830'),rust=material('#a15a32'),pink=material('#d69487'),ink=material('#30352c');
  const squirrelCream=material('#f0d5a0'),squirrelOrange=material('#cb7835'),squirrelGold=material('#df9b49');
  const furDark=material('#ae652e'),white=material('#f6f4eb'),featherDark=material('#343b39'),featherGrey=material('#79817a');
  const blush=material('#d4b6ac'),toeMat=material('#777263'),stoneMat=material('#7e8b82',{flatShading:true});
  const stoneLight=material('#b9c4b4',{flatShading:true}),bark=material('#6a5c4b');

  // A tapering curved solid is useful for tails: unlike an unvarying tube,
  // neither the tip nor the tail-to-rump junction reads as a separate sausage.
  function tapered(points,radii,mat,parent,steps=36,sides=9,flatten=1) {
    const curve=new T.CatmullRomCurve3(points.map(p=>V(...p)));
    const frames=curve.computeFrenetFrames(steps,false),positions=[],indices=[];
    for(let i=0;i<=steps;i++) {
      const t=i/steps,p=curve.getPoint(t),q=t*(radii.length-1),k=Math.min(radii.length-2,Math.floor(q));
      const r=lerp(radii[k],radii[k+1],q-k);
      for(let j=0;j<=sides;j++) {
        const a=j/sides*Math.PI*2;
        const v=p.clone().addScaledVector(frames.normals[i],Math.cos(a)*r).addScaledVector(frames.binormals[i],Math.sin(a)*r*flatten);
        positions.push(v.x,v.y,v.z);
        if(i<steps&&j<sides){const n=i*(sides+1)+j;indices.push(n,n+1,n+sides+1,n+1,n+sides+2,n+sides+1);}
      }
    }
    // Closed ends keep the tip clean when the orbit camera looks from behind.
    const a=positions.length/3;positions.push(...curve.getPoint(0).toArray(),...curve.getPoint(1).toArray());
    for(let j=0;j<sides;j++){indices.push(a,j+1,j);const n=steps*(sides+1)+j;indices.push(a+1,n,n+1);}
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setIndex(indices);geo.computeVertexNormals();
    return {object:mesh(geo,mat,[0,0,0],parent),curve};
  }
  function triangle(points,mat,parent,thickness=.018) {
    const a=points[0],b=points[1],c=points[2],p=[];
    for(const z of [-thickness/2,thickness/2])for(const q of [a,b,c])p.push(q[0],q[1],q[2]+z);
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));
    const indices=[0,2,1,3,4,5,0,1,4,0,4,3,1,2,5,1,5,4,2,0,3,2,3,5];
    if((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])<0)for(let i=0;i<indices.length;i+=3)[indices[i+1],indices[i+2]]=[indices[i+2],indices[i+1]];
    g.setIndex(indices);g.computeVertexNormals();return mesh(g,mat,[0,0,0],parent);
  }
  const quatFor=(up,forward)=>{
    const z=forward.clone().normalize(),x=up.clone().cross(z).normalize(),y=z.clone().cross(x).normalize();
    return new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(x,y,z));
  };

  const springCat=createSpringCat({...ctx,root:spring});
  springCat.group.name='sleeping-orange-white-cat';

  // AUTUMN — one articulated squirrel. +Z is the nose, +Y is the
  // outward normal of its current support surface, including the trunk.
  const squirrel=group('foraging-red-squirrel',autumn);squirrel.scale.setScalar(.78);
  const sqTorso=group('squirrel-torso',squirrel);
  ellipsoid(0,.168,-.034,.123,.132,.206,squirrelOrange,sqTorso,14);
  ellipsoid(0,.191,.09,.098,.124,.099,squirrelGold,sqTorso,12);
  ellipsoid(0,.155,.143,.073,.102,.032,squirrelCream,sqTorso,12);
  for(const side of [-1,1])ellipsoid(side*.092,.104,-.123,.077,.098,.106,squirrelGold,sqTorso,12);
  const sqHead=group('squirrel-head',sqTorso);sqHead.position.set(0,.266,.172);
  ellipsoid(0,0,0,.12,.125,.114,squirrelGold,sqHead,14);
  ellipsoid(0,-.043,.09,.087,.068,.073,squirrelCream,sqHead,12);
  ellipsoid(0,-.02,.15,.022,.019,.021,ink,sqHead,10);
  for(const side of [-1,1]) {
    ellipsoid(side*.094,.015,.057,.018,.023,.011,ink,sqHead,10);
    ellipsoid(side*.1,.023,.063,.0048,.0055,.003,milk,sqHead,6);
    ellipsoid(side*.085,.118,-.025,.038,.066,.03,squirrelOrange,sqHead,10);
    ellipsoid(side*.085,.122,.002,.022,.04,.008,pink,sqHead,10);
    triangle([[side*.085-.023,.151,-.028],[side*.085+.027,.154,-.028],[side*.087,.209,-.038]],furDark,sqHead,.022);
    for(let j=0;j<2;j++)line([[side*.077,-.04+j*.02,.133],[side*.134,-.044+j*.032,.138]],squirrelCream,.0019,sqHead);
  }
  line([[0,-.04,.164],[0,-.06,.149],[.018,-.061,.141]],furDark,.0025,sqHead);
  const sqTail=group('squirrel-bushy-curled-tail',sqTorso);
  const sqTailPoints=[[0,.142,-.193],[0,.213,-.311],[.005,.408,-.352],[.006,.592,-.26],[.006,.628,-.104],[.006,.531,-.07],[.006,.488,-.145]];
  tapered(sqTailPoints,[.048,.116,.132,.105,.039],squirrelOrange,sqTail,42,10,.88);
  // The pale inner curl and a few angular tufts give the tail a furry edge.
  for(const side of [-1,1]) {
    tapered([[side*.075,.267,-.334],[side*.085,.443,-.32],[side*.069,.55,-.244],[side*.065,.57,-.137],[side*.041,.525,-.103]],[.027,.041,.035,.02],squirrelCream,sqTail,26,8);
    for(let i=0;i<7;i++) {
      const t=.17+i*.087,curve=new T.CatmullRomCurve3(sqTailPoints.map(p=>V(...p))),p=curve.getPoint(t);
      triangle([[side*.056,p.y-.024,p.z-.04],[side*.056,p.y+.033,p.z+.015],[side*.065,p.y+.008,p.z-.10]],i%3?ginger:furDark,sqTail,.025);
    }
  }
  // Short, fur-covered limbs: rounded tapered profiles overlap the fleshy
  // elbow/knee cuffs. The skeleton still uses the same fixed IK lengths.
  const legs=[];
  function bone(parent,rA,rB,mat) {
    const profile=[[0,-.5],[rA*.70,-.47],[rA,-.31],[rA*.99,-.10],[lerp(rA,rB,.65),.20],[rB,.39],[rB*.72,.47],[0,.5]];
    return mesh(new T.LatheGeometry(profile.map(([r,y])=>new T.Vector2(r,y)),10),mat,[0,0,0],parent);
  }
  function placeBone(o,a,b) {const d=b.clone().sub(a);o.position.copy(a).add(b).multiplyScalar(.5);o.scale.y=d.length();o.quaternion.setFromUnitVectors(V(0,1,0),d.normalize());}
  for(const side of [-1,1])for(const front of [false,true]) {
    const upper=bone(squirrel,front?.058:.075,front?.048:.058,squirrelOrange);
    const lower=bone(squirrel,front?.045:.051,front?.031:.033,squirrelGold);
    upper.name=front?'squirrel-furry-upper-foreleg':'squirrel-furry-thigh';lower.name=front?'squirrel-furry-forearm':'squirrel-furry-shin';
    const foot=group(front?'squirrel-forepaw':'squirrel-hindpaw',squirrel);
    ellipsoid(0,0,.017,front?.046:.057,.031,front?.061:.077,squirrelGold,foot,12);
    for(let j=-1;j<=1;j++){
      ellipsoid(j*(front?.020:.024),-.003,front?.055:.069,front?.017:.020,.019,.025,squirrelGold,foot,8);
      line([[j*.020,-.009,front?.068:.081],[j*.021,-.006,front?.079:.094]],furDark,.0027,foot);
    }
    legs.push({side,front,upper,lower,foot});
  }
  const coneHeld=group('squirrel-found-pinecone',sqTorso),coneGround=group('pinecone-in-leaves',autumn);
  function pinecone(parent) {
    ellipsoid(0,0,0,.037,.06,.037,rust,parent,8);
    for(let row=0;row<4;row++)for(let j=0;j<6;j++) {
      const a=j/6*Math.PI*2+(row%2)*.52,r=Math.sin((row+1)/5*Math.PI)*.032;
      const p=ellipsoid(Math.cos(a)*r,-.043+row*.029,Math.sin(a)*r,.019,.018,.012,j%2?furDark:rust,parent,6);p.rotation.y=-a;
    }
    beam([0,.05,0],[.006,.072,.003],.006,.003,bark,parent);
  }
  pinecone(coneHeld);pinecone(coneGround);coneHeld.position.set(0,.13,.259);coneHeld.rotation.x=.75;
  const leafCenter=V(-3.18,.292,1.86);coneGround.position.copy(leafCenter).add(V(.04,.045,.035));coneGround.rotation.z=.7;
  const leafMats=['#b87036','#ca8b3d','#d5ad56','#a85830','#c1974d'].map(c=>material(c,{side:T.DoubleSide,flatShading:true}));
  const leafGeo=(()=>{const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([0,.018,0,-.04,0,-.07,-.085,0,-.013,-.045,0,.022,-.036,0,.073,0,.005,.052,.036,0,.073,.045,0,.022,.085,0,-.013,.04,0,-.07],3));g.setIndex([0,1,2,0,2,3,0,3,4,0,4,5,0,5,6,0,6,7,0,7,8,0,8,9,0,9,1]);g.computeVertexNormals();return g;})();
  const leaves=[];
  for(let i=0;i<31;i++) {
    const a=i*2.399,r=Math.sqrt((i+.5)/31)*.34,x=leafCenter.x+Math.cos(a)*r,z=leafCenter.z+Math.sin(a)*r*.79;
    const o=mesh(leafGeo,leafMats[i%leafMats.length],[x,.288+(1-r/.4)*.033+(i%3)*.006,z],autumn);
    o.rotation.set(Math.sin(i*3.7)*.12,a,Math.cos(i)*.1);o.scale.setScalar(.72+(i%5)*.12);
    leaves.push({o,x,z,y:o.position.y,ry:a});
  }
  // Use the same full spline and taper as ancient-tree.ts, then look up the
  // requested height. Using just a straight diagonal would miss its bark.
  const trunk=ctx.treeTrunk||createAncientTrunkCurve(),treeOrigin=V(...ANCIENT_TREE_ORIGIN);
  function onTrunk(height,angle,down=true) {
    height=treeHeight(height);
    let lo=0,hi=1;for(let i=0;i<16;i++){const mid=(lo+hi)/2;if(trunk.getPoint(mid).y<height)lo=mid;else hi=mid;}
    const t=(lo+hi)/2,c=trunk.getPoint(t),tangent=trunk.getTangent(t).normalize(),radial=V(Math.sin(angle),0,Math.cos(angle));
    radial.addScaledVector(tangent,-radial.dot(tangent)).normalize();
    const radius=lerp(.48,.105,Math.pow(t,.7));
    return {p:c.add(treeOrigin).addScaledVector(radial,radius+.008),q:quatFor(radial,tangent.multiplyScalar(down?-1:1))};
  }
  // Squirrel v7: quick coordinated scurries separated by real four-paw rests.
  // Root travel and planted-foot IK share one distance phase throughout.
  const frontAngle=.92,backAngle=.58+Math.PI;
  const groundStart=V(-3.12,.301,.35);
  const walkCurve=new T.CatmullRomCurve3([groundStart,V(-2.76,.302,.72),V(-2.87,.303,1.34),V(-3.10,.304,1.66)]);
  const lastWalk=walkCurve.getPoint(1),walkEndQ=quatFor(V(0,1,0),walkCurve.getTangent(1));
  const groundQ=quatFor(V(0,1,0),walkCurve.getTangent(0));
  const reverseQ=q=>q.clone().multiply(new T.Quaternion().setFromAxisAngle(V(0,1,0),Math.PI));
  const reverseGroundQ=reverseQ(groundQ),reverseEndQ=reverseQ(walkEndQ);
  const nearTrunk=V(-3.52,.301,.24),nearQ=quatFor(V(0,1,0),groundStart.clone().sub(nearTrunk)),reverseNearQ=reverseQ(nearQ);
  const lowDown=onTrunk(.31,frontAngle,true),lowUp=onTrunk(.31,frontAngle,false);
  const SQ_CYCLE=48,SQ_SCALE=.78,SQ_STANCE=.70,SQ_GROUND=.30,SQ_PAW=.031;
  const sqSmoother=u=>{u=clamp(u,0,1);return u*u*u*(u*(u*6-15)+10);};
  const sqTravel=u=>{u=clamp(u,0,1);const r=.14;return u<r?u*u/(2*r*(1-r)):u>1-r?1-(1-u)*(1-u)/(2*r*(1-r)):(u-r/2)/(1-r);};
  const sqStages=[];
  // Every travel stage begins/ends in four-paw support. Distance (including
  // turning) advances the gait; paused root motion never runs feet in place.
  function sqStage(a,b,fn,surface='ground',down=false) {
    const samples=[],count=120;let length=0,prior=null;
    for(let i=0;i<=count;i++) {
      const u=i/count,p=fn(u);
      if(prior)length+=p.p.distanceTo(prior.p)+p.q.angleTo(prior.q)*.115;
      samples.push({u,d:length});prior=p;
    }
    const cycles=length<.00001?0:Math.max(1,Math.round(length/.155));
    const c0=sqStages.length?sqStages[sqStages.length-1].c1:.64;
    const bursts=[];
    if(cycles){
      const activeTotal=(b-a)/2.6,bouts=Math.min(cycles,Math.max(1,Math.ceil(activeTotal/.78)));
      let phase=0,clock=0;
      for(let i=0;i<bouts;i++){
        const next=Math.round((i+1)*cycles/bouts),duration=activeTotal*(next-phase)/cycles;
        bursts.push({start:clock,end:clock+duration,c0:c0+phase,c1:c0+next});
        phase=next;clock+=duration+.30;
      }
    }
    sqStages.push({a,b,fn,surface,down,samples,length,cycles,c0,c1:c0+cycles,bursts});
  }
  const treeMove=(h0,h1,a0,a1,down)=>u=>onTrunk(lerp(h0,h1,sqTravel(u)),lerp(a0,a1,sqTravel(u)),down);
  const stillTree=(h,a,down)=>()=>onTrunk(h,a,down);
  const groundMove=(from,to,reverse=false)=>u=>{const v=lerp(from,to,sqTravel(u));return {p:walkCurve.getPoint(v),q:quatFor(V(0,1,0),walkCurve.getTangent(v).multiplyScalar(reverse?-1:1))};};
  const stillGround=(p,q)=>()=>({p:p.clone(),q:q.clone()});
  const transfer=(from,to,q0,q1)=>u=>{const v=sqTravel(u);return {p:from.clone().lerp(to,v),q:q0.clone().slerp(q1,v)};};
  sqStage(0,.65,stillTree(2.65,backAngle,true),'trunk',true);
  sqStage(.65,3.2,treeMove(2.65,2.30,backAngle,frontAngle,true),'trunk',true);
  sqStage(3.2,6.6,treeMove(2.30,1.28,frontAngle,frontAngle,true),'trunk',true);
  sqStage(6.6,7.5,stillTree(1.28,frontAngle,true),'trunk',true);
  sqStage(7.5,10.7,treeMove(1.28,.31,frontAngle,frontAngle,true),'trunk',true);
  sqStage(10.7,12.15,transfer(lowDown.p,nearTrunk,lowDown.q,nearQ),'transfer',true);
  sqStage(12.15,13.4,transfer(nearTrunk,groundStart,nearQ,groundQ));
  sqStage(13.4,15.6,groundMove(0,.49));
  sqStage(15.6,16.15,()=>groundMove(0,.49)(1));
  sqStage(16.15,18.7,groundMove(.49,1));
  sqStage(18.7,26,stillGround(lastWalk,walkEndQ));
  sqStage(26,27.35,u=>({p:lastWalk.clone(),q:walkEndQ.clone().slerp(reverseEndQ,ease(u))}));
  sqStage(27.35,32.55,groundMove(1,0,true));
  sqStage(32.55,33.7,transfer(groundStart,nearTrunk,reverseGroundQ,reverseNearQ));
  sqStage(33.7,35.1,transfer(nearTrunk,lowUp.p,reverseNearQ,lowUp.q),'transfer',false);
  sqStage(35.1,38,treeMove(.31,1.40,frontAngle,frontAngle,false),'trunk',false);
  sqStage(38,38.8,stillTree(1.40,frontAngle,false),'trunk',false);
  sqStage(38.8,41.25,treeMove(1.40,2.30,frontAngle,frontAngle,false),'trunk',false);
  sqStage(41.25,43.9,treeMove(2.30,2.65,frontAngle,backAngle,false),'trunk',false);
  sqStage(43.9,48,stillTree(2.65,backAngle,false),'trunk',false);
  function sqPoseAtPhase(s,c) {
    if(!s.cycles)return {...s.fn(1),s,c};
    const d=clamp((c-s.c0)/s.cycles,0,1)*s.length;let lo=0,hi=120;
    while(hi-lo>1){const m=(lo+hi)>>1;if(s.samples[m].d<d)lo=m;else hi=m;}
    const f=(d-s.samples[lo].d)/Math.max(.000001,s.samples[hi].d-s.samples[lo].d),u=(lo+f)/120;
    return {...s.fn(u),s,c};
  }
  function sqAtTime(t) {
    const s=sqStages.find(s=>t<s.b)||sqStages[sqStages.length-1],clock=t-s.a;
    let c=s.c0,active=false,burst=-1;
    for(let i=0;i<s.bursts.length;i++){
      const b=s.bursts[i];
      if(clock>=b.end){c=b.c1;continue;}
      if(clock>=b.start){c=lerp(b.c0,b.c1,sqTravel((clock-b.start)/(b.end-b.start)));active=true;burst=i;}
      break;
    }
    // Every pause lands on .64 + an integer gait cycle: all four paws stay
    // planted. No time warp ever freezes the animal in a swing pose.
    return {...sqPoseAtPhase(s,c),t,active,burst};
  }
  function sqAtStep(c) {
    const s=sqStages.find(s=>s.cycles>0&&c<=s.c1)||sqStages[sqStages.length-1];
    return sqPoseAtPhase(s,c);
  }
  function sqTreeContact(guess) {
    let lo=0,hi=1;const y=clamp(guess.y-treeOrigin.y,0,trunk.getPoint(1).y);
    for(let i=0;i<18;i++){const m=(lo+hi)/2;if(trunk.getPoint(m).y<y)lo=m;else hi=m;}
    const t=(lo+hi)/2,center=trunk.getPoint(t).add(treeOrigin),axis=trunk.getTangent(t).normalize();
    const n=guess.clone().sub(center);n.addScaledVector(axis,-n.dot(axis)).normalize();
    const r=lerp(.48,.105,Math.pow(t,.7));
    return {p:center.addScaledVector(n,r+SQ_PAW*SQ_SCALE+.004),n};
  }
  function sqMakeContact(l,k) {
    // Aim at the middle of the ensuing stance, so the body passes over its
    // support instead of asking the leg to stretch to a perpetually moving aim.
    const at=sqAtStep(k+l.phase+SQ_STANCE*.5),climb=at.s.surface!=='ground';
    const spread=climb?(at.s.down?(l.front?.112:.139):(l.front?.135:.115)):(l.front?.096:.118);
    const guess=V(l.side*spread,.034,l.front?.181:-.154).multiplyScalar(SQ_SCALE).applyQuaternion(at.q).add(at.p);
    const flat={p:V(guess.x,SQ_GROUND+SQ_PAW*SQ_SCALE,guess.z),n:V(0,1,0)},tree=sqTreeContact(guess);
    let contact=at.s.surface==='ground'?flat:tree;
    if(at.s.surface==='transfer')contact=guess.distanceTo(flat.p)<guess.distanceTo(tree.p)?flat:tree;
    let forward=V(0,0,1).applyQuaternion(at.q);
    // On head-first descent the hind toes point uphill and grip behind the
    // body; the wrist and ankle share their contact's bark-facing normal.
    if(!l.front&&at.s.down&&contact===tree)forward.negate();
    forward.addScaledVector(contact.n,-forward.dot(contact.n));
    if(forward.lengthSq()<.001)forward=V(0,0,1).addScaledVector(contact.n,-contact.n.z);
    contact.q=quatFor(contact.n,forward.normalize());contact.tree=contact===tree;
    return contact;
  }
  for(const l of legs) {
    // Fore and hind pairs move half a cycle apart; a small within-pair lead
    // avoids robotic symmetry. At least two paws support every travel frame.
    l.phase=(l.front?.50:0)+(l.side>0?.08:0);l.contacts=[];
    l.upperLength=l.front?.170:.155;l.lowerLength=l.front?.165:.170;
    l.joint=ellipsoid(0,0,0,l.front?.046:.058,l.front?.043:.052,l.front?.046:.058,squirrelGold,squirrel,10);
    l.joint.name=l.front?'squirrel-elbow':'squirrel-knee';
    for(let k=-1;k<=Math.ceil(sqStages[sqStages.length-1].c1)+2;k++)l.contacts[k+1]=sqMakeContact(l,k);
  }
  function sqFootAt(l,c) {
    const step=c-l.phase,k=Math.floor(step),phase=step-k,A=l.contacts[k+1],B=l.contacts[k+2];
    const swing=clamp((phase-SQ_STANCE)/(1-SQ_STANCE),0,1),u=sqSmoother(swing);
    const p=A.p.clone(),q=A.q.clone(),lift=16*swing*swing*(1-swing)*(1-swing);
    if(swing>0){const n=A.n.clone().lerp(B.n,u).normalize();p.lerp(B.p,u).addScaledVector(n,lift*(A.tree&&B.tree?.023:.029));q.slerp(B.q,u);}
    return {p,q,lift,stance:swing===0,phase,step:k};
  }
  // Analytic two-bone solution: the elbow/knee lies on the intersection of
  // two spheres of fixed radii. Its pole vector preserves the anatomical bend.
  function sqSolveJoint(a,b,l) {
    const delta=b.clone().sub(a),distance=delta.length(),direction=delta.clone().normalize();
    const d=clamp(distance,.0001,l.upperLength+l.lowerLength-.00001);
    const along=(l.upperLength*l.upperLength-l.lowerLength*l.lowerLength+d*d)/(2*d);
    const rise=Math.sqrt(Math.max(0,l.upperLength*l.upperLength-along*along));
    const pole=V(l.side*.32,.035,l.front?-1:1);pole.addScaledVector(direction,-pole.dot(direction)).normalize();
    const center=a.clone().addScaledVector(direction,along),clearance=Math.max(.075,b.y+.036);
    // Keep the bent joint outside the support half-space. Rotate only around
    // the IK solution circle, preserving both bone lengths and the paw plant.
    if(center.y+pole.y*rise<clearance){
      const away=V(0,1,0).addScaledVector(direction,-direction.y).normalize();
      let lo=0,hi=1;for(let i=0;i<14;i++){const u=(lo+hi)/2,p= pole.clone().lerp(away,u).normalize();if(center.y+p.y*rise<clearance)lo=u;else hi=u;}
      pole.lerp(away,hi).normalize();
    }
    return {joint:center.addScaledVector(pole,rise),reach:distance/(l.upperLength+l.lowerLength)};
  }
  // The hidden and carried cone copies still agree exactly at initial pickup.
  coneGround.position.copy(V(0,.045,.305).multiplyScalar(SQ_SCALE).applyQuaternion(walkEndQ).add(lastWalk));
  coneGround.quaternion.copy(walkEndQ).multiply(new T.Quaternion().setFromEuler(new T.Euler(.75,0,0)));
  coneGround.scale.setScalar(SQ_SCALE);
  function poseSquirrel(t,at,sit=0,sniff=0,holding=false) {
    const inverse=at.q.clone().invert(),feet=legs.map(l=>sqFootAt(l,at.c));
    const climbing=1-clamp(V(0,1,0).applyQuaternion(at.q).y,0,1);
    let lateral=0,longitudinal=0;feet.forEach((f,i)=>{lateral-=legs[i].side*f.lift;longitudinal+=(legs[i].front?-1:1)*f.lift;});
    // Shift load toward planted limbs before/through the short paw swings.
    sqTorso.position.set(lateral*.013,-.016*climbing+longitudinal*.005-.008*sniff+.010*sit,longitudinal*.017-.024*sit);
    sqTorso.rotation.set(-.13*sit+(at.s.down?-.028:.028)*climbing-longitudinal*.015,0,lateral*.015);
    sqHead.rotation.set(sniff*.38-sit*.2,Math.sin(t*1.65)*.065*sniff,Math.sin(t*.55)*.012);
    sqHead.position.y=.266-.022*sniff;
    sqTail.rotation.set(.035*sit-longitudinal*.016,0,-lateral*.023+Math.sin(t*.62)*.010);
    const torsoQ=new T.Quaternion().setFromEuler(sqTorso.rotation),records=[];
    for(let i=0;i<legs.length;i++) {
      const l=legs[i],f=feet[i],foot=f.p.clone().sub(at.p).applyQuaternion(inverse).multiplyScalar(1/SQ_SCALE);
      if(l.front&&sit>0)foot.lerp(V(l.side*.047,.149,.275).applyQuaternion(torsoQ).add(sqTorso.position),sit);
      const shoulder=V(l.side*(l.front?.077:.096),l.front?.205:.142,l.front?.099:-.118).applyQuaternion(torsoQ).add(sqTorso.position);
      const ik=sqSolveJoint(shoulder,foot,l);
      placeBone(l.upper,shoulder,ik.joint);placeBone(l.lower,ik.joint,foot);l.joint.position.copy(ik.joint);l.foot.position.copy(foot);
      l.foot.quaternion.copy(inverse).multiply(f.q);
      if(l.front&&sit>0)l.foot.quaternion.slerp(new T.Quaternion().setFromEuler(new T.Euler(-.6,0,0)),sit);
      // Useful numerical diagnostics for root's isolated, non-browser checks.
      records.push({front:l.front,side:l.side,stance:f.stance&&!(l.front&&sit>0),step:f.step,reach:ik.reach,world:f.p.toArray(),upper:l.upper.scale.y,lower:l.lower.scale.y});
    }
    squirrel.userData.motion={phase:at.c,stage:[at.s.a,at.s.b],climbing,active:at.active,burst:at.burst,clock:t,feet:records};
    coneHeld.visible=holding;
    coneHeld.position.set(0,lerp(.232,.148,sit),lerp(.327,.259,sit));
  }

  // WINTER — the drinking ledge is broad, low, and flat where the feet land.
  // Its exposed lip ends before the lowered beak; nearby shore rocks are low too.
  const bankZ=.55,bankX=cx(bankZ)-width(bankZ),rockCenter=V(bankX+.20,0,bankZ);
  const rockGeo=new T.BufferGeometry(),rockP=[],rockI=[],rockSides=18;
  const rockRings=[[.015,.89],[.10,1],[.153,.87]];
  for(const [y,r] of rockRings)for(let i=0;i<rockSides;i++){
    const a=i/rockSides*Math.PI*2,f=1+.035*Math.sin(a*3)+.02*Math.cos(a*5);
    rockP.push(Math.cos(a)*.40*r*f,y,Math.sin(a)*.31*r*f);
  }
  for(let j=0;j<2;j++)for(let i=0;i<rockSides;i++){
    const n=j*rockSides+i,k=j*rockSides+(i+1)%rockSides;
    rockI.push(n,n+rockSides,k,k,n+rockSides,k+rockSides);
  }
  const top=rockP.length/3;rockP.push(0,.153,0,0,.015,0);
  for(let i=0;i<rockSides;i++){const n=2*rockSides+i,k=2*rockSides+(i+1)%rockSides;rockI.push(top,k,n,top+1,i,(i+1)%rockSides);}
  rockGeo.setAttribute('position',new T.Float32BufferAttribute(rockP,3));rockGeo.setIndex(rockI);rockGeo.computeVertexNormals();
  const rock=mesh(rockGeo,stoneMat,rockCenter.toArray(),ctx.root);rock.name='bird-drinking-rock';
  const rockSnow=mesh(rockCoating(rockGeo,.004),white,[0,0,0],rock);rockSnow.name='bird-rock-attached-snow';
  const perch=V(bankX+.485,.157,bankZ-.018),branchPerch=birdPerch.clone();
  const bird=group('winter-long-tailed-tit',winter),birdTorso=group('bird-crouching-body',bird);
  const birdFeet=group('bird-planted-feet',bird),foldedWings=group('bird-folded-wings',birdTorso),openWings=group('bird-flight-wings',birdTorso);
  ellipsoid(0,.13,-.014,.113,.134,.144,white,birdTorso,14);
  ellipsoid(0,.171,-.086,.077,.091,.08,featherDark,birdTorso,12);
  ellipsoid(0,.072,.052,.087,.076,.077,milk,birdTorso,12);
  const birdHead=group('bird-white-round-head',birdTorso);birdHead.position.set(0,.21,.08);
  ellipsoid(0,.02,-.012,.105,.109,.104,white,birdHead,14);
  // One broad feathered neck bridges chest and nape. Both end rings remain
  // buried in the existing white skins; only the connecting shape deforms.
  const neckSteps=14,neckSides=14,neckPositions=new Float32Array(((neckSteps+1)*(neckSides+1)+2)*3),neckIndices=[];
  for(let i=0;i<neckSteps;i++)for(let j=0;j<neckSides;j++){
    const n=i*(neckSides+1)+j;neckIndices.push(n,n+1,n+neckSides+1,n+1,n+neckSides+2,n+neckSides+1);
  }
  const neckCap=(neckSteps+1)*(neckSides+1);
  for(let j=0;j<neckSides;j++){
    neckIndices.push(neckCap,j+1,j);const n=neckSteps*(neckSides+1)+j;neckIndices.push(neckCap+1,n,n+1);
  }
  const neckGeo=new T.BufferGeometry();neckGeo.setAttribute('position',new T.BufferAttribute(neckPositions,3));neckGeo.setIndex(neckIndices);
  const birdNeck=mesh(neckGeo,white,[0,0,0],birdTorso);birdNeck.name='bird-continuous-white-neck';
  const neckStart=V(0,.168,.041),neckEnd=V(),neckAxis=V(),neckAcross=V(),neckUp=V(),neckPoint=V();
  function updateBirdNeck() {
    birdHead.updateMatrix();neckEnd.set(0,.005,-.050).applyMatrix4(birdHead.matrix);
    const positions=neckGeo.attributes.position,bend=Math.min(.010,neckEnd.distanceToSquared(neckStart));
    for(let i=0;i<=neckSteps;i++){
      const u=i/neckSteps,bulge=Math.sin(Math.PI*u),r=lerp(.064,.049,u)+.008*bulge;
      neckAxis.copy(neckEnd).sub(neckStart);neckAxis.y+=bend*Math.PI*Math.cos(Math.PI*u);neckAxis.normalize();
      neckAcross.set(1,0,0).addScaledVector(neckAxis,-neckAxis.x).normalize();neckUp.crossVectors(neckAxis,neckAcross).normalize();
      for(let j=0;j<=neckSides;j++){
        const a=j/neckSides*Math.PI*2,feathers=1+.025*Math.cos(a*5)*bulge;
        neckPoint.copy(neckStart).lerp(neckEnd,u);neckPoint.y+=bend*bulge;
        neckPoint.addScaledVector(neckAcross,Math.cos(a)*r*feathers).addScaledVector(neckUp,Math.sin(a)*r*feathers);
        positions.setXYZ(i*(neckSides+1)+j,neckPoint.x,neckPoint.y,neckPoint.z);
      }
    }
    positions.setXYZ(neckCap,neckStart.x,neckStart.y,neckStart.z);positions.setXYZ(neckCap+1,neckEnd.x,neckEnd.y,neckEnd.z);
    positions.needsUpdate=true;neckGeo.computeVertexNormals();neckGeo.computeBoundingBox();neckGeo.computeBoundingSphere();
  }
  updateBirdNeck();
  // A few tiny feather planes interrupt the too-perfect spherical outline.
  for(let i=0;i<5;i++){
    const a=(i-2)*.25;triangle([[-.018,.10,-.009],[.018,.10,-.009],[a*.024,.139-(Math.abs(i-2)*.006),-.021]],white,birdHead,.019);
  }
  for(const side of [-1,1]) {
    ellipsoid(side*.077,.035,.058,.012,.013,.009,ink,birdHead,10);
    ellipsoid(side*.08,.04,.063,.0035,.0035,.002,white,birdHead,6);
    ellipsoid(side*.1,.019,-.04,.006,.028,.038,featherGrey,birdHead,10);
    const shoulder=ellipsoid(side*.102,.199,-.006,.021,.046,.051,blush,birdTorso,12);shoulder.rotation.x=.35;
    const w=ellipsoid(side*.097,.132,-.079,.032,.106,.137,featherDark,foldedWings,12);w.rotation.x=.36;w.rotation.z=side*.16;
    for(let j=0;j<3;j++) {
      const f=ellipsoid(side*(.106+j*.001),.131-j*.017,-.087-j*.016,.009,.067,.094,j===1?white:featherGrey,foldedWings,10);f.rotation.x=.57;
    }
  }
  // Beak tip is exactly head-local [0,.015,.120], used below for dipping.
  const beak=mesh(new T.ConeGeometry(.013,.03,6),ink,[0,.015,.105],birdHead);beak.rotation.x=Math.PI/2;
  const birdTail=group('bird-long-black-white-tail',birdTorso);birdTail.position.set(0,.092,-.13);birdTail.rotation.x=.32;
  for(let i=-2;i<=2;i++) {
    const feather=ellipsoid(i*.014,-.008,-.17+Math.abs(i)*.017,.013,.01,.19-Math.abs(i)*.015,Math.abs(i)===2?white:featherDark,birdTail,10);feather.rotation.y=-i*.016;
  }
  line([[-.025,.002,-.008],[-.025,-.006,-.175],[-.014,-.01,-.343]],white,.0038,birdTail);
  line([[.023,.002,-.008],[.025,-.006,-.17],[.015,-.01,-.344]],white,.0038,birdTail);
  const birdWingRig=[];
  for(const side of [-1,1]) {
    const wing=group('bird-spread-wing',openWings);wing.position.set(side*.074,.207,-.018);
    const coords=[[0,0,0],[side*.11,-.018,.019],[side*.26,-.028,-.076],[side*.286,-.035,-.195],[side*.129,-.013,-.153],[side*.027,0,-.076]];
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(coords.flat(),3));g.setIndex([0,1,2,0,2,4,2,3,4,0,4,5]);g.computeVertexNormals();
    const wm=material('#424944',{side:T.DoubleSide,flatShading:true});mesh(g,wm,[0,0,0],wing);
    for(let j=0;j<4;j++)line([[side*(.05+j*.035),-.006,-.055],[side*(.15+j*.035),-.026,-.165-j*.005]],j%2?featherGrey:white,.007,wing);
    birdWingRig.push({wing,side});
    const x=side*.038;beam([x,.06,-.002],[x,.02,.009],.008,.006,toeMat,birdFeet);
    for(const dz of [-.021,.01,.03])line([[x,.02,.009],[x+side*.016,.007,dz],[x+side*.026,.003,dz+.007]],toeMat,.004,birdFeet);
  }
  const landingQ=new T.Quaternion().setFromAxisAngle(V(0,1,0),Math.PI/2);
  const branchYaw=ctx.birdPerchYaw??Math.PI/2-.74;
  const branchQ=new T.Quaternion().setFromAxisAngle(V(0,1,0),branchYaw);
  // The high branch gets a compact climbing grip; creek and flight feet keep
  // their existing pose. Surface sampling happens only during construction.
  const branchFeet=group('bird-branch-gripping-feet',bird),gripSurfaces=ctx.birdGripSurfaces;
  ctx.root.updateMatrixWorld(true);
  const gripRay=new T.Raycaster(),gripInverse=branchQ.clone().invert(),gripTips=[];
  const gripWorld=p=>p.clone().applyQuaternion(branchQ).add(branchPerch);
  const gripLocal=p=>p.clone().sub(branchPerch).applyQuaternion(gripInverse);
  function gripSurface(x,z) {
    const w=gripWorld(V(x,0,z));
    gripRay.set(V(w.x,branchPerch.y+.32,w.z),V(0,-1,0));gripRay.far=.85;
    const hit=gripRay.intersectObjects(gripSurfaces,false)[0];
    if(!hit)throw new Error('Bird branch grip lies outside the supporting limb');
    return gripLocal(hit.point);
  }
  function settleGripMesh(o) {
    // Curve undersides conform to the actual faceted snow/bark surface.
    // This is a single construction-time adjustment, not foot sliding.
    o.updateMatrix();const inv=o.matrix.clone().invert(),p=o.geometry.attributes.position;
    for(let i=0;i<p.count;i++){
      const v=V().fromBufferAttribute(p,i).applyMatrix4(o.matrix),surface=gripSurface(v.x,v.z);
      if(v.y<surface.y+.0005){v.y=surface.y+.0005;v.applyMatrix4(inv);p.setXYZ(i,v.x,v.y,v.z);}
    }
    p.needsUpdate=true;o.geometry.computeVertexNormals();o.geometry.computeBoundingBox();o.geometry.computeBoundingSphere();
  }
  for(const side of [-1,1]) {
    const x=side*.022,sole=gripSurface(x,.004),ankle=sole.clone().add(V(0,.014,0));
    const hip=V(side*.034,.06,-.002),knee=hip.clone().lerp(ankle,.55).add(V(side*.004,.013,.004));
    beam(hip,knee,.0075,.006,toeMat,branchFeet).name='bird-branch-upper-leg';
    beam(knee,ankle,.006,.0045,toeMat,branchFeet).name='bird-branch-lower-leg';
    ellipsoid(knee.x,knee.y,knee.z,.0075,.008,.0075,toeMat,branchFeet,8).name='bird-branch-ankle-joint';
    for(let j=0;j<4;j++){
      const end=j===3?V(x-side*.003,0,-.020):V(x+(j-1)*.008,0,.028+(j===1?.004:0));
      const points=[];
      for(let k=0;k<=8;k++){
        const u=k/8,p=gripSurface(lerp(x,end.x,u),lerp(.004,end.z,u));
        p.y+=.0033+.0107*(1-u)*(1-u);points.push(p.toArray());
      }
      const toe=line(points,toeMat,.0028,branchFeet);toe.name='bird-branch-gripping-toe';settleGripMesh(toe);
      gripTips.push(gripWorld(V(...points[8])).toArray());
    }
  }
  branchFeet.visible=false;
  bird.userData.branchGrip={tips:gripTips,yaw:branchYaw};

  // Leave the roof at full height before descending beyond the front eave.
  // The return is one rounded climb from the open forecourt, then a shallow
  // approach along the horizontal perch. World coordinates keep the arc smooth.
  const sky=branchPerch.y+.55;
  const inbound=new T.CatmullRomCurve3([branchPerch,branchPerch.clone().add(V(-.18,.70,.60)),V(-2.65,5.35,1.35),V(-3.70,3.10,1.85),V(-3.35,1.80,perch.z),perch.clone().add(V(-1.00,.68,0)),perch.clone().add(V(-.26,.12,0)),perch]);
  const outbound=new T.CatmullRomCurve3([perch,perch.clone().add(V(.24,.32,.17)),V(.25,1.75,1.55),V(1.05,3.80,1.25),V(1.2,sky+.20,.20),V(.55,sky+.30,-.80),branchPerch.clone().add(V(.65,.48,-.28)),branchPerch.clone().add(V(.25,.12,-.12)),branchPerch]);
  inbound.arcLengthDivisions=800;outbound.arcLengthDivisions=800;
  bird.userData.branchPerch=branchPerch.toArray();bird.userData.drinkingPerch=perch.toArray();
  bird.userData.flightRoutes={inbound:inbound.points.map(p=>p.toArray()),outbound:outbound.points.map(p=>p.toArray())};
  let lastSip=-1;
  function flyBird(curve,u,t,fromQ,toQ) {
    branchFeet.visible=false;birdFeet.visible=true;
    const e=ease(u);bird.position.copy(curve.getPointAt(e));
    const tangent=curve.getTangentAt(clamp(e,.002,.998)).normalize(),heading=V(tangent.x,0,tangent.z).normalize();
    const pitch=-clamp(Math.atan2(tangent.y,Math.hypot(tangent.x,tangent.z))*.16,-.12,.12);
    const q=quatFor(V(0,1,0),heading).multiply(new T.Quaternion().setFromAxisAngle(V(1,0,0),pitch));
    const arrival=ease((u-.84)/.16),departure=ease(u/.12);
    bird.quaternion.copy(fromQ).slerp(q,departure).slerp(toQ,arrival);
    const flapEnvelope=Math.min(1,u/.07,(1-u)/.18);
    const ahead=curve.getTangentAt(clamp(e+.025,0,1));ahead.y=0;ahead.normalize();
    const turn=Math.atan2(heading.clone().cross(ahead).y,heading.dot(ahead)),bank=clamp(-turn*1.6,-.20,.20)*Math.sin(u*Math.PI);
    birdTorso.rotation.set(0,0,bank);birdTorso.position.y=.006+.003*Math.sin(t*34)*Math.sin(Math.PI*u);
    birdHead.position.set(0,.21,.08);birdHead.rotation.set(-.05,0,0);birdTail.rotation.x=.32+.1*Math.sin(u*Math.PI);
    foldedWings.visible=false;openWings.visible=true;
    for(const {wing,side} of birdWingRig){const beat=Math.sin(t*34);wing.rotation.z=side*(.12+beat*.88*flapEnvelope);wing.rotation.y=side*Math.cos(t*34)*.17*flapEnvelope;wing.scale.x=(.32+.68*clamp(flapEnvelope,0,1))*(1-Math.max(0,beat)*.15);}
    birdFeet.rotation.x=.4*Math.sin(Math.PI*u);bird.userData.flightPose={u,pitch,bank};
  }
  function perchBird(position,q,t,drink=0,swallow=0,look=0,nod=0) {
    branchFeet.visible=position===branchPerch;birdFeet.visible=!branchFeet.visible;
    bird.position.copy(position);bird.quaternion.copy(q);foldedWings.visible=true;openWings.visible=false;birdFeet.rotation.x=0;
    // Lean forward with a small ankle extension and neck reach; the quick pair of
    // sips comes from the head only. Planted feet never pivot with the torso.
    const theta=.28,totalPitch=1.38,reachZ=.155;
    const reachY=(.078-perch.y-.034+reachZ*Math.sin(theta)-.015*Math.cos(totalPitch)+.120*Math.sin(totalPitch))/Math.cos(theta);
    birdTorso.position.y=.006+.028*drink;birdTorso.rotation.set(theta*drink,0,0);
    birdHead.position.set(0,lerp(.21,reachY,drink)-nod*.009,lerp(.08,reachZ,drink)+nod*.002);
    birdHead.rotation.set((totalPitch-theta)*drink+nod*.095-.18*swallow,look*(1-drink),.012*Math.sin(t*.8)*(1-drink));
    birdTail.rotation.x=.32-.06*drink;
    // Scaling about the body's centre keeps the breathing nearly invisible.
    const b=1+.006*Math.sin(t*2.1)*(1-drink);birdTorso.scale.set(1,b,1);
  }

  let season='',epoch=0,resetEpoch=true,autumnDawnEpoch=0;
  function setSeason(s) {
    spring.visible=s==='spring';autumn.visible=s==='autumn';winter.visible=s==='winter';rockSnow.visible=s==='winter';
    if(s!==season){season=s;resetEpoch=true;lastSip=-1;squirrel.visible=false;autumnDawnEpoch=0;springCat.reset();}
  }
  function update(time,night=false) {
    if(resetEpoch){epoch=time;resetEpoch=false;lastSip=-1;}
    const age=Math.max(0,time-epoch);
    if(season==='spring') {springCat.update(age,night);return;}
    if(season==='autumn') {
      if(night){
        squirrel.visible=false;coneGround.visible=true;autumnDawnEpoch=age;
        for(const l of leaves){l.o.position.set(l.x,l.y,l.z);l.o.rotation.y=l.ry;}
        return;
      }
      const t=(age-autumnDawnEpoch)%SQ_CYCLE,at=sqAtTime(t);let sit=0,sniff=0,holding=t>=22.4;
      squirrel.visible=t>=.65&&t<43.9;coneGround.visible=t<22.4;
      squirrel.position.copy(at.p);squirrel.quaternion.copy(at.q);
      if(t>=18.7&&t<21.0){const u=(t-18.7)/2.3;sniff=Math.sin(u*Math.PI)*(.16+.28*Math.pow(Math.max(0,Math.sin(u*Math.PI*2)),2));}
      if(t>=21.0&&t<22.4){const u=(t-21.0)/1.4;sniff=.27*Math.sin(u*Math.PI);sit=.20*Math.sin(u*Math.PI);}
      if(t>=22.4&&t<26)sit=ease((t-22.4)/.9)*(1-ease((t-25.25)/.75));
      if((t>=6.6&&t<7.5)||(t>=38&&t<38.8))sniff=.09*Math.sin((t-at.s.a)/(at.s.b-at.s.a)*Math.PI);
      poseSquirrel(t,at,sit,sniff,holding);
      if(t>=22.4&&t<23.3){const u=ease((t-22.4)/.9);coneHeld.position.set(0,lerp(.045,.148,u),lerp(.305,.259,u));}
      for(let i=0;i<leaves.length;i++) {
        const l=leaves[i],a=t-21,dist=Math.hypot(l.x-leafCenter.x,l.z-leafCenter.z),active=a>0&&a<1.4&&i%7===0&&dist<.23;
        const u=active?Math.sin(a/1.4*Math.PI):0;l.o.position.set(l.x+u*.018,l.y+u*.037,l.z+u*.014);l.o.rotation.y=l.ry+u*.24;
      }
      return;
    }
    if(season==='winter') {
      const t=age%52,cycle=Math.floor(age/52);bird.visible=true;birdTorso.scale.set(1,1,1);
      if(t<2)perchBird(branchPerch,branchQ,t,0,0,-.08);
      else if(t<7.8)flyBird(inbound,(t-2)/5.8,t,branchQ,landingQ);
      else if(t<24.5) {
        let drink=0,swallow=0,look=0,nod=0,pendingSip=-1;
        const starts=[9.0,13.5,18.0];
        for(let i=0;i<starts.length;i++) {
          const p=t-starts[i];
          if(p>=0&&p<.43)drink=ease(p/.43);
          else if(p>=.43&&p<1.10)drink=1;
          else if(p>=1.10&&p<1.60){const u=ease((p-1.10)/.50);drink=1-u;swallow=Math.sin(u*Math.PI)*.38;}
          else if(p>=1.60&&p<2.13)swallow=Math.sin((p-1.60)/.53*Math.PI)*.55;
          for(let j=0;j<2;j++){
            const n=(p-(.48+j*.29))/.18;
            if(n>0&&n<1)nod=Math.pow(Math.sin(n*Math.PI),2);
            const key=cycle*6+i*2+j;
            if(n>=.48&&n<1.8&&lastSip<key){pendingSip=key;}
          }
        }
        if(t>21)look=Math.sin((t-21)*.9)*.18;
        perchBird(perch,landingQ,t,drink,swallow,look,nod);
        if(pendingSip>=0){
          lastSip=pendingSip;bird.updateMatrixWorld(true);
          const contact=V(0,.015,.120).applyMatrix4(birdHead.matrixWorld);
          ripple?.(contact.x,contact.z,.12);
        }
        bird.userData.sipNod=nod;bird.userData.drinkAmount=drink;
      } else if(t<29.6)flyBird(outbound,(t-24.5)/5.1,t,landingQ,branchQ);
      else {
        const glance=t>37&&t<39?Math.sin((t-37)/2*Math.PI)*.22:0;
        perchBird(branchPerch,branchQ,t,0,0,glance);
      }
      updateBirdNeck();
    }
  }
  setSeason('summer');
  return {setSeason,update,groups:{spring,autumn,winter}};
}
