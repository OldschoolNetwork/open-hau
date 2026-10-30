import test from 'node:test';import assert from 'node:assert/strict';
import {compareCells,nextSort,sortRows} from '../src/table-sort';
test('table sorting cycles and Shift keeps priority of existing columns',()=>{
 let keys=nextSort([],1);assert.deepEqual(keys,[{column:1,direction:1}]);
 keys=nextSort(keys,2,true);keys=nextSort(keys,1,true);assert.deepEqual(keys,[{column:1,direction:-1},{column:2,direction:1}]);
 assert.deepEqual(nextSort(keys,1,true),[{column:2,direction:1}]);assert.deepEqual(nextSort(keys,3),[{column:3,direction:1}]);
});
test('localized numbers, negative balances, calendar dates and natural identifiers sort correctly',()=>{
 assert(compareCells('1 234,50','99,99')>0);assert(compareCells('−0,12','0,00')<0);assert(compareCells('1,234.50','1.234,50')===0);
 assert(compareCells('31.01.2026','01.02.2026')<0);assert(compareCells('Account 2','Account 10')<0);
 const input=[['B','2'],['A','10'],['A','3'],['A','3']];const rows=sortRows(input,[{column:0,direction:1},{column:1,direction:1}],(r,c)=>r[c]);
 assert.deepEqual(rows,[input[2],input[3],input[1],input[0]]);assert.equal(input[0][0],'B');
});
