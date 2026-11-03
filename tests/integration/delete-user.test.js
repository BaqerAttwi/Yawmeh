import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createApp} from '../../server/src/app.js';
import {mysqlAuthStore} from '../../server/src/modules/auth/auth.js';

test('deletion requires owner access, a valid ID and matching member confirmation',async t=>{
 const owner={id:1,name:'Owner',email:'owner@test.local',role:'admin',active:true,permissions:[]};
 const member={...owner,id:2,email:'member@test.local',role:'user'};let removed=false,calls=0;
 const store={session:async()=>owner,remove:async(id,email)=>{calls++;if(id!==2||email!==member.email)return false;removed=true;return true;}};
 const server=createApp({db:{},authStore:store,recoveryOptions:null}).listen(0,'127.0.0.1');await once(server,'listening');
 t.after(()=>{server.closeAllConnections();server.close();});
 const call=(id,body={email:member.email},cookie=true)=>fetch(`http://127.0.0.1:${server.address().port}/api/admin/users/${id}`,{method:'DELETE',headers:{'content-type':'application/json',...(cookie?{cookie:'daywell_session='+'a'.repeat(64)}:{})},body:JSON.stringify(body)});
 assert.equal((await call(2,undefined,false)).status,401);
 store.session=async()=>member;assert.equal((await call(2)).status,403);store.session=async()=>owner;
 assert.equal((await call(1)).status,403);
 for(const id of ['2junk','0','9007199254740992'])assert.equal((await call(id)).status,400);
 assert.equal((await call(2,{})).status,400);assert.equal(calls,0);
 assert.equal((await call(2,{email:'wrong@test.local'})).status,404);assert.equal(removed,false);
 assert.equal((await call(2)).status,200);assert.equal(removed,true);
});

test('database deletion protects owners, scopes cleanup, orders children first and rolls back on failure',async()=>{
 for(const scenario of ['owner','missing','mismatch','success','failure']){
  const queries=[];let committed=false,rolledBack=false,released=false;
  const cx={beginTransaction:async()=>{},commit:async()=>{committed=true;},rollback:async()=>{rolledBack=true;},release:()=>{released=true;},query:async(sql,args)=>{
   queries.push({sql,args});
   if(sql.startsWith('SELECT'))return [scenario==='missing'?[]:[{id:2,email:scenario==='mismatch'?'other@test.local':'member@test.local',role:scenario==='owner'?'admin':'user'}]];
   if(scenario==='failure'&&sql==='DELETE FROM tasks WHERE user_id=?')throw new Error('database failure');
   return [{affectedRows:1}];
  }};
  const store=mysqlAuthStore({getConnection:async()=>cx});
  if(scenario==='failure')await assert.rejects(store.remove(2,'member@test.local'));else assert.equal(await store.remove(2,'member@test.local'),scenario==='success');
  assert.equal(released,true);assert.equal(committed,scenario==='success');assert.equal(rolledBack,scenario!=='success');
  if(['owner','missing','mismatch'].includes(scenario)){assert.equal(queries.length,1);continue;}
  for(const {sql,args} of queries.slice(1)){
   if(sql.includes('companion_usage'))assert.deepEqual(args,['user:2:%']);
   else assert.equal(args.at(-1),2,'Every delete is scoped to the member');
  }
  if(scenario==='success'){
   const statements=queries.map(q=>q.sql);
   assert.ok(statements.indexOf('DELETE FROM goal_moves WHERE user_id=?')<statements.indexOf('DELETE FROM goals WHERE user_id=?'));
   assert.ok(statements.indexOf('DELETE FROM subtasks WHERE user_id=?')<statements.indexOf('DELETE FROM tasks WHERE user_id=?'));
   assert.equal(statements.at(-1),"DELETE FROM users WHERE id=? AND role='user'");
  }
 }
});
