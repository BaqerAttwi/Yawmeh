import test from 'node:test';
import assert from 'node:assert/strict';
import {speechTranscript} from '../../shared/speech-transcript.js';
import {localCompanion} from '../../shared/local-companion.js';
const results=words=>words.map(transcript=>[{transcript}]);
test('mobile cumulative English and Arabic hypotheses form a single sentence',()=>{
 assert.equal(speechTranscript(results(['add','add to','add to the','add to the subscription','add to the subscription $20','add to the subscription $20 for Claude'])),'add to the subscription $20 for Claude');
 assert.equal(speechTranscript(results(['زيدي','زيدي عالسبسكريبشن','زيدي عالسبسكريبشن كلود','زيدي عالسبسكريبشن كلود ب 20 دولار','زيدي عالسبسكريبشن كلود ب 20 دولار 16 الشهر'])),'زيدي عالسبسكريبشن كلود ب 20 دولار 16 الشهر');
});
test('overlapping chunks merge while distinct phrases and repeated words inside a phrase remain',()=>{
 assert.equal(speechTranscript(results(['add to the subscription','the subscription $20','subscription $20 for Claude'])),'add to the subscription $20 for Claude');
 assert.equal(speechTranscript(results(['a very very good day','then take a break'])),'a very very good day then take a break');
 assert.equal(speechTranscript(results(['plan my day','plan my day'])),'plan my day');
 assert.equal(speechTranscript(results([' '.repeat(3), 'hello'])),'hello');
 assert.equal(speechTranscript(results(['x'.repeat(1100)])).length,1000);
});
test('subscription requests from the screenshots produce single, reviewable drafts',()=>{
 const data={settings:{},entries:[],tasks:[],subscriptions:[]},user={role:'admin'},date='2026-11-04';
 for(const [question,title] of [['add to the subscription $20 for Claude','Claude'],['زيدي عالسبسكريبشن كلود ب 20 دولار 16 الشهر','كلود']]){
  const reply=localCompanion(data,user,question,date,{start:date,end:date});
  assert.equal(reply.action?.type,'subscription',question);assert.equal(reply.action.initial.amount,20);assert.equal(reply.action.initial.title,title);
  assert.equal(reply.action.initial.renewal,question.includes('16')?'2026-11-16':date);
 }
 assert.equal(data.subscriptions.length,0);
});
