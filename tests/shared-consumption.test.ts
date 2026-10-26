import { test } from "node:test";
import assert from "node:assert/strict";
import Decimal from "decimal.js";
import { demoProject, projectSchema, type SharedGroup } from "../src/model";
import { equalShares, sharedDistribution } from "../src/shared-consumption";
import { charges } from "../src/engine";
function fixture() {
  const p = demoProject(),
    period = p.settings.period;
  for (const [id, scope, account, value] of [
    ["master", "shared", "", "50"],
    ["first", "individual", "a1", "10"],
    ["second", "individual", "a2", "20"],
  ] as const) {
    p.meters.push({
      id,
      scope,
      account_id: account,
      service_id: "water",
      label: id,
      serial_number: id,
      unit: "m³",
      active: true,
      installed_on: period + "-01",
      retired_on: null,
      initial_value: "0",
    });
    p.meter_values.push({
      id: "v-" + id,
      meter_id: id,
      period,
      reading_date: period + "-28",
      value,
      kind: "regular",
      notes: "",
    });
  }
  const g: SharedGroup = {
    id: "group",
    name: "Fictional water network",
    shared_meter_id: "master",
    individual_meter_ids: ["first", "second"],
    effective_from: period,
    effective_to: null,
    precision: 4,
    allow_negative: false,
    exclusions: [],
  };
  p.shared_groups.push(g);
  return { p, g, period };
}
test("equal allocation conserves totals and uses account count rather than meter count", () => {
  const ids = Array.from(
    { length: 51 },
    (_, i) => "account-" + String(i).padStart(3, "0"),
  );
  const amounts = [...equalShares("20", ids, 4).values()].map(
    (x) => new Decimal(x),
  );
  assert(amounts.reduce((a, b) => a.plus(b), new Decimal(0)).eq(20));
  assert(
    new Decimal(Decimal.max(...amounts))
      .minus(Decimal.min(...amounts))
      .lte("0.0001"),
  );
  const remaining = [...equalShares("20", ids.slice(3), 4).values()];
  assert.equal(remaining.length, 48);
  assert(remaining.reduce((a, b) => a.plus(b), new Decimal(0)).eq(20));
});
test("exempt consumers remain in subtraction but do not receive a difference share", () => {
  const { p, g, period } = fixture();
  assert(projectSchema.safeParse(p).success);
  let r = sharedDistribution(p, g, period);
  assert.equal(r.difference, "20");
  assert.deepEqual(
    r.rows.map((x) => x.share),
    ["10.0000", "10.0000"],
  );
  g.exclusions.push({
    period,
    account_ids: ["a1"],
    notes: "Monthly exception",
  });
  r = sharedDistribution(p, g, period);
  assert.equal(r.individual, "30");
  assert.equal(r.participants, 1);
  assert.equal(r.rows.find((x) => x.account_id === "a1")?.share, "0");
  assert.equal(r.rows.find((x) => x.account_id === "a2")?.share, "20.0000");
  assert.equal(
    charges(p, p.accounts[1], period).lines.find((x) =>
      x.name.ru.includes("общая разница"),
    )?.quantity,
    "20.0000",
  );
});
test("exceptions are month-specific and multiple meters on one account receive one share", () => {
  const { p, g, period } = fixture();
  p.meters[2].account_id = "a1";
  const r = sharedDistribution(p, g, period);
  assert.equal(r.participants, 1);
  assert.equal(r.rows[0].share, "20.0000");
  g.exclusions.push({
    period: "2000-01",
    account_ids: ["a1"],
    notes: "Old exception",
  });
  assert.equal(sharedDistribution(p, g, period).participants, 1);
});
test("missing readings, all exceptions and unreviewed negative discrepancies block allocation", () => {
  const { p, g, period } = fixture();
  g.exclusions.push({ period, account_ids: ["a1", "a2"], notes: "" });
  assert(!sharedDistribution(p, g, period).ready);
  g.exclusions = [];
  p.meter_values[0].value = "20";
  assert(!sharedDistribution(p, g, period).ready);
  g.allow_negative = true;
  const r = sharedDistribution(p, g, period);
  assert(r.ready);
  assert.equal(r.difference, "-10");
  p.meter_values = p.meter_values.filter((v) => v.meter_id !== "second");
  assert(!sharedDistribution(p, g, period).ready);
});
test("invalid links and overlapping shared groups are rejected", () => {
  const { p, g } = fixture();
  p.shared_groups.push({ ...g, id: "overlap" });
  assert(!projectSchema.safeParse(p).success);
  p.shared_groups = [g];
  g.individual_meter_ids = ["master"];
  assert(!projectSchema.safeParse(p).success);
});
