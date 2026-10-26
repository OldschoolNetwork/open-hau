import { test } from "node:test";
import assert from "node:assert/strict";
import { demoProject, projectSchema, type CashTransaction } from "../src/model";
import {
  applyCashTransaction,
  saveTreasuryItem,
  setTreasuryLock,
  treasuryReport,
  treasuryCSV,
} from "../src/treasury";
import { statement } from "../src/engine";
function fixture() {
  const p = demoProject();
  p.treasury.wallets = [
    {
      id: "bank-demo",
      name: "Demo bank",
      kind: "bank",
      opening_date: "2026-10-01",
      opening_balance: "1000.00",
      active: true,
    },
    {
      id: "cash-demo",
      name: "Demo cash",
      kind: "cash",
      opening_date: "2026-10-01",
      opening_balance: "50.00",
      active: true,
    },
  ];
  p.treasury.funds = [
    {
      id: "repairs",
      name: "Repairs",
      opening_date: "2026-10-01",
      opening_balance: "200.00",
      active: true,
    },
  ];
  return p;
}
const income = (id = "income"): CashTransaction => ({
  id,
  kind: "income",
  date: "2026-10-10",
  amount: "100.00",
  wallet_id: "bank-demo",
  fund_id: "repairs",
  category: "Contributions",
  counterparty: "Demo",
  reference: "DEMO",
  notes: "",
  linked_payment_ids: [],
});
test("treasury keeps real cash, restricted funds, transfers and resident debt separate", () => {
  const source = fixture(),
    before = statement(source, source.accounts[0], source.settings.period);
  let p = applyCashTransaction(source, income());
  p = applyCashTransaction(p, {
    id: "expense",
    kind: "expense",
    date: "2026-10-11",
    amount: "25.00",
    wallet_id: "bank-demo",
    fund_id: "repairs",
    category: "Repairs",
    counterparty: "Demo supplier",
    reference: "DEMO-2",
    notes: "",
  });
  p = applyCashTransaction(p, {
    id: "transfer",
    kind: "transfer",
    date: "2026-10-12",
    amount: "40.00",
    from_wallet_id: "bank-demo",
    to_wallet_id: "cash-demo",
    reference: "DEMO-3",
    notes: "",
  });
  p = applyCashTransaction(p, {
    id: "earmark",
    kind: "fund_transfer",
    date: "2026-10-13",
    amount: "30.00",
    from_fund_id: "",
    to_fund_id: "repairs",
    reference: "DEMO-4",
    notes: "",
  });
  const r = treasuryReport(p, "2026-10-01", "2026-10-31");
  assert.equal(r.cash, "1125.00");
  assert.equal(r.reserved, "305.00");
  assert.equal(r.unassigned, "820.00");
  assert.equal(r.income, "100.00");
  assert.equal(r.expense, "25.00");
  assert.equal(r.net, "75.00");
  assert.equal(r.wallets[0].closing, "1035.00");
  assert.equal(r.wallets[1].closing, "90.00");
  assert.equal(r.wallets[0].introduced, "1000.00");
  assert.equal(r.wallets[0].movement, "35.00");
  assert.deepEqual(statement(p, p.accounts[0], p.settings.period), before);
  assert.equal(source.treasury.transactions.length, 0);
  const following = treasuryReport(p, "2026-11-01", "2026-11-30");
  assert.equal(following.wallets[0].opening, "1035.00");
  assert.equal(following.income, "0.00");
});
test("earmarking never creates money and an unfunded reserve is visible", () => {
  const p = fixture();
  p.treasury.funds[0].opening_balance = "2000.00";
  const r = treasuryReport(p, "2026-10-01", "2026-10-31");
  assert.equal(r.cash, "1050.00");
  assert.equal(r.unassigned, "-950.00");
  assert(r.warnings.some((w) => w.kind === "unassigned"));
  assert.throws(() => treasuryReport(p, "2026-02-31", "2026-03-01"));
});
test("payment matching is explicit, exact and cannot count the same resident receipt twice", () => {
  const p = fixture();
  p.payments.push({
    id: "resident-demo",
    account_id: "a1",
    payment_date: "2026-10-09",
    entered_date: "2026-10-09",
    amount: "100.00",
    note: "DEMO",
  });
  const tx = income();
  if (tx.kind !== "income") throw Error("fixture");
  tx.linked_payment_ids = ["resident-demo"];
  const next = applyCashTransaction(p, tx);
  assert.equal(next.payments.length, p.payments.length);
  assert.throws(() => applyCashTransaction(next, { ...tx, id: "duplicate" }));
  assert.throws(() => applyCashTransaction(p, { ...tx, amount: "99.99" }));
  assert.throws(() => applyCashTransaction(p, { ...tx, amount: "0.001" }));
});
test("locked ledger protects dates and used opening balances while names remain editable", () => {
  const p = applyCashTransaction(fixture(), income()),
    locked = setTreasuryLock(p, "2026-10-31");
  assert.throws(() => applyCashTransaction(locked, income("backdated")));
  assert.throws(() =>
    applyCashTransaction(locked, { ...income(), date: "2026-11-01" }),
  );
  assert.throws(() =>
    saveTreasuryItem(p, "wallets", {
      ...p.treasury.wallets[0],
      opening_balance: "999.00",
    }),
  );
  const renamed = saveTreasuryItem(locked, "wallets", {
    ...locked.treasury.wallets[0],
    name: "Renamed demo",
  });
  assert.equal(renamed.treasury.wallets[0].name, "Renamed demo");
  assert.equal(
    applyCashTransaction(locked, { ...income("new"), date: "2026-11-01" })
      .treasury.transactions.length,
    2,
  );
  assert.throws(() =>
    saveTreasuryItem(locked, "funds", {
      id: "past",
      name: "Past",
      opening_date: "2026-10-01",
      opening_balance: "10",
      active: true,
    }),
  );
});
test("treasury imports default safely and exports account and fund names with formula escaping", () => {
  const old = demoProject() as any;
  delete old.treasury;
  assert.equal(projectSchema.parse(old).treasury.transactions.length, 0);
  const p = fixture();
  p.treasury.wallets[0].name = "=DEMO()";
  const result = treasuryCSV(
    applyCashTransaction(p, income()),
    "2026-10-01",
    "2026-10-31",
  );
  assert(result.includes("'=DEMO()"));
  assert(result.includes("Repairs"));
  const invalid = income();
  if (invalid.kind !== "income") throw Error("fixture");
  invalid.wallet_id = "missing";
  assert.throws(() => applyCashTransaction(p, invalid));
});
