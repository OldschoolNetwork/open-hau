export type SortKey = {column:number;direction:1|-1};
export function nextSort(keys:SortKey[],column:number,append=false):SortKey[]{
 const previous=keys.find(k=>k.column===column);
 const remaining=append?keys.filter(k=>k.column!==column):[];
 if(previous?.direction===-1)return remaining;
 const value:SortKey={column,direction:previous? -1:1};
 if(append&&previous)return keys.map(k=>k.column===column?value:k);
 return [...remaining,value];
}
const collator=new Intl.Collator(undefined,{numeric:true,sensitivity:'base'});
function sortableValue(value:string):number|string{
 const text=value.trim();
 const date=/^(\d{2})\.(\d{2})\.(\d{4})(?:\s|$)/.exec(text);
 if(date)return `${date[3]}-${date[2]}-${date[1]}`;
 let number=text.replace(/[\s\u00a0\u202f]/g,'').replace(/[−–]/g,'-');
 if(!/^[+-]?\d[\d.,]*$/.test(number))return text;
 if(number.includes(',')&&number.includes('.')){const decimal=number.lastIndexOf(',')>number.lastIndexOf('.')?',':'.';number=number.replace(decimal===','?/\./g:/,/g,'').replace(',','.');}
 else if(number.includes(','))number=number.replace(',','.');
 const parsed=Number(number);return Number.isFinite(parsed)?parsed:text;
}
export function compareCells(a:string,b:string):number{
 const left=sortableValue(a),right=sortableValue(b);
 if(typeof left==='number'&&typeof right==='number')return left-right;
 return collator.compare(String(left),String(right));
}
export function sortRows<T>(rows:T[],keys:SortKey[],cell:(row:T,column:number)=>string):T[]{
 if(!keys.length)return rows;
 return rows.map((row,index)=>({row,index})).sort((a,b)=>{
  for(const key of keys){const comparison=compareCells(cell(a.row,key.column),cell(b.row,key.column));if(comparison)return comparison*key.direction;}
  return a.index-b.index;
 }).map(item=>item.row);
}
