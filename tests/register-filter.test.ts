import {test} from 'node:test';import assert from 'node:assert/strict';
import {matchesRegisterFilters,type RegisterFilter} from '../src/register-filter';
import {registerTable} from '../src/register-data';import {demoProject} from '../src/model';
test('register date comparisons use canonical dates and combine enabled criteria',()=>{
 const filters:RegisterFilter[]=[{column:0,enabled:true,comparison:'ge',values:['2026-09-01']},{column:1,enabled:true,comparison:'in',values:['Example A','Example B']}];
 assert(matchesRegisterFilters(['2026-10-01','Example B'],filters));
 assert(!matchesRegisterFilters(['2026-08-31','Example B'],filters));
 assert(!matchesRegisterFilters(['2026-10-01','Example C'],filters));
 filters[1].enabled=false;assert(matchesRegisterFilters(['2026-10-01','Example C'],filters));
});
test('registered table preserves source column order and distinct canonical date values',()=>{
 const p=demoProject();p.settings.language='ru';p.settings.date_format='dmy-dot';const a=p.accounts[0];p.account_history.residents=[{id:'reg-example',account_id:a.id,citizen_id:'example-citizen',date:'2026-10-01',kind:'registration',status:2,from:'2026-09-01',to:'2026-12-31'}];
 const data=registerTable(p,'registered');assert.deepEqual(data.headers,['Дата','Гражданин','Объект учёта','Дата начала','Дата окончания','Вид регистрации']);assert.equal(data.rows[0].filterValues?.[3],'2026-09-01');assert.equal(data.rows[0].values[3],'01.09.2026');assert.deepEqual(data.dateColumns,[0,3,4]);
});
