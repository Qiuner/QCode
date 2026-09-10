/** Smooth forward travel through dawn/dusk; independent of animation frame rate. */
export function createDaylightTransition(){
 let start=0,distance=0,elapsed=0,active=false;
 const duration=4;
 return {
  start(from:number,to:number){start=from;distance=((to-from)%24+24)%24;elapsed=0;active=distance>1e-6;},
  cancel(){active=false;},
  get active(){return active;},
  update(seconds:number){
   if(!active)return null;
   elapsed=Math.min(duration,elapsed+Math.max(0,Number.isFinite(seconds)?seconds:0));
   const t=elapsed/duration,eased=t*t*(3-2*t);
   if(elapsed>=duration)active=false;
   return (start+distance*eased)%24;
  },
 };
}
