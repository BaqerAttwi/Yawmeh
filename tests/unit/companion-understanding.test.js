import test from 'node:test';
import assert from 'node:assert/strict';
import {localCompanion} from '../../shared/local-companion.js';
import {isLocalCompanionFollowup} from '../../shared/companion-followup.js';
import {companionStatusMessage} from '../../shared/companion-status.js';
const data={settings:{last_currency:'USD'},entries:[],tasks:[],subscriptions:[]},user={role:'admin'},date='2026-11-04';
const ask=(text,context=null,account=user)=>localCompanion(data,account,text,date,{start:date,end:date},context);
test('screenshot savings wording prepares a reviewable draft with its amount and currency',()=>{
 for(const text of ['add to saving $500','add to savings $500','put $500 into my savings','deposit 500 USD in savings']){
  const reply=ask(text);assert.equal(reply.action?.type,'opening',text);assert.equal(reply.action.initial.amount,500,text);assert.equal(reply.action.initial.currency,'USD',text);assert.match(reply.answer,/Nothing has been saved/);
 }
 assert.equal(ask('add to saving $500',null,{role:'user',permissions:['tasks']}).action,undefined);
 assert.deepEqual(data.entries,[]);
});
test('natural Arabic income, expense and savings preserve amounts and request missing details',()=>{
 for(const [text,type] of [['انا صرفت اليوم ٥٠٠','expense'],['انا استلمت اليوم 500','income'],['انا قبضت اليوم 500','income'],['ضيف مدخرات 500 دولار','opening']]){
  const reply=ask(text),draft=reply.action||reply.context?.draft;assert.equal(draft?.type,type,text);assert.equal(draft.initial.amount,500,text);assert.equal(draft.initial.date,date,text);
 }
 for(const text of ['انا استلفت اليوم 500','انا سلفت 500']){const reply=ask(text);assert.equal(reply.action,undefined);assert.equal(reply.context?.draft,undefined);assert.match(reply.answer,/ديون/);}
});
test('fresh questions and commands escape pending drafts while short details stay local',()=>{
 const pending=ask('add task').context;
 for(const text of ['why are you asking questions?','add to saving $500','انا صرفت اليوم 500'])assert.equal(isLocalCompanionFollowup(text,pending),false,text);
 assert.equal(ask('add to saving $500',pending).action.type,'opening');
 assert.equal(isLocalCompanionFollowup('Take a break',pending),true);
 assert.equal(ask('Take a break',pending).action.initial.title,'Take a break');
 assert.equal(ask('why are you asking questions?',pending).action,undefined);
});
test('public AI notices distinguish quota, configuration and connection failures in both languages',()=>{
 assert.notEqual(companionStatusMessage('provider_quota'),companionStatusMessage('provider_auth'));
 assert.match(companionStatusMessage('allowance_reached'),/app AI allowance/);
 assert.match(companionStatusMessage('missing_key','ar'),/مش مُعدّ/);
 assert.equal(companionStatusMessage('some private provider error'),companionStatusMessage('unavailable'));
});
