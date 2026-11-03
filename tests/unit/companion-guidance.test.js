import test from 'node:test';
import assert from 'node:assert/strict';
import {guidanceChoices} from '../../shared/companion-guidance.js';
import {localCompanion} from '../../shared/local-companion.js';
import {presentReply} from '../../shared/companion-presentation.js';
import {companionContextSchema} from '../../shared/companion-ai.js';
const data={entries:[],tasks:[],settings:{},subscriptions:[]},owner={role:'admin'},date='2026-11-03';
const ask=(question,context=null,user=owner)=>localCompanion(data,user,question,date,{start:date,end:date},context);

test('broad goals ask a focused question instead of guessing a write',()=>{
 for(const question of ['I have too much to do','عندي كتير شغل']){const result=ask(question);assert.equal(result.context.goal,'tasks');assert.equal(result.action,undefined);}
 for(const question of ['help manage my money','reduce my spending','خفف مصاريفي']){const result=ask(question);assert.equal(result.context.goal,'money');assert.equal(result.action,undefined);}
 const first=ask('I need help');assert.equal(first.context.goal,'choose_topic');assert.equal(companionContextSchema.safeParse(first.context).success,true);
 const next=ask('money',first.context);assert.equal(next.context.goal,'money');
 const choices=guidanceChoices(next.context.goal,owner,'en');assert.equal(choices.length,3);
 const draft=ask(choices.find(c=>c.question==='add expense').question,next.context);assert.equal(draft.context.field,'title');assert.equal(draft.action,undefined);
 assert.deepEqual(data.entries,[]);
});

test('guided choices remain permission scoped and Arabic replies are localized',()=>{
 const tasksOnly={role:'user',permissions:['tasks']},moneyOnly={role:'user',permissions:['money']};
 assert.equal(ask('help me',null,tasksOnly).context.goal,'tasks');assert.equal(ask('help me',null,moneyOnly).context.goal,'money');
 assert.match(ask('manage my money',null,tasksOnly).answer,/does not have Money access/);
 assert.deepEqual(guidanceChoices('money',tasksOnly,'ar'),[]);
 assert.deepEqual(guidanceChoices('choose_topic',tasksOnly,'en').map(c=>c.question),['tasks']);
 assert.match(presentReply(ask('I need help'),'ar').answer,/بشو بدّك مساعدة/);
 assert.match(presentReply(ask('too much to do'),'ar').answer,/خلّينا/);
});
