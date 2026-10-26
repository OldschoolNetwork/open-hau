import { test } from "node:test";
import assert from "node:assert/strict";
import { demoProject, projectSchema, type TariffDocument } from "../src/model";
import { saveTariffDocument } from "../src/tariff-documents";
const document = (): TariffDocument => ({id: "doc-demo", number: "DEMO-1", date: "2098-09-20", comment: "Demonstration", state: "draft", rows: [
  {id: "one", service_id: "water", effective_from: "2098-10-01", rate: "10.1234", tariff_id: null},
  {id: "two", service_id: "electricity", effective_from: "2098-10-01", rate: "2.3456", tariff_id: null},
]});
test("tariff documents retain metadata and apply multiple independent services atomically", () => {
  const p = demoProject(), doc = document();
  const draft = saveTariffDocument(p, doc);
  assert.deepEqual(draft.tariffs, p.tariffs);
  assert.equal(p.tariff_documents.length, 0);
  const applied = saveTariffDocument(draft, doc, true);
  assert.equal(applied.tariffs.length, p.tariffs.length + 2);
  assert.equal(applied.tariff_documents[0].state, "applied");
  assert.equal(applied.tariff_documents[0].comment, doc.comment);
  assert(projectSchema.safeParse(JSON.parse(JSON.stringify(applied))).success);
  assert.throws(() => saveTariffDocument(applied, doc));
  const tampered = structuredClone(applied);
  tampered.tariffs.find(t => t.id === applied.tariff_documents[0].rows[0].tariff_id)!.rate = "99";
  assert(!projectSchema.safeParse(tampered).success);
});
test("failed multi-service application leaves the original rates and draft unchanged", () => {
  const p = demoProject(), doc = document();
  p.tariffs.push({id: "existing", service_id: "electricity", effective_from: "2098-10-01", rate: "3"});
  const before = JSON.stringify(p);
  assert.throws(() => saveTariffDocument(p, doc, true));
  assert.equal(JSON.stringify(p), before);
  p.tariffs.pop(); p.closed_periods.push("2098-10");
  assert.throws(() => saveTariffDocument(p, doc, true));
  assert.equal(saveTariffDocument(p, doc).tariff_documents[0].state, "draft");
});
test("old format 2 projects get an empty document journal and invalid document rows are rejected", () => {
  const old = demoProject() as any;
  delete old.tariff_documents;
  assert.deepEqual(projectSchema.parse(old).tariff_documents, []);
  const doc = document();
  doc.rows.push({...doc.rows[0], id: "duplicate"});
  assert.throws(() => saveTariffDocument(demoProject(), doc));
});
