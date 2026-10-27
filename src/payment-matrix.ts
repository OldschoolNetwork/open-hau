import type {Project} from './model';
import {D,money,csv} from './engine';
import {displayDate} from './date-format';
import {escapeMarkup} from './report-exports';
import {tableXLSX} from './xlsx';
import type {BalanceFilter} from './balance-view';
import {matchesReportSelection} from './report-filter-data';

export type PaymentMatrixOptions={grouping:'method'|'date';expandAccounts:boolean;showAddress:boolean;groupServiceTypes:boolean;filters:BalanceFilter[];sort?:{column:number;descending:boolean}[]};
export const paymentMatrixDefaults=():PaymentMatrixOptions=>({grouping:'method',expandAccounts:true,showAddress:false,groupServiceTypes:true,filters:[]});
export function paymentMatrix(p:Project,from:string,to:string,options=paymentMatrixDefaults()){
 const valid=(s:string)=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
 if(!valid(from)||!valid(to)||from>to)throw Error(p.settings.language==='ru'?'Проверьте диапазон дат':'Verificați intervalul de date');
 const ru=p.settings.language==='ru',unknown=ru?'Нераспределено':'Nerepartizat';
 const methods=new Map(p.payment_batches.flatMap(b=>b.state==='applied'?b.rows.filter(r=>r.payment_id).map(r=>[r.payment_id!,b.method] as const):[]));
 const shares=new Map<string,{service_id:string;amount:string}[]>();for(const share of p.service_accounting.payments){if(!shares.has(share.payment_id))shares.set(share.payment_id,[]);shares.get(share.payment_id)!.push(share);}
 const columns=new Map<string,{id:string;name:string;order:number}>();
 const groups=new Map<string,Map<string,{account_id:string;number:string;payer:string;address:string;amounts:Map<string,ReturnType<typeof D>>}>>();
 const match=(field:BalanceFilter['field'],value:string)=>options.filters.filter(f=>f.field===field&&f.enabled&&f.values.length).every(f=>{const includes=f.operator==='eq'||f.operator==='ne'?f.values[0]===value:f.values.includes(value);return f.operator==='ne'||f.operator==='not-in'?!includes:includes;});
 const accountsById=new Map(p.accounts.map(a=>[a.id,a])),servicesById=new Map(p.services.map(s=>[s.id,s]));
 for(const pay of p.payments){
  if(pay.payment_date<from||pay.payment_date>to||!match('account',pay.account_id))continue;
  const account=accountsById.get(pay.account_id);if(!account)continue;
  const group=options.grouping==='date'?pay.payment_date:methods.get(pay.id)||(ru?'Без варианта оплаты':'Fără modalitate de plată');
  let allocated=D(0);const lines=[...(shares.get(pay.id)||[])];for(const share of lines)allocated=allocated.plus(share.amount);
  const remaining=D(pay.amount).minus(allocated);if(!remaining.isZero())lines.push({service_id:'@unallocated',amount:remaining.toFixed(2)});
  for(const line of lines){
   const service=servicesById.get(line.service_id),type=service?.service_type||(line.service_id==='@unallocated'?unknown:(ru?'Без вида услуги':'Fără tip de serviciu'));
   if(!matchesReportSelection(p,pay.account_id,line.service_id,options.filters))continue;
   if(D(line.amount).isZero())continue;
   // Without a service-type mapping, preserve separate services instead of merging unrelated data.
   const id=options.groupServiceTypes&&service?.service_type?'type:'+type:line.service_id,name=options.groupServiceTypes&&service?.service_type?type:service?.name[p.settings.language]||unknown;
   if(!columns.has(id))columns.set(id,{id,name,order:service?.report_order??10000});
   if(!groups.has(group))groups.set(group,new Map());const accounts=groups.get(group)!;
   if(!accounts.has(account.id))accounts.set(account.id,{account_id:account.id,number:account.number,payer:account.payer_name,address:account.address,amounts:new Map()});
   const values=accounts.get(account.id)!.amounts;values.set(id,(values.get(id)||D(0)).plus(line.amount));
  }
 }
 const orderedColumns=[...columns.values()].sort((a,b)=>a.order-b.order||a.name.localeCompare(b.name,p.settings.language));
 const labelCount=options.expandAccounts?(options.showAddress?4:3):1;
 const headers=[...(options.expandAccounts?[ru?'№ п/п':'Nr.',ru?'Номер Л/С':'Număr cont',ru?'ФИО':'Nume',...(options.showAddress?[ru?'Адрес':'Adresă']:[])]:[options.grouping==='method'?(ru?'Вариант оплаты':'Modalitate de plată'):(ru?'Дата':'Data')]),...orderedColumns.map(c=>c.name),ru?'Итого':'Total'];
 const rows:{kind:'group'|'data'|'total';cells:string[]}[]=[],totals=orderedColumns.map(()=>D(0));let sequence=0;
 for(const [key,accounts]of [...groups].sort(([a],[b])=>a.localeCompare(b,p.settings.language))){
  const detail=[...accounts.values()].sort((a,b)=>a.number.localeCompare(b.number,p.settings.language,{numeric:true}));
  const sums=orderedColumns.map(c=>detail.reduce((sum,a)=>sum.plus(a.amounts.get(c.id)||0),D(0)));sums.forEach((s,i)=>totals[i]=totals[i].plus(s));
  rows.push({kind:'group',cells:[options.grouping==='date'?displayDate(key,p):key,...Array(labelCount-1).fill(''),...sums.map(s=>money(s,p)),money(sums.reduce((a,b)=>a.plus(b),D(0)),p)]});
  if(options.expandAccounts){const groupRows=detail.map(a=>{const amounts=orderedColumns.map(c=>a.amounts.get(c.id)||D(0));return {kind:'data' as const,cells:['',a.number,a.payer,...(options.showAddress?[a.address]:[]),...amounts.map(s=>money(s,p)),money(amounts.reduce((a,b)=>a.plus(b),D(0)),p)]};});
   if(options.sort?.length)groupRows.sort((a,b)=>{for(const rule of options.sort!){if(rule.column===0)continue;const av=a.cells[rule.column]||'',bv=b.cells[rule.column]||'';const result=rule.column>=labelCount&&av&&bv?D(av).comparedTo(bv):av.localeCompare(bv,p.settings.language,{numeric:true});if(result)return rule.descending?-result:result;}return 0;});
   for(const row of groupRows){row.cells[0]=String(++sequence);rows.push(row);}
  }
 }
 const total=money(totals.reduce((a,b)=>a.plus(b),D(0)),p);rows.push({kind:'total',cells:[ru?'Итого, MDL':'Total, MDL',...Array(labelCount-1).fill(''),...totals.map(s=>money(s,p)),total]});
 return {headers,rows,columns:orderedColumns,labelCount,total,title:ru?'Отчёт по оплатам':'Raport de plăți'};
}
export function paymentMatrixHTML(p:Project,from:string,to:string,options=paymentMatrixDefaults()){
 const t=paymentMatrix(p,from,to,options),e=escapeMarkup,ru=p.settings.language==='ru';
 const head=t.columns.length?`<tr><th colspan="${t.labelCount}">${options.grouping==='method'?(ru?'Вариант оплаты':'Modalitate de plată'):(ru?'Дата':'Data')}</th><th colspan="${t.columns.length}">${ru?'Оплачено':'Achitat'}</th><th rowspan="2">${ru?'Итого':'Total'}</th></tr><tr>${t.headers.slice(0,-1).map(h=>`<th>${e(h)}</th>`).join('')}</tr>`:`<tr>${t.headers.map(h=>`<th>${e(h)}</th>`).join('')}</tr>`;
 return `<!doctype html><html lang="${p.settings.language}"><head><meta charset="utf-8"><title>${e(t.title)}</title><style>body{font:12px Arial,sans-serif;color:#111;background:white;margin:20px}h1{font-size:18px;margin:0 0 6px}header{text-align:center;width:fit-content;min-width:500px;margin:0 0 24px}p{margin:5px 0}table{border-collapse:collapse;min-width:500px}th,td{border:1px solid #a4adb6;padding:6px 8px;vertical-align:top}th{background:#e7edf3;font-weight:700;text-align:center;max-width:150px}td.num{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}.group,.total{background:#edf1f5;font-weight:700}.group td:first-child{text-align:left}thead{display:table-header-group}tr{break-inside:avoid}@media print{@page{size:A4 landscape;margin:10mm}body{margin:0;font-size:9px}th,td{padding:4px 6px}}</style></head><body><header><h1>${e(t.title)}</h1><p>${e(displayDate(from,p))}–${e(displayDate(to,p))}</p><strong>${e(p.organization.name)}</strong></header><table><thead>${head}</thead><tbody>${t.rows.map(r=>`<tr class="${r.kind}">${r.cells.map((c,i)=>`<td${i>=t.labelCount?' class="num"':''}>${e(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></body></html>`;
}
export function paymentMatrixCSV(...args:Parameters<typeof paymentMatrix>){const t=paymentMatrix(...args);return csv([t.headers,...t.rows.map(r=>r.cells)]);}
export function paymentMatrixXLSX(...args:Parameters<typeof paymentMatrix>){const t=paymentMatrix(...args);const [p,from,to]=args;return tableXLSX(t.title,`${p.organization.name} · ${displayDate(from,p)}–${displayDate(to,p)}`,t.headers,t.rows.map(r=>r.cells),t.labelCount,t.columns.length+1);}
