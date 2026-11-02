import test from 'node:test';
import assert from 'node:assert/strict';
import {rangeFor,todayView,closeDayValues,viewRangeSchema} from '../../shared/today.js';
test('Today ranges are inclusive across month and year boundaries',()=>{
 assert.deepEqual(rangeFor('today','2026-12-31'),{start:'2026-12-31',end:'2026-12-31'});
 assert.equal(rangeFor('2days','2026-12-31').end,'2027-01-01');assert.equal(rangeFor('3days','2028-02-28').end,'2028-03-01');assert.equal(rangeFor('week','2026-10-01').end,'2026-10-07');
 assert.throws(()=>viewRangeSchema.parse({start:'2026-10-02',end:'2026-10-01'}));assert.throws(()=>viewRangeSchema.parse({start:'2026-01-01',end:'2027-01-02'}));
});
test('Today range filters task counts, estimates, expenses and renewals together',()=>{
 const data={tasks:[{due:'2026-10-01',completed:1},{due:'2026-10-02',completed:0,estimate_minutes:30},{due:'2026-10-03',completed:0,estimate_minutes:60}],entries:[{type:'expense',amount:5,date:'2026-10-01'},{type:'expense',amount:10,date:'2026-10-02',voided_on:'2026-10-02'},{type:'expense',amount:20,date:'2026-10-03'}],subscriptions:[{id:1,title:'Gym',renewal:'2026-10-02',cycle:'monthly',active:1,amount:30}]};
 const result=todayView(data,rangeFor('2days','2026-10-01'));assert.equal(result.tasks.length,2);assert.equal(result.completed,1);assert.equal(result.minutes,30);assert.equal(result.spent,500);assert.equal(result.renewals.length,1);assert.equal(result.expenses.length,1);
});
test('day close moves only chosen pending tasks, preserves reminders and is idempotent',()=>{
 const data={day_plans:[],tasks:[{id:1,due:'2026-09-30',reminder:'2026-09-29',completed:0},{id:2,due:'2026-10-01',completed:0}]},input={task_ids:[1],move_to:'2026-10-02',went_well:'A small win',tomorrow_help:'Rest'};
 const result=closeDayValues(data,'2026-10-01',input,'2026-10-01T18:00:00Z');assert.deepEqual(result.moves,[{id:1,due:'2026-10-02',reminder:'2026-10-01'}]);assert.equal(data.tasks[1].due,'2026-10-01');assert.equal(data.tasks[0].completed,0);assert.equal(result.plan.went_well,'A small win');
 data.day_plans.push(result.plan);assert.equal(closeDayValues(data,'2026-10-01',input).alreadyClosed,true);assert.deepEqual(closeDayValues(data,'2026-10-01',input).moves,[]);
});
test('day close rejects stale, foreign and duplicate selections before changes',()=>{
 const data={day_plans:[],tasks:[{id:1,due:'2026-10-01',completed:1},{id:2,due:'2026-10-03',completed:0}]},input={task_ids:[],move_to:'2026-10-02',went_well:'',tomorrow_help:''};
 for(const ids of [[1],[2],[9],[2,2]])assert.throws(()=>closeDayValues(data,'2026-10-01',{...input,task_ids:ids}));assert.throws(()=>closeDayValues(data,'2026-10-01',{...input,move_to:'2026-10-01'}));assert.equal(closeDayValues(data,'2026-10-01',input).moves.length,0);
});
