import { test } from "node:test";
import assert from "node:assert/strict";
import {
  demoProject,
  projectSchema,
  type MonthlyOccupancy,
} from "../src/model";
import { monthlyPersons, setAccountMonthlyPersons } from "../src/occupancy";
import { charges } from "../src/engine";
function row(
  period: string,
  previous: number,
  current: number,
  apartment = "",
): MonthlyOccupancy {
  return {
    id: "occupancy",
    account_id: "a1",
    apartment,
    period,
    mode: "cumulative",
    previous,
    current,
    notes: "",
  };
}
test("account card monthly count changes charges without rewriting earlier months or defaults", () => {
  const original = demoProject();
  const september = setAccountMonthlyPersons(original, "a1", "2026-09", 3);
  const october = setAccountMonthlyPersons(september, "a1", "2026-10", 4);
  assert(projectSchema.safeParse(october).success);
  assert.equal(monthlyPersons(october, october.accounts[0], "2026-09").persons, 3);
  assert.equal(monthlyPersons(october, october.accounts[0], "2026-10").persons, 4);
  assert.equal(charges(october, october.accounts[0], "2026-10").lines.find(l => l.service_id === "waste")?.quantity, "4");
  assert.equal(october.accounts[0].waste_charge_persons, original.accounts[0].waste_charge_persons);
  assert.equal(original.monthly_occupancy.length, 0);
  const empty = setAccountMonthlyPersons(october, "a1", "2026-10", 0);
  assert.equal(monthlyPersons(empty, empty.accounts[0], "2026-10").persons, 0);
  october.closed_periods.push("2026-10");
  assert.throws(() => setAccountMonthlyPersons(october, "a1", "2026-10", 2));
  assert.throws(() => setAccountMonthlyPersons(original, "a1", "2026-10", 1.5));
});
test("account total replaces only that month's apartment detail", () => {
  const p = demoProject();
  p.monthly_occupancy = [
    {...row("2026-09", 0, 3, "2"), id: "old"},
    {...row("2026-10", 0, 2, "2"), id: "one"},
    {...row("2026-10", 0, 1, "6"), id: "two"},
  ];
  const next = setAccountMonthlyPersons(p, "a1", "2026-10", 4);
  assert.equal(next.monthly_occupancy.length, 2);
  assert.deepEqual(next.monthly_occupancy[0], p.monthly_occupancy[0]);
  assert.equal(monthlyPersons(next, next.accounts[0], "2026-10").persons, 4);
});
test("monthly waste count supports cumulative 3 to 7 as four residents", () => {
  const p = demoProject();
  p.monthly_occupancy.push(row(p.settings.period, 3, 7));
  assert(projectSchema.safeParse(p).success);
  assert.equal(monthlyPersons(p, p.accounts[0], p.settings.period).persons, 4);
  const line = charges(p, p.accounts[0], p.settings.period).lines.find(
    (l) => l.service_id === "waste",
  );
  assert.equal(line?.quantity, "4");
  assert.equal(line?.amount, "70.00");
  assert.equal(p.accounts[0].waste_charge_persons, 1);
  assert.equal(monthlyPersons(p, p.accounts[0], "2099-01").persons, null);
});
test("monthly apartment counts are summed and incomplete apartment coverage is flagged", () => {
  const p = demoProject();
  p.monthly_occupancy.push({
    ...row(p.settings.period, 0, 3, "2"),
    mode: "direct",
  });
  assert.equal(
    monthlyPersons(p, p.accounts[0], p.settings.period).persons,
    null,
  );
  assert(charges(p, p.accounts[0], p.settings.period).warnings.length);
  p.monthly_occupancy.push({
    ...row(p.settings.period, 0, 1, "6"),
    id: "second",
    mode: "direct",
  });
  assert.equal(monthlyPersons(p, p.accounts[0], p.settings.period).persons, 4);
  p.monthly_occupancy[1].current = 0;
  assert.equal(monthlyPersons(p, p.accounts[0], p.settings.period).persons, 3);
});
test("occupancy validates duplicate/mixed records and preserves old schema 2 documents", () => {
  const p = demoProject();
  p.monthly_occupancy.push(row(p.settings.period, 7, 3));
  assert(!projectSchema.safeParse(p).success);
  p.monthly_occupancy = [
    row(p.settings.period, 3, 7),
    { ...row(p.settings.period, 0, 2, "2"), id: "detail" },
  ];
  assert(!projectSchema.safeParse(p).success);
  const old = demoProject() as any;
  delete old.monthly_occupancy;
  assert.deepEqual(projectSchema.parse(old).monthly_occupancy, []);
});
