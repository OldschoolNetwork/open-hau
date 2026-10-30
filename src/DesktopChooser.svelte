<script lang="ts">
 import {languageOverrides} from "./localization";
 import {uiText} from "./english";
 import {uiLabel} from "./english";
  import {LayoutGrid,List} from "./icons";
  import {commandIcon} from "./desktop-icons";
  import {onMount} from "svelte";
  import { chooserGroups } from "./desktop-menu";
  export let group: string,
    language: "ru" | "ro"|"en",
    oncommand: (action: string) => void;
  let selected = "",
    query = "";
  let tiles=false;
  onMount(()=>{tiles=localStorage.getItem("openhau-catalog-view")==="tiles";});
  function toggleView(){tiles=!tiles;localStorage.setItem("openhau-catalog-view",tiles?"tiles":"list");}
  $: items =
    chooserGroups[group]?.items.filter((item) =>
      uiLabel(item,language,$languageOverrides).toLocaleLowerCase().includes(query.toLocaleLowerCase()),
    ) || [];
  $: chosen = items.find((item) => item.id === selected);
</script>

<div class="desktop-chooser">
  <div class="desktop-chooser-list">
    <div class="chooser-toolbar">
    <input
      aria-label={uiText("Поиск в списке","Căutare în listă",language,$languageOverrides)}
      placeholder={uiText("Поиск","Căutare",language,$languageOverrides)}
      bind:value={query}
    />
    <button class="button secondary" aria-pressed={tiles} onclick={toggleView}>{#if tiles}<List size={17}/>{:else}<LayoutGrid size={17}/>{/if}{uiText("Вид","Vizualizare",language,$languageOverrides)} · {tiles?(uiText("Плитки","Dale",language,$languageOverrides)):(uiText("Список","Listă",language,$languageOverrides))}</button>
    </div>
    <div
      class="desktop-list"
      class:desktop-tiles={tiles}
      role="listbox"
      aria-label={chooserGroups[group]?.[language==='en'?'ru':language]}
    >
      {#each items as item}{@const Icon=commandIcon(item)}<button
          role="option"
          aria-selected={selected === item.id}
          class:selected={selected === item.id}
          class:unavailable={!item.action}
          onclick={() => {selected = item.id;if(item.action)oncommand(item.action);}}
          ondblclick={() => item.action && oncommand(item.action)}
          onkeydown={(e) => {
            if (e.key === "Enter" && item.action) {
              e.preventDefault();
              oncommand(item.action);
            }
          }}><Icon size={tiles?30:17}/><span>{uiLabel(item,language,$languageOverrides)}</span></button
        >{/each}
    </div>
  </div>
</div>
<style>
 .chooser-toolbar{display:flex;gap:12px;align-items:center}.chooser-toolbar input{flex:1;min-width:0}.chooser-toolbar button{flex:none}
 .desktop-list:not(.desktop-tiles)>button{display:flex;align-items:center;gap:10px}
 .desktop-list.desktop-tiles{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:18px;align-content:start;border:0;padding:8px}
 .desktop-tiles>button{width:100%;aspect-ratio:1;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:16px;text-align:center;border:1px solid transparent;background:transparent;padding:16px}
 .desktop-tiles>button :global(svg){color:var(--accent)}
 .desktop-tiles>button:hover{background:var(--hover);border-color:transparent;box-shadow:inset 0 0 0 1px var(--reveal-ink,#00000024)}
</style>
