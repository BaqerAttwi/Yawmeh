import test from 'node:test';
import assert from 'node:assert/strict';
import {companionSummary} from '../../shared/companion.js';
const data={entries:[{type:'income',amount:700,saved:300,date:'2026-10-05'},{type:'expense',amount:25,date:'2026-10-05'},{type:'expense',amount:90,date:'2026-10-05',voided_on:'2026-10-05'}],tasks:[{title:'First',due:'2026-10-05',completed:0,estimate_minutes:15},{title:'Done',due:'2026-10-06',completed:1,estimate_minutes:60}],goals:[{monthly_amount:100}]};
test('companion summaries use inclusive weeks, exclude reversals, and separate balances from plans',()=>{
 const s=companionSummary(data,{role:'admin'},'2026-10-05','week');
 assert.equal(s.start,'2026-10-05');assert.equal(s.end,'2026-10-11');assert.equal(s.total,2);assert.equal(s.completed,1);assert.equal(s.minutes,15);assert.equal(s.spent,2500);assert.equal(s.savings,30000);assert.equal(s.monthlyPlan,10000);
 assert.equal(companionSummary(data,{role:'admin'},'2026-10-05').total,1);
});
test('companion summaries enforce permitted apps even when supplied unfiltered data',()=>{
 const s=companionSummary(data,{role:'user',permissions:['tasks']},'2026-10-05');
 assert.equal(s.money,false);assert.equal(s.spent,0);assert.equal(s.savings,0);assert.equal(s.monthlyPlan,0);assert.equal(s.next,'First');
 const m=companionSummary(data,{role:'user',permissions:['money']},'2026-10-05');assert.equal(m.tasks,false);assert.equal(m.total,0);assert.equal(m.next,undefined);
});
