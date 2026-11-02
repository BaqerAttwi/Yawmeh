import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createApp} from '../../server/src/app.js';
import {protectMutation} from '../../server/src/modules/auth/auth.js';
import {validateProductionSecurity,trustedProxies} from '../../server/src/config/security.js';

test('API route families reject anonymous and ungranted access before database writes',async t=>{
 const routes={
  money:[['POST','/entries'],['POST','/items'],['POST','/budgets'],['POST','/subscriptions'],['PATCH','/subscriptions/1'],['POST','/subscriptions/1/renew'],['POST','/goals'],['POST','/goals/1/moves'],['PATCH','/goals/1/monthly_amount'],['PATCH','/subscriptions/1/rarely_used'],['POST','/entries/1/void'],['POST','/currencies'],['PUT','/currencies/home'],['PUT','/currencies/rate']],
  tasks:[['POST','/tasks'],['PATCH','/tasks/1'],['PATCH','/tasks/1/category'],['PATCH','/tasks/1/recurrence'],['PATCH','/tasks/1/cancel'],['PATCH','/tasks/1/estimate_minutes'],['PATCH','/tasks/1/reschedule'],['POST','/tasks/1/subtasks'],['PATCH','/tasks/1/subtasks/1'],['POST','/day_plans/today/close'],['POST','/day_plans/today/reopen'],['PATCH','/day_plans/2026-10-27'],['POST','/inbox'],['PATCH','/inbox/1'],['POST','/inbox/1/convert']],
  admin:[['GET','/admin/users'],['POST','/admin/users'],['PATCH','/admin/users/1'],['GET','/system/status']],
 };
 const db={query(){throw new Error('Denied requests must not query records');}};
 const app=createApp({db,authStore:{session:async()=>({id:2,name:'Member',email:'member@test.local',role:'user',active:true,permissions:[]})}});
 const server=app.listen(0,'127.0.0.1');await once(server,'listening');
 t.after(()=>{server.closeAllConnections();server.close();});
 const base=`http://127.0.0.1:${server.address().port}/api`;
 for(const [method,path] of Object.values(routes).flat()){
  for(const signedIn of [false,true]){
   const response=await fetch(base+path,{method,headers:{'content-type':'application/json',...(signedIn?{cookie:'daywell_session='+'a'.repeat(64)}:{})},...(method==='GET'?{}:{body:'{}'})});
   assert.equal(response.status,signedIn?403:401,`${method} ${path}, signedIn=${signedIn}`);
   assert.equal(typeof (await response.json()).error,'string');
  }
 }
});

test('mutations compare full origins and reject opaque and cross-site origins',()=>{
 const original=process.env.APP_ORIGIN,secure=process.env.COOKIE_SECURE;
 process.env.APP_ORIGIN='https://daywell.example';process.env.COOKIE_SECURE='true';
 try {
  const check=(origin,site)=>{
   let status=200,passed=false;
   protectMutation({method:'POST',headers:{origin,'sec-fetch-site':site},protocol:'http',get:()=> 'internal:3001',is:()=>true},{status(code){status=code;return this;},json(){}},()=>{passed=true;});
   return {status,passed};
  };
  assert.deepEqual(check('https://daywell.example','same-origin'),{status:200,passed:true});
  for(const origin of ['http://daywell.example','https://attacker.example','null','garbage'])assert.equal(check(origin).status,403);
  assert.equal(check(undefined,'cross-site').status,403);
 } finally {
  if(original===undefined)delete process.env.APP_ORIGIN;else process.env.APP_ORIGIN=original;
  if(secure===undefined)delete process.env.COOKIE_SECURE;else process.env.COOKIE_SECURE=secure;
 }
});

test('production requires secure cookies and an explicit HTTPS origin',()=>{
 assert.doesNotThrow(()=>validateProductionSecurity({}));
 assert.throws(()=>validateProductionSecurity({NODE_ENV:'production'}),/COOKIE_SECURE/);
 for(const APP_ORIGIN of ['', 'http://example.com','https://name:secret@example.com','https://example.com/path','https://example.com?x=1'])assert.throws(()=>validateProductionSecurity({NODE_ENV:'production',COOKIE_SECURE:'true',APP_ORIGIN}));
 const env={NODE_ENV:'production',COOKIE_SECURE:'true',APP_ORIGIN:'https://daywell.example',MYSQL_PASSWORD:'a-unique-database-secret'};
 assert.doesNotThrow(()=>validateProductionSecurity(env));
 for(const MYSQL_PASSWORD of ['', 'change-me','replace-with-secret'])assert.throws(()=>validateProductionSecurity({...env,MYSQL_PASSWORD}),/MYSQL_PASSWORD/);
 assert.throws(()=>validateProductionSecurity({...env,MYSQL_USER:'root'}),/dedicated MySQL/);
 assert.throws(()=>validateProductionSecurity({...env,TIMEZONE:'Invalid/Zone'}),/TIMEZONE/);
});

test('proxy trust is explicit and refuses wildcard and hop-count settings',()=>{
 assert.equal(trustedProxies({}),false);
 assert.deepEqual(trustedProxies({TRUST_PROXY:'loopback, 192.0.2.10/32, ::1'}),['loopback','192.0.2.10/32','::1']);
 for(const TRUST_PROXY of ['true','1','*','0.0.0.0/0','::/0','192.0.2.1/33','localhost','loopback,'])assert.throws(()=>trustedProxies({TRUST_PROXY}),/TRUST_PROXY/);
});

test('trusted proxy visitors have separate limits and malformed record IDs never reach MySQL',async t=>{
 let writes=0;
 const app=createApp({trustProxy:['loopback'],db:{async query(){writes++;return [[]];}},authStore:{session:async()=>({id:1,name:'Member',email:'test@example.local',role:'user',active:true,permissions:['tasks']})}});
 const server=app.listen(0,'127.0.0.1');await once(server,'listening');
 t.after(()=>{server.closeAllConnections();server.close();});
 const base=`http://127.0.0.1:${server.address().port}/api`;
 for(let i=0;i<120;i++)assert.equal((await fetch(base+'/health',{headers:{'x-forwarded-for':'192.0.2.1'}})).status,200);
 assert.equal((await fetch(base+'/health',{headers:{'x-forwarded-for':'192.0.2.1'}})).status,429);
 assert.equal((await fetch(base+'/health',{headers:{'x-forwarded-for':'192.0.2.2'}})).status,200);
 const before=writes;
 for(const path of ['/tasks/1junk/category','/tasks/1/subtasks/2junk','/tasks/9007199254740992/category']){
  const response=await fetch(base+path,{method:'PATCH',headers:{'content-type':'application/json',cookie:'daywell_session='+'a'.repeat(64),'x-forwarded-for':'192.0.2.2'},body:'{}'});
  assert.equal(response.status,400,path);
 }
 assert.equal(writes,before);
});

test('API errors are uncached, bounded and protected before parsing; health is rate limited',async t=>{
 let queries=0;
 const app=createApp({db:{async query(){queries++;return [[]];}},authStore:{}});
 const server=app.listen(0,'127.0.0.1');await once(server,'listening');
 t.after(()=>new Promise(resolve=>{server.close(resolve);server.closeAllConnections();}));
 const base=`http://127.0.0.1:${server.address().port}/api`;
 const send=(body,headers={})=>fetch(base+'/auth/login',{method:'POST',headers:{'content-type':'application/json',...headers},body});
 const bad=await send('{');assert.equal(bad.status,400);assert.equal(bad.headers.get('cache-control'),'no-store');assert.equal(bad.headers.get('x-powered-by'),null);assert.equal(bad.headers.get('x-content-type-options'),'nosniff');
 const large=await send(JSON.stringify({text:'x'.repeat(66000)}));assert.equal(large.status,413);
 const cross=await send('{',{'sec-fetch-site':'cross-site'});assert.equal(cross.status,403);
 const type=await send('{}',{'content-type':'text/plain'});assert.equal(type.status,415);
 for(let i=0;i<116;i++)assert.equal((await fetch(base+'/health')).status,200);
 const limited=await fetch(base+'/health');
 assert.equal(limited.status,429);
 assert.match(limited.headers.get('content-type'),/application\/json/);
 assert.match((await limited.json()).error,/Too many requests/);
 assert.equal(queries,116,'rate-limited health requests must not reach MySQL');
});
