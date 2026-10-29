import type {Project,Account} from './model';
import Decimal from 'decimal.js';
export function benefitHistory(p:Project){
 const docs=p.administration.documents.filter(d=>d.state==='applied');
 const ended=new Map<string,string>();for(const doc of docs.filter(d=>d.kind==='end-benefits'))for(const row of doc.rows)if(!ended.has(row.benefit_id)||row.effective_from<ended.get(row.benefit_id)!)ended.set(row.benefit_id,row.effective_from);
 return docs.filter(d=>d.kind==='grant-benefits').flatMap(doc=>doc.rows.map(row=>({...row,document_id:doc.id,document_date:doc.date,terminated_on:ended.get(row.id)||null,end_date:ended.get(row.id)&&(!row.until||ended.get(row.id)!<=row.until)?ended.get(row.id)!:row.until})));
}
export function activeBenefits(p:Project,on:string){return benefitHistory(p).filter(row=>row.effective_from<=on&&(!row.until||row.until>=on)&&(!row.terminated_on||row.terminated_on>on));}
export function buildingServices(p:Project,buildingId:string,on:string){const latest=new Map<string,{service_id:string;tariff_type_id:string;active:boolean;effective_from:string}>();for(const doc of p.administration.documents.filter(d=>d.kind==='building-services'&&d.state==='applied'&&d.building_id===buildingId).sort((a,b)=>a.date.localeCompare(b.date)))for(const row of doc.rows.filter(r=>r.effective_from<=on).sort((a,b)=>a.effective_from.localeCompare(b.effective_from)))if(!latest.has(row.service_id)||latest.get(row.service_id)!.effective_from<=row.effective_from)latest.set(row.service_id,row);return [...latest.values()];}
export function billingServices(p:Project,a:Account,month:string,base:string[]){const property=p.reference_catalogs.properties?.find(r=>r.id===(a.property_id||a.custom_fields.property_id)),building=property?.attributes.building_id;if(!building)return base;const result=new Set(base);for(const row of buildingServices(p,building,month+'-31')){const personal=p.account_history.services.filter(r=>r.account_id===a.id&&r.service_id===row.service_id&&r.date<=month+'-31').sort((a,b)=>b.date.localeCompare(a.date))[0];const active=personal&&personal.date>=row.effective_from?personal.active:row.active;active?result.add(row.service_id):result.delete(row.service_id);}return [...result];}
export function benefitAmounts(p:Project,accountId:string,period:string,lines:{service_id:string;amount:string}[]){
 const [year,month]=period.split('-').map(Number),days=new Date(Date.UTC(year,month,0)).getUTCDate(),first=period+'-01',last=period+'-'+String(days).padStart(2,'0');
 const round=(d:Decimal)=>d.toDecimalPlaces(2,p.settings.rounding==='half_even'?Decimal.ROUND_HALF_EVEN:Decimal.ROUND_HALF_UP);
 const benefits=benefitHistory(p).filter(b=>b.account_id===accountId&&b.effective_from<=last&&(!b.until||b.until>=first)&&(!b.terminated_on||b.terminated_on>first));
 const result:{service_id:string;amount:string}[]=[];
 for(const sid of new Set(benefits.map(b=>b.service_id))){const base=Decimal.max(0,lines.filter(l=>l.service_id===sid).reduce((sum,l)=>sum.plus(l.amount),new Decimal(0))),dailyBase=base.div(days);let total=new Decimal(0);
  for(let day=1;day<=days;day++){const date=period+'-'+String(day).padStart(2,'0');let highest=new Decimal(0),added=new Decimal(0);
   for(const benefit of benefits.filter(b=>b.service_id===sid)){const active=(on:string)=>benefit.effective_from<=on&&(!benefit.until||benefit.until>=on)&&(!benefit.terminated_on||benefit.terminated_on>on);if(benefit.proration==='first-day'?!active(first):benefit.proration==='daily'?!active(date):false)continue;
    const full=benefit.method==='percent'?base.times(benefit.rate).div(100):new Decimal(benefit.amount),value=Decimal.max(0,full).div(days);if(benefit.combination==='add')added=added.plus(value);else highest=Decimal.max(highest,value);
   }total=total.plus(Decimal.min(dailyBase,highest.plus(added)));
  }const amount=round(Decimal.min(base,total)).negated();if(!amount.isZero())result.push({service_id:sid,amount:amount.toFixed(2)});
 }return result;
}
