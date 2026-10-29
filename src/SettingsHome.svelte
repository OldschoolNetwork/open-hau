<script lang="ts">
 import {languageOverrides} from "./localization";
 import {uiText} from "./english";
 import {uiLabel} from "./english";
 import {Keyboard,Palette,Building2,Calculator,Archive,Download,Bell,Database,Info,LockKeyhole} from "@lucide/svelte";
 export let language:"ru"|"ro"|"en";export let onselect:(id:string,term?:string)=>void;let query="",searchOpen=false;
 const categories=[{id:"translations",ru:"Языки и переводы",ro:"Limbi și traduceri",icon:Info},{id:"security",ru:"Защита базы",ro:"Protecția bazei",icon:LockKeyhole},{id:"keyboard",ru:"Сочетания клавиш",ro:"Comenzi rapide",icon:Keyboard},{id:"appearance",ru:"Персонализация",ro:"Personalizare",icon:Palette},{id:"organization",ru:"Организация",ro:"Organizație",icon:Building2},{id:"calculations",ru:"Расчёты и квитанции",ro:"Calcule și facturi",icon:Calculator},{id:"backups",ru:"Резервные копии",ro:"Copii de rezervă",icon:Archive},{id:"exports",ru:"Экспорт отчётов",ro:"Export rapoarte",icon:Download},{id:"notifications",ru:"Уведомления и звуки",ro:"Notificări și sunete",icon:Bell},{id:"data",ru:"Базы данных",ro:"Baze de date",icon:Database},{id:"updates",ru:"Обновления",ro:"Actualizări",icon:Info},{id:"about",ru:"О программе",ro:"Despre aplicație",icon:Info}];
 const settings=[
 ['security','Пароль и шифрование базы','Parola și criptarea bazei'],
 ['keyboard','Сочетания клавиш','Comenzi rapide'],
 ['appearance','Тема','Temă'],['appearance','Акцентный цвет','Culoare accent'],['appearance','Язык интерфейса','Limba interfeței'],['appearance','Формат даты','Formatul datei'],['appearance','Формат расчётного месяца','Formatul lunii de calcul'],
 ['organization','Организация','Organizație'],['organization','Название организации','Denumirea organizației'],['organization','Банковские реквизиты','Date bancare'],
 ['calculations','Округление денежных сумм','Rotunjirea sumelor'],['calculations','Срок оплаты','Termen de plată'],['calculations','Заголовок квитанции','Titlul facturii'],['calculations','Подпись внизу','Text de subsol'],
 ['backups','Папка резервного копирования','Dosar copii de rezervă'],['backups','Создать резервную копию','Creează copie de rezervă'],['exports','Форматы экспорта','Formate export'],['exports','Автоматический экспорт','Export automat'],
 ['notifications','Показывать уведомления','Afișare notificări'],['notifications','Системный звук','Sunet de sistem'],['notifications','Анимация появления','Animație de apariție'],['notifications','Время показа','Durata afișării'],['data','Автоматически открывать базу','Deschidere automată a bazei'],['data','Каталог баз данных','Catalogul bazelor de date'],['updates','Обновления','Actualizări'],['about','О программе','Despre aplicație']
 ];
 $: results=query.trim()?settings.filter(row=>[...row.slice(1),uiLabel(categories.find(c=>c.id===row[0])!,language,$languageOverrides)].join(' ').toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())):[];
</script>
<svelte:window onpointerdown={e=>{if(!(e.target instanceof Element)||!e.target.closest('.settings-search'))searchOpen=false;}}/>
<div class="settings-home"><h1>{uiText('Параметры OpenHaU','Setări OpenHaU',language,$languageOverrides)}</h1><div class="settings-search"><input aria-label={uiText('Поиск параметров','Căutare setări',language,$languageOverrides)} placeholder={uiText('Найти параметр','Găsiți o setare',language,$languageOverrides)} bind:value={query} onfocus={()=>searchOpen=true} oninput={()=>searchOpen=true} onkeydown={e=>{if(e.key==='Escape')searchOpen=false;}}/>{#if searchOpen&&query.trim()}<div class="search-results">{#each results as result}{@const category=categories.find(c=>c.id===result[0])!}<button onclick={()=>{searchOpen=false;onselect(result[0],result[language==='ru'?1:2]);}}><category.icon size={19}/><span>{result[language==='ru'?1:2]}<small>{uiLabel(category,language,$languageOverrides)}</small></span></button>{/each}{#if !results.length}<p>{uiText('Ничего не найдено','Niciun rezultat',language,$languageOverrides)}</p>{/if}</div>{/if}</div><div class="settings-categories">{#each categories as category}<button onclick={()=>onselect(category.id)}><category.icon size={30}/><span>{uiLabel(category,language,$languageOverrides)}</span></button>{/each}</div></div>




<style>
.settings-home{padding:26px 20px}.settings-home h1{text-align:center;font-size:28px;font-weight:400;margin:0 0 26px}.settings-categories{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:26px}.settings-categories button{display:flex;align-items:center;gap:18px;padding:22px 16px;min-height:88px;border:0;background:transparent;text-align:left;color:var(--text)}.settings-categories button :global(svg){color:var(--accent);flex:none}.settings-categories button:hover{background:var(--hover);box-shadow:inset 0 0 0 1px var(--reveal-ink,#0002)}
.settings-search{position:relative;max-width:440px;margin:0 auto 40px}.settings-search>input{width:100%}.search-results{position:absolute;top:calc(100% + 4px);left:0;right:0;z-index:30;background:color-mix(in srgb,var(--surface) 94%,transparent);backdrop-filter:blur(22px);box-shadow:0 10px 28px #0004;max-height:360px;overflow:auto;padding:6px}.search-results button{display:flex;gap:12px;width:100%;border:0;text-align:left;background:none;color:var(--text);padding:12px}.search-results button:hover{background:var(--hover)}.search-results small{display:block;color:var(--muted);margin-top:4px}
</style>
