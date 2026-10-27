import {test} from 'node:test';import assert from 'node:assert/strict';
import {demoProject} from '../src/model';import {balanceTable} from '../src/balance-view';import {serviceBalanceReport} from '../src/service-reports';import {accountReportXLSX,accountReportHTML} from '../src/report-exports';
test('service summaries and type summaries preserve ledger totals; accounts are optional',()=>{
 const p=demoProject();p.services.forEach(s=>s.service_type='Utilities');
 const base=serviceBalanceReport(p,p.settings.period,p.settings.period);
 for(const grouping of ['service','type','type-service'] as const){const t=balanceTable(p,p.settings.period,p.settings.period,'service','',false,{grouping});assert.deepEqual(t.rows.at(-1)?.slice(t.numericStart),Object.values(base.totals));if(grouping==='type')assert.equal(t.rows.length,3);assert(!t.headers.includes('Счёт'));}
 const detailed=balanceTable(p,p.settings.period,p.settings.period,'service','',false,{expandAccounts:true,showAddress:true});assert(detailed.headers.includes('Адрес'));assert.equal(detailed.rows.length,base.rows.length+1);
});
test('list and exclusion filters apply before aggregation, sort numbers numerically',()=>{
 const p=demoProject(),id=p.accounts[0].id;
 const opts={filters:[{field:'account' as const,enabled:true,operator:'in' as const,values:[id]}]};
 const a=balanceTable(p,p.settings.period,p.settings.period,'service','',false,opts);
 const b=balanceTable(p,p.settings.period,p.settings.period,'service','',false,{accountFilter:id});assert.deepEqual(a.rows,b.rows);
 const c=balanceTable(p,p.settings.period,p.settings.period,'service','',false,{filters:[{...opts.filters[0],operator:'not-in',values:p.accounts.map(a=>a.id)}]});assert.equal(c.rows.length,1);assert.equal(c.rows[0][c.numericStart],'0.00');
 const h=accountReportHTML(p,p.settings.period,p.settings.period,'service','',false,{expandAccounts:false});assert(h.includes('background:#e7edf3;font-weight:700'));
 const filtered=accountReportHTML(p,p.settings.period,p.settings.period,'service','',false,{filters:[{field:'service',enabled:true,operator:'eq',values:['water']}]});assert(filtered.includes(p.services.find(s=>s.id==='water')!.name.ru));assert(!filtered.includes(p.services.find(s=>s.id==='electricity')!.name.ru));
 const bytes=accountReportXLSX(p,p.settings.period,p.settings.period);assert.equal(new DataView(bytes.buffer).getUint32(0,true),0x04034b50);const text=new TextDecoder().decode(bytes);assert(text.includes('xl/worksheets/sheet1.xml'));assert(text.includes('state="frozen"'));assert(text.includes('customWidth="1"'));assert(text.includes('inlineStr'));
});

