import {test} from 'node:test';
import assert from 'node:assert/strict';
import {databaseFilename,databaseFileFilters,databaseSaveFilters} from '../src/database-format';
test('portable database names use odb while legacy JSON remains selectable',()=>{
 assert.equal(databaseFilename('Example Association'),'Example Association.odb');
 assert.equal(databaseFilename('Example.openhau.json'),'Example.odb');
 assert.equal(databaseFilename('Example.ODB'),'Example.odb');
 assert.equal(databaseFilename('Example: Association/2026'),'Example- Association-2026.odb');
 assert.deepEqual(databaseFileFilters[0].extensions,['odb','json']);
 assert.equal(databaseSaveFilters[0].extensions[0],'odb');
});
