import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createApp} from '../../server/src/app.js';
import {ownerUsage} from '../../server/src/modules/auth/owner.js';
import {mysqlAuthStore} from '../../server/src/modules/auth/auth.js';
import {tokenHash} from '../../server/src/modules/auth/passwords.js';

test('only the owner sees family usage metadata, without workspace records or secrets',async t=>{
 const users=[{id:1,name:'Owner',email:'owner@test.local',role:'admin',active:true,permissions:[],password_hash:'private-hash'},{id:2,name:'Member',email:'member@test.local',role:'user',active:true,permissions:['tasks'],password_hash:'another-private-hash'}],queries=[];
 const db={async query(sql,args){queries.push(sql);
  if(sql.startsWith('SELECT COUNT(*)'))return [[{accounts:users.length,enabled:users.filter(u=>u.active).length,active_5m:1,active_7d:1,sign_ins:2}]];
  if(sql==='SELECT id,last_seen_at,last_login_at,login_count FROM users ORDER BY id')return [users.map(u=>({id:u.id,last_seen_at:null,last_login_at:null,login_count:0}))];
  if(sql==='SELECT requests FROM companion_usage WHERE scope=?')return [[{requests:7}]];
  throw new Error('Owner dashboard must not read private workspace tables');
 }};
 const store={async session(hash){return hash===tokenHash('a'.repeat(64))?users[0]:hash===tokenHash('b'.repeat(64))?users[1]:null;},async usage(){return ownerUsage(db);},async list(){return users;},async create(value){users.push({...value,id:users.length+1,role:'user',active:true});return users.length;},async update(id,value){const user=users.find(u=>u.id===id&&u.role==='user');if(!user)return false;Object.assign(user,value);return true;}};
 const server=createApp({db,authStore:store,recoveryOptions:null}).listen(0,'127.0.0.1');await once(server,'listening');
 t.after(()=>{server.closeAllConnections();server.close();});
 const base=`http://127.0.0.1:${server.address().port}/api/admin`;
 const call=(path,token='a',method='GET',body)=>fetch(base+path,{method,headers:{'content-type':'application/json',...(token?{cookie:'daywell_session='+token.repeat(64)}:{})},...(body?{body:JSON.stringify(body)}:{})});
 assert.equal((await call('/usage',null)).status,401);assert.equal((await call('/usage','b')).status,403);assert.equal(queries.length,0);
 const response=await call('/usage');assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');
 const result=await response.json();assert.equal(result.mode,'family');assert.equal(result.paymentsEnabled,false);assert.equal(result.counts.accounts,2);assert.equal(result.ai_requests_month,7);
 assert.doesNotMatch(JSON.stringify(result),/private-hash|password|member@test|tasks|entries|sessions|token_hash/);
 const input={name:'Family test member',email:'family@test.local',password:'unique family password',permissions:['tasks']};
 assert.equal((await call('/users','b','POST',input)).status,403);
 assert.equal((await call('/users','a','POST',{...input,role:'admin'})).status,400);
 assert.equal((await call('/users','a','POST',{...input,plan:'paid'})).status,400);
 assert.equal((await call('/users','a','POST',input)).status,201);
 assert.equal(users.at(-1).role,'user');assert.notEqual(users.at(-1).password_hash,input.password);
 assert.equal((await call('/users/1','a','PATCH',{permissions:['tasks'],active:false})).status,404,'owner cannot be disabled through member editor');
 assert.equal((await (await call('/usage')).json()).counts.accounts,3);
 const list=await (await call('/users')).json();assert.equal(list.users.some(u=>u.password_hash),false);
});

test('successful session creation counts sign-in atomically; account races never count it',async()=>{
 for(const active of [true,false]){
  const queries=[];let committed=false,rolledBack=false;
  const cx={async beginTransaction(){},async commit(){committed=true;},async rollback(){rolledBack=true;},release(){},async query(sql,args){queries.push({sql,args});return sql.startsWith('SELECT')?[[{active,password_hash:'verified'}]]:[{}];}};
  const store=mysqlAuthStore({query:async()=>[{}],getConnection:async()=>cx});
  assert.equal(await store.createSession('test-hash',5,8,'verified'),active);
  assert.equal(committed,active);assert.equal(rolledBack,!active);
  assert.equal(queries.some(q=>q.sql.includes('login_count=login_count+1')),active);
 }
});

test('activity updates are scoped and at most once per minute at the database',async()=>{
 const calls=[];const store=mysqlAuthStore({query:async(sql,args)=>{calls.push({sql,args});return [{}];}});
 await store.touch(12);assert.match(calls[0].sql,/WHERE id=\?/);assert.match(calls[0].sql,/INTERVAL 1 MINUTE/);assert.deepEqual(calls[0].args,[12]);
});
