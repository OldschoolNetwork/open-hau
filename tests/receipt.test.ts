import {test} from 'node:test';
import assert from 'node:assert/strict';
import {demoProject} from '../src/model';
import {receipt,receiptDocument} from '../src/receipt';
test('квитанция сохраняет румынские буквы, единицы и экранирует данные',()=>{
 const p=demoProject();p.organization.name='<script>alert(1)</script>';p.settings.receipt_language='ro';
 const html=receipt(p,p.accounts[0],p.settings.period);
 assert.ok(html.includes('Apă și canalizare'));assert.ok(html.includes('kWh'));assert.ok(html.includes('m³'));
 assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<script>'));assert.ok(html.includes('1.047,44'));
});
test('неполные счета явно печатаются как черновики',()=>{
 const p=demoProject();p.settings.receipt_language='ru';
 assert.ok(receipt(p,p.accounts[1],p.settings.period).includes('ЧЕРНОВИК'));
});
test('все три дизайна доступны в автономном HTML',()=>{
 const p=demoProject();for(const design of ['studio','compact','classic'] as const){p.settings.receipt_design=design;const html=receiptDocument(p,[p.accounts[0]],p.settings.period);assert.ok(html.includes(`receipt ${design}`));assert.ok(html.startsWith('<!doctype html>'));assert.ok(!html.includes('<script'))}
});
