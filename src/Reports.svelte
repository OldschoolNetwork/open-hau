<script lang="ts">
  import {displayDate,displayPeriod} from "./date-format";
  import {Download,FileJson,Printer,ReceiptText} from "@lucide/svelte";
  import { translator } from "./i18n";
  import type { Project } from "./model";
  import {balanceTable,balanceCSV,type BalanceOptions,type BalanceFilter} from "./balance-view";
  import {serviceBalanceReport,serviceReportCSV,UNALLOCATED_SERVICE} from "./service-reports";
  import { exportText,exportBinary,exportPDF,native } from "./storage";
  import { accountReportHTML, accountReportXLSX } from "./report-exports";
  import ReportFilter from "./ReportFilter.svelte";
  export let project: Project;
  export let mode:"account"|"service"="account";
  let serviceFilter="",attentionOnly=false;
  let options:BalanceOptions={grouping:'service',expandAccounts:false,showAddress:false,accountFilter:'',typeFilter:'',providerFilter:'',sort:[]};
  let settingsOpen=false;
  let filters:BalanceFilter[]=['account','service','type','provider'].map(field=>({field:field as BalanceFilter['field'],enabled:false,operator:'eq',values:[]}));
  $: options.filters=filters;
  $: accountItems=project.accounts.map(a=>({id:a.id,code:a.number,name:a.payer_name,address:a.address}));
  $: serviceItems=project.services.map(s=>({id:s.id,code:String(s.report_order??''),name:s.name[project.settings.language]}));
  let previousSignature='';
  $: {const signature=JSON.stringify([from,to,mode,serviceFilter,attentionOnly,options]);if(signature!==previousSignature){generated='';previewReady=false;previousSignature=signature;}}
  $: types=[...new Set(project.services.map(s=>s.service_type|| (project.settings.language==='ru'?'Без вида услуги':'Fără tip de serviciu')))];
  $: providers=[...new Set(project.services.map(s=>s.provider||'').filter(Boolean))];
  let from = project.settings.period,
    to = project.settings.period,
    error = "";
  let generated = "",
    generatedRange = "",
    preview: HTMLIFrameElement,
    previewReady = false;
  function generate() {
    try {
      generated = accountReportHTML(project, from, to,mode,serviceFilter,attentionOnly,options);
      generatedRange = displayPeriod(from,project) + "–" + displayPeriod(to,project);
      previewReady = false;
      error = "";
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
  }
  function printReport() {
    if (!generated || !previewReady) return;
    try {
      preview.contentWindow?.focus();
      preview.contentWindow?.print();
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
  }
  async function savePDF(){try{if(!generated)generate();if(generated)await exportPDF(`OpenHaU-${mode}-balances-${from}-${to}.pdf`,generated,true);}catch(e){error=e instanceof Error?e.message:String(e);}}
  $: tr = translator(project.settings.language);
  $: report = (() => {
    try {
      return balanceTable(project,from,to,mode,serviceFilter,attentionOnly,options);
    } catch {
      return null;
    }
  })();
  async function download(format: "csv" | "xlsx" | "html") {
    try {
      error = "";
      const args=[project,from,to,mode,serviceFilter,attentionOnly,options] as const;
      const name=`OpenHaU-${mode}-balances-${from}-${to}.${format}`;
      if(format==='xlsx')await exportBinary(name,accountReportXLSX(...args),'xlsx');
      else await exportText(name,format==='csv'?balanceCSV(...args):accountReportHTML(...args),format);
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
  }
</script>

<article class="panel">
  <div class="filters">
    <button class="button secondary" onclick={()=>settingsOpen=!settingsOpen}>{tr('Настройка','Configurare')}</button>
    <label
      >{tr("С месяца", "Din luna")}<input
        type="month"
        bind:value={from}
      /></label
    ><label
      >{tr("По месяц", "Până în luna")}<input
        type="month"
        bind:value={to}
      /></label
    ><button class="button" onclick={generate} disabled={!report}
      ><ReceiptText size={16}/>{tr("Сформировать", "Formare")}</button
    ><button
      class="button secondary"
      onclick={printReport}
      disabled={!generated || !previewReady}
      ><Printer size={16}/>{tr("Печать", "Imprimare")}</button
    ><button class="button secondary" disabled={!report||!native} onclick={savePDF}><Download size={16}/>{tr("Сохранить PDF","Salvează PDF")}</button
    ><button
      class="button secondary"
      onclick={() => download("csv")}
      disabled={!report}><Download size={16}/>{tr("Экспорт CSV", "Export CSV")}</button
    ><button
      class="button secondary"
      onclick={() => download("xlsx")}
      disabled={!report}><Download size={16}/>{tr("Excel XLSX", "Excel XLSX")}</button
    ><button
      class="button secondary"
      onclick={() => download("html")}
      disabled={!report}
      ><FileJson size={16}/>HTML</button
    >
  </div>
  <ReportFilter language={project.settings.language} label={tr('Лицевой счёт','Cont personal')} items={accountItems} bind:filter={filters[0]}/>
  {#if mode==='service'}<ReportFilter language={project.settings.language} label={tr('Услуга','Serviciu')} items={serviceItems} bind:filter={filters[1]}/><ReportFilter language={project.settings.language} label={tr('Вид услуги','Tip serviciu')} items={types.map(type=>({id:type,code:'',name:type}))} bind:filter={filters[2]}/>{/if}
  {#if mode==='service'}<div class="group-options">
   <div><label class="check-row"><input type="checkbox" bind:checked={options.expandAccounts}/>{tr('Разворачивать по лицевым счетам','Detaliere pe conturi personale')}</label><label class="check-row"><input type="checkbox" bind:checked={options.showAddress} disabled={!options.expandAccounts}/>{tr('Выводить колонку «Адрес»','Afișează coloana „Adresă”')}</label></div>
   <fieldset><legend>{tr('Группировать по','Grupează după')}</legend><label><input type="radio" value="service" bind:group={options.grouping}/>{tr('услугам','servicii')}</label><label><input type="radio" value="type" bind:group={options.grouping}/>{tr('видам услуг','tipuri de servicii')}</label><label><input type="radio" value="type-service" bind:group={options.grouping}/>{tr('видам услуг и услугам','tipuri și servicii')}</label></fieldset>
  </div>{/if}
  {#if settingsOpen}<section class="report-settings">
   <label class="check-row"><input type="checkbox" bind:checked={attentionOnly}/>{tr('Только требует внимания','Doar cele care necesită atenție')}</label>
   {#if mode==='service'}<ReportFilter language={project.settings.language} label={tr('Поставщик','Furnizor')} items={providers.map(provider=>({id:provider,code:'',name:provider}))} bind:filter={filters[3]}/>{/if}
   <strong>{tr('Сортировка','Sortare')}</strong><button class="button secondary" onclick={()=>options={...options,sort:[...(options.sort||[]),{column:0,descending:false}]}}>+ {tr('Добавить','Adaugă')}</button>
   {#each options.sort||[] as rule,i}<div class="sort-rule"><select bind:value={rule.column}>{#each report?.headers||[] as header,j}<option value={j}>{header}</option>{/each}</select><select bind:value={rule.descending}><option value={false}>{tr('По возрастанию','Crescător')}</option><option value={true}>{tr('По убыванию','Descrescător')}</option></select><button class="button secondary" onclick={()=>options={...options,sort:options.sort?.filter((_,j)=>j!==i)}}>×</button></div>{/each}
  </section>{/if}
  {#if error}<p role="alert" class="alert error">{error}</p>{/if}
  {#if generated}<section class="report-preview">
      <p>
        {tr(
          "Предпросмотр сформированного отчёта",
          "Previzualizarea raportului format",
        )} · {generatedRange}
      </p>
      <iframe
        bind:this={preview}
        title={tr("Предпросмотр отчёта", "Previzualizare raport")}
        srcdoc={generated}
        sandbox="allow-same-origin allow-modals"
        onload={() => (previewReady = true)}
      ></iframe>
    </section>{/if}
  {#if !report}<p class="alert" role="alert">
      {tr(
        "Выберите корректный диапазон месяцев.",
        "Selectați un interval valid de luni.",
      )}
    </p>
  {:else if !generated}
    {#if report.incomplete}<p class="alert" role="alert">
        {tr(
          "Предварительный отчёт: есть неполные начисления или пропуски истории. Проверьте отмеченные счета.",
          "Raport provizoriu: calcule incomplete sau istoric lipsă. Verificați conturile marcate.",
        )}
      </p>{/if}
    <div class="table-wrap"><table><thead><tr>{#each report.headers as header}<th>{header}</th>{/each}</tr></thead><tbody>{#each report.rows as row,i}<tr class:attention-row={report.attention[i]} class:total-row={i===report.rows.length-1}>{#each row as value,j}<td class:num={j>=report.numericStart&&j<report.numericStart+5}>{value}</td>{/each}</tr>{/each}</tbody></table></div>
  {/if}
</article>

<style>
  .group-options,.sort-rule{display:flex;gap:20px;align-items:center;flex-wrap:wrap;margin:12px 20px}.group-options>div{display:grid;gap:8px}fieldset{border:0}fieldset label{display:block;padding:3px}.report-settings{padding:16px;margin:12px;background:#80808012;display:grid;gap:8px}.report-settings>label{display:grid;grid-template-columns:145px minmax(0,1fr);gap:12px}thead th{background:#80808020;font-weight:700}.total-row{font-weight:700;background:#80808018}

  .report-preview {
    margin: 12px 0;
    background: #e4e4e4;
    padding: 12px;
    color: #222;
  }
  .report-preview iframe {
    display: block;
    width: 100%;
    height: 65vh;
    min-height: 360px;
    background: white;
    border: 0;
  }
  .report-preview > p {
    font-size: 12px;
    margin: 0 0 8px;
  }
  .filters {
    display: flex;
    align-items: end;
    gap: 16px;
    padding: 20px;
    flex-wrap: wrap;
  }
  .filters label {
    display: grid;
    gap: 6px;
  }
  .filters input {
    min-width: 170px;
  }
</style>
