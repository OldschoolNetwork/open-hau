import {test} from 'node:test';import assert from 'node:assert/strict';
import {demoProject} from '../src/model';import {applyTranslations} from '../src/translations';
import {configureLocalization,translatedName,referenceLabel} from '../src/localization';
import {referenceRows,saveReferenceRecord} from '../src/reference-catalogs';
test('translations survive reopening without replacing accounting data or canonical reference names',()=>{
 let p=demoProject();p.reference_catalogs.banks=[{id:'sample-bank',code:'1',name:'Sample Bank',active:true,marked_for_deletion:false,notes:'',attributes:{}}];
 const before=JSON.stringify(p);p=applyTranslations(p,'de',{'services/water/name':'Wasser','references/banks/sample-bank/name':'Beispielbank'},true);
 p=applyTranslations(p,'ru',{'services/water/name':''},true);
 p.settings.language='en';p.settings.translation_locale='de';configureLocalization(p.settings);
 assert.equal(translatedName(p.services[0].name,'en'),'Wasser');assert.equal(referenceLabel(p.reference_catalogs.banks?.[0],'en'),'Beispielbank');
 assert.equal(referenceRows(p,'banks')[0].name,'Sample Bank');
 const saved=saveReferenceRecord(p,'banks',{...referenceRows(p,'banks')[0],active:false});
 assert.equal(saved.reference_catalogs.banks?.[0].name,'Sample Bank');assert.equal(saved.services[0].name.ru,JSON.parse(before).services[0].name.ru);assert.deepEqual(saved.payments,JSON.parse(before).payments);
 configureLocalization(demoProject().settings);
});
