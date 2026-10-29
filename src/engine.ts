import {translatedName} from './localization';
import {uiText} from "./english";
import {billingServices,benefitAmounts} from './administration-data';
import {accountOpenInMonth,accountServicesInMonth} from './account-lifecycle';
import Decimal from "decimal.js";
import type { Project, Account } from "./model";
import { physicalReadings } from "./meters";
import { monthlyPersons } from "./occupancy";
import { applicableGroups, sharedDistribution } from "./shared-consumption";
Decimal.set({ precision: 40 });
export const D = (v: string | number) => new Decimal(v);
export const add = (xs: string[]) => xs.reduce((a, b) => a.plus(b), D(0));
export function money(value: Decimal.Value, p: Project) {
  return D(String(value))
    .toDecimalPlaces(
      2,
      p.settings.rounding === "half_even"
        ? Decimal.ROUND_HALF_EVEN
        : Decimal.ROUND_HALF_UP,
    )
    .toFixed(2);
}
export function monthNext(period: string) {
  const [y, m] = period.split("-").map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
}
export type Line = {
  service_id: string;
  name: { ru: string; ro: string; en?:string };
  unit: string;
  quantity: string;
  rate: string;
  amount: string;
};
export function charges(
  p: Project,
  a: Account,
  period: string,
): { lines: Line[]; adjustment: string; total: string; warnings: string[] } {
  const saved = p.snapshots.find(
    (x) => x.account_id === a.id && x.period === period,
  );
  if (saved) return { ...saved, warnings: [] };
  if (!accountOpenInMonth(a,period)){
    const adjustment=period<a.opening_period?'0.00':money(add(p.adjustments.filter(r=>r.account_id===a.id&&r.period===period).map(r=>r.amount)),p);
    return {lines:[],adjustment,total:adjustment,warnings:period<a.opening_period?[uiText('Счёт ещё не открыт в выбранном периоде','Contul nu era încă deschis în perioada selectată',p.settings.language)]:[]};
  }
  const lines: Line[] = [],
    warnings: string[] = [];
  const groups = applicableGroups(p, period).filter(g => g.individual_meter_ids.some(mid => p.meters.find(m => m.id === mid)?.account_id === a.id));
  for (const sid of billingServices(p,a,period,accountServicesInMonth(a,period))) {
    const s = p.services.find((x) => x.id === sid);
    if (!s || !s.active) continue;
    // The configured difference service is generated once by its source group.
    if (groups.some(g => g.difference_service_id === sid)) continue;
    const tariff = p.tariffs
      .filter((t) => t.service_id === sid && t.effective_from <= period + "-01")
      .sort((x, y) => y.effective_from.localeCompare(x.effective_from))[0];
    if (!tariff) {
      warnings.push(translatedName(s.name,p.settings.language) + (uiText(": нет тарифа",": tariful lipsește",p.settings.language)));
      continue;
    }
    const override = p.quantities.find(
      (x) =>
        x.account_id === a.id && x.service_id === sid && x.period === period,
    );
    let quantity = override?.quantity;
    if (quantity === undefined) {
      if (s.calculation_type === "metered") {
        const meters = physicalReadings(p, a.id, s.id, period);
        if (meters.length) {
          if (meters.some((m) => m.warning)) {
            warnings.push(
              translatedName(s.name,p.settings.language) +
                (uiText(": проверьте показания и единицы измерения каждого прибора",": verificați indexurile și unitățile fiecărui contor",p.settings.language)),
            );
            continue;
          }
          quantity = add(meters.map((m) => m.consumption!)).toFixed();
        } else {
          const r = p.meter_readings.find(
            (x) =>
              x.account_id === a.id &&
              x.service_id === sid &&
              x.period === period,
          );
          if (!r) {
            warnings.push(translatedName(s.name,p.settings.language) + (uiText(": нет показаний",": indexurile lipsesc",p.settings.language)));
            continue;
          }
          quantity = D(r.current).minus(r.previous).toFixed();
        }
      } else if (s.calculation_type === "person") {
        const occupancy = monthlyPersons(p, a, period);
        if (occupancy.persons === null) {
          warnings.push(
            translatedName(s.name,p.settings.language) +
              (uiText(": заполните количество проживающих во всех квартирах",": completați numărul de locatari pentru toate apartamentele",p.settings.language)),
          );
          continue;
        }
        quantity = String(occupancy.persons);
      } else if (s.calculation_type === "area") quantity = a.total_area_m2;
      else if (s.calculation_type === "manual") {
        warnings.push(translatedName(s.name,p.settings.language) + (uiText(": не введён объём",": volumul nu a fost introdus",p.settings.language)));
        continue;
      } else quantity = s.default_quantity;
    }
    lines.push({
      service_id: s.id,
      name: s.name,
      unit: s.unit,
      quantity,
      rate: tariff.rate,
      amount: money(D(quantity).times(tariff.rate), p),
    });
    for (const group of applicableGroups(p, period).filter(
      (g) =>
        p.meters.find((m) => m.id === g.shared_meter_id)?.service_id === sid,
    )) {
      if (
        !group.individual_meter_ids.some(
          (mid) => p.meters.find((m) => m.id === mid)?.account_id === a.id,
        )
      )
        continue;
      const distribution = sharedDistribution(p, group, period);
      if (!distribution.ready) {
        warnings.push(
          ...distribution.warnings.map((w) => group.name + ": " + w),
        );
        continue;
      }
      if (override) {
        warnings.push(
          group.name +
            (uiText(": удалите ручной объём или пересмотрите распределение",": eliminați volumul manual sau revizuiți repartizarea",p.settings.language)),
        );
        continue;
      }
      const share = distribution.rows.find((r) => r.account_id === a.id)?.share;
      if (share !== undefined && !D(share).isZero()) {
        const billedService = group.difference_service_id ? p.services.find(x => x.id === group.difference_service_id) : s;
        const billedTariff = group.difference_service_id ? p.tariffs.filter(t => t.service_id === group.difference_service_id && t.effective_from <= period + "-01").sort((x,y) => y.effective_from.localeCompare(x.effective_from))[0] : tariff;
        if (!billedService?.active || !billedTariff) {
          warnings.push(group.name + (uiText(": отсутствует активная услуга или тариф для расхождений",": lipsește serviciul activ sau tariful pentru diferențe",p.settings.language)));
          continue;
        }
        if (group.difference_service_id && p.quantities.some(x => x.account_id === a.id && x.service_id === group.difference_service_id && x.period === period)) {
          warnings.push(group.name + (uiText(": ручной объём услуги расхождений конфликтует с распределением",": volumul manual al serviciului pentru diferențe este în conflict cu repartizarea",p.settings.language)));
          continue;
        }
        lines.push({
          service_id: billedService.id,
          name: group.difference_service_id ? billedService.name : {
            ru: s.name.ru + " · общая разница",
            ro: s.name.ro + " · diferență comună",
            en:s.name.en?s.name.en+" · shared difference":undefined,
          },
          unit: billedService.unit,
          quantity: share,
          rate: billedTariff.rate,
          amount: money(D(share).times(billedTariff.rate), p),
        });
      }
    }
  }
  const adjustment = money(
    add(
      p.adjustments
        .filter((x) => x.account_id === a.id && x.period === period)
        .map((x) => x.amount),
    ).plus(add(benefitAmounts(p,a.id,period,lines).map(r=>r.amount))),
    p,
  );
  return {
    lines,
    adjustment,
    total: money(add(lines.map((x) => x.amount)).plus(adjustment), p),
    warnings,
  };
}
export function statement(p: Project, a: Account, period: string) {
  const c = charges(p, a, period);
  const old = p.snapshots.filter(
    (x) =>
      x.account_id === a.id &&
      x.period >= a.opening_period &&
      x.period < period,
  );
  const payments = p.payments.filter(
    (x) =>
      x.account_id === a.id &&
      x.payment_date >= a.opening_period + "-01" &&
      x.payment_date < monthNext(period) + "-01",
  );
  const previousPayments = add(
    payments
      .filter((x) => x.payment_date < period + "-01")
      .map((x) => x.amount),
  );
  const paid = add(
    payments
      .filter((x) => x.payment_date >= period + "-01")
      .map((x) => x.amount),
  );
  const opening =
    period < a.opening_period
      ? D(0)
      : D(a.opening_balance)
          .plus(add(old.map((x) => x.total)))
          .minus(previousPayments);
  let cursor = a.opening_period;
  const gaps: string[] = [];
  // Closed months supply the historical ledger; never silently recalculate history.
  for (let i = 0; cursor < period && (!a.closing_date||cursor<=a.closing_date.slice(0,7)) && i < 1200; i++, cursor = monthNext(cursor))
    if (!old.some((x) => x.period === cursor)) gaps.push(cursor);
  return {
    ...c,
    opening: money(opening, p),
    paid: money(paid, p),
    balance: money(opening.plus(c.total).minus(paid), p),
    gaps,
  };
}
export function closePeriod(p: Project, period: string): Project {
  if (p.closed_periods.includes(period)) throw Error(uiText("Период уже закрыт","Perioada este deja închisă",p.settings.language));
  const accounts = p.accounts.filter(
    (a) => accountOpenInMonth(a,period),
  );
  const rows = accounts.map((a) => ({ a, s: statement(p, a, period) }));
  if (rows.some((x) => x.s.warnings.length || x.s.gaps.length))
    throw Error(uiText("Заполните показания, тарифы и закройте предыдущие периоды","Completați indexurile și tarifele și închideți perioadele anterioare",p.settings.language));
  const next:Project={
    ...p,
    closed_periods: [...p.closed_periods, period],
    snapshots: [
      ...p.snapshots,
      ...rows.filter(({a})=>!p.snapshots.some(x=>x.account_id===a.id&&x.period===period)).map(({ a, s }) => ({
        account_id: a.id,
        period,
        lines: s.lines,
        adjustment: s.adjustment,
        total: s.total,
      })),
    ],
  };
  const previousKeys=new Set(p.snapshots.map(s=>s.account_id+'|'+s.period));
  next.service_accounting={...p.service_accounting,adjustments:structuredClone(p.service_accounting.adjustments)};
  next.administration=structuredClone(p.administration);
  for(const snapshot of next.snapshots.filter(s=>s.period===period&&!previousKeys.has(s.account_id+'|'+s.period))){
    const benefits=benefitAmounts(p,snapshot.account_id,period,snapshot.lines);
    for(const benefit of benefits){let share=next.service_accounting.adjustments.find(r=>r.account_id===snapshot.account_id&&r.period===period&&r.service_id===benefit.service_id);if(!share){share={account_id:snapshot.account_id,period,service_id:benefit.service_id,amount:'0.00'};next.service_accounting.adjustments.push(share);}share.amount=money(D(share.amount).plus(benefit.amount),p);}
    next.administration.benefit_allocations.push(...benefits.map(r=>({...r,account_id:snapshot.account_id,period})));
  }
  return next;
}
export function reopenPeriod(p: Project, period: string): Project {
  if (p.closed_periods.some((x) => x > period))
    throw Error(uiText("Сначала откройте более поздние закрытые периоды","Redeschideți mai întâi perioadele ulterioare închise",p.settings.language));
  if(p.administration.documents.some(d=>!d.imported&&d.state==='applied'&&d.kind==='recalculation'&&d.recalculation_period===period&&d.period>period))throw Error(uiText('Сначала отмените последующие перерасчёты этого месяца.','Anulați mai întâi recalculările ulterioare ale acestei luni.',p.settings.language));
  const next=structuredClone(p);
  const reset=new Set(next.administration.documents.filter(d=>!d.imported&&d.state==='applied'&&d.period===period&&['service-charges','recalculation'].includes(d.kind)).map(d=>d.id));
  for(const row of next.adjustments.filter(r=>r.document_id&&reset.has(r.document_id))){const share=next.service_accounting.adjustments.find(r=>r.account_id===row.account_id&&r.period===row.period&&r.service_id===row.service_id);if(share)share.amount=money(D(share.amount).minus(row.amount),p);}
  next.adjustments=next.adjustments.filter(r=>!r.document_id||!reset.has(r.document_id));
  next.closed_periods=next.closed_periods.filter(x=>x!==period);
  next.charge_events=next.charge_events.filter(x=>x.period!==period);
  next.snapshots=next.snapshots.filter(x=>x.period!==period);
  for(const benefit of next.administration.benefit_allocations.filter(r=>r.period===period)){const share=next.service_accounting.adjustments.find(r=>r.account_id===benefit.account_id&&r.period===period&&r.service_id===benefit.service_id);if(share)share.amount=money(D(share.amount).minus(benefit.amount),p);}
  next.administration.benefit_allocations=next.administration.benefit_allocations.filter(r=>r.period!==period);
  for(const doc of next.administration.documents.filter(d=>reset.has(d.id))){doc.state='draft';doc.before=undefined;doc.after=undefined;doc.comparison=[];}
  return next;
}
export function csv(rows: (string | number)[][]) {
  return (
    "\ufeff" +
    rows
      .map((row) =>
        row
          .map((v) => {
            let s = String(v);
            if (/^[\s]*[=+\-@\t\r]/.test(s)) s = "'" + s;
            return '"' + s.replaceAll('"', '""') + '"';
          })
          .join(";"),
      )
      .join("\r\n")
  );
}
