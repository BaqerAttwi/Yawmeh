import test from 'node:test';
import assert from 'node:assert/strict';
import {availableCompanionRequests,companionRequests,commonRequestAlias} from '../../shared/companion-requests.js';
import {localCompanion} from '../../shared/local-companion.js';
import {demoData} from '../../client/src/features/demo/data.js';
import {isLocalCompanionFollowup} from '../../shared/companion-followup.js';
import {companionReportRequest} from '../../shared/companion-report-ai.js';
const date='2026-11-05',data=demoData(),admin={role:'admin'};
const ask=(q,user=admin)=>localCompanion(data,user,q,date,{start:date,end:date});
test('researched example library includes three writing styles and respects app access',()=>{
 assert.ok(companionRequests.length>=20);
 for(const row of companionRequests){assert.equal(row.examples.length,3);assert.ok(row.examples.every(x=>typeof x==='string'&&x.length>0));}
 const restricted=availableCompanionRequests({role:'user',permissions:['tasks']});
 assert.equal(restricted.some(row=>row.group==='money'||row.permission==='money'),false);
 assert.ok(restricted.some(row=>row.group==='tasks'));
});
test('query aliases map to supported record reports without writing data',()=>{
 const before=structuredClone(data);
 for(const row of companionRequests.filter(row=>row.canonical))for(const alias of row.aliases){
  assert.equal(commonRequestAlias(alias),row.canonical,alias);
  assert.equal(ask(alias).answer,ask(row.canonical).answer,alias);
  assert.equal(ask(alias).action,undefined,alias);
 }
 assert.deepEqual(data,before);
});
test('action examples create the expected drafts in English, Lebanese and Arabizi',()=>{
 for(const [id,type] of [['task','task'],['expense','expense'],['income','income'],['savings','opening'],['subscription','subscription']]){
  for(const example of companionRequests.find(row=>row.id===id).examples){const reply=ask(example);assert.equal(reply.action?.type,type,example);}
 }
 for(const text of companionRequests.find(row=>row.id==='quick').examples)assert.doesNotMatch(ask(text).answer,/What would you like help with/);
});
test('general coaching and writing questions do not become pending task titles',()=>{
 const context=ask('add task').context;
 for(const text of ['Help me write a polite message','bade message mratabe la follow up','sa3edne 2assem project la small steps'])assert.equal(isLocalCompanionFollowup(text,context),false,text);
});

test('report recommendations recognize all advertised writing styles and check access',()=>{
 for(const [id,kind] of [['plan','day_plan'],['tomorrow_plan','day_plan'],['save_more','saving_advice'],['weekly_review','review'],['monthly_review','review']]){
  for(const phrase of companionRequests.find(row=>row.id===id).examples)assert.equal(companionReportRequest(phrase,admin)?.kind,kind,phrase);
 }
 assert.equal(companionReportRequest('How should I plan my day?',admin)?.kind,'day_plan');
 assert.equal(companionReportRequest('Suggest ways to save money',admin)?.kind,'saving_advice');
 assert.deepEqual(companionReportRequest('Monthly report',admin),{kind:'review',command:'report this month'});
 assert.deepEqual(companionReportRequest('Report last month',admin),{kind:'review',command:'report last month'});
 assert.match(ask('Monthly report').answer,/2026-11-01 through 2026-11-30/);
 assert.equal(companionReportRequest('Plan my day; add a task',admin),null);
 assert.equal(companionReportRequest('Plan my day',{role:'user',permissions:['money']}),null);
 assert.equal(companionReportRequest('Weekly report',{role:'user',permissions:[]}),null);
});
