import type {Project} from './model';
import {D,money,csv} from './engine';
import {accountBalanceReport} from './reports';
import {serviceBalanceReport,UNALLOCATED_SERVICE} from './service-reports';
import {matchesReportSelection} from './report-filter-data';

export type BalanceFilter={field:'account'|'property'|'property-type'|'service'|'type'|'provider';enabled:boolean;operator:'eq'|'ne'|'in'|'not-in';values:string[]};
export type BalanceOptions={grouping?:'service'|'type'|'type-service';expandAccounts?:boolean;showAddress?:boolean;accountFilter?:string;typeFilter?:string;providerFilter?:string;sort?:{column:number;descending:boolean}[];filters?:BalanceFilter[];postedOnly?:boolean;legacyLayout?:boolean};
export function balanceTable(p:Project,from:string,to:string,mode:'account'|'service'='account',serviceFilter='',attentionOnly=false,options:BalanceOptions={}){
 const ru=p.settings.language==='ru',expanded=mode==='account'||!!options.expandAccounts;
 const needsServices=mode==='service'||!!options.filters?.some(f=>f.enabled&&f.values.length&&['service','type','provider'].includes(f.field));
 const source=needsServices?serviceBalanceReport(p,from,to,serviceFilter,attentionOnly,options.postedOnly):accountBalanceReport(p,from,to,attentionOnly,options.postedOnly);
 const fields=['opening','charges','adjustments','paid','closing'] as const;
 const rows=new Map<string,{labels:string[];values:ReturnType<typeof D>[];warnings:Set<string>;order:number}>();
 for(const row of source.rows){
  if(options.accountFilter&&row.account_id!==options.accountFilter)continue;
  const sid='service_id'in row?row.service_id:'';
  const service=p.services.find(s=>s.id===sid);
  if(options.providerFilter&&service?.provider!==options.providerFilter)continue;
  const type=service?.service_type|| (sid===UNALLOCATED_SERVICE?(ru?'Нераспределено':'Nerepartizat'):(ru?'Без вида услуги':'Fără tip de serviciu'));
  if(mode==='service'&&options.typeFilter&&type!==options.typeFilter)continue;
  if(!matchesReportSelection(p,row.account_id,String(sid),options.filters||[]))continue;
  const serviceName='service'in row?String(row.service):'';
  const grouping=options.grouping||'service';
  const labels=mode==='account'?[]:grouping==='type'?[type]:grouping==='type-service'?[type,serviceName]:[serviceName];
  const key=JSON.stringify([mode==='service'?(grouping==='type'?type:sid):'',expanded?row.account_id:'']);
  if(expanded){labels.push(row.number,row.payer);if(options.showAddress){const account=p.accounts.find(a=>a.id===row.account_id);labels.push(account?.address||'');}}
  if(!rows.has(key))rows.set(key,{labels,values:fields.map(()=>D(0)),warnings:new Set(),order:service?.report_order??10000});
  const target=rows.get(key)!;fields.forEach((field,i)=>target.values[i]=target.values[i].plus(row[field]));row.warnings.forEach(w=>target.warnings.add(w));
 }
 const ordered=[...rows.values()].sort((a,b)=>a.order-b.order||a.labels.join('\0').localeCompare(b.labels.join('\0'),p.settings.language,{numeric:true}));
 const labels=mode==='account'?[]:(options.grouping==='type'?[ru?'Вид услуги':'Tip serviciu']:options.grouping==='type-service'?[ru?'Вид услуги':'Tip serviciu',ru?'Услуга':'Serviciu']:[ru?'Услуга':'Serviciu']);
 if(expanded){labels.push(ru?'Счёт':'Cont',ru?'Плательщик':'Plătitor');if(options.showAddress)labels.push(ru?'Адрес':'Adresă');}
 const numericStart=labels.length;
 const headers=[...labels,...(ru?['На начало','Начислено','Корректировки','Оплачено','На конец']:['Sold inițial','Calculat','Ajustări','Achitat','Sold final'])];
 // Diagnostics remain available in detail views, without overwhelming the summary.
 if(expanded)headers.push(ru?'Проверка':'Verificare');
 const values=ordered.map(r=>[...r.labels,...r.values.map(v=>money(v,p)),...(expanded?[[...r.warnings].join('; ')]:[])]);
 if(options.sort?.length){const indexes=ordered.map((_,i)=>i);indexes.sort((a,b)=>{for(const rule of options.sort!){const col=rule.column;const cmp=col>=numericStart&&col<numericStart+5?D(values[a][col]).comparedTo(values[b][col]):(values[a][col]||'').localeCompare(values[b][col]||'',p.settings.language,{numeric:true});if(cmp)return rule.descending?-cmp:cmp;}return 0;});const copy=values.slice(),orderCopy=ordered.slice();indexes.forEach((index,i)=>{values[i]=copy[index];ordered[i]=orderCopy[index];});}
 const totals=fields.map((_,i)=>money(ordered.reduce((v,r)=>v.plus(r.values[i]),D(0)),p));
 values.push([ru?'Итого, MDL':'Total, MDL',...Array(Math.max(0,numericStart-1)).fill(''),...totals,...(expanded?['']:[])]);
 let outputHeaders=headers,outputRows=values,outputNumericStart=numericStart,numericCount=5;
 if(options.legacyLayout){
  const selectedFields=[0,...(ordered.some(r=>!r.values[1].isZero())?[1]:[]),...(ordered.some(r=>!r.values[2].isZero())?[2]:[]),3,4];
  const names=ru?['Задолженность на начало','Начислено','Корректировки','Оплата','Задолженность на конец']:['Sold inițial','Calculat','Ajustări','Achitat','Sold final'];
  outputHeaders=[...(mode==='account'?[ru?'№ п/п':'Nr.']:[]),...headers.slice(0,numericStart),...selectedFields.map(i=>names[i])];
  outputRows=values.map((row,i)=>[...(mode==='account'?[i===values.length-1?'':String(i+1)]:[]),...row.slice(0,numericStart),...selectedFields.map(j=>row[numericStart+j])]);
  outputNumericStart=numericStart+(mode==='account'?1:0);numericCount=selectedFields.length;
 }
 return {headers:outputHeaders,rows:outputRows,numericStart:outputNumericStart,numericCount,incomplete:ordered.some(r=>r.warnings.size>0),title:mode==='service'?(ru?'Оборотно-сальдовая ведомость по услугам':'Balanță de verificare pe servicii'):(ru?'Оборотно-сальдовая ведомость':'Balanță de verificare'),status:ordered.some(r=>r.warnings.size>0)?(ru?'Предварительный отчёт: имеются неполные данные.':'Raport provizoriu: date incomplete.'):'',attention:ordered.map(r=>r.warnings.size>0)};
}
export const balanceCSV=(...args:Parameters<typeof balanceTable>)=>{const t=balanceTable(...args);return csv([t.headers,...t.rows]);};
