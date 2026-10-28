import {test} from 'node:test';import assert from 'node:assert/strict';
import {demoProject,projectSchema,uid} from '../src/model';import {saveAccountDocument,accountOpenInMonth,accountServicesInMonth} from '../src/account-lifecycle';import {accountBalanceReport} from '../src/reports';import {serviceBalanceReport} from '../src/service-reports';import {intervalRange} from '../src/report-interval';
test('dated charges and payments cross daily boundaries without changing month totals',()=>{
 const p=demoProject(),a=p.accounts[0],m=p.settings.period,sid='maintenance';p.accounts=[a];a.service_ids=[sid];a.opening_balance='100.00';a.opening_period=m;
 p.closed_periods=[m];p.snapshots=[{account_id:a.id,period:m,lines:[{service_id:sid,name:{ru:'Пример',ro:'Exemplu'},unit:'account',quantity:'1',rate:'80',amount:'80.00'}],adjustment:'0.00',total:'80.00'}];
 p.charge_events=[{account_id:a.id,service_id:sid,period:m,date:m+'-10',kind:'charge',amount:'30.00'},{account_id:a.id,service_id:sid,period:m,date:m+'-25',kind:'charge',amount:'50.00'}];
 p.payments=[{id:'example-payment',account_id:a.id,payment_date:m+'-12',entered_date:m+'-12',amount:'20.00',note:''}];p.service_accounting={opening:[{account_id:a.id,service_id:sid,amount:'100.00'}],payments:[{payment_id:'example-payment',service_id:sid,amount:'20.00'}],adjustments:[]};
 projectSchema.parse(p);const before=JSON.stringify(p);
 const daily=accountBalanceReport(p,m+'-11',m+'-20',false,true),service=serviceBalanceReport(p,m+'-11',m+'-20','',false,true);
 assert.deepEqual(daily.totals,{opening:'130.00',charges:'0.00',adjustments:'0.00',paid:'20.00',closing:'110.00'});assert.deepEqual(service.totals,daily.totals);
 const month=accountBalanceReport(p,m,m,false,true);assert.equal(month.totals.closing,'160.00');assert.equal(month.totals.charges,'80.00');assert.equal(JSON.stringify(p),before);
 p.charge_events[0].amount='31.00';assert.equal(projectSchema.safeParse(p).success,false);
});
test('account closure preserves history and dated services preserve earlier assignments',()=>{
 const p=demoProject(),a=p.accounts[0],month=p.settings.period;const next=saveAccountDocument(p,{id:uid(),number:'1',date:month+'-28',kind:'close',state:'draft',account:structuredClone(a),comment:''},true);
 assert.equal(p.accounts[0].active,true);assert(accountOpenInMonth(next.accounts[0],month));assert(!accountOpenInMonth(next.accounts[0],'9999-12'));assert.equal(next.account_documents[0].before?.id,a.id);
 const change=saveAccountDocument(p,{id:uid(),number:'2',date:'2099-01-01',kind:'services',state:'draft',account:{...structuredClone(a),service_ids:['maintenance']},comment:''},true);
 assert.deepEqual(accountServicesInMonth(change.accounts[0],month),a.service_ids);assert.deepEqual(accountServicesInMonth(change.accounts[0],'2099-01'),['maintenance']);
 assert.throws(()=>saveAccountDocument(next,next.account_documents[0],true));
});
test('interval selector handles leap days and start-of-quarter/year options',()=>{
 const c={mode:'month' as const,year:2024,quarter:1,month:2,day:'2024-02-29',yearToDate:false,quarterToDate:false,monthToDate:false};
 assert.deepEqual(intervalRange(c,'2026-10'),{from:'2024-02-01',to:'2024-02-29'});assert.deepEqual(intervalRange({...c,month:5,quarterToDate:true},'2026-10'),{from:'2024-04-01',to:'2024-05-31'});assert.throws(()=>intervalRange({...c,mode:'day',day:'2023-02-29'},'2026-10'));
});
