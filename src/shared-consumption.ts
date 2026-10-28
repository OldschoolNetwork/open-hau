import Decimal from "decimal.js";
import type { Project, SharedGroup } from "./model";
import { meterReading,meterConnectedInMonth } from "./meters";
import {accountOpenInMonth} from './account-lifecycle';
const Q = Decimal.clone({ precision: 50 });
export type DistributionRow = {
  account_id: string;
  number: string;
  individual: string;
  excluded: boolean;
  share: string;
};
export function equalShares(total: string, ids: string[], precision: number) {
  if (!Number.isInteger(precision) || precision < 0 || precision > 16)
    throw Error("Invalid allocation precision");
  if (new Set(ids).size !== ids.length)
    throw Error("Duplicate allocation accounts");
  const value = new Q(total);
  if (!value.isFinite()) throw Error("Invalid allocation total");
  if (!ids.length) {
    if (!value.isZero()) throw Error("No participating accounts");
    return new Map<string, string>();
  }
  const digits = Math.max(precision, value.decimalPlaces()),
    scale = new Q(10).pow(digits);
  const units = value.abs().times(scale),
    base = units.div(ids.length).floor(),
    remainder = units.mod(ids.length).toNumber();
  return new Map(
    [...ids].sort().map((id, i) => [
      id,
      base
        .plus(i < remainder ? 1 : 0)
        .div(scale)
        .times(value.isNegative() ? -1 : 1)
        .toFixed(digits),
    ]),
  );
}
export function sharedDistribution(p: Project, g: SharedGroup, period: string) {
  const tr = (ru: string, ro: string) =>
    p.settings.language === "ru" ? ru : ro;
  const warnings: string[] = [],
    rows: DistributionRow[] = [];
  const master = p.meters.find((m) => m.id === g.shared_meter_id);
  if (!master)
    throw Error(
      tr("Не найден общий счётчик", "Contorul comun nu a fost găsit"),
    );
  const shared = meterReading(p, master, period);
  if(!meterConnectedInMonth(master,period))warnings.push(tr('Общий прибор отключён в выбранном периоде.','Contorul comun este deconectat în perioada selectată.'));
  if (shared.warning)
    warnings.push(
      tr(
        "Проверьте показания общего счётчика и единицы измерения.",
        "Verificați indexurile contorului comun și unitățile de măsură.",
      ),
    );
  const totals = new Map<string, Decimal>();
  for (const mid of g.individual_meter_ids) {
    const m = p.meters.find((m) => m.id === mid);
    if (!m) continue;
    if(m.status_history?.length&&!meterConnectedInMonth(m,period))continue;
    if (
      (m.installed_on && m.installed_on.slice(0, 7) > period) ||
      (m.retired_on && m.retired_on.slice(0, 7) < period)
    )
      continue;
    const reading = meterReading(p, m, period);
    if (reading.warning)
      warnings.push(
        tr(
          "Проверьте индивидуальный счётчик: ",
          "Verificați contorul individual: ",
        ) + m.label,
      );
    totals.set(
      m.account_id,
      new Q(totals.get(m.account_id) || 0).plus(reading.consumption || 0),
    );
  }
  const excluded = new Set(
    g.exclusions.find((e) => e.period === period)?.account_ids || [],
  );
  for(const id of totals.keys()){const account=p.accounts.find(a=>a.id===id);if(account&&!accountOpenInMonth(account,period))excluded.add(id);}
  const individual = [...totals.values()].reduce((a, b) => a.plus(b), new Q(0));
  const difference =
    shared.consumption === null
      ? null
      : new Q(shared.consumption).minus(individual);
  if (difference?.isNegative() && !g.allow_negative)
    warnings.push(
      tr(
        "Отрицательная разница требует проверки и отдельного разрешения распределения.",
        "Diferența negativă necesită verificare și permisiune explicită pentru repartizare.",
      ),
    );
  const participants = [...totals.keys()].filter((id) => !excluded.has(id));
  if (!participants.length && difference && !difference.isZero())
    warnings.push(
      tr(
        "Все лицевые счета исключены: разница не распределена.",
        "Toate conturile sunt exceptate: diferența nu este repartizată.",
      ),
    );
  let shares = new Map<string, string>();
  if (!warnings.length && difference)
    shares = equalShares(difference.toFixed(), participants, g.precision);
  for (const [account_id, quantity] of totals) {
    const a = p.accounts.find((a) => a.id === account_id);
    rows.push({
      account_id,
      number: a?.number || account_id,
      individual: quantity.toFixed(),
      excluded: excluded.has(account_id),
      share: shares.get(account_id) || "0",
    });
  }
  return {
    shared: shared.consumption,
    individual: individual.toFixed(),
    difference: difference?.toFixed() ?? null,
    participants: participants.length,
    rows,
    warnings,
    ready: !warnings.length,
  };
}
export const applicableGroups = (p: Project, period: string) =>
  p.shared_groups.filter(
    (g) =>
      g.effective_from <= period &&
      (!g.effective_to || g.effective_to >= period),
  );
