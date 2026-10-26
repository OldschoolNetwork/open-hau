import type { Project, Account, MonthlyOccupancy } from "./model";
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
