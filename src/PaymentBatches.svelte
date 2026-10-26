<script lang="ts">
  import {displayDate,displayPeriod} from "./date-format";
  import {type Project,type PaymentBatch,uid,today} from "./model";
  import {D} from "./engine";
  import {previousPaymentMonth,type PaymentShare} from "./payment-allocation";
  import {previewBatchRow,savePaymentBatch} from "./payment-batches";
  import {translator} from "./i18n";
  import {issueText} from "./validation-language";
  import {ZodError} from "zod";
  import {Plus,Save,Check,Eye,X,Trash2,Users} from "@lucide/svelte";
  export let project:Project;
  export let onapply:(p:Project)=>void;
  let draft:PaymentBatch|null=null,error="",details:PaymentShare[]|null=null,detailsAccount="";
  $: t=translator(project.settings.language);
  $: locked=draft?.state==="applied";
  $: total=draft?.rows.reduce((s,r)=>{try{return s.plus(r.amount);}catch{return s;}},D(0)).toFixed(2)||"0.00";
  function create(){draft={id:uid(),number:String(project.payment_batches.length+1),date:today(),billing_through:previousPaymentMonth(today()),balancing_service_id:project.settings.payment_balancing_service_id||"",method:"",comment:"",state:"draft",rows:[]};error="";details=null;}
  function fill(){if(!draft)return;const existing=new Set(draft.rows.map(r=>r.account_id));draft.rows=[...draft.rows,...project.accounts.filter(a=>a.active&&!existing.has(a.id)).map(a=>({id:uid(),account_id:a.id,amount:"0.00",manual_maintenance:null,payment_id:null}))];details=null;}
  function describe(e:unknown){return e instanceof ZodError?e.issues.slice(0,3).map(i=>issueText(i,project.settings.language)).join("; "):e instanceof Error?e.message:String(e);}
  function save(post:boolean){if(!draft)return;try{const next=savePaymentBatch(project,draft,post);onapply(next);draft=structuredClone(next.payment_batches.find(b=>b.id===draft!.id)!);error="";details=null;}catch(e){error=describe(e);}}
  function show(row:PaymentBatch["rows"][number]){if(!draft)return;try{details=draft.state==="applied"?project.service_accounting.payments.filter(r=>r.payment_id===row.payment_id).map(({service_id,amount})=>({service_id,amount})):previewBatchRow(project,draft,row);detailsAccount=project.accounts.find(a=>a.id===row.account_id)?.number||"";error="";}catch(e){error=describe(e);details=null;}}
</script>
<div class="batch-workspace">
  {#if error}<p role="alert" class="alert error">{error}</p>{/if}
  {#if !draft}
    <div class="toolbar"><button class="button" onclick={create}><Plus size={16}/>{t("Добавить","Adaugă")}</button></div>
    <table><thead><tr><th>{t("Дата","Data")}</th><th>{t("Номер","Număr")}</th><th>{t("Вариант оплаты","Modalitate de plată")}</th><th>{t("Комментарий","Comentariu")}</th><th>{t("Статус","Stare")}</th><th></th></tr></thead><tbody>{#each [...project.payment_batches].reverse() as b}<tr><td>{displayDate(b.date,project)}</td><td>{b.number}</td><td>{b.method}</td><td>{b.comment}</td><td>{b.state==="applied"?t("Проведён","Aplicat"):t("Черновик","Ciornă")}</td><td><button class="icon-button" aria-label={t("Открыть документ","Deschide documentul")} onclick={()=>{draft=structuredClone(b);details=null;error="";}}><Eye size={16}/></button></td></tr>{/each}</tbody></table>
  {:else}
    <fieldset disabled={locked} oninput={()=>details=null}>
      <div class="two-fields"><label>{t("Дата оплаты","Data plății")}<input type="date" bind:value={draft.date}/></label><label>{t("Номер документа","Numărul documentului")}<input bind:value={draft.number}/></label><label>{t("Долг по месяц включительно","Datorie până la luna inclusiv")}<input type="month" bind:value={draft.billing_through}/></label><label>{t("Обслуживание дома · услуга для разницы","Deservirea blocului · serviciul diferenței")}<select bind:value={draft.balancing_service_id}><option value="">{t("Выберите услугу","Selectați serviciul")}</option>{#each project.services as s}<option value={s.id}>{s.name[project.settings.language]}</option>{/each}</select></label></div>
      <label>{t("Вариант оплаты","Modalitate de plată")}<input bind:value={draft.method}/></label>
      <div class="toolbar"><button type="button" class="button secondary" onclick={fill}><Users size={16}/>{t("Заполнить лицевыми счетами","Completează cu conturi")}</button><button type="button" class="button secondary" onclick={()=>{if(draft)draft.rows=[...draft.rows,{id:uid(),account_id:project.accounts.find(a=>!draft!.rows.some(r=>r.account_id===a.id))?.id||"",amount:"0.00",manual_maintenance:null,payment_id:null}];}}><Plus size={16}/>{t("Добавить строку","Adaugă rând")}</button></div>
    </fieldset>
    <div class="table-wrap"><table><thead><tr><th>№</th><th>{t("Лицевой счёт","Cont personal")}</th><th>{t("Сумма оплаты, MDL","Suma plății, MDL")}</th><th>{t("Обслуживание вручную, MDL","Deservire manuală, MDL")}</th><th></th></tr></thead><tbody>{#each draft.rows as row,i (row.id)}<tr><td>{i+1}</td><td><select disabled={locked} aria-label={t("Счёт строки ","Contul rândului ")+(i+1)} bind:value={row.account_id} onchange={()=>details=null}>{#each project.accounts as a}<option value={a.id}>{a.number} · {a.payer_name}</option>{/each}</select></td><td><input disabled={locked} aria-label={t("Оплата строки ","Plata rândului ")+(i+1)} bind:value={row.amount} oninput={()=>details=null}/></td><td><input disabled={locked} aria-label={t("Обслуживание строки ","Deservirea rândului ")+(i+1)} value={row.manual_maintenance??""} placeholder={t("Автоматически","Automat")} oninput={e=>{row.manual_maintenance=e.currentTarget.value||null;details=null;}}/></td><td><div class="button-group"><button class="icon-button" aria-label={t("Расшифровка строки ","Repartizarea rândului ")+(i+1)} onclick={()=>show(row)}><Eye size={16}/></button>{#if !locked}<button class="icon-button" aria-label={t("Убрать строку ","Elimină rândul ")+(i+1)} onclick={()=>{if(draft)draft.rows=draft.rows.filter(r=>r.id!==row.id);details=null;}}><Trash2 size={16}/></button>{/if}</div></td></tr>{/each}</tbody><tfoot><tr><th colspan="2">{t("Итого, MDL","Total, MDL")}</th><td>{total}</td><td colspan="2"></td></tr></tfoot></table></div>
    <label>{t("Комментарий","Comentariu")}<textarea disabled={locked} bind:value={draft.comment}></textarea></label>
    {#if details}<section class="panel"><h3>{t("Расшифровка платежа · счёт ","Repartizarea plății · cont ")}{detailsAccount}</h3><table><thead><tr><th>{t("Услуга","Serviciu")}</th><th>MDL</th></tr></thead><tbody>{#each details as r}<tr><td>{project.services.find(s=>s.id===r.service_id)?.name[project.settings.language]}</td><td>{r.amount}</td></tr>{/each}</tbody></table></section>{/if}
    <p class="quiet-note">{t("Нулевые строки не создают оплат. Проведение распределяет каждую оплату по услугам; при ошибке ни одна строка не проводится.","Rândurile nule nu creează plăți. Aplicarea repartizează fiecare plată pe servicii; la eroare nu se aplică niciun rând.")}</p>
    <div class="toolbar">{#if !locked}<button class="button secondary" onclick={()=>save(false)}><Save size={16}/>{t("Сохранить черновик","Salvează ciorna")}</button><button class="button" onclick={()=>save(true)}><Check size={16}/>{t("Провести документ","Aplică documentul")}</button>{/if}<button class="button secondary" onclick={()=>{draft=null;details=null;error="";}}><X size={16}/>{t("К списку","La listă")}</button></div>
  {/if}
</div>
<style>
  .batch-workspace{display:flex;flex-direction:column;gap:12px}
  fieldset{border:0;padding:0;min-width:0;display:flex;flex-direction:column;gap:12px}
  label{display:flex;flex-direction:column;gap:6px}
  input,select,textarea{width:100%}
  .toolbar{display:flex;gap:8px;flex-wrap:wrap}
</style>
