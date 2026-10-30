<script lang="ts">
  import { onMount } from "svelte";
  import { invoke, isTauri } from "@tauri-apps/api/core";
  import { listen } from "@tauri-apps/api/event";
  import { platform } from "./platform";
  import { keyBindings } from "./keyboard-shortcuts";
  import { languageOverrides } from "./localization";
  import { uiLabel } from "./english";
  import type { DesktopCommand } from "./desktop-menu";
  export let menus: DesktopCommand[];
  export let language: "ru" | "ro" | "en";
  export let workspace = false;
  export let oncommand: (action: string) => void;
  export let onshortcut: (item: DesktopCommand, windows: boolean) => void;
  let mounted = false,
    destroyed = false,
    timer: ReturnType<typeof setTimeout>;
  const label = (ru: string, ro: string, en: string) =>
    language === "ru" ? ru : language === "ro" ? ro : en;
  function find(
    items: DesktopCommand[],
    action: string,
  ): DesktopCommand | undefined {
    for (const item of items) {
      if (item.action === action) return item;
      const child = item.children && find(item.children, action);
      if (child) return child;
    }
  }
  function entries(items: DesktopCommand[], shortcuts = false): any[] {
    return items.map((item) => ({
      label: uiLabel(item, language, $languageOverrides),
      action:
        item.id === "edit" && !shortcuts
          ? "native-edit"
          : item.action
            ? (shortcuts ? "@shortcut:" : "") + item.action
            : null,
      accelerator:
        !shortcuts && item.action
          ? ($keyBindings[item.action] || "")
              .replace("Mod", "Cmd")
              .replace(/Key|Digit/g, "")
              .replace("Control", "Ctrl") || null
          : null,
      children: item.children ? entries(item.children, shortcuts) : [],
    }));
  }
  function schedule(
    _menus: DesktopCommand[],
    _language: string,
    _workspace: boolean,
    _keys: unknown,
    _pack: unknown,
  ) {
    clearTimeout(timer);
    if (!mounted || !isTauri() || $platform !== "macos") return;
    timer = setTimeout(() => {
      if (destroyed) return;
      let nativeMenus = entries(
        workspace
          ? menus
          : menus.filter((m) => ["file", "help"].includes(m.id)),
      );
      if (!workspace) {
        nativeMenus = nativeMenus.map((root) => ({
          ...root,
          children: root.children.filter((entry: any) =>
            [
              "file:new",
              "file:open",
              "file:catalog",
              "manual",
              "updates",
              "about",
              "file:exit",
            ].includes(entry.action),
          ),
        }));
      } else
        nativeMenus.push({
          label: label("Рабочий стол", "Spațiu de lucru", "Workspace"),
          children: [
            {
              label: label(
                "Свернуть / развернуть панель меню",
                "Restrânge / extinde bara de meniu",
                "Collapse / Expand Menu Toolbar",
              ),
              action: "@toggle-menu",
            },
            {
              label: label(
                "Добавить ярлык",
                "Adaugă scurtătură",
                "Add Workspace Shortcut",
              ),
              children: entries(
                menus.filter((m) => !["edit", "window"].includes(m.id)),
                true,
              ),
            },
          ],
        });
      void invoke("configure_native_menu", {
        menus: nativeMenus,
        language,
        workspace,
      }).catch((error) => console.error("Native menu:", error));
    }, 60);
  }
  $: if (mounted && $platform === "macos")
    schedule(menus, language, workspace, $keyBindings, $languageOverrides);
  onMount(() => {
    if (!isTauri()) return;
    let unlisten: (() => void) | undefined;
    void listen<string>("openhau:native-command", (event) => {
      if (event.payload === "@toggle-menu") {
        window.dispatchEvent(new Event("openhau:toggle-menu"));
        return;
      }
      if (event.payload.startsWith("@shortcut:")) {
        const item = find(menus, event.payload.slice(10));
        if (item && workspace) onshortcut(item, false);
        return;
      }
      if (
        find(menus, event.payload) ||
        ["about", "settings", "file:exit"].includes(event.payload)
      )
        oncommand(event.payload);
    })
      .then((stop) => {
        if (destroyed) stop();
        else {
          unlisten = stop;
          mounted = true;
        }
      })
      .catch((error) => console.error("Native menu listener:", error));
    return () => {
      destroyed = true;
      clearTimeout(timer);
      unlisten?.();
    };
  });
</script>
