import {test} from "node:test";
import assert from "node:assert/strict";
import {demoProject,projectSchema} from "../src/model";
import {accountBalanceReport} from "../src/reports";
import {serviceBalanceReport,UNALLOCATED_SERVICE,serviceReportCSV} from "../src/service-reports";
import {accountReportHTML,accountReportXML} from "../src/report-exports";
function fixture(){const p=demoProject();p.accounts=p.accounts.slice(0,1);p.accounts[0].opening_period="2026-09";p.accounts[0].opening_balance="10.00";p.closed_periods=["2026-09"];p.snapshots=[{account_id:"a1",period:"2026-09",lines:[{service_id:"water",name:p.services[0].name,unit:"m³",quantity:"2",rate:"20",amount:"40.00"},{service_id:"electricity",name:p.services[1].name,unit:"kWh",quantity:"10",rate:"3",amount:"30.00"}],adjustment:"2.00",total:"72.00"}];p.payments=[{id:"pay1",account_id:"a1",payment_date:"2026-09-20",entered_date:"2026-09-20",amount:"50.00",note:"DEMO"}];p.service_accounting={opening:[{account_id:"a1",service_id:"water",amount:"10.00"}],payments:[{payment_id:"pay1",service_id:"water",amount:"30.00"},{payment_id:"pay1",service_id:"electricity",amount:"20.00"}],adjustments:[{account_id:"a1",period:"2026-09",service_id:"electricity",amount:"2.00"}]};return p;}
test("service balances conserve every account total and preserve dated historical allocation",()=>{
  const p=fixture();assert(projectSchema.safeParse(p).success);
  const report=serviceBalanceReport(p,"2026-09","2026-09"),water=report.rows.find(r=>r.service_id==="water")!,power=report.rows.find(r=>r.service_id==="electricity")!;
  assert.equal(water.closing,"20.00");assert.equal(power.closing,"12.00");
  assert.deepEqual(report.totals,accountBalanceReport(p,"2026-09","2026-09").totals);
  assert.equal(report.rows.some(r=>r.service_id===UNALLOCATED_SERVICE),false);
  const next=serviceBalanceReport(p,"2026-10","2026-10");assert.equal(next.rows.find(r=>r.service_id==="water")?.opening,"20.00");assert.equal(next.rows.find(r=>r.service_id==="electricity")?.opening,"12.00");
  assert.equal(serviceBalanceReport(p,"2026-09","2026-09","water").totals.closing,"20.00");
});
test("unallocated values stay visible and are never silently spread over services",()=>{
  const p=fixture();p.service_accounting={opening:[],payments:[],adjustments:[]};
  const report=serviceBalanceReport(p,"2026-09","2026-09"),unknown=report.rows.find(r=>r.service_id===UNALLOCATED_SERVICE)!;
  assert.equal(unknown.opening,"10.00");assert.equal(unknown.paid,"50.00");assert.equal(unknown.adjustments,"2.00");assert.equal(unknown.closing,"-38.00");assert(unknown.warnings.length);
  assert.deepEqual(report.totals,accountBalanceReport(p,"2026-09","2026-09").totals);
});
test("historical reallocations may have signed service amounts while their net matches the payment",()=>{
  const p=fixture();p.service_accounting.payments[0].amount="60.00";p.service_accounting.payments[1].amount="-10.00";
  assert(projectSchema.safeParse(p).success);
  assert.equal(serviceBalanceReport(p,"2026-09","2026-09").rows.find(r=>r.service_id==="electricity")?.paid,"-10.00");
  p.service_accounting.payments[0].amount="61.00";assert(!projectSchema.safeParse(p).success);
  p.service_accounting.payments[0].amount="60.00";p.service_accounting.payments.push({...p.service_accounting.payments[0]});assert(!projectSchema.safeParse(p).success);
});
test("accounts opened inside a report range retain their own initial balance",()=>{
  const p=fixture();p.accounts[0].opening_period="2026-10";p.snapshots=[];p.closed_periods=[];p.payments=[];p.service_accounting.payments=[];p.service_accounting.adjustments=[];
  const general=accountBalanceReport(p,"2026-09","2026-10"),service=serviceBalanceReport(p,"2026-09","2026-10");
  assert.equal(general.totals.opening,"10.00");assert.deepEqual(service.totals,general.totals);
});
test("service exports contain the service column and keep amounts numeric in spreadsheets",()=>{
  const p=fixture();const xml=accountReportXML(p,"2026-09","2026-09","service");
  assert(xml.includes('<Data ss:Type="Number">20.00</Data>'));
  assert(serviceReportCSV(p,"2026-09","2026-09").includes("Вода и канализация"));
  assert(accountReportHTML(p,"2026-09","2026-09","service").includes("Оборотно-сальдовая ведомость по услугам"));
  const old=demoProject() as any;delete old.service_accounting;assert.deepEqual(projectSchema.parse(old).service_accounting.payments,[]);
});
