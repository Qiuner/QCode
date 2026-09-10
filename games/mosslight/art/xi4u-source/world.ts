// All geometry, material maps, weather and sound are made here; no asset loaders.
// @ts-nocheck
import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createPixelRenderer} from './pixel-renderer';
import {createPortraitFraming,collectGardenFramePoints} from './portrait-framing';
import {createCanopyFall} from './canopy-fall';
import {gardenWind,normalizeGardenWeather,springStorm,createNightButterflies} from './garden-atmosphere';
import {createSeasonalLife} from './seasonal-life';
import {createDayNightLife} from './day-night-life';
import {createSnowAccumulation} from './snow-accumulation';
import {createRoofLeaves} from './roof-leaves';
import {createWinterCreekIce} from './winter-creek-ice';
import {gardenTheme} from './garden-theme';
import {createGardenClock,GARDEN_SEASONS} from './garden-clock';
import {createCelestialBodies} from './celestial-bodies';
import {isGardenRenderStyle,PIXEL_SIZE_CSS} from './render-style';
import {createSceneTransition} from './scene-transition';
import {createWeatherCycle} from './weather-cycle';
import {createDaylightTransition} from './daylight-transition';
import {createRainStreaks} from './rain-streaks';
import {createAncientTree} from './ancient-tree';
import {treeHeight} from './tree-profile';
import {branchSnowSurface,rockCoating} from './snow-surface';
import {createCreekMaterial} from './water-surface';
import {createWaterCurrent} from './water-current';
import {createOrganicTerrain,withinGarden,withinCreek,streamExtent} from './terrain-footprint';
import {createVerandaPlant} from './veranda-plant';
import {createSeasonalFauna} from './seasonal-fauna';
import {createSummerSleeper} from './summer-sleeper';
import {createGardenLife} from './garden-life';
import {createCurvedGrassGeometry,paintCurvedGrass,bendCurvedGrass} from './curved-grass';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
declare const __MINITOOL__: boolean;

export function createWorld(host:HTMLElement,options:{onTimeChange?:(snapshot:any)=>void}={}){
 const weatherCycle=createWeatherCycle(),daylightTransition=createDaylightTransition();
 const gardenClock=createGardenClock();let clockSnapshot=gardenClock.getSnapshot(),lastClockReport=-Infinity;
 function reportTime(){options.onTimeChange?.({...clockSnapshot,weather:state.weather});}
 let seed=29417;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 const rr=(a,b)=>a+(b-a)*rand(),v=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
 const state={season:'summer',night:false,weather:'clear',paused:false,sound:false,pixelated:false,renderStyle:'clear'};
 const scene=new T.Scene();scene.background=null;
 const renderer=new T.WebGLRenderer({antialias:false,alpha:true,premultipliedAlpha:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});
 const renderDpr=Math.min(window.devicePixelRatio||1,__MINITOOL__?1:2);renderer.setClearColor(0x000000,0);renderer.setPixelRatio(renderDpr);renderer.shadowMap.enabled=true;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;renderer.shadowMap.type=T.PCFShadowMap;renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;host.appendChild(renderer.domElement);
 const camera=new T.OrthographicCamera(-8,8,8,-8,.1,100);camera.position.set(11,13,17);
 const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(-.25,1.55,0);controls.enableDamping=true;controls.dampingFactor=.06;controls.minPolarAngle=.28;controls.maxPolarAngle=1.38;controls.minZoom=.65;controls.maxZoom=6;controls.enablePan=true;controls.screenSpacePanning=true;controls.maxTargetRadius=Infinity;controls.mouseButtons={LEFT:T.MOUSE.ROTATE,MIDDLE:T.MOUSE.DOLLY,RIGHT:T.MOUSE.PAN};controls.touches={ONE:T.TOUCH.ROTATE,TWO:T.TOUCH.DOLLY_PAN};controls.update();
 const pixelRenderer=createPixelRenderer(renderer,scene,camera);
 const sceneTransition=createSceneTransition({host,canvas:renderer.domElement});
 const root=new T.Group();scene.add(root);
 const resources=new Set();const animations=[];const snowCaps=[];const rockMoss=[];const lanterns=[];const seasonal=[];
 const material=(color,extra={})=>{const m=new T.MeshStandardMaterial({color,roughness:.83,...extra});resources.add(m);return m;};
 const ink=material('#303b32'),woodDark=material('#50473e'),woodEdge=material('#bd7850'),paper=material('#f0e6c8',{roughness:.96,side:T.DoubleSide}),stone=material('#858e85',{flatShading:true}),moss=material('#6b8050'),snowMat=material('#eef4ef'),brass=material('#a29557',{metalness:.55,roughness:.35});
 function mesh(g,m,p=[0,0,0],parent=root){resources.add(g);const o=new T.Mesh(g,m);o.position.set(...p);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
 function box(w,h,d,m,p,parent=root,r=0){return mesh(r?new RoundedBoxGeometry(w,h,d,2,r):new T.BoxGeometry(w,h,d),m,p,parent);}
 function ellipsoid(x,y,z,rx,ry,rz,m,parent=root,segments=16){let o=mesh(new T.SphereGeometry(1,segments,12),m,[x,y,z],parent);o.scale.set(rx,ry,rz);return o;}
 function line(points,m,r=.025,parent=root){const curve=new T.CatmullRomCurve3(points.map(p=>Array.isArray(p)?v(...p):p));return mesh(new T.TubeGeometry(curve,Math.max(8,points.length*6),r,6,false),m,[0,0,0],parent);}
 function beam(a,b,r1,r2,m,parent=root){a=Array.isArray(a)?v(...a):a;b=Array.isArray(b)?v(...b):b;let d=b.clone().sub(a);let o=mesh(new T.CylinderGeometry(r2,r1,d.length(),8),m,a.clone().add(b).multiplyScalar(.5).toArray(),parent);o.quaternion.setFromUnitVectors(v(0,1,0),d.normalize());return o;}
 function rim(o){const l=new T.LineSegments(new T.EdgesGeometry(o.geometry,35),new T.LineBasicMaterial({color:'#384538',transparent:true,opacity:.23}));o.add(l);return o;}
 function texture(kind,random=rand){
 const rand=random,rr=(a,b)=>a+(b-a)*rand();
 const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;
 const colors=kind==='wood'?['#cc915b','#e9ad70','#f3c786','#b67950','#a66d48']:kind==='tatami'?['#cad291','#b6c786','#dfe1a2','#98b181']:kind==='spring-ground'?['#d4b9b9','#e4c8c8','#b4c3a5','#efd7d2']:['#a9c585','#bccf91','#7eac84','#d5d89a'];
 ctx.fillStyle=colors[0];ctx.fillRect(0,0,128,128);
 if(kind==='wood'){for(let i=0;i<160;i++){ctx.fillStyle=colors[1+Math.floor(rand()*4)];ctx.fillRect(Math.floor(rr(0,120)),Math.floor(rr(0,128)),Math.floor(rr(4,44)),rand()>.8?2:1);}for(let i=0;i<5;i++){let x=Math.floor(rr(10,110)),y=Math.floor(rr(2,124));ctx.fillStyle=colors[4];ctx.fillRect(x,y,9,1);ctx.fillRect(x+2,y-1,5,3);ctx.fillStyle=colors[0];ctx.fillRect(x+3,y,3,1);}}
 else if(kind==='tatami'){for(let y=0;y<128;y+=2){ctx.fillStyle=colors[(y/2)%3];ctx.fillRect(0,y,128,1);}for(let x=0;x<128;x+=8){ctx.fillStyle=colors[3];for(let y=0;y<128;y+=4)ctx.fillRect(x,y,1,2);}}
 else{for(let i=0;i<320;i++){ctx.fillStyle=colors[Math.floor(rand()*colors.length)];ctx.fillRect(Math.floor(rr(0,128)),Math.floor(rr(0,128)),Math.floor(rr(2,8)),Math.floor(rr(1,4)));}}
 const tx=new T.CanvasTexture(c);tx.colorSpace=T.SRGBColorSpace;tx.wrapS=tx.wrapT=T.RepeatWrapping;tx.magFilter=tx.minFilter=T.NearestFilter;tx.generateMipmaps=false;tx.userData.gardenPixelTexture=true;resources.add(tx);return tx;}
 const woodTex=texture('wood'),wood=material('#fff5df',{map:woodTex}),tatami=material('#f6f1c7',{map:texture('tatami')}),groundTex=texture('ground'),groundMat=material('#d5e7ac',{map:groundTex});
 // Spring's blush ground uses a private seed, leaving every garden anchor unchanged.
 let springTextureSeed=7119;const springGroundTex=texture('spring-ground',()=>{springTextureSeed=(springTextureSeed*1664525+1013904223)>>>0;return springTextureSeed/4294967296;});
 const shadowMat=new T.ShadowMaterial({color:0x000000,opacity:.14,depthWrite:false});resources.add(shadowMat);const shadowGround=mesh(new T.PlaneGeometry(200,200),shadowMat,[0,-.145,0],scene);shadowGround.rotation.x=-Math.PI/2;shadowGround.castShadow=false;shadowGround.userData.inkOutline=false;
 const hemi=new T.HemisphereLight('#fff4c7','#3c9690',2.4);scene.add(hemi);
 const sun=new T.DirectionalLight('#fff0c7',4.2);sun.name='moving-sky-light';sun.position.fromArray(clockSnapshot.sunDirection).multiplyScalar(18);sun.castShadow=true;sun.shadow.mapSize.set(__MINITOOL__?1024:4096,__MINITOOL__?1024:4096);Object.assign(sun.shadow.camera,{left:-12,right:12,top:12,bottom:-12,near:.1,far:50});sun.shadow.bias=-.00025;sun.shadow.normalBias=.035;sun.shadow.radius=3;scene.add(sun);
 // Moonlight shapes the night palette and creek reflection, but does not cast
 // a second shadow while the last daylight shadow is still fading at dusk.
 const moon=new T.DirectionalLight('#a6c9f6',0);moon.name='moving-moon-light';moon.castShadow=false;scene.add(moon);
 sun.shadow.autoUpdate=false;
 const celestial=createCelestialBodies(scene,camera);
 const lightDirection=new T.Vector3(),moonDirection=new T.Vector3();
 const noonLight=new T.Color('#fff0c7'),lowLight=new T.Color('#efad73'),moonLight=new T.Color('#a6c9f6'),dayHemi=new T.Color('#fff0c6'),nightHemi=new T.Color('#8caeca'),twilightColor=new T.Color('#eda78c'),dawnColor=new T.Color('#edc6b2'),overcastColor=new T.Color('#bbc8c6');
 const fill=new T.DirectionalLight('#6dc8ce',.6);fill.position.set(7,6,-4);scene.add(fill);
 const warm=new T.PointLight('#ffc17a',0,8,2);warm.name='interior-warm-light';warm.position.set(-1.3,2.2,-2.4);scene.add(warm);const glow=new T.PointLight('#ffc267',0,5,2);glow.position.set(2.6,.9,1.7);scene.add(glow);
 const bedMat=material('#a1b29b',{map:texture('ground')});
 // Creek centre and width, shared by banks, fish, leaves, ray hits, and ripples.
 const cx=z=>.75+1.75*Math.exp(-Math.pow((z+4)/1.7,2))-.25*Math.sin(z*.85);
 const width=z=>1.95+.36*Math.sin(z*.5+.8)-.79*Math.exp(-Math.pow((z-3.22)/1.4,2));
 const reserved=(x,z)=>(Math.abs(z-3.22)<.85&&Math.abs(x-cx(z))<width(z)+.75)||(x<cx(z)-width(z)&&z>.78)||(x>3.53&&z>-.1&&z<2.9)||(x>3.9&&z>-1.6&&z<.5);
 const inWater=(x,z)=>withinCreek(x,z,cx,width,.05);
 const terrain=createOrganicTerrain({root,mesh,material,groundMat,bedMat,cx,width});
 // Hundreds of real submerged pebbles.
 const pebbleGeo=new T.IcosahedronGeometry(1,0),pebbleMat=material('#a0a68a',{flatShading:true}),pebbles=new T.InstancedMesh(pebbleGeo,pebbleMat,650),dummy=new T.Object3D();
 let pi=0;while(pi<650){let z=rr(-4.9,4.9),x=cx(z)+rr(-width(z),width(z));if(!(Math.abs(x-cx(z))<width(z)-.05&&Math.abs(x)<4.95&&Math.abs(z)<4.95))continue;dummy.position.set(x,-.1+rr(-.035,.03),z);dummy.scale.set(rr(.025,.09),rr(.012,.035),rr(.025,.08));dummy.rotation.set(rr(0,3),rr(0,6),rr(0,3));dummy.updateMatrix();pebbles.setMatrixAt(pi,dummy.matrix);pebbles.setColorAt(pi,new T.Color().setHSL(rr(.1,.18),rr(.05,.2),rr(.25,.62)));pi++;}for(let i=0;i<650;i++){pebbles.getMatrixAt(i,dummy.matrix);dummy.matrix.decompose(dummy.position,dummy.quaternion,dummy.scale);if(!inWater(dummy.position.x,dummy.position.z)){dummy.scale.setScalar(0);dummy.updateMatrix();pebbles.setMatrixAt(i,dummy.matrix);}}pebbles.receiveShadow=true;pebbles.userData.inkOutline=false;root.add(pebbles);
 const {material:waterMat,uniforms:waterUniform}=createCreekMaterial();
 const water=mesh(terrain.waterGeometry,waterMat,[0,.055,0]);water.rotation.x=-Math.PI/2;water.castShadow=false;water.renderOrder=2;
 const waterCurrent=createWaterCurrent({root,mesh,cx,width,streamExtent});
 let creekIce=null;
 // Shore rocks and layered moss caps.
 function rock(x,z,s=.4,y=.17){let g=new T.IcosahedronGeometry(1,1);const p=g.attributes.position;for(let i=0;i<p.count;i++){let f=rr(.87,1.12);p.setXYZ(i,p.getX(i)*f,p.getY(i)*f,p.getZ(i)*f);}g.computeVertexNormals();let m=stone.clone();m.color.setHSL(rr(.12,.18),rr(.03,.1),rr(.4,.62));let o=mesh(g,m,[x,y,z]);o.name='shore-rock';o.scale.set(s*rr(.9,1.35),s*rr(.6,.85),s*rr(.8,1.12));o.rotation.y=rr(0,6.28);
 // A shallow rock shelf opens the left drinking inlet without changing the meadow.
 if(x>-2.15&&x<-.95&&z>-.35&&z<1.40){o.position.y=.083;o.scale.y=.05;o.userData.lowDrinkingShore=true;}
 const cap=mesh(rockCoating(g,.006),moss,[0,0,0],o);rockMoss.push(cap);
 const sn=mesh(rockCoating(g,.018),snowMat,[0,0,0],o);sn.name='rock-snow-coating';sn.visible=false;snowCaps.push(sn);if(!withinGarden(x,z,-.12))o.visible=false;return o;}
 for(let side of [-1,1])for(let z=-4.7;z<4.9;z+=rr(.4,.8)){let x=cx(z)+side*(width(z)+rr(-.07,.2));if(x<4.8&&x>-4.8&&Math.abs(z-3.22)>.65)rock(x,z,rr(.24,.55));}
 [[3.3,-3.6,.7],[3.7,-2.6,.65],[3.1,-1.6,.63],[2.8,-.65,.55],[-3.95,1.85,.42],[4.5,3.65,.36],[-3.8,1,.6]].forEach(a=>rock(...a));
 // The raised veranda: open toward the stream, no front wall.
 const house=new T.Group();root.add(house);
 for(let x=-3.75;x<2.25;x+=1.15)for(let z of [-3.5,-.55]){rock(x,z,.24,.08);box(.14,.74,.14,woodDark,[x,.43,z],house);}
 box(6.4,.19,3.45,woodDark,[-.8,.76,-2],house);
 for(let i=0;i<33;i++){let x=-3.96+i*.197;const m=wood.clone();m.color.setHSL(.095,.47,rr(.82,.95));box(.187,.09,3.47,m,[x,.9,-2],house);}
 box(6.48,.17,.16,woodEdge,[-.8,.8,-.24],house);box(.16,.17,3.56,woodEdge,[-4,.8,-2],house);
 for(let x=-3.5;x<1.8;x+=1.35){box(1.3,.055,1.9,tatami,[x,.99,-2.57],house);for(let d of [-.65,.65])box(.025,.065,1.9,material('#5a684e'),[x+d,1,-2.57],house);}
 // Posts, lintels, exposed rafters and the back shoji wall.
 for(let x of [-3.93,-1.1,2.3])for(let z of [-3.65,-.52]){box(.16,2.75,.16,woodEdge,[x,2.12,z],house);box(.23,.11,.23,woodDark,[x,1.05,z],house);}
 for(let z of [-3.65,-.52])box(6.58,.23,.2,woodDark,[-.82,3.44,z],house);
 for(let x of [-3.93,2.3])box(.21,.22,3.35,woodDark,[x,3.35,-2.1],house);
 function shoji(x,z,w,h,side=false){const g=new T.Group();g.position.set(x,1.02,z);if(side)g.rotation.y=Math.PI/2;house.add(g);box(w,h,.045,paper,[0,h/2,0],g);for(let xx of [-w/2,w/2])box(.065,h+.05,.075,woodDark,[xx,h/2,.025],g);for(let yy of [0,h])box(w,.07,.075,woodDark,[0,yy,.025],g);for(let xx=-w/2+.26;xx<w/2;xx+=.26)box(.023,h,.035,woodEdge,[xx,h/2,.04],g);for(let yy=.3;yy<h;yy+=.33)box(w,.026,.035,woodEdge,[0,yy,.04],g);box(w,.27,.065,wood,[0,.135,.055],g);return g;}
 shoji(-2.55,-3.67,2.6,2.23);shoji(.1,-3.67,2.55,2.23);shoji(-3.96,-2.8,1.55,2.22,true);shoji(2.31,-2.9,1.4,2.22,true);
 // Sliding side screen partially open.
 const openInteriorScreen=shoji(1.55,-1.55,.87,2.23);openInteriorScreen.name='day-open-interior-screen';
 // The roof has individual curved kawara tiles, offset seams, end discs and ridge caps.
 const roof=new T.Group();house.add(roof);const roofMat=material('#336f7e'),roofLight=material('#6b9d9e');
 let slab=box(7.15,.15,3.35,woodDark,[-.82,3.91,-2.27],roof);slab.rotation.x=.235;
 // Shallow front overhang keeps the open veranda and its still life visible.
 for(let x=-4.28;x<2.75;x+=.255){let rafter=box(.057,.1,3.51,woodEdge,[x,3.78,-2.25],roof);rafter.rotation.x=.235;}
 for(let col=0;col<26;col++)for(let row=0;row<8;row++){
 let x=-4.2+col*.27,z=-3.7+row*.43,y=4.38-(z+3.7)*.24;
 let tile=new T.Group();tile.position.set(x,y,z);tile.rotation.x=.235;roof.add(tile);
 let m=roofMat.clone();m.color.offsetHSL(0,0,rr(-.045,.035));
 // low polygon ceramic arch open underside.
 let t=mesh(new T.CylinderGeometry(.148,.148,.45,10,1,true,0,Math.PI),m,[0,0,0],tile);t.rotation.x=Math.PI/2;
 if(row===7){let disc=mesh(new T.CylinderGeometry(.15,.15,.036,12),roofLight,[0,0,.232],tile);disc.rotation.x=Math.PI/2;let circle=mesh(new T.TorusGeometry(.093,.012,4,12),roofMat,[0,0,.253],tile);}
 }
 for(let x=-4.15;x<2.75;x+=.38){let t=mesh(new T.CylinderGeometry(.21,.21,.38,12,1,true,0,Math.PI),roofLight,[x,4.56,-3.9],roof);t.rotation.z=Math.PI/2;t.rotation.x=Math.PI/2;}
 let snowRoof=box(7.1,.1,3.34,snowMat,[-.82,4.1,-2.27],roof,.06);snowRoof.rotation.x=.235;snowRoof.visible=false;snowCaps.push(snowRoof);
 const roofLeaves=createRoofLeaves({root,roof,material});
 // Short bamboo sudare hanging at one side, leaving the interior open.
 for(let i=0;i<18;i++){let b=mesh(new T.CylinderGeometry(.013,.013,1.4,5),material(i%2?'#a69b65':'#baaa72'),[-3.2,3.35-i*.029,-.52],house);b.rotation.z=Math.PI/2;}for(let x of [-3.72,-2.68])line([[x,3.42,-.55],[x,2.83,-.55]],woodDark,.009,house);
 // Detailed low tea table and cushions.
 const table=box(1.16,.08,.72,wood,[-2.02,1.34,-2.33],house,.035);for(let dx of [-.47,.47])for(let dz of [-.25,.25])box(.06,.32,.06,woodDark,[-2.02+dx,1.16,-2.33+dz],house);
 // Fully on the lower wooden deck: bottom .945, clear of the tatami step at -1.62.
 const cushionMat=material('#9b8672');box(.65,.09,.55,cushionMat,[-2.12,.990,-1.305],house,.04).name='veranda-floor-cushion';
 function lathe(points,m,p,parent=root){return mesh(new T.LatheGeometry(points.map(a=>new T.Vector2(...a)),24),m,p,parent);}
 const ceramic=material('#c2c6a0',{roughness:.3}),tea=material('#55542d',{roughness:.17});
 function cup(x,y,z,parent=root){const g=new T.Group();g.position.set(x,y,z);parent.add(g);lathe([[.035,0],[.07,.015],[.086,.09],[.082,.105],[.067,.105],[.062,.035]],ceramic,[0,0,0],g);mesh(new T.CircleGeometry(.067,24),tea,[0,.085,0],g).rotation.x=-Math.PI/2;return g;}
 function teapot(x,y,z,parent=root){const g=new T.Group();g.name='ceramic-teapot';g.position.set(x,y,z);parent.add(g);lathe([[.06,0],[.14,.04],[.155,.13],[.11,.23],[.065,.24]],ceramic,[0,0,0],g);ellipsoid(0,.245,0,.12,.03,.12,ceramic,g);ellipsoid(0,.285,0,.03,.028,.03,woodDark,g);line([[.09,.04,0],[.23,.11,0],[.27,.24,0]],ceramic,.037,g);line([[-.11,.19,0],[-.25,.24,0],[-.25,.06,0],[-.1,.045,0]],woodDark,.021,g);return g;}
 const seasonalLife=createSeasonalLife({root,material,mesh,box,ellipsoid,line,beam,lathe,cup,teapot,wood,woodDark,paper,brass,rr});seasonalLife.setSeason('summer');
 // Small glass wind chime, suspended only from the eave (15 cm bell).
 const chime=new T.Group();chime.name='eave-wind-chime';chime.position.set(1.65,3.47,-.57);house.add(chime);line([[0,0,0],[0,-.28,0]],woodDark,.005,chime);
 const glass=new T.MeshPhysicalMaterial({color:'#c1e2d4',roughness:.08,metalness:.05,transparent:true,opacity:.37,side:T.DoubleSide,depthWrite:false});
 lathe([[.075,-.15],[.12,-.11],[.125,-.03],[.09,.025],[0,.045]],glass,[0,-.35,0],chime);mesh(new T.TorusGeometry(.075,.006,6,24),brass,[0,-.5,0],chime).rotation.x=Math.PI/2;
 line([[0,-.37,0],[0,-.61,0]],woodDark,.004,chime);ellipsoid(0,-.47,0,.025,.037,.025,brass,chime);
 const chimePaper=new T.Group();chimePaper.position.y=-.58;chime.add(chimePaper);box(.075,.3,.004,paper,[0,-.15,0],chimePaper);for(let i=0;i<3;i++)box(.014,.024,.006,material('#567c74'),[0,-.11-i*.038,.005],chimePaper);
 for(let i=0;i<5;i++){let a=i*1.256;ellipsoid(Math.cos(a)*.09,-.39,Math.sin(a)*.09,.024,.016,.009,material('#6b9c88'),chime,8);}
 // Stepped silhouettes produce leaf clusters rather than a smooth spherical canopy.
 const leafGeometry=(()=>{const border=[[-.12,0],[-.12,.12],[-.32,.12],[-.32,.3],[-.47,.3],[-.47,.54],[-.32,.54],[-.32,.72],[-.15,.72],[-.15,.9],[.08,.9],[.08,1.02],[.22,1.02],[.22,.76],[.38,.76],[.38,.55],[.49,.55],[.49,.32],[.29,.32],[.29,.15],[.12,.15],[.12,0]];let points=[],indices=[];points.push(0,.085,.45);border.forEach(([x,z])=>points.push(x,0,z));for(let i=1;i<=border.length;i++)indices.push(0,i,i===border.length?1:i+1);const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(points,3));g.setIndex(indices);g.computeVertexNormals();return g;})();
 const leafM=material('#ffffff',{side:T.DoubleSide,roughness:1,flatShading:true});const leafRecords=[],treeRoots=[],branchSnow=new T.Group();branchSnow.name='snow-on-branches';root.add(branchSnow);branchSnow.visible=false;
 // Optional cluster seeds isolate new growth from the garden layout RNG.
 function addLeaves(center,count,spread,scale=1,treeId=-1,clusterSeed=null){
  let leafSeed=clusterSeed;
  const leafRand=clusterSeed===null?rand:()=>{leafSeed=(leafSeed*1664525+1013904223)>>>0;return leafSeed/4294967296;};
  const leafRange=(a,b)=>a+(b-a)*leafRand();
  for(let i=0;i<count;i++){
   const a=leafRange(0,Math.PI*2),u=leafRange(-1,1),r=Math.pow(leafRand(),.5)*spread;
   leafRecords.push({p:[center.x+Math.cos(a)*r*Math.sqrt(1-u*u),center.y+u*r*.53,center.z+Math.sin(a)*r*Math.sqrt(1-u*u)],r:[leafRange(-1.1,1.1),leafRange(0,6.28),leafRange(-.8,.8)],s:leafRange(.22,.4)*scale,c:leafRand(),keep:leafRand(),treeId});
  }
 }

 function snowOnBranch(a,b,r0=.06,r1=.017,offset=null,pointMap=null){const curve=b?new T.LineCurve3(a,b):a,g=branchSnowSurface(curve,r0,r1);if(pointMap){const p=g.attributes.position;for(let i=0;i<p.count;i++){const v=pointMap(new T.Vector3().fromBufferAttribute(p,i));p.setXYZ(i,v.x,v.y,v.z);}g.computeVertexNormals();}if(offset)g.translate(offset.x,offset.y,offset.z);const cap=mesh(g,snowMat,[0,0,0],branchSnow);cap.material.side=T.DoubleSide;cap.name='branch-snow-ribbon';return cap;}

 function tree(x,z,height,spread){let treeId=treeRoots.length,group=new T.Group();group.position.set(x,.25,z);root.add(group);treeRoots.push(group);let top=[rr(-.2,.2),height,rr(-.2,.2)];beam([0,0,0],[.09,height*.55,.1],.17,.085,woodDark,group);beam([.09,height*.55,.1],top,.085,.025,woodDark,group);
 for(let i=0;i<10;i++){let a=i*2.399,by=height*.4+rand()*height*.36,ex=Math.cos(a)*spread*.78,ez=Math.sin(a)*spread*.78,ey=by+rr(.4,.9);beam([.07,by,.05],[ex,ey,ez],.06,.017,woodDark,group);
 snowOnBranch(v(x+.07,by+.25,z+.05),v(x+ex,ey+.25,z+ez));
 for(let k of [-1,1]){const end=[ex*1.21+Math.sin(a)*k*.23,ey+.3+rand()*.22,ez*1.15+Math.cos(a)*k*.23];beam([ex*.61,by+(ey-by)*.61,ez*.61],end,.027,.007,woodDark,group);snowOnBranch(v(x+ex*.61,by+(ey-by)*.61+.25,z+ez*.61),v(x+end[0],end[1]+.25,z+end[2]),.027,.007);beam(end,[end[0]+Math.cos(a+k)*.24,end[1]+.2,end[2]+Math.sin(a+k)*.24],.009,.0028,woodDark,group);}
 addLeaves(v(x+ex,ey+.3,z+ez),72,spread*.56,1,treeId);}
 addLeaves(v(x+top[0],height+.3,z),150,spread*.78,1,treeId);
 for(let a=0;a<6.2;a+=1.2)beam([0,.08,0],[Math.cos(a)*.5,-.01,Math.sin(a)*.5],.12,.025,woodDark,group);
 }
 const ancient=createAncientTree({root,material,mesh,ellipsoid,line,addLeaves,snowOnBranch,rr,v});treeRoots.push(ancient.group);tree(3.60,-2.6,3.65,.68);
 for(let i=0;i<52;i++){let x=rr(-4.75,4.75),z=rr(-4.75,4.75);if(!withinGarden(x,z,.35)||inWater(x,z)||reserved(x,z)||(x<2.55&&z<-.25))continue;addLeaves(v(x,rr(.35,.6),z),20,.37,.9,-1);}
 const foliage=new T.InstancedMesh(leafGeometry,leafM,leafRecords.length);foliage.name='canopy-leaves';foliage.castShadow=true;foliage.receiveShadow=true;root.add(foliage);
 // Blossom clusters are a separate five-petal mesh; bare winter trees really shed their leaves.
 const flowerShape=new T.Shape();for(let i=0;i<30;i++){const a=i/30*Math.PI*2,r=.62+.2*Math.cos(a*5);if(i===0)flowerShape.moveTo(Math.cos(a)*r,Math.sin(a)*r);else flowerShape.lineTo(Math.cos(a)*r,Math.sin(a)*r);}flowerShape.closePath();
 const blossomGeo=new T.ShapeGeometry(flowerShape);blossomGeo.rotateX(-Math.PI/2);const blossomMat=material('#ffffff',{side:T.DoubleSide,roughness:1});
 const bloomRecords=leafRecords.filter(a=>a.treeId===1?a.keep>.2:a.treeId===0&&a.keep>=.76);
 const blossoms=new T.InstancedMesh(blossomGeo,blossomMat,bloomRecords.length);blossoms.name='cherry-blossoms';root.add(blossoms);blossoms.castShadow=true;blossoms.receiveShadow=true;
 const blossomCenters=new T.InstancedMesh(new T.BoxGeometry(.075,.012,.075),material('#ebbdba'),bloomRecords.length);root.add(blossomCenters);
 bloomRecords.forEach((a,i)=>{dummy.position.set(...a.p);dummy.rotation.set(a.r[0]*.7,a.r[1],a.r[2]*.7);dummy.scale.setScalar(a.s*.72);dummy.updateMatrix();blossoms.setMatrixAt(i,dummy.matrix);blossoms.setColorAt(i,new T.Color(['#fce4eb','#f5bfce','#e99dbb','#f8d1df'][Math.floor(a.c*4)]));dummy.position.y+=.009;dummy.updateMatrix();blossomCenters.setMatrixAt(i,dummy.matrix);});
 const groundLeaves=new T.InstancedMesh(leafGeometry,material('#ffffff',{side:T.DoubleSide}),420);root.add(groundLeaves);const groundLeafRecords=[];
 for(let i=0;i<420;i++){let x,z;do{x=rr(-4.78,4.78);z=rr(-4.78,4.78);}while(!withinGarden(x,z,.13)||inWater(x,z)||(x<2.6&&z<-.3));groundLeafRecords.push({x,z,r:rr(0,6.28),s:rr(.05,.14),c:rand()});}
 function colorLeaves(season){const pal={summer:['#246f70','#329b79','#79bf65','#cbdf69'],spring:['#bf6e91','#df9cb5','#efbfd0','#fbe1e8'],autumn:['#a45c45','#d27544','#eba651','#f2cc76'],winter:['#285e66','#3d8180','#6e9990','#a6c3ae']}[season];
 leafRecords.forEach((a,i)=>{let scale=1.13;if(season==='spring')scale=a.treeId===1?(a.keep<.24?.6:0):(a.keep<.76?.97:0);if(season==='autumn')scale=a.keep<(a.treeId<0?.65:.48)?.94:0;if(season==='winter')scale=a.treeId<0&&a.keep<.27?.64:0;
 dummy.position.set(...a.p);dummy.rotation.set(...a.r);const size=a.s*scale;dummy.scale.set(size,size,size*1.2);dummy.updateMatrix();foliage.setMatrixAt(i,dummy.matrix);foliage.setColorAt(i,new T.Color((season==='spring'&&a.treeId<0?['#84a68d','#a8ba98','#c6bea8','#d9b9bb']:pal)[Math.min(3,Math.floor(a.c*4))]));});foliage.instanceMatrix.needsUpdate=true;foliage.instanceColor.needsUpdate=true;
 blossoms.visible=blossomCenters.visible=season==='spring';branchSnow.visible=season==='winter';groundLeaves.visible=season==='spring'||season==='autumn';
 groundLeafRecords.forEach((a,i)=>{const spring=season==='spring';dummy.position.set(a.x,.305,a.z);dummy.rotation.set(0,a.r,0);dummy.scale.setScalar(a.s*(spring?(i%7===0?.4:0):1.3));dummy.updateMatrix();groundLeaves.setMatrixAt(i,dummy.matrix);groundLeaves.setColorAt(i,new T.Color(spring?['#f5cede','#e8adc6','#fde3e9'][Math.floor(a.c*3)]:pal[Math.floor(a.c*4)]));});groundLeaves.instanceMatrix.needsUpdate=true;groundLeaves.instanceColor.needsUpdate=true;
 }
 colorLeaves('summer');
 // Ferns, grass tufts, hosta leaves and white flowers crowd the water's edge.
 const grassMat=material('#66835b',{side:T.DoubleSide});
 // Preserve the original eight height draws and every riverbank anchor.
 const grassHeights=Array.from({length:8},()=>.25+rand()*.2);
 const grassGeo=createCurvedGrassGeometry(grassHeights,{rootRadius:.16,reach:.088,bladeWidth:.044,angleStep:2.4});
 const grassBladeMat=material('#ffffff',{side:T.DoubleSide,vertexColors:true});
 const grass=new T.InstancedMesh(grassGeo,grassBladeMat,160);grass.name='riverbank-curved-grass';let gi=0;while(gi<160){let z=rr(-4.8,4.8),side=rand()>.5?1:-1,x=cx(z)+side*(width(z)+rr(.17,.55));if(!withinGarden(x,z,.20)||reserved(x,z))continue;dummy.position.set(x,.24,z);dummy.rotation.set(0,rr(0,6.28),0);dummy.scale.setScalar(rr(.5,1.15));dummy.updateMatrix();grass.setMatrixAt(gi++,dummy.matrix);}grass.castShadow=true;root.add(grass);
 const shoreFlowers=new T.Group();root.add(shoreFlowers);
 for(let [x,z] of [[-4,2.1],[3.25,-1.4],[4,-3.8]])for(let i=0;i<7;i++){let px=x+rr(-.4,.4),pz=z+rr(-.3,.3),h=rr(.35,.65);if(!withinGarden(px,pz,.17))continue;beam([px,.24,pz],[px+.06,.24+h,pz],.012,.007,grassMat,shoreFlowers);for(let k=0;k<5;k++){let a=k*1.256;ellipsoid(px+.06+Math.cos(a)*.06,.24+h,pz+Math.sin(a)*.06,.06,.027,.04,paper,shoreFlowers,8);}ellipsoid(px+.06,.26+h,pz,.025,.025,.025,brass,shoreFlowers);}
 // Pots by the post and a hydrangea basin.
 const verandaPlants=[[-3.5,-.65]].map(([x,z])=>createVerandaPlant({root:house,material,mesh,lathe,line},x,z,x>0?'right-veranda-planter':'left-veranda-planter'));
 const gardenLife=createGardenLife({root,material,mesh,box,ellipsoid,line,beam,lathe,wood,woodDark,woodEdge,stone,moss,snowMat,leafGeometry,rr,cx,width,withinGarden});
 const fauna=createSeasonalFauna({root,material,mesh,box,ellipsoid,line,beam,rr,cx,width,ripple,birdPerch:ancient.birdPerch,birdPerchYaw:ancient.birdPerchYaw,birdGripSurfaces:ancient.birdGripSurfaces,treeTrunk:ancient.trunk});
 const sleeper=createSummerSleeper({root,material,mesh,box,ellipsoid,line,beam,rr});
 // Seasonal objects on the engawa.
 const summerProps=new T.Group();summerProps.name='summer-refreshments';root.add(summerProps);let tray=mesh(new T.CylinderGeometry(.28,.25,.024,36),woodDark,[.95,.957,-1.24],summerProps);
 function watermelon(x,z,angle){const g=new T.Group();g.name='watermelon-slice';g.position.set(x,1.017259074,z);g.scale.setScalar(.56);g.rotation.y=angle;summerProps.add(g);const shp=new T.Shape();shp.moveTo(-.23,0);shp.lineTo(0,.32);shp.lineTo(.23,0);shp.quadraticCurveTo(0,-.11,-.23,0);let geo=new T.ExtrudeGeometry(shp,{depth:.13,bevelEnabled:true,bevelSegments:2,bevelSize:.008,bevelThickness:.008,steps:1});mesh(geo,material('#ce6154'),[0,0,0],g);line([[-.23,0,.065],[0,-.055,.065],[.23,0,.065]],material('#50704b'),.036,g);line([[-.22,.018,.065],[0,-.025,.065],[.22,.018,.065]],material('#d9ce94'),.016,g);for(let i=0;i<5;i++){let a=rr(-.12,.12),b=rr(.035,.2);ellipsoid(a,b,.144,.009,.014,.004,woodDark,g,8);}}watermelon(.85,-1.18,-.1);watermelon(1.04,-1.31,.4);
 const coldCup=cup(1.38,.945,-1.23,summerProps);coldCup.name='summer-cold-tea';let fan=new T.Group();fan.name='summer-hand-fan';fan.position.set(-.55,.955,-.39);fan.scale.setScalar(.6);fan.rotation.set(-Math.PI/2,0,Math.PI/2);summerProps.add(fan);ellipsoid(0,0,0,.18,.22,.015,paper,fan);beam([0,-.3,0],[0,-.05,0],.015,.015,woodEdge,fan);
 const seasonalTea=new T.Group();seasonalTea.name='veranda-tea-tray';root.add(seasonalTea);const verandaTeaBase=box(1.02,.035,.57,woodDark,[-2.15,.9625,-.73],seasonalTea,.025);verandaTeaBase.name='veranda-tea-wooden-tray';const verandaTeapot=teapot(-1.99,.981,-.84,seasonalTea);verandaTeapot.scale.setScalar(.86);cup(-1.87,.981,-.55,seasonalTea);
 const brazier=new T.Group();brazier.position.set(.82,.948,-.95);root.add(brazier);lathe([[.13,0],[.24,.05],[.27,.22],[.22,.27],[.19,.25]],material('#6b6355'),[0,0,0],brazier);const emberMat=material('#8a3c21',{emissive:'#f46525',emissiveIntensity:.8});for(let i=0;i<8;i++)ellipsoid(rr(-.14,.14),.21,rr(-.14,.14),.055,.033,.035,emberMat,brazier,8);const kettle=lathe([[.06,0],[.16,.03],[.19,.15],[.12,.25]],material('#343f3f',{metalness:.5,roughness:.6}),[0,.28,0],brazier);line([[-.14,.42,0],[-.14,.67,0],[.14,.67,0],[.14,.42,0]],woodDark,.021,brazier);const kettleLid=ellipsoid(0,.54,0,.11,.025,.11,woodDark,brazier);const emberLight=new T.PointLight('#f6a45e',1.6,2.4,2);emberLight.position.set(0,.35,0);brazier.add(emberLight);brazier.visible=false;
 const dayNightLife=createDayNightLife({root,material,mesh,box,ellipsoid,line,lathe,wood,woodDark,woodEdge,seasonalLife,seasonalTea,verandaTeaBase,summerProps,sleeper,brazier,openInteriorScreen});
 // Garden lantern and two warm interior lanterns.
 function lantern(x,y,z,scale=1){const g=new T.Group();g.position.set(x,y,z);g.scale.setScalar(scale);root.add(g);box(.5,.08,.5,stone,[0,0,0],g,.03);box(.18,.5,.18,stone,[0,.25,0],g);box(.44,.09,.44,stone,[0,.52,0],g);const lm=material('#eadca3',{emissive:'#ffce84',emissiveIntensity:0});box(.23,.3,.23,lm,[0,.71,0],g);lanterns.push(lm);for(let dx of [-.18,.18])for(let dz of [-.18,.18])box(.05,.35,.05,stone,[dx,.72,dz],g);let cap=mesh(new T.ConeGeometry(.4,.18,4),stone,[0,.96,0],g);cap.rotation.y=Math.PI/4;ellipsoid(0,1.1,0,.07,.1,.07,stone,g);let sn=mesh(new T.ConeGeometry(.4,.16,4),snowMat,[0,1.0,0],g);sn.rotation.y=Math.PI/4;sn.visible=false;snowCaps.push(sn);return g;}
 const gardenLantern=lantern(3.50,.30,3.03,.68);gardenLantern.name='garden-stone-lantern';glow.position.set(0,.71,0);gardenLantern.add(glow);glow.distance=3.0;glow.name='garden-lantern-light';
 // Two small warm lights physically share the centre of their visible shades.
 const smallLamps=[];
 function smallLantern(name,x,y,z,hanging=false){
  const g=new T.Group();g.name=name;g.position.set(x,y,z);root.add(g);
  const shade=material('#e0cfad',{emissive:'#ffd193',emissiveIntensity:0});lanterns.push(shade);
  if(hanging)line([[0,.26,0],[0,.62,0]],woodDark,.008,g);
  lathe([[.075,0],[.115,.035],[.13,.14],[.115,.245],[.075,.275]],shade,[0,0,0],g);
  for(let y=.02;y<.27;y+=.045)mesh(new T.TorusGeometry(.082+Math.sin(y/.275*Math.PI)*.044,.005,4,20),woodDark,[0,y,0],g).rotation.x=Math.PI/2;
  for(let y of [0,.28])mesh(new T.CylinderGeometry(.081,.081,.023,16),woodDark,[0,y,0],g);
  if(!hanging)box(.29,.035,.26,woodDark,[0,-.018,0],g,.02);
  const light=new T.PointLight('#ffd49a',0,hanging?2.4:2.1,2);light.position.y=.14;light.name=name+'-light';g.add(light);smallLamps.push(light);return g;
 }
 const eaveLantern=smallLantern('small-eave-lantern',2.01,2.82,-.60,true);
 const treeLantern=smallLantern('small-tree-root-lantern',-2.70,.3355,-.10);
 const lampMat=material('#f1dfb4',{emissive:'#ffc17b',emissiveIntensity:0});lanterns.push(lampMat);box(.34,.6,.34,lampMat,[1.5,1.31,-3.2],house,.04);for(let y=1.05;y<1.63;y+=.08)box(.36,.012,.36,woodDark,[1.5,y,-3.2],house);box(.43,.05,.43,woodDark,[1.5,1,-3.2],house);
 // Seven patterned koi with articulated tails. Paths use the same creek equation.
 const fish=[];for(let i=0;i<7;i++){let g=new T.Group();g.name='submerged-koi';g.userData.inkOutline=false;root.add(g);let white=material(i%3===0?'#e1c386':'#e6dec6',{roughness:.5}),red=material(i%3===0?'#b88738':'#c26649');ellipsoid(0,0,0,.073,.055,.23,white,g);ellipsoid(0,.045,-.04,.052,.016,.077,red,g);ellipsoid(.022,.04,.095,.033,.02,.046,red,g);const tail=new T.Group();tail.position.z=-.22;g.add(tail);let tg=new T.BufferGeometry();tg.setAttribute('position',new T.Float32BufferAttribute([0,0,0,-.085,.013,-.15,0,0,-.11,0,0,0,0,0,-.11,.085,.013,-.15],3));tg.computeVertexNormals();mesh(tg,material('#b39973',{side:T.DoubleSide}),[0,0,0],tail);for(let side of [-1,1]){let f=ellipsoid(side*.08,-.003,.035,.06,.01,.07,white,g,8);f.rotation.y=side*.4;ellipsoid(side*.037,.032,.18,.012,.011,.01,woodDark,g,8);}fish.push({g,tail,phase:i*.85,speed:rr(.07,.11),lane:rr(-.8,.8)});}
 // Short-lived impact rings come from rain, water taps, and the drinking bird.
 const ripples=[];function ripple(x,z,strength=1){if(!inWater(x,z)||creekIce?.contains(x,z))return;let m=new T.MeshBasicMaterial({color:'#bcd6de',transparent:true,opacity:.3,depthWrite:false,side:T.DoubleSide});let o=mesh(new T.RingGeometry(.967,1,40),m,[x,.081,z]);o.name='water-impact-ripple';o.rotation.x=-Math.PI/2;o.renderOrder=4;o.castShadow=false;o.scale.setScalar(.03);ripples.push({o,age:0,strength});}
 // Petals / maple leaves drifting in air and on the stream.
 const drifting=[];const petalMat=material('#e7babc',{side:T.DoubleSide});for(let i=0;i<45;i++){let o=mesh(leafGeometry,petalMat,[rr(-4,4),rr(.1,5),rr(-4,4)]);o.scale.set(.09,.09,.13);o.castShadow=false;drifting.push({o,seed:rand()*10,speed:rr(.08,.2)});}
 const gustMat=material('#98b663',{side:T.DoubleSide});const gustLeaves=[];
 for(let i=0;i<48;i++){const o=mesh(leafGeometry,gustMat,[0,0,0]);o.scale.set(.1,.1,.15);o.castShadow=false;gustLeaves.push({o,seed:rr(0,22),x:rr(-3.8,-1.8),y:.25+treeHeight(rr(4.85,6.25)-.25),z:rr(.45,1.1)});}
 const canopyFall=createCanopyFall({slots:gustLeaves,leafRecords,foliage,inWater,surfaces:[
  {kind:'roof',object:roof},{kind:'deck',object:house},
  ...terrain.banks.map(object=>({kind:'ground',object})),
  {kind:'water',object:water},{kind:'bridge',object:gardenLife.bridge},
  ...root.children.filter(o=>o.name==='shore-rock').map(object=>({kind:'rock',object}))
 ]});
 drifting.forEach(a=>a.o.visible=false);
 const snowAccumulation=createSnowAccumulation({root,roof,legacyRoofSnow:snowRoof,terrain,bridge:gardenLife.bridge,snowMat,house,water,ripple});
 creekIce=createWinterCreekIce({root,cx,width,streamExtent,inWater,bridge:gardenLife.bridge,birdRock:root.getObjectByName('bird-drinking-rock'),bird:root.getObjectByName('winter-long-tailed-tit')});

 // Keep the original rain anchors and RNG consumption; draw camera-facing ribbons.
 const rainPos=new Float32Array(450*6);for(let i=0;i<450;i++){const x=rr(-5.2,5.2),y=rr(0,13.5),z=rr(-5.2,5.2);rainPos.set([x,y,z,x-.035,y+.25,z],i*6);}
 const rainEffect=createRainStreaks({root,positions:rainPos}),rain=rainEffect.rain;
 const snowGeo=new T.BufferGeometry(),snowPos=new Float32Array(450*3);for(let i=0;i<snowPos.length;i+=3)snowPos.set([rr(-5.3,5.3),rr(0,13.5),rr(-5.3,5.3)],i);snowGeo.setAttribute('position',new T.BufferAttribute(snowPos,3));
 function glowTexture(){const c=document.createElement('canvas');c.width=c.height=64;let ctx=c.getContext('2d'),gr=ctx.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,'#ffffffff');gr.addColorStop(.15,'#ffffffcc');gr.addColorStop(.5,'#ffffff38');gr.addColorStop(1,'#ffffff00');ctx.fillStyle=gr;ctx.fillRect(0,0,64,64);return new T.CanvasTexture(c);}
 const glowTex=glowTexture();
 function particleTexture(kind){const c=document.createElement('canvas');c.width=c.height=64;const ctx=c.getContext('2d'),g=ctx.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'#ffffffff');g.addColorStop(kind==='snow'?.48:.23,'#ffffffff');g.addColorStop(kind==='snow'?.72:.48,kind==='snow'?'#ffffffb8':'#ffffff68');g.addColorStop(1,'#ffffff00');ctx.fillStyle=g;ctx.fillRect(0,0,64,64);const tx=new T.CanvasTexture(c);resources.add(tx);return tx;}
 const snowScales=new Float32Array(450);for(let i=0;i<450;i++)snowScales[i]=.65+(i*37%101)/101*.75;snowGeo.setAttribute('flakeScale',new T.BufferAttribute(snowScales,1));
 const snowMaterial=new T.PointsMaterial({color:'#ffffff',size:5.4/renderDpr,sizeAttenuation:false,map:particleTexture('snow'),transparent:true,opacity:.94,depthWrite:false});
 snowMaterial.onBeforeCompile=shader=>{shader.vertexShader='attribute float flakeScale;\n'+shader.vertexShader.replace('gl_PointSize = size;','gl_PointSize = max(1., size * flakeScale);');};snowMaterial.customProgramCacheKey=()=> 'garden-snow-screen-size-v16';
 const snow=new T.Points(snowGeo,snowMaterial);snow.frustumCulled=false;snow.userData.screenPixelSize=[3.5,7.6];snow.name='weather-snow';root.add(snow);snow.visible=false;
 const fireflyGeo=new T.BufferGeometry(),fireflyPos=new Float32Array(28*3),fireflyColors=new Float32Array(28*3);const fireflies=new T.Points(fireflyGeo,new T.PointsMaterial({color:'#e5e49b',size:7/renderDpr,sizeAttenuation:false,map:particleTexture('firefly'),vertexColors:true,transparent:true,opacity:0,blending:T.AdditiveBlending,depthWrite:false}));fireflyGeo.setAttribute('position',new T.BufferAttribute(fireflyPos,3));fireflyGeo.setAttribute('color',new T.BufferAttribute(fireflyColors,3));fireflies.name='summer-night-fireflies';fireflies.frustumCulled=false;fireflies.userData.screenPixelSize=7;root.add(fireflies);
 const butterflies=createNightButterflies({root,material});
 const steamOrigin=new T.Vector3();const steamGeo=new T.BufferGeometry(),steamPos=new Float32Array(28*3);steamGeo.setAttribute('position',new T.BufferAttribute(steamPos,3));const steam=new T.Points(steamGeo,new T.PointsMaterial({color:'#efe8dc',size:.15,map:glowTex,transparent:true,opacity:.18,depthWrite:false}));root.add(steam);
 // Subtle star field is visible only during night, made of points.
 const starPos=new Float32Array(90*3);for(let i=0;i<90;i++)starPos.set([rr(-20,20),rr(8,20),rr(-15,10)],i*3);let starG=new T.BufferGeometry();starG.setAttribute('position',new T.BufferAttribute(starPos,3));const stars=new T.Points(starG,new T.PointsMaterial({size:.026,color:'#c6d9e2',transparent:true,opacity:0}));scene.add(stars);
 const pointPixelSizes=new Map();scene.traverse(o=>{if(o.isPoints)pointPixelSizes.set(o.material,o.material.size);});
 function applyRenderStyle(style){
  const pixelated=style==='pixel';
  pixelRenderer.setStyle(style);
  pointPixelSizes.forEach((size,m)=>{m.size=pixelated?(m.sizeAttenuation===false?Math.max(1,size*renderDpr/PIXEL_SIZE_CSS)/renderDpr:size/PIXEL_SIZE_CSS):size*renderDpr;});
  resources.forEach(r=>{if(r.isTexture&&r.userData.gardenPixelTexture){r.minFilter=r.magFilter=pixelated?T.NearestFilter:T.LinearFilter;r.needsUpdate=true;}});
  renderer.domElement.style.imageRendering=pixelated?'pixelated':'auto';
 }
 applyRenderStyle(state.renderStyle);
 let time=0,nightMix=0,last=performance.now(),frame=0,disposed=false;let lastBackground='';const themeColors=Object.fromEntries(Object.entries(gardenTheme).map(([key,tone])=>[key,{day:new T.Color(tone.day),night:new T.Color(tone.night)}]));const targetBg=new T.Color(gardenTheme.summer.day),dayBg=new T.Color(gardenTheme.summer.day),nightBg=new T.Color(gardenTheme.summer.night);let cloudMix=0,summerClosedMix=0,precipitationMix=0;
 let currentSeason='summer';
 function applySeason(){const s=state.season,winter=s==='winter';
 colorLeaves(s);roofLeaves.setSeason(s);ancient.setSeason(s);seasonalLife.setSeason(s);gardenLife.setSeason(s);fauna.setSeason(s);sleeper.setSeason(s);rockMoss.forEach(o=>o.visible=!winter);
 snowCaps.forEach(o=>o.visible=winter);dayNightLife.setState(s,state.night);
 petalMat.color.set(s==='autumn'?'#c9833e':'#efbdc3');gustMat.color.set(s==='autumn'?'#c58e47':s==='spring'?'#e9afc6':'#98b663');
 groundMat.color.set(winter?'#e8eee6':s==='autumn'?'#d2b987':s==='spring'?'#fff4f0':'#d5e7ac');groundMat.map=winter?null:s==='spring'?springGroundTex:groundTex;groundMat.needsUpdate=true;grassMat.color.set(winter?'#a6bdba':s==='autumn'?'#aeae64':'#73a964');shoreFlowers.visible=s==='spring'||s==='summer';grass.visible=!winter;paintCurvedGrass(grassGeo,s);currentSeason=s;renderer.shadowMap.needsUpdate=true;
 }
 applySeason();
 const framing=createPortraitFraming(camera,controls,collectGardenFramePoints(root));
 function resize(){sceneTransition.cancel();let w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);renderer.setSize(w,h);pixelRenderer.resize(w,h);rainEffect.resize(w,h);const frame=host.parentElement;const visibleH=Math.max(1,frame?.clientHeight||h);framing.resize(w,visibleH);const top=frame?host.getBoundingClientRect().top-frame.getBoundingClientRect().top:0;camera.setViewOffset(w,visibleH,0,top,w,h);}

 const observer=typeof ResizeObserver!=='undefined'?new ResizeObserver(resize):null;if(observer)observer.observe(host);else window.addEventListener('resize',resize);resize();
 let startPointer={x:0,y:0};const ray=new T.Raycaster();function down(e){sceneTransition.cancel();startPointer={x:e.clientX,y:e.clientY};}function up(e){if(Math.hypot(e.clientX-startPointer.x,e.clientY-startPointer.y)>5)return;let r=renderer.domElement.getBoundingClientRect();ray.setFromCamera(new T.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),camera);const hit=ray.intersectObject(water)[0];if(hit&&!creekIce.contains(hit.point.x,hit.point.z)){ripple(hit.point.x,hit.point.z,1.8);fish.forEach(f=>{if(f.g.position.distanceTo(hit.point)<1.5)f.phase+=.35;});}}
 renderer.domElement.addEventListener('pointerdown',down);renderer.domElement.addEventListener('pointerup',up);renderer.domElement.addEventListener('wheel',sceneTransition.cancel,{passive:true});
 function animate(now){if(disposed)return;frame=requestAnimationFrame(animate);
 const elapsed=Math.max(0,(now-last)/1000),dt=Math.min(elapsed,.045);last=now;
 const d=state.paused?0:dt;time+=d;controls.update();
 // Advance by active viewing time, independent of rendering speed; returning to
 // a background tab never fast-forwards the seasons in one frame.
 const clockDt=state.paused||document.hidden||elapsed>2.001?0:elapsed;
 const seeking=daylightTransition.active;
 if(seeking){const hour=daylightTransition.update(document.hidden?0:dt);if(hour!==null)gardenClock.setHour(hour);}
 clockSnapshot=gardenClock.update(seeking?0:clockDt);
 const forecast=weatherCycle.update(clockSnapshot.running&&!seeking?clockDt:0,clockSnapshot.season,clockSnapshot.night);
 if(forecast!==null&&forecast!==state.weather){state.weather=forecast;lastClockReport=-Infinity;}
 if(clockSnapshot.season!==state.season||clockSnapshot.night!==state.night){
  if(clockSnapshot.season!==state.season)sceneTransition.capture(.8);
  state.season=clockSnapshot.season;state.night=clockSnapshot.night;
  state.weather=normalizeGardenWeather(state.season,state.weather);lastClockReport=-Infinity;
 }
 if(state.season!==currentSeason)applySeason();
 if(now-lastClockReport>=500){reportTime();lastClockReport=now;}
 root.userData.gardenTime=clockSnapshot;
const wind= gardenWind(time),storm=springStorm(time,state.season,state.night,state.weather);root.userData.atmosphere={time,gust:wind.gust,storm:storm.flash,weather:state.weather};nightMix=clockSnapshot.nightMix;creekIce.update(state.season,nightMix);pixelRenderer.updateNight(nightMix);waterUniform.time.value=time;waterUniform.night.value=nightMix;waterUniform.rain.value=state.season==='winter'?0:precipitationMix;waterCurrent.update(time,nightMix,waterUniform.rain.value);lightDirection.fromArray(clockSnapshot.sunDirection);sun.position.copy(lightDirection).multiplyScalar(18);
 moonDirection.fromArray(clockSnapshot.moonDirection).multiplyScalar(18);moon.position.copy(moonDirection);waterUniform.moonPosition.value.copy(moonDirection);
 if(Math.abs(nightMix-clockSnapshot.nightMix)>.001)renderer.shadowMap.needsUpdate=true;waterUniform.cloud.value=cloudMix;camera.getWorldDirection(waterUniform.eyeDirection.value).negate();
 if(seeking||d&&Math.floor(time*15)!==Math.floor((time-d)*15))renderer.shadowMap.needsUpdate=true;
 const closedSummer=state.season==='summer'&&state.night;summerClosedMix=T.MathUtils.damp(summerClosedMix,closedSummer?1:0,1.5,dt);const cloudy=state.weather!=='clear';const palette=themeColors[state.season],blend=1-Math.exp(-7*dt);dayBg.lerp(palette.day,blend);nightBg.lerp(palette.night,blend);cloudMix=T.MathUtils.damp(cloudMix,cloudy?1:0,.65,dt);targetBg.copy(dayBg).lerp(nightBg,nightMix);const twilight=1-T.MathUtils.smoothstep(Math.abs(clockSnapshot.sunAltitude-.035),0,.34);targetBg.lerp(clockSnapshot.hour<12?dawnColor:twilightColor,twilight*.62*(1-cloudMix*.6));if(cloudMix>.001)targetBg.lerp(overcastColor,cloudMix*.2*(1-nightMix));const background=targetBg.getStyle();if(background!==lastBackground){host.parentElement?.style.setProperty('--scene-background',background);document.documentElement.style.setProperty('--scene-background',background);document.body.style.backgroundColor=background;let themeMeta=document.querySelector('meta[name="theme-color"]');if(!themeMeta){themeMeta=document.createElement('meta');themeMeta.setAttribute('name','theme-color');document.head.appendChild(themeMeta);}themeMeta.setAttribute('content',background);lastBackground=background;}shadowMat.opacity=T.MathUtils.lerp(.14,0,T.MathUtils.smoothstep(nightMix,.18,.9));hemi.intensity=T.MathUtils.lerp(T.MathUtils.lerp(2.25,1.6,cloudMix),.5,nightMix);hemi.color.copy(dayHemi).lerp(nightHemi,nightMix);const elevation=Math.max(0,lightDirection.y),moonElevation=Math.max(0,clockSnapshot.moonDirection[1]);sun.intensity=T.MathUtils.lerp(4.1,1.65,cloudMix)*Math.pow(elevation,.42)*T.MathUtils.smoothstep(elevation,0,.16);sun.color.copy(lowLight).lerp(noonLight,T.MathUtils.smoothstep(elevation,0,.65));moon.intensity=.4*Math.pow(moonElevation,.42)*T.MathUtils.smoothstep(moonElevation,0,.18)*(1-cloudMix*.45);moon.color.copy(moonLight);fill.intensity=.5+nightMix*.25;warm.intensity=nightMix*5.5*(1-summerClosedMix);glow.intensity=nightMix*.72;smallLamps.forEach((l,i)=>l.intensity=nightMix*(i?.48:.65));hemi.intensity+=storm.flash;sun.intensity+=storm.flash*.7;lanterns.forEach(m=>m.emissiveIntensity=nightMix*.9);lampMat.emissiveIntensity=nightMix*.9*(1-summerClosedMix);hemi.intensity*=1-summerClosedMix*.16;fill.intensity*=1-summerClosedMix*.32;moon.intensity*=1-summerClosedMix*.2;
 renderer.toneMappingExposure=T.MathUtils.lerp(1.12,.92,nightMix);stars.material.opacity=nightMix*T.MathUtils.lerp(.7,.2,cloudMix);celestial.update({...clockSnapshot,nightMix,cloudy:cloudMix},{width:host.clientWidth,height:host.clientHeight});
 seasonalLife.update(time,nightMix);if(dayNightLife.setState(state.season,state.night))renderer.shadowMap.needsUpdate=true;emberMat.emissiveIntensity=.72+Math.sin(time*3.7)*.16+Math.sin(time*7.1)*.08;kettleLid.position.y=.54+Math.max(0,Math.sin(time*5))*.003;emberLight.intensity=1.3+Math.sin(time*3.7)*.2;
 chime.rotation.z=Math.sin(time*1.4)*(.012+wind.gust*.075);chime.rotation.x=Math.sin(time*1.7)*(.008+wind.gust*.045);chimePaper.rotation.x=Math.sin(time*2.1)*(.04+wind.gust*.25);
 // Canopy sway is a small global movement; twigs remain anchored.
 foliage.rotation.z=state.season==='winter'?0:wind.z;foliage.rotation.x=state.season==='winter'?0:wind.x;blossoms.rotation.copy(foliage.rotation);blossomCenters.rotation.copy(foliage.rotation);if(grass.visible)bendCurvedGrass(grassGeo,time,wind.gust);
 gardenLife.update(time);fauna.update(time,state.night);sleeper.update(time);butterflies.update(time,state.season,state.night);
 fish.forEach((f,i)=>{let s=state.season==='winter'?.3:1;let p=time*f.speed*s+f.phase,z=Math.sin(p)*3.8,x=cx(z)+Math.cos(p*.87+i)*width(z)*.46;f.g.position.set(x,-.015+Math.sin(p*3)*.012,z);let zn=Math.sin(p+.01)*3.8,xn=cx(zn)+Math.cos((p+.01)*.87+i)*width(zn)*.46;f.g.rotation.y=Math.atan2(xn-x,zn-z);f.tail.rotation.y=Math.sin(time*4*s+i)*.4;});

 for(let i=ripples.length-1;i>=0;i--){const r=ripples[i];r.age+=d;let scale=.04+r.age*.38*r.strength;r.o.scale.setScalar(scale);r.o.material.opacity=Math.max(0,.36-r.age*.22);if(r.age>1.65){root.remove(r.o);resources.delete(r.o.geometry);r.o.geometry.dispose();r.o.material.dispose();ripples.splice(i,1);}}
 canopyFall.update(time,state.season);snowAccumulation.update(time,state.season,state.weather);
 precipitationMix=T.MathUtils.damp(precipitationMix,cloudy?1:0,.85,dt);
 snow.visible=state.season==='winter'&&precipitationMix>.01;snow.material.opacity=T.MathUtils.lerp(.94,.84,nightMix)*precipitationMix;snow.material.color.set('#f5f8f7').lerp(new T.Color('#d3e1ed'),nightMix);
 rain.visible=state.season!=='winter'&&precipitationMix>.01;
 if(rain.visible){
  rainEffect.update(nightMix,pixelRenderer.getScenePixelSize(),storm.flash,precipitationMix);
  if(d>0){
   for(let i=0;i<450;i++){
    const n=i*6,length=.26+(i%5)*.03;rainPos[n+1]-=d*7;
    const roofTop=snowAccumulation.getRoofTop(rainPos[n],rainPos[n+2]),inStream=inWater(rainPos[n],rainPos[n+2]);
    if(rainPos[n+1]<(roofTop??(inStream?.09:.315))){
     if(precipitationMix>.15&&roofTop==null&&inStream&&i%15===0)ripple(rainPos[n],rainPos[n+2],.28);
     rainPos[n+1]=13.5;
    }
    rainPos[n+3]=rainPos[n]-.020-wind.gust*.025;rainPos[n+4]=rainPos[n+1]+length;
   }
   rainEffect.commitPositions();
  }
 }
 if(snow.visible){for(let i=0;i<450;i++){let n=i*3;snowPos[n+1]-=d*.46;snowPos[n]+=(Math.sin(time*.6+i)*.10+wind.gust*.18)*d;snowPos[n+2]+=Math.cos(time*.45+i)*d*.045;if(snowPos[n]>5.4)snowPos[n]=-5.3;const roofTop=snowAccumulation.getRoofTop(snowPos[n],snowPos[n+2]);if(snowPos[n+1]<(roofTop??(inWater(snowPos[n],snowPos[n+2])?.09:.315)))snowPos[n+1]=13.5;}snowGeo.attributes.position.needsUpdate=true;}
 verandaTeapot.getWorldPosition(steamOrigin);
 for(let i=0;i<28;i++){const zone=i%3,phase=time*.19+i*2.4;let z=(zone===0?1.25:zone===1?1.3:.85)+Math.sin(phase*.83)*.8,x=(zone===0?-3.15:zone===1?.65:3.85)+Math.cos(phase)*.44;fireflyPos.set([x,.46+Math.sin(time*.4+i)*.15+(i%4)*.17,z],i*3);const pulse=.26+.74*Math.pow(Math.max(0,Math.sin(time*(.7+(i%5)*.035)+i*1.72)),2);fireflyColors.set([pulse,pulse,pulse*.8],i*3);let f=(time*.27+i/28)%1;steamPos.set([(state.season==='winter'?brazier.position.x:steamOrigin.x)+Math.sin(f*9+i)*.06,(state.season==='winter'?brazier.position.y+.57:steamOrigin.y+.23)+f*.7,(state.season==='winter'?brazier.position.z:steamOrigin.z)+Math.cos(f*8+i)*.06],i*3);}
 fireflyGeo.attributes.position.needsUpdate=true;fireflyGeo.attributes.color.needsUpdate=true;fireflies.visible=state.season==='summer'&&state.night;fireflies.material.opacity=nightMix*(.78+Math.sin(time*.7)*.08);steamGeo.attributes.position.needsUpdate=true;steam.visible=state.season==='winter'||(!state.night&&(state.season==='spring'||state.season==='autumn'));
 if(renderer.shadowMap.needsUpdate)sun.shadow.needsUpdate=sun.intensity>.001;
 pixelRenderer.render();sceneTransition.update(dt);
 }
 frame=requestAnimationFrame(animate);
 return {getTime:()=>gardenClock.getSnapshot(),setState(next){
  const nextSeason=GARDEN_SEASONS.includes(next.season)?next.season:state.season;
  if(next.season!==undefined){daylightTransition.cancel();gardenClock.setSeason(nextSeason);}
  if(Number.isFinite(next.hour)){
   if(next.timeTransition){sceneTransition.cancel();daylightTransition.start(clockSnapshot.hour,next.hour);}
   else{daylightTransition.cancel();gardenClock.setHour(next.hour);}
  }
  else if(typeof next.night==='boolean'){sceneTransition.cancel();daylightTransition.start(clockSnapshot.hour,next.night?22:12);}
  if(typeof next.clockRunning==='boolean')gardenClock.setRunning(next.clockRunning);
  clockSnapshot=gardenClock.getSnapshot();
  const nextNight=clockSnapshot.night,nextWeather=normalizeGardenWeather(nextSeason,next.weather??state.weather);
  const requestedStyle=next.renderStyle??(typeof next.pixelated==='boolean'?(next.pixelated?'pixel':'clear'):state.renderStyle);
  const nextStyle=isGardenRenderStyle(requestedStyle)?requestedStyle:state.renderStyle,styleChanged=nextStyle!==state.renderStyle;
  if(!next.timeTransition&&(nextSeason!==state.season||nextNight!==state.night||styleChanged||Number.isFinite(next.hour)))sceneTransition.capture(Number.isFinite(next.hour)?1.2:undefined);
  if(next.manualWeather||next.weather!==undefined&&next.weather!==state.weather)weatherCycle.hold();
  Object.assign(state,next,{season:nextSeason,night:nextNight,weather:nextWeather,renderStyle:nextStyle,pixelated:nextStyle==='pixel'});reportTime();renderer.shadowMap.needsUpdate=true;
  if(styleChanged)applyRenderStyle(nextStyle);
 },reset(){sceneTransition.cancel();framing.reset();},capture(locale:'zh'|'en'='zh'){sceneTransition.cancel();pixelRenderer.render();const saved=document.createElement('canvas');saved.width=renderer.domElement.width;saved.height=renderer.domElement.height;const ctx=saved.getContext('2d');if(!ctx)return;ctx.fillStyle=targetBg.getStyle();ctx.fillRect(0,0,saved.width,saved.height);ctx.drawImage(renderer.domElement,0,0);const data=saved.toDataURL('image/png');if(__MINITOOL__){const bridge=(window as any).xhs?.miniTool;if(bridge?.writeTempFile&&bridge?.saveImageToPhotosAlbum)bridge.writeTempFile({data}).then(({filePath})=>bridge.saveImageToPhotosAlbum({filePath})).catch(()=>{});}else{const a=document.createElement('a'),chineseSeason={spring:'春',summer:'夏',autumn:'秋',winter:'冬'}[state.season]??state.season;a.download=locale==='en'?`streamside-seasons-${state.season}-${state.night?'night':'day'}.png`:`溪间四时-${chineseSeason}-${state.night?'夜':'昼'}.png`;a.href=data;a.click();}},dispose(){disposed=true;cancelAnimationFrame(frame);observer?.disconnect();if(!observer)window.removeEventListener('resize',resize);controls.dispose();renderer.domElement.removeEventListener('pointerdown',down);renderer.domElement.removeEventListener('pointerup',up);renderer.domElement.removeEventListener('wheel',sceneTransition.cancel);sceneTransition.dispose();celestial.dispose();scene.traverse(o=>{o.geometry?.dispose();if(o.material){(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose());}});resources.forEach(r=>r.dispose?.());sun.shadow.dispose();pixelRenderer.dispose();renderer.dispose();renderer.domElement.remove();}};
}
