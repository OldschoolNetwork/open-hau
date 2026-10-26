import { invoke, isTauri } from "@tauri-apps/api/core";
import { open, save, confirm } from "@tauri-apps/plugin-dialog";
import { projectSchema, type Project } from "./model";
import { accountReportCSV } from "./reports";
import { accountReportHTML, accountReportXML } from "./report-exports";
export const native = isTauri();
export async function runtimePlatform(){
  if(native)return await invoke<string>("runtime_platform");
  const preview=new URL(window.location.href).searchParams.get("platform");
  if(preview==="windows"||preview==="macos")return preview;
  return /Mac/.test(navigator.platform)?"macos":"windows";
}
export function displayPath(path: string | null) {
  if (!path) return "";
  const prefix = "\\\\?\\";
  if (path.startsWith(prefix + "UNC\\"))
    return "\\\\" + path.slice(prefix.length + 4);
  return path.startsWith(prefix) ? path.slice(prefix.length) : path;
}
const key = "openhau-preview-v1";
export async function load() {
  const value = native
    ? await invoke("load_project")
    : JSON.parse(localStorage.getItem(key) || "null");
  return value ? projectSchema.parse(value) : null;
}
export async function persist(p: Project, reason: "save" | "close" = "save") {
  const data = projectSchema.parse(p);
  if (native) {
    const result = await invoke<{
      path: string;
      backup_path: string | null;
      backup_warning: string | null;
    }>("save_project", { value: data });
    let export_warning: string | null = null;
    try {
      await autoExportReports(data, reason);
    } catch (e) {
      export_warning = String(e);
    }
    return { ...result, export_warning };
  }
  localStorage.setItem(key, JSON.stringify(data));
  return {
    path: "Browser preview · localStorage",
    backup_path: null,
    backup_warning: null,
    export_warning: null,
  };
}
export type ReportExportSettings = {
  directory: string | null;
  trigger: "save" | "close";
  formats: ("csv" | "xml" | "html")[];
};
export const reportExportSettings = () =>
  invoke<ReportExportSettings>("report_export_settings");
export const configureReportExports = (value: ReportExportSettings) =>
  invoke<ReportExportSettings>("configure_report_exports", { value });
export async function autoExportReports(
  p: Project,
  reason: "save" | "close" | "manual",
) {
  const config = await reportExportSettings();
  if (
    !config.directory ||
    (reason !== "manual" && config.trigger === "close" && reason !== "close")
  )
    return null;
  const period = p.settings.period;
  const files = Object.fromEntries(
    config.formats.map((format) => [
      format,
      format === "csv"
        ? accountReportCSV(p, period, period)
        : format === "xml"
          ? accountReportXML(p, period, period)
          : accountReportHTML(p, period, period),
    ]),
  );
  return await invoke<string | null>("write_report_exports", {
    reason,
    period,
    files,
  });
}
export const backupSettings = () =>
  invoke<{ directory: string | null }>("backup_settings");
export const configureBackups = (directory: string | null) =>
  invoke<{ directory: string | null }>("configure_backups", { directory });
export const backupNow = () => invoke<string | null>("backup_now");
export async function chooseBackupDirectory() {
  return await open({ directory: true, multiple: false, title: "OpenHaU" });
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
          ({
            csv: "text/csv",
            html: "text/html",
            xml: "application/xml",
            json: "application/json",
          }[extension] || "text/plain") + ";charset=utf-8",
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
