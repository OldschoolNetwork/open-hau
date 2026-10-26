import type { Project } from "./model";
import {displayPeriod} from "./date-format";
import { accountBalanceReport } from "./reports";
import { serviceBalanceReport } from "./service-reports";

export const escapeMarkup = (value: string) =>
  value
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

function table(p: Project, from: string, to: string, mode:"account"|"service"="account", serviceFilter="") {
  const serviceMode=mode==="service";
  const r = serviceMode?serviceBalanceReport(p,from,to,serviceFilter):accountBalanceReport(p, from, to);
  const ru = p.settings.language === "ru";
  const headers = ru
    ? [
        "Счёт",
        "Плательщик",
        "Остаток на начало",
        "Начислено",
        "Корректировки",
        "Оплачено",
        "Остаток на конец",
        "Проверка",
      ]
    : [
        "Cont",
        "Plătitor",
        "Sold inițial",
        "Calculat",
        "Ajustări",
        "Achitat",
        "Sold final",
        "Verificare",
      ];
  const rows = r.rows.map((x) => [
    ...(serviceMode?[("service"in x?x.service:"") as string]:[]),
    x.number,
    x.payer,
    x.opening,
    x.charges,
    x.adjustments,
    x.paid,
    x.closing,
    x.warnings.join("; "),
  ]);
  rows.push([
    ru ? "Итого, MDL" : "Total, MDL",
    ...(serviceMode?[""]:[]),
    "",
    r.totals.opening,
    r.totals.charges,
    r.totals.adjustments,
    r.totals.paid,
    r.totals.closing,
    "",
  ]);
  const title = serviceMode?(ru?"Оборотно-сальдовая ведомость по услугам":"Balanță de verificare pe servicii"):(ru ? "Оборотно-сальдовая ведомость" : "Balanță de verificare");
  const status = r.incomplete
    ? ru
      ? "Предварительный отчёт: имеются неполные данные."
      : "Raport provizoriu: date incomplete."
    : "";
  return { headers:serviceMode?[ru?"Услуга":"Serviciu",...headers]:headers, rows, title, status,numericStart:serviceMode?3:2 };
}

// SpreadsheetML 2003 is a text XML workbook, not a renamed XLS/XLSX file.
// Identifiers and names are explicitly strings; never emit user-supplied formulas.
export function accountReportXML(p: Project, from: string, to: string, mode:"account"|"service"="account",serviceFilter="") {
  const t = table(p, from, to,mode,serviceFilter);
  const textRow = (values: string[]) =>
    `<Row>${values.map((v) => `<Cell><Data ss:Type="String">${escapeMarkup(v)}</Data></Cell>`).join("")}</Row>`;
  return `<?xml version="1.0" encoding="UTF-8"?>\n<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Worksheet ss:Name="Balances"><Table>${textRow([t.title, p.organization.name, displayPeriod(from,p), displayPeriod(to,p)])}${textRow([t.status])}${textRow(t.headers)}${t.rows.map((row) => `<Row>${row.map((v, i) => `<Cell><Data ss:Type="${i >= t.numericStart && i < t.numericStart+5 ? "Number" : "String"}">${escapeMarkup(v)}</Data></Cell>`).join("")}</Row>`).join("")}</Table></Worksheet></Workbook>`;
}

export function accountReportHTML(p: Project, from: string, to: string, mode:"account"|"service"="account",serviceFilter="") {
  const t = table(p, from, to,mode,serviceFilter),
    e = escapeMarkup;
  return `<!doctype html><html lang="${p.settings.language}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(t.title)} ${e(displayPeriod(from,p))}–${e(displayPeriod(to,p))}</title><style>body{font:14px system-ui,sans-serif;color:#111;background:#fff;margin:24px}h1{font-size:24px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #777;padding:8px;text-align:left;vertical-align:top}td:nth-child(n+${t.numericStart+1}):nth-child(-n+${t.numericStart+5}){text-align:right;font-variant-numeric:tabular-nums}tbody tr:last-child{font-weight:bold}caption{text-align:left;padding:12px 0}@media print{@page{size:A4 landscape;margin:12mm}body{margin:0;font-size:10px}thead{display:table-header-group}tr{break-inside:avoid}}</style></head><body><h1>${e(t.title)}</h1><p>${e(p.organization.name)} · ${e(displayPeriod(from,p))}–${e(displayPeriod(to,p))} · MDL</p>${t.status ? `<p>${e(t.status)}</p>` : ""}<table><thead><tr>${t.headers.map((h) => `<th>${e(h)}</th>`).join("")}</tr></thead><tbody>${t.rows.map((row) => `<tr>${row.map((v) => `<td>${e(v)}</td>`).join("")}</tr>`).join("")}</tbody></table></body></html>`;
}
