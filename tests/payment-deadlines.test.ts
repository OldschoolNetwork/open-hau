import { test } from "node:test";
import assert from "node:assert/strict";
import { demoProject, projectSchema } from "../src/model";
import { paymentDeadline } from "../src/payment-deadlines";
import { receiptDocument } from "../src/receipt";
test("monthly payment date overrides general due day and stays month-specific", () => {
  const p = demoProject();
  p.payment_deadlines.push({
    period: p.settings.period,
    due_date: p.settings.period + "-31",
  });
  // Use October explicitly so the 31st is a real calendar date.
  p.payment_deadlines = [{ period: "2026-10", due_date: "2026-11-30" }];
  assert(projectSchema.safeParse(p).success);
  assert.equal(paymentDeadline(p, "2026-10"), "2026-11-30");
  assert.equal(paymentDeadline(p, "2026-11"), "2026-12-20");
  assert.equal(paymentDeadline(p, "2026-12"), "2027-01-20");
  assert(receiptDocument(p, [p.accounts[0]], "2026-10").includes("2026-11-30"));
  p.payment_deadlines = [];
  assert.equal(paymentDeadline(p, "2026-10"), "2026-11-20");
});
test("monthly deadlines validate calendar dates and survive JSON round trips", () => {
  const p = demoProject();
  p.payment_deadlines = [{ period: "2026-10", due_date: "2026-11-31" }];
  assert(!projectSchema.safeParse(p).success);
  p.payment_deadlines = [
    { period: "2026-10", due_date: "2026-11-30" },
    { period: "2026-10", due_date: "2026-11-28" },
  ];
  assert(!projectSchema.safeParse(p).success);
  p.payment_deadlines = [{ period: "2026-10", due_date: "2026-09-30" }];
  assert(!projectSchema.safeParse(p).success);
  p.payment_deadlines = [{ period: "2026-10", due_date: "2026-11-30" }];
  assert.equal(
    projectSchema.parse(JSON.parse(JSON.stringify(p))).payment_deadlines[0]
      .due_date,
    "2026-11-30",
  );
});
