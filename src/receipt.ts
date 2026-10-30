import {receiptReadingsMarkup} from './receipt-readings';
import {distinctOrganizationCode} from './receipt-identity';
import {tintLogo} from "./logo";
import {canvasBackground,canvasCSS} from "./receipt-canvas";
import {originalReceipt,originalReceiptCSS} from "./original-receipt";
import type { Project, Account } from "./model";
import { unitLabel, defaultCustomReceipt } from "./model";
import { receiptEnglish, englishReceiptName } from "./receipt-language";
import { receiptDesignCSS } from "./receipt-designs";
import {paymentDeadline} from "./payment-deadlines";
import {displayDate,displayPeriod} from "./date-format";
import { statement, add, money } from "./engine";
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
${originalReceiptCSS}
.receipt{font-family:Arial,sans-serif;color:#17191d;background:white;box-sizing:border-box;margin:0 auto 20px;padding:28px 32px;width:740px;border:1px solid #d7dbe0;font-size:var(--receipt-size,11pt);line-height:1.4;break-inside:avoid}
.receipt *{box-sizing:border-box}.receipt h1{font-size:20px;line-height:1.2;margin:0 0 8px;font-weight:700}.receipt h2{font-size:15px;margin:0}.receipt p{margin:3px 0}.receipt .r-top{display:flex;justify-content:space-between;gap:18px;border-top:5px solid var(--receipt-color);padding-top:16px}.receipt .r-logo{max-width:100px;max-height:60px;object-fit:contain}.receipt .r-caption{text-transform:uppercase;font-size:9px;letter-spacing:1.4px;color:#515760}.receipt .r-meta{display:flex;justify-content:space-between;gap:18px;margin:20px 0;padding:12px 0;border-top:1px solid #afb4ba;border-bottom:1px solid #afb4ba}.receipt .r-number{font-size:17px;font-weight:700}.receipt table{width:100%;border-collapse:collapse;margin:16px 0}.receipt th{text-align:left;font-size:10px;border-bottom:2px solid #555;padding:8px 5px}.receipt td{padding:7px 5px;border-bottom:1px solid #c6c9ce;font-size:11px}.receipt td.num,.receipt th.num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}.receipt .r-summary{margin-left:auto;width:310px}.receipt .r-summary p{display:flex;justify-content:space-between;gap:10px;font-size:11px;padding:3px 0}.receipt .r-total{border-top:2px solid #333;margin-top:8px!important;padding-top:10px!important;font-size:16px!important;font-weight:700}.receipt .r-bank{margin-top:20px;padding-top:12px;border-top:1px solid #afb4ba;font-size:10px;overflow-wrap:anywhere}.receipt .r-footer{font-size:10px;margin-top:12px;color:#42464d}.receipt .r-stub{margin-top:18px;border-top:1px dashed #555;padding-top:12px;display:flex;justify-content:space-between;gap:12px;font-size:11px}.receipt.compact{padding:18px 24px}.receipt.compact .r-meta{margin:10px 0;padding:8px 0}.receipt.compact td{padding:4px}.receipt.compact h1{font-size:16px}.receipt.classic{border:2px solid #333}.receipt.classic th,.receipt.classic td{border:1px solid #666}.receipt.classic .r-top{border-top-width:2px}.receipt .r-warning{border:2px solid #333;padding:7px;font-weight:bold;font-size:11px}.receipt .r-demo{font-size:10px;font-weight:bold;margin-bottom:6px}
.receipt thead{background:white;color:#17191d}.receipt th{font-size:.76em}.receipt td{font-size:.84em}.receipt .r-summary p{font-size:.84em}.receipt .r-bank,.receipt .r-footer,.receipt .r-stub{font-size:.76em}.receipt .r-top>div:first-child{flex:1}.receipt h1,.receipt strong{overflow-wrap:anywhere}.receipt .r-meta>div{min-width:0}.receipt .r-meta p{overflow-wrap:anywhere}.receipt tbody tr:hover{background:white}
@media print{@page{size:A4;margin:12mm}.receipt{width:100%;margin:0 0 10mm;border-color:#777;padding:6mm;box-shadow:none;}.receipt.studio{break-after:page}.receipt:last-child{break-after:auto}.receipt .r-top{color:#17191d}}
`;
export function receipt(p: Project, a: Account, period: string) {
  if(p.settings.receipt_design==='original')return originalReceipt(p,a,period);
  const s = statement(p, a, period),
    o = p.organization,
    settings = p.settings,
    content = settings.receipt_content,
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
  const organizationCode = distinctOrganizationCode(o.name, o.association_code);
  const due = paymentDeadline(p,period);
  const incomplete = s.warnings.length || s.gaps.length;
  const meterTable=receiptReadingsMarkup(p,a.id,period);
  const custom = settings.custom_receipt || defaultCustomReceipt;
  const customClasses =
    settings.receipt_design === "custom"
      ? ` font-${custom.font} border-${custom.border} heading-${custom.heading} decor-${custom.decoration}${custom.economy ? " economy" : ""}`
      : "";
  const legacyNotice =
    settings.receipt_design === "heritage" && content.stub
      ? `<div class="r-legacy-notice"><aside><strong>${sectionIcon("notice")}${esc(tr("Извещение", "Aviz de plată"))}</strong><p>${esc(o.name)}</p>${content.deadline?`<p>${esc(tr("Оплатить до", "Achitați până la"))} ${esc(displayDate(due,p,lang))}</p>`:''}</aside><section><p><strong>${esc(a.payer_name)}</strong> · ${esc(a.number)}</p><p>${content.address?esc(a.address):''}</p><p>${esc(displayPeriod(period,p,lang))} · <strong>${esc(n(s.balance))} MDL</strong></p><p class="r-paid-box">${esc(tr("Оплачено", "Achitat"))}: __________________</p><p>${esc(tr("Дата / Подпись", "Data / Semnătura"))}: __________________</p></section></div>`
      : "";
  return `<article class="receipt ${settings.receipt_design}${customClasses}" style="--receipt-color:${esc(settings.receipt_color)};--receipt-size:${settings.font_size}pt">
  ${settings.receipt_design==='custom'?canvasBackground(settings.receipt_canvas):''}
  ${settings.receipt_design!=="heritage"?'<div class="r-art" aria-hidden="true"></div>':""}
  ${p.demo ? `<p class="r-demo">DEMO · ${esc(tr("Вымышленные данные", "Date fictive"))}</p>` : ""}
  ${incomplete ? `<p class="r-warning">${esc(tr("ЧЕРНОВИК: неполные показания, тарифы или история. Итог не окончательный.", "CIORNĂ: date incomplete. Totalul nu este final."))}</p>` : ""}
  ${legacyNotice}
  <div class="r-top"><div>${organizationCode ? `<p class="r-caption">${esc(organizationCode)}</p>` : ""}<h1>${esc(o.name)}</h1><p>${esc(text(settings.receipt_title))}</p></div>${content.logo && settings.organization_logo ? `<img class="r-logo" alt="Logo" src="${esc(tintLogo(settings.organization_logo,settings.logo_tint))}"/>` : ""}<div><p class="r-caption">${esc(tr("Расчётный период", "Perioada de calcul"))}</p><h2>${esc(displayPeriod(period,p,lang))}</h2>${content.deadline?`<p>${esc(tr("Оплатить до", "Achitați până la"))} ${esc(displayDate(due,p,lang))}</p>`:''}</div></div>
  <div class="r-meta"><div><p class="r-caption">${esc(tr("Плательщик", "Plătitor"))}</p><strong>${esc(a.payer_name)}</strong><p>${content.address?esc(a.address):''}${content.address&&a.apartments.length ? ", " + esc(tr("кв.", "ap.")) + " " + esc(a.apartments.join(", ")) : ""}</p></div><div><p class="r-caption">${esc(tr("Лицевой счёт", "Cont personal"))}</p><p class="r-number">${esc(a.number)}</p></div></div>
  <div class="r-calculations"><section class="r-charges"><table><thead><tr><th>${esc(tr("Услуга", "Serviciu"))}</th><th class="num">${esc(tr("Объём", "Volum"))}</th><th>${esc(tr("Ед.", "Unit."))}</th><th class="num">${esc(tr("Тариф", "Tarif"))}</th><th class="num">${esc(tr("Сумма", "Sumă"))}, MDL</th></tr></thead><tbody>${s.lines.map((l) => `<tr><td>${esc(text(l.name))}</td><td class="num">${esc(l.quantity)}</td><td>${esc(unitLabel(l.unit, lang))}</td><td class="num">${esc(l.rate.replace(".", lang === "en" ? "." : ","))}</td><td class="num">${esc(n(l.amount))}</td></tr>`).join("")}</tbody></table>
  </section>${meterTable}
  <div class="r-summary"><p><span>${esc(tr("Остаток на начало", "Sold inițial"))}</span><span>${esc(n(s.opening))}</span></p><p><span>${esc(tr("Начислено за услуги", "Calculat pentru servicii"))}</span><span>${esc(n(add(s.lines.map((l) => l.amount)).toFixed(2)))}</span></p><p><span>${esc(tr("Корректировка", "Ajustare"))}</span><span>${esc(n(s.adjustment))}</span></p><p><span>${esc(tr("Оплачено за месяц", "Achitat în luna curentă"))}</span><span>−${esc(n(s.paid))}</span></p><p class="r-total"><span>${esc(tr("Итого к оплате", "Total spre plată"))}</span><span>${esc(n(s.balance))} MDL</span></p></div>
  </div>${content.bank?`<div class="r-bank">${settings.receipt_design === "heritage" ? `<h2>${sectionIcon("bank")}${esc(tr("Банковские реквизиты", "Date bancare"))}</h2>` : ""}<strong>${esc(o.name)}</strong><p>${esc(o.address)}</p><p>CF/IDNO: ${esc(o.fiscal_code || "—")} · ${esc(o.bank)}</p><p>IBAN: ${esc(o.iban || "—")}</p></div>`:''}${content.footer?`<p class="r-footer">${esc(text(settings.receipt_footer))}</p>`:''}
  ${settings.receipt_design === "classic" && content.stub ? `<div class="r-stub"><div><strong>${esc(tr("Извещение", "Aviz de plată"))}</strong><p>${esc(a.payer_name)}</p><p>${esc(a.number)} · ${esc(displayPeriod(period,p,lang))}</p></div><div><strong>${esc(n(s.balance))} MDL</strong><p>${esc(tr("Дата / Подпись", "Data / Semnătura"))} __________________</p></div></div>` : ""}</article>`;
}
export function receiptLayoutCSS(p:Project){const landscape=p.settings.receipt_orientation==='landscape',width=landscape?297:210,height=landscape?210:297,half=p.settings.receipt_paper==='half';return `@page{size:A4 ${landscape?'landscape':'portrait'};margin:0}.receipt-sheet{box-sizing:border-box;width:${width}mm;min-height:${height}mm;padding:6mm;display:grid;grid-template-rows:${half&&!landscape?'repeat(2, minmax(0,1fr))':'1fr'};grid-template-columns:${half&&landscape?'repeat(2,minmax(0,1fr))':'1fr'};gap:0;background:white;color:#17191d;margin:0 auto 20px;break-after:page;isolation:isolate}.receipt-sheet:last-child{break-after:auto}.receipt-cell{box-sizing:border-box;min-width:0;min-height:${half&&!landscape?(height-12)/2:height-12}mm;padding:3mm 0;position:relative}.receipt-cell>.receipt{width:100%;margin:0;padding:3mm;box-shadow:none;break-after:auto}.receipt-cell.half>.receipt{font-size:8.5pt;line-height:1.15}.receipt-cell.half .receipt h1{font-size:15px}.receipt-cell.half .receipt h2{font-size:11px}.receipt-cell.half .receipt .r-meta{margin:6px 0;padding:5px 0}.receipt-cell.half .receipt table{margin:6px 0}.receipt-cell.half .receipt th,.receipt-cell.half .receipt td{padding:3px 4px}.receipt-cell.half .receipt .r-summary p{padding:1px 0}.receipt-cell.half .receipt .r-total{font-size:12px!important;padding-top:4px!important;margin-top:3px!important}.receipt-cell.half .receipt .r-bank{margin-top:7px;padding-top:5px}.receipt-cell.half .receipt .r-footer{margin-top:4px}.receipt-cell.half .receipt .r-stub{margin-top:6px;padding-top:5px}.receipt-cell>.receipt.original{padding:0}.receipt-cell.cut::after{content:'';position:absolute;left:0;right:0;bottom:0;${landscape&&half?'height:auto;top:0;left:auto;border-right:1px dashed #c2c2c2':'border-bottom:1px dashed #c2c2c2'}}.receipt,.receipt *{-webkit-print-color-adjust:exact;print-color-adjust:exact}.receipt .r-art,.receipt .r-art::before,.receipt .r-art::after{border:0!important;outline:none!important;box-shadow:none!important}${halfReceiptCSS}@media print{html,body{margin:0!important;padding:0!important;background:white!important}.receipt-sheet{margin:0;box-shadow:none}.receipt{break-after:auto!important}.receipt-cell{break-inside:avoid}}`;}
export const halfReceiptCSS=`
.receipt-cell.half>.receipt:not(.original){font-size:calc(var(--receipt-size,11pt)*.77);line-height:1.12}
.receipt-cell.half .receipt:not(.original) p{margin:2px 0}
.receipt-cell.half .receipt .r-top{padding:6px;gap:10px}
.receipt-cell.half .receipt.classic .r-top{display:flex;flex-direction:row;text-align:left;align-items:center}
.receipt-cell.half .receipt.botanical .r-top{flex-direction:row}
.receipt-cell.half .receipt .r-logo{max-width:65px;max-height:35px}
.receipt-cell.half .receipt .r-caption{font-size:7px;letter-spacing:.8px}
.receipt-cell.half .receipt .r-number{font-size:13px}
.receipt-cell.half .receipt .r-meta{margin:4px 0;padding:4px 6px}
.receipt-cell.half .receipt .r-calculations{display:grid;grid-template-columns:minmax(0,1fr) 190px;gap:4px 10px;align-items:start}
.receipt-cell.half .receipt .r-charges{grid-column:1;grid-row:1;margin:4px 0;border-radius:4px}
.receipt-cell.half .receipt .r-summary{grid-column:2;grid-row:1;margin:4px 0;width:100%;padding:5px;border-radius:4px}
.receipt-cell.half .receipt .r-meter-readings{grid-column:1/-1;grid-row:2;margin:2px 0;padding:4px 0 0}
.receipt-cell.half .receipt table{margin:4px 0}
.receipt-cell.half .receipt .r-charges table{margin:0}
.receipt-cell.half .receipt th,.receipt-cell.half .receipt td{padding:2px 3px;font-size:.8em}
.receipt-cell.half .receipt .r-bank{padding:5px;margin-top:4px;border-radius:4px;font-size:8px;display:grid;grid-template-columns:1fr 1fr;gap:2px 10px}
.receipt-cell.half .receipt .r-bank h2{grid-column:1/-1}
.receipt-cell.half .receipt .r-bank p{margin:0}
.receipt-cell.half .receipt .r-footer{font-size:8px}
.receipt-cell.half .receipt .r-legacy-notice{margin-bottom:4px;padding:3px 0;gap:8px;grid-template-columns:130px minmax(0,1fr)}
.receipt-cell.half .r-legacy-notice aside,.receipt-cell.half .r-legacy-notice section p{font-size:8px}
.receipt-cell.half .r-legacy-notice .r-paid-box{min-height:18px;padding:2px;margin-top:3px}
.receipt-cell.half .receipt .r-stub{padding:4px 0;margin-top:4px;font-size:8px}
.receipt-cell.half>.receipt.heritage{padding:2mm}
.receipt-cell.half .receipt.heritage h1{font-size:13px}
`;
export function receiptBody(p:Project,accounts:Account[],period:string){const count=p.settings.receipt_paper==='half'?2:1,pages:string[]=[];for(let start=0;start<accounts.length;start+=count)pages.push(`<div class="receipt-sheet">${accounts.slice(start,start+count).map(a=>`<div class="receipt-cell ${count===2?'half':''} ${p.settings.receipt_cut_lines?'cut':''}">${receipt(p,a,period)}</div>`).join('')}</div>`);return pages.join('');}
export function receiptDocument(p:Project,accounts:Account[],period:string){const lang=p.settings.receipt_language;return `<!doctype html><html lang="${lang==='ru'?'ru':lang==='en'?'en':'ro'}"><head><meta charset="utf-8"><title>OpenHaU ${esc(displayPeriod(period,p,lang))}</title><style>${receiptBaseCSS}\n${receiptDesignCSS}\n${p.settings.receipt_css.replace(/<\/style/gi,'')}\n${receiptLayoutCSS(p)}\n${p.settings.receipt_design==='custom'?canvasCSS(p.settings.receipt_canvas):''}</style></head><body style="margin:0;padding:0">${receiptBody(p,accounts,period)}</body></html>`;}
