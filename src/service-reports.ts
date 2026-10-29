import {uiText} from "./english";
import {reportRange,monthChargeEvents,chargeEventIndex} from './report-dates';
import {accountOpenInMonth} from './account-lifecycle';
import type {Project} from "./model";
import {D,charges,money,monthNext,csv} from "./engine";
import {accountBalanceReport} from "./reports";
export const UNALLOCATED_SERVICE="@unallocated";
type Column="opening"|"charges"|"adjustments"|"paid";
export function serviceBalanceReport(p:Project,from:string,to:string,serviceFilter="",attentionOnly=false,postedOnly=false){
  const eventIndex=chargeEventIndex(p);const range=reportRange(from,to);const base=accountBalanceReport(p,from,to,false,postedOnly);from=range.fromMonth;to=range.toMonth;const ru=p.settings.language==="ru";
  const rows:{account_id:string;service_id:string;service:string;number:string;payer:string;active:boolean;opening:string;charges:string;adjustments:string;paid:string;closing:string;warnings:string[]}[]=[];
  const group=<T>(items:T[],key:(item:T)=>string)=>{const result=new Map<string,T[]>();for(const item of items){const k=key(item);result.set(k,[...(result.get(k)||[]),item]);}return result;};
  const snapshots=group(p.snapshots,s=>s.account_id),payments=group(p.payments,pay=>pay.account_id),initial=group(p.service_accounting.opening,r=>r.account_id),paymentShares=group(p.service_accounting.payments,r=>r.payment_id),adjustmentShares=group(p.service_accounting.adjustments,r=>r.account_id+"|"+r.period);
  for(const summary of base.rows){
    const account=p.accounts.find(a=>a.id===summary.account_id)!;
    const amounts=new Map<string,Record<Column,ReturnType<typeof D>>>();
    const put=(sid:string,column:Column,value:string|ReturnType<typeof D>)=>{if(!amounts.has(sid))amounts.set(sid,{opening:D(0),charges:D(0),adjustments:D(0),paid:D(0)});const row=amounts.get(sid)!;row[column]=row[column].plus(value);};
    const distribute=(shares:{service_id:string;amount:string}[],total:string,column:Column,sign=1)=>{let allocated=D(0);for(const share of shares){put(share.service_id,column,D(share.amount).times(sign));allocated=allocated.plus(share.amount);}const remainder=D(total).minus(allocated);if(!remainder.isZero())put(UNALLOCATED_SERVICE,column,remainder.times(sign));};
    // Historical opening values come only from preserved snapshots, never from recalculation.
    distribute(initial.get(account.id)||[],account.opening_balance,"opening");
    const history=snapshots.get(account.id)||[],byMonth=new Map(history.map(s=>[s.period,s]));
    for(const snapshot of history.filter(s=>s.period>=account.opening_period&&s.period<from)){
      for(const line of snapshot.lines)put(line.service_id,"opening",line.amount);
      distribute(adjustmentShares.get(account.id+"|"+snapshot.period)||[],snapshot.adjustment,"opening");
    }
    for(const pay of payments.get(account.id)||[]){
      if(pay.payment_date<account.opening_period+"-01"||pay.payment_date>range.toDate)continue;
      const earlier=pay.payment_date<range.fromDate;
      distribute(paymentShares.get(pay.id)||[],pay.amount,earlier?"opening":"paid",earlier?-1:1);
    }
    for(let month=from;month<=to;month=monthNext(month)){
      if(month<account.opening_period)continue;
      const saved=byMonth.get(month);
      for(const event of monthChargeEvents(p,account,month,postedOnly,eventIndex)){
        if(event.date>range.toDate)continue;
        put(event.service_id||UNALLOCATED_SERVICE,event.date<range.fromDate?'opening':event.kind==='charge'?'charges':'adjustments',event.amount);
      }
    }
    for(const sid of account.service_ids)if(!amounts.has(sid))put(sid,"charges","0");
    for(const [sid,values] of amounts){
      if(serviceFilter&&sid!==serviceFilter)continue;
      if(sid===UNALLOCATED_SERVICE&&Object.values(values).every(v=>v.isZero()))continue;
      const service=p.services.find(s=>s.id===sid),warnings=[...summary.warnings];
      if(sid===UNALLOCATED_SERVICE)warnings.push(ru?"Не завершено распределение начальных остатков, оплат или корректировок по услугам":"Repartizarea soldurilor inițiale, plăților sau ajustărilor pe servicii este incompletă");
      if(attentionOnly&&!warnings.length)continue;
      rows.push({account_id:account.id,service_id:sid,service:sid===UNALLOCATED_SERVICE?(ru?"Нераспределено":"Nerepartizat"):service?.name[p.settings.language]||sid,number:account.number,payer:account.payer_name,active:account.active,opening:money(values.opening,p),charges:money(values.charges,p),adjustments:money(values.adjustments,p),paid:money(values.paid,p),closing:money(values.opening.plus(values.charges).plus(values.adjustments).minus(values.paid),p),warnings});
    }
  }
  rows.sort((a,b)=>a.service.localeCompare(b.service)||a.number.localeCompare(b.number));
  const fields=["opening","charges","adjustments","paid","closing"] as const;
  const totals=Object.fromEntries(fields.map(field=>[field,money(rows.reduce((sum,row)=>sum.plus(row[field]),D(0)),p)])) as Record<typeof fields[number],string>;
  return {from,to,serviceFilter,rows,totals,incomplete:rows.some(r=>r.warnings.length>0)};
}
export function serviceReportCSV(p:Project,from:string,to:string,serviceFilter="",attentionOnly=false){
  const report=serviceBalanceReport(p,from,to,serviceFilter,attentionOnly);
  return csv([p.settings.language==="ru"?["Услуга","Счёт","Плательщик","На начало","Начислено","Корректировки","Оплачено","На конец","Проверка"]:["Serviciu","Cont","Plătitor","Sold inițial","Calculat","Ajustări","Achitat","Sold final","Verificare"],...report.rows.map(r=>[r.service,r.number,r.payer,r.opening,r.charges,r.adjustments,r.paid,r.closing,r.warnings.join("; ")]),[uiText("Итого, MDL","Total, MDL",p.settings.language),"","",report.totals.opening,report.totals.charges,report.totals.adjustments,report.totals.paid,report.totals.closing,""]]);
}
