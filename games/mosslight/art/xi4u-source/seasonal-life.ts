// @ts-nocheck
import * as T from 'three';

/** Seasonal still lifes with small, independent loops; all modeled in code. */
export function createSeasonalLife({root,material,mesh,box,ellipsoid,line,beam,lathe,cup,teapot,wood,woodDark,paper,brass,rr}){
 const groups=Object.fromEntries(['spring','summer','autumn','winter'].map(s=>{const g=new T.Group();g.name=`室内_${s}`;root.add(g);return [s,g];}));
 const jade=material('#4eaaa0'),ivory=material('#f7e2ae'),coral=material('#d98053'),clay=material('#51767c');
 const twig=material('#795749'),leaf=material('#81bd6b'),petal=material('#f4c7b7'),pink=material('#e89f9c');
 function plate(x,y,z,r,parent){mesh(new T.CylinderGeometry(r,r*.88,.027,16),ivory,[x,y,z],parent);mesh(new T.TorusGeometry(r*.87,.009,4,16),coral,[x,y+.017,z],parent).rotation.x=Math.PI/2;}
 function vase(x,y,z,parent,m=clay){lathe([[.065,0],[.13,.08],[.12,.27],[.065,.34],[.057,.38],[.045,.38]],m,[x,y,z],parent);}
 function citrus(x,y,z,parent,r=.09){ellipsoid(x,y,z,r,r*.86,r,coral,parent,8);box(.035,.018,.035,woodDark,[x,y+r*.9,z],parent);let l=box(.066,.009,.023,leaf,[x+.03,y+r*.9,z],parent);l.rotation.y=.5;}
 function bloom(x,y,z,parent,r=.035){for(let k=0;k<5;k++){let a=k*Math.PI*2/5;let o=box(r*1.15,r*.75,r*.35,k%2?pink:petal,[x+Math.cos(a)*r,y+Math.sin(a)*r,z],parent);o.rotation.z=a;}box(.022,.022,.018,ivory,[x,y,z+.01],parent);}
 // Spring: a flowering branch, three-color dango and a celadon tea set.
 const spring=groups.spring;
 vase(-2.37,1.39,-2.52,spring);const branch=new T.Group();branch.position.set(-2.37,1.71,-2.52);spring.add(branch);
 line([[0,0,0],[.03,.22,0],[-.04,.51,-.02],[.03,.78,.01]],twig,.013,branch);
 for(let i=0;i<5;i++){let sign=i%2?1:-1,x=sign*(.16+(i%2)*.08),y=.2+i*.1;line([[0,y-.09,0],[x*.65,y,.015],[x,y+.11,.01]],twig,.008,branch);for(let k=0;k<3;k++)bloom(x+rr(-.035,.035),y+.06+k*.055,.015,branch,.032);}
 // The only spring tea service is on the front veranda tray; sweets sit beside it.
 const sweets=new T.Group();sweets.name='spring-veranda-sweets';sweets.position.x=3.32;spring.add(sweets);
 plate(-2.43,.9935,-.69,.175,sweets);for(let row=0;row<2;row++){beam([-2.57,1.035,-.65-row*.082],[-2.29,1.035,-.65-row*.082],.005,.005,woodDark,sweets);['#f0b2b5','#f6e8c8','#99b68d'].forEach((c,i)=>ellipsoid(-2.50+i*.068,1.038,-.65-row*.082,.033,.031,.031,material(c),sweets,12));}
 const springDrift=[];for(let i=0;i<7;i++){let o=box(.032,.013,.027,petal,[0,0,0],spring);springDrift.push(o);}
 // Summer: an oscillating vintage fan. The blade axle and head pivot are separate.
 const summer=groups.summer;const fan=new T.Group();fan.name='summer-tatami-fan';fan.position.set(.38,1.015,-2.14);fan.rotation.y=-.18;summer.add(fan);
 box(.44,.055,.32,jade,[0,.03,0],fan,.025);box(.23,.02,.06,ivory,[0,.064,.105],fan);for(let i=0;i<3;i++)box(.035,.015,.03,i===0?coral:clay,[-.055+i*.055,.08,.105],fan);
 beam([0,.04,-.04],[0,.32,-.04],.045,.035,jade,fan);const fanHead=new T.Group();fanHead.name='summer-fan-aim';fanHead.position.set(0,.48,-.02);fanHead.rotation.x=.28;fan.add(fanHead);
 let motor=mesh(new T.CylinderGeometry(.075,.075,.15,12),jade,[0,0,-.085],fanHead);motor.rotation.x=Math.PI/2;
 const blades=new T.Group();fanHead.add(blades);for(let i=0;i<3;i++){let a=i*Math.PI*2/3;let o=ellipsoid(Math.sin(a)*.13,Math.cos(a)*.13,0,.087,.16,.015,ivory,blades,8);o.rotation.z=-a-.38;}
 for(let r of [.13,.25,.285])mesh(new T.TorusGeometry(r,.008,4,32),jade,[0,0,.045],fanHead);
 for(let i=0;i<12;i++){let a=i*Math.PI/6;line([[Math.cos(a)*.045,Math.sin(a)*.045,.075],[Math.cos(a)*.18,Math.sin(a)*.18,.07],[Math.cos(a)*.28,Math.sin(a)*.28,.043]],clay,.0055,fanHead);}
 ellipsoid(0,0,.08,.047,.047,.016,jade,fanHead,12);
 // Mosquito-coil saucer, modeled as an actual spiral.
 plate(-2.82,.978,-.52,.2,summer);const spiral=[];for(let i=0;i<100;i++){let a=i*.17,r=.012+i*.0013;spiral.push([-2.82+Math.cos(a)*r,1.005,-.52+Math.sin(a)*r]);}line(spiral,material('#476b67'),.012,summer);
 const coilTip=box(.02,.014,.02,material('#cb764a',{emissive:'#ea9c46',emissiveIntensity:.4}),spiral.at(-1),summer);
 const coilSmoke=[];for(let i=0;i<9;i++){let o=box(.023,.048,.013,material('#d3dfcf',{transparent:true,opacity:.18,depthWrite:false}),[0,0,0],summer);o.castShadow=false;coilSmoke.push(o);}
 // Autumn: an open book, persimmons and a vase of silver grass.
 const autumn=groups.autumn;const book=new T.Group();book.name='autumn-small-veranda-book';book.position.set(-.44,.953334,-.72);book.rotation.y=-.18;book.scale.setScalar(2/3);autumn.add(book);
 box(.74,.025,.43,clay,[0,0,0],book);for(let side of [-1,1]){box(.347,.04,.4,ivory,[side*.18,.028,0],book);for(let z=-.15;z<.18;z+=.034)box(.25,.003,.007,material('#8ca192'),[side*.19,.051,z],book);}
 box(.018,.008,.4,woodDark,[0,.052,0],book);const turningPage=new T.Group();turningPage.position.y=.057;book.add(turningPage);box(.35,.005,.4,paper,[.18,0,0],turningPage);for(let z=-.15;z<.18;z+=.034)box(.25,.002,.006,clay,[.19,.004,z],turningPage);
 const autumnStill=new T.Group();autumnStill.name='autumn-right-still-life';autumnStill.position.x=2.88;autumn.add(autumnStill);
 plate(-2.75,.9585,-.68,.27,autumnStill);for(const [x,z] of [[-2.85392305,-.74],[-2.64607695,-.74],[-2.75,-.56]])citrus(x,1.05542,z,autumnStill,.097);
 const tableVase=new T.Group();tableVase.name='autumn-table-vase';tableVase.position.set(-2.07,1.38,-2.33);autumn.add(tableVase);
 vase(0,0,0,tableVase,coral);const pampas=new T.Group();pampas.position.set(0,.32,0);pampas.scale.setScalar(.55);tableVase.add(pampas);
 for(let i=0;i<6;i++){let x=(i-2.5)*.072,h=.48+rr(0,.25);line([[0,0,0],[x*.5,h*.6,0],[x,h,.035]],twig,.006,pampas);for(let j=0;j<6;j++){let y=h-.15+j*.035;beam([x,y,.035],[x+.045,y+.065,.045],.012,.003,ivory,pampas);beam([x,y,.035],[x-.04,y+.06,.025],.012,.003,ivory,pampas);}}
 // Winter: a patchwork kotatsu quilt and a tray of mikan.
 const winter=groups.winter;const quilt=material('#cd916d');box(1.35,.07,.91,quilt,[-2.02,1.402,-2.33],winter,.035);
 for(let z of [-2.77,-1.89]){box(1.34,.3,.055,quilt,[-2.02,1.24,z],winter,.02);for(let i=0;i<7;i++)box(.08,.29,.009,i%2?ivory:jade,[-2.61+i*.195,1.245,z+(z<-2?.032:.033)],winter);}
 for(let x of [-2.67,-1.37])box(.055,.3,.9,quilt,[x,1.24,-2.33],winter,.02);
 for(let i=0;i<7;i++)box(.085,.005,.89,i%2?ivory:jade,[-2.6+i*.193,1.44,-2.33],winter);
 box(.97,.048,.61,wood,[-2.02,1.47,-2.33],winter,.025);
 const winterFood=new T.Group();winterFood.name='winter-day-kotatsu-food';winter.add(winterFood);
 plate(-2.19,1.505,-2.33,.22,winterFood);citrus(-2.25,1.585,-2.35,winterFood,.078);citrus(-2.08,1.585,-2.34,winterFood,.078);citrus(-2.17,1.705,-2.35,winterFood,.073);
 cup(-1.71,1.505,-2.2,winterFood);
 // A small candle adds a separate slow flicker during winter nights.
 mesh(new T.CylinderGeometry(.075,.08,.018,12),clay,[-2.34,1.512,-2.57],winter);box(.07,.13,.07,ivory,[-2.34,1.58,-2.57],winter);const candleFlame=mesh(new T.ConeGeometry(.022,.073,5),material('#ffd58a',{emissive:'#ffad45',emissiveIntensity:1.2}),[-2.34,1.68,-2.57],winter);
 let season='summer',isNight=false;
 return {
  setSeason(s){season=s;for(const [key,g] of Object.entries(groups))g.visible=key===s;},
  setNight(night){isNight=night;sweets.visible=!night;fan.visible=!night;autumnStill.visible=!night;winterFood.visible=!night;},
  update(time,night){const t=Math.floor(time*14)/14;
   if(season==='spring'){branch.rotation.z=Math.sin(t*.75)*.016;springDrift.forEach((o,i)=>{let f=(t*.075+i/7)%1;o.position.set(-2.37+Math.sin(f*5+i)*.19,2.46-f*1.055,-2.42+f*.43);o.rotation.set(f*4,i+f*5,f*3);});}
   if(season==='summer'){if(!isNight){fanHead.rotation.y=Math.sin(t*.43)*.24;blades.rotation.z=-t*14;}coilSmoke.forEach((o,i)=>{let f=(t*.22+i/9)%1;o.position.set(coilTip.position.x+Math.sin(f*7+t)*.04,1.03+f*.45,coilTip.position.z+Math.cos(f*5)*.025);o.scale.setScalar(.65+f);o.material.opacity=.17*(1-f);});}
   if(season==='autumn'){let phase=(t%15)/15;turningPage.rotation.z=phase<.65?0:Math.sin((phase-.65)/.35*Math.PI)*2.75;pampas.rotation.z=Math.sin(t*.68)*.025;}
   if(season==='winter'){candleFlame.visible=night>.12;candleFlame.scale.y=.85+Math.sin(t*6)*.16+Math.sin(t*11)*.08;candleFlame.rotation.z=Math.sin(t*3)*.08;}
  },
  describe(){return Object.fromEntries(Object.entries(groups).map(([k,g])=>[k,{visible:g.visible,objects:g.children.length}]));}
 };
}
