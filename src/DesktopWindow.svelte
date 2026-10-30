<script lang="ts">
 import {languageOverrides} from "./localization";
 import {uiText} from "./english";
  import {Minus,Square,X} from "./icons";
  import {commandIcon} from "./desktop-icons";
  import {onMount,tick} from "svelte";
  import {fitWindow} from "./window-bounds";
  export let id: string,
    title: string,
    language: "ru" | "ro"|"en",
    active = false,
    hidden = false,
    minimized = false,
    index = 0;
  export let onfocus: () => void, onclose: () => void, onminimize: () => void;
  export let position = { x: 16, y: 16, width: 1000, height: 660 };
  $: WindowIcon=commandIcon({id,ru:title,ro:title});
  let frame: HTMLElement,
    maximized = false,
    gesture: {
      kind: "move" | "resize";
      x: number;
      y: number;
      origin: typeof position;
    } | null = null;
  let renderHidden=hidden,lastHidden=hidden,lastMinimized=minimized,animation:Animation|undefined,motionSequence=0;
  const reducedMotion=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function dockFrame(){const dock=[...document.querySelectorAll<HTMLElement>('[data-window-id]')].find(element=>element.dataset.windowId===id),a=frame.getBoundingClientRect(),b=dock?.getBoundingClientRect();return b?{transform:`translate(${b.left-a.left}px,${b.top-a.top}px) scale(${Math.max(.05,b.width/a.width)},${Math.max(.05,b.height/a.height)})`,opacity:0}:{transform:'translateY(35px) scale(.9)',opacity:0};}
  async function changeVisibility(nextHidden:boolean,wasMinimized:boolean){const sequence=++motionSequence;animation?.cancel();
    if(reducedMotion()){renderHidden=nextHidden;return;}
    if(nextHidden){const end=minimized?dockFrame():{transform:'scale(.96)',opacity:0};animation=frame.animate([{transform:'none',opacity:1},end],{duration:minimized?190:130,easing:'cubic-bezier(.55,0,.85,.4)',fill:'forwards'});await animation.finished.catch(()=>{});if(sequence===motionSequence){renderHidden=true;animation.cancel();}}
    else{renderHidden=false;await tick();if(sequence!==motionSequence)return;const start=wasMinimized?dockFrame():{transform:'scale(.96)',opacity:0};animation=frame.animate([start,{transform:'none',opacity:1}],{duration:wasMinimized?210:150,easing:'cubic-bezier(.1,.9,.2,1)'});}
  }
  $: if(frame&&hidden!==lastHidden){const wasMinimized=lastMinimized;lastHidden=hidden;lastMinimized=minimized;void changeVisibility(hidden,wasMinimized);}
  async function toggleMaximize(){const before=frame.getBoundingClientRect();maximized=!maximized;await tick();const after=frame.getBoundingClientRect();if(!reducedMotion())frame.animate([{transform:`translate(${before.left-after.left}px,${before.top-after.top}px) scale(${before.width/after.width},${before.height/after.height})`},{transform:'none'}],{duration:180,easing:'cubic-bezier(.1,.9,.2,1)'});}
  function constrain(){if(frame?.parentElement&&!maximized){const parent=frame.parentElement;position=fitWindow(position,parent.clientWidth,parent.clientHeight);}}
  onMount(()=>{const observer=new ResizeObserver(constrain);observer.observe(frame.parentElement!);constrain();return()=>{observer.disconnect();animation?.cancel();};});
  function start(e: PointerEvent, kind: "move" | "resize") {
    if (
      e.button !== 0 ||
      (e.target instanceof Element && e.target.closest("button"))
    )
      return;
    onfocus();
    if (maximized) return;
    gesture = { kind, x: e.clientX, y: e.clientY, origin: { ...position } };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    e.preventDefault();
  }
  function move(e: PointerEvent) {
    if (!gesture) return;
    const parent = frame.parentElement!,
      dx = e.clientX - gesture.x,
      dy = e.clientY - gesture.y;
    position = fitWindow(
      gesture.kind === "move"
        ? {
            ...position,
            x: Math.max(
              0,
              Math.min(parent.clientWidth - 220, gesture.origin.x + dx),
            ),
            y: Math.max(
              0,
              Math.min(parent.clientHeight - 42, gesture.origin.y + dy),
            ),
          }
        : {
            ...position,
            width: Math.max(
              620,
              Math.min(
                parent.clientWidth - position.x,
                gesture.origin.width + dx,
              ),
            ),
            height: Math.max(
              280,
              Math.min(
                parent.clientHeight - position.y,
                gesture.origin.height + dy,
              ),
            ),
          },parent.clientWidth,parent.clientHeight);
  }
</script>

<svelte:window onpointermove={move} onpointerup={() => (gesture = null)} />
<div
  id={"desktop-" + id}
  bind:this={frame}
  class="desktop-window"
  class:active
  class:maximized
  class:window-hidden={renderHidden}
  style:transform-origin="top left"
  style:left={maximized ? "8px" : position.x + "px"}
  style:top={maximized ? "8px" : position.y + "px"}
  style:width={maximized ? "calc(100% - 16px)" : position.width + "px"}
  style:height={maximized ? "calc(100% - 16px)" : position.height + "px"}
  style:z-index={index + 1}
  role="dialog"
  tabindex="-1"
  aria-label={title}
  onpointerdown={onfocus}
>
  <div
    role="toolbar"
    tabindex="0"
    aria-label={title}
    class="desktop-window-title"
    onpointerdown={(e) => start(e, "move")}
  >
    <span class="desktop-window-symbol" aria-hidden="true"><WindowIcon size={18}/></span><strong
      >{title}</strong
    >
    <div class="desktop-window-actions">
      <button
        aria-label={uiText("Свернуть окно","Minimizare fereastră",language,$languageOverrides)}
        onclick={onminimize}><Minus size={15}/></button
      ><button
        aria-label={uiText("Развернуть / восстановить окно","Maximizare / restaurare fereastră",language,$languageOverrides)}
        onclick={toggleMaximize}><Square size={13}/></button
      ><button
        class="window-close"
        aria-label={uiText("Закрыть окно","Închidere fereastră",language,$languageOverrides)}
        onclick={onclose}><X size={17}/></button
      >
    </div>
  </div>
  <div class="desktop-window-content"><slot /></div>
  <button
    class="desktop-resize"
    aria-label={uiText("Изменить размер окна","Redimensionare fereastră",language,$languageOverrides)}
    onpointerdown={(e) => {
      onfocus();
      if (!maximized) {
        gesture = {
          kind: "resize",
          x: e.clientX,
          y: e.clientY,
          origin: { ...position },
        };
        e.currentTarget.setPointerCapture(e.pointerId);
        e.preventDefault();
      }
    }}
    onkeydown={(e) => {
      if (e.key.startsWith("Arrow")) {
        const delta = e.shiftKey ? 40 : 10;
        position = fitWindow({
          ...position,
          width: Math.max(
            620,
            position.width +
              (e.key === "ArrowRight"
                ? delta
                : e.key === "ArrowLeft"
                  ? -delta
                  : 0),
          ),
          height: Math.max(
            280,
            position.height +
              (e.key === "ArrowDown"
                ? delta
                : e.key === "ArrowUp"
                  ? -delta
                  : 0),
          ),
        },frame.parentElement!.clientWidth,frame.parentElement!.clientHeight);
        e.preventDefault();
      }
    }}
  ></button>
</div>

