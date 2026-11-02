import test from 'node:test';
import assert from 'node:assert/strict';
import {entrySchema,schemas} from '../../server/src/validation/index.js';
import {pendingReminders} from '../../server/src/modules/reminders/reminders.js';
test('money and dates are validated on the server',()=>{
 const entry={type:'income',title:'Salary',amount:700,date:'2026-10-01'};
 assert.equal(entrySchema.parse(entry).amount,700);
 for(const amount of [-1,0,1.001,Infinity])assert.equal(entrySchema.safeParse({...entry,amount}).success,false);
 assert.equal(entrySchema.safeParse({...entry,date:'2026-02-30'}).success,false);
 assert.equal(entrySchema.safeParse({...entry,type:'expense',saved:20}).success,false);
});
test('budget periods and task reminders must be ordered',()=>{
 assert.equal(schemas.budgets.safeParse({title:'Month',amount:400,start:'2026-10-31',end:'2026-10-01'}).success,false);
 assert.equal(schemas.tasks.safeParse({title:'Task',due:'2026-10-01',reminder:'2026-10-02',priority:'low'}).success,false);
});
test('task categories accept custom names, default legacy inputs, and reject blank or long names',()=>{
 const task={title:'Study',due:'2026-10-01',priority:'low'};
 assert.equal(schemas.tasks.parse(task).category,'Personal');
 assert.equal(schemas.tasks.parse({...task,category:'  Side project  '}).category,'Side project');
 assert.equal(schemas.tasks.safeParse({...task,category:'   '}).success,false);
 assert.equal(schemas.tasks.safeParse({...task,category:'x'.repeat(81)}).success,false);
});
test('subscription reminder tiers and task reminders are deterministic and deduplicable',()=>{
 const data={subscriptions:[{id:1,title:'Gym',amount:35,renewal:'2026-10-04',active:1},{id:2,title:'Paused',renewal:'2026-10-02',active:0}],tasks:[{id:1,title:'Work',due:'2026-10-02',reminder:'2026-10-01',completed:0,note:''},{id:2,title:'Done',reminder:'2026-10-01',completed:1}]};
 const initial=pendingReminders(data,'2026-10-01');assert.equal(initial.length,2);assert.equal(initial[0].key,'subscription:1:2026-10-04:notice');assert.equal(initial[1].key,'task:1:2026-10-01');
 const urgent=pendingReminders(data,'2026-10-03');assert.equal(urgent[0].key,'subscription:1:2026-10-04:urgent');assert.match(urgent[0].subject,/Urgent/);
 assert.equal(pendingReminders({...data,tasks:[]},'2026-10-05').length,0);
});
