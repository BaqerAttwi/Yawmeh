import test from 'node:test';
import assert from 'node:assert/strict';
import {readCompanionHistory,writeCompanionHistory,rememberConversation,historyKey} from '../../shared/companion-history.js';

const now=Date.now(),user={role:'user',permissions:['tasks']};
const draft={type:'task',initial:{title:'Football',due:'2026-10-16',scheduled_time:'21:00'}};
const row={id:'sample',updated:now,text:'change that to tomorrow',start:'2026-10-15',end:'2026-10-15',context:{draft},messages:[{id:1,question:'add task Football',answer:'Draft ready.',language:'en',action:draft}]};

test('chat history roundtrips partial and ready drafts, scoped to permissions and storage key',()=>{
 const restored=readCompanionHistory(writeCompanionHistory([row],user),user,now);
 assert.deepEqual(restored,[row]);
 assert.deepEqual(readCompanionHistory(writeCompanionHistory([row],user),{role:'user',permissions:['money']},now),[]);
 assert.notEqual(historyKey('demo:1'),historyKey('live:1'));
 assert.notEqual(historyKey('live:1'),historyKey('live:2'));
 const pending={...row,context:{draft:{type:'task',initial:{}},field:'title'}};
 assert.deepEqual(readCompanionHistory(writeCompanionHistory([pending],user),user,now)[0].context,pending.context);
});

test('history rejects corrupted, stale, future, forbidden and oversized data',()=>{
 for(const raw of ['{','null','x'.repeat(1000001)])assert.deepEqual(readCompanionHistory(raw,user,now),[]);
 for(const changed of [{...row,updated:now-31*86400000},{...row,updated:now+120000},{...row,context:{draft:{type:'expense',initial:{amount:10}}}},{...row,messages:[{...row.messages[0],action:{type:'script',initial:{}}}]}])assert.deepEqual(readCompanionHistory(writeCompanionHistory([changed],user),user,now),[]);
});

test('remembering caps recent chats, replaces current conversation, and ignores empty sessions',()=>{
 let recent=[];
 for(let i=0;i<8;i++)recent=rememberConversation(recent,{...row,id:String(i)});
 assert.equal(recent.length,5);assert.equal(recent[0].id,'7');
 recent=rememberConversation(recent,{...row,id:'7',text:'new text'});
 assert.equal(recent.length,5);assert.equal(recent[0].text,'new text');
 assert.equal(rememberConversation(recent,{...row,id:'7',messages:[],text:' '}).length,4);
});
