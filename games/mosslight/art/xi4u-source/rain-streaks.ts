// @ts-nocheck
import * as T from 'three';

/** Screen-sized rain ribbons over the existing 450-drop, world-space simulation. */
export function createRainStreaks({root,positions}){
 const count=positions.length/6,geometry=new T.InstancedBufferGeometry();
 geometry.setAttribute('position',new T.Float32BufferAttribute([-1,0,0,1,0,0,-1,1,0,1,1,0],3));
 geometry.setIndex([0,1,2,2,1,3]);geometry.instanceCount=count;
 const buffer=new T.InstancedInterleavedBuffer(positions,6,1);buffer.setUsage(T.DynamicDrawUsage);
 geometry.setAttribute('rainStart',new T.InterleavedBufferAttribute(buffer,3,0));
 geometry.setAttribute('rainEnd',new T.InterleavedBufferAttribute(buffer,3,3));
 // Deterministic layering consumes no RNG. All 450 drops keep their physical simulation.
 const meta=new Float32Array(count*4);
 for(let i=0;i<count;i++)meta.set([[.62,.82,1][Math.floor(i/3)%3],.91+(i*13%5)*.045,.88+(i*7%9)*.03,i],i*4);
 geometry.setAttribute('rainMeta',new T.InstancedBufferAttribute(meta,4));
 const day=new T.Color('#91a9b1'),night=new T.Color('#9bb6c8'),lightning=new T.Color('#d2dde1');
 const uniforms={
  viewport:{value:new T.Vector2(1,1)},cellCss:{value:1},coarse:{value:0},densityStep:{value:1},
  rainColor:{value:day.clone()},rainOpacity:{value:.42}
 };
 const material=new T.ShaderMaterial({
  uniforms,transparent:true,depthTest:true,depthWrite:false,side:T.DoubleSide,toneMapped:false,
  vertexShader:`
   attribute vec3 rainStart,rainEnd;
   attribute vec4 rainMeta;
   uniform vec2 viewport;
   uniform float cellCss,coarse,densityStep;
   varying float vAcross,vProgress,vLayer;
   void main(){
    // Coarse samples need full-cell width; reduce density to preserve a calm view.
    if(coarse>.5&&mod(rainMeta.w,densityStep)>.5){gl_Position=vec4(2.,2.,2.,1.);return;}
    vec4 a=projectionMatrix*modelViewMatrix*vec4(rainStart,1.);
    vec4 b=projectionMatrix*modelViewMatrix*vec4(rainEnd,1.);
    vec2 delta=(b.xy/b.w-a.xy/a.w)*viewport*.5;
    float projectedLength=max(length(delta),.001);
    float minimumLength=mix(5.5,cellCss*2.05,coarse)*rainMeta.z;
    // Extend the real 3D tail upward, preserving its depth and roof occlusion.
    float stretch=max(1.,minimumLength/projectedLength);
    vec3 tail=rainStart+(rainEnd-rainStart)*stretch;
    b=projectionMatrix*modelViewMatrix*vec4(tail,1.);
    delta=(b.xy/b.w-a.xy/a.w)*viewport*.5;
    vec2 direction=length(delta)>.001?normalize(delta):vec2(.08,1.);
    vec2 across=vec2(-direction.y,direction.x);
    float widthCss=mix(1.08*rainMeta.y,cellCss*1.15,coarse);
    vec4 clip=mix(a,b,position.y);
    clip.xy+=across*position.x*widthCss/viewport*clip.w;
    gl_Position=clip;
    vAcross=position.x;vProgress=position.y;vLayer=rainMeta.x;
   }`,
  fragmentShader:`
   uniform vec3 rainColor;
   uniform float rainOpacity,coarse;
   varying float vAcross,vProgress,vLayer;
   void main(){
    float edge=mix(1.-smoothstep(.64,1.,abs(vAcross)),1.,coarse);
    float fineTail=smoothstep(0.,.085,vProgress)*(1.-smoothstep(.64,1.,vProgress));
    float tail=mix(fineTail,.84-.22*vProgress,coarse);
    float alpha=rainOpacity*vLayer*edge*tail;
    if(alpha<.008)discard;
    gl_FragColor=vec4(rainColor,alpha);
   }`
 });
 material.userData.inkOutline=false;
 const rain=new T.Mesh(geometry,material);rain.name='weather-rain';rain.visible=false;
 rain.frustumCulled=false;rain.renderOrder=6;rain.userData.inkOutline=false;root.add(rain);
 function resize(width,height){uniforms.viewport.value.set(Math.max(1,width),Math.max(1,height));}
 function update(nightMix,scenePixelSize=1,flash=0,amount=1){
  const cell=Math.max(.25,scenePixelSize),coarse=cell>1.5?1:0;
  uniforms.cellCss.value=cell;uniforms.coarse.value=coarse;uniforms.densityStep.value=coarse?(cell<=4?2:3):1;
  uniforms.rainColor.value.copy(day).lerp(night,T.MathUtils.clamp(nightMix,0,1)).lerp(lightning,T.MathUtils.clamp(flash*.7,0,.3));
  uniforms.rainOpacity.value=(T.MathUtils.lerp(.42,.52,nightMix)+flash*.15)*(coarse?.84:1)*T.MathUtils.clamp(amount,0,1);
 }
 return {rain,geometry,material,resize,update,commitPositions(){buffer.needsUpdate=true;},
  metrics:()=>({cellCss:uniforms.cellCss.value,coarse:uniforms.coarse.value,
   widthCss:uniforms.coarse.value?uniforms.cellCss.value*1.15:[1.08*.91,1.08*1.09],
   activeStreaks:Math.ceil(count/uniforms.densityStep.value)})};
}
