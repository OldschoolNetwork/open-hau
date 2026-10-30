<script lang="ts">
import {translatedName} from './localization';

 import {languageOverrides} from "./localization";
 import {onMount} from "svelte";import type {Project,Service} from "./model";import {unitLabel,projectSchema,uid} from "./model";import RecordToolbar from "./RecordToolbar.svelte";import {translator} from "./i18n";import {Plus,LayoutGrid,List,Layers3,ReceiptText,Pencil,Search} from "./icons";
 export let project:Project;export let onapply:(p:Project)=>void;export let onedit:(service?:Service)=>void;
 let tiles=false,query="",activeOnly=false,selected="",filterOpen=false;
 $: current=project.services.find(s=>s.id===selected);
 function mark(){if(!current)return;const next=structuredClone(project);const row=next.services.find(s=>s.id===selected)!;row.marked_for_deletion=!row.marked_for_deletion;onapply(projectSchema.parse(next));}
 onMount(()=>tiles=localStorage.getItem("openhau-services-view")==="tiles");
 $: t=translator(project.settings.language,$languageOverrides);
 $: rows=project.services.filter(s=>(!activeOnly||s.active)&&translatedName(s.name,project.settings.language,$languageOverrides).toLocaleLowerCase().includes(query.toLocaleLowerCase()));
 function view(){tiles=!tiles;localStorage.setItem("openhau-services-view",tiles?"tiles":"list");}
 function basis(s:Service){return s.calculation_type==="metered"?t("По счётчику","După contor"):s.calculation_type==="person"?t("За человека","Pe persoană"):s.calculation_type==="area"?t("По площади","Pe suprafață"):s.calculation_type==="manual"?t("Ручной объём","Volum manual"):t("За счёт","Pe cont");}
</script>
<div class="service-catalog">
 <RecordToolbar language={project.settings.language} selected={!!current} onadd={()=>onedit()} onedit={()=>current&&onedit(current)} oncopy={()=>{if(current)onedit({...structuredClone(current),id:uid(),marked_for_deletion:false,name:{...current.name,ru:current.name.ru+' (копия)',ro:current.name.ro+' (copie)'}});}} onremove={mark} onrefresh={()=>selected=''} onfilter={()=>filterOpen=!filterOpen} onclearfilter={()=>{query='';activeOnly=false;}} filterActive={!!query||activeOnly}/>
 <div class="services-toolbar">{#if filterOpen}<label class="catalog-search"><Search size={16}/><input aria-label={t('Поиск услуги','Căutare serviciu')} bind:value={query}/></label><label class="check-row"><input type="checkbox" bind:checked={activeOnly}/>{t('Только активные','Doar active')}</label>{/if}<button class="button secondary" aria-pressed={tiles} onclick={view}>{#if tiles}<List size={17}/>{:else}<LayoutGrid size={17}/>{/if}{t('Вид','Vizualizare')} · {tiles?t('Плитки','Dale'):t('Список','Listă')}</button></div>
 {#if tiles}<div class="catalog-tiles">{#each rows as s}<button class="service-tile" onclick={()=>onedit(s)}><Layers3 size={32}/><strong>{translatedName(s.name,project.settings.language,$languageOverrides)}</strong><span>{basis(s)} · {unitLabel(s.unit,project.settings.language)}</span><small>{s.active?t("Активна","Activ"):t("Отключена","Dezactivat")}</small></button>{/each}</div>{:else}<div class="table-wrap"><table><thead><tr><th>{t('Код','Cod')}</th><th>{t('Наименование','Denumire')}</th></tr></thead><tbody>{#each rows as service,i}<tr class:selected={selected===service.id} class:archived={!service.active||service.marked_for_deletion} onclick={()=>selected=service.id} ondblclick={()=>onedit(service)}><td>{service.report_order??i+1}</td><td>{translatedName(service.name,project.settings.language,$languageOverrides)}</td></tr>{/each}</tbody></table></div>{/if}
 {#if !rows.length}<p>{t("Услуги не найдены","Servicii negăsite")}</p>{/if}
</div>
<style>
 table{width:100%;border-collapse:collapse}th,td{padding:8px;text-align:left}th{background:#80808020}.selected{background:#489bcb30}.archived{color:var(--muted)}
 .service-catalog{display:flex;flex-direction:column;gap:20px}.services-toolbar{display:flex;align-items:center;gap:12px;flex-wrap:wrap}.catalog-search{display:flex;gap:8px;align-items:center;flex:1;min-width:160px}.catalog-search input{width:100%}
 .catalog-tiles{display:grid;grid-template-columns:repeat(auto-fill,minmax(175px,1fr));gap:22px;padding:8px}.service-tile{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;aspect-ratio:1;padding:20px;background:transparent;border:0;color:var(--text);text-align:center}.service-tile :global(svg){color:var(--accent)}.service-tile:hover{background:var(--hover);box-shadow:inset 0 0 0 1px var(--reveal-ink,#00000024)}.service-tile strong{font-size:14px}.service-tile span,.service-tile small{color:var(--muted)}
</style>
