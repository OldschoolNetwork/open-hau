import type { Project } from "./model";
export function paymentDeadline(p: Project, period: string) {
  const override = p.payment_deadlines.find((d) => d.period === period);
  if (override) return override.due_date;
  const [y, m] = period.split("-").map(Number);
  const next =
    m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  return `${next}-${String(p.settings.due_day).padStart(2, "0")}`;
}
