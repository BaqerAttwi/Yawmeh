import test from 'node:test';
import assert from 'node:assert/strict';
import {nextTaskDue,nextTaskValues,completeDemoTask,goalBalance,checkGoalMove,checkUnassignedWithdrawal,calendarEvents,weeklyReview,weekStart} from '../../shared/planner.js';
import {schemas} from '../../shared/validation.js';
test('daily and weekly repeats skip missed dates while preserving the schedule',()=>{
 assert.equal(nextTaskDue('2026-10-01','daily','2026-10-01'),'2026-10-02');
 assert.equal(nextTaskDue('2026-09-03','weekly','2026-10-01'),'2026-10-08');
 assert.equal(nextTaskDue('2026-10-08','weekly','2026-10-01'),'2026-10-15');
 assert.equal(nextTaskDue('2026-12-31','daily','2026-12-31'),'2027-01-01');
 assert.equal(nextTaskDue('2024-02-28','daily','2024-02-28'),'2024-02-29');
 assert.equal(nextTaskDue('2026-10-01','none'),null);
});
test('next recurrence preserves reminder lead and copies category, not completion',()=>{
 const next=nextTaskValues({id:1,title:'Review',category:'Work',due:'2026-10-01',reminder:'2026-09-30',recurrence:'weekly',priority:'high',note:'Notes'},'2026-10-01');
 assert.equal(next.due,'2026-10-08');assert.equal(next.reminder,'2026-10-07');assert.equal(next.previous_task_id,1);assert.equal(next.completed,0);assert.equal(next.category,'Work');
});
test('recurring completion is idempotent, requires subtasks and creates a fresh checklist',()=>{
 const data={tasks:[{id:1,title:'Walk',due:'2026-10-01',priority:'low',recurrence:'daily',completed:0}],subtasks:[{id:2,task_id:1,title:'Shoes',completed:0}]};let id=10;
 assert.throws(()=>completeDemoTask(data,1,true,'2026-10-01',()=>++id),/subtasks/);
 data.subtasks[0].completed=1;completeDemoTask(data,1,true,'2026-10-01',()=>++id);completeDemoTask(data,1,true,'2026-10-01',()=>++id);
 assert.equal(data.tasks.length,2);assert.equal(data.tasks.find(t=>t.id===1).completed_on,'2026-10-01');
 assert.equal(data.tasks[0].due,'2026-10-02');assert.equal(data.subtasks.find(s=>s.task_id===data.tasks[0].id).completed,0);
 assert.throws(()=>completeDemoTask(data,1,false,'2026-10-01'),/next task/);
});
test('goals reserve real savings and guard releases, withdrawals and overfunding',()=>{
 const goal={id:1,target_amount:400},entries=[{type:'opening',amount:500}],moves=[{goal_id:1,kind:'fund',amount:250},{goal_id:2,kind:'fund',amount:200}];
 assert.equal(goalBalance(moves,1),25000);
 assert.throws(()=>checkGoalMove(goal,entries,moves,{kind:'fund',amount:51}),/unassigned/);
 assert.throws(()=>checkGoalMove(goal,entries,[],{kind:'fund',amount:401}),/target/);
 assert.throws(()=>checkGoalMove(goal,entries,moves,{kind:'release',amount:251}),/release/);
 assert.throws(()=>checkUnassignedWithdrawal({type:'withdrawal',amount:51},entries,moves),/reserved/);
 assert.doesNotThrow(()=>checkGoalMove(goal,entries,moves,{kind:'fund',amount:50}));
 assert.doesNotThrow(()=>checkUnassignedWithdrawal({type:'withdrawal',amount:50},entries,moves));
});
test('calendar combines recorded tasks and projected repeats with active renewals',()=>{
 const data={tasks:[{id:1,title:'Walk',due:'2026-10-01',recurrence:'daily',completed:0},{id:2,title:'Done',due:'2026-10-01',recurrence:'daily',completed:1}],subscriptions:[{id:1,title:'Gym',renewal:'2026-10-02',cycle:'weekly',amount:35,active:1},{id:2,title:'Paused',renewal:'2026-10-02',cycle:'monthly',active:0}]};
 const events=calendarEvents(data,'2026-10-01','2026-10-09');
 assert.equal(events.filter(e=>e.title==='Walk').length,9);assert.equal(events.filter(e=>e.title==='Done').length,1);
 assert.equal(events.filter(e=>e.title==='Gym').length,2);assert.equal(events.some(e=>e.title==='Paused'),false);
 assert.equal(events.find(e=>e.id==='repeat-1-2026-10-02').projected,true);
});
test('weekly review spans Monday–Sunday, compares purchases and separates goal reservations',()=>{
 assert.equal(weekStart('2026-10-04'),'2026-09-28');
 const data={entries:[{type:'expense',amount:40,category:'Food',date:'2026-09-27'},{type:'expense',amount:60,category:'Food',date:'2026-09-28'},{type:'withdrawal',amount:20,date:'2026-10-01'}],tasks:[{due:'2026-10-04',category:'Work',completed:1},{due:'2026-10-05',category:'Work',completed:0}],subscriptions:[],goal_moves:[{kind:'fund',amount:25,date:'2026-10-01'}]};
 const review=weeklyReview(data,'2026-10-01');assert.equal(review.spent,6000);assert.equal(review.previousSpent,4000);assert.equal(review.withdrawn,2000);assert.equal(review.goalFunding,2500);assert.equal(review.tasks.length,1);assert.equal(review.completed,1);
});
test('planner input rejects invalid repeats, excessive subtasks and goal targets',()=>{
 const task={title:'Walk',due:'2026-10-01',priority:'low'};
 assert.equal(schemas.tasks.parse(task).recurrence,'none');
 assert.equal(schemas.tasks.safeParse({...task,recurrence:'hourly'}).success,false);
 assert.equal(schemas.tasks.safeParse({...task,subtasks:Array(31).fill('Step')}).success,false);
 assert.equal(schemas.goals.safeParse({title:'Laptop',target_amount:-1}).success,false);
});
