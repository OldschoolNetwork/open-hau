import { writable } from "svelte/store";
export const defaultKeyBindings: Record<string, string> = {
  "file:save": "Mod+KeyS",
  "file:open": "Mod+KeyO",
  "window:close": "Mod+KeyW",
  "window:next": "Control+Tab",
  manual: "F1",
};
export const keyBindings = writable<Record<string, string>>({
  ...defaultKeyBindings,
});
export function formatKeyBinding(chord: string, mac = false) {
  const parts = chord.split("+").filter(Boolean),
    key = parts.at(-1) || "";
  const label = key
    .replace(/^Key|^Digit/, "")
    .replace("ArrowUp", "↑")
    .replace("ArrowDown", "↓")
    .replace("ArrowLeft", "←")
    .replace("ArrowRight", "→");
  if (mac)
    return (
      (parts.includes("Control") ? "⌃" : "") +
      (parts.includes("Alt") ? "⌥" : "") +
      (parts.includes("Shift") ? "⇧" : "") +
      (parts.includes("Mod") || parts.includes("Meta") ? "⌘" : "") +
      ({
        Backspace: "⌫",
        Delete: "⌦",
        Enter: "↩",
        Tab: "⇥",
        Escape: "⎋",
        Space: "Space",
      }[label] || label)
    );
  return parts
    .slice(0, -1)
    .map((p) => (p === "Mod" ? "Ctrl" : p === "Control" ? "Ctrl" : p))
    .concat(label)
    .join("+");
}
export function loadKeyBindings() {
  try {
    const saved = JSON.parse(
      localStorage.getItem("openhau-key-bindings") || "null",
    );
    if (saved && typeof saved === "object")
      keyBindings.set(
        Object.fromEntries(
          Object.entries(saved).filter(
            (row): row is [string, string] => typeof row[1] === "string",
          ),
        ),
      );
  } catch {}
}
export function saveKeyBindings(bindings: Record<string, string>) {
  keyBindings.set(bindings);
  localStorage.setItem("openhau-key-bindings", JSON.stringify(bindings));
}
export function keyChord(e: KeyboardEvent, mac = false) {
  if (["Control", "Shift", "Alt", "Meta"].includes(e.key)) return "";
  const modifiers: string[] = [];
  if (e.ctrlKey) modifiers.push(mac || e.code === "Tab" ? "Control" : "Mod");
  if (e.metaKey && !modifiers.includes("Mod")) modifiers.push("Mod");
  if (e.altKey) modifiers.push("Alt");
  if (e.shiftKey) modifiers.push("Shift");
  return [...modifiers, e.code].join("+");
}
