import type {Project,Account} from './model';import {charges,money,D,monthNext} from './engine';
export const monthLastDay=(month:string)=>{const d=new Date(monthNext(month)+'-01T00:00:00Z');d.setUTCDate(0);return d.toISOString().slice(0,10);};
export function reportRange(from:string,to:string){const full=(value:string,end:boolean)=>/^\d{4}-(0[1-9]|1[0-2])$/.test(value)?(end?monthLastDay(value):value+'-01'):value;const fromDate=full(from,false),toDate=full(to,true);for(const value of [fromDate,toDate]){const date=new Date(value+'T00:00:00Z');if(!/^\d{4}-(0[1-9]|1[0-2])-\d{2}$/.test(value)||isNaN(date.getTime())||date.toISOString().slice(0,10)!==value)throw Error('Invalid report period range');}if(fromDate>toDate)throw Error('Invalid report period range');return {fromDate,toDate,fromMonth:fromDate.slice(0,7),toMonth:toDate.slice(0,7)};}
export function chargeEventIndex(p:Project){const index=new Map<string,Project['charge_events']>();for(const event of p.charge_events){const key=event.account_id+'|'+event.period;const group=index.get(key)||[];group.push(event);index.set(key,group);}return index;}
export function monthChargeEvents(p:Project,a:Account,month:string,postedOnly=false,index?:ReturnType<typeof chargeEventIndex>){
 const saved=p.snapshots.find(s=>s.account_id===a.id&&s.period===month),dated=index?index.get(a.id+'|'+month)||[]:p.charge_events.filter(e=>e.account_id===a.id&&e.period===month);
 if(saved&&dated.length)return dated;
 const calculated=saved||charges(p,a,month),date=monthLastDay(month);
 const result:Project['charge_events']=(postedOnly&&!saved?[]:calculated.lines.map(l=>({account_id:a.id,service_id:l.service_id,period:month,date,kind:'charge' as const,amount:l.amount})));
 const shares=p.service_accounting.adjustments.filter(s=>s.account_id===a.id&&s.period===month),datedAdjustments=p.adjustments.filter(r=>r.account_id===a.id&&r.period===month&&r.date);let assigned=D(0);
 const byService=new Map<string,ReturnType<typeof D>>();
 for(const row of datedAdjustments){result.push({account_id:a.id,service_id:row.service_id||'',period:month,date:row.date!,kind:'adjustment',amount:row.amount});assigned=assigned.plus(row.amount);byService.set(row.service_id||'',(byService.get(row.service_id||'')||D(0)).plus(row.amount));}
 for(const share of shares){const rest=D(share.amount).minus(byService.get(share.service_id)||0);if(!rest.isZero())result.push({...share,amount:money(rest,p),date,kind:'adjustment'});assigned=assigned.plus(rest);}
 const remainder=D(calculated.adjustment).minus(assigned);if(!remainder.isZero())result.push({account_id:a.id,service_id:'',period:month,date,kind:'adjustment',amount:money(remainder,p)});
 return result;
}
