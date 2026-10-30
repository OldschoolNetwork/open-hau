<script lang="ts">
  import { translator } from "./i18n";
  import { languageOverrides } from "./localization";
  import { englishTerms } from "./english";
  import {
    translationLanguages,
    contentTranslationRows,
    applyTranslations,
  } from "./translations";
  import { Save, Languages, Plus } from "./icons";
  import type { Project } from "./model";
  import { reportEditorDirty } from "./editor-drafts";
  import { onDestroy } from "svelte";
  export let project: Project;
  export let onapply: (project: Project) => void;
  export let editorId = "translations";
  let locale = project.settings.translation_locale || project.settings.language,
    mode = "content",
    query = "",
    edits: Record<string, string> = {},
    missing = false,
    code = "",
    name = "",
    error = "";
  $: t = translator(project.settings.language, $languageOverrides);
  $: languages = translationLanguages(project);
  $: rows =
    mode === "content"
      ? contentTranslationRows(project, locale)
      : Object.entries(englishTerms).map(([key, en]) => ({
          key,
          source: key,
          value: project.settings.translations[locale]?.[key] || "",
          fallback: locale === "en" ? en : locale === "ru" ? key : "",
        }));
  $: visible = rows.filter(
    (row) =>
      (row.source + " " + row.key + " " + (edits[row.key] ?? row.value))
        .toLocaleLowerCase()
        .includes(query.toLocaleLowerCase()) &&
      (!missing || !(edits[row.key] ?? row.value)),
  );
  $: reportEditorDirty(editorId, Object.keys(edits).length > 0);
  onDestroy(() => reportEditorDirty(editorId, false));
  function clear() {
    edits = {};
    error = "";
  }
  function save(activate = false) {
    try {
      let next = applyTranslations(project, locale, edits, mode === "content");
      if (activate) {
        next.settings.language = ["ru", "ro", "en"].includes(locale)
          ? (locale as "ru" | "ro" | "en")
          : "en";
        next.settings.translation_locale = ["ru", "ro", "en"].includes(locale)
          ? null
          : locale;
      }
      onapply(next);
      edits = {};
      reportEditorDirty(editorId, false);
      error = "";
    } catch (e) {
      error = String(e);
    }
  }
  function addLanguage() {
    try {
      if (
        !/^[a-z]{2,8}(?:-[A-Za-z0-9]{2,8})*$/.test(code) ||
        !name.trim() ||
        languages.some((l) => l.code === code)
      )
        throw Error(
          t(
            "Проверьте код и название языка.",
            "Verificați codul și denumirea limbii.",
            "Check the language code and name.",
          ),
        );
      onapply({
        ...project,
        settings: {
          ...project.settings,
          custom_languages: [
            ...project.settings.custom_languages,
            { code, name: name.trim() },
          ],
        },
      });
      locale = code;
      code = "";
      name = "";
      clear();
    } catch (e) {
      error = String(e);
    }
  }
</script>

<section class="translation-editor">
  <header>
    <Languages size={23} />
    <h2>{t("Переводы", "Traduceri", "Translations")}</h2>
  </header>
  <div class="translation-controls">
    <label
      >{t("Язык", "Limbă", "Language")}<select
        bind:value={locale}
        onchange={clear}
        >{#each languages as language}<option value={language.code}
            >{language.name}</option
          >{/each}</select
      ></label
    ><label
      >{t("Раздел", "Secțiune", "Section")}<select
        bind:value={mode}
        onchange={clear}
        ><option value="content"
          >{t(
            "Названия и описания данных",
            "Denumiri și descrieri",
            "Data names and descriptions",
          )}</option
        ><option value="interface"
          >{t(
            "Интерфейс программы",
            "Interfața aplicației",
            "Application interface",
          )}</option
        ></select
      ></label
    ><label
      ><input placeholder={t("Поиск", "Căutare")} bind:value={query} /></label
    ><label class="check-row"
      ><input type="checkbox" bind:checked={missing} />{t(
        "Без перевода",
        "Fără traducere",
        "Untranslated",
      )}</label
    >
  </div>
  <div class="translation-buttons">
    <button class="button" onclick={() => save()}
      ><Save size={17} />{t(
        "Сохранить переводы",
        "Salvează traducerile",
        "Save translations",
      )}</button
    ><button class="button secondary" onclick={() => save(true)}
      ><Languages size={17} />{t(
        "Использовать язык интерфейса",
        "Folosește limba interfeței",
        "Use as interface language",
      )}</button
    >
  </div>
  <details>
    <summary>{t("Добавить язык", "Adaugă o limbă", "Add a language")}</summary>
    <div class="translation-controls">
      <input placeholder="de / fr / uk / en-GB" bind:value={code} /><input
        placeholder={t("Название языка", "Denumirea limbii", "Language name")}
        bind:value={name}
      /><button class="button secondary" onclick={addLanguage}
        ><Plus size={16} />{t("Добавить", "Adaugă")}</button
      >
    </div>
  </details>
  {#if error}<p class="alert error" role="alert">{error}</p>{/if}
  <div class="table-wrap">
    <table>
      <thead
        ><tr
          ><th>{t("Исходный текст", "Text sursă", "Source text")}</th><th
            >{t("Перевод", "Traducere", "Translation")}</th
          ></tr
        ></thead
      ><tbody
        >{#each visible.slice(0, 250) as row}<tr
            ><td>{row.source}<small>{row.key}</small></td><td
              ><textarea
                rows="2"
                value={edits[row.key] ?? row.value}
                placeholder={"fallback" in row ? String(row.fallback) : ""}
                oninput={(e) =>
                  (edits = { ...edits, [row.key]: e.currentTarget.value })}
              ></textarea></td
            ></tr
          >{/each}</tbody
      >
    </table>
  </div>
  {#if visible.length > 250}<p>
      {t(
        "Уточните поиск, чтобы показать остальные строки.",
        "Precizați căutarea pentru restul rândurilor.",
        "Refine the search to show additional rows.",
      )}
    </p>{/if}
  <p class="quiet-note">
    {t(
      "Пустой перевод сохраняет исходное название. Суммы, идентификаторы и история расчётов не переводятся.",
      "O traducere goală păstrează denumirea sursă. Sumele, identificatorii și istoricul nu se traduc.",
      "Empty translations keep the source name. Amounts, identifiers and accounting history are not translated.",
    )}
  </p>
</section>

<style>
  .translation-editor {
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 20px;
    min-height: 0;
  }
  header {
    display: flex;
    gap: 12px;
    align-items: center;
  }
  h2 {
    font-size: 22px;
    margin: 0;
  }
  .translation-controls,
  .translation-buttons {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    align-items: end;
  }
  .translation-controls > label:not(.check-row) {
    display: grid;
    gap: 6px;
  }
  table {
    width: 100%;
  }
  td {
    width: 50%;
    vertical-align: top;
  }
  td small {
    display: block;
    font-size: 10px;
    color: var(--muted);
    margin-top: 5px;
    overflow-wrap: anywhere;
  }
  textarea {
    width: 100%;
    box-sizing: border-box;
    min-height: 55px;
  }
  .table-wrap {
    max-height: 55vh;
    overflow: auto;
  }
  details > div {
    margin-top: 14px;
  }
</style>
