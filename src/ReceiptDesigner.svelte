<script lang="ts">
 import {languageOverrides} from "./localization";
  import { translator } from "./i18n";
  import { defaultCustomReceipt, type Project } from "./model";
  export let project: Project;
  export let onapply: (next: Project) => void;
  let design: NonNullable<Project["settings"]["custom_receipt"]> = {
    ...defaultCustomReceipt,
  };
  $: design = { ...defaultCustomReceipt, ...project.settings.custom_receipt };
  $: tr = translator(project.settings.language,$languageOverrides);
  function apply() {
    onapply({
      ...project,
      settings: { ...project.settings, custom_receipt: { ...design } },
    });
  }
</script>

<fieldset>
  <legend>{tr("Конструктор оформления", "Editor de aspect")}</legend>
  <label
    >{tr("Шрифт", "Font")}<select bind:value={design.font} onchange={apply}
      ><option value="sans">{tr("Без засечек", "Sans serif")}</option><option
        value="serif">{tr("С засечками", "Serif")}</option
      ><option value="mono">{tr("Моноширинный", "Monospațiat")}</option></select
    ></label
  >
  <label
    >{tr("Фоновый узор", "Model de fundal")}<select
      bind:value={design.decoration}
      onchange={apply}
      ><option value="none">{tr("Без узора", "Fără model")}</option><option
        value="stripes">{tr("Диагональные линии", "Linii diagonale")}</option
      ><option value="dots">{tr("Точки", "Puncte")}</option></select
    ></label
  >
  <label
    >{tr("Рамка", "Chenar")}<select bind:value={design.border} onchange={apply}
      ><option value="none">{tr("Без рамки", "Fără chenar")}</option><option
        value="line">{tr("Одинарная", "Simplu")}</option
      ><option value="double">{tr("Двойная", "Dublu")}</option></select
    ></label
  >
  <label
    >{tr("Выравнивание шапки", "Alinierea antetului")}<select
      bind:value={design.heading}
      onchange={apply}
      ><option value="left">{tr("Слева", "La stânga")}</option><option
        value="center">{tr("По центру", "Centrat")}</option
      ></select
    ></label
  >
  <label class="check"
    ><input
      type="checkbox"
      bind:checked={design.economy}
      onchange={apply}
    />{tr(
      "Экономная печать без фона",
      "Imprimare economică fără fundal",
    )}</label
  >
  <p>
    {tr(
      "Цвет, размер шрифта и логотип задаются ниже. Сохраните результат как конфигурацию оформления.",
      "Culoarea, dimensiunea fontului și sigla se stabilesc mai jos. Salvați rezultatul ca o configurație de aspect.",
    )}
  </p>
</fieldset>

<style>
  fieldset {
    border: 1px solid var(--border);
    padding: 12px;
    margin: 12px 0;
  }
  label {
    display: grid;
    gap: 6px;
    margin-bottom: 10px;
  }
  .check {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  p {
    font-size: 12px;
  }
</style>
