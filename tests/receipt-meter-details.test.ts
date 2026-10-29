import {test} from 'node:test';
import assert from 'node:assert/strict';
import {demoProject,projectSchema,receiptDesigns} from '../src/model';
import {receiptDocument} from '../src/receipt';
import {receiptReadings} from '../src/meters';

function fixture(){
 const p=demoProject();p.settings.period='2026-10';p.settings.receipt_language='en';
 for(const [id,service,initial,current,unit] of [
  ['water-main','water','187.25','199.75','m³'],
  ['water-kitchen','water','87.125','90.625','m³'],
  ['electricity-main','electricity','1749','1863','kWh'],
 ] as const){
  p.meters.push({id,scope:'individual',account_id:'a1',service_id:service,label:id,serial_number:'SAMPLE-'+id,unit,active:true,installed_on:'2026-01-01',retired_on:null,initial_value:'0'});
  p.meter_values.push({id:id+'-previous',meter_id:id,period:'2026-09',reading_date:'2026-09-29',value:initial,kind:'regular',notes:''},{id:id+'-current',meter_id:id,period:'2026-10',reading_date:'2026-10-28',value:current,kind:'regular',notes:''},{id:id+'-future',meter_id:id,period:'2026-11',reading_date:'2026-11-28',value:'999999',kind:'regular',notes:''});
 }
 return projectSchema.parse(p);
}
test('all receipt designs retain separate water and electricity readings, serials, dates and consumption',()=>{
 const p=fixture();const rows=receiptReadings(p,'a1','2026-10');
 assert.equal(rows.filter(r=>!r.aggregate).length,3);
 assert.deepEqual(rows.filter(r=>!r.aggregate).map(r=>r.consumption),['12.5','3.5','114']);
 for(const design of receiptDesigns){
  p.settings.receipt_design=design;const html=receiptDocument(p,[p.accounts[0]],'2026-10');
  for(const value of ['SAMPLE-water-main','SAMPLE-water-kitchen','SAMPLE-electricity-main','187.25','199.75','87.125','90.625','1749','1863','12.5','3.5','114','2026-09-29','2026-10-28'])assert(html.includes(value),design+': '+value);
  assert(!html.includes('999999'),design+': future readings must not leak into earlier receipts');
 }
});
test('missing current readings remain missing, never zero or a later reading',()=>{
 const p=fixture();p.meter_values=p.meter_values.filter(r=>r.period!=='2026-10');
 const rows=receiptReadings(p,'a1','2026-10').filter(r=>!r.aggregate);
 assert.equal(rows.length,3);
 assert(rows.every(r=>r.current===null&&r.reading_date===null&&r.consumption===null&&r.warning==='missing'));
 assert(rows.every(r=>r.previous_date==='2026-09-29'));
});
