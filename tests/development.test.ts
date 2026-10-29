import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { demoProject, legacyProjectSchema, projectSchema } from "../src/model";
import { charges, closePeriod, monthNext } from "../src/engine";
import { physicalReadings, receiptReadings } from "../src/meters";
import { receiptDocument } from "../src/receipt";
import { accountBalanceReport, accountReportCSV } from "../src/reports";
import { accountReportHTML, accountReportXML } from "../src/report-exports";

test("schema 1 migrates without mutating or changing financial history", () => {
  const source = JSON.parse(
    fs.readFileSync(
      new URL("../examples/demo.openhau.json", import.meta.url),
      "utf8",
    ),
  );
  const original = JSON.stringify(source);
  assert(legacyProjectSchema.safeParse(source).success);
  const migrated = projectSchema.parse(source);
  assert.equal(migrated.schema_version, 3);
  assert.deepEqual(migrated.meters, []);
  assert.deepEqual(migrated.meter_values, []);
  assert.deepEqual(migrated.accounts, source.accounts);
  assert.deepEqual(migrated.payments, source.payments);
  assert.equal(JSON.stringify(source), original);
  assert(!legacyProjectSchema.safeParse(migrated).success);
  assert(!projectSchema.safeParse({ ...migrated, schema_version: 99 }).success);
});

function withMeter() {
  const p = demoProject();
  p.meters.push({
    id: "meter-a",
    scope: "individual",
    account_id: "a1",
    service_id: "water",
    label: "Water <meter>",
    serial_number: "DEMO-001",
    unit: "m³",
    active: true,
    installed_on: p.settings.period + "-01",
    retired_on: null,
    initial_value: "100",
  });
  p.meter_values.push({
    id: "value-a",
    meter_id: "meter-a",
    period: p.settings.period,
    reading_date: p.settings.period + "-28",
    value: "115",
    kind: "regular",
    notes: "",
  });
  return p;
}
test("physical meters produce correct consumption and receipt dates", () => {
  const p = withMeter();
  assert(projectSchema.safeParse(p).success);
  assert.equal(
    physicalReadings(p, "a1", "water", p.settings.period)[0].consumption,
    "15",
  );
  assert.equal(charges(p, p.accounts[0], p.settings.period).total, "1047.44");
  const html = receiptDocument(p, [p.accounts[0]], p.settings.period);
  assert(html.includes("Water &lt;meter&gt;"));
  assert(html.includes("DEMO-001"));
  assert(html.includes(p.settings.period + "-28"));
  assert(html.includes("100") && html.includes("115"));
});
test("missing or decreasing readings are not treated as zero consumption", () => {
  const p = withMeter();
  p.meter_values[0].value = "99";
  assert.equal(
    physicalReadings(p, "a1", "water", p.settings.period)[0].warning,
    "decreasing",
  );
  assert(charges(p, p.accounts[0], p.settings.period).warnings.length > 0);
  p.meter_values = [];
  assert.equal(
    physicalReadings(p, "a1", "water", p.settings.period)[0].warning,
    "missing",
  );
  assert(charges(p, p.accounts[0], p.settings.period).warnings.length > 0);
});
test("multiple physical meters are summed and printed separately", () => {
  const p = withMeter();
  p.meter_values[0].value = "110";
  p.meters.push({
    ...p.meters[0],
    id: "meter-b",
    label: "Second meter",
    serial_number: "DEMO-002",
    initial_value: "40",
  });
  p.meter_values.push({
    ...p.meter_values[0],
    id: "value-b",
    meter_id: "meter-b",
    value: "45",
  });
  assert.equal(
    charges(p, p.accounts[0], p.settings.period).lines[0].quantity,
    "15",
  );
  assert.equal(
    receiptReadings(p, "a1", p.settings.period).filter((r) => !r.aggregate)
      .length,
    2,
  );
  assert(
    receiptDocument(p, [p.accounts[0]], p.settings.period).includes("DEMO-002"),
  );
});
test("schema 2 rejects unknown meter references and duplicate reading dates", () => {
  const p = withMeter();
  p.meter_values[0].meter_id = "unknown";
  assert(!projectSchema.safeParse(p).success);
  const q = withMeter();
  q.meter_values.push({ ...q.meter_values[0], id: "duplicate" });
  assert(!projectSchema.safeParse(q).success);
});
test("balance reports include closed accounts and flag incomplete calculations", () => {
  const p = demoProject();
  p.accounts[1].active = false;
  const report = accountBalanceReport(p, p.settings.period, p.settings.period);
  assert.equal(report.rows.length, 2);
  assert.equal(report.rows[0].charges, "1047.44");
  assert.equal(report.rows[1].charges, "0.00");
  assert.equal(report.rows[1].closing, "125.50");
  p.meter_readings = p.meter_readings.filter((r) => r.account_id !== "a1");
  assert(
    accountBalanceReport(p, p.settings.period, p.settings.period).incomplete,
  );
  p.accounts[0].payer_name = '=HYPERLINK("test")';
  assert(
    accountReportCSV(p, p.settings.period, p.settings.period).includes(
      "'=HYPERLINK",
    ),
  );
  assert.throws(() => accountBalanceReport(p, "2026-12", "2026-01"));
});
test("report opening balances roll forward from closed history", () => {
  const p = demoProject();
  p.accounts[1].active = false;
  const closed = closePeriod(p, p.settings.period),
    next = monthNext(p.settings.period);
  closed.settings.period = next;
  closed.payments.push({
    id: "pay-next",
    account_id: "a1",
    payment_date: next + "-05",
    entered_date: next + "-06",
    amount: "10.00",
    note: "",
  });
  const r = accountBalanceReport(closed, next, next);
  assert.equal(r.rows[0].opening, "1047.44");
  assert.equal(r.rows[0].paid, "10.00");
  assert.equal(
    r.rows[0].closing,
    (Number(r.rows[0].opening) + Number(r.rows[0].charges) - 10).toFixed(2),
  );
});

test("report exports preserve text identifiers and escape spreadsheet and HTML payloads", () => {
  const p = demoProject();
  p.accounts[0].number = "000012";
  p.accounts[0].payer_name = '=1+1 <img src=x onerror="test"> &';
  const xml = accountReportXML(p, p.settings.period, p.settings.period);
  assert(xml.includes('<Data ss:Type="String">000012</Data>'));
  assert(xml.includes('<Data ss:Type="Number">1047.44</Data>'));
  assert(!xml.includes("ss:Formula"));
  assert(xml.includes("&lt;img"));
  const html = accountReportHTML(p, p.settings.period, p.settings.period);
  assert(!html.includes("<img"));
  assert(html.includes("&lt;img"));
  assert(html.includes("000012"));
});

test("shared meters never become individual consumption and dated lifetimes are validated", () => {
  const p = withMeter();
  p.meters[0].scope = "shared";
  p.meters[0].account_id = "";
  assert(projectSchema.safeParse(p).success);
  assert.equal(physicalReadings(p, "a1", "water", p.settings.period).length, 0);
  const q = withMeter();
  q.meter_values[0].reading_date = q.settings.period + "-01";
  q.meters[0].installed_on = q.settings.period + "-02";
  assert(!projectSchema.safeParse(q).success);
});

test("inactive accounts retain genuine payments and adjustments without new service charges", () => {
  const p = demoProject();
  p.accounts[1].active = false;
  p.adjustments.push({
    id: "inactive-adjust",
    account_id: p.accounts[1].id,
    period: p.settings.period,
    amount: "5.00",
    note: "Correction",
  });
  p.payments.push({
    id: "inactive-pay",
    account_id: p.accounts[1].id,
    payment_date: p.settings.period + "-05",
    entered_date: p.settings.period + "-05",
    amount: "10.00",
    note: "",
  });
  const row = accountBalanceReport(p, p.settings.period, p.settings.period)
    .rows[1];
  assert.equal(row.charges, "0.00");
  assert.equal(row.adjustments, "5.00");
  assert.equal(row.paid, "10.00");
  assert.equal(row.closing, "120.50");
});

test("meter replacement requires the retired meter's final period reading", () => {
  const p = withMeter();
  p.meters[0].active = false;
  p.meters[0].retired_on = p.settings.period + "-15";
  p.meter_values[0].reading_date = p.settings.period + "-15";
  p.meter_values[0].kind = "final";
  p.meters.push({
    ...p.meters[0],
    id: "replacement",
    serial_number: "DEMO-NEW",
    active: true,
    installed_on: p.settings.period + "-15",
    retired_on: null,
    initial_value: "0",
  });
  p.meter_values.push({
    ...p.meter_values[0],
    id: "replacement-reading",
    meter_id: "replacement",
    reading_date: p.settings.period + "-28",
    kind: "regular",
    value: "5",
  });
  assert(projectSchema.safeParse(p).success);
  assert.equal(
    charges(p, p.accounts[0], p.settings.period).lines.find(
      (l) => l.service_id === "water",
    )?.quantity,
    "20",
  );
  p.meter_values = p.meter_values.filter((r) => r.meter_id === "replacement");
  assert.equal(
    physicalReadings(p, "a1", "water", p.settings.period)[0].warning,
    "missing",
  );
  assert(
    !charges(p, p.accounts[0], p.settings.period).lines.some(
      (l) => l.service_id === "water",
    ),
  );
});

test("incompatible meter units block automatic charges while an explicit volume remains separate", () => {
  const p = withMeter();
  p.meters[0].unit = "kWh";
  assert.equal(
    physicalReadings(p, "a1", "water", p.settings.period)[0].warning,
    "unit",
  );
  assert(
    !charges(p, p.accounts[0], p.settings.period).lines.some(
      (l) => l.service_id === "water",
    ),
  );
  p.quantities.push({
    id: "reviewed-volume",
    account_id: "a1",
    service_id: "water",
    period: p.settings.period,
    quantity: "15",
  });
  assert.equal(
    charges(p, p.accounts[0], p.settings.period).lines.find(
      (l) => l.service_id === "water",
    )?.quantity,
    "15",
  );
  p.quantities = [];
  p.meters[0].unit = "m3";
  assert.equal(
    physicalReadings(p, "a1", "water", p.settings.period)[0].warning,
    null,
  );
});
