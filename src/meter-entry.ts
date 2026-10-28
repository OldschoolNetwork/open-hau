import Decimal from 'decimal.js';
import type {Project,PhysicalMeter,PhysicalMeterValue} from './model';
import type {MeterDocument} from './meter-documents';

export function meterConnectedOn(meter:PhysicalMeter,date:string){
 if(meter.installed_on&&meter.installed_on>date)return false;
 if(meter.status_history?.length)return [...meter.status_history].filter(s=>s.date<=date).sort((a,b)=>b.date.localeCompare(a.date))[0]?.active??false;
 return meter.active&&(!meter.retired_on||meter.retired_on>=date);
}
export function meterValueIndex(p:Project){const result=new Map<string,PhysicalMeterValue[]>();for(const value of p.meter_values){const rows=result.get(value.meter_id)||[];rows.push(value);result.set(value.meter_id,rows);}return result;}
export function entryPrevious(p:Project,meterId:string,date:string,readingId?:string,index?:Map<string,PhysicalMeterValue[]>){
 const meter=p.meters.find(m=>m.id===meterId);
 const previous=(index?index.get(meterId)||[]:p.meter_values).filter(v=>v.meter_id===meterId&&v.id!==readingId&&(v.reading_date<date||(v.kind==='initial'&&v.reading_date===date))).sort((a,b)=>b.reading_date.localeCompare(a.reading_date))[0];
 return previous?.value??(meter?.installed_on&&meter.installed_on<=date?meter.initial_value:null);
}
export function entryConsumption(previous:string|null,current:string){try{return previous===null||!current.trim()?null:new Decimal(current).minus(previous).toFixed();}catch{return null;}}

// Older portable files contain readings without their document headers.
// Expose those records as explicitly labelled, read-only history groups.
export function meterDocumentHistory(p:Project,kind:MeterDocument['kind']):MeterDocument[]{
 const actual=p.meter_documents.filter(d=>d.kind===kind),claimed=new Set(p.meter_documents.flatMap(d=>d.rows.map(r=>r.reading_id||'reading-'+r.id)));
 if(kind==='status')return actual;
 const meters=new Map(p.meters.map(m=>[m.id,m])),groups=new Map<string,MeterDocument>();
 for(const reading of p.meter_values){
  const meter=meters.get(reading.meter_id);if(!meter||claimed.has(reading.id))continue;
  if(kind==='initial'?reading.kind!=='initial':reading.kind==='initial'||meter.scope!==kind)continue;
  const key=`history:${kind}:${reading.reading_date}:${meter.service_id}`;
  let group=groups.get(key);if(!group){group={id:key,number:'—',date:reading.reading_date,period:reading.period,kind,state:'applied',comment:p.settings.language==='ru'?'История показаний':'Istoricul citirilor',rows:[]};groups.set(key,group);}
  group.rows.push({id:reading.id,meter_id:meter.id,value:reading.value,active:meterConnectedOn(meter,reading.reading_date),reading_date:reading.reading_date,reading_id:reading.id});
 }
 return [...actual,...groups.values()].sort((a,b)=>b.date.localeCompare(a.date));
}
