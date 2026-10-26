<script lang="ts">
  import { onMount } from "svelte";
  import type { Project } from "./model";
  import {
    native,
    displayPath,
    reportExportSettings,
    configureReportExports,
    autoExportReports,
    chooseBackupDirectory,
    type ReportExportSettings,
  } from "./storage";
  export let project: Project;
  export let unsaved = false;
  const tr = (ru: string, ro: string) =>
    project.settings.language === "ru" ? ru : ro;
  let config: ReportExportSettings = {
      directory: null,
      trigger: "close",
      formats: ["csv"],
    },
    pending = false,
    busy = false,
    error = "",
    message = "";
  onMount(() => {
    if (native)
      reportExportSettings()
        .then((s) => (config = s))
        .catch((e) => (error = String(e)));
  });
  async function action(kind: "choose" | "apply" | "disable" | "export") {
    busy = true;
    error = "";
    message = "";
    try {
      if (kind === "choose") {
        const path = await chooseBackupDirectory();
        if (path) {
          config = { ...config, directory: path };
          pending = true;
        }
      } else if (kind === "export") {
        const path = await autoExportReports(project, "manual");
        if (path)
          message =
            tr("Отчёты сохранены: ", "Rapoartele au fost salvate: ") +
            displayPath(path);
      } else {
        const next =
          kind === "disable"
            ? {
                ...config,
                directory: null,
                formats: config.formats.length
                  ? config.formats
                  : ["csv" as const],
              }
            : config;
        config = await configureReportExports(next);
        pending = false;
        message = tr(
          "Настройки экспорта сохранены.",
          "Setările exportului au fost salvate.",
        );
      }
    } catch (e) {
      error = String(e);
    } finally {
      busy = false;
    }
  }
</script>

<article class="panel exports">
  <h2>
    {tr("Автоматический экспорт отчётов", "Exportul automat al rapoartelor")}
  </h2>
  <p>
    {tr(
      "Оборотная ведомость за текущий расчётный месяц. Настройки сохраняются только на этом компьютере. Отчёты не заменяют полную резервную копию базы.",
      "Balanța conturilor pentru luna de calcul curentă. Setările se păstrează doar pe acest calculator. Rapoartele nu înlocuiesc copia completă a bazei.",
    )}
  </p>
  {#if !native}<p>
      {tr(
        "Автоматический экспорт доступен в установленном приложении.",
        "Exportul automat este disponibil în aplicația instalată.",
      )}
    </p>
  {:else}
    <p class="destination">
      {displayPath(config.directory) ||
        tr(
          "Автоматический экспорт выключен",
          "Exportul automat este dezactivat",
        )}
    </p>
    <label
      >{tr("Когда экспортировать", "Când se exportă")}<select
        bind:value={config.trigger}
        onchange={() => (pending = true)}
        ><option value="close"
          >{tr("При закрытии месяца", "La închiderea lunii")}</option
        ><option value="save"
          >{tr("При каждом сохранении", "La fiecare salvare")}</option
        ></select
      ></label
    >
    <fieldset>
      <legend>{tr("Форматы", "Formate")}</legend
      >{#each [{ id: "csv", label: "CSV" }, { id: "xml", label: "Excel XML" }, { id: "html", label: tr("HTML для печати / PDF", "HTML pentru imprimare / PDF") }] as format}<label
          class="check"
          ><input
            type="checkbox"
            value={format.id}
            bind:group={config.formats}
            onchange={() => (pending = true)}
          />{format.label}</label
        >{/each}
    </fieldset>
    <div class="actions">
      <button
        class="button secondary"
        disabled={busy}
        onclick={() => action("choose")}
        >{tr("Выбрать папку", "Alege dosarul")}</button
      ><button
        class="button secondary"
        disabled={busy || !pending || !config.formats.length}
        onclick={() => action("apply")}
        >{tr("Применить настройки", "Aplică setările")}</button
      ><button
        class="button secondary"
        disabled={busy || !config.directory || pending || unsaved}
        onclick={() => action("export")}
        >{tr("Экспортировать сейчас", "Exportă acum")}</button
      ><button
        class="button secondary"
        disabled={busy || !config.directory}
        onclick={() => action("disable")}
        >{tr("Выключить", "Dezactivează")}</button
      >
    </div>
    <p>
      {tr(
        "Неизменённые отчёты повторно не создаются. Для новой редакции создаётся отдельная папка; прежние файлы сохраняются.",
        "Rapoartele nemodificate nu sunt create din nou. O nouă revizie primește un dosar separat; fișierele anterioare se păstrează.",
      )}
    </p>
  {/if}
  {#if error}<p role="alert" class="alert error">{error}</p>{/if}{#if message}<p
      role="status"
    >
      {message}
    </p>{/if}
</article>

<style>
  .exports {
    padding: 20px;
    margin-bottom: 20px;
  }
  .exports h2 {
    margin-top: 0;
  }
  .destination {
    overflow-wrap: anywhere;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }
  fieldset {
    border: 0;
    padding: 12px 0;
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
  }
  label {
    display: grid;
    gap: 6px;
  }
  .check {
    display: flex;
    align-items: center;
  }
</style>
