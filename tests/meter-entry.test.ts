import test from 'node:test';
import assert from 'node:assert/strict';
import {demoProject} from '../src/model';
import {entryPrevious,entryConsumption,meterConnectedOn,meterDocumentHistory} from '../src/meter-entry';
import {saveMeterDocument,type MeterDocument} from '../src/meter-documents';

test('imported readings remain visible without creating or duplicating accounting records',()=>{
 const p=demoProject(),meter={id:'example-meter',scope:'individual' as const,account_id:p.accounts[0].id,service_id:p.services[0].id,label:'Example',serial_number:'',unit:p.services[0].unit,active:false,installed_on:'2026-01-01',retired_on:null,initial_value:'100',status_history:[{date:'2026-01-01',active:true},{date:'2026-11-01',active:false}]};
 p.meters=[meter];p.meter_values=[{id:'example-reading',meter_id:meter.id,period:'2026-10',reading_date:'2026-10-20',kind:'regular',value:'125',notes:''}];
 const before=JSON.stringify(p),history=meterDocumentHistory(p,'individual');
 assert.equal(history.length,1);assert.equal(history[0].rows[0].reading_id,'example-reading');assert.equal(JSON.stringify(p),before);
 assert.equal(meterConnectedOn(meter,'2026-10-20'),true);assert.equal(meterConnectedOn(meter,'2026-11-02'),false);
 assert.equal(entryPrevious(p,meter.id,'2026-10-20','example-reading'),'100');assert.equal(entryConsumption('100','125'),'25');
 p.meter_documents=[{...history[0],id:'original-header',number:'12'}];assert.equal(meterDocumentHistory(p,'individual').length,1);
});

test('each reading date is persisted and disconnection is checked on that date',()=>{
 const p=demoProject();p.closed_periods=[];
 p.meters=[{id:'meter',scope:'individual',account_id:p.accounts[0].id,service_id:p.services[0].id,label:'Example',serial_number:'',unit:p.services[0].unit,active:false,installed_on:'2026-10-01',retired_on:null,initial_value:'10',status_history:[{date:'2026-10-01',active:true},{date:'2026-10-20',active:false}]}];
 const document:MeterDocument={id:'document',number:'1',kind:'individual',date:'2026-10-25',period:'2026-10',state:'draft',comment:'',rows:[{id:'row',meter_id:'meter',active:true,value:'14',reading_date:'2026-10-15'}]};
 const next=saveMeterDocument(p,document,true);assert.equal(next.meter_values.at(-1)?.reading_date,'2026-10-15');assert.equal(next.meter_documents[0].rows[0].reading_id,'reading-row');
 document.rows[0].reading_date='2026-10-22';assert.throws(()=>saveMeterDocument(p,document,true));
 document.rows[0].reading_date='2026-11-01';assert.throws(()=>saveMeterDocument(p,document,true));
});
