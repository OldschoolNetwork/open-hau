<script lang="ts">
  import type { DesktopCommand } from "./desktop-menu";
  import {commandIcon} from "./desktop-icons";
  export let menus: DesktopCommand[];
  export let language: "ru" | "ro";
  export let oncommand: (action: string) => void;
  let root: HTMLElement;
  let activeMenu:string|null=null;
  function close(){activeMenu=null;root?.querySelectorAll('.desktop-submenu[open]').forEach(d=>(d as HTMLDetailsElement).open=false);}
  function outside(e:PointerEvent){if(root&&!root.contains(e.target as Node))close();}
  function topKey(e:KeyboardEvent,id:string){
    if(e.key==="ArrowLeft"||e.key==="ArrowRight"){e.preventDefault();const index=menus.findIndex(m=>m.id===id),next=menus[(index+(e.key==="ArrowRight"?1:menus.length-1))%menus.length];activeMenu=next.id;requestAnimationFrame(()=>root.querySelector<HTMLDetailsElement>(`details[data-menu="${next.id}"]`)?.querySelector<HTMLElement>("summary")?.focus());}
    else if(e.key==="ArrowDown"){e.preventDefault();activeMenu=id;requestAnimationFrame(()=>root.querySelector<HTMLElement>(`details[data-menu="${id}"] button:not(:disabled)`)?.focus());}
    else key(e);
  }
  function run(action: string) {
    close();
    root
      .querySelectorAll("details[open]")
      .forEach((d) => ((d as HTMLDetailsElement).open = false));
    oncommand(action);
  }
  function key(e: KeyboardEvent) {
    if (e.key === "Escape") {
      close();
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
<svelte:window onpointerdown={outside} onblur={close}/>

{#snippet entries(items: DesktopCommand[])}
  {#each items as item}
    {@const Icon=commandIcon(item)}
    {#if item.children}<details class="desktop-submenu" onpointerenter={e=>{if(e.pointerType!=="touch"&&activeMenu){for(const sibling of e.currentTarget.parentElement?.children||[])if(sibling!==e.currentTarget&&sibling instanceof HTMLDetailsElement)sibling.open=false;e.currentTarget.open=true;}}}>
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
      data-menu={menu.id}
      open={activeMenu===menu.id}
    >
      <summary onclick={e=>{e.preventDefault();activeMenu=activeMenu===menu.id?null:menu.id;}} onpointerenter={e=>{if(e.pointerType!=="touch"&&activeMenu!==null)activeMenu=menu.id;}} onkeydown={e=>topKey(e,menu.id)}><Icon size={15}/><span>{menu[language]}</span></summary>
      <div class="desktop-dropdown">{@render entries(menu.children || [])}</div>
    </details>{/each}
</nav>
