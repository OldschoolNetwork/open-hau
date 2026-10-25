import { invoke, isTauri } from "@tauri-apps/api/core";
import { open, save, confirm } from "@tauri-apps/plugin-dialog";
import { projectSchema, type Project } from "./model";
export const native = isTauri();
const key = "openhau-preview-v1";
export async function load() {
  const value = native
    ? await invoke("load_project")
    : JSON.parse(localStorage.getItem(key) || "null");
  return value ? projectSchema.parse(value) : null;
}
export async function persist(p: Project) {
  const data = projectSchema.parse(p);
  if (native) return await invoke<string>("save_project", { value: data });
  localStorage.setItem(key, JSON.stringify(data));
  return "Browser preview · localStorage";
}
export async function ask(message: string) {
  return native
    ? await confirm(message, { title: "OpenHaU", kind: "warning" })
    : window.confirm(message);
}
export async function exportText(
  name: string,
  content: string,
  extension: string,
) {
  if (native) {
    const path = await save({
      defaultPath: name,
      filters: [{ name: extension.toUpperCase(), extensions: [extension] }],
    });
    if (path) await invoke("write_text_file", { path, content });
    return !!path;
  }
  const a = document.createElement("a"),
    url = URL.createObjectURL(
      new Blob([content], {
        type:
          extension === "csv"
            ? "text/csv;charset=utf-8"
            : "application/json;charset=utf-8",
      }),
    );
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}
export async function importJson() {
  if (native) {
    const path = await open({
      multiple: false,
      filters: [{ name: "OpenHaU JSON", extensions: ["json"] }],
    });
    return path ? await invoke("read_json_file", { path }) : null;
  }
  return await new Promise<unknown>((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async () => {
      try {
        const f = input.files?.[0];
        if (f && f.size > 20 * 1024 * 1024) throw Error("Файл больше 20 МБ");
        resolve(f ? JSON.parse((await f.text()).replace(/^\uFEFF/, "")) : null);
      } catch (e) {
        reject(e);
      }
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}
export async function storagePath() {
  return native
    ? await invoke<string>("storage_path")
    : "Browser preview · localStorage";
}
