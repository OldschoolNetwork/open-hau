<script lang="ts">
 import {languageOverrides} from "./localization";
 import {Plus,Copy,Pencil,Trash2,RefreshCw,Filter,FilterX,CheckCheck,Undo2,FileText} from "./icons";import {translator} from './i18n';
 export let language:'ru'|'ro'|"en";export let selected=false;export let onadd:(()=>void)|undefined=undefined;export let oncopy:(()=>void)|undefined=undefined;export let onedit:(()=>void)|undefined=undefined;export let onremove:(()=>void)|undefined=undefined;export let onrefresh:(()=>void)|undefined=undefined;export let onfilter:(()=>void)|undefined=undefined;export let onclearfilter:(()=>void)|undefined=undefined;export let onpost:(()=>void)|undefined=undefined;export let onunpost:(()=>void)|undefined=undefined;export let onmovements:(()=>void)|undefined=undefined;export let canPost=false,canUnpost=false,filterActive=false;export let removeLabel='';
 $:t=translator(language,$languageOverrides);
</script>
<div class="record-toolbar" role="toolbar" aria-label={t('Команды списка','Comenzile listei')}>
 {#if onadd}<button onclick={onadd}><Plus size={17} class="add-icon"/>{t('Добавить','Adaugă')}</button>{/if}
 {#if oncopy}<button disabled={!selected} onclick={oncopy}><Copy size={17} class="copy-icon"/>{t('Копировать','Copiază')}</button>{/if}
 {#if onedit}<button disabled={!selected} onclick={onedit}><Pencil size={17} class="edit-icon"/>{t('Редактировать','Editează')}</button>{/if}
 {#if onremove}<button class="icon-command split" title={removeLabel||t('Пометить на удаление','Marchează pentru ștergere')} aria-label={removeLabel||t('Пометить на удаление','Marchează pentru ștergere')} disabled={!selected} onclick={onremove}><Trash2 size={17} class="remove-icon"/></button>{/if}
 {#if onrefresh}<button class="icon-command" title={t('Обновить','Actualizează')} aria-label={t('Обновить','Actualizează')} onclick={onrefresh}><RefreshCw size={17} class="edit-icon"/></button>{/if}
 {#if onfilter}<button class="icon-command split" title={t('Отбор','Filtrare')} aria-label={t('Отбор','Filtrare')} aria-pressed={filterActive} onclick={onfilter}><Filter size={17} class="copy-icon"/></button>{/if}
 {#if onclearfilter}<button class="icon-command" title={t('Снять отбор','Resetează filtrul')} aria-label={t('Снять отбор','Resetează filtrul')} disabled={!filterActive} onclick={onclearfilter}><FilterX size={17}/></button>{/if}
 {#if onpost}<button class="icon-command split" title={t('Провести','Aplică')} aria-label={t('Провести','Aplică')} disabled={!selected||!canPost} onclick={onpost}><CheckCheck size={18} class="add-icon"/></button>{/if}
 {#if onunpost}<button class="icon-command" title={t('Отменить проведение','Anulează aplicarea')} aria-label={t('Отменить проведение','Anulează aplicarea')} disabled={!selected||!canUnpost} onclick={onunpost}><Undo2 size={18} class="remove-icon"/></button>{/if}
 {#if onmovements}<button class="icon-command split" title={t('Движения','Înregistrări')} aria-label={t('Движения','Înregistrări')} disabled={!selected} onclick={onmovements}><FileText size={17} class="edit-icon"/></button>{/if}
</div>
<style>.record-toolbar{display:flex;align-items:center;gap:2px;flex-wrap:wrap;padding:4px 0;border-bottom:1px solid var(--border)}button{display:flex;gap:5px;align-items:center;background:transparent;color:var(--text);border:0;padding:6px 7px;min-height:30px;font-size:12px}.icon-command{width:32px;justify-content:center}.split{margin-left:4px;box-shadow:-1px 0 var(--border)}button:disabled{opacity:.35}.record-toolbar :global(.add-icon){color:#55aa58}.record-toolbar :global(.copy-icon){color:#c5a24a}.record-toolbar :global(.edit-icon){color:#49a5d0}.record-toolbar :global(.remove-icon){color:#db7272}</style>
