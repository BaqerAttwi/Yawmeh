import test from 'node:test';
import assert from 'node:assert/strict';
import {localCompanion} from '../../shared/local-companion.js';
import {companionAITimeout} from '../../server/src/modules/ai/companion.js';
const date='2026-11-06',data={settings:{last_currency:'USD'},entries:[],tasks:[],subscriptions:[]},user={role:'admin'};
const ask=(question,context)=>localCompanion(data,user,question,date,{start:date,end:date},context);

test('short service requests ask a focused question and retain the name for a priced follow-up',()=>{
 for(const question of ['add Claude','bde zid Claude','بدي ضيف Claude','Baddiii zed Claude']){
  const first=ask(question);assert.equal(first.context?.field,'amount',question);assert.equal(first.context.draft.initial.title,'Claude');assert.equal(first.action,undefined);
  assert.match(first.answer,/Claude/);assert.match(first.answer,/subscription|اشتراك/);
  for(const amount of ['20 dollars','20 USD','20 دولار','20 dollar','yes, 20 dollars']){
   const next=ask(amount,first.context);assert.equal(next.action?.initial.amount,20,question+' → '+amount);assert.equal(next.action.initial.title,'Claude');assert.equal(next.action.type,'subscription');
  }
  assert.equal(ask('cancel',first.context).context,undefined);
  assert.equal(ask('no',first.context).context,undefined);
  assert.equal(ask('add task call Mama tomorrow at 9 pm',first.context).action.type,'task');
 }
 assert.equal(ask('add Claude',{draft:{type:'task',initial:{title:'Old'}},field:'date'}).context.draft.initial.title,'Claude');
 assert.equal(localCompanion(data,{permissions:['tasks']},'add Claude',date,{start:date,end:date}).action,undefined);
});
test('equivalent Arabic, Arabizi, mixed and typo requests produce the same subscription draft',()=>{
 const requests=['add subscription Claude 20 USD','ضيف اشتراك Claude ب 20 دولار','bde zid subscription Claude b 20 dollar','Baddiii zed subscriptiom Claude b 20 dollar'];
 const before=JSON.stringify(data);
 for(const question of requests){const result=ask(question);assert.equal(result.action?.type,'subscription',question);assert.equal(result.action.initial.title,'Claude');assert.equal(result.action.initial.amount,20);}
 assert.equal(JSON.stringify(data),before);
});
test('money followups keep known details and reject foreign currencies and invalid amounts',()=>{
 const first=ask('add subscription Claude');
 for(const value of ['0 USD','-20 USD','1000000000 USD','20 LBP','twenty-ish']){const reply=ask(value,first.context);assert.equal(reply.action,undefined,value);assert.equal(reply.context.draft.initial.title,'Claude');}
 const expense=ask('add expense for lunch');const next=ask('15 dollars',expense.context);assert.equal(next.action.initial.title,'lunch');assert.equal(next.action.initial.currency,'USD');assert.equal(next.action.initial.amount,15);
});
test('AI deadline is bounded below the browser deadline',()=>{
 assert.equal(companionAITimeout({}),40000);assert.equal(companionAITimeout({COMPANION_AI_TIMEOUT_MS:'bad'}),40000);assert.equal(companionAITimeout({COMPANION_AI_TIMEOUT_MS:'999999'}),40000);assert.equal(companionAITimeout({COMPANION_AI_TIMEOUT_MS:'1'}),5000);
});
