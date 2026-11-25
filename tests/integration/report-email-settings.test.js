import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createApp} from '../../server/src/app.js';
import {tokenHash} from '../../server/src/modules/auth/passwords.js';
import {memoryDatabase} from '../helpers/memory-db.js';

test('report emails require permission and an explicit opt-in for the saved destination',async t=>{
  const users=[
    {id:1,name:'Reader',email:'reader@test.local',reminder_email:'',role:'user',active:true,permissions:['money']},
    {id:2,name:'Member',email:'member@test.local',reminder_email:'member@test.local',role:'user',active:true,permissions:[]},
  ];
  const sessions=new Map(users.map((user,index)=>[tokenHash(['a','b'][index].repeat(64)),user]));
  const server=createApp({db:memoryDatabase({},users),authStore:{session:async hash=>sessions.get(hash)},recoveryOptions:null}).listen(0,'127.0.0.1');
  await once(server,'listening');
  t.after(()=>{server.closeAllConnections();server.close();});
  const url=`http://127.0.0.1:${server.address().port}/api`;
  const send=(letter,path,body)=>fetch(url+path,{method:'PUT',headers:{'content-type':'application/json',cookie:'daywell_session='+letter.repeat(64)},body:JSON.stringify(body)});
  const toggle=(letter,enabled)=>send(letter,'/settings/report-emails',{enabled});
  const settings=email=>send('a','/settings',{name:'Reader',email});
  assert.equal((await toggle('b',true)).status,403);
  assert.equal((await toggle('a',true)).status,400);
  assert.equal((await settings('first@test.local')).status,200);
  assert.equal((await toggle('a',true)).status,200);
  assert.equal(users[0].report_emails,true);
  assert.equal((await settings('first@test.local')).status,200);
  assert.equal(users[0].report_emails,true);
  assert.equal((await settings('second@test.local')).status,200);
  assert.equal(users[0].report_emails,false);
  assert.equal(users[0].reminder_email,'second@test.local');
});
