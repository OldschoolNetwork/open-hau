<script lang="ts">
  import {Minus,Square,X} from "@lucide/svelte";
  import {commandIcon} from "./desktop-icons";
  export let id: string,
    title: string,
    language: "ru" | "ro",
    active = false,
    hidden = false,
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
    position =
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
          };
  }
</script>

<svelte:window onpointermove={move} onpointerup={() => (gesture = null)} />
<div
  id={"desktop-" + id}
  bind:this={frame}
  class="desktop-window"
  class:active
  class:maximized
  class:window-hidden={hidden}
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
        aria-label={language === "ru"
          ? "Свернуть окно"
          : "Minimizare fereastră"}
        onclick={onminimize}><Minus size={15}/></button
      ><button
        aria-label={language === "ru"
          ? "Развернуть / восстановить окно"
          : "Maximizare / restaurare fereastră"}
        onclick={() => (maximized = !maximized)}><Square size={13}/></button
      ><button
        class="window-close"
        aria-label={language === "ru" ? "Закрыть окно" : "Închidere fereastră"}
        onclick={onclose}><X size={17}/></button
      >
    </div>
  </div>
  <div class="desktop-window-content"><slot /></div>
  <button
    class="desktop-resize"
    aria-label={language === "ru"
      ? "Изменить размер окна"
      : "Redimensionare fereastră"}
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
        position = {
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
        };
        e.preventDefault();
      }
    }}
  ></button>
</div>
