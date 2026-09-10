export const PIXEL_SIZE_CSS=2;
export const renderStyles=[
 {id:'clear',labelZh:'原生',labelEn:'ORIGINAL'},
 {id:'pixel',labelZh:'像素',labelEn:'PIXEL'},
] as const;
export type GardenRenderStyle=typeof renderStyles[number]['id'];
export function isGardenRenderStyle(value:unknown):value is GardenRenderStyle{return renderStyles.some(style=>style.id===value);}
