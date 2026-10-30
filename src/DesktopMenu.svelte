<script lang="ts">
 import {onMount} from 'svelte';
 import {platform} from './platform';
 import {keyBindings,formatKeyBinding} from './keyboard-shortcuts';
 import {languageOverrides} from "./localization";
 import {uiText} from "./english";
 import {uiLabel} from "./english";
  import {placeMenu} from "./menu-placement";
  import type { DesktopCommand } from "./desktop-menu";
  import {commandIcon} from "./desktop-icons";
  export let status="";export let unsaved=false;
  export let menus: DesktopCommand[];
  export let language: "ru" | "ro"|"en";
  export let oncommand: (action: string) => void;
  export let onshortcut:(item:DesktopCommand,windows:boolean)=>void=()=>{};
  let shortcut:DesktopCommand|null=null,shortcutX=0,shortcutY=0;
  let root: HTMLElement;
  let activeMenu:string|null=null;
  let collapsed=false;
  function toggleBar(){close();collapsed=!collapsed;try{localStorage.setItem('openhau-mac-menu-collapsed',String(collapsed));}catch{}}
  onMount(()=>{try{collapsed=localStorage.getItem('openhau-mac-menu-collapsed')==='true';}catch{}const toggle=()=>toggleBar();window.addEventListener('openhau:toggle-menu',toggle);return()=>window.removeEventListener('openhau:toggle-menu',toggle);});
  function fitPopup(node:HTMLElement,submenu=false){
    const owner=node.parentElement as HTMLDetailsElement;
    let frame=0;
    const place=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{if(!owner.open||!node.getClientRects().length)return;node.style.left='';node.style.top='';node.style.right='';const anchor=(submenu?owner:owner.querySelector('summary')!).getBoundingClientRect(),box=node.getBoundingClientRect(),parent=owner.getBoundingClientRect();const position=placeMenu(anchor,{width:box.width,height:box.height},{width:window.innerWidth,height:window.innerHeight},submenu);node.style.left=(position.x-parent.left)+'px';node.style.top=(position.y-parent.top)+'px';node.style.right='auto';node.style.maxWidth=(window.innerWidth-16)+'px';node.style.maxHeight=(window.innerHeight-16)+'px';owner.classList.toggle('opens-left',position.leftward);});};
    const observer=new MutationObserver(place);observer.observe(node.closest('nav')||document.documentElement,{attributes:true,subtree:true,attributeFilter:['open']});window.addEventListener('resize',place);owner.addEventListener('toggle',place);place();
    return {destroy(){cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener('resize',place);owner.removeEventListener('toggle',place);}};
  }
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
        <summary onkeydown={key}><Icon size={16}/><span class="desktop-menu-label">{uiLabel(item,language,$languageOverrides)}</span><span class="submenu-arrow">›</span></summary>
        <div class="desktop-dropdown" use:fitPopup={true}>{@render entries(item.children)}</div>
      </details>
    {:else}<button
        draggable={!!item.action} ondragend={close} ondragstart={e=>{if(item.action)e.dataTransfer?.setData('application/x-openhau-command',item.action);}}
        oncontextmenu={e=>{if(item.action){e.preventDefault();shortcut=item;shortcutX=Math.min(e.clientX,window.innerWidth-300);shortcutY=Math.min(e.clientY,window.innerHeight-120);}}}
        onkeydown={key}
        disabled={!item.action}
        title={!item.action
          ? uiText("Недоступно в этой предварительной версии","Indisponibil în această versiune preliminară",language,$languageOverrides)
          : undefined}
        onclick={() => item.action && run(item.action)}><Icon size={16}/><span>{uiLabel(item,language,$languageOverrides)}</span>{#if $platform==='macos'&&item.action&&$keyBindings[item.action]}<kbd>{formatKeyBinding($keyBindings[item.action],true)}</kbd>{/if}</button
      >{/if}
  {/each}
{/snippet}
<div class="menu-reel-shell" class:mac={$platform==='macos'} class:collapsed={$platform==='macos'&&collapsed}>
{#if $platform==='macos'}<button class="menu-reel-toggle" aria-expanded={!collapsed} aria-label={language==='ru'?'Панель меню':language==='ro'?'Bara de meniu':'Menu toolbar'} title={language==='ru'?'Свернуть / развернуть панель меню':language==='ro'?'Restrânge / extinde bara de meniu':'Collapse / expand menu toolbar'} onclick={toggleBar}><span aria-hidden="true">{collapsed?'›':'‹'}</span></button>{/if}
<div class="menu-reel" inert={$platform==='macos'&&collapsed}>
<nav
  bind:this={root}
  class="desktop-menubar"
  aria-label={uiText("Главное меню","Meniu principal",language,$languageOverrides)}
>
  {#each menus as menu}{@const Icon=commandIcon(menu)}<details
      class="desktop-menu"
      data-menu={menu.id}
      open={activeMenu===menu.id}
    >
      <summary onclick={e=>{e.preventDefault();activeMenu=activeMenu===menu.id?null:menu.id;}} onpointerenter={e=>{if(e.pointerType!=="touch"&&activeMenu!==null)activeMenu=menu.id;}} onkeydown={e=>topKey(e,menu.id)}><Icon size={15}/><span>{uiLabel(menu,language,$languageOverrides)}</span></summary>
      <div class="desktop-dropdown" use:fitPopup={false}>{@render entries(menu.children || [])}</div>
    </details>{/each}<span class="menu-save-state" class:unsaved>{status}</span>
</nav>
</div></div>

{#if shortcut}<div class="menu-shortcut-actions" style:left={shortcutX+'px'} style:top={shortcutY+'px'}><button onclick={()=>{onshortcut(shortcut!,false);shortcut=null;close();}}>{uiText('Добавить ярлык на рабочий стол OpenHaU','Adaugă scurtătură pe desktopul OpenHaU',language,$languageOverrides)}</button><button onclick={()=>{onshortcut(shortcut!,true);shortcut=null;close();}}>{uiText('Добавить ярлык на рабочий стол Windows','Adaugă scurtătură pe desktopul Windows',language,$languageOverrides)}</button><button onclick={()=>shortcut=null}>{uiText('Отмена','Anulează',language,$languageOverrides)}</button></div>{/if}
<style>.menu-shortcut-actions{position:fixed;z-index:50000;background:var(--surface);box-shadow:0 8px 26px #0005;padding:6px;max-width:300px}.menu-shortcut-actions button{display:block;padding:12px;border:0;background:transparent;color:var(--text);width:100%;text-align:left}.menu-shortcut-actions button:hover{background:var(--hover)}.menu-save-state{margin-left:auto;padding:0 12px;font-size:11px;color:#278a51}.menu-save-state.unsaved{color:#d74747}
.menu-reel-shell:not(.mac),.menu-reel-shell:not(.mac)>.menu-reel{display:contents}
.menu-reel-shell.mac{display:grid;grid-template-columns:28px minmax(0,1fr);gap:6px;align-items:start;transition:grid-template-columns .28s ease}
.menu-reel-shell.mac.collapsed{grid-template-columns:28px minmax(0,0fr)}
.mac .menu-reel{min-width:0;transform-origin:left center;transition:transform .28s ease,opacity .2s ease,visibility 0s}
.mac.collapsed .menu-reel{height:30px;overflow:hidden;transform:scaleX(0);opacity:0;visibility:hidden;pointer-events:none;transition:transform .28s ease,opacity .2s ease,visibility 0s .28s}
.menu-reel-toggle{width:28px;height:30px;border-radius:7px;background:var(--surface);border:1px solid var(--border);color:var(--text);font-size:25px;line-height:1}
kbd{margin-left:auto;padding-left:22px;font:13px -apple-system,BlinkMacSystemFont,sans-serif;color:inherit;opacity:.7;white-space:nowrap}
@media(prefers-reduced-motion:reduce){.menu-reel-shell.mac,.mac .menu-reel,.mac.collapsed .menu-reel{transition:none}}
</style>
