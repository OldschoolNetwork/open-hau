<script lang="ts">
  import type { Project } from "./model";
  import { accountBalanceReport, accountReportCSV } from "./reports";
  import { exportText } from "./storage";
  import { accountReportHTML, accountReportXML } from "./report-exports";
  export let project: Project;
  let from = project.settings.period,
    to = project.settings.period,
    error = "";
  const tr = (ru: string, ro: string) =>
    project.settings.language === "ru" ? ru : ro;
  $: report = (() => {
    try {
      return accountBalanceReport(project, from, to);
    } catch {
      return null;
    }
  })();
  async function download(format: "csv" | "xml" | "html") {
    try {
      error = "";
      const content =
        format === "csv"
          ? accountReportCSV(project, from, to)
          : format === "xml"
            ? accountReportXML(project, from, to)
            : accountReportHTML(project, from, to);
      await exportText(
        `OpenHaU-balances-${from}-${to}.${format}`,
        content,
        format,
      );
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
  }
</script>

<article class="panel">
  <div class="panel-heading">
    <div>
      <h2>{tr("Оборотная ведомость по счетам", "Balanța conturilor")}</h2>
      <p>
        {tr(
          "Включает закрытые счета, если они относятся к выбранной истории.",
          "Include conturile închise relevante pentru perioada selectată.",
        )}
      </p>
    </div>
  </div>
  <div class="filters">
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
    ><button
      class="button secondary"
      onclick={() => download("csv")}
      disabled={!report}>{tr("Экспорт CSV", "Export CSV")}</button
    ><button
      class="button secondary"
      onclick={() => download("xml")}
      disabled={!report}>{tr("Таблица Excel XML", "Tabel Excel XML")}</button
    ><button
      class="button secondary"
      onclick={() => download("html")}
      disabled={!report}
      >{tr("HTML для печати / PDF", "HTML pentru imprimare / PDF")}</button
    >
  </div>
  {#if error}<p role="alert" class="alert error">{error}</p>{/if}
  {#if !report}<p class="alert" role="alert">
      {tr(
        "Выберите корректный диапазон месяцев.",
        "Selectați un interval valid de luni.",
      )}
    </p>
  {:else}
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
            ><th>{tr("Счёт / Плательщик", "Cont / Plătitor")}</th><th
              class="num">{tr("На начало", "Sold inițial")}</th
            ><th class="num">{tr("Начислено", "Calculat")}</th><th class="num"
              >{tr("Корректировки", "Ajustări")}</th
            ><th class="num">{tr("Оплачено", "Achitat")}</th><th class="num"
              >{tr("На конец", "Sold final")}</th
            ><th>{tr("Проверка", "Verificare")}</th></tr
          ></thead
        ><tbody>
          {#each report.rows as row}<tr
              ><td
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
            ><th>{tr("Итого, MDL", "Total, MDL")}</th><td class="num"
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
