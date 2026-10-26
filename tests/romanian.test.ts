import { test } from "node:test";
import assert from "node:assert/strict";
import { demoProject } from "../src/model";
import { charges, closePeriod, reopenPeriod } from "../src/engine";
import { validationText, issueText } from "../src/validation-language";
test("Romanian calculation warnings and period errors use Romanian", () => {
  const p = demoProject();
  p.settings.language = "ro";
  p.meter_readings = [];
  assert(
    charges(p, p.accounts[0], p.settings.period).warnings.every(
      (w) => !/[А-Яа-яЁё]/.test(w),
    ),
  );
  assert.throws(
    () => closePeriod(p, p.settings.period),
    (e) =>
      e instanceof Error &&
      e.message.includes("Completați") &&
      !/[А-Яа-яЁё]/.test(e.message),
  );
  p.closed_periods = ["2099-01"];
  assert.throws(
    () => reopenPeriod(p, p.settings.period),
    (e) => e instanceof Error && e.message.includes("Redeschideți"),
  );
});
test("Romanian validation explains meter and occupancy problems", () => {
  assert(
    validationText("Cumulative occupancy cannot decrease", "ro").includes(
      "cumulativă",
    ),
  );
  assert(
    validationText("Ссылка на неизвестный счёт", "ro").includes(
      "cont necunoscut",
    ),
  );
  assert.equal(
    issueText(
      { code: "invalid_type", message: "English parser message" },
      "ro",
    ),
    "Verificați valoarea și formatul câmpului",
  );
});
