export type WindowBounds={x:number;y:number;width:number;height:number};
export function fitWindow(p:WindowBounds,width:number,height:number):WindowBounds{
  width=Math.max(1,width);height=Math.max(1,height);
  const w=Math.min(width,Math.max(Math.min(620,width),p.width)),h=Math.min(height,Math.max(Math.min(280,height),p.height));
  return {x:Math.max(0,Math.min(width-w,p.x)),y:Math.max(0,Math.min(height-h,p.y)),width:w,height:h};
}
