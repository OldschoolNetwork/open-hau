<script lang="ts">
 import {languageOverrides} from "./localization";
 import type {Project,PaymentBatch} from './model';
 import {uid,today} from './model';
 import {previousPaymentMonth} from './payment-allocation';
 import {savePaymentBatch,unpostPaymentBatch,markPaymentBatch} from './payment-batches';
 import {displayDate} from './date-format';
 import {translator} from './i18n';
 import RecordToolbar from './RecordToolbar.svelte';
 export let project:Project;
 export let onapply:(p:Project)=>void;
 export let onedit:(draft:PaymentBatch)=>void;
 export let beforeChange:(id:string)=>Promise<boolean>=async()=>true;
 export let onmovements:(id:string)=>void;
 let selected='',filterOpen=false,search='',state='all',error='';
 $:t=translator(project.settings.language,$languageOverrides);
 $:current=project.payment_batches.find(b=>b.id===selected);
 $:rows=[...project.payment_batches].reverse().filter(b=>(state==='all'||b.state===state)&&[b.number,b.method,b.comment,b.date].join(' ').toLocaleLowerCase().includes(search.toLocaleLowerCase()));
 function create(){onedit({id:uid(),number:String(project.payment_batches.length+1),date:today(),billing_through:previousPaymentMonth(today()),balancing_service_id:project.settings.payment_balancing_service_id||'',method:'',comment:'',state:'draft',rows:[]});}
 function copy(){if(!current)return;onedit({...structuredClone(current),id:uid(),number:String(project.payment_batches.length+1),date:today(),state:'draft',imported:false,marked_for_deletion:false,rows:current.rows.map(r=>({...r,id:uid(),payment_id:null,historical_shares:undefined,source_automatic:undefined,source_advance:undefined}))});}
 async function action(kind:'post'|'unpost'|'mark'){if(!current)return;const id=current.id;try{if(!(await beforeChange(id)))return;const batch=project.payment_batches.find(b=>b.id===id)!;onapply(kind==='post'?savePaymentBatch(project,batch,true):kind==='unpost'?unpostPaymentBatch(project,id):markPaymentBatch(project,id));error='';}catch(e){error=e instanceof Error?e.message:String(e);}}
</script>
<div class="batch-list">
 <RecordToolbar language={project.settings.language} selected={!!current} onadd={create} oncopy={copy} onedit={()=>current&&onedit(structuredClone(current))} onrefresh={()=>{selected='';error='';}} onfilter={()=>filterOpen=!filterOpen} onclearfilter={()=>{search='';state='all';}} filterActive={!!search||state!=='all'} onremove={()=>action('mark')} removeLabel={current?.marked_for_deletion?t('Снять пометку удаления','Elimină marcajul de ștergere'):''} onpost={()=>action('post')} canPost={current?.state==='draft'&&!current?.marked_for_deletion} onunpost={()=>action('unpost')} canUnpost={current?.state==='applied'&&!current?.imported} onmovements={()=>current&&onmovements(current.id)}/>
 {#if filterOpen}<div class="filters"><label>{t('Поиск','Căutare')}<input bind:value={search}/></label><label>{t('Статус','Stare')}<select bind:value={state}><option value="all">{t('Все','Toate')}</option><option value="draft">{t('Черновики','Ciorne')}</option><option value="applied">{t('Проведённые','Aplicate')}</option></select></label></div>{/if}
 {#if error}<p role="alert" class="alert error">{error}</p>{/if}
 <div class="table-wrap"><table><thead><tr><th>{t('Дата','Data')}</th><th>{t('Номер','Număr')}</th><th>{t('Вариант оплаты','Modalitate de plată')}</th><th>{t('Комментарий','Comentariu')}</th><th>{t('Статус','Stare')}</th></tr></thead><tbody>{#each rows as b}<tr class:marked={b.marked_for_deletion} class:selected={selected===b.id} class:attention-row={b.state==='draft'} onclick={()=>selected=b.id} ondblclick={()=>onedit(structuredClone(b))}><td>{displayDate(b.date,project)}</td><td>{b.number}</td><td>{b.method}</td><td>{b.comment}</td><td>{b.marked_for_deletion?t('Помечен на удаление','Marcat pentru ștergere'):b.state==='applied'?t('Проведён','Aplicat'):t('Черновик','Ciornă')}</td></tr>{/each}</tbody></table></div>
 {#if !rows.length}<p>{t('Документов нет.','Nu există documente.')}</p>{/if}
</div>
<style>.batch-list{display:flex;flex-direction:column;gap:10px;padding:12px}.filters{display:flex;gap:14px}.filters label{display:flex;flex-direction:column;gap:5px}table{width:100%;border-collapse:collapse}th,td{padding:8px;text-align:left}th{background:#80808018}tr.selected{background:var(--accent);color:white}tbody tr{cursor:default}tr.marked{opacity:.6;text-decoration:line-through}</style>
