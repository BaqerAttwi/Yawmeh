import test from 'node:test';
import assert from 'node:assert/strict';
import {languageProfile,detectedCompanionLanguage} from '../../shared/lebanese-language.js';
import {localCompanion} from '../../shared/local-companion.js';
import {isLocalCompanionFollowup} from '../../shared/companion-followup.js';
import {microphoneLocale} from '../../shared/companion-voice-language.js';
const date='2026-11-05',data={settings:{last_currency:'USD'},entries:[],tasks:[],subscriptions:[]};
const ask=(text,context=null)=>localCompanion(data,{role:'admin'},text,date,{start:date,end:date},context);

// Hand-authored regression examples, not a representative benchmark or training corpus.
const arabic=[
 'bade zid subscription Claude b 20 dollar','bdi zid 3al subscription Claude b 20 dollar',
 'ana dfa3et 15 dollar 3a coffee','sraft 15$ 3al lunch','baddi sarfet 15 dollar 3a lunch',
 'bade 2ebedet 500 dollar mn freelance','bdi zakkerni call Mama bokra 3al se3a 9 masa',
 'shou 3ende lyom','chou 3andi bokra','bade a3ref adde sarfet halshaher','kif fini waffer aktar',
 '3ande 15 da2aye2','ana ma3e 500 USD','b7eb sa3edne bhal mawdu3','halla2 shou ba3mel',
 'mesh 3am efham 3lek','bade add task read book bokra','hello شو عندي اليوم','مرحبا','بدي ضيف مصروف ١٥ دولار',
 'أنا دفعت ٢٠ دولار عالغدا','كيف فيني وفّر أكتر؟','شو عندي بكرا؟','kifak','keefak','ya3ne shou',
];
const english=[
 'I paid for Merci chocolates','Add task call Fik tomorrow','I need B2B and 2FA support',
 'Explain GPT4 and Office365','Remind me at 3am','add task visit أحمد tomorrow','show my expenses',
 'plan my day','Explain why ya3ne is written this way','Please record income 500 USD from work',
];
test('Auto detects varied Lebanese, Arabizi and mixed writing without product-code false positives',()=>{
 for(const text of arabic)assert.equal(detectedCompanionLanguage('auto',text,'en'),'ar',text);
 for(const text of english)assert.equal(detectedCompanionLanguage('auto',text,'ar'),'en',text);
 for(const text of ['500','٥٠٠','2026-11-16','15 USD','USD 500','LBP','okay','merci','تمام','Claude'])assert.equal(detectedCompanionLanguage('auto',text,'ar'),'ar',text);
 assert.equal(detectedCompanionLanguage('en','bade zid task'),'en');assert.equal(detectedCompanionLanguage('ar','show my expenses'),'ar');
 assert.equal(microphoneLocale('auto',detectedCompanionLanguage('auto','bdi zakkerni bokra')),'ar-LB');
 assert.equal(languageProfile('bade add task').script,'arabizi');
});
test('Arabizi requests preserve amounts, names, dates and permissions',()=>{
 for(const text of ['sraft 15$ 3al lunch','ana dfa3et 15 dollar 3a lunch','baddi sarfet 15 dollar 3a lunch']){
  const reply=ask(text);assert.equal(reply.action?.type,'expense',text);assert.equal(reply.action.initial.title,'lunch',text);assert.equal(reply.action.initial.amount,15);assert.equal(reply.action.initial.currency,'USD');
 }
 for(const text of ['bade zid subscription Claude b 20 dollar','bdi zid 3al subscription Claude b 20 dollar']){
  const draft=ask(text).action;assert.equal(draft.type,'subscription');assert.equal(draft.initial.title,'Claude');assert.equal(draft.initial.amount,20);
 }
 const income=ask('bade 2ebedet 500 dollar mn freelance').action;assert.equal(income.type,'income');assert.equal(income.initial.amount,500);
 const task=ask('bdi zakkerni call Mama bokra 3al se3a 9 masa').action;assert.equal(task.initial.title,'call Mama');assert.equal(task.initial.due,'2026-11-06');assert.equal(task.initial.scheduled_time,'21:00');
 const restricted=localCompanion(data,{role:'user',permissions:['tasks']},'bade zid subscription Claude b 20 dollar',date,{start:date,end:date});assert.equal(restricted.action,undefined);
 assert.equal(ask('bdi zakkerni call Mama ba3d bokra').action,undefined,'unclear supported dates must not become tomorrow');
 assert.equal(data.entries.length,0);
});
test('Arabizi follow-ups retain drafts, but a fresh Arabizi request escapes them',()=>{
 const context=ask('add expense').context;
 assert.equal(isLocalCompanionFollowup('bade zid subscription Claude b 20 dollar',context),false);
 assert.equal(ask('bade zid subscription Claude b 20 dollar',context).action.type,'subscription');
 const expense=ask('sraft 15 dollar 3a lunch');
 const corrected=ask('khalliha bokra',expense.context);assert.equal(corrected.action.initial.date,'2026-11-06');assert.equal(corrected.action.initial.title,'lunch');
 const clock=ask('bdi zakkerni call Mama bokra se3a 9');assert.equal(clock.context.field,'time');
 const resolved=ask('9 masa',clock.context);assert.equal(resolved.action.initial.scheduled_time,'21:00');
});
