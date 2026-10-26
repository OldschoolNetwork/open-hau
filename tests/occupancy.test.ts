import { test } from "node:test";
import assert from "node:assert/strict";
import {
  demoProject,
  projectSchema,
  type MonthlyOccupancy,
} from "../src/model";
import { monthlyPersons } from "../src/occupancy";
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
