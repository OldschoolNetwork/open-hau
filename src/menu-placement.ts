export function placeMenu(anchor:{left:number;right:number;top:number;bottom:number},size:{width:number;height:number},viewport:{width:number;height:number},submenu=false){
 const margin=8,width=Math.min(size.width,Math.max(0,viewport.width-margin*2)),height=Math.min(size.height,Math.max(0,viewport.height-margin*2));
 const leftward=submenu&&anchor.right+width>viewport.width-margin;
 const preferredX=submenu?(leftward?anchor.left-width:anchor.right):anchor.left;
 const preferredY=submenu?anchor.top:(anchor.bottom+height<=viewport.height-margin?anchor.bottom:anchor.top-height);
 return {x:Math.max(margin,Math.min(preferredX,viewport.width-width-margin)),y:Math.max(margin,Math.min(preferredY,viewport.height-height-margin)),width,height,leftward};
}
