import test from 'node:test';
import assert from 'node:assert/strict';
import {localCompanion} from '../../shared/local-companion.js';
const user={role:'user',permissions:['money','tasks']},date='2026-10-05';
const data={entries:[{type:'income',amount:700,saved:300,date},{type:'expense',amount:50,category:'Food',date}],budgets:[{title:'October',amount:100,start:'2026-10-01',end:'2026-10-31'}],tasks:[{title:'Finish work',due:date,estimate_minutes:30,priority:'high',completed:false}],goals:[],subscriptions:[]};
const ask=(q,u=user,ctx=null)=>localCompanion(data,u,q,date,{start:date,end:date},ctx);

test('spoken expense requests prepare drafts instead of reports',()=>{
 for(const q of ['Can you add expenses?','Can you help me in adding more expenses?','Could you please add expense 15 for lunch?']){
  const result=ask(q);
  assert.equal((result.action||result.context?.draft)?.type,'expense');
  assert.doesNotMatch(result.answer,/^Report:/);
 }
 const pending=ask('Can you add expenses?');
 const named=ask('Lunch',user,pending.context);
 const ready=ask('15',user,named.context);
 assert.equal(ready.action.initial.amount,15);
 assert.equal(ready.action.initial.title,'Lunch');
 assert.equal(ready.action.initial.currency,'USD');
 assert.equal(ask('Can you add expenses?',{role:'user',permissions:['tasks']}).context,undefined);
 assert.match(ask('Can you add expenses?',{role:'user',permissions:['tasks']}).answer,/does not have Money access/);
});

test('voice checks preserve pending drafts and spoken planning remains supported',()=>{
 const pending=ask('add expense');
 for(const q of ['Osage, can you hear me?','So can you hear me right now?']){
  const result=ask(q,user,pending.context);
  assert.match(result.answer,/reached me as text/);
  assert.deepEqual(result.context,pending.context);
 }
 assert.match(ask('Oh thanks. Can you plan my day?').answer,/Suggested priorities/);
 assert.equal(ask('No, what I meant is adding.',user,{topic:'money'}).context.draft.type,'expense');
 assert.match(ask('Expenses today').answer,/Report:/);
});
test('a new request interrupts an incomplete draft without becoming its title',()=>{
 const pending=ask('add expense');
 assert.match(ask('Budget status',user,pending.context).answer,/October/);
 assert.equal(ask('add task read',user,pending.context).action.initial.title,'read');
});
test('reports handle tomorrow, next month and explicit ranges without replacing dates',()=>{
 assert.match(ask('Plans tomorrow').answer,/2026-10-06 through 2026-10-06/);
 assert.match(ask('Report next month').answer,/2026-11-01 through 2026-11-30/);
 assert.match(ask('Weekly report for 2026-10-01 to 2026-10-03').answer,/2026-10-01 through 2026-10-03/);
});
test('ready drafts accept corrections and unrelated questions leave draft mode',()=>{
 const original=ask('add task football');const changed=ask('change that to tomorrow',user,original.context);assert.equal(changed.action.initial.due,'2026-10-06');assert.equal(original.action.initial.due,date);
 const expense=ask('I spent 15 for lunch');assert.equal(ask('change the amount to 25',user,expense.context).action.initial.amount,25);
 assert.match(ask('Budget status',user,expense.context).answer,/October/);
 assert.equal(ask('cancel',user,expense.context).context,undefined);
});
test('budget warnings and matching-period comparisons exclude reversed and future entries',()=>{
 const sample={...data,entries:[...data.entries,{type:'expense',amount:35,category:'Food',date},{type:'expense',amount:20,category:'Food',date:'2026-09-05'},{type:'expense',amount:999,date,voided_on:date},{type:'expense',amount:999,date:'2026-10-06'}]};
 const run=q=>localCompanion(sample,user,q,date,{start:date,end:date});assert.match(run('Budget status').answer,/85%/);assert.match(run('Budget status').answer,/80% used/);assert.match(run('Compare spending this month').answer,/\$85.00.*versus.*\$20.00/);
 assert.match(ask('I have 15 minutes').answer,/No unfinished tasks/);assert.match(ask('I have 30 minutes').answer,/Finish work/);
});
test('affordability distinguishes available funds from remaining budget',()=>{const a=ask('Can I afford $100?').answer;assert.match(a,/\$350.00/);assert.match(a,/exceed that budget by .*\$50.00/);});
test('draft followups collect missing title and amount without writing records',()=>{let r=ask('add expense');assert.equal(r.context.field,'title');r=ask('lunch',user,r.context);assert.equal(r.context.field,'amount');assert.equal(ask('-4',user,r.context).context.field,'amount');r=ask('15.50',user,r.context);assert.equal(r.action.initial.amount,15.5);assert.equal(r.action.initial.title,'lunch');assert.equal(data.entries.length,2);});
test('conversational aliases and report followups work',()=>{assert.equal(ask('I spent 15 for lunch').action.type,'expense');assert.match(ask('Plan my day').answer,/30 estimated minutes/);const r=ask('My savings');assert.match(ask('and this week',user,r.context).answer,/Savings balance/);});
test('private records stay protected across advice and followups',()=>{const limited={role:'user',permissions:['tasks']};for(const q of ['Can I afford 100?','Savings goals','Review subscriptions','How can I save more?'])assert.match(ask(q,limited).answer,/does not have Money access/);assert.match(ask('lunch',limited,ask('add expense').context).answer,/access changed/);});
