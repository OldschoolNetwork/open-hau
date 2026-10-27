import {test} from "node:test";
import assert from "node:assert/strict";
import {demoProject,projectSchema} from "../src/model";
import {displayDate,displayPeriod,dateFormats,periodFormats} from "../src/date-format";
import {receipt} from "../src/receipt";
import {accountReportHTML} from "../src/report-exports";
import {statement} from "../src/engine";
test("date styles are localised calendar displays, never UTC-shifted storage conversions",()=>{
 const p=demoProject();p.settings.date_format="dmy-dot";assert.equal(displayDate("2026-10-26",p),"26.10.2026");
  p.settings.period_format="auto";assert.equal(displayPeriod("2026-10",p),"10.2026");p.settings.date_format="long";assert.equal(displayPeriod("2026-10",p,"ro"),"octombrie 2026");
 p.settings.date_format="mdy-slash";assert.equal(displayDate("2026-10-26",p),"10/26/2026");
 p.settings.date_format="long";assert.equal(displayDate("2026-10-26",p,"ru"),"26 октября 2026");assert.equal(displayDate("2026-10-26",p,"ro"),"26 octombrie 2026");assert.equal(displayDate("2026-10-26",p,"en"),"26 October 2026");assert(displayDate("2026-10-26",p,"both").includes(" / "));
 assert.equal(displayDate("2026-02-30",p),"2026-02-30");assert.equal(displayDate(null,p),"—");assert.equal(displayDate("2028-02-29",p,"en"),"29 February 2028");
 for(const style of dateFormats){p.settings.date_format=style;assert(displayDate("2026-10-26",p).length>0);}for(const style of periodFormats){p.settings.period_format=style;assert(displayPeriod("2026-10",p).length>0);}
});
test("date preferences round-trip and affect receipts and reports without changing balances or stored dates",()=>{
 const p=demoProject(),a=p.accounts[0],before=statement(p,a,p.settings.period),rates=JSON.stringify(p.tariffs);p.settings.date_format="long";p.settings.period_format="long";p.settings.receipt_language="en";
 const restored=projectSchema.parse(JSON.parse(JSON.stringify(p)));assert.equal(restored.settings.date_format,"long");assert(receipt(restored,a,"2026-10").includes("October 2026"));assert(accountReportHTML(restored,"2026-10","2026-10").includes("октябрь 2026"));assert.deepEqual(statement(p,a,p.settings.period),before);assert.equal(JSON.stringify(p.tariffs),rates);
 const older=demoProject() as any;delete older.settings.date_format;delete older.settings.period_format;assert.equal(projectSchema.parse(older).settings.date_format,"iso");
});
