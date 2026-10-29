<script lang="ts">
 import {languageOverrides} from "./localization";
 import {onDestroy} from 'svelte';import {Save,Check,X} from '@lucide/svelte';import {translator} from './i18n';import {projectSchema,type Project} from './model';import {reportEditorDirty} from './editor-drafts';
 export let project:Project;export let editorId:string;export let onapply:(p:Project)=>void;export let onclose:()=>void;
 let draft=structuredClone(project.organization),baseline=JSON.stringify(draft),error='';$:t=translator(project.settings.language,$languageOverrides);
 $:reportEditorDirty(editorId,JSON.stringify(draft)!==baseline);
 onDestroy(()=>reportEditorDirty(editorId,false));
 function save(close=false){try{const next=projectSchema.parse({...project,organization:draft});onapply(next);baseline=JSON.stringify(draft);error='';if(close)onclose();}catch(e){error=t('Проверьте название и реквизиты организации.','Verificați denumirea și datele organizației.');}}
 const fields=[['name','Наименование','Denumire'],['association_code','Код организации','Cod organizație'],['fiscal_code','Фискальный код','Cod fiscal'],['bank','Банк','Bancă'],['iban','IBAN','IBAN'],['address','Адрес','Adresă'],['notes','Примечание','Notă']] as const;
</script>
<div class="organization-editor">{#if error}<p role="alert">{error}</p>{/if}{#each fields as field}<label><span>{field[project.settings.language==='ru'?1:2]}</span>{#if field[0]==='notes'}<textarea bind:value={draft[field[0]]}></textarea>{:else}<input bind:value={draft[field[0]]}/>{/if}</label>{/each}<footer><button class="button" onclick={()=>save(true)}><Check size={16}/>OK</button><button class="button secondary" onclick={()=>save()}><Save size={16}/>{t('Сохранить','Salvează')}</button><button class="button secondary" onclick={onclose}><X size={16}/>{t('Закрыть','Închide')}</button></footer></div>
<style>.organization-editor{padding:18px;display:flex;flex-direction:column;gap:16px}.organization-editor label{display:grid;grid-template-columns:160px minmax(0,1fr);gap:12px;align-items:center}.organization-editor input,.organization-editor textarea{min-width:0;width:100%}footer{display:flex;gap:8px;justify-content:flex-end;padding-top:16px}</style>
