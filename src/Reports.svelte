<script lang="ts">
 import {languageOverrides} from "./localization";
 import {printDocument} from "./print-dialog";
  import {monthLastDay} from "./report-dates";
  import {openInterval} from "./report-interval";
  import {displayDate,displayPeriod} from "./date-format";
  import {Download,FileJson,Printer,ReceiptText} from "./icons";
  import { translator } from "./i18n";
  import type { Project } from "./model";
  import {balanceTable,balanceCSV,type BalanceOptions,type BalanceFilter} from "./balance-view";
  import {emptyReportFilters,reportFilterData} from "./report-filter-data";
  import {openReportSettings} from "./report-settings";
  import { exportText,exportBinary,exportPDF,native } from "./storage";
  import { accountReportHTML, accountReportXLSX } from "./report-exports";
  import ReportFilter from "./ReportFilter.svelte";
  export let project: Project;export let initialAccountId="";export let initialPeriod=project.settings.period;
  export let mode:"account"|"service"="account";
  let serviceFilter="",attentionOnly=false;
  let options:BalanceOptions={grouping:'service',expandAccounts:false,showAddress:false,accountFilter:'',typeFilter:'',providerFilter:'',sort:[],postedOnly:true,legacyLayout:true};
  let filters:BalanceFilter[]=emptyReportFilters();if(initialAccountId)filters[0]={...filters[0],enabled:true,values:[initialAccountId]};
  $: options.filters=filters;
  $: filterData=reportFilterData(project);
  function configure(){openReportSettings({id:'balance-'+mode,filters,sort:options.sort||[],labels:filterData.labels,items:filterData.items,columns:report?.headers||[],onapply:(next,rules)=>{filters=next;options={...options,sort:rules};}});}
  let previousSignature='';
  $: {const signature=JSON.stringify([from,to,mode,serviceFilter,attentionOnly,options]);if(signature!==previousSignature){generated='';previewReady=false;previousSignature=signature;}}
  let from = initialPeriod+"-01",
    to = monthLastDay(initialPeriod),
    error = "";
  let generated = "",
    generatedRange = "",
    preview: HTMLIFrameElement,
    previewReady = false;
  function generate() {
    try {
      generated = accountReportHTML(project, from, to,mode,serviceFilter,attentionOnly,options);
      generatedRange = displayDate(from,project) + "–" + displayDate(to,project);
      previewReady = false;
      error = "";
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
  }
  function printReport() {
    if (!generated || !previewReady) return;
    try {
      void printDocument(generated,true);
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
  }
  async function savePDF(){try{if(!generated)generate();if(generated)await exportPDF(`OpenHaU-${mode}-balances-${from}-${to}.pdf`,generated,true);}catch(e){error=e instanceof Error?e.message:String(e);}}
  $: tr = translator(project.settings.language,$languageOverrides);
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

<article class="legacy-balance-report">
  <div class="report-command-row"><button onclick={generate} disabled={!report}><ReceiptText size={16}/>{tr('Сформировать','Generează')}</button><button onclick={configure}>{tr('Настройка…','Configurare…')}</button></div>
  <div class="period-row"><span>{tr('Период с','Perioada de la')}</span><input type="date" aria-label={tr('Период с','Perioada de la')} bind:value={from}/><span>{tr('по','până la')}</span><input type="date" aria-label={tr('Период по','Perioada până la')} bind:value={to}/><button class="icon-button" aria-label={tr("Настройка интервала","Configurare interval")} onclick={()=>openInterval({id:"balance-"+mode,current:project.settings.period,from,to,onapply:(start,end)=>{from=start;to=end;}})}>…</button></div>
  {#each [0,3,4] as index}<ReportFilter language={project.settings.language} label={filterData.labels[index]} items={filterData.items[index]} bind:filter={filters[index]}/>{/each}
  {#if mode==='service'}<div class="group-options">
   <div><label class="check-row"><input type="checkbox" bind:checked={options.expandAccounts}/>{tr('Разворачивать по лицевым счетам','Detaliere pe conturi personale')}</label><label class="check-row"><input type="checkbox" bind:checked={options.showAddress} disabled={!options.expandAccounts}/>{tr('Выводить колонку «Адрес»','Afișează coloana „Adresă”')}</label></div>
   <fieldset><legend>{tr('Группировать по','Grupează după')}</legend><label><input type="radio" value="service" bind:group={options.grouping}/>{tr('услугам','servicii')}</label><label><input type="radio" value="type" bind:group={options.grouping}/>{tr('видам услуг','tipuri de servicii')}</label><label><input type="radio" value="type-service" bind:group={options.grouping}/>{tr('видам услуг и услугам','tipuri și servicii')}</label></fieldset>
  </div>{/if}
  <label class="check-row report-drafts"><input type="checkbox" checked={!options.postedOnly} onchange={e=>options={...options,postedOnly:!e.currentTarget.checked}}/>{tr("Включать предварительные начисления","Include calculele provizorii")}</label><div class="report-output-tools"><button onclick={printReport} disabled={!generated||!previewReady}><Printer size={16}/>{tr('Печать','Imprimare')}</button><button onclick={savePDF} disabled={!native||!report}><Download size={16}/>{tr('Сохранить PDF','Salvează PDF')}</button><button onclick={()=>download('xlsx')} disabled={!report}><Download size={16}/>Excel XLSX</button><button onclick={()=>download('csv')} disabled={!report}><Download size={16}/>CSV</button><button onclick={()=>download('html')} disabled={!report}><FileJson size={16}/>HTML</button></div>
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
        "Выберите корректный диапазон дат.",
        "Selectați un interval valid de date.",
      )}
    </p>
  {:else if !generated}
    {#if report.incomplete}<p class="alert" role="alert">
        {tr(
          "Предварительный отчёт: есть неполные начисления или пропуски истории. Проверьте отмеченные счета.",
          "Raport provizoriu: calcule incomplete sau istoric lipsă. Verificați conturile marcate.",
        )}
      </p>{/if}
    <div class="table-wrap"><table><thead><tr>{#each report.headers as header}<th>{header}</th>{/each}</tr></thead><tbody>{#each report.rows as row,i}<tr class:attention-row={report.attention[i]} class:total-row={i===report.rows.length-1}>{#each row as value,j}<td class:num={j>=report.numericStart&&j<report.numericStart+report.numericCount}>{value}</td>{/each}</tr>{/each}</tbody></table></div>
  {/if}
</article>

<style>
  .group-options{display:flex;gap:20px;align-items:center;flex-wrap:wrap;margin:12px 20px}.group-options>div{display:grid;gap:8px}fieldset{border:0}fieldset label{display:block;padding:3px}thead th{background:#80808020;font-weight:700}.total-row{font-weight:700;background:#80808018}

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
  .legacy-balance-report{padding:0 8px 8px}
  .report-command-row,.report-output-tools{display:flex;gap:3px;flex-wrap:wrap;align-items:center;border-bottom:1px solid var(--border)}
  .report-command-row button,.report-output-tools button{display:flex;align-items:center;gap:7px;border:0;background:transparent;color:var(--text);padding:8px 10px}
  .report-output-tools{border-top:1px solid var(--border)}.period-row{display:flex;align-items:center;gap:10px;padding:10px 0}.period-row input{width:180px;padding:6px}
</style>

