// @ts-nocheck
import * as T from 'three';
import {createGardenPlanting} from './garden-planting';

export function createGardenLife({root,material,mesh,box,ellipsoid,line,beam,lathe,wood,woodDark,woodEdge,stone,moss,snowMat,leafGeometry,rr,cx,width,withinGarden}){
 const garden=new T.Group();garden.name='garden-landscape';root.add(garden);
 const iron=material('#52696b',{metalness:.65,roughness:.5}),darkIron=material('#35494c',{metalness:.45,roughness:.72}),rope=material('#baac7f'),terra=material('#b77957'),cream=material('#dccaa3'),leafMat=material('#64925e',{side:T.DoubleSide}),soil=material('#7c7260');
 const seasonalSnow=new T.Group();garden.add(seasonalSnow);seasonalSnow.visible=false;
 // Uneven old planks span the creek; the remaining pilings stop below the deck.
 const bridgeZ=3.22,center=cx(bridgeZ),half=width(bridgeZ)+.42,bridge=new T.Group();bridge.name='wooden-footbridge';bridge.position.set(center,0,bridgeZ);garden.add(bridge);
 const deckY=x=>.43+.105*(1-Math.pow(Math.min(Math.abs(x)/half,1),2)),boardCount=21,boardW=half*2/boardCount;
 const grain=material('#a48d69'),split=material('#60584b'),oldWood=['#d5c39c','#b3ad96','#cab591','#dfcba2','#a2a38f'];
 for(let i=0;i<boardCount;i++){
  const x=-half+(i+.5)*boardW,w=boardW-rr(.014,.031),length=rr(.92,1.3),offset=rr(-.075,.075),y=deckY(x)+rr(-.012,.012);
  const group=new T.Group();group.name='weathered-plank';group.position.set(x,y,offset);group.rotation.set(rr(-.018,.018),rr(-.028,.028),-.16*x/(half*half));bridge.add(group);
  const front=-length/2,back=length/2,chip=i%3===0?.13:.025,shape=new T.Shape();
  const border=[[-w/2,front+.035],[-w*.15,front],[-w*.08,front+chip],[w*.035,front+.012],[w/2,front+rr(.015,.07)],[w/2,back-.035],[w*.23,back],[w*.12,back-chip*.8],[w*.04,back-.01],[-w/2,back-rr(.015,.08)]];
  border.forEach(([px,pz],j)=>j?shape.lineTo(px,pz):shape.moveTo(px,pz));shape.closePath();
  const geometry=new T.ExtrudeGeometry(shape,{depth:.075,bevelEnabled:true,bevelSize:.004,bevelThickness:.003,bevelSegments:1,steps:1});geometry.rotateX(Math.PI/2);
  const mat=wood.clone();mat.color.set(oldWood[i%oldWood.length]);mesh(geometry,mat,[0,0,0],group);
  // Small worn grain strokes, iron nail heads and narrow splits follow each board.
  for(let j=0;j<5;j++){const len=rr(.09,.35);box(rr(.006,.014),.002,len,j%2?grain:split,[rr(-w*.34,w*.34),.005,rr(front+.23,back-.23)],group);}
  for(let z of [-.33,.33])mesh(new T.CylinderGeometry(.009,.009,.003,6),darkIron,[w*.22,.006,z],group);
  if(i%3===1)line([[-w*.25,.006,front+.04],[-w*.23,.006,front+.22],[-w*.08,.006,front+.32]],split,.003,group);
  const snow=box(w-.018,.022,length*.62,snowMat,[0,.019,-.025],group,.008);seasonalSnow.userData.planks??=[];seasonalSnow.userData.planks.push(snow);snow.visible=false;
 }
 for(let z of [-.33,.33]){const pts=[];for(let i=0;i<9;i++){let x=-half+i/8*half*2;pts.push([x,deckY(x)-.125,z]);}line(pts,woodDark,.065,bridge);}
 for(let x of [-half+.11,-half*.34,half*.34,half-.11])for(let z of [-.33,.33]){beam([x,-.16,z],[x,deckY(x)-.09,z],.047,.036,woodDark,bridge);beam([x,-.13,z],[x,.035,z],.05,.046,moss,bridge);}
 const planting=createGardenPlanting({garden,material,mesh,line,leafGeometry,rr,cx,width,bridgeZ,center,half,withinGarden});
 // A few stepping stones remain on the right; the entire left plot is planted.
 const paths=[[center+half+.2,3.22],[2.95,2.7],[3.12,2.19],[3.21,1.62],[3.4,1.04],[3.51,.47],[3.71,-.1]];
 for(const [x,z]of paths){let p=mesh(new T.CylinderGeometry(rr(.21,.27),.26,.052,7),stone,[x,.288,z],garden);p.scale.z=.77;p.rotation.y=rr(0,6.28);}
 // Weathered open farm-tool rack along the right edge, facing the garden viewer.
 const rack=new T.Group();rack.name='farm-tool-rack';rack.position.set(4.39,.26,-.6);rack.rotation.y=Math.PI/2;garden.add(rack);
 for(let x of [-.78,.78])for(let z of [-.27,.27])box(.06,1.85,.06,woodDark,[x,.925,z],rack);
 for(let y of [.13,.65,1.2,1.78]){for(let j=0;j<4;j++)box(1.66,.045,.143,wood,[0,y,-.235+j*.157],rack);box(1.68,.065,.045,woodEdge,[0,y-.025,.31],rack);}
 beam([-.76,.14,-.285],[.76,1.73,-.285],.027,.027,woodEdge,rack);beam([.76,.14,-.29],[-.76,1.73,-.29],.027,.027,woodEdge,rack);
 box(1.79,.055,.75,woodDark,[0,1.92,0],rack,.015);
 const rackSnow=box(.75,.055,1.79,snowMat,[4.39,2.24,-.6],seasonalSnow,.02);
 // Long-handled rake, hoe and spade hang on the outer face without crossing shelves.
 const toolsGroup=new T.Group();toolsGroup.name='hanging-farm-tools';rack.add(toolsGroup);
 function handle(x){beam([x,.28,.405],[x,1.67,.405],.015,.013,woodEdge,toolsGroup);mesh(new T.TorusGeometry(.031,.006,4,12),darkIron,[x,1.69,.404],toolsGroup);}
 handle(-.56);beam([-.78,.4,.418],[-.33,.4,.418],.017,.017,iron,toolsGroup);for(let x=-.76;x<-.32;x+=.059)beam([x,.4,.418],[x,.29,.45],.009,.005,iron,toolsGroup);
 handle(-.04);box(.26,.14,.023,iron,[-.04,.335,.448],toolsGroup);box(.25,.017,.08,darkIron,[-.04,.271,.484],toolsGroup);
 handle(.49);const bladeShape=new T.Shape();bladeShape.moveTo(-.08,.1);bladeShape.lineTo(.08,.1);bladeShape.lineTo(.092,-.04);bladeShape.quadraticCurveTo(0,-.16,-.092,-.04);bladeShape.closePath();const blade=mesh(new T.ExtrudeGeometry(bladeShape,{depth:.016,bevelEnabled:true,bevelSize:.008,bevelThickness:.005,bevelSegments:2,steps:1}),iron,[.49,.38,.414],toolsGroup);line([[.49,.27,.442],[.49,.44,.444]],cream,.004,toolsGroup);
 // Seed crates, twine, terracotta pots, watering can, folded gloves and soil sacks.
 for(let x of [-.47,.1]){const crate=box(.45,.29,.38,wood,[x,.3,0],rack,.02);for(let y of [.21,.31,.4])box(.43,.012,.006,woodDark,[x,y,.195],rack);box(.16,.08,.006,cream,[x,.32,.202],rack);}
 for(let x of [-.5,-.19]){lathe([[.06,0],[.105,.15],[.12,.17],[.12,.19],[.094,.19],[.086,.04]],terra,[x,.676,.01],rack);lathe([[.05,0],[.088,.14],[.105,.17]],terra,[x,.817,.01],rack);}
 const can=new T.Group();can.position.set(.43,.68,-.005);rack.add(can);lathe([[.1,0],[.14,.03],[.14,.24],[.12,.27]],material('#65968a',{metalness:.25}),[0,0,0],can);line([[.08,.08,0],[.22,.14,0],[.3,.28,0]],iron,.025,can);ellipsoid(.3,.28,0,.035,.026,.05,iron,can,16);line([[-.1,.23,0],[-.24,.25,0],[-.24,.04,0],[-.1,.03,0]],iron,.015,can);
 for(let i=0;i<2;i++){const g=box(.31,.22,.28,cream,[-.48+i*.35,1.33,0],rack,.055);g.rotation.y=(i-.5)*.12;line([[-.48+i*.35,1.22,.153],[-.48+i*.35,1.41,.16],[-.48+i*.35,1.45,0]],rope,.008,rack);}
 const spool=mesh(new T.CylinderGeometry(.08,.08,.13,16),rope,[.38,1.29,0],rack);for(let y=1.23;y<1.36;y+=.018)mesh(new T.TorusGeometry(.08,.004,4,20),woodDark,[.38,y,0],rack).rotation.x=Math.PI/2;
 for(let i=0;i<2;i++){box(.095,.025,.18,material('#768e89'),[.51+i*.075,1.235,.095],rack,.017);for(let j=0;j<4;j++)box(.013,.018,.072,cream,[.48+i*.075+j*.019,1.244,.211],rack,.004);}
 const hat=new T.Group();hat.position.set(.83,1.14,.02);hat.rotation.y=Math.PI/2;rack.add(hat);let brim=mesh(new T.CylinderGeometry(.245,.245,.016,36),rope,[0,0,0],hat);brim.rotation.x=Math.PI/2;ellipsoid(0,0,.06,.145,.145,.083,rope,hat,24);for(let r of [.17,.2,.23])mesh(new T.TorusGeometry(r,.0035,4,36),woodDark,[0,0,.01],hat);
 // A complete step-through bicycle: rims, spokes, guards, cables, basket and pedals.
 const bike=new T.Group();bike.name='garden-bicycle';bike.position.set(4.06,.3,1.77);bike.rotation.y=Math.PI/2;garden.add(bike);
 const enamel=material('#709f91',{metalness:.33,roughness:.4}),rubber=material('#344644'),chrome=material('#a5b8ad',{metalness:.8,roughness:.3}),leather=material('#806247');
 const wheels=[];for(let x of [-.64,.64]){mesh(new T.TorusGeometry(.345,.032,10,64),rubber,[x,.376,0],bike);mesh(new T.TorusGeometry(.31,.009,6,64),chrome,[x,.376,0],bike);let hub=mesh(new T.CylinderGeometry(.035,.035,.1,16),chrome,[x,.376,0],bike);hub.rotation.x=Math.PI/2;
 for(let j=0;j<28;j++){let a=j/28*Math.PI*2;beam([x,.376,j%2?.028:-.028],[x+Math.cos(a)*.305,.376+Math.sin(a)*.305,0],.0025,.0025,chrome,bike);}
 const pts=[];for(let j=0;j<=22;j++){let a=.07+j/22*Math.PI*.95;pts.push([x+Math.cos(a)*.39,.376+Math.sin(a)*.39,0]);}line(pts,enamel,.02,bike);wheels.push(x);}
 const rear=[-.64,.376,0],bb=[-.14,.35,0],seat=[-.28,.91,0],neck=[.43,.91,0],front=[.64,.376,0];
 for(const [a,b]of [[rear,bb],[bb,seat],[rear,seat]])beam(a,b,.018,.018,enamel,bike);
 line([seat,[-.17,.64,0],[.14,.52,0],neck],enamel,.025,bike);beam(bb,[.36,.74,0],.022,.022,enamel,bike);beam([.38,1.015,0],front,.022,.019,enamel,bike);beam([-.28,.9,0],[-.29,1.0,0],.016,.016,chrome,bike);ellipsoid(-.31,1.01,0,.15,.035,.09,leather,bike,24);
 line([[.38,.97,0],[.34,1.17,0],[.21,1.17,.17]],chrome,.013,bike);line([[.34,1.17,0],[.21,1.17,-.17]],chrome,.013,bike);for(let z of [-.17,.17])beam([.16,1.17,z],[.28,1.17,z],.021,.021,leather,bike);
 line([[.24,1.17,.17],[.52,.92,.08],[.52,.73,.02]],darkIron,.0035,bike);line([[.24,1.17,-.17],[.11,.75,-.1],[-.14,.41,-.08]],darkIron,.0035,bike);
 mesh(new T.TorusGeometry(.108,.008,6,32),chrome,[-.14,.35,.041],bike);beam([-.14,.35,.05],[-.12,.25,.12],.012,.012,chrome,bike);box(.115,.035,.09,rubber,[-.12,.25,.14],bike);beam([-.14,.35,-.05],[-.16,.45,-.12],.012,.012,chrome,bike);box(.115,.035,.09,rubber,[-.16,.45,-.14],bike);
 line([[-.14,.455,.04],[-.62,.424,.04],[-.67,.373,.04],[-.61,.325,.04],[-.14,.246,.04]],darkIron,.006,bike);
 beam([-.17,.4,0],[-.23,.04,.2],.01,.01,chrome,bike);box(.38,.025,.2,enamel,[-.61,.8,0],bike);for(let z of [-.085,.085])beam([-.78,.79,z],[-.64,.376,z],.007,.007,chrome,bike);
 const basket=new T.Group();basket.position.set(.62,1.0,0);bike.add(basket);for(let y of [0,.1,.22]){line([[-.16,y,-.14],[.16,y,-.14],[.16,y,.14],[-.16,y,.14],[-.16,y,-.14]],rope,.006,basket);}for(let x=-.15;x<=.16;x+=.05)for(let z of [-.14,.14])beam([x,0,z],[x,.22,z],.004,.004,rope,basket);for(let z=-.1;z<=.11;z+=.05)for(let x of [-.16,.16])beam([x,0,z],[x,.22,z],.004,.004,rope,basket);box(.29,.016,.26,wood,[0,0,0],basket);ellipsoid(.64,.9,.033,.045,.044,.04,cream,bike,20);ellipsoid(-.79,.78,.015,.022,.03,.012,terra,bike,16);
 return {bridge,setSeason(s){seasonalSnow.visible=s==='winter';for(const snow of seasonalSnow.userData.planks||[])snow.visible=s==='winter';planting.setSeason(s);},update(time){planting.update(time);},bounds:{bridgeCenter:center,bridgeHalf:half,bridgeZ,deckY}};
}
