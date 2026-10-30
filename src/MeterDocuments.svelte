<script lang="ts">
import {translatedName} from './localization';

 import {languageOverrides} from "./localization";
 import {onDestroy} from 'svelte';
 import {reportEditorDirty} from './editor-drafts';
 import {uid,today,type Project} from './model';
 import {saveMeterDocument,type MeterDocument} from './meter-documents';
 import {entryPrevious,meterValueIndex,entryConsumption,meterConnectedOn,meterDocumentHistory} from './meter-entry';
 import {displayDate,displayPeriod} from './date-format';
 import {translator} from './i18n';
 import {openReportLookup} from './report-settings';
 import RecordToolbar from './RecordToolbar.svelte';
 import {Plus,Copy,Trash2,ArrowUp,ArrowDown,Users,Save,Check,X} from "./icons";
 export let editorId='';export let project:Project;export let kind:MeterDocument['kind'];export let initial:MeterDocument|null=null;
 export let onapply:(p:Project)=>void;export let onedit:(d:MeterDocument)=>void;export let onclose:()=>void;
 let draft=initial?structuredClone(initial):null,selected='',selectedRow='',error='',filterOpen=false,query='',service='';
 $:t=translator(project.settings.language,$languageOverrides);$:locked=draft?.state==='applied';
 $:allDocuments=meterDocumentHistory(project,kind);
 $:documents=allDocuments.filter(d=>(d.number+' '+d.comment+' '+d.date).toLocaleLowerCase().includes(query.toLocaleLowerCase()));
 $:current=allDocuments.find(d=>d.id===selected);
 $:allMeters=project.meters.filter(m=>kind==='initial'||kind==='status'||m.scope===kind);$:available=allMeters.filter(m=>!service||m.service_id===service);$:valueIndex=meterValueIndex(project);
 $:meterMap=new Map(project.meters.map(m=>[m.id,m]));$:accountMap=new Map(project.accounts.map(a=>[a.id,a]));
 function create(){onedit({id:uid(),number:String(project.meter_documents.length+1),date:today().slice(0,7)===project.settings.period?today():project.settings.period+'-01',period:project.settings.period,kind,state:'draft',comment:'',rows:[]});}
 function addMeters(ids?:Set<string>){if(!draft)return;const used=new Set(draft.rows.map(r=>r.meter_id));const meters=available.filter(m=>!used.has(m.id)&&(!ids||ids.has(m.account_id))&&(kind==='initial'||kind==='status'||meterConnectedOn(m,draft!.date)));draft.rows=[...draft.rows,...meters.map(m=>({id:uid(),meter_id:m.id,value:'',active:meterConnectedOn(m,draft!.date)}))];}
 function add(){const meter=available.find(m=>!draft?.rows.some(r=>r.meter_id===m.id));if(draft&&meter){const row={id:uid(),meter_id:meter.id,value:'',active:meterConnectedOn(meter,draft.date)};draft.rows=[...draft.rows,row];selectedRow=row.id;}}
 function pick(){openReportLookup({id:editorId+'-accounts',label:t('Лицевые счета','Conturi personale'),kind:'accounts',items:[],selected:[],multiple:true,onchoose:ids=>{if(draft&&draft.state==='draft')addMeters(new Set(ids));}});}
 function move(direction:number){if(!draft)return;const rows=[...draft.rows],index=rows.findIndex(r=>r.id===selectedRow),target=index+direction;if(index<0||target<0||target>=rows.length)return;[rows[index],rows[target]]=[rows[target],rows[index]];draft.rows=rows;}
 function copyRow(){if(!draft)return;const row=draft.rows.find(r=>r.id===selectedRow);if(row){const copy={...row,id:uid(),reading_id:undefined};draft.rows=[...draft.rows,copy];selectedRow=copy.id;}}
 function save(post=false,close=false){if(!draft)return;try{const next=saveMeterDocument(project,draft,post);onapply(next);draft=structuredClone(next.meter_documents.find(d=>d.id===draft!.id)!);error='';savedDraft=JSON.stringify(draft);reportEditorDirty(editorId,false);if(close)onclose();}catch(e){error=e instanceof Error?e.message:String(e);}}
 function postCurrent(){if(current)try{onapply(saveMeterDocument(project,current,true));error='';}catch(e){error=e instanceof Error?e.message:String(e);}}
 function copyDocument(){if(current)onedit({...structuredClone(current),id:uid(),number:String(project.meter_documents.length+1),date:today(),period:today().slice(0,7),state:'draft',rows:current.rows.map(r=>({...r,id:uid(),reading_date:undefined,reading_id:undefined}))});}
 let savedDraft=JSON.stringify(draft);
 $:reportEditorDirty(editorId,!!draft&&draft.state==='draft'&&(!project.meter_documents.some(d=>d.id===draft!.id)||JSON.stringify(draft)!==savedDraft));
 onDestroy(()=>reportEditorDirty(editorId,false));
</script>
<div class="meter-documents">
 {#if error}<p class="alert error" role="alert">{error}</p>{/if}
 {#if !draft}
  <RecordToolbar language={project.settings.language} selected={!!current} onadd={create} onedit={()=>current&&onedit(structuredClone(current))} oncopy={copyDocument} onrefresh={()=>{selected='';error='';}} onfilter={()=>filterOpen=!filterOpen} onclearfilter={()=>query=''} filterActive={!!query} onpost={postCurrent} canPost={current?.state==='draft'}/>
  {#if filterOpen}<label>{t('Отбор по дате, номеру, комментарию','Filtru după dată, număr, comentariu')}<input bind:value={query}/></label>{/if}
  <div class="table-wrap"><table><thead><tr><th>{t('Дата','Data')}</th><th>{t('Номер','Număr')}</th><th>{t('Комментарий','Comentariu')}</th><th>{t('Период','Perioada')}</th><th>{t('Статус','Stare')}</th></tr></thead><tbody>{#each documents as doc}<tr class:selected={selected===doc.id} class:attention-row={doc.state==='draft'} onclick={()=>selected=doc.id} ondblclick={()=>onedit(structuredClone(doc))}><td>{displayDate(doc.date,project)}</td><td>{doc.number}</td><td>{doc.comment}</td><td>{displayPeriod(doc.period,project)}</td><td>{doc.state==='applied'?t('Проведён','Aplicat'):t('Черновик','Ciornă')}</td></tr>{/each}</tbody></table></div>
  {#if !documents.length}<p class="empty-state">{project.meters.length?t('Документов пока нет. Добавьте документ и нажмите «Заполнить» для ввода показаний.','Nu există documente. Adăugați un document și apăsați „Completează” pentru introducerea indexurilor.'):t('В этой базе нет физических приборов учёта. Откройте базу, содержащую приборы, или добавьте их в справочник.','Această bază nu conține contoare fizice. Deschideți o bază cu contoare sau adăugați-le în catalog.')}</p>{/if}
 {:else}
  <fieldset disabled={locked}>
   <div class="document-header"><label>{t('Дата','Data')}<input type="date" bind:value={draft.date}/></label><label>{t('Номер','Număr')}<input bind:value={draft.number}/></label><label>{t('Период','Perioada')}<input type="month" bind:value={draft.period}/></label></div>
   <div class="line-toolbar" role="toolbar" aria-label={t('Строки документа','Rânduri document')}>
    <button title={t('Добавить','Adaugă')} onclick={add}><Plus size={17}/></button><button disabled={!selectedRow} title={t('Копировать строку','Copiază rândul')} onclick={copyRow}><Copy size={17}/></button><button disabled={!selectedRow} title={t('Удалить строку','Elimină rândul')} onclick={()=>{if(draft)draft.rows=draft.rows.filter(r=>r.id!==selectedRow);selectedRow='';}}><Trash2 size={17}/></button>
    <button disabled={!selectedRow} title={t('Вверх','Sus')} onclick={()=>move(-1)}><ArrowUp size={17}/></button><button disabled={!selectedRow} title={t('Вниз','Jos')} onclick={()=>move(1)}><ArrowDown size={17}/></button>
    <button onclick={pick}><Users size={16}/>{t('Подбор','Selectare')}</button><button onclick={()=>addMeters()}><Plus size={16}/>{t('Заполнить','Completează')}</button><button onclick={()=>{if(draft)draft.rows=[];selectedRow='';}}><X size={16}/>{t('Очистить','Golește')}</button>
    <label class="service-filter">{t('Услуга','Serviciu')}<select bind:value={service}><option value="">{t('Все','Toate')}</option>{#each project.services as s}<option value={s.id}>{translatedName(s.name,project.settings.language,$languageOverrides)}</option>{/each}</select></label>
   </div>
  </fieldset>
  <div class="table-wrap readings-table"><table><thead><tr><th>№</th><th>{t('Лицевой счёт','Cont personal')}</th><th>{t('Прибор учёта','Contor')}</th>{#if kind==='status'}<th>{t('Подключён','Conectat')}</th>{:else}<th>{t('Предыдущее показание','Index precedent')}</th><th>{t('Показание','Index')}</th><th>{t('Разница','Diferență')}</th><th>{t('Дата показания','Data indexului')}</th>{/if}</tr></thead><tbody>
   {#each draft.rows as row,i (row.id)}{@const meter=meterMap.get(row.meter_id)}{@const account=accountMap.get(row.account_id||meter?.account_id||'')}{@const previous=entryPrevious(project,row.meter_id,row.reading_date||draft.date,row.reading_id,valueIndex)}{@const delta=entryConsumption(previous,row.value)}
    <tr class:selected={selectedRow===row.id} class:attention-row={!locked&&kind!=='status'&&(!row.value.trim()||delta?.startsWith('-'))} onclick={()=>selectedRow=row.id}><td>{i+1}</td><td><span>{account?account.number+', '+account.payer_name:'—'}</span></td><td>{#if locked}<span>{meter?.label||'—'} {meter?.serial_number||''}</span>{:else}<select aria-label={t('Прибор учёта строки ','Contorul rândului ')+(i+1)} bind:value={row.meter_id}>{#each allMeters as item}<option value={item.id}>{item.label} {item.serial_number}</option>{/each}</select>{/if}</td>
    {#if kind==='status'}<td><input disabled={locked} type="checkbox" aria-label={t('Подключён','Conectat')} bind:checked={row.active}/></td>{:else}<td class="numeric">{previous??'—'}</td><td>{#if locked}<span>{row.value}</span>{:else}<input aria-label={t('Показание строки ','Indexul rândului ')+(i+1)} bind:value={row.value}/>{/if}</td><td class="numeric">{delta??'—'}</td><td>{#if locked}{displayDate(row.reading_date||draft.date,project)}{:else}<input type="date" aria-label={t('Дата показания строки ','Data indexului din rândul ')+(i+1)} value={row.reading_date||draft.date} onchange={e=>row.reading_date=e.currentTarget.value}/>{/if}</td>{/if}</tr>
   {/each}
  </tbody></table></div>
  {#if !draft.rows.length}<p class="empty-state">{available.length?t('Нажмите «Заполнить» или выберите лицевые счета через «Подбор».','Apăsați „Completează” sau selectați conturi prin „Selectare”.'):t('Приборы учёта не найдены в выбранной базе или по выбранной услуге.','Nu s-au găsit contoare în baza sau pentru serviciul selectat.')}</p>{/if}
  <label>{t('Комментарий','Comentariu')}<input disabled={locked} bind:value={draft.comment}/></label>
  <footer>{#if !locked}<button class="button" onclick={()=>save(true,true)}><Check size={16}/>OK</button><button class="button secondary" onclick={()=>save()}><Save size={16}/>{t('Сохранить','Salvează')}</button>{/if}<button class="button secondary" onclick={onclose}><X size={16}/>{t('Закрыть','Închide')}</button></footer>
 {/if}
</div>
<style>
 .meter-documents{display:flex;flex-direction:column;gap:10px;padding:12px;min-width:0}fieldset{border:0;padding:0;display:flex;flex-direction:column;gap:12px;min-width:0}.document-header{display:flex;gap:12px;flex-wrap:wrap}label{display:flex;flex-direction:column;gap:6px}.line-toolbar,footer{display:flex;align-items:center;gap:4px;flex-wrap:wrap}.line-toolbar button{display:flex;align-items:center;gap:5px;min-height:32px;background:transparent;color:var(--text);border:0;padding:5px 7px}.line-toolbar button:hover{background:var(--hover)}.service-filter{margin-left:auto;flex-direction:row;align-items:center}.service-filter select{max-width:230px}footer{justify-content:flex-end;gap:8px;padding-top:12px}.table-wrap{overflow:auto;min-width:0}table{width:100%;border-collapse:collapse}th,td{padding:7px;text-align:left}th{background:var(--surface);position:sticky;top:0;z-index:1}.readings-table{max-height:50vh}.readings-table table{min-width:850px}.readings-table th:nth-child(2){width:25%}td select,td input:not([type=checkbox]){width:100%;min-width:95px;box-sizing:border-box}.selected{background:#489bcb30}.numeric{text-align:right;font-variant-numeric:tabular-nums}.empty-state{color:var(--muted);padding:12px 0}
</style>
