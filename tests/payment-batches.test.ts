import {test} from "node:test";
import assert from "node:assert/strict";
import {demoProject,projectSchema,type PaymentBatch} from "../src/model";
import {savePaymentBatch,unpostPaymentBatch,markPaymentBatch,applyPaymentDetail} from "../src/payment-batches";
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

test("unposting removes only linked receipts, restores a draft and can be reposted without duplicates",()=>{
 const {p,b}=fixture(),posted=savePaymentBatch(p,b,true),original=JSON.stringify(posted),restored=unpostPaymentBatch(posted,b.id);
 assert.equal(restored.payments.length,0);assert.equal(restored.service_accounting.payments.length,0);assert(restored.payment_batches[0].rows.every(r=>r.payment_id===null));assert.equal(JSON.stringify(posted),original);
 const again=savePaymentBatch(restored,restored.payment_batches[0],true);assert.equal(again.payments.length,2);assert.equal(again.service_accounting.payments.reduce((sum,s)=>sum+Number(s.amount),0),100);
 const closed=structuredClone(posted);closed.closed_periods.push('2026-10');assert.throws(()=>unpostPaymentBatch(closed,b.id));
 const later=structuredClone(posted);later.payments.push({id:'later',account_id:b.rows[0].account_id,payment_date:'2026-10-21',entered_date:'2026-10-21',amount:'1.00',note:''});assert.throws(()=>unpostPaymentBatch(later,b.id));
});
test("manual details change only maintenance, reject stale rows and preserve the document until accepted",()=>{
 const {p,b}=fixture(),expected=structuredClone(b),changed=applyPaymentDetail(p,b,expected,b.rows[0].id,'50.00','30.00');
 assert.equal(changed.rows[0].manual_maintenance,'30.00');assert.equal(b.rows[0].manual_maintenance,null);
 const posted=savePaymentBatch(p,changed,true),shares=posted.service_accounting.payments.filter(s=>s.payment_id===posted.payment_batches[0].rows[0].payment_id);
 assert.deepEqual(shares.filter(s=>s.amount!=='0.00').map(s=>[s.service_id,s.amount]),[['water','20.00'],['maintenance','30.00']]);
 assert.throws(()=>applyPaymentDetail(p,changed,expected,b.rows[0].id,'50.00',null));
 assert.throws(()=>applyPaymentDetail(p,b,expected,b.rows[0].id,'0.00','2.00'));
 assert.throws(()=>applyPaymentDetail(p,b,expected,b.rows[0].id,'x',null));
});
test("marked drafts cannot be posted and only marked drafts can be purged",async()=>{
 const {markedDeletionPlan,purgeMarkedRecords}=await import('../src/marked-records');const {p,b}=fixture(),saved=savePaymentBatch(p,b),marked=markPaymentBatch(saved,b.id);
 assert.throws(()=>savePaymentBatch(marked,marked.payment_batches[0],true));assert.equal(markedDeletionPlan(marked,['payment-batches:'+b.id])[0].references.length,0);
 const purged=purgeMarkedRecords(marked,['payment-batches:'+b.id]);assert.equal(purged.payment_batches.length,0);assert.deepEqual(purged.snapshots,p.snapshots);assert.equal(marked.payment_batches.length,1);
 const posted=savePaymentBatch(p,b,true);assert.throws(()=>markPaymentBatch(posted,b.id));
});

test('bank-linked receipts block unposting and imported headers remain immutable',()=>{
 const {p,b}=fixture(),posted=savePaymentBatch(p,b,true);
 posted.treasury.wallets=[{id:'bank-demo',name:'Example bank',kind:'bank',opening_date:'2026-10-01',opening_balance:'0.00',active:true}];
 posted.treasury.funds=[{id:'fund-demo',name:'Example fund',opening_date:'2026-10-01',opening_balance:'0.00',active:true}];
 posted.treasury.transactions=[{id:'income-demo',kind:'income',date:'2026-10-20',wallet_id:'bank-demo',fund_id:'fund-demo',amount:'100.00',reference:'',notes:'',category:'Example payments',counterparty:'',linked_payment_ids:posted.payments.map(pay=>pay.id)}];
 assert(projectSchema.safeParse(posted).success);assert.throws(()=>unpostPaymentBatch(posted,b.id),/банковским|bancar/);
 const archived=savePaymentBatch(p,b,true),header=archived.payment_batches[0];header.imported=true;header.balancing_service_id='';
 for(const pay of archived.payments){delete pay.allocation_basis;delete pay.allocation_balancing_service_id;}
 for(const row of header.rows)row.historical_shares=archived.service_accounting.payments.filter(s=>s.payment_id===row.payment_id).map(({service_id,amount})=>({service_id,amount}));
 header.rows.push({id:'legacy-correction',account_id:b.rows[0].account_id,amount:'-0.12',manual_maintenance:null,payment_id:null,historical_shares:[{service_id:'maintenance',amount:'-0.12'}]});
 assert(projectSchema.safeParse(archived).success);assert.equal(unpostPaymentBatch(archived,b.id).payment_batches[0].state,'draft');assert.throws(()=>savePaymentBatch(archived,header,true));
 header.rows[0].historical_shares!.find(s=>s.service_id==='water')!.amount='29.00';header.rows[0].historical_shares!.find(s=>s.service_id==='maintenance')!.amount='21.00';assert(!projectSchema.safeParse(archived).success);
});

function importedFixture(){
 const {p,b}=fixture(),posted=savePaymentBatch(p,b,true),batch=posted.payment_batches[0];batch.imported=true;batch.balancing_service_id='';
 for(const row of batch.rows)row.historical_shares=posted.service_accounting.payments.filter(s=>s.payment_id===row.payment_id).map(({service_id,amount})=>({service_id,amount}));
 return {posted,batch};
}
test('imported payments can be unposted and reposted with exact original allocations',()=>{
 const {posted,batch}=importedFixture(),before=JSON.stringify(posted),draft=unpostPaymentBatch(posted,batch.id);
 assert.equal(draft.payments.length,0);assert.equal(draft.service_accounting.payments.length,0);
 assert.equal(JSON.stringify(posted),before);assert.equal(draft.payment_batches[0].source_snapshot,JSON.stringify(batch));
 const again=savePaymentBatch(draft,draft.payment_batches[0],true);
 assert.equal(again.payments.length,posted.payments.length);
 assert.deepEqual(again.payment_batches[0].rows.map(r=>r.historical_shares),batch.rows.map(r=>r.historical_shares));
 assert.equal(again.payments.reduce((s,r)=>s+Number(r.amount),0),100);
 assert.throws(()=>savePaymentBatch(again,again.payment_batches[0],true));
});
test('changing an imported amount adjusts only the selected maintenance service and survives reopening',()=>{
 const {posted,batch}=importedFixture(),draft=unpostPaymentBatch(posted,batch.id),edit=structuredClone(draft.payment_batches[0]);
 edit.balancing_service_id='maintenance';edit.rows[0].amount='60.00';
 const saved=savePaymentBatch(draft,edit),reopened=projectSchema.parse(JSON.parse(JSON.stringify(saved))),applied=savePaymentBatch(reopened,reopened.payment_batches[0],true);
 assert.deepEqual(applied.payment_batches[0].rows[0].historical_shares!.filter(s=>s.amount!=='0.00'),[{service_id:'water',amount:'30.00'},{service_id:'maintenance',amount:'30.00'}]);
 assert.deepEqual(applied.payment_batches[0].rows[1].historical_shares,batch.rows[1].historical_shares);
 assert.equal(applied.payments.length,2);assert.equal(applied.payments.reduce((s,r)=>s+Number(r.amount),0),110);
 const twice=unpostPaymentBatch(applied,batch.id);assert.equal(twice.payment_batches[0].source_snapshot,JSON.stringify(batch));
});
test('import corrections retain signed compensation and reject structural or ambiguous edits atomically',()=>{
 const {posted,batch}=importedFixture();batch.rows.push({id:'compensation',account_id:batch.rows[0].account_id,amount:'-0.12',manual_maintenance:null,payment_id:null,historical_shares:[{service_id:'maintenance',amount:'-0.12'}]});
 const draft=unpostPaymentBatch(posted,batch.id),before=JSON.stringify(draft),edit=structuredClone(draft.payment_batches[0]);edit.rows[0].amount='60.00';edit.balancing_service_id='';
 assert.throws(()=>savePaymentBatch(draft,edit,true));assert.equal(JSON.stringify(draft),before);
 edit.balancing_service_id='maintenance';const applied=savePaymentBatch(draft,edit,true);
 assert.deepEqual(applied.payment_batches[0].rows[2],batch.rows[2]);assert.equal(applied.payments.length,2);
 const changed=structuredClone(edit);changed.rows[0].account_id=changed.rows[1].account_id;assert.throws(()=>savePaymentBatch(draft,changed,true));
 changed.rows[0]=structuredClone(edit.rows[0]);changed.rows[2].amount='-0.13';assert.throws(()=>savePaymentBatch(draft,changed,true));
 const closed=structuredClone(posted);closed.closed_periods.push('2026-10');assert.throws(()=>unpostPaymentBatch(closed,batch.id));
});
test('zeroing an imported payment withdraws only its receipt without duplicate service movements',()=>{
 const {posted,batch}=importedFixture(),draft=unpostPaymentBatch(posted,batch.id),edit=structuredClone(draft.payment_batches[0]);
 edit.rows[0].amount='0.00';const next=savePaymentBatch(draft,edit,true);
 assert.equal(next.payments.length,1);assert.equal(next.payment_batches[0].rows[0].payment_id,null);
 assert(next.payment_batches[0].rows[0].historical_shares!.every(s=>s.amount==='0.00'));
 assert(next.service_accounting.payments.every(s=>s.payment_id===next.payment_batches[0].rows[1].payment_id));
});
