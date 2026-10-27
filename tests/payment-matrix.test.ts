import {test} from 'node:test';import assert from 'node:assert/strict';import {demoProject} from '../src/model';import {D} from '../src/engine';import {paymentMatrix,paymentMatrixHTML,paymentMatrixDefaults} from '../src/payment-matrix';import {balanceTable} from '../src/balance-view';
test('payment matrix conserves signed service shares and unallocated receipts without counting subtotals twice',()=>{
 const p=demoProject();p.payments=[{id:'p1',account_id:p.accounts[0].id,payment_date:'2026-10-20',entered_date:'2026-10-20',amount:'100.00',note:''},{id:'p2',account_id:p.accounts[1].id,payment_date:'2026-10-21',entered_date:'2026-10-21',amount:'30.00',note:''}];p.service_accounting.payments=[{payment_id:'p1',service_id:'water',amount:'110.00'},{payment_id:'p1',service_id:'electricity',amount:'-10.00'}];
 const o=paymentMatrixDefaults(),r=paymentMatrix(p,'2026-10-01','2026-10-31',o);assert.equal(r.total,'130.00');assert.equal(r.rows.filter(r=>r.kind==='data').length,2);assert(r.columns.some(c=>c.id==='@unallocated'));assert.equal(r.rows.filter(r=>r.kind==='data').reduce((a,b)=>a.plus(b.cells.at(-1)!),D(0)).toFixed(2),'130.00');
 const dates=paymentMatrix(p,'2026-10-01','2026-10-31',{...o,grouping:'date',expandAccounts:false});assert.equal(dates.rows.filter(r=>r.kind==='group').length,2);assert.equal(dates.total,'130.00');
 const only=paymentMatrix(p,'2026-10-01','2026-10-31',{...o,filters:[{field:'service',enabled:true,operator:'eq',values:['water']}]});assert.equal(only.total,'110.00');assert.equal(only.columns.length,1);
 assert(paymentMatrixHTML(p,'2026-10-01','2026-10-31',o).includes('rowspan="2"'));assert.throws(()=>paymentMatrix(p,'2026-02-30','2026-10-31',o));
});
test('posted balance layout does not present draft calculations as posted ledger movements',()=>{
 const p=demoProject();const before=JSON.stringify(p);const report=balanceTable(p,p.settings.period,p.settings.period,'account','',false,{postedOnly:true,legacyLayout:true});assert(report.headers.includes('№ п/п'));assert(!report.headers.includes('Начислено'));assert(!report.headers.includes('Корректировки'));assert.equal(report.numericCount,3);assert.equal(JSON.stringify(p),before);
});
