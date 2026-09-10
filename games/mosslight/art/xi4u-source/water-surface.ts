import * as T from 'three';

export function createCreekMaterial(){
 const uniforms={time:{value:0},night:{value:0},rain:{value:0},cloud:{value:0},eyeDirection:{value:new T.Vector3(.46,.55,.69)},moonPosition:{value:new T.Vector3(-5.8,8.2,-9.1)}};
 // Local lamps illuminate the bank; their specular lobes do not become glowing water pillars.
 const material=new T.MeshPhysicalMaterial({color:'#4caeab',roughness:.85,metalness:0,specularIntensity:0,clearcoat:0,transparent:true,opacity:.64,side:T.DoubleSide,depthWrite:false});
 material.name='creek-moonlit-water';
 material.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,uniforms);
  shader.vertexShader='varying vec3 creekWorldP; uniform float time;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
   vec2 p=vec2(position.x,-position.y);
   transformed.z+=sin(dot(p,vec2(2.3,1.1))-time*.9)*.005+sin(dot(p,vec2(-3.1,4.7))+time*.73)*.003+sin(dot(p,vec2(8.2,5.4))-time*1.3)*.0015;
   creekWorldP=(modelMatrix*vec4(transformed,1.)).xyz;`);
  shader.fragmentShader=`varying vec3 creekWorldP; uniform float time; uniform float night; uniform float rain; uniform float cloud; uniform vec3 eyeDirection; uniform vec3 moonPosition;
   float creekHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
   float creekNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(creekHash(i),creekHash(i+vec2(1.,0.)),f.x),mix(creekHash(i+vec2(0.,1.)),creekHash(i+vec2(1.,1.)),f.x),f.y);}
   vec3 creekNormal(vec2 p){
    vec2 slope=cos(dot(p,vec2(2.3,1.1))-time*.9)*.005*vec2(2.3,1.1)+cos(dot(p,vec2(-3.1,4.7))+time*.73)*.003*vec2(-3.1,4.7)+cos(dot(p,vec2(8.2,5.4))-time*1.3)*.0015*vec2(8.2,5.4);
    slope+=cos(dot(p,vec2(19.3,-11.8))+time*1.8)*(.001+rain*.0011)*vec2(19.3,-11.8);
    return normalize(vec3(-slope.x,1.,-slope.y));
   }
  `+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   vec2 waterP=creekWorldP.xz;
   float flow=creekNoise(waterP*3.2+vec2(time*.06,-time*.16));
   float fine=creekNoise(waterP*11.7+vec2(-time*.17,time*.23));
   float smallRipple=smoothstep(.62,.87,flow)*smoothstep(.59,.78,fine);
   diffuseColor.rgb*=mix(vec3(.93,1.,1.),vec3(.38,.62,.82),night);
   diffuseColor.rgb+=vec3(.025,.065,.06)*smallRipple*(1.-night*.8);
   diffuseColor.a=.61+smallRipple*.045;`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
   normal=normalize((viewMatrix*vec4(creekNormal(creekWorldP.xz),0.)).xyz);`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
   vec3 toMoon=normalize(moonPosition-creekWorldP);
   vec3 halfMoon=normalize(toMoon+normalize(eyeDirection));
   float alignment=max(0.,dot(creekNormal(creekWorldP.xz),halfMoon));
   float flecks=creekNoise(creekWorldP.xz*vec2(8.,19.)+vec2(time*.2,-time*.45));
   float brokenGlint=mix(.13,1.,smoothstep(.38,.77,flecks));
   float reflection=(pow(alignment,150.)*.32+pow(alignment,48.)*.025)*brokenGlint;
   float fresnel=.05+.18*pow(1.-max(0.,dot(creekNormal(creekWorldP.xz),normalize(eyeDirection))),4.);
   totalEmissiveRadiance+=night*(1.-cloud*.85)*vec3(.48,.65,.86)*(reflection+fresnel*.1);
  `);
 };
 return {material,uniforms};
}
