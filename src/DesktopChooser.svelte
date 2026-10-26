<script lang="ts">
  import {Check,X} from "@lucide/svelte";
  import { chooserGroups } from "./desktop-menu";
  export let group: string,
    language: "ru" | "ro",
    oncommand: (action: string) => void,
    onclose: () => void;
  let selected = "",
    query = "";
  $: items =
    chooserGroups[group]?.items.filter((item) =>
      item[language].toLocaleLowerCase().includes(query.toLocaleLowerCase()),
    ) || [];
  $: chosen = items.find((item) => item.id === selected);
</script>

<div class="desktop-chooser">
  <div class="desktop-chooser-list">
    <input
      aria-label={language === "ru" ? "Поиск в списке" : "Căutare în listă"}
      placeholder={language === "ru" ? "Поиск" : "Căutare"}
      bind:value={query}
    />
    <div
      class="desktop-list"
      role="listbox"
      aria-label={chooserGroups[group]?.[language]}
    >
      {#each items as item}<button
          role="option"
          aria-selected={selected === item.id}
          class:selected={selected === item.id}
          class:unavailable={!item.action}
          onclick={() => (selected = item.id)}
          ondblclick={() => item.action && oncommand(item.action)}
          onkeydown={(e) => {
            if (e.key === "Enter" && item.action) {
              e.preventDefault();
              oncommand(item.action);
            }
          }}>{item[language]}</button
        >{/each}
    </div>
  </div>
  <div class="desktop-chooser-actions">
    <button
      class="button"
      disabled={!chosen?.action}
      onclick={() => chosen?.action && oncommand(chosen.action)}><Check size={16}/>OK</button
    ><button class="button secondary" onclick={onclose}
      ><X size={16}/>{language === "ru" ? "Закрыть" : "Închidere"}</button
    >
  </div>
</div>
