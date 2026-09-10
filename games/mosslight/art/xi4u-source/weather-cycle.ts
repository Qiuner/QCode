import type {GardenSeason} from './garden-clock';

export type GardenWeather='clear'|'rain'|'snow';
// Artistic weather chances per forecast, not real-world climate statistics.
export function precipitationChance(season:GardenSeason,night:boolean){
 return season==='spring'?.62:season==='summer'?.28:season==='autumn'?.34:night?.76:.42;
}
export function createWeatherCycle(random:()=>number=Math.random){
 let remaining=60;
 function schedule(){remaining=60+random()*60;}
 return {
  // Only active automatic-clock seconds count. Manual choices last two minutes.
  hold(){remaining=120;},
  update(seconds:number,season:GardenSeason,night:boolean):GardenWeather|null{
   if(!Number.isFinite(seconds)||seconds<=0)return null;
   remaining-=seconds;
   if(remaining>0)return null;
   const wet=random()<precipitationChance(season,night);
   schedule();
   return wet?(season==='winter'?'snow':'rain'):'clear';
  },
 };
}
