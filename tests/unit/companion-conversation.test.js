import test from 'node:test';
import assert from 'node:assert/strict';
import {localCompanion} from '../../shared/local-companion.js';
import {companionLanguage,presentReply} from '../../shared/companion-presentation.js';
import {isLocalCompanionFollowup} from '../../shared/companion-followup.js';
import {microphoneLocale,replyLocale,selectDeviceVoice} from '../../shared/companion-voice-language.js';
import {demoData} from '../../client/src/features/demo/data.js';

const user={role:'admin'},date='2026-11-03',data={settings:{last_currency:'USD'},entries:[],tasks:[],subscriptions:[]};
const ask=(question,context=null,account=user)=>localCompanion(data,account,question,date,{start:date,end:date},context);

test('English, Lebanese, Arabizi, mixed input and polite prefixes preserve draft facts',()=>{
 for(const question of ['I spent 15 USD for lunch','صرفت ١٥ دولار على lunch','بدي ضيف مصروف 15 دولار على lunch','baddi sarfet 15 dollar 3a lunch','please sarfet 15 dollar 3a lunch']){
  const reply=ask(question);assert.equal(reply.action?.type,'expense',question);assert.equal(reply.action.initial.amount,15,question);assert.equal(reply.action.initial.currency,'USD');assert.equal(reply.action.initial.title,'lunch');
 }
 for(const question of ['ذكرني فوتبول بكرا الساعة ٩ المسا','بليز ذكرني فوتبول بكرا الساعة 9 المسا','baddi zakerne football bokra se3a 9 masa']){
  const draft=ask(question).action;assert.equal(draft.type,'task',question);assert.equal(draft.initial.due,'2026-11-04');assert.equal(draft.initial.scheduled_time,'21:00');
 }
 for(const question of ['kifak','keefak','اهلا'])assert.match(presentReply(ask(question),'ar').answer,/أهلا|اهلا/);
});

test('follow-up corrections preserve other fields, dates, currencies and confirmation requirements',()=>{
 const first=ask('صرفت 15 دولار على الغدا'),original=structuredClone(first.context);
 for(const question of ['change the amount to 20','make it 20','غير المبلغ ٢٠','خليها 20']){
  assert.equal(isLocalCompanionFollowup(question,first.context),true);
  const reply=ask(question,first.context);assert.equal(reply.action.initial.amount,20,question);assert.equal(reply.action.initial.title,'الغدا');assert.equal(reply.action.initial.currency,'USD');assert.equal(reply.context.draft.initial.amount,20);
 }
 for(const question of ['I meant Lebanese pounds','قصدي ليرة لبنانية','غير العملة LBP']){
  const reply=ask(question,first.context);assert.equal(reply.action.initial.currency,'LBP',question);assert.equal(reply.action.initial.amount,15);
 }
 for(const question of ['make it tomorrow','خليها بكرا','khalliha bokra'])assert.equal(ask(question,first.context).action.initial.date,'2026-11-04',question);
 const renamed=ask('غير الاسم غدا مع الأصحاب',first.context);assert.equal(renamed.action.initial.title,'غدا مع الأصحاب');
 assert.equal(ask('غير الاسم لبنان',first.context).action.initial.title,'لبنان');
 assert.deepEqual(first.context,original,'Corrections never mutate the existing draft or saved records');
 assert.deepEqual(data.entries,[]);
});

test('ambiguous, invalid and forbidden draft corrections do not create actions',()=>{
 const expense=ask('add expense 15 USD for lunch').context,task=ask('add task called football tomorrow at 9 pm').context;
 for(const question of ['change the amount to -5','change the amount to 1000000000','change currency to XYZ','make it 2026-02-30']){
  const reply=ask(question,expense);assert.equal(reply.action,undefined,question);assert.deepEqual(reply.context,expense);
 }
 assert.equal(ask('change time to 9',task).action,undefined);
 assert.equal(ask('غير الوقت 10 المسا',task).action.initial.scheduled_time,'22:00');
 assert.equal(ask('change time to 09:30',task).action.initial.scheduled_time,'09:30');
 assert.equal(ask('make it tomorrow',expense,{role:'user',permissions:['tasks']}).action,undefined);
 assert.equal(ask('make it tomorrow').action,undefined);
 assert.equal(ask('قصدي ليرة',task).action,undefined);
 assert.equal(ask('الغي',expense).context,undefined);
});

test('Arabic common reports translate built-in headings while preserving user titles and values',()=>{
 const records=demoData();
 for(const question of ['help','report today','plan my day','what is my next task?','show overdue tasks','upcoming tasks','what have I completed today?','recent expenses','largest expense this month','budget status','review subscriptions','savings goals','compare spending this month']){
  const source=localCompanion(records,user,question,date,{start:date,end:date}),reply=presentReply(source,'ar');
  assert.equal(!!reply.hasEnglishDetails,false,question);assert.match(reply.answer,/\p{Script=Arabic}/u,question);
  assert.deepEqual(reply.answer.match(/\d{4}-\d{2}-\d{2}/g),source.answer.match(/\d{4}-\d{2}-\d{2}/g),question);
 }
 for(const text of ['LBP','15 USD','okay','thanks'])assert.equal(companionLanguage('auto',text,'ar'),'ar');
 assert.equal(companionLanguage('en','صرفت 15'),'en');assert.equal(companionLanguage('ar','expenses'),'ar');
});

test('voice locale follows explicit microphone choice and declared reply language',()=>{
 assert.equal(microphoneLocale('auto','ar'),'ar-LB');assert.equal(microphoneLocale('ar-LB','en'),'ar-LB');assert.equal(microphoneLocale('en-US','ar'),'en-US');
 assert.equal(replyLocale({language:'en',answer:'Task: درس عربي'}),'en-US');assert.equal(replyLocale({language:'ar',answer:'Lunch 15 USD'}),'ar-LB');
 const voices=[{voiceURI:'en',lang:'en-US'},{voiceURI:'ar-online',lang:'ar-SA'},{voiceURI:'ar-local',lang:'ar-AE',localService:true},{voiceURI:'ar-lb',lang:'ar-LB'}];
 assert.equal(selectDeviceVoice(voices,'ar-LB').voiceURI,'ar-lb');assert.equal(selectDeviceVoice(voices,'ar-LB','ar-online').voiceURI,'ar-online');
 assert.equal(selectDeviceVoice(voices.slice(0,3),'ar-LB').voiceURI,'ar-local');assert.equal(selectDeviceVoice(voices,'fr-FR'),undefined);
});

test('an ambiguous task time retains the task and accepts a short follow-up',()=>{
 for(const prefix of ['add task','add to task','add to my tasks','create a new task','make a task','remind me to','remind me']){
  const first=ask(prefix+' take a breake at 1');
  assert.equal(first.action,undefined,prefix);assert.equal(first.context?.field,'time',prefix);
  assert.equal(first.context.draft.initial.title,'take a breake',prefix);
  assert.equal(first.context.draft.initial.due,date);
  const stillAmbiguous=ask('at 1',first.context);assert.equal(stillAmbiguous.context.field,'time');assert.equal(stillAmbiguous.action,undefined);
  for(const time of ['at 1 pm','1 pm','13:00','at 1 p.m.','الساعة ١ المسا']){
   const reply=ask(time,first.context);assert.equal(reply.action?.initial.scheduled_time,'13:00',prefix+' / '+time);assert.equal(reply.action.initial.title,'take a breake');assert.equal(reply.action.initial.due,date);
  }
 }
 const ready=ask('add to task take a breake at 1 pm');assert.equal(ready.action.initial.scheduled_time,'13:00');
 assert.equal(ask('cancel',ask('add task rest at 1').context).context,undefined);
 assert.equal(ask('1 pm',ask('add task rest at 1').context,{role:'user',permissions:['money']}).action,undefined);
});

test('invalid task dates retain title and time until a valid date is supplied',()=>{
 const first=ask('add task take a break on 2026-02-30 at 1 pm');assert.equal(first.context?.field,'date');assert.equal(first.action,undefined);
 const reply=ask('tomorrow',first.context);assert.equal(reply.action.initial.title,'take a break');assert.equal(reply.action.initial.due,'2026-11-04');assert.equal(reply.action.initial.scheduled_time,'13:00');
 assert.equal(ask('2026-02-30',first.context).action,undefined);
});
