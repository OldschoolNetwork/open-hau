<script lang="ts">
 import {languageOverrides} from "./localization";
 import {onDestroy} from "svelte";import {reportEditorDirty} from "./editor-drafts";
 export let editorId="";
 import {projectSchema,uid,type Project} from './model';import ServiceEditor from './ServiceEditor.svelte';import type {ReferenceKind} from './catalog-definitions';import {translator} from './i18n';import {Save,Check,X} from '@lucide/svelte';
 export let project:Project;export let initial:Project['services'][number]|null=null;export let onapply:(p:Project)=>void;export let onclose:()=>void;export let onreference:(kind:ReferenceKind)=>void;export let ontariffs:(id:string)=>void;
 let draft:Project['services'][number]=initial?structuredClone(initial):{id:uid(),name:{ru:'',ro:''},calculation_type:'fixed',unit:'',active:true,default_quantity:'1',notes:''},error='';$:t=translator(project.settings.language,$languageOverrides);
 function save(close=false){try{const record=structuredClone(draft);record.name.ru=record.name.ru||record.name.ro;record.name.ro=record.name.ro||record.name.ru;const next=structuredClone(project),i=next.services.findIndex(s=>s.id===record.id);if(i<0)next.services.push(record);else next.services[i]=record;onapply(projectSchema.parse(next));draft=record;error='';savedDraft=JSON.stringify(draft);reportEditorDirty(editorId,false);if(close)onclose();return true;}catch(e){error=e instanceof Error?e.message:String(e);return false;}}
 let savedDraft=JSON.stringify(draft);
 $:reportEditorDirty(editorId,!project.services.some(s=>s.id===draft.id)||JSON.stringify(draft)!==savedDraft);
 onDestroy(()=>reportEditorDirty(editorId,false));
</script>
<div class="service-record">{#if error}<p class="alert error" role="alert">{error}</p>{/if}<ServiceEditor {project} bind:draft {onreference} ontariffs={()=>{if(save())ontariffs(draft.id);}}/><footer><button class="button" onclick={()=>save(true)}><Check size={16}/>OK</button><button class="button secondary" onclick={()=>save()}><Save size={16}/>{t('Сохранить','Salvează')}</button><button class="button secondary" onclick={onclose}><X size={16}/>{t('Закрыть','Închide')}</button></footer></div>
<style>.service-record{padding:14px;display:flex;flex-direction:column;gap:14px;min-height:100%;box-sizing:border-box}footer{display:flex;justify-content:flex-end;gap:8px;margin-top:auto;padding-top:14px}</style>
