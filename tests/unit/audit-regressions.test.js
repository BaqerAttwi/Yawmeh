import test from 'node:test';
import assert from 'node:assert/strict';
import {addDays,nextTaskValues,calendarEvents} from '../../shared/planner.js';
import {nextRenewal} from '../../shared/domain.js';
import {rescheduled} from '../../shared/daily.js';
import {mysqlAuthStore,createAuth} from '../../server/src/modules/auth/auth.js';
import {hashPassword} from '../../server/src/modules/auth/passwords.js';
import express from 'express';
import {once} from 'node:events';

test('calculated dates cannot escape the database date range',()=>{
 assert.throws(()=>addDays('1000-01-01',-1),/Choose a date/);
 assert.throws(()=>addDays('9999-12-31',1),/Choose a date/);
 assert.throws(()=>nextTaskValues({due:'9999-12-31',recurrence:'daily'},'9999-12-31'),/Choose a date/);
 assert.throws(()=>nextRenewal('9999-12-31','monthly'),/Choose a date/);
 assert.throws(()=>rescheduled({due:'2026-01-03',reminder:'2026-01-01'},'1000-01-01'),/Choose a date/);
 assert.equal(addDays('2028-02-28',1),'2028-02-29');
 assert.equal(calendarEvents({tasks:[{id:1,title:'Final task',due:'9999-12-30',recurrence:'daily'}],subscriptions:[{id:2,title:'Final renewal',active:true,renewal:'9999-12-30',cycle:'monthly'}]},'9999-12-30','9999-12-31').length,3);
});
test('session insertion checks the verified password and active account atomically',async()=>{
 const queries=[];
 const cx={beginTransaction:async()=>{},rollback:async()=>{},release(){},query:async(sql,args)=>{queries.push({sql,args});return [[{active:true,password_hash:'changed-hash'}]];}};
 const store=mysqlAuthStore({query:async()=>[{}],getConnection:async()=>cx});
 assert.equal(await store.createSession('token',7,8,'verified-hash'),false);
 assert.equal(queries.length,1,'no session is inserted after the password changes');
 assert.match(queries[0].sql,/FROM users WHERE id=\? FOR UPDATE/);
 assert.deepEqual(queries[0].args,[7]);
});
test('a password reset racing sign-in cannot issue a cookie',async t=>{
 const password='a sufficiently long password',password_hash=await hashPassword(password);
 const {router}=createAuth({findByEmail:async()=>({id:1,email:'user@example.com',active:true,password_hash}),createSession:async()=>false});
 const server=express().use(express.json()).use(router).listen(0,'127.0.0.1');
 await once(server,'listening');t.after(()=>{server.closeAllConnections();server.close();});
 const response=await fetch(`http://127.0.0.1:${server.address().port}/login`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:'user@example.com',password})});
 assert.equal(response.status,401);assert.equal(response.headers.get('set-cookie'),null);
});
