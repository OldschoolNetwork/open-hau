<script lang="ts">
  import { onMount } from "svelte";
  import {
    native,
    displayPath,
    backupSettings,
    configureBackups,
    chooseBackupDirectory,
    backupNow,
  } from "./storage";
  export let language: "ru" | "ro";
  export let unsaved = false;
  const tr = (ru: string, ro: string) => (language === "ru" ? ru : ro);
  let directory: string | null = null,
    error = "",
    message = "",
    busy = false;
  onMount(() => {
    if (native)
      backupSettings()
        .then((s) => (directory = s.directory))
        .catch((e) => (error = String(e)));
  });
  async function action(kind: "choose" | "disable" | "copy") {
    busy = true;
    error = "";
    message = "";
    try {
      if (kind === "copy") {
        const path = await backupNow();
        if (path)
          message =
            tr(
              "Копия создана и проверена: ",
              "Copia a fost creată și verificată: ",
            ) + displayPath(path);
      } else {
        const path = kind === "choose" ? await chooseBackupDirectory() : null;
        if (kind === "choose" && !path) return;
        directory = (await configureBackups(path)).directory;
      }
    } catch (e) {
      error = String(e);
    } finally {
      busy = false;
    }
  }
</script>

<article class="panel backups">
  <h2>
    {tr(
      "Резервные копии в выбранную папку",
      "Copii de siguranță într-un dosar ales",
    )}
  </h2>
  {#if !native}<p>
      {tr(
        "Выбор папки и автоматическое копирование доступны в установленном приложении.",
        "Alegerea dosarului și copierea automată sunt disponibile în aplicația instalată.",
      )}
    </p>
  {:else}<p>
      {tr(
        "После каждого сохранения создаётся отдельная проверенная копия базы. Старые копии автоматически не удаляются. Сохраняйте рабочую базу перед ручным копированием.",
        "După fiecare salvare se creează o copie separată și verificată a bazei. Copiile vechi nu se șterg automat. Salvați baza înainte de copierea manuală.",
      )}
    </p>
    <p class="destination">
      {displayPath(directory) ||
        tr(
          "Автоматическое копирование выключено",
          "Copierea automată este dezactivată",
        )}
    </p>
    <div class="actions">
      <button
        class="button secondary"
        disabled={busy}
        onclick={() => action("choose")}
        >{tr("Выбрать папку", "Alege dosarul")}</button
      ><button
        class="button secondary"
        disabled={busy || !directory || unsaved}
        onclick={() => action("copy")}
        >{tr("Создать копию сейчас", "Creează o copie acum")}</button
      ><button
        class="button secondary"
        disabled={busy || !directory}
        onclick={() => action("disable")}
        >{tr("Выключить", "Dezactivează")}</button
      >
    </div>{/if}
  {#if error}<p role="alert" class="alert error">{error}</p>{/if}
  {#if message}<p role="status">{message}</p>{/if}
</article>

<style>
  .backups {
    padding: 20px;
    margin-bottom: 20px;
  }
  .backups h2 {
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
</style>
