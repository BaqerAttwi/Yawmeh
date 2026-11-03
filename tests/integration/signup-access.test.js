import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createApp} from '../../server/src/app.js';
import {hashPassword,verifyPassword,tokenHash} from '../../server/src/modules/auth/passwords.js';
import {accountEnabled,OWNER_EMAIL} from '../../shared/account-access.js';
import {migrateSignup,signupGreeting} from '../../server/src/modules/auth/signup.js';

async function fixture(t){
 const users=[{id:1,name:'Owner',email:'owner@test.local',role:'admin',permissions:['money','tasks'],active:true,password_hash:await hashPassword('owner password')}],sessions=new Map([[tokenHash('a'.repeat(64)),1]]),states=new Map(),verifications=new Map(),greetings=[],googleCalls=[];
 let profile={sub:'google-person-123',email:'google@gmail.com',email_verified:true,name:'Google member',iss:'https://accounts.google.com'};
 const store={findById:async id=>users.find(u=>u.id===id),issueVerification:async(id,hash)=>{for(const [key,userId] of verifications)if(userId===id)verifications.delete(key);verifications.set(hash,id);},verifyEmail:async hash=>{const id=verifications.get(hash);if(!id)return false;verifications.delete(hash);users.find(u=>u.id===id).email_verified=true;return true;},findByEmail:async email=>users.find(u=>u.email===email),findByGoogle:async sub=>users.find(u=>u.google_sub===sub),session:async token=>users.find(u=>u.id===sessions.get(token)),create:async value=>{const user={...value,id:users.length+1,role:'user'};users.push(user);return user.id;},list:async()=>users,createSession:async(hash,id,hours,passwordHash)=>{const user=users.find(u=>u.id===id);if(!accountEnabled(user)||user.password_hash!==passwordHash)return false;sessions.set(hash,id);return true;},deleteSession:async hash=>sessions.delete(hash),update:async(id,value)=>{const user=users.find(u=>u.id===id&&u.role==='user');if(!user)return false;Object.assign(user,value);for(const [key,userId] of sessions)if(userId===id)sessions.delete(key);return true;},issueOAuthState:async(hash,code_verifier,nonce)=>states.set(hash,{code_verifier,nonce}),consumeOAuthState:async hash=>{const state=states.get(hash);states.delete(hash);return state;}};
 const env={APP_ORIGIN:'https://yawmeh.me',GOOGLE_CLIENT_ID:'client-id',GOOGLE_CLIENT_SECRET:'private-google-secret',COOKIE_SECURE:'true'};
 const server=createApp({db:{},authStore:store,recoveryOptions:null,signupOptions:{sendGreeting:async(...args)=>{greetings.push(args);return true;},google:{env,makeClient:options=>({getToken:async input=>{googleCalls.push({options,input});return {tokens:{id_token:'verified-token'}};},verifyIdToken:async input=>{assert.equal(input.audience,'client-id');return {getPayload:()=>profile};}})}}}).listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>{server.closeAllConnections();server.close();});
 const base=`http://127.0.0.1:${server.address().port}`;
 const call=(path,method='GET',body,cookie)=>fetch(base+'/api'+path,{method,redirect:'manual',headers:{'content-type':'application/json',...(cookie?{cookie}:{})},...(body?{body:JSON.stringify(body)}:{})});
 const start=async()=>{const response=await call('/auth/google');const url=new URL(response.headers.get('location'));const state=url.searchParams.get('state');profile.nonce=url.searchParams.get('nonce');return {state,url,cookie:response.headers.get('set-cookie').split(';')[0]};};
 return {users,sessions,states,verifications,greetings,googleCalls,call,start,setProfile:value=>{profile={...profile,...value};}};
}

test('public signup accepts only name/email/password, stores a hash, greets once, and remains inactive',async t=>{
 const f=await fixture(t),input={name:'New member',email:'NEW@test.local',password:'12345678'};
 assert.equal((await f.call('/auth/signup','POST',{...input,active:true})).status,400);
 const response=await f.call('/auth/signup','POST',input),result=await response.json();assert.equal(response.status,201);assert.equal(response.headers.get('set-cookie'),null);assert.equal(result.code,'ACCOUNT_INACTIVE');assert.equal(result.ownerEmail,OWNER_EMAIL);
 const user=f.users[1];assert.equal(user.active,false);assert.equal(user.payment_status,'unpaid');assert.equal(user.access_expires_at,null);assert.deepEqual(user.permissions,['money','tasks']);assert.equal(await verifyPassword(input.password,user.password_hash),true);assert.notEqual(user.password_hash,input.password);assert.equal(f.greetings.length,1);
 assert.equal((await f.call('/auth/signup','POST',input)).status,409);assert.equal(f.greetings.length,1);
 assert.equal((await f.call('/auth/login','POST',{email:user.email,password:input.password})).status,403);
 assert.equal((await f.call('/auth/login','POST',{email:user.email,password:'wrong'})).status,401);
 const token=f.greetings[0][2];assert.equal(f.verifications.has(tokenHash(token)),true);assert.equal(f.verifications.has(token),false);assert.equal(user.email_verified,false);
 assert.equal((await f.call('/auth/verify-email?token='+token)).headers.get('location'),'/#auth=verified');assert.equal(user.email_verified,true);assert.equal(user.active,false);
 assert.equal((await f.call('/auth/verify-email?token='+token)).headers.get('location'),'/#auth=verification_failed');
});

test('only owner can grant unpaid members ongoing or timed access; expired sessions are denied',async t=>{
 const f=await fixture(t);await f.call('/auth/signup','POST',{name:'Member',email:'member@test.local',password:'12345678'});
 const grant={permissions:['tasks'],active:true,payment_status:'unpaid',access_expires_at:new Date(Date.now()+3600000).toISOString()};
 assert.equal((await f.call('/admin/users/2','PATCH',grant,'daywell_session='+'a'.repeat(64))).status,400,'Unverified email cannot be activated');
 await f.call('/auth/verify-email?token='+f.greetings[0][2]);
 assert.equal((await f.call('/admin/users/2','PATCH',grant)).status,401);
 assert.equal((await f.call('/admin/users/2','PATCH',{...grant,access_expires_at:'2020-01-01T00:00:00.000Z'},'daywell_session='+'a'.repeat(64))).status,400);
 assert.equal((await f.call('/admin/users/2','PATCH',grant,'daywell_session='+'a'.repeat(64))).status,200);
 const login=await f.call('/auth/login','POST',{email:'member@test.local',password:'12345678'});assert.equal(login.status,200);const cookie=login.headers.get('set-cookie').split(';')[0];
 assert.equal((await f.call('/auth/me','GET',null,cookie)).status,200);
 f.users[1].access_expires_at='2020-01-01T00:00:00.000Z';const blocked=await f.call('/auth/me','GET',null,cookie);assert.equal(blocked.status,403);assert.equal((await blocked.json()).ownerEmail,OWNER_EMAIL);
 assert.equal((await f.call('/admin/users/2','PATCH',{...grant,access_expires_at:null},'daywell_session='+'a'.repeat(64))).status,200);assert.equal(accountEnabled(f.users[1]),true);
 assert.equal((await f.call('/auth/me','GET',null,cookie)).status,401,'Grant changes revoke the old session');
});

test('Google uses PKCE, single-use state, verified identity and creates only inactive unpaid accounts',async t=>{
 const f=await fixture(t),start=await f.start();assert.equal(start.url.origin,'https://accounts.google.com');assert.equal(start.url.searchParams.get('code_challenge_method'),'S256');assert.ok(start.url.searchParams.get('code_challenge'));assert.ok(f.states.has(tokenHash(start.state)));
 const callback=`/auth/google/callback?code=sample-code&state=${start.state}`;
 assert.match((await f.call(callback)).headers.get('location'),/google_failed/);assert.equal(f.googleCalls.length,0);
 const response=await f.call(callback,'GET',null,start.cookie);assert.equal(response.headers.get('location'),'/#auth=inactive');assert.equal(f.users[1].google_sub,'google-person-123');assert.equal(f.users[1].active,false);assert.equal(f.users[1].payment_status,'unpaid');assert.equal(f.greetings.length,1);
 assert.ok(f.googleCalls[0].input.codeVerifier);assert.equal(f.googleCalls[0].input.redirect_uri,'https://yawmeh.me/api/auth/google/callback');
 assert.match((await f.call(callback,'GET',null,start.cookie)).headers.get('location'),/google_failed/);assert.equal(f.googleCalls.length,1,'Consumed state cannot be replayed');
 f.users[1].active=true;const again=await f.start();const signedIn=await f.call(`/auth/google/callback?code=next&state=${again.state}`,'GET',null,again.cookie);assert.equal(signedIn.headers.get('location'),'/');assert.match(signedIn.headers.get('set-cookie'),/daywell_session=/);assert.equal(f.users.length,2);
});

test('Google rejects nonce mismatch and unverified emails; password accounts never auto-link',async t=>{
 const f=await fixture(t);let start=await f.start();f.setProfile({nonce:'wrong'});assert.match((await f.call(`/auth/google/callback?code=one&state=${start.state}`,'GET',null,start.cookie)).headers.get('location'),/google_failed/);assert.equal(f.users.length,1);
 start=await f.start();f.setProfile({email_verified:false});assert.match((await f.call(`/auth/google/callback?code=two&state=${start.state}`,'GET',null,start.cookie)).headers.get('location'),/google_failed/);assert.equal(f.users.length,1);
 start=await f.start();f.setProfile({email_verified:true,email:'owner@test.local'});assert.match((await f.call(`/auth/google/callback?code=three&state=${start.state}`,'GET',null,start.cookie)).headers.get('location'),/google_existing_account/);assert.equal(f.users[0].google_sub,undefined);
});

test('Google addresses outside Gmail or Workspace need a separate email ownership check',async t=>{
 const f=await fixture(t);const start=await f.start();f.setProfile({email:'person@external.example'});
 const response=await f.call(`/auth/google/callback?code=external&state=${start.state}`,'GET',null,start.cookie);
 assert.equal(response.headers.get('location'),'/#auth=inactive');assert.equal(f.users[1].email_verified,false);assert.ok(f.greetings[0][2]);assert.equal(f.verifications.has(tokenHash(f.greetings[0][2])),true);
});

test('signup migration deactivates existing members once and preserves subsequent owner grants',async()=>{
 const columns=new Set(),queries=[];const db={query:async(sql,args)=>{queries.push(sql);if(sql.startsWith('SELECT COLUMN_NAME'))return [columns.has(args[1])?[{}]:[]];if(sql.startsWith('ALTER TABLE'))columns.add(sql.split(' ')[5]);return [{}];}};
 await migrateSignup(db);const first=queries.filter(sql=>sql.startsWith('UPDATE users'));assert.deepEqual(first,["UPDATE users SET active=0 WHERE role='user'"]);
 queries.length=0;await migrateSignup(db);assert.equal(queries.some(sql=>sql.startsWith('UPDATE users')),false);
 const greeting=signupGreeting('<script>','https://yawmeh.me');assert.doesNotMatch(greeting.html,/<script>/);assert.match(greeting.text,/yawmehme@gmail.com/);assert.doesNotMatch(greeting.text,/#reset=|password:/);
});

test('unverified and expired members are blocked; explicit ongoing grants and owners stay available',()=>{
 const now=Date.now(),member={role:'user',active:true,payment_status:'unpaid',email_verified:true};
 assert.equal(accountEnabled(member,now),true);
 assert.equal(accountEnabled({...member,email_verified:false},now),false);
 assert.equal(accountEnabled({...member,access_expires_at:new Date(now).toISOString()},now),false);
 assert.equal(accountEnabled({...member,access_expires_at:new Date(now+1000).toISOString()},now),true);
 assert.equal(accountEnabled({...member,access_expires_at:'invalid'},now),false);
 assert.equal(accountEnabled({...member,role:'admin',access_expires_at:'2020-01-01T00:00:00Z'},now),true);
});
