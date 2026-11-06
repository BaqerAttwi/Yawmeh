import test from 'node:test';
import assert from 'node:assert/strict';
import {chatDictionary,dictionaryWord,normalizeChatRequest} from '../../shared/chat-dictionary.js';
import {localCompanion} from '../../shared/local-companion.js';
import {detectedCompanionLanguage} from '../../shared/lebanese-language.js';
const data={settings:{last_currency:'USD'},entries:[],tasks:[],subscriptions:[]},user={role:'admin'},date='2026-11-06';
const ask=q=>localCompanion(data,user,q,date,{start:date,end:date});
test('dictionary shares aliases and bounded typo matching across the request grammar',()=>{
 assert.ok(chatDictionary.length>20);
 for(const word of ['subscriptiom','subscripton','subscirption','subscribtion'])assert.equal(dictionaryWord(word,['object'])?.entry.id,'subscription',word);
 assert.equal(dictionaryWord('incoem',['object']).entry.id,'income');
 assert.equal(dictionaryWord('a',['verb']),null);
 assert.equal(dictionaryWord('123.45',['object']),null);
 assert.equal(dictionaryWord('b2b',['object']),null);
});
test('typos and stretched Lebanese writing create drafts while preserving the entire value suffix',()=>{
 const request='Baddiii zed subscriptiom Claudee b 20.50 dollar on 2026-11-16';
 const normalized=normalizeChatRequest(request);assert.equal(normalized.text,'bade zid subscription Claudee b 20.50 dollar on 2026-11-16');assert.ok(normalized.changes.some(c=>c.kind==='typo'));
 const draft=ask(request).action;assert.equal(draft.type,'subscription');assert.equal(draft.initial.title,'Claudee');assert.equal(draft.initial.amount,20.50);assert.equal(draft.initial.renewal,'2026-11-16');
 assert.equal(detectedCompanionLanguage('auto',request,'en'),'ar');
 for(const request of ['recrod expnese 15 USD for MyCaffe','can you add expnese 15 USD for MyCaffe']){
  const draft=ask(request).action;assert.equal(draft?.type,'expense',request);assert.equal(draft.initial.amount,15);assert.equal(draft.initial.title,'MyCaffe');
 }
 assert.equal(normalizeChatRequest('بدييي ضييف اشتراااك Claudee ب 20 دولار').text,'bade zid subscription Claudee ب 20 دولار');
 const task=ask('baddiii zakkernii call Claudee bokra se3a 9 masa').action;assert.equal(task.type,'task');assert.equal(task.initial.title,'call Claudee');assert.equal(task.initial.scheduled_time,'21:00');
 const income=ask('2ebedtt 500 dollar mn work').action;assert.equal(income.type,'income');assert.equal(income.initial.amount,500);
});
test('dictionary does not correct names, financial values, quoted text or unsupported actions',()=>{
 for(const request of ['delete subscription Claude','pay subscription Claude','remove task call Mama','"add subscriptiom" is a phrase','I met Zed yesterday'])assert.equal(normalizeChatRequest(request).text,request);
 const suffix=' "Subscriptiom Cafe" 20.50 LBP 2026-11-16 3pm GPT4';assert.ok(normalizeChatRequest('add subscriptiom'+suffix).text.endsWith(suffix));
 assert.equal(normalizeChatRequest('add task Meet Zedd and Claudee tomorrow').text,'add task Meet Zedd and Claudee tomorrow');
 assert.equal(dictionaryWord('xx'.repeat(1000),['object']),null);assert.equal(data.entries.length,0);
});
