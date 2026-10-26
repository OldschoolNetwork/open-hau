import { z } from "zod";
import Decimal from "decimal.js";

const decimal = z
  .string()
  .max(64)
  .regex(
    /^-?\d{1,16}(\.\d{1,16})?$/,
    "Используй число с точкой, до 16 цифр до и после неё",
  );
const nonnegative = decimal.refine(
  (v) => !v.startsWith("-"),
  "Нужно неотрицательное значение",
);
const id = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[A-Za-z0-9_-]+$/);
const period = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
const date = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])-\d{2}$/)
  .refine((s) => {
    const d = new Date(s + "T00:00:00Z");
    return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
  }, "Некорректная дата");
const names = z.object({
  ru: z.string().min(1),
  ro: z.string().min(1),
  en: z.string().optional(),
});
const logo = z
  .string()
  .max(3000000)
  .refine(
    (s) =>
      s === "" ||
      /^data:image\/(png|jpeg|webp|svg\+xml);base64,[A-Za-z0-9+/=]+$/.test(s),
  );
const account = z.object({
  id,
  number: z.string().min(1),
  payer_name: z.string().min(1),
  address: z.string(),
  apartments: z.array(z.string()),
  total_area_m2: nonnegative,
  registered_residents: z.number().int().min(0),
  waste_charge_persons: z.number().int().min(0),
  opening_balance: decimal,
  opening_period: period,
  service_ids: z.array(id),
  active: z.boolean(),
  notes: z.string(),
  custom_fields: z.record(z.string(), z.string()).default({}),
});
const service = z.object({
  id,
  name: names,
  calculation_type: z.enum(["metered", "person", "fixed", "area", "manual"]),
  unit: z.string(),
  active: z.boolean(),
  default_quantity: nonnegative,
  notes: z.string(),
});
const tariff = z.object({
  id,
  service_id: id,
  effective_from: date,
  rate: nonnegative,
});
const reading = z
  .object({
    id,
    account_id: id,
    service_id: id,
    period,
    previous: nonnegative,
    current: nonnegative,
  })
  .refine((x) => {
    try {
      return new Decimal(x.current).gte(x.previous);
    } catch {
      return false;
    }
  }, "Текущие показания меньше предыдущих");
const quantity = z.object({
  id,
  account_id: id,
  service_id: id,
  period,
  quantity: nonnegative,
});
const payment = z.object({
  id,
  account_id: id,
  payment_date: date,
  entered_date: date,
  amount: nonnegative,
  note: z.string(),
});
const adjustment = z.object({
  id,
  account_id: id,
  period,
  amount: decimal,
  note: z.string(),
});
const line = z.object({
  service_id: id,
  name: names,
  unit: z.string(),
  quantity: decimal,
  rate: decimal,
  amount: decimal,
});
const snapshot = z.object({
  account_id: id,
  period,
  lines: z.array(line),
  adjustment: decimal,
  total: decimal,
});
export const legacyProjectSchema = z
  .object({
    format: z.literal("openhau"),
    schema_version: z.literal(1),
    demo: z.boolean(),
    currency: z.literal("MDL"),
    organization: z.object({
      id,
      name: z.string().min(1),
      association_code: z.string(),
      fiscal_code: z.string(),
      bank: z.string(),
      iban: z.string(),
      address: z.string(),
      notes: z.string(),
    }),
    settings: z.object({
      language: z.enum(["ru", "ro"]),
      theme: z.enum(["system", "light", "dark"]),
      period,
      receipt_language: z.enum(["ru", "ro", "both"]),
      accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
      receipt_title: names,
      receipt_footer: names,
      due_day: z.number().int().min(1).max(28),
      font_size: z.number().min(9).max(16),
      rounding: z.enum(["half_up", "half_even"]),
      receipt_css: z.string().max(20000),
      receipt_design: z
        .enum(["studio", "compact", "classic"])
        .default("studio"),
      receipt_color: z
        .string()
        .regex(/^#[0-9a-fA-F]{6}$/)
        .default("#46566b"),
      organization_logo: logo.default(""),
      receipt_presets: z
        .array(
          z.object({
            name: z.string().min(1),
            design: z.enum(["studio", "compact", "classic"]),
            color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
            font_size: z.number().min(9).max(16),
            logo,
          }),
        )
        .max(20)
        .default([]),
    }),
    accounts: z.array(account).max(10000),
    services: z.array(service).max(1000),
    tariffs: z.array(tariff).max(50000),
    meter_readings: z.array(reading).max(100000),
    quantities: z.array(quantity).max(100000),
    payments: z.array(payment).max(100000),
    adjustments: z.array(adjustment).max(100000),
    closed_periods: z.array(period),
    snapshots: z.array(snapshot).default([]),
    template_manifest: z.array(z.unknown()).max(0),
  })
  .strict()
  .superRefine((p, ctx) => {
    const fail = (message: string) =>
      ctx.addIssue({ code: z.ZodIssueCode.custom, message });
    for (const key of [
      "accounts",
      "services",
      "tariffs",
      "meter_readings",
      "quantities",
      "payments",
      "adjustments",
    ] as const) {
      const ids = p[key].map((x) => x.id);
      if (new Set(ids).size !== ids.length) fail(`Повторяющиеся ID: ${key}`);
    }
    if (new Set(p.accounts.map((x) => x.number)).size !== p.accounts.length)
      fail("Номера лицевых счетов должны быть уникальны");
    const ac = new Set(p.accounts.map((x) => x.id)),
      sv = new Set(p.services.map((x) => x.id));
    for (const a of p.accounts)
      for (const s of a.service_ids)
        if (!sv.has(s)) fail(`Неизвестная услуга ${s}`);
    for (const x of [
      ...p.meter_readings,
      ...p.quantities,
      ...p.payments,
      ...p.adjustments,
    ])
      if (!ac.has(x.account_id)) fail("Ссылка на неизвестный счёт");
    for (const x of [...p.tariffs, ...p.meter_readings, ...p.quantities])
      if (!sv.has(x.service_id)) fail("Ссылка на неизвестную услугу");
    for (const key of ["meter_readings", "quantities"] as const) {
      const keys = p[key].map(
        (x) => `${x.account_id}|${x.service_id}|${x.period}`,
      );
      if (new Set(keys).size !== keys.length)
        fail(`Повторяющиеся строки ${key}`);
    }
    const rates = p.tariffs.map((x) => `${x.service_id}|${x.effective_from}`);
    if (new Set(rates).size !== rates.length)
      fail("Два тарифа одной услуги на одну дату");
    if (p.tariffs.some((x) => !x.effective_from.endsWith("-01")))
      fail("В 26.1 тариф действует с первого дня месяца");
    const snapshotKeys = p.snapshots.map((x) => `${x.account_id}|${x.period}`);
    if (new Set(snapshotKeys).size !== snapshotKeys.length)
      fail("Повторяющиеся сохранённые начисления");
    for (const s of p.snapshots)
      if (!ac.has(s.account_id) || !p.closed_periods.includes(s.period))
        fail("Некорректная ссылка в сохранённом начислении");
    for (const s of p.snapshots) {
      try {
        if (
          !/^-?\d+\.\d{2}$/.test(s.total) ||
          !/^-?\d+\.\d{2}$/.test(s.adjustment) ||
          s.lines.some((l) => !/^-?\d+\.\d{2}$/.test(l.amount))
        )
          fail("Сохранённые суммы должны иметь два десятичных знака");
        const total = s.lines.reduce(
          (sum, l) => sum.plus(l.amount),
          new Decimal(s.adjustment),
        );
        if (!total.eq(s.total))
          fail(
            "Итог сохранённого начисления не совпадает с суммой строк и корректировкой",
          );
      } catch {
        fail("Некорректные сохранённые суммы");
      }
    }
    if (new Set(p.closed_periods).size !== p.closed_periods.length)
      fail("Повторяющиеся закрытые периоды");
    if (
      new TextEncoder().encode(JSON.stringify(p, null, 2)).byteLength >
      20 * 1024 * 1024
    )
      fail(
        "Полный JSON превышает 20 МБ; уменьшите логотипы или число конфигураций",
      );
  });
const physicalMeter = z.object({
  id,
  scope: z.enum(["individual", "shared"]).default("individual"),
  account_id: z.union([id, z.literal("")]),
  service_id: id,
  label: z.string().min(1),
  serial_number: z.string(),
  unit: z.string(),
  active: z.boolean(),
  installed_on: date.nullable().default(null),
  retired_on: date.nullable().default(null),
  initial_value: nonnegative.default("0"),
});
const physicalMeterValue = z.object({
  id,
  meter_id: id,
  period,
  reading_date: date,
  value: nonnegative,
  kind: z.enum(["initial", "regular", "final"]).default("regular"),
  notes: z.string(),
});
const monthlyOccupancy = z.object({
  id,
  account_id: id,
  apartment: z.string(),
  period,
  mode: z.enum(["direct", "cumulative"]),
  previous: z.number().int().min(0).max(1000000000),
  current: z.number().int().min(0).max(1000000000),
  notes: z.string(),
});
const sharedGroup = z.object({
  id,
  name: z.string().min(1),
  shared_meter_id: id,
  individual_meter_ids: z.array(id).min(1).max(100000),
  effective_from: period,
  effective_to: period.nullable(),
  precision: z.number().int().min(0).max(6),
  allow_negative: z.boolean().default(false),
  exclusions: z.array(
    z.object({ period, account_ids: z.array(id), notes: z.string() }),
  ),
});
export const receiptDesigns = [
  "studio",
  "compact",
  "classic",
  "ribbon",
  "botanical",
  "heritage",
  "custom",
] as const;
const customReceipt = z.object({
  font: z.enum(["sans", "serif", "mono"]),
  decoration: z.enum(["none", "stripes", "dots"]),
  border: z.enum(["none", "line", "double"]),
  heading: z.enum(["left", "center"]),
  economy: z.boolean(),
});
export const defaultCustomReceipt = {
  font: "sans",
  decoration: "none",
  border: "line",
  heading: "left",
  economy: false,
} as const;
const currentProjectSchema = z
  .object({
    ...legacyProjectSchema.shape,
    schema_version: z.literal(2),
    settings: legacyProjectSchema.shape.settings.extend({
      receipt_language: z.enum(["ru", "ro", "both", "en"]),
      receipt_design: z.enum(receiptDesigns).default("studio"),
      custom_receipt: customReceipt.optional(),
      receipt_presets: z
        .array(
          z.object({
            name: z.string().min(1),
            design: z.enum(receiptDesigns),
            color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
            font_size: z.number().min(9).max(16),
            logo,
            custom: customReceipt.optional(),
          }),
        )
        .max(20)
        .default([]),
    }),
    meters: z.array(physicalMeter).max(100000),
    meter_values: z.array(physicalMeterValue).max(200000),
    monthly_occupancy: z.array(monthlyOccupancy).max(200000).default([]),
    shared_groups: z.array(sharedGroup).max(10000).default([]),
    payment_deadlines: z
      .array(z.object({ period, due_date: date }))
      .max(12000)
      .default([]),
  })
  .strict()
  .superRefine((p, ctx) => {
    // Reuse all established v1 accounting checks without silently stripping fields.
    const {
      meters,
      meter_values,
      monthly_occupancy,
      shared_groups,
      payment_deadlines,
      ...common
    } = p;
    const previous = legacyProjectSchema.safeParse({
      ...common,
      schema_version: 1,
      settings: {
        ...p.settings,
        receipt_language:
          p.settings.receipt_language === "en"
            ? "ro"
            : p.settings.receipt_language,
        receipt_design: "studio",
        receipt_presets: p.settings.receipt_presets.map((preset) => ({
          ...preset,
          design: "studio",
        })),
      },
    });
    if (!previous.success)
      for (const issue of previous.error.issues)
        ctx.addIssue({
          code: "custom",
          path: issue.path,
          message: issue.message,
        });
    const fail = (message: string) => ctx.addIssue({ code: "custom", message });
    if (
      new Set(payment_deadlines.map((d) => d.period)).size !==
      payment_deadlines.length
    )
      fail("Duplicate payment deadline months");
    if (payment_deadlines.some((d) => d.due_date < d.period + "-01"))
      fail("Payment deadline precedes billing month");
    const accounts = new Set(p.accounts.map((a) => a.id));
    if (
      new Set(monthly_occupancy.map((r) => r.id)).size !==
      monthly_occupancy.length
    )
      fail("Duplicate monthly occupancy identifiers");
    if (
      new Set(
        monthly_occupancy.map(
          (r) => `${r.account_id}|${r.apartment}|${r.period}`,
        ),
      ).size !== monthly_occupancy.length
    )
      fail("Duplicate monthly occupancy entries");
    const occupancyGroups = new Map<
      string,
      { aggregate: boolean; detail: boolean }
    >();
    for (const r of monthly_occupancy) {
      const account = p.accounts.find((a) => a.id === r.account_id);
      if (!account) fail("Monthly occupancy references an unknown account");
      else if (r.apartment && !account.apartments.includes(r.apartment))
        fail("Monthly occupancy references an unknown apartment");
      if (r.mode === "direct" && r.previous !== 0)
        fail("Direct monthly occupancy must have a zero baseline");
      if (r.current < r.previous) fail("Cumulative occupancy cannot decrease");
      const key = `${r.account_id}|${r.period}`,
        group = occupancyGroups.get(key) || { aggregate: false, detail: false };
      if (r.apartment) group.detail = true;
      else group.aggregate = true;
      occupancyGroups.set(key, group);
    }
    if ([...occupancyGroups.values()].some((g) => g.aggregate && g.detail))
      fail(
        "Account totals and apartment occupancy cannot be mixed for the same month",
      );
    const services = new Set(p.services.map((s) => s.id));
    const meterIds = new Set(meters.map((m) => m.id));
    const meterById = new Map(meters.map((m) => [m.id, m]));
    if (new Set(shared_groups.map((g) => g.id)).size !== shared_groups.length)
      fail("Duplicate shared group identifiers");
    for (const g of shared_groups) {
      const master = meterById.get(g.shared_meter_id);
      if (!master || master.scope !== "shared")
        fail("Group requires a shared meter");
      if (g.effective_to && g.effective_to < g.effective_from)
        fail("Shared group end precedes start");
      if (
        new Set(g.individual_meter_ids).size !== g.individual_meter_ids.length
      )
        fail("Duplicate linked individual meters");
      const linkedAccounts = new Set<string>();
      for (const mid of g.individual_meter_ids) {
        const meter = meterById.get(mid);
        if (
          !meter ||
          meter.scope !== "individual" ||
          meter.service_id !== master?.service_id
        )
          fail("Linked meters must be individual meters for the same service");
        if (meter) linkedAccounts.add(meter.account_id);
        if (
          meter &&
          !p.accounts
            .find((a) => a.id === meter.account_id)
            ?.service_ids.includes(meter.service_id)
        )
          fail("Linked account must use the shared meter service");
      }
      if (
        new Set(g.exclusions.map((e) => e.period)).size !== g.exclusions.length
      )
        fail("Duplicate exception months");
      for (const e of g.exclusions) {
        if (
          new Set(e.account_ids).size !== e.account_ids.length ||
          e.account_ids.some((id) => !linkedAccounts.has(id))
        )
          fail("Invalid excluded accounts");
      }
    }
    for (let i = 0; i < shared_groups.length; i++)
      for (let j = i + 1; j < shared_groups.length; j++) {
        const a = shared_groups[i],
          b = shared_groups[j];
        const overlap =
          a.effective_from <= (b.effective_to || "9999-12") &&
          b.effective_from <= (a.effective_to || "9999-12");
        if (
          overlap &&
          (a.shared_meter_id === b.shared_meter_id ||
            a.individual_meter_ids.some((id) =>
              b.individual_meter_ids.includes(id),
            ))
        )
          fail("Meter groups overlap in time");
      }
    if (meterIds.size !== meters.length)
      fail("Duplicate physical meter identifiers");
    if (new Set(meter_values.map((r) => r.id)).size !== meter_values.length)
      fail("Duplicate physical reading identifiers");
    for (const m of meters) {
      if (!services.has(m.service_id))
        fail("Physical meter references an unknown service");
      if (m.scope === "individual" && !accounts.has(m.account_id))
        fail("Individual meter references an unknown account");
      if (m.scope === "shared" && m.account_id !== "")
        fail("Shared meters must not belong to one individual account");
      if (m.installed_on && m.retired_on && m.retired_on < m.installed_on)
        fail("Meter retirement precedes installation");
    }
    if (
      new Set(meter_values.map((r) => `${r.meter_id}|${r.reading_date}`))
        .size !== meter_values.length
    )
      fail("Duplicate meter readings on the same date");
    for (const r of meter_values) {
      const meter = meterById.get(r.meter_id);
      if (!meter) fail("Reading references an unknown physical meter");
      else if (
        (meter.installed_on && r.reading_date < meter.installed_on) ||
        (meter.retired_on && r.reading_date > meter.retired_on)
      )
        fail("Reading date falls outside the meter installation lifetime");
    }
    if (
      new TextEncoder().encode(JSON.stringify(p, null, 2)).byteLength >
      20 * 1024 * 1024
    )
      fail("Full project JSON exceeds 20 MB");
  });

export const projectSchema = z.preprocess((input) => {
  if (
    input &&
    typeof input === "object" &&
    "schema_version" in input &&
    input.schema_version === 1
  ) {
    const previous = legacyProjectSchema.safeParse(input);
    if (previous.success)
      return {
        ...previous.data,
        schema_version: 2,
        meters: [],
        meter_values: [],
      };
  }
  return input;
}, currentProjectSchema);

export type Project = z.infer<typeof projectSchema>;
export type PhysicalMeter = z.infer<typeof physicalMeter>;
export type PhysicalMeterValue = z.infer<typeof physicalMeterValue>;
export type MonthlyOccupancy = z.infer<typeof monthlyOccupancy>;
export type SharedGroup = z.infer<typeof sharedGroup>;
export type Account = z.infer<typeof account>;
export type Service = z.infer<typeof service>;
export type Tariff = z.infer<typeof tariff>;
export type Payment = z.infer<typeof payment>;
export type Adjustment = z.infer<typeof adjustment>;
export const uid = () => crypto.randomUUID();
export function unitLabel(unit: string, lang: "ru" | "ro" | "both" | "en") {
  const labels: Record<string, [string, string, string]> = {
    person: ["чел.", "pers.", "persons"],
    "чел. / pers.": ["чел.", "pers.", "persons"],
    account: ["счёт", "cont", "account"],
    "счёт / cont": ["счёт", "cont", "account"],
  };
  const pair = labels[unit];
  return !pair
    ? unit
    : lang === "both"
      ? pair.slice(0, 2).join(" / ")
      : pair[lang === "ru" ? 0 : lang === "en" ? 2 : 1];
}
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export function demoProject(): Project {
  const month = today().slice(0, 7);
  return {
    format: "openhau",
    schema_version: 2,
    demo: true,
    currency: "MDL",
    organization: {
      id: "org-demo",
      name: "Asociația Exemplu",
      association_code: "DEMO",
      fiscal_code: "",
      bank: "",
      iban: "",
      address: "Демонстрационный адрес",
      notes: "",
    },
    settings: {
      language: "ru",
      theme: "system",
      period: month,
      receipt_language: "ro",
      accent: "#a36389",
      receipt_title: {
        ru: "Квитанция за коммунальные услуги",
        ro: "Factura pentru servicii comunale",
      },
      receipt_footer: {
        ru: "Спасибо за своевременную оплату.",
        ro: "Vă mulțumim pentru achitarea la timp.",
      },
      due_day: 20,
      font_size: 11,
      rounding: "half_up",
      receipt_css: "",
      receipt_design: "studio",
      receipt_color: "#46566b",
      organization_logo: "",
      receipt_presets: [],
    },
    accounts: [
      {
        id: "a1",
        number: "000001",
        payer_name: "Житель Пример / Locatar Exemplu",
        address: "Демонстрационная улица, дом 1",
        apartments: ["2", "6"],
        total_area_m2: "74.90",
        registered_residents: 1,
        waste_charge_persons: 1,
        opening_balance: "0.00",
        opening_period: month,
        service_ids: ["water", "electricity", "waste", "maintenance", "bank"],
        active: true,
        notes: "Вымышленные данные для знакомства с программой.",
        custom_fields: {},
      },
      {
        id: "a2",
        number: "000002",
        payer_name: "Семья Пример / Familia Exemplu",
        address: "Демонстрационная улица, дом 1",
        apartments: ["3"],
        total_area_m2: "52.00",
        registered_residents: 3,
        waste_charge_persons: 2,
        opening_balance: "125.50",
        opening_period: month,
        service_ids: ["water", "electricity", "waste", "maintenance", "bank"],
        active: true,
        notes: "",
        custom_fields: {},
      },
    ],
    services: [
      {
        id: "water",
        name: { ru: "Вода и канализация", ro: "Apă și canalizare" },
        calculation_type: "metered",
        unit: "m³",
        active: true,
        default_quantity: "0",
        notes: "",
      },
      {
        id: "electricity",
        name: { ru: "Электроэнергия", ro: "Energie electrică" },
        calculation_type: "metered",
        unit: "kWh",
        active: true,
        default_quantity: "0",
        notes: "",
      },
      {
        id: "waste",
        name: { ru: "Вывоз мусора", ro: "Evacuarea deșeurilor" },
        calculation_type: "person",
        unit: "чел. / pers.",
        active: true,
        default_quantity: "1",
        notes: "Используется отдельное число людей для начисления за мусор.",
      },
      {
        id: "maintenance",
        name: { ru: "Содержание дома", ro: "Deservirea blocului" },
        calculation_type: "fixed",
        unit: "счёт / cont",
        active: true,
        default_quantity: "1",
        notes: "",
      },
      {
        id: "bank",
        name: { ru: "Банковские услуги", ro: "Servicii bancare" },
        calculation_type: "fixed",
        unit: "счёт / cont",
        active: true,
        default_quantity: "1",
        notes: "",
      },
    ],
    tariffs: [
      ["water", "20.66"],
      ["electricity", "3.56"],
      ["waste", "17.50"],
      ["maintenance", "150.00"],
      ["bank", "4.00"],
    ].map(([service_id, rate]) => ({
      id: "t-" + service_id,
      service_id,
      rate,
      effective_from: month + "-01",
    })),
    meter_readings: [
      {
        id: "r1",
        account_id: "a1",
        service_id: "water",
        period: month,
        previous: "100",
        current: "115",
      },
      {
        id: "r2",
        account_id: "a1",
        service_id: "electricity",
        period: month,
        previous: "1000",
        current: "1159",
      },
    ],
    meters: [],
    meter_values: [],
    monthly_occupancy: [],
    shared_groups: [],
    payment_deadlines: [],
    quantities: [],
    payments: [],
    adjustments: [],
    closed_periods: [],
    snapshots: [],
    template_manifest: [],
  };
}
