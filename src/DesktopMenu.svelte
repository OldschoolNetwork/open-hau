<script lang="ts">
  import type { DesktopCommand } from "./desktop-menu";
  import {commandIcon} from "./desktop-icons";
  export let menus: DesktopCommand[];
  export let language: "ru" | "ro";
  export let oncommand: (action: string) => void;
  export let onshortcut:(item:DesktopCommand,windows:boolean)=>void=()=>{};
  let shortcut:DesktopCommand|null=null,shortcutX=0,shortcutY=0;
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
        draggable={!!item.action} ondragend={close} ondragstart={e=>{if(item.action)e.dataTransfer?.setData('application/x-openhau-command',item.action);}}
        oncontextmenu={e=>{if(item.action){e.preventDefault();shortcut=item;shortcutX=Math.min(e.clientX,window.innerWidth-300);shortcutY=Math.min(e.clientY,window.innerHeight-120);}}}
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

{#if shortcut}<div class="menu-shortcut-actions" style:left={shortcutX+'px'} style:top={shortcutY+'px'}><button onclick={()=>{onshortcut(shortcut!,false);shortcut=null;close();}}>{language==='ru'?'Добавить ярлык на рабочий стол OpenHaU':'Adaugă scurtătură pe desktopul OpenHaU'}</button><button onclick={()=>{onshortcut(shortcut!,true);shortcut=null;close();}}>{language==='ru'?'Добавить ярлык на рабочий стол Windows':'Adaugă scurtătură pe desktopul Windows'}</button><button onclick={()=>shortcut=null}>{language==='ru'?'Отмена':'Anulează'}</button></div>{/if}
<style>.menu-shortcut-actions{position:fixed;z-index:50000;background:var(--surface);box-shadow:0 8px 26px #0005;padding:6px;max-width:300px}.menu-shortcut-actions button{display:block;padding:12px;border:0;background:transparent;color:var(--text);width:100%;text-align:left}.menu-shortcut-actions button:hover{background:var(--hover)}</style>
