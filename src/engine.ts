import Decimal from "decimal.js";
import type { Project, Account } from "./model";
import { physicalReadings } from "./meters";
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
  name: { ru: string; ro: string };
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
  if (period < a.opening_period)
    return {
      lines: [],
      adjustment: "0.00",
      total: "0.00",
      warnings: ["Счёт ещё не открыт в выбранном периоде"],
    };
  const lines: Line[] = [],
    warnings: string[] = [];
  for (const sid of a.service_ids) {
    const s = p.services.find((x) => x.id === sid);
    if (!s || !s.active) continue;
    const tariff = p.tariffs
      .filter((t) => t.service_id === sid && t.effective_from <= period + "-01")
      .sort((x, y) => y.effective_from.localeCompare(x.effective_from))[0];
    if (!tariff) {
      warnings.push(s.name[p.settings.language] + ": нет тарифа");
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
              s.name[p.settings.language] +
                (p.settings.language === "ru"
                  ? ": проверьте показания и единицы измерения каждого прибора"
                  : ": verificați indexurile și unitățile fiecărui contor"),
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
            warnings.push(s.name[p.settings.language] + ": нет показаний");
            continue;
          }
          quantity = D(r.current).minus(r.previous).toFixed();
        }
      } else if (s.calculation_type === "person")
        quantity = String(a.waste_charge_persons);
      else if (s.calculation_type === "area") quantity = a.total_area_m2;
      else if (s.calculation_type === "manual") {
        warnings.push(s.name[p.settings.language] + ": не введён объём");
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
  }
  const adjustment = money(
    add(
      p.adjustments
        .filter((x) => x.account_id === a.id && x.period === period)
        .map((x) => x.amount),
    ),
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
  for (let i = 0; cursor < period && i < 1200; i++, cursor = monthNext(cursor))
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
  if (p.closed_periods.includes(period)) throw Error("Период уже закрыт");
  const accounts = p.accounts.filter(
    (a) => a.active && a.opening_period <= period,
  );
  const rows = accounts.map((a) => ({ a, s: statement(p, a, period) }));
  if (rows.some((x) => x.s.warnings.length || x.s.gaps.length))
    throw Error("Заполни показания, тарифы и закрой предыдущие периоды");
  return {
    ...p,
    closed_periods: [...p.closed_periods, period],
    snapshots: [
      ...p.snapshots,
      ...rows.map(({ a, s }) => ({
        account_id: a.id,
        period,
        lines: s.lines,
        adjustment: s.adjustment,
        total: s.total,
      })),
    ],
  };
}
export function reopenPeriod(p: Project, period: string): Project {
  if (p.closed_periods.some((x) => x > period))
    throw Error("Сначала открой более поздние закрытые периоды");
  return {
    ...p,
    closed_periods: p.closed_periods.filter((x) => x !== period),
    snapshots: p.snapshots.filter((x) => x.period !== period),
  };
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
