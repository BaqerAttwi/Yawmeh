import test from 'node:test';
import assert from 'node:assert/strict';
import {companionIntent} from '../../shared/companion-actions.js';
const run=(q,user={role:'admin'})=>companionIntent(q,user,'2026-10-04');
test('task commands prepare named drafts with 12-hour times and dates',()=>{
 assert.deepEqual(run('add a task called foorballl at 9 pm').action,{type:'task',initial:{title:'foorballl',due:'2026-10-04',scheduled_time:'21:00'}});
 assert.equal(run('add task football at 12 am tomorrow').action.initial.scheduled_time,'00:00');
 assert.equal(run('add task football at 12 pm tomorrow').action.initial.due,'2026-10-05');
 assert.equal(run('add task study on 2026-10-07 at 09:30').action.initial.scheduled_time,'09:30');
 assert.equal(run('add task study at 9').action,undefined);
 assert.equal(run('add task study on 2026-02-30').action,undefined);
});
test('money commands prepare forms while permissions reject ungranted actions',()=>{
 assert.deepEqual(run('add expense 15 for lunch').action,{type:'expense',initial:{date:'2026-10-04',amount:15,title:'lunch'}});
 assert.equal(run('add income 700 from work').action.type,'income');
 assert.equal(run('add expense 15 for lunch',{role:'user',permissions:['tasks']}).action,undefined);
 assert.equal(run('add task study',{role:'user',permissions:['money']}).action,undefined);
 assert.equal(run('add quick task').action.initial.title,'');
});
test('identity and unsupported actions are answered without accidentally generating reports',()=>{
 assert.match(run('What are you').answer,/yawmeh.me companion/);
 assert.match(run('delete task study').answer,/nothing was changed/);
 assert.equal(run('What are my savings?'),null);
});

