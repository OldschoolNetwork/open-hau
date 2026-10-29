<script lang="ts">
 import {languageOverrides} from "./localization";
 import {X} from '@lucide/svelte';
 import type {BalanceFilter} from './balance-view';
 import {translator} from './i18n';
 import {openReportLookup} from './report-settings';
 export let language:'ru'|'ro'|"en";export let label:string;export let items:{id:string;code:string;name:string;address?:string}[];export let filter:BalanceFilter;
 $:t=translator(language,$languageOverrides);
 function choose(){const kinds={account:'accounts',property:'properties','property-type':'property-types',service:'services',type:'service-types',provider:'counterparties'} as const;openReportLookup({id:crypto.randomUUID(),label,items,kind:kinds[filter.field],selected:[...filter.values],multiple:filter.operator==='in'||filter.operator==='not-in',onchoose:values=>filter={...filter,enabled:true,values}});}
</script>
<div class="filter-line"><label><input type="checkbox" bind:checked={filter.enabled}/>{label}</label><select aria-label={t('Тип сравнения','Tip comparație')} bind:value={filter.operator} onchange={()=>{if(filter.operator==='eq'||filter.operator==='ne')filter={...filter,values:filter.values.slice(0,1)};}}><option value="eq">{t('Равно','Egal')}</option><option value="ne">{t('Не равно','Diferit')}</option><option value="in">{t('В списке','În listă')}</option><option value="not-in">{t('Не в списке','Nu în listă')}</option></select><input aria-label={label} readonly value={filter.values.map(id=>items.find(r=>r.id===id)?.name||id).join('; ')}/><button class="lookup" aria-label={t('Выбрать из справочника','Selectează din catalog')} onclick={choose}>…</button><button class="lookup" aria-label={t('Очистить','Șterge')} onclick={()=>filter={...filter,values:[]}}><X size={14}/></button></div>
<style>
.filter-line{display:grid;grid-template-columns:155px 125px minmax(0,1fr) 34px 34px;gap:6px;align-items:center;margin:6px 0}
.filter-line label{display:flex;align-items:center;gap:7px;min-width:0}
.filter-line>input,.filter-line>select,.filter-line>button{height:36px;min-height:36px;box-sizing:border-box;margin:0;min-width:0}
.filter-line>input{width:100%;padding:0 10px}.filter-line>select{width:100%;padding:0 28px 0 10px;appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M2 4l4 4 4-4' fill='none' stroke='%23666' stroke-width='1.4'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 10px center}
.filter-line label input{width:auto}.lookup{padding:0;display:grid;place-items:center;background:transparent;color:var(--text);border:1px solid var(--border)}
@media(max-width:650px){.filter-line{grid-template-columns:100px 100px minmax(0,1fr) 34px 34px;gap:4px}}
</style>
