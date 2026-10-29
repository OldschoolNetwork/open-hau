import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {resolve} from 'node:path';
import {join} from 'node:path';
import {api,mergeHistory} from '../tools/database-api';
import {demoProject} from '../src/model';
test('API validates patches, preserves backups and rejects stale revisions',async()=>{
 const dir=await mkdtemp(resolve('../tmp/openhau-api-'));try{const path=join(dir,'demo.json');const original=JSON.stringify(demoProject());await writeFile(path,original);const before:any=await api('database.inspect',{path});await assert.rejects(()=>api('database.patch',{path,revision:before.revision,operations:[{op:'replace',path:'/schema_version',value:99}]}));assert.equal(await readFile(path,'utf8'),original);
 const saved:any=await api('database.patch',{path,revision:before.revision,operations:[{op:'replace',path:'/organization/name',value:'Example Changed'}]});assert.equal(await readFile(saved.backup,'utf8'),original);await assert.rejects(()=>api('database.patch',{path,revision:before.revision,operations:[{op:'replace',path:'/organization/name',value:'Stale'}]}));assert.equal(JSON.parse(await readFile(path,'utf8')).organization.name,'Example Changed');
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('history merge adds references and preserves current settings, amounts and existing records',async()=>{
 const dir=await mkdtemp(resolve('../tmp/openhau-merge-'));try{const base=demoProject(),source=demoProject();base.organization.name='Current Example';base.settings.date_format='iso';source.reference_catalogs.banks=[{id:'example-bank',code:'1',name:'Example Bank',active:true,marked_for_deletion:false,notes:'',attributes:{}}];const path=join(dir,'base.json'),other=join(dir,'source.json'),output=join(dir,'merged.json');await writeFile(path,JSON.stringify(base));await writeFile(other,JSON.stringify(source));const bytes=await readFile(path,'utf8');const report=await mergeHistory(path,other,output);const result=JSON.parse(await readFile(output,'utf8'));assert.equal(await readFile(path,'utf8'),bytes);assert.equal(result.organization.name,base.organization.name);assert.equal(result.settings.date_format,'iso');assert.deepEqual(result.payments,base.payments);assert.equal(result.reference_catalogs.banks[0].name,'Example Bank');assert.equal(report.financial_sections_preserved,true);await assert.rejects(()=>mergeHistory(path,other,output));
 }finally{await rm(dir,{recursive:true,force:true});}
});
