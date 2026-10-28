import {projectSchema,type Project} from './model';
import {meterConnectedOn} from './meter-entry';
export type MeterDocument=Project['meter_documents'][number];
export function saveMeterDocument(p:Project,input:MeterDocument,post=false){
 const t=(ru:string,ro:string)=>p.settings.language==='ru'?ru:ro;
 if(input.state!=='draft'||p.meter_documents.some(d=>d.id===input.id&&d.state==='applied'))throw Error(t('Проведённый документ доступен только для просмотра.','Documentul aplicat poate fi doar vizualizat.'));
 const next=structuredClone(p),doc=structuredClone(input);
 if(post){
  if(p.closed_periods.some(m=>m>=doc.period))throw Error(t('Документ затрагивает закрытый период.','Documentul afectează o perioadă închisă.'));
  if(doc.date.slice(0,7)!==doc.period)throw Error(t('Дата должна входить в указанный период.','Data trebuie să aparțină perioadei indicate.'));
  if(!doc.rows.length||new Set(doc.rows.map(r=>r.meter_id)).size!==doc.rows.length)throw Error(t('Добавьте приборы без повторений.','Adăugați contoare fără duplicate.'));
  let changed=0;
  for(const row of doc.rows){
   const meter=next.meters.find(m=>m.id===row.meter_id);if(!meter)throw Error(t('Прибор учёта не найден.','Contorul nu a fost găsit.'));
   if(doc.kind==='status'){
    if(meter.active===row.active)continue;
    if(meter.status_history?.some(s=>s.date>=doc.date))throw Error(t('Поздний статус уже записан.','Există deja o stare ulterioară.'));
    meter.status_history=[...(meter.status_history||[{date:meter.installed_on||'0001-01-01',active:meter.active}]),{date:doc.date,active:row.active}];meter.active=row.active;meter.retired_on=row.active?null:doc.date;changed++;
   }else{
    if(!row.value.trim())continue;
    const readingDate=row.reading_date||doc.date;if(readingDate.slice(0,7)!==doc.period)throw Error(t('Дата показания должна входить в период документа.','Data indexului trebuie să aparțină perioadei documentului.'));
    if(doc.kind!=='initial'){if(!meterConnectedOn(meter,readingDate))throw Error(t('Прибор отключён на дату ввода показаний.','Contorul este deconectat la data introducerii indexului.'));}
    if(doc.kind!=='initial'&&meter.scope!==doc.kind)throw Error(t('Тип прибора не соответствует документу.','Tipul contorului nu corespunde documentului.'));
    next.meter_values.push({id:'reading-'+row.id,meter_id:row.meter_id,period:doc.period,reading_date:readingDate,value:row.value,kind:doc.kind==='initial'?'initial':'regular',notes:doc.comment});row.reading_id='reading-'+row.id;changed++;
   }
  }
  if(!changed)throw Error(t('В документе нет новых показаний или изменений статуса.','Documentul nu conține indexuri noi sau modificări de stare.'));
  doc.state='applied';
 }
 next.meter_documents=[...next.meter_documents.filter(d=>d.id!==doc.id),doc];return projectSchema.parse(next);
}
