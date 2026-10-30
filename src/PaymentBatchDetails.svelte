<script lang="ts">
 import {languageOverrides} from "./localization";
 import {onDestroy} from 'svelte';
 import {reportEditorDirty} from './editor-drafts';
 import type {Project} from './model';
 import {D} from './engine';
 import {previewBatchRow,type PaymentDetailRequest} from './payment-batches';
 import type {PaymentShare} from './payment-allocation';
 import {translator} from './i18n';
 import {Check,RefreshCw,X} from "./icons";
 export let project:Project;export let request:PaymentDetailRequest;export let editorId:string;export let onclose:()=>void;
 const original=request.batch.rows.find(r=>r.id===request.rowId)!;
 let amount=original.amount,automatic=original.source_automatic??original.manual_maintenance===null,manual=original.manual_maintenance||'',shares:PaymentShare[]=[],error='';
 const baseline=JSON.stringify({amount,automatic,manual});
 $:t=translator(project.settings.language,$languageOverrides);$:locked=request.batch.state==='applied';
 $:account=project.accounts.find(a=>a.id===original.account_id);
 $:total=shares.reduce((sum,row)=>sum.plus(row.amount),D(0)).toFixed(2);
 $:reportEditorDirty(editorId,!locked&&JSON.stringify({amount,automatic,manual})!==baseline);
 onDestroy(()=>reportEditorDirty(editorId,false));
 function calculate(){try{shares=request.batch.state==='applied'?(original.historical_shares||project.service_accounting.payments.filter(s=>s.payment_id===original.payment_id).map(({service_id,amount})=>({service_id,amount}))):previewBatchRow(project,request.batch,{...original,amount,manual_maintenance:automatic?null:manual});error='';return true;}catch(e){shares=[];error=e instanceof Error?e.message:String(e);return false;}}
 function toggle(){if(automatic){if(!calculate())return;manual=shares.find(s=>s.service_id===request.batch.balancing_service_id)?.amount||'0.00';automatic=false;}else{automatic=true;manual='';}calculate();}
 function apply(){if(!calculate())return;try{request.onapply(amount,automatic?null:manual);reportEditorDirty(editorId,false);onclose();}catch(e){error=e instanceof Error?e.message:String(e);}}
 calculate();
</script>
<div class="payment-details">
 {#if error}<p class="alert error" role="alert">{error}</p>{/if}
 <label class="field"><span>{t('Лицевой счёт','Cont personal')}</span><input readonly value={(account?.number||'')+', '+(account?.payer_name||'')}/></label>
 <div class="field"><span>{t('Адрес','Adresă')}</span><span>{account?.address||'—'}</span></div>
 <label class="field"><span>{t('Сумма оплаты','Suma plății')}</span><input disabled={locked} bind:value={amount} oninput={()=>shares=[]}/></label>
 <label class="check"><input type="checkbox" disabled={locked} checked={automatic} onchange={toggle}/>{t('Распределять оплату автоматически','Repartizează plata automat')}</label>
 <div class="field"><span>{t('Способ распределения','Metodă de repartizare')}</span><span>{request.batch.imported?t('Сохранённое распределение','Repartizare păstrată'):automatic?t('Пропорционально долгу по услугам','Proporțional datoriei pe servicii'):t('Обслуживание вручную, остальные услуги — по долгу','Deservire manuală, celelalte servicii — după datorie')}</span></div>
 <div class="commands"><button class="button secondary" disabled={locked} onclick={calculate}><RefreshCw size={16}/>{t('Распределить','Repartizează')}</button></div>
 <div class="table-wrap"><table><thead><tr><th>№</th><th>{t('Услуга','Serviciu')}</th><th>{t('Оплата услуг','Plată servicii')}</th></tr></thead><tbody>{#each shares as row,i}<tr><td>{i+1}</td><td>{project.services.find(s=>s.id===row.service_id)?.name[project.settings.language]||'—'}</td><td>{#if !locked&&!automatic&&row.service_id===request.batch.balancing_service_id}<input aria-label={t('Оплата обслуживания дома','Plata deservirii blocului')} bind:value={manual}/>{:else}{row.amount}{/if}</td></tr>{/each}</tbody></table></div>
 {#if !automatic&&!shares.some(s=>s.service_id===request.batch.balancing_service_id)&&!locked}<label class="field">{t('Оплата обслуживания дома','Plata deservirii blocului')}<input bind:value={manual}/></label>{/if}
 <strong>{t('Сумма к распределению: ','Suma de repartizat: ')}{amount} · {t('По услугам: ','Pe servicii: ')}{shares.length?total:'—'}</strong>
 <footer>{#if !locked}<button class="button" onclick={apply}><Check size={16}/>OK</button>{/if}<button class="button secondary" onclick={onclose}><X size={16}/>{t('Закрыть','Închide')}</button></footer>
</div>




<style>
.payment-details{display:flex;flex-direction:column;gap:14px;padding:16px;min-width:0}.field{display:grid;grid-template-columns:160px minmax(0,1fr);align-items:center;gap:12px}.field input{min-width:0;width:100%;box-sizing:border-box}.check{display:flex;gap:8px;align-items:center}.commands,footer{display:flex;gap:8px}footer{justify-content:flex-end;margin-top:auto}table{width:100%;border-collapse:collapse}th,td{padding:7px;text-align:left}th{background:#80808020}td:last-child{text-align:right;font-variant-numeric:tabular-nums}td input{width:120px;box-sizing:border-box;text-align:right}.table-wrap{max-height:45vh;overflow:auto}
:global(.desktop-window-content:has(>.payment-details)){overflow:hidden;display:flex;flex-direction:column}.payment-details{height:100%;flex:1;min-height:0;box-sizing:border-box;background:var(--bg)}.payment-details>.table-wrap{flex:1;min-height:70px;max-height:none;overflow:auto!important;background:var(--surface);border:1px solid var(--border)}.payment-details>footer{flex:none;padding:10px;background:var(--surface);border:1px solid var(--border)}.payment-details>.field,.payment-details>.check,.payment-details>.commands{flex:none}.commands{padding:8px;background:var(--surface);border:1px solid var(--border)}
</style>
