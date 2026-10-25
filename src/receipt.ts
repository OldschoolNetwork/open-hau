import type { Project, Account } from "./model";
import { statement, monthNext, add, money } from "./engine";
export const esc = (s: unknown) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
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
    lang === "both" ? `${ru} / ${ro}` : lang === "ru" ? ru : ro;
  const text = (x: { ru: string; ro: string }) => tr(x.ru, x.ro);
  const n = (v: string) => {
    const [whole, cents] = money(v, p).split(".");
    return (
      whole.replace(/\B(?=(\d{3})+(?!\d))/g, lang === "ru" ? "\u00a0" : ".") +
      "," +
      cents
    );
  };
  const due =
    monthNext(period) + "-" + String(settings.due_day).padStart(2, "0");
  const incomplete = s.warnings.length || s.gaps.length;
  return `<article class="receipt ${settings.receipt_design}" style="--receipt-color:${esc(settings.receipt_color)};--receipt-size:${settings.font_size}pt">
  ${p.demo ? `<p class="r-demo">DEMO · ${esc(tr("Вымышленные данные", "Date fictive"))}</p>` : ""}
  ${incomplete ? `<p class="r-warning">${esc(tr("ЧЕРНОВИК: неполные показания, тарифы или история. Итог не окончательный.", "CIORNĂ: date incomplete. Totalul nu este final."))}</p>` : ""}
  <div class="r-top"><div><p class="r-caption">${esc(o.association_code)}</p><h1>${esc(o.name)}</h1><p>${esc(text(settings.receipt_title))}</p></div>${settings.organization_logo ? `<img class="r-logo" alt="Logo" src="${esc(settings.organization_logo)}"/>` : ""}<div><p class="r-caption">${esc(tr("Расчётный период", "Perioada de calcul"))}</p><h2>${esc(period)}</h2><p>${esc(tr("Оплатить до", "Achitați până la"))} ${esc(due)}</p></div></div>
  <div class="r-meta"><div><p class="r-caption">${esc(tr("Плательщик", "Plătitor"))}</p><strong>${esc(a.payer_name)}</strong><p>${esc(a.address)}${a.apartments.length ? ", " + esc(tr("кв.", "ap.")) + " " + esc(a.apartments.join(", ")) : ""}</p></div><div><p class="r-caption">${esc(tr("Лицевой счёт", "Cont personal"))}</p><p class="r-number">${esc(a.number)}</p></div></div>
  <table><thead><tr><th>${esc(tr("Услуга", "Serviciu"))}</th><th class="num">${esc(tr("Объём", "Volum"))}</th><th>${esc(tr("Ед.", "Unit."))}</th><th class="num">${esc(tr("Тариф", "Tarif"))}</th><th class="num">${esc(tr("Сумма", "Sumă"))}, MDL</th></tr></thead><tbody>${s.lines.map((l) => `<tr><td>${esc(text(l.name))}</td><td class="num">${esc(l.quantity)}</td><td>${esc(l.unit)}</td><td class="num">${esc(l.rate.replace(".", ","))}</td><td class="num">${esc(n(l.amount))}</td></tr>`).join("")}</tbody></table>
  <div class="r-summary"><p><span>${esc(tr("Остаток на начало", "Sold inițial"))}</span><span>${esc(n(s.opening))}</span></p><p><span>${esc(tr("Начислено за услуги", "Calculat pentru servicii"))}</span><span>${esc(n(add(s.lines.map((l) => l.amount)).toFixed(2)))}</span></p><p><span>${esc(tr("Корректировка", "Ajustare"))}</span><span>${esc(n(s.adjustment))}</span></p><p><span>${esc(tr("Оплачено за месяц", "Achitat în luna curentă"))}</span><span>−${esc(n(s.paid))}</span></p><p class="r-total"><span>${esc(tr("Итого к оплате", "Total spre plată"))}</span><span>${esc(n(s.balance))} MDL</span></p></div>
  <div class="r-bank"><strong>${esc(o.name)}</strong><p>${esc(o.address)}</p><p>CF/IDNO: ${esc(o.fiscal_code || "—")} · ${esc(o.bank)}</p><p>IBAN: ${esc(o.iban || "—")}</p></div><p class="r-footer">${esc(text(settings.receipt_footer))}</p>
  ${settings.receipt_design === "classic" ? `<div class="r-stub"><div><strong>${esc(tr("Извещение", "Aviz de plată"))}</strong><p>${esc(a.payer_name)}</p><p>${esc(a.number)} · ${esc(period)}</p></div><div><strong>${esc(n(s.balance))} MDL</strong><p>${esc(tr("Дата / Подпись", "Data / Semnătura"))} __________________</p></div></div>` : ""}</article>`;
}
export function receiptDocument(
  p: Project,
  accounts: Account[],
  period: string,
) {
  return `<!doctype html><html lang="${p.settings.receipt_language === "ru" ? "ru" : "ro"}"><head><meta charset="utf-8"><title>OpenHaU ${esc(period)}</title><style>${receiptBaseCSS}\n${p.settings.receipt_css.replace(/<\/style/gi, "")}</style></head><body>${accounts.map((a) => receipt(p, a, period)).join("")}</body></html>`;
}
