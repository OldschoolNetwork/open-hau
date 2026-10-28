import Decimal from "decimal.js";
import type { Project, PhysicalMeter } from "./model";
import { canonicalUnit } from "./units";

export type MeterDisplay = {
  meter_id: string;
  service_id: string;
  label: string;
  serial_number: string;
  unit: string;
  previous: string | null;
  current: string | null;
  previous_date: string | null;
  reading_date: string | null;
  consumption: string | null;
  aggregate: boolean;
  warning: "missing" | "decreasing" | "unit" | null;
};


export function physicalReadings(
  p: Project,
  accountId: string,
  serviceId: string,
  period: string,
): MeterDisplay[] {
  return p.meters
    .filter(
      (m) =>
        m.scope === "individual" &&
        m.account_id === accountId &&
        m.service_id === serviceId,
    )
    .filter(
      (m) =>
        (!m.installed_on || m.installed_on.slice(0, 7) <= period) &&
        (!!m.status_history?.length || !m.retired_on || m.retired_on.slice(0, 7) >= period),
    )
    .filter(
      (m) =>
        (m.status_history?.length?meterConnectedInMonth(m,period):m.active) ||
        m.retired_on?.slice(0, 7) === period ||
        p.meter_values.some((r) => r.meter_id === m.id && r.period === period),
    )
    .map((m) => meterReading(p, m, period));
}

export function meterReading(
  p: Project,
  m: PhysicalMeter,
  period: string,
): MeterDisplay {
  const serviceId = m.service_id;
  const values = p.meter_values
    .filter((r) => r.meter_id === m.id)
    .sort((a, b) => a.reading_date.localeCompare(b.reading_date));
  const current = values
    .filter((r) => r.period === period && r.kind !== "initial")
    .at(-1);
  const previous = values
    .filter(
      (r) =>
        (r.period < period || (r.kind === "initial" && r.period <= period)) &&
        (!current || r.reading_date <= current.reading_date),
    )
    .at(-1);
  const prior = previous?.value ?? (m.installed_on ? m.initial_value : null);
  const delta =
    current && prior !== null ? new Decimal(current.value).minus(prior) : null;
  const decreasing = delta?.isNegative() ?? false;
  const service = p.services.find((s) => s.id === serviceId);
  const incompatibleUnit =
    !!service && canonicalUnit(service.unit) !== canonicalUnit(m.unit);
  return {
    meter_id: m.id,
    service_id: serviceId,
    label: m.label,
    serial_number: m.serial_number,
    unit: m.unit,
    previous: prior,
    current: current?.value ?? null,
    previous_date: previous?.reading_date ?? m.installed_on,
    reading_date: current?.reading_date ?? null,
    consumption:
      delta && !decreasing && !incompatibleUnit ? delta.toFixed() : null,
    aggregate: false,
    warning: incompatibleUnit
      ? "unit"
      : !current || prior === null
        ? "missing"
        : decreasing
          ? "decreasing"
          : null,
  };
}

export function receiptReadings(
  p: Project,
  accountId: string,
  period: string,
): MeterDisplay[] {
  const rows: MeterDisplay[] = [];
  for (const service of p.services) {
    const physical = physicalReadings(p, accountId, service.id, period);
    if (physical.length) {
      rows.push(...physical);
      continue;
    }
    const legacy = p.meter_readings.find(
      (r) =>
        r.account_id === accountId &&
        r.service_id === service.id &&
        r.period === period,
    );
    if (legacy)
      rows.push({
        meter_id: legacy.id,
        service_id: service.id,
        label: service.name[p.settings.language],
        serial_number: "",
        unit: service.unit,
        previous: legacy.previous,
        current: legacy.current,
        previous_date: null,
        reading_date: null,
        consumption: new Decimal(legacy.current)
          .minus(legacy.previous)
          .toFixed(),
        aggregate: true,
        warning: null,
      });
  }
  return rows;
}

export function meterConnectedInMonth(m:PhysicalMeter,month:string){
 if(!m.status_history?.length)return m.active;
 const start=month+'-01',end=month+'-31',history=[...m.status_history].sort((a,b)=>a.date.localeCompare(b.date));
 return !!history.filter(s=>s.date<=start).at(-1)?.active||history.some(s=>s.active&&s.date>=start&&s.date<=end);
}
