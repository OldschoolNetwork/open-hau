<script lang="ts">
  import type {Project} from "./model";
  import {D} from "./engine";
  import {allocatePayment,paymentServiceDebts,type PaymentShare} from "./payment-allocation";
  import {Calculator,RefreshCw} from "@lucide/svelte";
  export let project:Project;
  export let accountId:string;
  export let date:string;
  export let paymentId:string;
  export let amount:string;
  export let through:string;
  export let balancingServiceId="";
  export let shares:PaymentShare[]=[];
  export let signature="";
  export let manual=false;
  export let manualAmount="0.00";
  export let calculated=false;
  let error="";
  let basisProject=project;
  $: if(project!==basisProject){signature="";basisProject=project;}
  $: ru=project.settings.language==="ru";
  $: currentSignature=JSON.stringify([accountId,date,amount,through,balancingServiceId]);
  $: allocated=shares.reduce((s,r)=>s.plus(r.amount||0),D(0)).toFixed(2);
  function calculate(){try{
    const debts=paymentServiceDebts(project,accountId,through,date,paymentId);
    shares=allocatePayment(project,debts,amount,balancingServiceId,manual?manualAmount:undefined);
    signature=currentSignature;calculated=true;error="";
  }catch(e){error=e instanceof Error?e.message:String(e);}}
</script>
<fieldset>
  <legend>{ru?"Расшифровка платежа":"Repartizarea plății"}</legend>
  <div class="two-fields">
    <label>{ru?"Долг по месяц включительно":"Datorie până la luna inclusiv"}<input type="month" bind:value={through}/></label>
    <label>{ru?"Обслуживание дома · услуга для разницы":"Deservirea blocului · serviciul diferenței"}<select bind:value={balancingServiceId}><option value="">{ru?"Выберите услугу":"Selectați serviciul"}</option>{#each project.services as s}<option value={s.id}>{s.name[project.settings.language]}</option>{/each}</select></label>
  </div>
  <p class="quiet-note">{ru?"Автоматически — пропорционально положительному долгу. Переплата сверх долга относится на обслуживание дома. Уже внесённые оплаты учитываются по дату платежа.":"Automat — proporțional datoriei pozitive. Excedentul se atribuie deservirii blocului. Plățile anterioare sunt luate în calcul până la data plății."}</p>
  <label class="check-row"><input type="checkbox" bind:checked={manual} onchange={()=>signature=""}/>{ru?"Указать часть оплаты за обслуживание вручную":"Indicați manual plata deservirii"}</label>
  {#if manual}<label>{ru?"Оплата обслуживания, MDL":"Plata deservirii, MDL"}<input bind:value={manualAmount} oninput={()=>signature=""}/></label>{/if}
  <button type="button" class="button" onclick={calculate}><Calculator size={16}/>{ru?"Распределить":"Repartizează"}</button>
  {#if error}<p role="alert">{error}</p>{/if}
  {#if shares.length}<table><thead><tr><th>{ru?"Услуга":"Serviciu"}</th><th>{ru?"Оплата, MDL":"Achitat, MDL"}</th></tr></thead><tbody>{#each shares as row}<tr><td>{project.services.find(s=>s.id===row.service_id)?.name[project.settings.language]||row.service_id}</td><td>{row.amount}</td></tr>{/each}</tbody><tfoot><tr><td>{ru?"Распределено":"Repartizat"}</td><td>{allocated}</td></tr></tfoot></table>{/if}
  {#if signature!==currentSignature}<p class="quiet-note"><RefreshCw size={14}/>{ru?"Перед сохранением пересчитайте распределение.":"Recalculați repartizarea înainte de salvare."}</p>{/if}
</fieldset>
<style>
  fieldset{border:0;padding:0;margin:0;display:flex;flex-direction:column;gap:12px;min-width:0}
  legend{font-weight:600;margin-bottom:12px}
</style>
