<script lang="ts">
 import {languageOverrides} from "./localization";
  import { onDestroy } from "svelte";
  import {
    Save,
    Plus,
    Trash2,
    Copy,
    ArrowUp,
    ArrowDown,
    Square,
    Circle,
    Triangle,
    Image,
  } from "./icons";
  import {
    defaultReceiptCanvas,
    canvasShape,
    receiptElementIds,
    requiredReceiptElements,
    canvasCSS,
    type ReceiptCanvas,
    type CanvasShape,
  } from "./receipt-canvas";
  import { receipt, receiptBaseCSS } from "./receipt";
  import { receiptDesignCSS } from "./receipt-designs";
  import { demoProject, type Project, uid } from "./model";
  import { translator } from "./i18n";
  import { reportEditorDirty } from "./editor-drafts";
  export let project: Project;
  export let onapply: (p: Project) => void;
  export let editorId = "receipt-designer";
  let design: ReceiptCanvas = structuredClone(
      project.settings.receipt_canvas || defaultReceiptCanvas(),
    ),
    saved = JSON.stringify(design),
    selection = "",
    section = "shapes",
    error = "",
    board: HTMLDivElement,
    drag: {
      id: string;
      mode: "move" | "resize";
      x: number;
      y: number;
      before: CanvasShape;
    } | null = null;
  $: t = translator(project.settings.language,$languageOverrides);
  $: shape = design.shapes.find((s) => s.id === selection);
  $: element =
    section === "elements"
      ? design.elements[selection as (typeof receiptElementIds)[number]]
      : null;
  $: reportEditorDirty(editorId, JSON.stringify(design) !== saved);
  $: sample = project.accounts[0] || demoProject().accounts[0];
  $: preview = {
    ...project,
    accounts: project.accounts.length ? project.accounts : [sample],
    settings: {
      ...project.settings,
      receipt_design: "custom" as const,
      receipt_canvas: design,
    },
  };
  onDestroy(() => reportEditorDirty(editorId, false));
  function add(type: CanvasShape["type"]) {
    const row = canvasShape.parse({
      id: uid(),
      type,
      x: 40,
      y: 40,
      width: 180,
      height: 180,
      color: "#dce9f3",
    });
    design = { ...design, shapes: [...design.shapes, row] };
    section = "shapes";
    selection = row.id;
  }
  function update(key: string, value: unknown) {
    if (shape && section === "shapes")
      design = {
        ...design,
        shapes: design.shapes.map((s) =>
          s.id === shape.id ? { ...s, [key]: value } : s,
        ),
      };
    else if (element)
      design = {
        ...design,
        elements: {
          ...design.elements,
          [selection]: { ...element, [key]: value },
        },
      };
  }
  function duplicate() {
    if (!shape) return;
    const next = { ...shape, id: uid(), x: shape.x + 12, y: shape.y + 12 };
    design = { ...design, shapes: [...design.shapes, next] };
    selection = next.id;
  }
  function reorder(delta: number) {
    const rows = [...design.shapes],
      index = rows.findIndex((s) => s.id === selection),
      next = index + delta;
    if (index < 0 || next < 0 || next >= rows.length) return;
    [rows[index], rows[next]] = [rows[next], rows[index]];
    design = { ...design, shapes: rows };
  }
  function start(e: PointerEvent, id: string, mode: "move" | "resize") {
    if (e.button !== 0) return;
    e.preventDefault();
    selection = id;
    section = "shapes";
    drag = {
      id,
      mode,
      x: e.clientX,
      y: e.clientY,
      before: structuredClone(design.shapes.find((s) => s.id === id)!),
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function move(e: PointerEvent) {
    if (!drag || !board) return;
    const rect = board.getBoundingClientRect(),
      dx = ((e.clientX - drag.x) * 740) / rect.width,
      dy = ((e.clientY - drag.y) * 1046) / rect.height;
    design = {
      ...design,
      shapes: design.shapes.map((s) =>
        s.id !== drag!.id
          ? s
          : drag!.mode === "move"
            ? {
                ...s,
                x: Math.round(drag!.before.x + dx),
                y: Math.round(drag!.before.y + dy),
              }
            : {
                ...s,
                width: Math.max(1, Math.round(drag!.before.width + dx)),
                height: Math.max(1, Math.round(drag!.before.height + dy)),
              },
      ),
    };
  }
  async function texture(file: File | undefined, text = false) {
    if (!file) return;
    try {
      if (
        !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
        file.size > 2 * 1024 * 1024
      )
        throw Error(
          t(
            "Выберите PNG, JPEG или WebP до 2 МБ.",
            "Selectați PNG, JPEG sau WebP de până la 2 MB.",
            "Choose a PNG, JPEG or WebP file up to 2 MB.",
          ),
        );
      const value = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      update(text ? "textTexture" : "texture", value);
    } catch (e) {
      error = String(e);
    }
  }
  function save() {
    try {
      const next = {
        ...project,
        settings: {
          ...project.settings,
          receipt_design: "custom" as const,
          receipt_canvas: structuredClone(design),
        },
      };
      onapply(next);
      saved = JSON.stringify(design);
      reportEditorDirty(editorId, false);
      error = "";
    } catch (e) {
      error = String(e);
    }
  }
  const elementLabels = [
    [
      "heading",
      "Организация и период",
      "Organizație și perioadă",
      "Organization and period",
    ],
    ["payer", "Плательщик", "Plătitor", "Payer"],
    ["services", "Таблица услуг", "Tabel servicii", "Service table"],
    ["readings", "Показания", "Indexuri", "Meter readings"],
    ["totals", "Итоги", "Totaluri", "Totals"],
    ["bank", "Банковские реквизиты", "Date bancare", "Bank details"],
    ["footer", "Подпись внизу", "Subsol", "Footer"],
  ];
</script>

<svelte:window onpointermove={move} onpointerup={() => (drag = null)} />
<div class="receipt-designer">
  <div class="designer-toolbar">
    <button onclick={() => add("rectangle")}
      ><Square size={17} />{t(
        "Прямоугольник",
        "Dreptunghi",
        "Rectangle",
      )}</button
    ><button onclick={() => add("ellipse")}
      ><Circle size={17} />{t("Эллипс", "Elipsă", "Ellipse")}</button
    ><button onclick={() => add("triangle")}
      ><Triangle size={17} />{t("Треугольник", "Triunghi", "Triangle")}</button
    ><button onclick={() => add("diamond")}
      >{t("Ромб", "Romb", "Diamond")}</button
    ><button onclick={() => add("wave")}>{t("Волна", "Undă", "Wave")}</button
    ><button onclick={duplicate} disabled={!shape}><Copy size={17} /></button
    ><button onclick={() => reorder(-1)} disabled={!shape}
      ><ArrowDown size={17} /></button
    ><button onclick={() => reorder(1)} disabled={!shape}
      ><ArrowUp size={17} /></button
    ><button
      onclick={() => {
        design = {
          ...design,
          shapes: design.shapes.filter((s) => s.id !== selection),
        };
        selection = "";
      }}
      disabled={!shape}><Trash2 size={17} /></button
    ><button class="button" onclick={save}
      ><Save size={17} />{t(
        "Сохранить оформление",
        "Salvează aspectul",
        "Save design",
      )}</button
    >
  </div>
  {#if error}<p class="alert error">{error}</p>{/if}
  <div class="designer-layout">
    <aside>
      <h3>{t("Слои", "Straturi", "Layers")}</h3>
      {#each design.shapes as row, i}<button
          class:chosen={selection === row.id && section === "shapes"}
          onclick={() => {
            selection = row.id;
            section = "shapes";
          }}>{i + 1}. {row.type}</button
        >{/each}
      <h3>{t("Элементы квитанции", "Elemente factură", "Receipt elements")}</h3>
      {#each elementLabels as row}<button
          class:chosen={selection === row[0] && section === "elements"}
          onclick={() => {
            selection = row[0];
            section = "elements";
          }}>{t(row[1], row[2], row[3])}</button
        >{/each}
    </aside>
    <main>
      <div class="designer-paper" bind:this={board}>
        <div class="designer-receipt">
          {@html `<style>${receiptBaseCSS}${receiptDesignCSS}${canvasCSS(design,'.designer-receipt .receipt.custom')}</style>`}{@html receipt(
            preview,
            sample,
            project.settings.period,
          )}
        </div>
        {#if shape && section === "shapes"}<div
            class="shape-selection"
            style:left={shape.x / 7.4 + "%"}
            style:top={shape.y / 10.46 + "%"}
            style:width={shape.width / 7.4 + "%"}
            style:height={shape.height / 10.46 + "%"}
            role="button"
            tabindex="0"
            aria-label="Move shape"
            onpointerdown={(e) => start(e, shape!.id, "move")}
            onkeydown={(e) => {
              if (e.key === "Delete") {
                design = {
                  ...design,
                  shapes: design.shapes.filter((s) => s.id !== selection),
                };
                selection = "";
              }
            }}
          >
            <button
              class="resize-handle"
              aria-label="Resize shape"
              onpointerdown={(e) => {
                e.stopPropagation();
                start(e, shape!.id, "resize");
              }}>↘</button
            >
          </div>{/if}
      </div>
    </main>
    <aside class="inspector">
      {#if shape || element}{@const value =
          section === "shapes" ? shape! : element!}
        <h3>{t("Оформление", "Aspect", "Appearance")}</h3>
        {#if element}<label class="check-row"
            ><input
              type="checkbox"
              checked={element.visible||requiredReceiptElements.includes(selection)}
              disabled={requiredReceiptElements.includes(selection)}
              onchange={(e) => update("visible", e.currentTarget.checked)}
            />{t("Показывать", "Afișează", "Visible")}</label
          >{/if}{#each section === "shapes" ? [["x", "X"], ["y", "Y"], ["width", "Width"], ["height", "Height"], ["rotation", "Rotation"], ["radius", "Radius"], ["strokeWidth", "Stroke width"], ["shadow", "Shadow"]] : [["order", "Order"], ["width", "Width, %"], ["x", "X offset"], ["y", "Y offset"], ["fontSize", "Font, pt"], ["padding", "Padding"], ["radius", "Radius"], ["borderWidth", "Border width"], ["shadow", "Shadow"]] as field}<label
            >{field[1]}<input
              type="number"
              value={(value as any)[field[0]]}
              onchange={(e) => update(field[0], Number(e.currentTarget.value))}
            /></label
          >{/each}<label
          >{t("Цвет", "Culoare", "Color")}<input
            type="color"
            value={value.color.slice(0, 7)}
            onchange={(e) => update("color", e.currentTarget.value)}
          /></label
        >{#if element}<label
            >{t("Фон", "Fundal", "Background")}<input
              type="color"
              value={element.fill.slice(0, 7)}
              onchange={(e) => update("fill", e.currentTarget.value)}
            /></label
          >{/if}<label class="check-row"
          ><input
            type="checkbox"
            checked={!!value.gradient}
            onchange={(e) =>
              update("gradient", e.currentTarget.checked ? "#ffffff" : null)}
          />{t("Градиент", "Gradient", "Gradient")}</label
        >{#if value.gradient}<label
            >{t("Второй цвет", "A doua culoare", "Second color")}<input
              type="color"
              value={value.gradient.slice(0, 7)}
              onchange={(e) => update("gradient", e.currentTarget.value)}
            /></label
          ><label
            >{t("Угол", "Unghi", "Angle")}<input
              type="range"
              min="0"
              max="360"
              value={value.angle}
              oninput={(e) => update("angle", Number(e.currentTarget.value))}
            /></label
          >{/if}{#if shape}<label
            >{t("Непрозрачность", "Opacitate", "Opacity")}<input
              type="range"
              min="0"
              max="1"
              step=".01"
              value={shape.opacity}
              oninput={(e) => update("opacity", Number(e.currentTarget.value))}
            /></label
          >{/if}<label
          >{t("Обводка", "Contur", "Border")}<input
            type="color"
            value={(shape?.stroke || element?.border || "#cccccc").slice(0, 7)}
            onchange={(e) =>
              update(
                section === "shapes" ? "stroke" : "border",
                e.currentTarget.value,
              )}
          /></label
        ><label class="file-button"
          >{t("Текстура фона", "Textură fundal", "Background texture")}<input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onchange={(e) => texture(e.currentTarget.files?.[0])}
          /></label
        >{#if element}<label class="file-button"
            >{t("Текстура текста", "Textură text", "Text texture")}<input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onchange={(e) => texture(e.currentTarget.files?.[0], true)}
            /></label
          >{/if}<button
          class="button secondary"
          onclick={() => {
            update("texture", "");
            if (element) update("textTexture", "");
          }}
          >{t(
            "Убрать текстуры",
            "Elimină texturile",
            "Remove textures",
          )}</button
        >{:else}<p>
          {t(
            "Выберите слой или элемент.",
            "Selectați un strat sau un element.",
            "Select a layer or receipt element.",
          )}
        </p>{/if}
    </aside>
  </div>
</div>

<style>
  .receipt-designer {
    height: 100%;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
  .designer-toolbar {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    padding: 12px;
    position: sticky;
    top: 0;
    background: var(--surface);
    z-index: 5;
  }
  .designer-toolbar button:not(.button) {
    display: flex;
    gap: 6px;
    align-items: center;
    background: none;
    border: 0;
    color: var(--text);
    padding: 7px;
  }
  .designer-layout {
    display: grid;
    grid-template-columns: 170px minmax(260px, 1fr) 210px;
    min-height: 0;
    flex: 1;
    overflow: hidden;
  }
  .designer-layout > aside {
    overflow: auto;
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    background: var(--surface);
  }
  .designer-layout h3 {
    font-size: 14px;
    margin: 5px 0;
  }
  .designer-layout > aside > button {
    background: none;
    border: 0;
    color: var(--text);
    text-align: left;
    padding: 7px;
  }
  .designer-layout > aside > button.chosen {
    background: var(--hover);
    box-shadow: inset 3px 0 var(--accent);
  }
  .designer-layout > main {
    overflow: auto;
    padding: 18px;
    background: var(--bg);
  }
  .designer-paper {
    position: relative;
    aspect-ratio: 740/1046;
    background: white;
    width: 100%;
    box-shadow: 0 3px 16px #0003;
  }
  .designer-receipt {
    position: absolute;
    inset: 0;
    overflow: hidden;
  }
  .designer-receipt :global(.receipt) {
    width: 100%;
    height: 100%;
    margin: 0;
    font-size: 9pt;
  }
  .inspector label {
    display: grid;
    gap: 5px;
    font-size: 12px;
  }
  .inspector input {
    width: 100%;
    min-width: 0;
    box-sizing: border-box;
  }
  .shape-selection {
    position: absolute;
    outline: 1px solid #2889da;
    cursor: move;
    touch-action: none;
    background: #00000003;
  }
  .resize-handle {
    position: absolute;
    right: -5px;
    bottom: -5px;
    width: 18px;
    height: 18px;
    background: white;
    border: 1px solid #2889da;
    color: #2889da;
    cursor: nwse-resize;
    touch-action: none;
  }
</style>
