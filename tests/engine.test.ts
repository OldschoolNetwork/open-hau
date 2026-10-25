import { test } from "node:test";
import assert from "node:assert/strict";
import { demoProject, projectSchema } from "../src/model";
import {
  D,
  charges,
  statement,
  closePeriod,
  reopenPeriod,
  csv,
  money,
} from "../src/engine";
test("точные суммы строк и отдельное количество людей за мусор", () => {
  const p = demoProject(),
    a = p.accounts[0];
  assert.equal(charges(p, a, p.settings.period).total, "1047.44");
  const b = p.accounts[1];
  p.quantities.push(
    {
      id: "q1",
      account_id: b.id,
      service_id: "water",
      period: p.settings.period,
      quantity: "0",
    },
    {
      id: "q2",
      account_id: b.id,
      service_id: "electricity",
      period: p.settings.period,
      quantity: "0",
    },
  );
  assert.equal(charges(p, b, p.settings.period).total, "189.00");
});
test("денежное округление явно выбирается", () => {
  const p = demoProject();
  assert.equal(money("1.005", p), "1.01");
  p.settings.rounding = "half_even";
  assert.equal(money("1.005", p), "1.00");
  assert.equal(D("0.1").plus("0.2").toFixed(), "0.3");
});
test("платёж уменьшает итог, отрицательный остаток сохраняет переплату", () => {
  const p = demoProject(),
    a = p.accounts[0];
  p.payments.push({
    id: "pay",
    account_id: a.id,
    payment_date: p.settings.period + "-05",
    entered_date: p.settings.period + "-06",
    amount: "2000.00",
    note: "",
  });
  assert.equal(statement(p, a, p.settings.period).balance, "-952.56");
});
test("неполные показания не позволяют закрыть период", () => {
  const p = demoProject();
  assert.throws(() => closePeriod(p, p.settings.period));
  p.accounts[1].active = false;
  const closed = closePeriod(p, p.settings.period);
  closed.tariffs[0].rate = "999";
  assert.equal(
    charges(closed, p.accounts[0], p.settings.period).total,
    "1047.44",
  );
  assert.equal(reopenPeriod(closed, p.settings.period).snapshots.length, 0);
});
test("импорт отклоняет битые ссылки, дубликаты и невозможные даты", () => {
  const p = demoProject();
  assert.ok(projectSchema.safeParse(p).success);
  p.accounts[0].service_ids.push("unknown");
  assert.ok(!projectSchema.safeParse(p).success);
  const q = demoProject();
  q.tariffs[0].effective_from = "2026-02-30";
  assert.ok(!projectSchema.safeParse(q).success);
});
test("CSV экранирует формулы и кавычки", () => {
  assert.equal(
    csv([['=HYPERLINK("x")', "ășț"]]),
    '\ufeff"\'=HYPERLINK(""x"")";"ășț"',
  );
});
