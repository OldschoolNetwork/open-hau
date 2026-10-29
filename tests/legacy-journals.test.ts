import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {join,resolve,sep} from 'node:path';
import {tmpdir} from 'node:os';
import {demoProject,projectSchema} from '../src/model';
import {importLegacyJournals} from '../tools/import-legacy-journals';
import {unpostAdministrationDocument,saveAdministrationDocument} from '../src/administration';

test('legacy journal import preserves the input and accounting, retains source draft state and prevents reposting',async()=>{
 const root=await mkdtemp(join(tmpdir(),'openhau-journal-test-'));
 try {
  const p=demoProject(),input=join(root,'input.odb'),output=join(root,'output.odb'),bytes=JSON.stringify(p);
  await writeFile(input,bytes);
  const table=async(name:string,records:Record<string,unknown>[])=>{const keys=Object.keys(records[0]);await writeFile(join(root,name+'.json'),JSON.stringify({columns:keys.map(name=>({name})),rows:records.map(row=>keys.map(k=>row[k]))}));};
  await table('service_charging_calculation_document',[{id:'SOURCE-CHARGE',number:'1',date:'20261001000000',id_personal_account:p.accounts[0].id,posted:true,deleted:false,comment:'Example calculation'}]);
  await table('charging_correct_document',[{id:'source-correction',number:'2',date:'20261002000000',posted:false,deleted:false,type:1,comment:'Example draft correction'}]);
  await table('correcting_subitem',[{id_owner:'source-correction',id_personal_account:p.accounts[0].id,id_service:p.services[0].id,summa:'-0.12'}]);
  const result=await importLegacyJournals(input,root,output),next=projectSchema.parse(JSON.parse(await readFile(output,'utf8')));
  assert.equal(result.added,2);assert.equal(await readFile(input,'utf8'),bytes);assert.deepEqual(next.payments,p.payments);assert.deepEqual(next.snapshots,p.snapshots);assert.deepEqual(next.adjustments,p.adjustments);assert.deepEqual(next.settings,p.settings);
  const applied=next.administration.documents[0],draft=next.administration.documents[1];assert.equal(applied.id,'source-charge');assert.equal(applied.state,'applied');assert.equal(draft.state,'draft');assert.equal(draft.rows[0].amount,'-0.12');assert.throws(()=>unpostAdministrationDocument(next,applied.id));assert.throws(()=>saveAdministrationDocument(next,draft,true));
  await assert.rejects(importLegacyJournals(input,root,output));
 }finally{const absolute=resolve(root),parent=resolve(tmpdir())+sep;if(!absolute.startsWith(parent)||!absolute.split(sep).at(-1)?.startsWith('openhau-journal-test-'))throw Error('Unexpected test directory');await rm(absolute,{recursive:true,force:true});}
});
