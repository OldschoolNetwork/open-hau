import type { Project, Account, MonthlyOccupancy } from "./model";
import { uid } from "./model";
export function setAccountMonthlyPersons(
  p: Project, accountId: string, period: string, persons: number,
) {
  const ru = p.settings.language === "ru";
  if (p.closed_periods.includes(period))
    throw Error(ru ? "Месяц закрыт. Количество людей не изменено." : "Luna este închisă. Numărul de persoane nu a fost modificat.");
  if (!Number.isInteger(persons) || persons < 0 || persons > 1000000000)
    throw Error(ru ? "Укажите целое количество людей от 0 до 1000000000." : "Introduceți un număr întreg de persoane între 0 și 1000000000.");
  if (!p.accounts.some(a => a.id === accountId))
    throw Error(ru ? "Лицевой счёт не найден." : "Contul personal nu a fost găsit.");
  const next = structuredClone(p);
  const existing = next.monthly_occupancy.find(r => r.account_id === accountId && r.period === period && !r.apartment);
  next.monthly_occupancy = next.monthly_occupancy.filter(r => r.account_id !== accountId || r.period !== period);
  next.monthly_occupancy.push({id: existing?.id || uid(), account_id: accountId, period, apartment: "", mode: "direct", previous: 0, current: persons, notes: existing?.notes || ""});
  return next;
}
export const occupancyPersons = (row: MonthlyOccupancy) =>
  row.current - row.previous;
export function monthlyPersons(p: Project, a: Account, period: string) {
  const rows = p.monthly_occupancy.filter(
    (r) => r.account_id === a.id && r.period === period,
  );
  if (!rows.length) {
    if (
      p.monthly_occupancy.some(
        (r) => r.account_id === a.id && r.period < period,
      )
    )
      return {
        persons: null,
        source: "monthly" as const,
        missing: a.apartments.length ? [...a.apartments] : [""],
      };
    return {
      persons: a.waste_charge_persons,
      source: "default" as const,
      missing: [] as string[],
    };
  }
  const aggregate = rows.find((r) => !r.apartment);
  if (aggregate)
    return {
      persons: occupancyPersons(aggregate),
      source: "monthly" as const,
      missing: [] as string[],
    };
  const missing = a.apartments.filter(
    (ap) => !rows.some((r) => r.apartment === ap),
  );
  return {
    persons: missing.length
      ? null
      : rows.reduce((sum, r) => sum + occupancyPersons(r), 0),
    source: "monthly" as const,
    missing,
  };
}
