import type { Project, Account } from "./model";
import { unitLabel, defaultCustomReceipt } from "./model";
import { receiptEnglish, englishReceiptName } from "./receipt-language";
import { receiptDesignCSS } from "./receipt-designs";
import {paymentDeadline} from "./payment-deadlines";
import { statement, add, money } from "./engine";
import { receiptReadings } from "./meters";
export const esc = (s: unknown) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const sectionIcon = (kind: "notice" | "bank") =>
  `<svg class="r-section-icon" viewBox="0 0 20 20" aria-hidden="true">${kind === "notice" ? '<path d="M5 2h7l4 4v12H5zM12 2v5h4M7 10h6M7 13h6"/>' : '<path d="M2 7l8-5 8 5H2zM4 9v7M8 9v7M12 9v7M16 9v7M2 18h16"/>'}</svg>`;
export const receiptBaseCSS = `
.receipt{font-family:Arial,sans-serif;color:#17191d;background:white;box-sizing:border-box;margin:0 auto 20px;padding:28px 32px;width:740px;border:1px solid #d7dbe0;font-size:var(--receipt-size,11pt);line-height:1.4;break-inside:avoid}
.receipt *{box-sizing:border-box}.receipt h1{font-size:20px;line-height:1.2;margin:0 0 8px;font-weight:700}.receipt h2{font-size:15px;margin:0}.receipt p{margin:3px 0}.receipt .r-top{display:flex;justify-content:space-between;gap:18px;border-top:5px solid var(--receipt-color);padding-top:16px}.receipt .r-logo{max-width:100px;max-height:60px;object-fit:contain}.receipt .r-caption{text-transform:uppercase;font-size:9px;letter-spacing:1.4px;color:#515760}.receipt .r-meta{display:flex;justify-content:space-between;gap:18px;margin:20px 0;padding:12px 0;border-top:1px solid #afb4ba;border-bottom:1px solid #afb4ba}.receipt .r-number{font-size:17px;font-weight:700}.receipt table{width:100%;border-collapse:collapse;margin:16px 0}.receipt th{text-align:left;font-size:10px;border-bottom:2px solid #555;padding:8px 5px}.receipt td{padding:7px 5px;border-bottom:1px solid #c6c9ce;font-size:11px}.receipt td.num,.receipt th.num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}.receipt .r-summary{margin-left:auto;width:310px}.receipt .r-summary p{display:flex;justify-content:space-between;gap:10px;font-size:11px;padding:3px 0}.receipt .r-total{border-top:2px solid #333;margin-top:8px!important;padding-top:10px!important;font-size:16px!important;font-weight:700}.receipt .r-bank{margin-top:20px;padding-top:12px;border-top:1px solid #afb4ba;font-size:10px;overflow-wrap:anywhere}.receipt .r-footer{font-size:10px;margin-top:12px;color:#42464d}.receipt .r-stub{margin-top:18px;border-top:1px dashed #555;padding-top:12px;display:flex;justify-content:space-between;gap:12px;font-size:11px}.receipt.compact{padding:18px 24px}.receipt.compact .r-meta{margin:10px 0;padding:8px 0}.receipt.compact td{padding:4px}.receipt.compact h1{font-size:16px}.receipt.classic{border:2px solid #333}.receipt.classic th,.receipt.classic td{border:1px solid #666}.receipt.classic .r-top{border-top-width:2px}.receipt .r-warning{border:2px solid #333;padding:7px;font-weight:bold;font-size:11px}.receipt .r-demo{font-size:10px;font-weight:bold;margin-bottom:6px}
.receipt thead{background:white;color:#17191d}.receipt th{font-size:.76em}.receipt td{font-size:.84em}.receipt .r-summary p{font-size:.84em}.receipt .r-bank,.receipt .r-footer,.receipt .r-stub{font-size:.76em}.receipt .r-top>div:first-child{flex:1}.receipt h1,.receipt strong{overflow-wrap:anywhere}.receipt .r-meta>div{min-width:0}.receipt .r-meta p{overflow-wrap:anywhere}.receipt tbody tr:hover{background:white}
@media print{@page{size:A4;margin:12mm}.receipt{width:100%;margin:0 0 10mm;border-color:#777;padding:6mm;box-shadow:none;}.receipt.studio{break-after:page}.receipt:last-child{break-after:auto}.receipt .r-top{color:#17191d}}
`;
export function receipt(p: Project, a: Account, period: string) {
  const s = statement(p, a, period),
    o = p.organization,
    settings = p.settings,
    lang = settings.receipt_language;
  const tr = (ru: string, ro: string) =>
    lang === "both"
      ? `${ru} / ${ro}`
      : lang === "ru"
        ? ru
        : lang === "en"
          ? receiptEnglish[ro] || ro
          : ro;
  const text = (x: { ru: string; ro: string; en?: string }) =>
    lang === "en" ? englishReceiptName(x) : tr(x.ru, x.ro);
  const n = (v: string) => {
    const [whole, cents] = money(v, p).split(".");
    return (
      whole.replace(
        /\B(?=(\d{3})+(?!\d))/g,
        lang === "ru" ? "\u00a0" : lang === "en" ? "," : ".",
      ) +
      (lang === "en" ? "." : ",") +
      cents
    );
  };
  const due = paymentDeadline(p,period);
  const incomplete = s.warnings.length || s.gaps.length;
  const meters = receiptReadings(p, a.id, period);
  const meterTable = meters.length
    ? `<section class="r-meter-readings"><h2>${esc(tr("Показания счётчиков", "Indexurile contoarelor"))}</h2><table><thead><tr><th>${esc(tr("Прибор / услуга", "Contor / serviciu"))}</th><th class="num">${esc(tr("Предыдущие", "Precedent"))}</th><th>${esc(tr("Дата", "Data"))}</th><th class="num">${esc(tr("Последние", "Ultimul"))}</th><th>${esc(tr("Дата", "Data"))}</th><th class="num">${esc(tr("Расход", "Consum"))}</th></tr></thead><tbody>${meters
        .map((m) => {
          const service = p.services.find((x) => x.id === m.service_id);
          const label = m.aggregate && service ? text(service.name) : m.label;
          return `<tr><td>${esc(label)}${m.serial_number ? `<br><small>${esc(m.serial_number)}</small>` : ""}${m.aggregate ? `<br><small>${esc(tr("По услуге", "Pe serviciu"))}</small>` : ""}</td><td class="num">${esc(m.previous ?? "—")}</td><td>${esc(m.previous_date ?? "—")}</td><td class="num">${esc(m.current ?? "—")}</td><td>${esc(m.reading_date ?? "—")}</td><td class="num">${esc(m.consumption ?? "—")} ${esc(unitLabel(m.unit, lang))}</td></tr>`;
        })
        .join(
          "",
        )}</tbody></table><p class="r-footer">${esc(tr("Показания показаны отдельно от расчётного объёма. Дата отсутствует, если она не была записана.", "Indexurile sunt afișate separat de volumul facturat. Data lipsește dacă nu a fost înregistrată."))}</p></section>`
    : "";
  const custom = settings.custom_receipt || defaultCustomReceipt;
  const customClasses =
    settings.receipt_design === "custom"
      ? ` font-${custom.font} border-${custom.border} heading-${custom.heading} decor-${custom.decoration}${custom.economy ? " economy" : ""}`
      : "";
  const legacyNotice =
    settings.receipt_design === "heritage"
      ? `<div class="r-legacy-notice"><aside><strong>${sectionIcon("notice")}${esc(tr("Извещение", "Aviz de plată"))}</strong><p>${esc(o.name)}</p><p>${esc(tr("Оплатить до", "Achitați până la"))} ${esc(due)}</p></aside><section><p><strong>${esc(a.payer_name)}</strong> · ${esc(a.number)}</p><p>${esc(a.address)}</p><p>${esc(period)} · <strong>${esc(n(s.balance))} MDL</strong></p><p class="r-paid-box">${esc(tr("Оплачено", "Achitat"))}: __________________</p><p>${esc(tr("Дата / Подпись", "Data / Semnătura"))}: __________________</p></section></div>`
      : "";
  return `<article class="receipt ${settings.receipt_design}${customClasses}" style="--receipt-color:${esc(settings.receipt_color)};--receipt-size:${settings.font_size}pt">
  ${p.demo ? `<p class="r-demo">DEMO · ${esc(tr("Вымышленные данные", "Date fictive"))}</p>` : ""}
  ${incomplete ? `<p class="r-warning">${esc(tr("ЧЕРНОВИК: неполные показания, тарифы или история. Итог не окончательный.", "CIORNĂ: date incomplete. Totalul nu este final."))}</p>` : ""}
  ${legacyNotice}
  <div class="r-top"><div><p class="r-caption">${esc(o.association_code)}</p><h1>${esc(o.name)}</h1><p>${esc(text(settings.receipt_title))}</p></div>${settings.organization_logo ? `<img class="r-logo" alt="Logo" src="${esc(settings.organization_logo)}"/>` : ""}<div><p class="r-caption">${esc(tr("Расчётный период", "Perioada de calcul"))}</p><h2>${esc(period)}</h2><p>${esc(tr("Оплатить до", "Achitați până la"))} ${esc(due)}</p></div></div>
  <div class="r-meta"><div><p class="r-caption">${esc(tr("Плательщик", "Plătitor"))}</p><strong>${esc(a.payer_name)}</strong><p>${esc(a.address)}${a.apartments.length ? ", " + esc(tr("кв.", "ap.")) + " " + esc(a.apartments.join(", ")) : ""}</p></div><div><p class="r-caption">${esc(tr("Лицевой счёт", "Cont personal"))}</p><p class="r-number">${esc(a.number)}</p></div></div>
  <table><thead><tr><th>${esc(tr("Услуга", "Serviciu"))}</th><th class="num">${esc(tr("Объём", "Volum"))}</th><th>${esc(tr("Ед.", "Unit."))}</th><th class="num">${esc(tr("Тариф", "Tarif"))}</th><th class="num">${esc(tr("Сумма", "Sumă"))}, MDL</th></tr></thead><tbody>${s.lines.map((l) => `<tr><td>${esc(text(l.name))}</td><td class="num">${esc(l.quantity)}</td><td>${esc(unitLabel(l.unit, lang))}</td><td class="num">${esc(l.rate.replace(".", lang === "en" ? "." : ","))}</td><td class="num">${esc(n(l.amount))}</td></tr>`).join("")}</tbody></table>
  ${meterTable}
  <div class="r-summary"><p><span>${esc(tr("Остаток на начало", "Sold inițial"))}</span><span>${esc(n(s.opening))}</span></p><p><span>${esc(tr("Начислено за услуги", "Calculat pentru servicii"))}</span><span>${esc(n(add(s.lines.map((l) => l.amount)).toFixed(2)))}</span></p><p><span>${esc(tr("Корректировка", "Ajustare"))}</span><span>${esc(n(s.adjustment))}</span></p><p><span>${esc(tr("Оплачено за месяц", "Achitat în luna curentă"))}</span><span>−${esc(n(s.paid))}</span></p><p class="r-total"><span>${esc(tr("Итого к оплате", "Total spre plată"))}</span><span>${esc(n(s.balance))} MDL</span></p></div>
  <div class="r-bank">${settings.receipt_design === "heritage" ? `<h2>${sectionIcon("bank")}${esc(tr("Банковские реквизиты", "Date bancare"))}</h2>` : ""}<strong>${esc(o.name)}</strong><p>${esc(o.address)}</p><p>CF/IDNO: ${esc(o.fiscal_code || "—")} · ${esc(o.bank)}</p><p>IBAN: ${esc(o.iban || "—")}</p></div><p class="r-footer">${esc(text(settings.receipt_footer))}</p>
  ${settings.receipt_design === "classic" ? `<div class="r-stub"><div><strong>${esc(tr("Извещение", "Aviz de plată"))}</strong><p>${esc(a.payer_name)}</p><p>${esc(a.number)} · ${esc(period)}</p></div><div><strong>${esc(n(s.balance))} MDL</strong><p>${esc(tr("Дата / Подпись", "Data / Semnătura"))} __________________</p></div></div>` : ""}</article>`;
}
export function receiptDocument(
  p: Project,
  accounts: Account[],
  period: string,
) {
  return `<!doctype html><html lang="${p.settings.receipt_language === "ru" ? "ru" : p.settings.receipt_language === "en" ? "en" : "ro"}"><head><meta charset="utf-8"><title>OpenHaU ${esc(period)}</title><style>${receiptBaseCSS}\n${receiptDesignCSS}\n${p.settings.receipt_css.replace(/<\/style/gi, "")}</style></head><body>${accounts.map((a) => receipt(p, a, period)).join("")}</body></html>`;
}
