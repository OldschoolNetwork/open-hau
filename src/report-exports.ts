import type { Project } from "./model";
import { accountBalanceReport } from "./reports";

export const escapeMarkup = (value: string) =>
  value
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

function table(p: Project, from: string, to: string) {
  const r = accountBalanceReport(p, from, to);
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
    "",
    r.totals.opening,
    r.totals.charges,
    r.totals.adjustments,
    r.totals.paid,
    r.totals.closing,
    "",
  ]);
  const title = ru ? "Оборотная ведомость по счетам" : "Balanța conturilor";
  const status = r.incomplete
    ? ru
      ? "Предварительный отчёт: имеются неполные данные."
      : "Raport provizoriu: date incomplete."
    : "";
  return { headers, rows, title, status };
}

// SpreadsheetML 2003 is a text XML workbook, not a renamed XLS/XLSX file.
// Identifiers and names are explicitly strings; never emit user-supplied formulas.
export function accountReportXML(p: Project, from: string, to: string) {
  const t = table(p, from, to);
  const textRow = (values: string[]) =>
    `<Row>${values.map((v) => `<Cell><Data ss:Type="String">${escapeMarkup(v)}</Data></Cell>`).join("")}</Row>`;
  return `<?xml version="1.0" encoding="UTF-8"?>\n<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Worksheet ss:Name="Balances"><Table>${textRow([t.title, p.organization.name, from, to])}${textRow([t.status])}${textRow(t.headers)}${t.rows.map((row) => `<Row>${row.map((v, i) => `<Cell><Data ss:Type="${i >= 2 && i <= 6 ? "Number" : "String"}">${escapeMarkup(v)}</Data></Cell>`).join("")}</Row>`).join("")}</Table></Worksheet></Workbook>`;
}

export function accountReportHTML(p: Project, from: string, to: string) {
  const t = table(p, from, to),
    e = escapeMarkup;
  return `<!doctype html><html lang="${p.settings.language}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(t.title)} ${from}–${to}</title><style>body{font:14px system-ui,sans-serif;color:#111;background:#fff;margin:24px}h1{font-size:24px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #777;padding:8px;text-align:left;vertical-align:top}td:nth-child(n+3):nth-child(-n+7){text-align:right;font-variant-numeric:tabular-nums}tbody tr:last-child{font-weight:bold}caption{text-align:left;padding:12px 0}@media print{@page{size:A4 landscape;margin:12mm}body{margin:0;font-size:10px}thead{display:table-header-group}tr{break-inside:avoid}}</style></head><body><h1>${e(t.title)}</h1><p>${e(p.organization.name)} · ${from}–${to} · MDL</p>${t.status ? `<p>${e(t.status)}</p>` : ""}<table><thead><tr>${t.headers.map((h) => `<th>${e(h)}</th>`).join("")}</tr></thead><tbody>${t.rows.map((row) => `<tr>${row.map((v) => `<td>${e(v)}</td>`).join("")}</tr>`).join("")}</tbody></table></body></html>`;
}
