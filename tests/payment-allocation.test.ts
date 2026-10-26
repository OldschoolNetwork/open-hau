import {test} from "node:test";
import assert from "node:assert/strict";
import {demoProject,projectSchema} from "../src/model";
import {allocatePayment,paymentServiceDebts,previousPaymentMonth} from "../src/payment-allocation";
import {D} from "../src/engine";
const p=demoProject(),debts=[{service_id:"water",debt:"60.00"},{service_id:"electricity",debt:"30.00"},{service_id:"waste",debt:"10.00"}];
test("payments split by positive debt, preserve cents and place only excess on the designated service",()=>{
  const rows=allocatePayment(p,debts,"50.00","waste");assert.deepEqual(rows.map(r=>r.amount),["30.00","15.00","5.00"]);
  const excess=allocatePayment(p,debts,"120.00","waste");assert.deepEqual(excess.map(r=>r.amount),["60.00","30.00","30.00"]);
  for(const amount of ["0.01","0.02","0.04","99.99"]){const shares=allocatePayment(p,debts,amount,"waste");assert(shares.reduce((s,r)=>s.plus(r.amount),D(0)).eq(amount));}
  const credit=allocatePayment(p,[...debts,{service_id:"other",debt:"-100.00"}],"50.00","waste");assert.equal(credit.find(r=>r.service_id==="other")?.amount,"0.00");
});
test("manual maintenance share changes the remaining proportional split without changing the receipt total",()=>{
  assert.deepEqual(allocatePayment(p,debts,"50.00","waste","20.00").map(r=>r.amount),["20.00","10.00","20.00"]);
  assert.deepEqual(allocatePayment(p,debts,"80.00","waste","-10.00").map(r=>r.amount),["60.00","30.00","-10.00"]);
  assert.throws(()=>allocatePayment(p,debts,"120.00","waste","10.00"));
  assert.throws(()=>allocatePayment(p,debts,"1.001","waste"));
  assert.deepEqual(allocatePayment(p,[],"25.00","waste"),[{service_id:"waste",amount:"25.00"}]);
});
test("payment debt respects the billing month, later receipts and exclusion of the edited payment",()=>{
  const q=demoProject();q.accounts=q.accounts.slice(0,1);q.accounts[0].opening_period="2026-09";q.accounts[0].opening_balance="0.00";q.closed_periods=["2026-09"];
  q.snapshots=[{account_id:"a1",period:"2026-09",lines:[{service_id:"water",name:q.services[0].name,unit:"m³",quantity:"5",rate:"20",amount:"100.00"}],adjustment:"0.00",total:"100.00"}];
  q.payments=[{id:"previous",account_id:"a1",payment_date:"2026-10-03",entered_date:"2026-10-03",amount:"30.00",note:""},{id:"future",account_id:"a1",payment_date:"2026-10-22",entered_date:"2026-10-22",amount:"50.00",note:""}];
  q.service_accounting.payments=q.payments.map(pay=>({payment_id:pay.id,service_id:"water",amount:pay.amount}));
  assert.equal(paymentServiceDebts(q,"a1","2026-09","2026-10-10").find(r=>r.service_id==="water")?.debt,"70.00");
  assert.equal(paymentServiceDebts(q,"a1","2026-09","2026-10-10","previous").find(r=>r.service_id==="water")?.debt,"100.00");
  q.service_accounting.payments=[];assert.throws(()=>paymentServiceDebts(q,"a1","2026-09","2026-10-10"));
  assert.equal(previousPaymentMonth("2026-01-05"),"2025-12");
  const payment=q.payments[0];payment.allocation_basis="2026-09";payment.allocation_balancing_service_id="maintenance";payment.allocation_manual_amount="-10.00";
  const restored=projectSchema.parse(JSON.parse(JSON.stringify(q))).payments[0];assert.equal(restored.allocation_basis,"2026-09");assert.equal(restored.allocation_manual_amount,"-10.00");
  payment.allocation_basis="2026-11";assert.equal(projectSchema.safeParse(q).success,false);
});
