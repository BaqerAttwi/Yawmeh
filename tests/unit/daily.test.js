import test from 'node:test';
import assert from 'node:assert/strict';
import {mergePlan,topIds,rescheduled,inQuietHours,planSchema,daySchema} from '../../shared/daily.js';
import {nextTaskValues,calendarEvents} from '../../shared/planner.js';
import {schemas} from '../../shared/validation.js';
test('daily priorities are bounded, distinct and owned; partial updates preserve reflections',()=>{
 const tasks=[{id:1},{id:2},{id:3},{id:4}];const first=mergePlan(null,{top_ids:[1,2],went_well:'Rested'},tasks,'2026-10-01');
 assert.deepEqual(topIds(first),[1,2]);const second=mergePlan(first,{energy:'low'},tasks,'2026-10-01');assert.equal(second.went_well,'Rested');assert.deepEqual(topIds(second),[1,2]);
 assert.throws(()=>mergePlan(first,{top_ids:[1,'1']},tasks,'2026-10-01'),/different/);assert.throws(()=>mergePlan(first,{top_ids:[99]},tasks,'2026-10-01'),/own workspace/);assert.throws(()=>planSchema.parse({top_ids:[1,2,3,4]}));assert.throws(()=>daySchema.parse('2026-02-30'));
});
test('rescheduling preserves reminder lead and recurring cadence; completed tasks must reopen',()=>{
 const moved=rescheduled({due:'2026-10-01',reminder:'2026-09-29',completed:0},'2026-10-05');assert.deepEqual(moved,{due:'2026-10-05',reminder:'2026-10-03'});
 assert.equal(nextTaskValues({...moved,id:1,title:'Weekly',recurrence:'weekly',scheduled_time:'18:30'},'2026-10-05').due,'2026-10-12');assert.throws(()=>rescheduled({completed:1},'2026-10-05'),/Reopen/);
});
test('quiet hours support overnight boundaries and configured timezone',()=>{
 assert.equal(inQuietHours('22:00','08:00',new Date('2026-10-01T20:00:00Z'),'Asia/Beirut'),true);
 assert.equal(inQuietHours('22:00','08:00',new Date('2026-10-01T05:00:00Z'),'Asia/Beirut'),false);
 assert.equal(inQuietHours('09:00','17:00',new Date('2026-10-01T10:00:00Z'),'UTC'),true);
 assert.equal(inQuietHours('','',new Date()),false);
 assert.throws(()=>schemas.settings.parse({name:'A',email:'',quiet_start:'22:00',quiet_end:''}));assert.throws(()=>schemas.settings.parse({name:'A',email:'',quiet_start:'08:00',quiet_end:'08:00'}));
});
test('personal time appears on calendar and repeats retain the scheduled time',()=>{
 const task=schemas.tasks.parse({title:'Walk with a friend',due:'2026-10-01',priority:'low',category:'People',scheduled_time:'18:30',estimate_minutes:30,recurrence:'daily'});
 assert.equal(calendarEvents({tasks:[task],subscriptions:[]},'2026-10-01','2026-10-01')[0].title,'Walk with a friend · 18:30');assert.equal(nextTaskValues(task,'2026-10-01').scheduled_time,'18:30');assert.throws(()=>schemas.tasks.parse({...task,scheduled_time:'25:00'}));
});
