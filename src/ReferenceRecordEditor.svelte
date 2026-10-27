<script lang="ts">
 import {type Project,uid} from "./model";import {catalogFields,type ReferenceKind} from "./catalog-definitions";import {referenceRows,newReferenceRecord,saveReferenceRecord,referenceOptions,type ReferenceRecord} from "./reference-catalogs";import {translator} from "./i18n";import {issueText} from "./validation-language";import {ZodError} from "zod";import {Save,X} from "@lucide/svelte";
 export let project:Project;export let kind:ReferenceKind;export let recordId:string;export let onapply:(p:Project)=>void;export let onclose:()=>void;
 let original=referenceRows(project,kind).find(r=>r.id===recordId),draft:ReferenceRecord=original?structuredClone(original):newReferenceRecord(project,kind),error="";
 $:t=translator(project.settings.language);
 function save(){try{onapply(saveReferenceRecord(project,kind,draft));error="";onclose();}catch(e){error=e instanceof ZodError?e.issues.slice(0,3).map(i=>issueText(i,project.settings.language)).join("; "):e instanceof Error?e.message:String(e);}}
</script>
<form class="reference-editor" onsubmit={e=>{e.preventDefault();save();}}>
 {#if error}<p role="alert" class="alert error">{error}</p>{/if}
 <label>{t("Код","Cod")}<input bind:value={draft.code}/></label><label>{t("Наименование","Denumire")}<input bind:value={draft.name} required/></label>
 {#each catalogFields[kind] as field}<label>{field[project.settings.language]}{#if field.reference}<select bind:value={draft.attributes[field.key]}><option value="">—</option>{#each referenceOptions(project,field.reference) as option}<option value={option.id}>{option.name}</option>{/each}</select>{:else}<input type={field.type||"text"} value={draft.attributes[field.key]||""} step={field.type==="number"?"any":undefined} min={field.type==="number"?"0":undefined} oninput={e=>draft.attributes[field.key]=e.currentTarget.value}/>{/if}</label>{/each}
 <label class="check-row"><input type="checkbox" bind:checked={draft.active}/>{t("Активная запись","Înregistrare activă")}</label>
 <label>{t("Примечание","Notă")}<textarea rows="3" bind:value={draft.notes}></textarea></label>
 {#if ["norms","benefit-calculation","allocation-bases","calculation-bases"].includes(kind)}<p class="quiet-note">{t("Запись справочника не заменяет документ назначения нормы или правила расчёта.","Înregistrarea catalogului nu înlocuiește documentul de atribuire a normei sau a regulii de calcul.")}</p>{/if}
 <div class="reference-footer"><button class="button" type="submit"><Save size={16}/>{t("Сохранить","Salvează")}</button><button class="button secondary" type="button" onclick={onclose}><X size={16}/>{t("Отмена","Anulare")}</button></div>
</form>
<style>.reference-editor{padding:22px;display:flex;flex-direction:column;gap:18px;max-width:800px}.reference-editor>label:not(.check-row){display:grid;grid-template-columns:180px minmax(0,1fr);align-items:center;gap:16px}.reference-editor input,.reference-editor select,.reference-editor textarea{min-width:0;width:100%}.reference-footer{position:sticky;bottom:0;display:flex;gap:12px;background:var(--surface);padding:14px 0}</style>
