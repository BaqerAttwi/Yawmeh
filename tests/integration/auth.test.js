import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createApp} from '../../server/src/app.js';
import {hashPassword,verifyPassword,tokenHash} from '../../server/src/modules/auth/passwords.js';
import {snapshot} from '../../server/src/database/connection.js';
import {APP_ACCESS,visibleData} from '../../shared/access.js';
import {memoryDatabase} from '../helpers/memory-db.js';

async function fixture(t) {
  const password='correct horse battery staple';
  const hash=await hashPassword(password);
  const users=[{id:1,name:'Admin',email:'admin@test.local',role:'admin',permissions:APP_ACCESS,active:true,password_hash:hash},{id:2,name:'Sam',email:'sam@test.local',role:'user',permissions:['tasks'],active:true,password_hash:hash},{id:3,name:'Maya',email:'maya@test.local',role:'user',permissions:['money','assistant'],active:true,password_hash:hash}];
  for(const user of users)user.current_rate=90000;
  for(const user of users)user.current_rate=90000;
  const sessions=new Map(),queries=[];
  const authStore={
    async findByEmail(email){return users.find(u=>u.email===email);},
    async session(key){const session=sessions.get(key);return session&&session.expiry>Date.now()?users.find(u=>u.id===session.userId&&u.active):undefined;},
    async createSession(key,userId,hours=8){sessions.set(key,{userId,expiry:Date.now()+hours*3600000});},
    async deleteSession(key){sessions.delete(key);},
    async listSessions(userId){return [...sessions].filter(([,s])=>s.userId===userId&&s.expiry>Date.now()).map(([id,s])=>({id,expires_at:s.expiry}));},
    async revokeSession(userId,id){if(sessions.get(id)?.userId!==userId)return false;return sessions.delete(id);},
    async list(){return users;},
    async create(value){if(users.some(u=>u.email===value.email)){const error=new Error();error.code='ER_DUP_ENTRY';throw error;}const id=users.length+1;users.push({...value,id,role:'user',active:true});return id;},
    async update(id,value){const user=users.find(u=>u.id===id&&u.role==='user');if(!user)return false;Object.assign(user,value);for(const [key,s] of sessions)if(s.userId===id)sessions.delete(key);return true;},
  };
  const records={tasks:[{id:10,user_id:2,title:'Sam private task',completed:0},{id:11,user_id:3,title:'Maya private task',completed:0}],entries:[{id:20,user_id:3,title:'Maya private income',type:'income',amount:700,saved:300}],items:[],budgets:[],subscriptions:[]};
  const db=memoryDatabase(records,users,queries);
  const server=createApp({db,authStore}).listen(0,'127.0.0.1');await once(server,'listening');
  t.after(()=>new Promise(resolve=>{server.close(resolve);server.closeAllConnections();}));
  const base='http://127.0.0.1:'+server.address().port;
  async function call(path,{cookie,method='GET',body,origin}={}){
    const response=await fetch(base+'/api'+path,{method,headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{}),...(origin?{Origin:origin}:{})},body:body===undefined?undefined:JSON.stringify(body)});
    return {status:response.status,body:await response.json(),cookie:response.headers.get('set-cookie')};
  }
  async function login(email){const r=await call('/auth/login',{method:'POST',body:{email,password}});assert.equal(r.status,200);return r.cookie.split(';')[0];}
  return {call,login,users,sessions,queries,records,password,db};
}

test('passwords are salted, verifiable and never stored as plaintext',async()=>{
  const first=await hashPassword('a sufficiently long secret'),second=await hashPassword('a sufficiently long secret');
  assert.notEqual(first,second);assert.equal(await verifyPassword('a sufficiently long secret',first),true);assert.equal(await verifyPassword('wrong password',first),false);assert.equal(await verifyPassword('anything','broken'),false);
});
test('session listing and remote sign-out are scoped to the signed-in account',async t=>{
 const f=await fixture(t),first=await f.login('sam@test.local'),second=await f.login('sam@test.local'),other=await f.login('maya@test.local');
 const list=await f.call('/auth/sessions',{cookie:first});assert.equal(list.body.sessions.length,2);assert.equal(list.body.sessions.filter(s=>s.current).length,1);
 const id=tokenHash(second.split('=')[1]);assert.equal((await f.call('/auth/sessions/'+id,{cookie:other,method:'DELETE',body:{}})).status,404);
 assert.equal((await f.call('/auth/sessions/'+id,{cookie:first,method:'DELETE',body:{}})).status,200);assert.equal((await f.call('/auth/me',{cookie:second})).status,401);assert.equal((await f.call('/auth/me',{cookie:first})).status,200);
});
test('record title edits require ownership and permissions and leave ledger values intact',async t=>{
 const f=await fixture(t),sam=await f.login('sam@test.local'),maya=await f.login('maya@test.local');
 const rename=(path,cookie,body)=>f.call(path,{cookie,method:'PATCH',body});
 assert.equal((await rename('/tasks/11/title',sam,{title:'Wrong owner'})).status,404);
 assert.equal((await rename('/entries/20/title',sam,{title:'Wrong permission'})).status,403);
 assert.equal((await rename('/tasks/10/title',sam,{title:'New task name'})).status,200);
 assert.equal((await rename('/entries/20/title',maya,{title:'New income name',amount:1})).status,400);
 assert.equal((await rename('/entries/20/title',maya,{title:'New income name'})).status,200);
 assert.equal(f.records.entries[0].title,'New income name');
 assert.equal(f.records.entries[0].amount,700);
 assert.equal(f.records.entries[0].saved,300);
 f.records.entries[0].voided_on='2026-11-11';
 assert.equal((await rename('/entries/20/title',maya,{title:'Reversed entry'})).status,404);
});
test('cancelled tasks are recoverable, private, and excluded from active snapshots',async t=>{
 const f=await fixture(t),cookie=await f.login('sam@test.local');
 assert.equal((await f.call('/tasks/11/cancel',{cookie,method:'PATCH',body:{cancelled:true}})).status,404);
 assert.equal((await f.call('/tasks/10/cancel',{cookie,method:'PATCH',body:{cancelled:true}})).status,200);
 let r=await f.call('/data',{cookie});assert.equal(r.body.tasks.length,0);assert.equal(r.body.cancelled_tasks.length,1);
 assert.equal((await f.call('/tasks/10',{cookie,method:'PATCH',body:{completed:true}})).status,404);
 assert.equal((await f.call('/tasks/10/cancel',{cookie,method:'PATCH',body:{cancelled:false}})).status,200);
 r=await f.call('/data',{cookie});assert.equal(r.body.tasks.length,1);assert.equal(r.body.cancelled_tasks.length,0);
});
test('remember device is optional, bounded to 30 days, and logout revokes it',async t=>{
 const f=await fixture(t);
 for(const [remember,seconds] of [[false,28800],[true,2592000]]){
  const r=await f.call('/auth/login',{method:'POST',body:{email:'sam@test.local',password:f.password,remember}});
  assert.equal(r.status,200);assert.match(r.cookie,new RegExp('Max-Age='+seconds));
  const cookie=r.cookie.split(';')[0],session=f.sessions.get(tokenHash(cookie.split('=')[1]));
  assert.ok(Math.abs(session.expiry-Date.now()-seconds*1000)<3000);
  await f.call('/auth/logout',{cookie,method:'POST',body:{}});assert.equal((await f.call('/auth/me',{cookie})).status,401);
 }
 assert.equal((await f.call('/auth/login',{method:'POST',body:{email:'sam@test.local',password:f.password,remember:'true'}})).status,400);
});
test('login issues an HttpOnly SameSite cookie; logout and expiry reject it',async t=>{
  const f=await fixture(t);
  assert.equal((await f.call('/data')).status,401);
  const r=await f.call('/auth/login',{method:'POST',body:{email:'sam@test.local',password:f.password}});
  assert.equal(r.status,200);assert.match(r.cookie,/HttpOnly/);assert.match(r.cookie,/SameSite=Strict/);assert.equal(r.body.user.password_hash,undefined);
  const cookie=r.cookie.split(';')[0];assert.equal((await f.call('/auth/me',{cookie})).body.user.id,2);
  await f.call('/auth/logout',{cookie,method:'POST',body:{}});assert.equal((await f.call('/auth/me',{cookie})).status,401);
  const fresh=await f.login('sam@test.local');const hash=tokenHash(fresh.split('=')[1]);f.sessions.get(hash).expiry=0;assert.equal((await f.call('/auth/me',{cookie:fresh})).status,401);
});
test('unknown emails, wrong passwords and disabled accounts all fail sign in',async t=>{
  const f=await fixture(t);
  const a=await f.call('/auth/login',{method:'POST',body:{email:'nobody@test.local',password:f.password}});
  const b=await f.call('/auth/login',{method:'POST',body:{email:'sam@test.local',password:'wrong'}});
  f.users[1].active=false;const c=await f.call('/auth/login',{method:'POST',body:{email:'sam@test.local',password:f.password}});
  assert.equal(c.status,403);assert.equal(c.body.code,'ACCOUNT_INACTIVE');
  for(const r of [a,b]){assert.equal(r.status,401);assert.deepEqual(r.body,{error:'Email or password is incorrect.'});}
});
test('Tasks-only users cannot invoke money, AI or administrator routes',async t=>{
  const f=await fixture(t),cookie=await f.login('sam@test.local');
  for(const [path,method] of [['/entries','POST'],['/items','POST'],['/budgets','POST'],['/subscriptions','POST'],['/subscriptions/1','PATCH'],['/subscriptions/1/renew','POST'],['/chat','POST'],['/admin/users','GET'],['/admin/users','POST'],['/admin/users/3','PATCH']])assert.equal((await f.call(path,{cookie,method,body:method==='GET'?undefined:{}})).status,403,path);
  assert.equal(f.queries.length,0,'Rejected requests must not query private data');
});
test('snapshot hides ungranted apps and every record read is scoped to the signed-in user',async t=>{
  const f=await fixture(t),cookie=await f.login('sam@test.local');
  const result=await f.call('/data',{cookie});assert.equal(result.status,200);assert.equal(result.body.tasks.length,1);assert.equal(result.body.tasks[0].title,'Sam private task');assert.deepEqual(result.body.entries,[]);assert.deepEqual(result.body.budgets,[]);
  assert.equal(f.queries.some(q=>q.sql.includes('FROM entries')),false);
  const maya=await f.login('maya@test.local');const money=await f.call('/data',{cookie:maya});assert.equal(money.body.entries[0].user_id,3);assert.deepEqual(money.body.tasks,[]);
});
test('user cannot modify someone else’s task or spoof record ownership',async t=>{
  const f=await fixture(t),cookie=await f.login('sam@test.local');
  assert.equal((await f.call('/tasks/11',{cookie,method:'PATCH',body:{completed:true}})).status,404);
  assert.equal(f.records.tasks.find(t=>t.id===11).completed,0);
  assert.equal((await f.call('/tasks/10',{cookie,method:'PATCH',body:{completed:true}})).status,200);
  assert.equal((await f.call('/tasks',{cookie,method:'POST',body:{title:'New',due:'2026-10-01',priority:'low',user_id:3}})).status,201);
  assert.equal(f.records.tasks.at(-1).user_id,2);
});
test('only admin creates accounts; checkboxes support one, two or all apps without role escalation',async t=>{
  const f=await fixture(t),cookie=await f.login('admin@test.local');
  for(const permissions of [['tasks'],['money','assistant'],APP_ACCESS]){
    const email='user'+permissions.length+'@test.local';const r=await f.call('/admin/users',{cookie,method:'POST',body:{name:'New member',email,password:'new account password',permissions}});
    assert.equal(r.status,201);const user=f.users.find(u=>u.email===email);assert.equal(user.role,'user');assert.notEqual(user.password_hash,'new account password');assert.deepEqual(user.permissions,permissions);
  }
  assert.equal((await f.call('/admin/users',{cookie,method:'POST',body:{name:'Bad',email:'bad@test.local',password:f.password,permissions:[],role:'admin'}})).status,400);
  const list=await f.call('/admin/users',{cookie});assert.equal(list.status,200);assert.equal(list.body.users.some(u=>u.password_hash),false);
});
test('permission changes, disabling and password reset revoke sessions; admin cannot be disabled here',async t=>{
  const f=await fixture(t),member=await f.login('sam@test.local'),admin=await f.login('admin@test.local');
  assert.equal((await f.call('/admin/users/2',{cookie:admin,method:'PATCH',body:{permissions:['money','tasks'],active:true,password:'new account secret'}})).status,200);
  assert.equal((await f.call('/data',{cookie:member})).status,401);
  assert.equal(await verifyPassword('new account secret',f.users[1].password_hash),true);
  assert.equal((await f.call('/admin/users/1',{cookie:admin,method:'PATCH',body:{permissions:['tasks'],active:false}})).status,404);
  assert.equal((await f.call('/admin/users/2',{cookie:admin,method:'PATCH',body:{permissions:['tasks'],active:false}})).status,200);
  assert.equal(f.users[1].active,false);
});
test('cross-origin mutations are rejected before account creation or login',async t=>{
  const f=await fixture(t);assert.equal((await f.call('/auth/login',{method:'POST',origin:'https://unrelated.example',body:{email:'sam@test.local',password:f.password}})).status,403);
});
test('demo masking matches live permissions and a snapshot requires a user',async()=>{
  const data={entries:[1],items:[1],budgets:[1],subscriptions:[1],tasks:[1]};
  const masked=visibleData(data,{role:'user',permissions:['tasks']});assert.deepEqual(masked.tasks,[1]);assert.deepEqual(masked.entries,[]);
  await assert.rejects(()=>snapshot(null),/user is required/);
});
test('task category updates require Tasks access, valid input and record ownership',async t=>{
 const f=await fixture(t),sam=await f.login('sam@test.local'),maya=await f.login('maya@test.local');
 assert.equal((await f.call('/tasks/10/category',{cookie:sam,method:'PATCH',body:{category:'Side project'}})).status,200);
 assert.equal(f.records.tasks[0].category,'Side project');
 assert.equal((await f.call('/tasks/11/category',{cookie:sam,method:'PATCH',body:{category:'Work'}})).status,404);
 assert.equal((await f.call('/tasks/10/category',{cookie:sam,method:'PATCH',body:{category:'  '}})).status,400);
 assert.equal((await f.call('/tasks/11/category',{cookie:maya,method:'PATCH',body:{category:'Work'}})).status,403);
});
test('HTTP recurring completion requires a checklist and creates the next occurrence only once',async t=>{
 const f=await fixture(t),cookie=await f.login('sam@test.local');
 const created=await f.call('/tasks',{cookie,method:'POST',body:{title:'Daily routine',due:'2026-10-01',priority:'low',recurrence:'daily',subtasks:['Prepare','Finish']}});
 assert.equal(created.status,201);const id=created.body.id;
 assert.equal((await f.call('/tasks/'+id,{cookie,method:'PATCH',body:{completed:true}})).status,400);
 const parts=f.records.subtasks.filter(s=>s.task_id===id);assert.equal(parts.length,2);
 for(const part of parts)assert.equal((await f.call(`/tasks/${id}/subtasks/${part.id}`,{cookie,method:'PATCH',body:{completed:true}})).status,200);
 const responses=await Promise.all([1,2].map(()=>f.call('/tasks/'+id,{cookie,method:'PATCH',body:{completed:true}})));
 assert.deepEqual(responses.map(r=>r.status),[200,200]);
 const children=f.records.tasks.filter(task=>task.previous_task_id===id);assert.equal(children.length,1);
 const fresh=f.records.subtasks.filter(part=>part.task_id===children[0].id);assert.equal(fresh.length,2);assert.equal(fresh.every(part=>!part.completed),true);
 assert.equal((await f.call('/tasks/'+id,{cookie,method:'PATCH',body:{completed:false}})).status,400);
 assert.equal((await f.call('/tasks/'+children[0].id+'/recurrence',{cookie,method:'PATCH',body:{recurrence:'none'}})).status,200);
 assert.equal(f.records.tasks.find(task=>task.id===children[0].id).recurrence,'none');
});
test('subtasks cannot be changed through another user or parent task',async t=>{
 const f=await fixture(t),sam=await f.login('sam@test.local'),maya=await f.login('maya@test.local');
 f.records.subtasks.push({id:1,task_id:11,user_id:3,title:'Private checklist',completed:0});
 assert.equal((await f.call('/tasks/10/subtasks/1',{cookie:sam,method:'PATCH',body:{completed:true}})).status,404);
 assert.equal((await f.call('/tasks/11/subtasks',{cookie:sam,method:'POST',body:{title:'Not mine'}})).status,404);
 assert.equal((await f.call('/tasks/11/recurrence',{cookie:maya,method:'PATCH',body:{recurrence:'daily'}})).status,403);
 assert.deepEqual((await f.call('/data',{cookie:sam})).body.subtasks,[]);
});
test('goals reserve savings, restrict withdrawals, and reject cross-account writes',async t=>{
 const f=await fixture(t),maya=await f.login('maya@test.local'),sam=await f.login('sam@test.local'),admin=await f.login('admin@test.local');
 assert.equal((await f.call('/goals',{cookie:sam,method:'POST',body:{title:'No access',target_amount:200}})).status,403);
 const goal=await f.call('/goals',{cookie:maya,method:'POST',body:{title:'Laptop',target_amount:500}});assert.equal(goal.status,201);
 const path='/goals/'+goal.body.id+'/moves';
 assert.equal((await f.call(path,{cookie:admin,method:'POST',body:{kind:'fund',amount:10}})).status,404);
 assert.equal((await f.call(path,{cookie:maya,method:'POST',body:{kind:'fund',amount:200}})).status,201);
 assert.equal((await f.call(path,{cookie:maya,method:'POST',body:{kind:'fund',amount:101}})).status,400);
 assert.equal((await f.call(path,{cookie:maya,method:'POST',body:{kind:'release',amount:201}})).status,400);
 const entry={type:'withdrawal',title:'Repair',date:'2026-10-01',note:'Unexpected repair',amount:101};
 assert.equal((await f.call('/entries',{cookie:maya,method:'POST',body:entry})).status,400);
 assert.equal((await f.call('/entries',{cookie:maya,method:'POST',body:{...entry,amount:100}})).status,201);
 assert.equal((await f.call(path,{cookie:maya,method:'POST',body:{kind:'release',amount:50}})).status,201);
 const snapshot=await f.call('/data',{cookie:maya});assert.equal(snapshot.body.goals.length,1);assert.equal(snapshot.body.goal_moves.length,2);
 assert.deepEqual((await f.call('/data',{cookie:sam})).body.goals,[]);assert.deepEqual((await f.call('/data',{cookie:admin})).body.goal_moves,[]);
});
test('competing goal allocations cannot double-count the same savings',async t=>{
 const f=await fixture(t),cookie=await f.login('maya@test.local');
 const first=await f.call('/goals',{cookie,method:'POST',body:{title:'Laptop',target_amount:500}}),second=await f.call('/goals',{cookie,method:'POST',body:{title:'Trip',target_amount:500}});
 const responses=await Promise.all([first,second].map(g=>f.call('/goals/'+g.body.id+'/moves',{cookie,method:'POST',body:{kind:'fund',amount:200}})));
 assert.deepEqual(responses.map(r=>r.status).sort(),[201,400]);assert.equal(f.records.goal_moves.length,1);
});

test('insight updates require the right permission, ownership and bounded values',async t=>{
 const f=await fixture(t),sam=await f.login('sam@test.local'),maya=await f.login('maya@test.local');
 assert.equal((await f.call('/tasks/10/estimate_minutes',{cookie:sam,method:'PATCH',body:{estimate_minutes:60}})).status,200);
 assert.equal((await f.call('/tasks/11/estimate_minutes',{cookie:sam,method:'PATCH',body:{estimate_minutes:60}})).status,404);
 assert.equal((await f.call('/tasks/10/estimate_minutes',{cookie:maya,method:'PATCH',body:{estimate_minutes:60}})).status,403);
 assert.equal((await f.call('/tasks/10/estimate_minutes',{cookie:sam,method:'PATCH',body:{estimate_minutes:1441}})).status,400);
 f.records.goals.push({id:50,user_id:3,title:'Laptop',target_amount:500});
 assert.equal((await f.call('/goals/50/monthly_amount',{cookie:maya,method:'PATCH',body:{monthly_amount:50}})).status,200);
 assert.equal((await f.call('/goals/50/monthly_amount',{cookie:sam,method:'PATCH',body:{monthly_amount:50}})).status,403);
 f.records.subscriptions.push({id:50,user_id:3,title:'Study'});
 assert.equal((await f.call('/subscriptions/50/rarely_used',{cookie:maya,method:'PATCH',body:{rarely_used:true}})).status,200);
});
test('HTTP reversal is scoped, requires a reason and cannot be applied twice',async t=>{
 const f=await fixture(t),maya=await f.login('maya@test.local'),sam=await f.login('sam@test.local'),admin=await f.login('admin@test.local');
 f.records.entries.push({id:99,user_id:3,type:'expense',amount:1,date:'2026-10-01'});
 const path='/entries/99/void';
 assert.equal((await f.call(path,{cookie:sam,method:'POST',body:{reason:'Duplicate'}})).status,403);
 assert.equal((await f.call(path,{cookie:admin,method:'POST',body:{reason:'Duplicate'}})).status,404);
 assert.equal((await f.call(path,{cookie:maya,method:'POST',body:{reason:''}})).status,400);
 assert.equal((await f.call(path,{cookie:maya,method:'POST',body:{reason:'Duplicate'}})).status,200);
 assert.equal(f.records.entries.find(e=>e.id===99).void_reason,'Duplicate');
 assert.equal((await f.call(path,{cookie:maya,method:'POST',body:{reason:'Duplicate'}})).status,409);
});

test('daily plans enforce Top 3 ownership, preserve fields and remain private',async t=>{
 const f=await fixture(t),sam=await f.login('sam@test.local'),maya=await f.login('maya@test.local'),admin=await f.login('admin@test.local');const path='/day_plans/2026-10-01';
 assert.equal((await f.call(path,{cookie:maya,method:'PATCH',body:{energy:'low'}})).status,403);
 assert.equal((await f.call(path,{cookie:sam,method:'PATCH',body:{energy:'low',top_ids:[10],went_well:'A calm day'}})).status,200);
 assert.equal((await f.call(path,{cookie:sam,method:'PATCH',body:{top_ids:[11]}})).status,404);
 assert.equal((await f.call(path,{cookie:sam,method:'PATCH',body:{top_ids:[10,10]}})).status,400);
 assert.equal((await f.call(path,{cookie:sam,method:'PATCH',body:{tomorrow_help:'Take a walk'}})).status,200);
 const data=(await f.call('/data',{cookie:sam})).body;assert.equal(data.day_plans[0].went_well,'A calm day');assert.equal(data.day_plans[0].energy,'low');assert.equal(data.day_plans.length,1);
 assert.deepEqual((await f.call('/data',{cookie:admin})).body.day_plans,[]);assert.deepEqual((await f.call('/data',{cookie:maya})).body.day_plans,[]);
});
test('inbox conversion is atomic, idempotent and scoped to the owner',async t=>{
 const f=await fixture(t),sam=await f.login('sam@test.local'),admin=await f.login('admin@test.local');
 const created=await f.call('/inbox',{cookie:sam,method:'POST',body:{text:'Call a friend'}});assert.equal(created.status,201);const path='/inbox/'+created.body.id;
 assert.equal((await f.call(path+'/convert',{cookie:admin,method:'POST',body:{due:'2026-10-02'}})).status,404);
 const results=await Promise.all([1,2].map(()=>f.call(path+'/convert',{cookie:sam,method:'POST',body:{due:'2026-10-02'}})));assert.equal(results[0].status,200);assert.equal(results[0].body.id,results[1].body.id);assert.equal(f.records.tasks.filter(t=>t.title==='Call a friend').length,1);
 assert.equal((await f.call(path,{cookie:sam,method:'PATCH',body:{archived:false}})).status,200);assert.equal((await f.call(path,{cookie:admin,method:'PATCH',body:{archived:false}})).status,404);
 assert.deepEqual((await f.call('/data',{cookie:admin})).body.inbox,[]);
});
test('rescheduling and quiet hours validate dates and account scope',async t=>{
 const f=await fixture(t),sam=await f.login('sam@test.local');Object.assign(f.records.tasks[0],{due:'2026-10-01',reminder:'2026-09-30'});
 assert.equal((await f.call('/tasks/10/reschedule',{cookie:sam,method:'PATCH',body:{due:'2026-10-03'}})).status,200);assert.equal(f.records.tasks[0].reminder,'2026-10-02');
 assert.equal((await f.call('/tasks/11/reschedule',{cookie:sam,method:'PATCH',body:{due:'2026-10-03'}})).status,404);
 assert.equal((await f.call('/tasks/10/reschedule',{cookie:sam,method:'PATCH',body:{due:'2026-02-30'}})).status,400);
 assert.equal((await f.call('/settings',{cookie:sam,method:'PUT',body:{name:'Sam',email:'',quiet_start:'22:00',quiet_end:'08:00'}})).status,200);assert.equal(f.users[1].quiet_start,'22:00');assert.equal(f.users[0].quiet_start,undefined);
});

test('close today saves atomically, prevents repeat moves and supports reopening without reverting tasks',async t=>{
 const {today}=await import('../../shared/domain.js'),{addDays}=await import('../../shared/planner.js');const date=today(),next=addDays(date,1);
 const f=await fixture(t),sam=await f.login('sam@test.local'),maya=await f.login('maya@test.local');Object.assign(f.records.tasks[0],{due:date,reminder:date});
 const body={task_ids:[10],move_to:next,went_well:'Finished planning',tomorrow_help:'Keep it small'};
 assert.equal((await f.call('/day_plans/today/close',{cookie:maya,method:'POST',body})).status,403);
 assert.equal((await f.call('/day_plans/today/close',{cookie:sam,method:'POST',body:{...body,task_ids:[10,11]}})).status,404);assert.equal(f.records.tasks[0].due,date);assert.equal(f.records.day_plans.length,0);
 const results=await Promise.all([1,2].map(()=>f.call('/day_plans/today/close',{cookie:sam,method:'POST',body})));assert.deepEqual(results.map(r=>r.status),[200,200]);assert.equal(f.records.day_plans.length,1);assert.ok(f.records.day_plans[0].closed_at);assert.equal(f.records.tasks[0].due,next);assert.equal(f.records.tasks[0].completed,0);
 assert.equal((await f.call('/day_plans/today/reopen',{cookie:sam,method:'POST',body:{}})).status,200);assert.equal(f.records.day_plans[0].closed_at,null);assert.equal(f.records.tasks[0].due,next);assert.equal(f.records.day_plans[0].went_well,'Finished planning');
 assert.equal((await f.call('/day_plans/today/close',{cookie:sam,method:'POST',body:{...body,task_ids:[]}})).status,200);assert.ok(f.records.day_plans[0].closed_at);
});

test('setup status is limited to administrators',async t=>{
 const f=await fixture(t),sam=await f.login('sam@test.local');assert.equal((await f.call('/system/status',{cookie:sam})).status,403);assert.equal((await f.call('/system/status')).status,401);
});

test('transaction rates default to settings, stay immutable across preference changes, and native amounts survive',async t=>{
 const f=await fixture(t),cookie=await f.login('maya@test.local');
 const input={type:'income',title:'LBP pay',amount:9000000,saved:1800000,currency:'LBP',date:'2026-10-01'};
 const first=await f.call('/entries',{cookie,method:'POST',body:input});assert.equal(first.status,201);
 const stored=f.records.entries.find(e=>e.id===first.body.id);assert.equal(stored.currency,'LBP');assert.equal(stored.amount,9000000);assert.equal(stored.saved,1800000);assert.equal(stored.exchange_rate,90000);
 const override=await f.call('/entries',{cookie,method:'POST',body:{...input,exchange_rate:95000}});assert.equal(override.status,201);assert.equal(f.records.entries.find(e=>e.id===override.body.id).exchange_rate,95000);assert.equal(f.users[2].current_rate,90000);
 assert.equal(f.users[2].last_currency,'LBP');
 assert.equal((await f.call('/settings',{cookie,method:'PUT',body:{name:'Maya',email:'',current_rate:100000}})).status,200);
 const next=await f.call('/entries',{cookie,method:'POST',body:{...input,title:'Next pay',currency:'USD',amount:10,saved:0}});assert.equal(next.status,201);
 assert.equal(f.records.entries.find(e=>e.id===next.body.id).exchange_rate,1);assert.equal(JSON.parse(f.records.entries.find(e=>e.id===next.body.id).rate_snapshot).LBP.rate,100000);assert.equal(stored.exchange_rate,90000);
 assert.equal(f.users[2].last_currency,'USD');
 assert.equal((await f.call('/entries/'+first.body.id,{cookie,method:'PATCH',body:{exchange_rate:1}})).status,404);
 const snapshot=await f.call('/data',{cookie});assert.equal(snapshot.body.settings.current_rate,100000);assert.equal(snapshot.body.settings.last_currency,'USD');
});

test('new entries require a configured rate, reject unknown currencies, and rate settings are permission scoped',async t=>{
 const f=await fixture(t),cookie=await f.login('maya@test.local'),tasks=await f.login('sam@test.local');
 f.users[2].current_rate=null;
 const body={type:'income',title:'Pay',amount:10,currency:'LBP',date:'2026-10-01'};
 const missing=await f.call('/entries',{cookie,method:'POST',body});assert.equal(missing.status,400);assert.match(missing.body.error,/exchange rate/);
 assert.equal((await f.call('/settings',{cookie:tasks,method:'PUT',body:{name:'Sam',email:'',current_rate:90000}})).status,403);
 for(const current_rate of [0,-1,1000001,'bad'])assert.equal((await f.call('/settings',{cookie,method:'PUT',body:{name:'Maya',email:'',current_rate}})).status,400);
 assert.equal((await f.call('/entries',{cookie,method:'POST',body:{...body,currency:'EUR'}})).status,400);
 assert.equal(f.records.entries.length,1);
});

test('subscription payments record actual currency and rate without changing the USD plan',async t=>{
 const f=await fixture(t),cookie=await f.login('maya@test.local');
 f.records.subscriptions.push({id:90,user_id:3,title:'Gym',amount:10,category:'Health',cycle:'monthly',renewal:'2026-10-01',active:1});
 f.records.entries.push({id:91,user_id:3,type:'income',currency:'LBP',exchange_rate:90000,amount:2000000,saved:0});
 const path='/subscriptions/90/renew';
 assert.equal((await f.call(path,{cookie,method:'POST',body:{renewal:'2026-10-01',currency:'LBP'}})).status,400);
 const paid=await f.call(path,{cookie,method:'POST',body:{renewal:'2026-10-01',currency:'LBP',amount:1000000,exchange_rate:100000}});assert.equal(paid.status,200);
 const payment=f.records.entries.find(e=>e.type==='expense');assert.equal(payment.amount,1000000);assert.equal(payment.currency,'LBP');assert.equal(payment.exchange_rate,100000);
 assert.equal(f.records.subscriptions[0].amount,10);assert.equal(f.records.subscriptions[0].renewal,'2026-11-01');
});

test('currency management is private, supports home references and preserves snapshots',async t=>{
 const f=await fixture(t),cookie=await f.login('maya@test.local'),other=await f.login('admin@test.local'),tasks=await f.login('sam@test.local');
 assert.equal((await f.call('/currencies',{cookie,method:'POST',body:{name:'Euro',symbol:'€',rate:.8}})).status,200);
 assert.equal((await f.call('/currencies/home',{cookie,method:'PUT',body:{currency:'Euro'}})).status,200);
 assert.equal((await f.call('/currencies',{cookie,method:'POST',body:{name:'Pound',symbol:'£',rate:.9,reference:'Euro'}})).status,200);
 assert.equal(JSON.parse(f.users[2].custom_currencies)[1].rate,.72);
 const input={type:'income',title:'Euro pay',amount:80,currency:'Euro',date:'2026-10-01',rate_snapshot:{Euro:{rate:999}}};
 const a=await f.call('/entries',{cookie,method:'POST',body:input});assert.equal(a.status,201);
 const row=f.records.entries.find(e=>e.id===a.body.id),snapshot=JSON.parse(row.rate_snapshot);assert.equal(snapshot.Euro.rate,.8);assert.equal(row.amount,80);assert.equal(row.exchange_rate,.8);
 assert.equal((await f.call('/currencies/rate',{cookie,method:'PUT',body:{currency:'Euro',rate:.9,reference:'USD'}})).status,200);
 assert.equal(JSON.parse(row.rate_snapshot).Euro.rate,.8);
 assert.equal((await f.call('/entries',{cookie:other,method:'POST',body:input})).status,400);
 assert.equal((await f.call('/currencies/home',{cookie:other,method:'PUT',body:{currency:'Euro'}})).status,400);
 for(const path of ['/currencies','/currencies/home','/currencies/rate'])assert.equal((await f.call(path,{cookie:tasks,method:path==='/currencies'?'POST':'PUT',body:{}})).status,403);
 const data=await f.call('/data',{cookie});assert.equal(data.body.settings.home_currency,'Euro');assert.equal(data.body.settings.last_currency,'Euro');
});
test('currency settings reject invalid, duplicate and self-referencing rates',async t=>{
 const f=await fixture(t),cookie=await f.login('maya@test.local');
 for(const body of [{name:'USD',rate:1},{name:'__proto__',rate:1},{name:'Bad',rate:0},{rate:1}])assert.equal((await f.call('/currencies',{cookie,method:'POST',body})).status,400);
 assert.equal((await f.call('/currencies/rate',{cookie,method:'PUT',body:{currency:'USD',rate:2}})).status,400);
 assert.equal((await f.call('/currencies/rate',{cookie,method:'PUT',body:{currency:'LBP',reference:'LBP',rate:2}})).status,400);
 assert.equal((await f.call('/currencies',{cookie,method:'POST',body:{symbol:'¥',rate:150}})).status,200);
 assert.equal((await f.call('/currencies',{cookie,method:'POST',body:{name:'Credits',rate:2}})).status,200);
 assert.equal(JSON.parse(f.users[2].custom_currencies).length,2);
});
