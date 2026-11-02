import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createApp} from '../../server/src/app.js';
import {tokenHash} from '../../server/src/modules/auth/passwords.js';
import {welcomeMessage} from '../../server/src/modules/auth/recovery.js';

test('welcome email escapes names and includes an expiring setup link, never a password',()=>{
 const message=welcomeMessage('<img src=x>', 'a'.repeat(64),'https://yawmeh.me');
 assert.match(message.html,/&lt;img src=x&gt;/);
 assert.doesNotMatch(message.html,/<img/);
 assert.match(message.text,/https:\/\/yawmeh.me\/#reset=a{64}/);
 assert.match(message.text,/30 minutes/);
 assert.match(message.text,/Forgot password/);
});

test('owner invitations hash tokens, report send failure without losing accounts, and require configured email for passwordless creation',async t=>{
 const created=[],issued=[],sent=[];let configured=true,fail=false;
 const owner={id:1,name:'Owner',email:'owner@test.local',role:'admin',active:true,permissions:[]};
 const authStore={session:async()=>owner,create:async value=>{created.push(value);return created.length+1;}};
 const server=createApp({db:{},authStore,recoveryOptions:{configured:()=>configured,recovery:{issue:async(...args)=>issued.push(args)},sendWelcome:async(...args)=>{if(fail)throw new Error('provider secret');sent.push(args);}}}).listen(0,'127.0.0.1');
 await once(server,'listening');t.after(()=>{server.closeAllConnections();server.close();});
 const call=async()=>{
  const response=await fetch(`http://127.0.0.1:${server.address().port}/api/admin/users`,{method:'POST',headers:{'content-type':'application/json',cookie:'daywell_session='+'a'.repeat(64)},body:JSON.stringify({name:'Member',email:'member@test.local',permissions:['tasks']})});
  return {status:response.status,body:await response.json()};
 };
 const success=await call();assert.equal(success.status,201);assert.equal(success.body.invitation,'sent');
 assert.equal(issued[0][1],tokenHash(sent[0][1]));assert.notEqual(issued[0][1],sent[0][1]);
 assert.equal(sent[0][0],'member@test.local');assert.equal(sent[0][2],'Member');
 assert.doesNotMatch(JSON.stringify(success.body),/password|token|secret/);
 assert.ok(created[0].password_hash);
 fail=true;const failure=await call();assert.equal(failure.status,201);assert.equal(failure.body.invitation,'failed');assert.equal(created.length,2);
 configured=false;assert.equal((await call()).status,503);assert.equal(created.length,2);
});
