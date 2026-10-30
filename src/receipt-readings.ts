import type {Project} from './model';import {unitLabel} from './model';
import {selectedReceiptReadings} from './receipt-content';import {displayDate} from './date-format';import {englishReceiptName} from './receipt-language';
const e=(value:unknown)=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function receiptReadingsMarkup(project:Project,accountId:string,period:string,original=false){
 const content=project.settings.receipt_content,language=project.settings.receipt_language;
 const rows=selectedReceiptReadings(project,accountId,period),identity=content.labels!=='none'||content.serial;
 if(!rows.length||!identity&&!content.previous&&!content.current&&!content.consumption)return '';
 const t=(ru:string,ro:string,en:string)=>language==='en'?en:language==='ru'?ru:language==='both'?ru+' / '+ro:ro;
 const date=(value:string|null)=>content.dates?e(displayDate(value,project,language)):'';
 const table=`<table${original?' class="original-readings"':''}><thead><tr>${identity?`<th>${e(content.labels==='none'?t('Номер прибора','Număr contor','Meter number'):t('Прибор / услуга','Contor / serviciu','Meter / service'))}</th>`:''}${content.previous?`<th class="num">${e(t('Предыдущие','Precedent','Previous'))}</th>${content.dates&&!original?`<th>${e(t('Дата','Data','Date'))}</th>`:''}`:''}${content.current?`<th class="num">${e(t('Последние','Ultimul','Latest'))}</th>${content.dates&&!original?`<th>${e(t('Дата','Data','Date'))}</th>`:''}`:''}${content.consumption?`<th class="num">${e(t('Расход','Consum','Consumption'))}</th>`:''}</tr></thead><tbody>${rows.map(row=>{
  const service=project.services.find(s=>s.id===row.service_id),name=service?(language==='en'?englishReceiptName(service.name):t(service.name.ru,service.name.ro,service.name.en||service.name.ro)):row.label;
  const label=content.labels==='none'?'':content.labels==='service'?name:row.label;
  return `<tr>${identity?`<td>${e(label)}${content.serial&&row.serial_number?`${label?'<br>':''}<small>${e(row.serial_number)}</small>`:''}</td>`:''}${content.previous?`<td class="num">${e(row.previous??'—')}${original&&content.dates?`<small>${date(row.previous_date)}</small>`:''}</td>${content.dates&&!original?`<td>${date(row.previous_date)}</td>`:''}`:''}${content.current?`<td class="num">${e(row.current??'—')}${original&&content.dates?`<small>${date(row.reading_date)}</small>`:''}</td>${content.dates&&!original?`<td>${date(row.reading_date)}</td>`:''}`:''}${content.consumption?`<td class="num">${e(row.consumption??'—')} ${e(unitLabel(row.unit,language))}</td>`:''}</tr>`;
 }).join('')}</tbody></table>`;
 if(original)return `<h3>${e(t('Показания счётчиков','Indexuri contoare','Meter readings'))}</h3>${table}`;
 return `<section class="r-meter-readings"><h2>${e(t('Показания счётчиков','Indexurile contoarelor','Meter readings'))}</h2>${table}${content.note?`<p class="r-footer">${e(t('Показания показаны отдельно от расчётного объёма.','Indexurile sunt afișate separat de volumul facturat.','Meter readings are shown separately from billed quantities.'))}${content.dates?' '+e(t('Дата отсутствует, если она не была записана.','Data lipsește dacă nu a fost înregistrată.','Dates are omitted when not recorded.')):''}</p>`:''}</section>`;
}
