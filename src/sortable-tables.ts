import {nextSort,sortRows,type SortKey} from './table-sort';

/** Display sorting only: documents, calculations and their stored order stay intact. */
export function sortableTables(root:HTMLElement){
 const states=new WeakMap<HTMLTableElement,{keys:SortKey[];original:WeakMap<HTMLTableRowElement,number>;next:number;restore:boolean}>();
 const controls=new WeakMap<HTMLTableElement,HTMLButtonElement>();
 const excluded='.receipt,.paper-stack,.report-preview,.batch-editor,.payment-details,.data-register,[data-sortable="false"]';
 function eligible(table:HTMLTableElement){return !table.closest(excluded)&&!!table.tHead&&table.tHead.rows.length===1;}
 function state(table:HTMLTableElement){let value=states.get(table);if(!value){value={keys:[],original:new WeakMap(),next:0,restore:false};states.set(table,value);}return value;}
 function cell(row:HTMLTableRowElement,column:number){const node=row.cells[column];if(!node)return '';const input=node.querySelector('input,select') as HTMLInputElement|HTMLSelectElement|null;return node.dataset.sortValue??(input?.tagName==='SELECT'?(input as HTMLSelectElement).selectedOptions[0]?.textContent||'':input instanceof HTMLInputElement?input.type==='checkbox'?String(Number(input.checked)):input.value:node.textContent||'');}
 function apply(table:HTMLTableElement){
  const value=state(table);
  let reset=controls.get(table);
  if(!reset?.isConnected){reset=document.createElement('button');reset.type='button';reset.className='table-sort-reset';reset.addEventListener('click',()=>{state(table).keys=[];state(table).restore=true;scan();});table.parentElement?.insertBefore(reset,table);controls.set(table,reset);}
  reset.textContent=document.documentElement.lang==='ru'?'Сброс сортировки':document.documentElement.lang==='ro'?'Resetează sortarea':'Reset sorting';reset.hidden=!value.keys.length;
  for(const body of Array.from(table.tBodies)){
   const all=Array.from(body.rows);for(const row of all)if(!value.original.has(row))value.original.set(row,value.next++);
   let segment:HTMLTableRowElement[]=[];
   const flush=(before:HTMLTableRowElement|null)=>{const ordered=value.keys.length?sortRows(segment,value.keys,cell):value.restore?segment.slice().sort((a,b)=>value.original.get(a)!-value.original.get(b)!):segment;if(ordered.some((row,index)=>row!==segment[index]))for(const row of ordered)body.insertBefore(row,before);segment=[];};
   for(const row of all){if(Array.from(row.cells).some(c=>c.colSpan>1)||row.matches('.group-row,.summary-row'))flush(row);else segment.push(row);}flush(null);
  }
  value.restore=false;
  Array.from(table.tHead!.rows[0].cells).forEach((header,column)=>{
   if(header.querySelector('button,input,select')||!header.textContent?.trim())return;
   header.classList.add('sortable-column');header.tabIndex=0;
   const key=value.keys.find(k=>k.column===column),priority=value.keys.findIndex(k=>k.column===column);
   header.setAttribute('aria-sort',key?(key.direction===1?'ascending':'descending'):'none');
   header.dataset.sortIndicator=key?(key.direction===1?' ↑':' ↓')+(value.keys.length>1?String(priority+1):''):'';
   header.title=document.documentElement.lang==='ru'?'Сортировка: по возрастанию, по убыванию, исходный порядок. Shift + клик: добавить столбец.':document.documentElement.lang==='ro'?'Sortare: crescător, descrescător, ordinea inițială. Shift + clic: adaugă o coloană.':'Sort ascending, descending, then original order. Shift + click adds a column.';
  });
 }
 function scan(){observer.disconnect();try{for(const table of root.querySelectorAll('table'))if(eligible(table))apply(table);}finally{observer.observe(root,{childList:true,subtree:true,characterData:true});}}
 const observer=new MutationObserver(scan);
 function activate(event:MouseEvent|KeyboardEvent){
  if(event instanceof KeyboardEvent&&!['Enter',' '].includes(event.key))return;
  const target=event.target instanceof Element?event.target:null,header=target?.closest<HTMLTableCellElement>('th');
  const table=header?.closest('table');if(!header||!table||!header.classList.contains('sortable-column')||!eligible(table)||target?.closest('button,input,select,a'))return;
  event.preventDefault();const value=state(table);value.keys=nextSort(value.keys,header.cellIndex,event.shiftKey);value.restore=!value.keys.length;scan();
 }
 scan();root.addEventListener('click',activate);root.addEventListener('keydown',activate);
 return {destroy(){observer.disconnect();root.removeEventListener('click',activate);root.removeEventListener('keydown',activate);}};
}
