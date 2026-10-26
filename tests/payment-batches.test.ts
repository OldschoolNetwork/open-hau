import {test} from "node:test";
import assert from "node:assert/strict";
import {demoProject,projectSchema,type PaymentBatch} from "../src/model";
import {savePaymentBatch} from "../src/payment-batches";
function fixture(){const p=demoProject();for(const a of p.accounts){a.opening_period="2026-09";a.opening_balance="0.00";}p.closed_periods=["2026-09"];p.snapshots=p.accounts.map(a=>({account_id:a.id,period:"2026-09",lines:[{service_id:"water",name:p.services[0].name,unit:"m³",quantity:"3",rate:"20",amount:"60.00"},{service_id:"maintenance",name:p.services[3].name,unit:"",quantity:"1",rate:"40",amount:"40.00"}],adjustment:"0.00",total:"100.00"}));
const b:PaymentBatch={id:"demo-batch",number:"DEMO-1",date:"2026-10-20",billing_through:"2026-09",balancing_service_id:"maintenance",method:"Bank",comment:"Fictional batch",state:"draft",rows:p.accounts.map((a,i)=>({id:"row-"+i,account_id:a.id,amount:"50.00",manual_maintenance:null,payment_id:null}))};return {p,b};}
test("batch drafts create no payments and posting creates exact linked service shares once",()=>{
 const {p,b}=fixture(),original=JSON.stringify(p),draft=savePaymentBatch(p,b);assert.equal(draft.payments.length,0);assert.equal(draft.payment_batches[0].state,"draft");
 const posted=savePaymentBatch(draft,b,true);assert.equal(posted.payments.length,2);assert.equal(posted.payment_batches[0].state,"applied");const nonzero=posted.service_accounting.payments.filter(r=>r.amount!=="0.00");assert.equal(nonzero.length,4);assert.deepEqual(nonzero.map(r=>r.amount),["30.00","20.00","30.00","20.00"]);assert.equal(JSON.stringify(p),original);
 assert.throws(()=>savePaymentBatch(posted,b,true));assert(projectSchema.safeParse(JSON.parse(JSON.stringify(posted))).success);
});
test("a failed later batch row never posts earlier rows, and duplicates are rejected",()=>{
 const {p,b}=fixture(),before=JSON.stringify(p);b.rows[1].manual_maintenance="60.00";assert.throws(()=>savePaymentBatch(p,b,true));assert.equal(JSON.stringify(p),before);
 b.rows[1].manual_maintenance=null;b.rows[1].account_id=b.rows[0].account_id;assert.throws(()=>savePaymentBatch(p,b,true));
});
test("zero rows stay documentary without receipts and closed periods prevent posting",()=>{
 const {p,b}=fixture();b.rows[1].amount="0.00";const posted=savePaymentBatch(p,b,true);assert.equal(posted.payments.length,1);assert.equal(posted.payment_batches[0].rows[1].payment_id,null);
 p.closed_periods.push("2026-10");assert.throws(()=>savePaymentBatch(p,b,true));
});
test("applied documents reject changed receipts and missing service allocations",()=>{
 const {p,b}=fixture(),posted=savePaymentBatch(p,b,true);posted.payments[0].amount="51.00";assert(!projectSchema.safeParse(posted).success);
 posted.payments[0].amount="50.00";posted.service_accounting.payments=posted.service_accounting.payments.filter((r,i)=>i!==posted.service_accounting.payments.findIndex(s=>s.amount==="30.00"));assert(!projectSchema.safeParse(posted).success);
 const older=demoProject() as any;delete older.payment_batches;assert.deepEqual(projectSchema.parse(older).payment_batches,[]);
});
