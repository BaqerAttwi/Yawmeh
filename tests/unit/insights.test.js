import test from 'node:test';
import assert from 'node:assert/strict';
import {budgetAlerts,savingsForecast,checkVoid,annualCost} from '../../shared/insights.js';
import {balances,periodSummary} from '../../shared/domain.js';
import {nextTaskValues} from '../../shared/planner.js';
test('budget notices start at exact thresholds and ignore reversed purchases',()=>{
 const data={tasks:[],budgets:[{id:1,amount:100,start:'2026-10-01',end:'2026-10-31'}],entries:[{type:'expense',amount:79.99,date:'2026-10-01'}]};
 assert.equal(budgetAlerts(data,'2026-10-01')[0].level,'normal');data.entries[0].amount=80;assert.equal(budgetAlerts(data,'2026-10-01')[0].level,'warning');data.entries[0].amount=100;assert.equal(budgetAlerts(data,'2026-10-01')[0].level,'urgent');data.entries[0].voided_on='2026-10-02';assert.equal(budgetAlerts(data,'2026-10-01')[0].spent,0);assert.equal(budgetAlerts(data,'2026-11-01').length,0);
});
test('forecasts round contributions up, clamp month ends, and handle no plan or achieved goals',()=>{
 const goal={id:1,target_amount:101,monthly_amount:100};assert.equal(savingsForecast(goal,[],100,'2026-01-31').finish,'2026-03-31');goal.target_amount=100;assert.equal(savingsForecast(goal,[],100,'2026-01-31').finish,'2026-02-28');assert.equal(savingsForecast(goal,[],0).months,null);assert.equal(savingsForecast(goal,[{goal_id:1,kind:'fund',amount:100}],0).months,0);
});
test('reversal preserves history, prevents duplicates, protects spent and reserved money',()=>{
 const entries=[{id:1,type:'income',amount:100,saved:40},{id:2,type:'expense',amount:20,date:'2026-10-01'}];
 assert.throws(()=>checkVoid(entries,[],1,'Mistake'),/already spent/);const e=checkVoid(entries,[],2,'Duplicate');Object.assign(e,{voided_on:'2026-10-01',void_reason:'Duplicate'});assert.equal(entries.length,2);assert.deepEqual(balances(entries),{available:6000,savings:4000});assert.equal(periodSummary({entries,tasks:[]},'2026-10-01','2026-10-31').spent,0);assert.throws(()=>checkVoid(entries,[],2,'Again'),/already reversed/);assert.throws(()=>checkVoid(entries,[{kind:'fund',amount:30}],1,'Mistake'),/reserved/);assert.throws(()=>checkVoid(entries,[],99,'Mistake'),/not found/);
});
test('subscription annualization and recurring estimates keep their units',()=>{
 assert.equal(annualCost({amount:2,cycle:'weekly'}),10400);assert.equal(annualCost({amount:2,cycle:'monthly'}),2400);assert.equal(annualCost({amount:2,cycle:'yearly'}),200);assert.equal(nextTaskValues({id:1,title:'Read',due:'2026-10-01',recurrence:'daily',estimate_minutes:15},'2026-10-01').estimate_minutes,15);
});

