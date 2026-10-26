<script lang="ts">
  import type { DesktopCommand } from "./desktop-menu";
  import {commandIcon} from "./desktop-icons";
  export let menus: DesktopCommand[];
  export let language: "ru" | "ro";
  export let oncommand: (action: string) => void;
  let root: HTMLElement;
  function run(action: string) {
    root
      .querySelectorAll("details[open]")
      .forEach((d) => ((d as HTMLDetailsElement).open = false));
    oncommand(action);
  }
  function key(e: KeyboardEvent) {
    if (e.key === "Escape") {
      const opened = [
        ...root.querySelectorAll("details[open]"),
      ].reverse()[0] as HTMLDetailsElement | undefined;
      if (opened) {
        opened.open = false;
        opened.querySelector("summary")?.focus();
        e.stopPropagation();
      }
    }
  }
</script>

{#snippet entries(items: DesktopCommand[])}
  {#each items as item}
    {@const Icon=commandIcon(item)}
    {#if item.children}<details class="desktop-submenu">
        <summary onkeydown={key}><Icon size={16}/><span class="desktop-menu-label">{item[language]}</span><span>›</span></summary>
        <div class="desktop-dropdown">{@render entries(item.children)}</div>
      </details>
    {:else}<button
        onkeydown={key}
        disabled={!item.action}
        title={!item.action
          ? language === "ru"
            ? "Недоступно в этой предварительной версии"
            : "Indisponibil în această versiune preliminară"
          : undefined}
        onclick={() => item.action && run(item.action)}><Icon size={16}/><span>{item[language]}</span></button
      >{/if}
  {/each}
{/snippet}
<nav
  bind:this={root}
  class="desktop-menubar"
  aria-label={language === "ru" ? "Главное меню" : "Meniu principal"}
>
  {#each menus as menu}{@const Icon=commandIcon(menu)}<details
      class="desktop-menu"
      ontoggle={(e) => {
        if (e.currentTarget.open)
          for (const sibling of root.children)
            if (
              sibling !== e.currentTarget &&
              (sibling as HTMLDetailsElement).open
            )
              (sibling as HTMLDetailsElement).open = false;
      }}
    >
      <summary onkeydown={key}><Icon size={15}/><span>{menu[language]}</span></summary>
      <div class="desktop-dropdown">{@render entries(menu.children || [])}</div>
    </details>{/each}
</nav>
