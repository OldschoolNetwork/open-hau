import { test } from "node:test";
import assert from "node:assert/strict";
import { demoProject } from "../src/model";
import { addAverageTariff } from "../src/tariff-transitions";
import { charges } from "../src/engine";

test("manual transition price applies for one month then switches to the new service rate", () => {
  const p = demoProject();
  p.accounts[0].opening_period = "2026-01";
  p.tariffs = p.tariffs.filter(t => t.service_id !== "water");
  p.tariffs.push({id: "water-old", service_id: "water", effective_from: "2026-01-01", rate: "10"});
  for (const period of ["2026-09", "2026-10", "2026-11"])
    p.quantities.push({id: "quantity-" + period, account_id: "a1", service_id: "water", period, quantity: "2"});
  const next = addAverageTariff(p, "water", "2026-10", "12.3456", "15.6789");
  const water = (period: string) => charges(next, next.accounts[0], period).lines.find(l => l.service_id === "water");
  assert.equal(water("2026-09")?.rate, "10");
  assert.equal(water("2026-10")?.rate, "12.3456");
  assert.equal(water("2026-10")?.amount, "24.69");
  assert.equal(water("2026-11")?.rate, "15.6789");
  assert.equal(p.tariffs.some(t => t.effective_from === "2026-11-01"), false);
});

test("transition entries are atomic, preserve other services and reject collisions or locked history", () => {
  const p = demoProject();
  const before = JSON.stringify(p);
  assert.throws(() => addAverageTariff(p, "water", "2026-10", "-1", "2"));
  assert.equal(JSON.stringify(p), before);
  const next = addAverageTariff(p, "water", "2098-12", "1.5", "2");
  assert(next.tariffs.some(t => t.service_id === "water" && t.effective_from === "2099-01-01" && t.rate === "2"));
  assert.deepEqual(next.tariffs.filter(t => t.service_id !== "water"), p.tariffs.filter(t => t.service_id !== "water"));
  assert.throws(() => addAverageTariff(next, "water", "2098-12", "1.6", "3"));
  p.closed_periods.push("2099-02");
  assert.throws(() => addAverageTariff(p, "water", "2098-12", "1.5", "2"));
});
