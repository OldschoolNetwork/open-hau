import type {Project} from './model';
import {displayDate,displayPeriod} from './date-format';
import {citizenName,statusLabel} from './account-data';
import {D} from './engine';
export type RegisterRow={date:string;accountId:string;values:string[];attention?:boolean;monthly?:boolean;filterValues?:string[]};
export type RegisterTable={headers:string[];rows:RegisterRow[];numericStart:number;numericCount:number;numberFormat?:string;dateColumns?:number[]};
export const informationViews:Record<string,string>={'information-0':'additional','information-2':'registered','information-4':'tariffs','information-7':'holders','information-9':'individual-readings','information-10':'shared-readings','information-11':'shared-users','information-13':'residents','information-16':'relationships','information-17':'individual-status','information-18':'shared-status','information-20':'account-services'};
export const accumulationViews:Record<string,string>={'accumulation-2':'charges','accumulation-3':'individual-consumption','accumulation-4':'shared-consumption','accumulation-5':'service-volume'};
export function registerTable(p:Project,kind:string):RegisterTable{
 const t=(ru:string,ro:string)=>p.settings.language==='ru'?ru:ro,account=(id:string)=>p.accounts.find(a=>a.id===id)?.number||'',service=(id:string)=>p.services.find(s=>s.id===id)?.name[p.settings.language]||id,yes=(active:boolean)=>active?t('Подключён','Conectat'):t('Не подключён','Deconectat'),day=(date:string)=>displayDate(date,p);
 let headers:string[]=[],rows:RegisterRow[]=[],numericStart=0,numericCount=0,numberFormat='#,##0.####';
 const add=(date:string,accountId:string,values:string[],attention=false,monthly=false)=>rows.push({date,accountId,values,attention,monthly});
 if(kind==='registered'){
  headers=[t('Дата','Data'),t('Гражданин','Cetățean'),t('Объект учёта','Obiect'),t('Дата начала','Data începerii'),t('Дата окончания','Data încheierii'),t('Вид регистрации','Tip înregistrare')];
  for(const row of p.account_history.residents.filter(r=>r.kind==='registration')){const a=p.accounts.find(a=>a.id===row.account_id),property=p.reference_catalogs.properties?.find(r=>r.id===a?.property_id)?.name||a?.address||'';const values=[row.date,citizenName(p,row.citizen_id),property,row.from,row.to||'',statusLabel(row.status,'registration',p.settings.language==='ro')];rows.push({date:row.date,accountId:row.account_id,filterValues:values,values:values.map((v,i)=>[0,3,4].includes(i)&&v?day(v):v)});}
 }else if(kind==='residents'){
  headers=[t('Дата записи','Data înregistrării'),t('Лицевой счёт','Cont personal'),t('Гражданин','Cetățean'),t('Статус','Stare'),t('Начало','Început'),t('Окончание','Sfârșit')];
  for(const row of p.account_history.residents.filter(r=>r.kind==='residence'))add(row.date,row.account_id,[day(row.date),account(row.account_id),citizenName(p,row.citizen_id),statusLabel(row.status,'residence',p.settings.language==='ro'),day(row.from),row.to?day(row.to):'']);
 }else if(kind==='holders'){
  headers=[t('Дата','Data'),t('Лицевой счёт','Cont personal'),t('Ответственный','Titular')];for(const row of p.account_history.holders)add(row.date,row.account_id,[day(row.date),account(row.account_id),row.name||citizenName(p,row.citizen_id)]);
 }else if(kind==='additional'){
  headers=[t('Дата','Data'),t('Лицевой счёт','Cont personal'),t('Объект учёта','Obiect'),t('Статус','Stare')];for(const row of p.account_history.additional)add(row.date,row.account_id,[day(row.date),account(row.account_id),p.reference_catalogs.properties?.find(r=>r.id===row.property_id)?.name||row.property_id,yes(row.active)]);
 }else if(kind==='account-services'){
  headers=[t('Дата','Data'),t('Лицевой счёт','Cont personal'),t('Услуга','Serviciu'),t('Вид тарифа','Tip tarif'),t('Статус','Stare')];for(const row of p.account_history.services)add(row.date,row.account_id,[day(row.date),account(row.account_id),service(row.service_id),p.reference_catalogs['tariff-types']?.find(r=>r.id===row.tariff_type_id)?.name||'',yes(row.active)]);
 }else if(kind==='relationships'){
  headers=[t('Дата','Data'),t('Гражданин','Cetățean'),t('Член семьи','Membru familie'),t('Родство','Rudenie')];for(const row of p.account_history.relationships)add(row.date,'',[day(row.date),citizenName(p,row.citizen_id),citizenName(p,row.relative_id),p.reference_catalogs.relationships?.find(r=>r.id===row.relationship_id)?.name||'']);
 }else if(kind==='tariffs'){
  headers=[t('Дата','Data'),t('Услуга','Serviciu'),t('Вид тарифа','Tip tarif'),t('Тариф','Tarif'),t('Тариф сверх','Tarif suplimentar')];numericStart=3;numericCount=2;for(const row of p.tariffs)add(row.effective_from,'',[day(row.effective_from),service(row.service_id),'',row.rate,'']);
 }else if(kind==='shared-users'){
  headers=[t('Дата','Data'),t('Лицевой счёт','Cont personal'),t('Коллективный прибор','Contor comun'),t('Статус','Stare')];for(const meter of p.meters.filter(m=>m.scope==='shared'))for(const link of meter.account_links||[])add(link.date,link.account_id,[day(link.date),account(link.account_id),meter.label,yes(link.active)]);
 }else if(kind.endsWith('-status')){
  headers=[t('Дата','Data'),t('Лицевой счёт','Cont personal'),t('Прибор учёта','Contor'),t('Статус','Stare')];const scope=kind.startsWith('shared')?'shared':'individual';for(const meter of p.meters.filter(m=>m.scope===scope)){for(const row of meter.status_history||[])add(row.date,meter.account_id,[day(row.date),account(meter.account_id),meter.label,yes(row.active)]);}
 }else if(kind.endsWith('-readings')||kind.endsWith('-consumption')){
  const consumption=kind.endsWith('-consumption'),scope=kind.startsWith('shared')?'shared':'individual';headers=[t('Дата показания','Data indexului'),t('Лицевой счёт','Cont personal'),t('Прибор учёта','Contor'),t('Услуга','Serviciu'),t('Предыдущее','Precedent'),t('Последнее','Curent'),t('Разность','Diferență')];numericStart=4;numericCount=3;
  const byMeter=new Map<string,Project['meter_values']>();for(const value of p.meter_values){const list=byMeter.get(value.meter_id)||[];list.push(value);byMeter.set(value.meter_id,list);}
  const initialIds=new Set(p.meter_documents.filter(d=>d.kind==='initial'&&d.state==='applied').flatMap(d=>d.rows.map(r=>r.reading_id).filter(Boolean)));
  const isInitial=(value:Project['meter_values'][number])=>value.kind==='initial'||initialIds.has(value.id);
  for(const meter of p.meters.filter(m=>m.scope===scope)){let previous:string|null=meter.installed_on?meter.initial_value:null,previousDate='',previousRegular=false;for(const value of (byMeter.get(meter.id)||[]).sort((a,b)=>a.reading_date.localeCompare(b.reading_date)||Number(isInitial(b))-Number(isInitial(a)))){const initial=isInitial(value),difference=initial||previous===null?'':D(value.value).minus(previous).toFixed(),ambiguous=previousRegular&&previousDate===value.reading_date;if(!consumption||!initial)add(value.reading_date,meter.account_id,[day(value.reading_date),account(meter.account_id),meter.label,service(meter.service_id),initial?'':previous||'',value.value,difference],!initial&&(previous===null||ambiguous||!!difference&&D(difference).lt(0)));previous=value.value;previousDate=value.reading_date;previousRegular=!initial;}}

 }else if(kind==='charges'||kind==='service-volume'){
  headers=[t('Расчётный месяц','Luna de calcul'),t('Лицевой счёт','Cont personal'),t('Услуга','Serviciu'),kind==='charges'?t('Начислено','Calculat'):t('Объём','Volum')];numericStart=3;numericCount=1;if(kind==='charges')numberFormat='#,##0.00';for(const snapshot of p.snapshots)for(const line of snapshot.lines)add(snapshot.period+'-01',snapshot.account_id,[displayPeriod(snapshot.period,p),account(snapshot.account_id),line.name[p.settings.language],kind==='charges'?line.amount:line.quantity],false,true);
 }else throw Error(t('Регистр не поддерживается.','Registrul nu este acceptat.'));
 if(kind==='individual-readings'){
  headers=[t('Дата','Data'),t('Прибор учёта','Contor'),t('Показание','Index')];
  rows=rows.map(row=>({...row,values:[row.values[0],row.values[2],row.values[5]]}));numericStart=2;numericCount=1;
 }
 return {headers,rows,numericStart,numericCount,numberFormat,dateColumns:kind==='registered'?[0,3,4]:[0]};
}
export function registerRowInRange(row:RegisterRow,from:string,to:string){if(row.monthly)return (!from||row.date.slice(0,7)>=from.slice(0,7))&&(!to||row.date.slice(0,7)<=to.slice(0,7));return (!from||row.date>=from)&&(!to||row.date<=to);}
