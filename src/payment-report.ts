import {uiText} from "./english";
import type {Project} from "./model";
import {D,money,csv} from "./engine";
import {displayDate} from "./date-format";
import {esc} from "./receipt";
import {tableXLSX} from './xlsx';
export function paymentReport(p:Project,from:string,to:string,accountId="",attentionOnly=false){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(from)||!/^\d{4}-\d{2}-\d{2}$/.test(to)||from>to)throw Error(uiText("Проверьте диапазон дат","Verificați intervalul de date",p.settings.language));
  const batches=new Map(p.payment_batches.flatMap(b=>b.state==="applied"?b.rows.filter(r=>r.payment_id).map(r=>[r.payment_id!,b] as const):[]));
  const allocations=new Map<string,ReturnType<typeof D>>();for(const share of p.service_accounting.payments)allocations.set(share.payment_id,(allocations.get(share.payment_id)||D(0)).plus(share.amount));
  const rows=p.payments.filter(pay=>pay.payment_date>=from&&pay.payment_date<=to&&(!accountId||pay.account_id===accountId)).map(pay=>{const a=p.accounts.find(a=>a.id===pay.account_id)!,batch=batches.get(pay.id),allocated=allocations.get(pay.id)||D(0);return {...pay,number:a.number,payer:a.payer_name,method:batch?.method||"",document:batch?.number||"",unallocated:money(D(pay.amount).minus(allocated),p)};}).filter(row=>!attentionOnly||!D(row.unallocated).isZero()).sort((a,b)=>a.payment_date.localeCompare(b.payment_date)||a.number.localeCompare(b.number));
  return {rows,total:money(rows.reduce((s,r)=>s.plus(r.amount),D(0)),p),count:rows.length};
}
export function paymentReportCSV(p:Project,from:string,to:string,accountId="",attentionOnly=false){
  const r=paymentReport(p,from,to,accountId,attentionOnly),ru=p.settings.language==="ru";
  return csv([ru?["Дата оплаты","Внесено","Счёт","Плательщик","Оплачено, MDL","Вариант оплаты","Документ","Нераспределено, MDL","Примечание"]:["Data plății","Înregistrat","Cont","Plătitor","Achitat, MDL","Modalitate","Document","Nerepartizat, MDL","Notă"],...r.rows.map(pay=>[displayDate(pay.payment_date,p),displayDate(pay.entered_date,p),pay.number,pay.payer,pay.amount,pay.method,pay.document,pay.unallocated,pay.note]),[ru?"Итого":"Total","","","",r.total,"","","",""]]);
}
export function paymentReportXLSX(p:Project,from:string,to:string,accountId='',attentionOnly=false){
 const r=paymentReport(p,from,to,accountId,attentionOnly),ru=p.settings.language==='ru';
 const headers=ru?['Дата','Счёт','Плательщик','Оплачено, MDL','Нераспределено, MDL','Документ','Способ оплаты','Примечание']:['Data','Cont','Plătitor','Achitat, MDL','Nerepartizat, MDL','Document','Modalitate','Notă'];
 const rows=r.rows.map(pay=>[displayDate(pay.payment_date,p),pay.number,pay.payer,pay.amount,pay.unallocated,pay.document,pay.method,pay.note]);
 rows.push([ru?'Итого':'Total','','',r.total,money(r.rows.reduce((s,pay)=>s.plus(pay.unallocated),D(0)),p),'','','']);
 return tableXLSX(ru?'Отчёт по оплатам':'Raport de plăți',`${p.organization.name} · ${displayDate(from,p)}–${displayDate(to,p)}`,headers,rows,3,2);
}
export function paymentReportHTML(p:Project,from:string,to:string,accountId="",attentionOnly=false){
  const r=paymentReport(p,from,to,accountId,attentionOnly),ru=p.settings.language==="ru",title=ru?"Отчёт по оплатам":"Raport de plăți",head=ru?["Дата","Счёт","Плательщик","Оплачено, MDL","Документ / способ","Нераспределено, MDL"]:["Data","Cont","Plătitor","Achitat, MDL","Document / metodă","Nerepartizat, MDL"];
  return `<!doctype html><html lang="${p.settings.language}"><head><meta charset="utf-8"><title>${title}</title><style>body{font:13px Arial;color:#111;background:#fff;padding:18px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #aaa;padding:8px;text-align:left}th{background:#e7edf3;font-weight:700}tfoot{background:#edf1f5;font-weight:700}td:nth-child(4),td:nth-child(6){text-align:right;font-variant-numeric:tabular-nums}thead{display:table-header-group}tr{break-inside:avoid}@media print{@page{size:A4 landscape;margin:12mm}body{padding:0}}</style></head><body><h1>${title}</h1><p>${esc(p.organization.name)} · ${esc(displayDate(from,p))}–${esc(displayDate(to,p))}</p><table><thead><tr>${head.map(h=>`<th>${h}</th>`).join("")}</tr></thead><tbody>${r.rows.map(pay=>`<tr>${[displayDate(pay.payment_date,p),pay.number,pay.payer,pay.amount,[pay.document,pay.method].filter(Boolean).join(" · "),pay.unallocated].map(v=>`<td>${esc(v)}</td>`).join("")}</tr>`).join("")}</tbody><tfoot><tr><th colspan="3">${ru?"Итого":"Total"}</th><td>${r.total}</td><td colspan="2"></td></tr></tfoot></table></body></html>`;
}

