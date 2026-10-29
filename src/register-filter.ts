export type RegisterFilter={column:number;enabled:boolean;comparison:'eq'|'ne'|'lt'|'le'|'gt'|'ge'|'in'|'not-in';values:string[]};
export type RegisterFilterRequest={id:string;parentId:string;labels:string[];dateColumns:number[];items:string[][];filters:RegisterFilter[];onapply:(filters:RegisterFilter[])=>void};
export function matchesRegisterFilters(values:string[],filters:RegisterFilter[]){
 return filters.every(f=>{
  if(!f.enabled)return true;
  const value=values[f.column]||'',target=f.values[0]||'';
  switch(f.comparison){
   case 'eq':return value===target;case 'ne':return value!==target;
   case 'lt':return value<target;case 'le':return value<=target;case 'gt':return value>target;case 'ge':return value>=target;
   case 'in':return f.values.includes(value);case 'not-in':return !f.values.includes(value);
  }
 });
}
export const openRegisterFilter=(request:RegisterFilterRequest)=>window.dispatchEvent(new CustomEvent('openhau:register-filter',{detail:request}));
