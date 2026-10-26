<script lang="ts">
  import { translator } from "./i18n";
  import { uid, today, type Project, type TariffDocument } from "./model";
  import { saveTariffDocument } from "./tariff-documents";
  import { issueText } from "./validation-language";
  import { ZodError } from "zod";
  export let project: Project;
  export let onapply: (next: Project) => void;
  let draft: TariffDocument | null = null;
  let error = "";
  $: tr = translator(project.settings.language);
  function addRow() {
    if (draft) draft.rows = [...draft.rows, {id: uid(), service_id: project.services[0]?.id || "", effective_from: project.settings.period + "-01", rate: "0", tariff_id: null}];
  }
  function create() {
    draft = {id: uid(), number: "", date: today(), comment: "", state: "draft", rows: []};
    error = ""; addRow();
  }
  function save(apply: boolean) {
    if (!draft) return;
    try {
      onapply(saveTariffDocument(project, draft, apply));
      draft = null; error = "";
    } catch (e) {
      error = e instanceof ZodError ? e.issues.slice(0, 3).map(i => issueText(i, project.settings.language)).join("; ") : e instanceof Error ? e.message : String(e);
    }
  }
</script>

<article class="panel">
  <div class="panel-heading"><div><h2>{tr("Документы изменения тарифов", "Documente de modificare a tarifelor")}</h2><p>{tr("Черновики не влияют на расчёт. Применение добавляет тарифы всех строк документа.", "Ciornele nu influențează calculul. Aplicarea adaugă tarifele tuturor rândurilor documentului.")}</p></div><button class="button small" onclick={create}>{tr("Новый документ", "Document nou")}</button></div>
  {#if error}<p class="alert error" role="alert">{error}</p>{/if}
  {#if draft}
    <form onsubmit={e => {e.preventDefault(); save(false);}}>
      <fieldset disabled={draft.state === "applied"}>
        <div class="two-fields"><label>{tr("Номер", "Număr")}<input bind:value={draft.number} required/></label><label>{tr("Дата документа", "Data documentului")}<input type="date" bind:value={draft.date} required/></label></div>
        <label>{tr("Комментарий", "Comentariu")}<textarea bind:value={draft.comment}></textarea></label>
        <div class="table-wrap"><table><thead><tr><th>{tr("Услуга", "Serviciu")}</th><th>{tr("Действует с первого числа", "Valabil din prima zi a lunii")}</th><th>{tr("Тариф, MDL", "Tarif, MDL")}</th><th></th></tr></thead><tbody>
          {#each draft.rows as row (row.id)}<tr><td><select bind:value={row.service_id} aria-label={tr("Услуга", "Serviciu")}>{#each project.services as s}<option value={s.id}>{s.name[project.settings.language]}</option>{/each}</select></td><td><input type="date" bind:value={row.effective_from} aria-label={tr("Действует с", "Valabil din")}/></td><td><input bind:value={row.rate} aria-label={tr("Тариф", "Tarif")}/></td><td><button type="button" class="text-button" disabled={draft.rows.length === 1} onclick={() => {if(draft) draft.rows = draft.rows.filter(r => r.id !== row.id);}}>{tr("Убрать строку", "Eliminare rând")}</button></td></tr>{/each}
        </tbody></table></div>
        <button type="button" class="button secondary small" onclick={addRow}>{tr("Добавить строку", "Adăugare rând")}</button>
      </fieldset>
      <div class="toolbar">
        {#if draft.state === "draft"}<button type="submit" class="button secondary">{tr("Сохранить черновик", "Salvare ciornă")}</button><button type="button" class="button" onclick={() => save(true)}>{tr("Применить документ", "Aplicare document")}</button>{/if}
        <button type="button" class="text-button" onclick={() => {draft = null; error = "";}}>{tr("Закрыть", "Închidere")}</button>
      </div>
    </form>
  {/if}
  <div class="table-wrap"><table><thead><tr><th>{tr("Дата", "Data")}</th><th>{tr("Номер", "Număr")}</th><th>{tr("Комментарий", "Comentariu")}</th><th>{tr("Состояние", "Stare")}</th><th></th></tr></thead><tbody>
    {#each [...project.tariff_documents].sort((a,b) => b.date.localeCompare(a.date)) as doc}<tr><td>{doc.date}</td><td>{doc.number}</td><td>{doc.comment}</td><td>{doc.state === "applied" ? tr("Применён", "Aplicat") : tr("Черновик", "Ciornă")}</td><td><button class="text-button" onclick={() => {draft = structuredClone(doc); error = "";}}>{tr("Открыть", "Deschidere")}</button></td></tr>{:else}<tr><td colspan="5">{tr("Документов пока нет.", "Nu există documente.")}</td></tr>{/each}
  </tbody></table></div>
</article>

<style>fieldset{border:0;padding:0;margin:0}form{border-bottom:1px solid var(--border);padding-bottom:18px;margin-bottom:18px}</style>
