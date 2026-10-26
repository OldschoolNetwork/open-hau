<script lang="ts">
  import {displayDate,displayPeriod} from "./date-format";
  import {Download,FileJson,Printer,ReceiptText} from "@lucide/svelte";
  import { translator } from "./i18n";
  import type { Project } from "./model";
  import { accountBalanceReport, accountReportCSV } from "./reports";
  import {serviceBalanceReport,serviceReportCSV,UNALLOCATED_SERVICE} from "./service-reports";
  import { exportText } from "./storage";
  import { accountReportHTML, accountReportXML } from "./report-exports";
  export let project: Project;
  export let mode:"account"|"service"="account";
  let serviceFilter="";
  let from = project.settings.period,
    to = project.settings.period,
    error = "";
  let generated = "",
    generatedRange = "",
    preview: HTMLIFrameElement,
    previewReady = false;
  function generate() {
    try {
      generated = accountReportHTML(project, from, to,mode,serviceFilter);
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
  $: tr = translator(project.settings.language);
  $: report = (() => {
    try {
      return mode==="service"?serviceBalanceReport(project,from,to,serviceFilter):accountBalanceReport(project, from, to);
    } catch {
      return null;
    }
  })();
  async function download(format: "csv" | "xml" | "html") {
    try {
      error = "";
      const content =
        format === "csv"
          ? (mode==="service"?serviceReportCSV(project,from,to,serviceFilter):accountReportCSV(project, from, to))
          : format === "xml"
            ? accountReportXML(project, from, to,mode,serviceFilter)
            : accountReportHTML(project, from, to,mode,serviceFilter);
      await exportText(
        `OpenHaU-${mode}-balances-${from}-${to}.${format}`,
        content,
        format,
      );
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
  }
</script>

<article class="panel">
  <div class="filters">
    {#if mode==="service"}<label>{tr("Услуга","Serviciu")}<select bind:value={serviceFilter}><option value="">{tr("Все услуги","Toate serviciile")}</option>{#each project.services as s}<option value={s.id}>{s.name[project.settings.language]}</option>{/each}<option value={UNALLOCATED_SERVICE}>{tr("Нераспределено","Nerepartizat")}</option></select></label>{/if}
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
      ><Printer size={16}/>{tr("Печать / сохранить PDF", "Imprimare / salvare PDF")}</button
    ><button
      class="button secondary"
      onclick={() => download("csv")}
      disabled={!report}><Download size={16}/>{tr("Экспорт CSV", "Export CSV")}</button
    ><button
      class="button secondary"
      onclick={() => download("xml")}
      disabled={!report}><Download size={16}/>{tr("Таблица Excel XML", "Tabel Excel XML")}</button
    ><button
      class="button secondary"
      onclick={() => download("html")}
      disabled={!report}
      ><FileJson size={16}/>{tr("HTML (дополнительно)", "HTML (suplimentar)")}</button
    >
  </div>
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
    <div class="table-wrap">
      <table>
        <thead
          ><tr
            >{#if mode==="service"}<th>{tr("Услуга","Serviciu")}</th>{/if}<th
            >{tr("Счёт / Плательщик", "Cont / Plătitor")}</th><th
              class="num">{tr("На начало", "Sold inițial")}</th
            ><th class="num">{tr("Начислено", "Calculat")}</th><th class="num"
              >{tr("Корректировки", "Ajustări")}</th
            ><th class="num">{tr("Оплачено", "Achitat")}</th><th class="num"
              >{tr("На конец", "Sold final")}</th
            ><th>{tr("Проверка", "Verificare")}</th></tr
          ></thead
        ><tbody>
          {#each report.rows as row}<tr
              >{#if mode==="service"}<td>{"service"in row?row.service:""}</td>{/if}<td
                ><strong>{row.number}</strong><small>{row.payer}</small
                >{#if !row.active}<small
                    >{tr("Счёт закрыт", "Cont închis")}</small
                  >{/if}</td
              ><td class="num">{row.opening}</td><td class="num"
                >{row.charges}</td
              ><td class="num">{row.adjustments}</td><td class="num"
                >{row.paid}</td
              ><td class="num">{row.closing}</td><td
                >{#if row.warnings.length}<details>
                    <summary
                      >{tr("Требует проверки", "Necesită verificare")}</summary
                    >
                    <ul>
                      {#each row.warnings as warning}<li>{warning}</li>{/each}
                    </ul>
                  </details>{:else}{tr(
                    "Без предупреждений",
                    "Fără avertizări",
                  )}{/if}</td
              ></tr
            >{/each}
        </tbody><tfoot
          ><tr
            >{#if mode==="service"}<th></th>{/if}<th
            >{tr("Итого, MDL", "Total, MDL")}</th><td class="num"
              >{report.totals.opening}</td
            ><td class="num">{report.totals.charges}</td><td class="num"
              >{report.totals.adjustments}</td
            ><td class="num">{report.totals.paid}</td><td class="num"
              >{report.totals.closing}</td
            ><td></td></tr
          ></tfoot
        >
      </table>
    </div>
  {/if}
</article>

<style>
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
  tfoot {
    font-weight: 600;
  }
  summary {
    cursor: pointer;
  }
  details ul {
    max-width: 320px;
    padding-left: 20px;
    font-size: 12px;
  }
</style>
