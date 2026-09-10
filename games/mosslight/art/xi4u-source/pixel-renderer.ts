import * as T from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {Pass,FullScreenQuad} from 'three/addons/postprocessing/Pass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {FXAAShader} from 'three/addons/shaders/FXAAShader.js';

import {PIXEL_SIZE_CSS,type GardenRenderStyle} from './render-style';
export type RenderStyle=GardenRenderStyle;

/** CSS pixel grid sampling, or full-DPR clarity, plus ink taken only from geometry, never painted texture.
 * Two scene renders, as before: beauty, then opaque geometry normals/depth.
 * Set userData.inkOutline=false on scenery that should not contribute contours
 * (the shadow receiver, submerged pebbles, creek bed, and other water detail).
 * Transparent water, glow, steam, and existing line overlays are excluded.
 */
class GardenInkPass extends Pass {
 private readonly beauty=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,minFilter:T.NearestFilter,magFilter:T.NearestFilter});
 private readonly edges=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,minFilter:T.NearestFilter,magFilter:T.NearestFilter});
 private readonly normals=new T.MeshNormalMaterial({side:T.DoubleSide});
 private readonly material:T.ShaderMaterial;
 private readonly quad:FullScreenQuad;
 private readonly hidden:T.Object3D[]=[];
 private readonly oldClear=new T.Color();
 private dpr=1;
 private pixelated=true;
 private width=1;
 private height=1;
 constructor(private readonly scene:T.Scene,private readonly camera:T.Camera){
  super();
  this.edges.depthTexture=new T.DepthTexture(1,1,T.UnsignedIntType);
  this.material=new T.ShaderMaterial({
   uniforms:{
    tDiffuse:{value:this.beauty.texture},tDepth:{value:this.edges.depthTexture},tNormal:{value:this.edges.texture},
    texel:{value:new T.Vector2(1,1)},cameraNear:{value:.1},cameraFar:{value:100},isPerspective:{value:0},
    inkColor:{value:new T.Color('#28242b')},creaseStrength:{value:.075}
   },
   depthTest:false,depthWrite:false,toneMapped:false,
   vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
   fragmentShader:`
    #include <packing>
    uniform sampler2D tDiffuse,tDepth,tNormal;
    uniform vec2 texel;
    uniform float cameraNear,cameraFar,isPerspective,creaseStrength;
    uniform vec3 inkColor;
    varying vec2 vUv;
    float viewDepth(float d){
     return -mix(orthographicDepthToViewZ(d,cameraNear,cameraFar),perspectiveDepthToViewZ(d,cameraNear,cameraFar),isPerspective);
    }
    vec3 readNormal(vec2 uv){return normalize(texture2D(tNormal,uv).rgb*2.-1.);}
    // A first derivative alone would outline an ordinary sloped roof or rock.
    // Subtract its continuing slope before accepting an occlusion boundary.
    vec3 edgeAt(vec2 direction,float depth,vec3 normal){
     vec2 offset=direction*texel;
     float ahead=texture2D(tDepth,vUv+offset).r;
     float behind=texture2D(tDepth,vUv-offset).r;
     float silhouette=step(.99999,ahead);
     float jump=viewDepth(ahead)-depth;
     float slope=max(0.,depth-viewDepth(behind));
     float discontinuity=max(0.,jump-slope*1.4);
     float separation=smoothstep(.055,.155,discontinuity)*(1.-silhouette);
     vec3 nn=readNormal(vUv+offset);
     float crease=smoothstep(.22,.62,1.-dot(normal,nn));
     // Creases are one-sided, and never compete with a silhouette.
     crease*=step(0.,jump)*smoothstep(-.06,.08,dot(normal-nn,vec3(.5,.7,.4)));
     crease*=1.-smoothstep(.04,.15,abs(jump));
     return vec3(silhouette,separation,crease);
    }
    void main(){
     vec4 beauty=texture2D(tDiffuse,vUv);
     // Normal blending stores premultiplied RGB in the offscreen beauty target.
     // Convert to straight alpha before nonlinear tone mapping; the canvas is
     // created with premultipliedAlpha:false and all full-screen passes overwrite.
     beauty.a=clamp(beauty.a,0.,1.);
     if(beauty.a<=.00001){gl_FragColor=vec4(0.);return;}
     beauty.rgb/=beauty.a;
     float d=texture2D(tDepth,vUv).r;
     if(d>=.99999){gl_FragColor=beauty;return;}
     float depth=viewDepth(d);
     vec3 normal=readNormal(vUv);
     vec3 e=vec3(0.);
     e=max(e,edgeAt(vec2(1.,0.),depth,normal));
     e=max(e,edgeAt(vec2(-1.,0.),depth,normal));
     e=max(e,edgeAt(vec2(0.,1.),depth,normal));
     e=max(e,edgeAt(vec2(0.,-1.),depth,normal));
     // Subtle diagonal coverage joins stair-step contours at one CSS pixel.
     e=max(e,edgeAt(vec2(.8,.8),depth,normal)*.82);
     e=max(e,edgeAt(vec2(-.8,.8),depth,normal)*.82);
     e=max(e,edgeAt(vec2(.8,-.8),depth,normal)*.82);
     e=max(e,edgeAt(vec2(-.8,-.8),depth,normal)*.82);
     float stroke=max(e.x,max(e.y*.91,e.z*creaseStrength));
     // Never brighten the deep night shadows with a fixed ink color.
     vec3 ink=min(beauty.rgb,inkColor);
     gl_FragColor=vec4(mix(beauty.rgb,ink,stroke),beauty.a);
    }`
  });
  this.quad=new FullScreenQuad(this.material);
 }
 setPixelRatio(dpr:number){this.dpr=Math.max(1,dpr);this.setSize(this.width,this.height);}
 setPixelated(pixelated:boolean){
  if(this.pixelated===pixelated)return;
  this.pixelated=pixelated;
  const filter=pixelated?T.NearestFilter:T.LinearFilter;
  for(const target of[this.beauty,this.edges]){target.texture.minFilter=filter;target.texture.magFilter=filter;target.texture.needsUpdate=true;}
  // Keep raw depth nearest-filtered: mixing unrelated depths invents geometry.
  this.setSize(this.width,this.height);
 }
 getScenePixelSize(){return Math.max(this.width/this.dpr/this.beauty.width,this.height/this.dpr/this.beauty.height);}
 getPixelStep(target:T.Vector2){return target.set(this.width/this.beauty.width,this.height/this.beauty.height);}
 override setSize(width:number,height:number){
  this.width=width;this.height=height;
  const divisor=this.pixelated?this.dpr*PIXEL_SIZE_CSS:1;
  const w=Math.max(1,Math.floor(width/divisor)),h=Math.max(1,Math.floor(height/divisor));
  this.beauty.setSize(w,h);this.edges.setSize(w,h);
  const inkPixels=this.pixelated?1:this.dpr;
  this.material.uniforms.texel.value.set(inkPixels/w,inkPixels/h);
 }
 private hideNonInk(object:T.Object3D){
  if(!object.visible)return;
  const renderable=object as T.Mesh;
  const materials=renderable.material?(Array.isArray(renderable.material)?renderable.material:[renderable.material]):[];
  const excluded=object.userData.inkOutline===false||
   (object as T.Line).isLine||(object as T.Points).isPoints||(object as T.Sprite).isSprite||
   materials.some(m=>m.userData.inkOutline===false||!m.depthWrite||m.transparent||(m as T.ShadowMaterial).isShadowMaterial);
  if(excluded){this.hidden.push(object);object.visible=false;return;}
  for(const child of object.children)this.hideNonInk(child);
 }
 override render(renderer:T.WebGLRenderer,writeBuffer:T.WebGLRenderTarget){
  renderer.setRenderTarget(this.beauty);renderer.render(this.scene,this.camera);
  const oldOverride=this.scene.overrideMaterial,oldBackground=this.scene.background;
  const oldAlpha=renderer.getClearAlpha();renderer.getClearColor(this.oldClear);
  this.hidden.length=0;
  try{
   this.hideNonInk(this.scene);
   this.scene.overrideMaterial=this.normals;this.scene.background=null;
   renderer.setClearColor(0x000000,0);renderer.setRenderTarget(this.edges);renderer.clear();
   renderer.render(this.scene,this.camera);
  }finally{
   this.scene.overrideMaterial=oldOverride;this.scene.background=oldBackground;
   for(const object of this.hidden)object.visible=true;
   renderer.setClearColor(this.oldClear,oldAlpha);
  }
  const camera=this.camera as T.OrthographicCamera|T.PerspectiveCamera;
  this.material.uniforms.cameraNear.value=camera.near;
  this.material.uniforms.cameraFar.value=camera.far;
  this.material.uniforms.isPerspective.value=(camera as T.PerspectiveCamera).isPerspectiveCamera?1:0;
  renderer.setRenderTarget(this.renderToScreen?null:writeBuffer);
  if(this.clear)renderer.clear();
  this.quad.render(renderer);
 }
 override dispose(){this.beauty.dispose();this.edges.dispose();this.normals.dispose();this.material.dispose();this.quad.dispose();}
}

export function createPixelRenderer(renderer:T.WebGLRenderer,scene:T.Scene,camera:T.Camera){
 const composer=new EffectComposer(renderer),pixel=new GardenInkPass(scene,camera),output=new OutputPass();
 let composerDpr=renderer.getPixelRatio(),style:RenderStyle='pixel',night=0;
 pixel.setPixelRatio(composerDpr);
 const fullscreenVertex='varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';
 // Pixel-only palette. Clear mode bypasses quantisation and dithering.
 const palette=new ShaderPass({
  name:'GardenPixelPalette',uniforms:{tDiffuse:{value:null},pixelStep:{value:new T.Vector2(PIXEL_SIZE_CSS,PIXEL_SIZE_CSS)}},
  vertexShader:fullscreenVertex,
  fragmentShader:`
   uniform sampler2D tDiffuse;uniform vec2 pixelStep;varying vec2 vUv;
   const vec3 gardenLumaWeights=vec3(.2126,.7152,.0722);
   float bayer(vec2 p){vec2 a=mod(floor(p),2.);vec2 b=mod(floor(p*.5),2.);return (4.*mod(2.*a.x+3.*a.y,4.)+mod(2.*b.x+3.*b.y,4.))/16.-.46875;}
   void main(){
    vec4 sampleColor=texture2D(tDiffuse,vUv);
    if(sampleColor.a<=.00001){gl_FragColor=vec4(0.);return;}
    vec3 c=sampleColor.rgb;float l=dot(c,gardenLumaWeights);
    c=mix(vec3(l),c,1.08);float d=bayer(floor(gl_FragCoord.xy/pixelStep));
    float stepped=floor(l*44.+.5+d*.2)/44.;c*=mix(1.,stepped/max(l,.015),.35);
    c=floor(clamp(c,0.,1.)*63.+.5+d*.15)/63.;
    gl_FragColor=vec4(clamp(c,0.,1.),sampleColor.a);
   }`
 });
 // A single local, high-threshold glow pass. Twelve colour taps, no extra
 // scene render, mip pyramid or MSAA buffers; disabled in daylight/pixel mode.
 const bloom=new ShaderPass({
  name:'GardenNightGlow',uniforms:{tDiffuse:{value:null},cssTexel:{value:new T.Vector2(1,1)},night:{value:0}},vertexShader:fullscreenVertex,
  fragmentShader:`
   uniform sampler2D tDiffuse;uniform vec2 cssTexel;uniform float night;varying vec2 vUv;
   vec3 highlight(vec2 offset){vec4 c=texture2D(tDiffuse,vUv+offset*cssTexel);float l=dot(c.rgb,vec3(.2126,.7152,.0722));float warm=smoothstep(-.08,.045,c.r-c.b);return c.rgb*c.a*smoothstep(.82,.97,l)*warm;}
   void main(){
    vec4 centre=texture2D(tDiffuse,vUv);vec3 halo=vec3(0.);
    halo+=(highlight(vec2(2.2,0.))+highlight(vec2(-2.2,0.))+highlight(vec2(0.,2.2))+highlight(vec2(0.,-2.2)))*.13;
    halo+=(highlight(vec2(1.65,1.65))+highlight(vec2(-1.65,1.65))+highlight(vec2(1.65,-1.65))+highlight(vec2(-1.65,-1.65)))*.075;
    halo+=(highlight(vec2(4.5,0.))+highlight(vec2(-4.5,0.))+highlight(vec2(0.,4.5))+highlight(vec2(0.,-4.5)))*.045;
    vec3 light=halo*(.075*night);float haloAlpha=max(light.r,max(light.g,light.b));
    float alpha=centre.a+haloAlpha*(1.-centre.a);
    // Composite in premultiplied form, then restore straight RGB. Empty sky
    // stays transparent, and a soft light edge can never acquire black RGB.
    vec3 rgb=alpha>.00001?(centre.rgb*centre.a+light)/alpha:vec3(0.);
    gl_FragColor=vec4(clamp(rgb,0.,1.),clamp(alpha,0.,1.));
   }`
 });
 // Installed FXAA, after display conversion. Semi-transparent neighbours
 // bypass filtering so straight-alpha silhouettes never bleed dark colour.
 const fxaa=new ShaderPass({
  ...FXAAShader,
  fragmentShader:FXAAShader.fragmentShader.replace(
   'gl_FragColor = ApplyFXAA( tDiffuse, resolution.xy, vUv );',
   `vec4 centre=texture2D(tDiffuse,vUv);
    if(centre.a<.999){gl_FragColor=centre;return;}
    float alpha=1.;
    for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){
     alpha=min(alpha,texture2D(tDiffuse,vUv+vec2(float(x),float(y))*resolution).a);
    }
    if(alpha<.999){gl_FragColor=centre;return;}
    vec4 smoothColor=ApplyFXAA(tDiffuse,resolution.xy,vUv);
    gl_FragColor=vec4(smoothColor.rgb,centre.a);`
  )
 });
 for(const pass of[palette,bloom,fxaa]){pass.material.depthTest=false;pass.material.depthWrite=false;pass.material.blending=T.NoBlending;pass.material.toneMapped=false;}
 composer.addPass(pixel);composer.addPass(output);composer.addPass(palette);composer.addPass(bloom);composer.addPass(fxaa);
 function configure(){
  const coarse=style==='pixel';pixel.setPixelated(coarse);palette.enabled=coarse;
  bloom.enabled=!coarse&&night>.0001;fxaa.enabled=!coarse;pixel.getPixelStep(palette.uniforms.pixelStep.value);
 }
 function updateResolution(){
  const w=Math.max(1,Math.floor(composer.renderTarget1.width)),h=Math.max(1,Math.floor(composer.renderTarget1.height));
  fxaa.uniforms.resolution.value.set(1/w,1/h);bloom.uniforms.cssTexel.value.set(composerDpr/w,composerDpr/h);pixel.getPixelStep(palette.uniforms.pixelStep.value);
 }
 function setStyle(next:RenderStyle){
  if(next!=='pixel'&&next!=='clear')return;
  style=next;configure();
 }
 function updateNight(mix:number){night=Number.isFinite(mix)?T.MathUtils.clamp(mix,0,1):0;bloom.uniforms.night.value=night;bloom.enabled=style==='clear'&&night>.0001;}
 configure();updateResolution();
 return {
  setStyle,updateNight,getScenePixelSize:()=>pixel.getScenePixelSize(),
  setPixelated:(value:boolean)=>setStyle(value?'pixel':'clear'),
  resize(w:number,h:number){
   const dpr=renderer.getPixelRatio();pixel.setPixelRatio(dpr);
   if(dpr!==composerDpr){composerDpr=dpr;composer.setPixelRatio(dpr);}
   composer.setSize(w,h);updateResolution();
  },
  render(){composer.render();},
  dispose(){pixel.dispose();output.dispose();palette.dispose();bloom.dispose();fxaa.dispose();composer.dispose();}
 };
}
