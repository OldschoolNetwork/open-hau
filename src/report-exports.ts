import type { Project } from "./model";
import {displayPeriod,displayDate} from "./date-format";
import {balanceTable,type BalanceOptions} from "./balance-view";
import {tableXLSX} from "./xlsx";


export const escapeMarkup = (value: string) =>
  value
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

const table=balanceTable;
const rangeLabel=(value:string,p:Project)=>value.length===10?displayDate(value,p):displayPeriod(value,p);

// SpreadsheetML 2003 is a text XML workbook, not a renamed XLS/XLSX file.
// Identifiers and names are explicitly strings; never emit user-supplied formulas.
export function accountReportXML(p: Project, from: string, to: string, mode:"account"|"service"="account",serviceFilter="",attentionOnly=false,options:BalanceOptions={}) {
  const t = table(p, from, to,mode,serviceFilter,attentionOnly,options);
  const textRow = (values: string[]) =>
    `<Row>${values.map((v) => `<Cell><Data ss:Type="String">${escapeMarkup(v)}</Data></Cell>`).join("")}</Row>`;
  return `<?xml version="1.0" encoding="UTF-8"?>\n<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Worksheet ss:Name="Balances"><Table>${textRow([t.title, p.organization.name, rangeLabel(from,p), rangeLabel(to,p)])}${textRow([t.status])}${textRow(t.headers)}${t.rows.map((row) => `<Row>${row.map((v, i) => `<Cell><Data ss:Type="${i >= t.numericStart && i < t.numericStart+t.numericCount ? "Number" : "String"}">${escapeMarkup(v)}</Data></Cell>`).join("")}</Row>`).join("")}</Table></Worksheet></Workbook>`;
}

export function accountReportHTML(p: Project, from: string, to: string, mode:"account"|"service"="account",serviceFilter="",attentionOnly=false,options:BalanceOptions={}) {
  const t = table(p, from, to,mode,serviceFilter,attentionOnly,options),
    e = escapeMarkup;
  return `<!doctype html><html lang="${p.settings.language}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(t.title)} ${e(rangeLabel(from,p))}–${e(rangeLabel(to,p))}</title><style>body{font:14px system-ui,sans-serif;color:#111;background:#fff;margin:24px}h1{font-size:24px}table{border-collapse:collapse;width:auto;max-width:100%}th{min-width:85px}th:first-child{min-width:240px}th,td{border:1px solid #a7afb7;padding:7px 10px;text-align:left;vertical-align:top}th{background:#e7edf3;font-weight:700}tbody tr:last-child{background:#edf1f5}tbody tr:nth-child(even):not(:last-child){background:#f8fafb}td:nth-child(n+${t.numericStart+1}):nth-child(-n+${t.numericStart+t.numericCount}){text-align:right;font-variant-numeric:tabular-nums}tbody tr:last-child{font-weight:bold}caption{text-align:left;padding:12px 0}@media print{@page{size:A4 landscape;margin:12mm}body{margin:0;font-size:10px}thead{display:table-header-group}tr{break-inside:avoid}}</style></head><body><h1>${e(t.title)}</h1><p>${e(p.organization.name)} · ${e(rangeLabel(from,p))}–${e(rangeLabel(to,p))} · MDL</p>${t.status ? `<p>${e(t.status)}</p>` : ""}<table><thead><tr>${t.headers.map((h) => `<th>${e(h)}</th>`).join("")}</tr></thead><tbody>${t.rows.map((row) => `<tr>${row.map((v) => `<td>${e(v)}</td>`).join("")}</tr>`).join("")}</tbody></table></body></html>`;
}

export function accountReportXLSX(...args:Parameters<typeof balanceTable>){const t=table(...args);const [p,from,to]=args;return tableXLSX(t.title,`${p.organization.name} · ${rangeLabel(from,p)}–${rangeLabel(to,p)} · MDL${t.status?" · "+t.status:""}`,t.headers,t.rows,t.numericStart,t.numericCount);}

