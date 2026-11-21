import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createServer} from 'node:http';
import {createApp} from '../../server/src/app.js';
import {tokenHash} from '../../server/src/modules/auth/passwords.js';
import {mysqlCompanionUsage} from '../../server/src/modules/ai/companion-usage.js';
import {companionAILimits,companionAIAvailable} from '../../server/src/modules/ai/companion.js';

const input={question:'Please help me organize what I should do',language:'en',avatar:'sage',start:'2026-11-01',end:'2026-11-01',history:[]};
const data={settings:{current_rate:90000},entries:[],tasks:[{id:1,title:'Private task stays on server',due:'2026-01-01',priority:'high',completed:0}],subscriptions:[],budgets:[],goals:[],goal_moves:[],day_plans:[],inbox:[],subtasks:[]};
async function fixture(t,{intent={recommendation:'Start with one overdue task and leave time for a break.'},enabled=true,quota=true,providerStatus=200,raw,finishReason='STOP',env={},fetchOverride,usageError=false,loadError=false}={}){
 const requests=[],reservations=[],loads=[];
 const users=new Map(['a','b','c'].map((letter,index)=>[tokenHash(letter.repeat(64)),{id:index+1,name:'Member',email:'private-email@example.local',role:'user',active:true,permissions:index===0?['tasks']:index===1?['money']:[]}]));
 const options={env:{COMPANION_AI_ENABLED:enabled?'true':'false',GEMINI_API_KEY:'server-only-test-key',TIMEZONE:'Asia/Beirut',...env},usage:{async reserve(id,day,limits){if(usageError)throw new Error('PRIVATE DATABASE FAILURE');reservations.push({id,day,limits});return quota;}},loadData:async user=>{if(loadError)throw new Error('PRIVATE RECORDS FAILURE');loads.push(user.id);return structuredClone(data);},fetchAI:async(url,options)=>{requests.push({url,...options,body:JSON.parse(options.body)});if(fetchOverride)return fetchOverride(url,options);return new Response(raw??JSON.stringify({candidates:[{finishReason,content:{parts:[{text:JSON.stringify(intent)}]}}]}),{status:providerStatus,headers:{'Content-Type':'application/json'}});}};
 const server=createApp({db:{},authStore:{session:async hash=>users.get(hash)},recoveryOptions:null,companionOptions:options}).listen(0,'127.0.0.1');await once(server,'listening');
 t.after(()=>{server.closeAllConnections();server.close();});
 const call=(body=input,{token='a',path='chat',origin}={})=>fetch(`http://127.0.0.1:${server.address().port}/api/companion/${path}`,{method:path==='ai'?'GET':'POST',headers:{'Content-Type':'application/json',...(token?{Cookie:'daywell_session='+token.repeat(64)}:{}),...(origin?{Origin:origin}:{})},...(path==='ai'?{}:{body:JSON.stringify(body)})});
 return {call,requests,reservations,loads};
}

test('Gemini requires authentication, app permissions, explicit enablement and same-origin JSON',async t=>{
 const f=await fixture(t,{enabled:false});
 assert.equal((await f.call(input,{token:null})).status,401);
 assert.equal((await f.call(input,{token:'c'})).status,403);
 assert.equal((await f.call(input,{origin:'https://attacker.example'})).status,403);
 assert.equal((await f.call()).status,503);
 assert.equal((await (await f.call(input,{path:'ai'})).json()).available,false);
 assert.equal(f.requests.length,0);
});

test('AI adds advice to deterministic reports while private records stay on the server',async t=>{
 const f=await fixture(t),response=await f.call();
 assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');
 const reply=await response.json();assert.equal(reply.engine,'gemini');assert.match(reply.answer,/Private task stays on server/);assert.match(reply.recommendation,/Start with one overdue task/);
 const request=f.requests[0],wire=JSON.stringify(request.body);
 assert.equal(request.headers['x-goog-api-key'],'server-only-test-key');
 assert.equal(request.redirect,'error','credentials must never follow provider redirects');
 assert.match(request.url,/gemini-3\.8-flash:generateContent$/);
 assert.doesNotMatch(wire,/Private task stays on server|private-email|server-only-test-key/);
 assert.equal(request.body.generationConfig.maxOutputTokens,8192);
 assert.equal(request.body.tools,undefined);assert.deepEqual(f.loads,[1]);
 assert.deepEqual(f.reservations[0].limits,{daily:10,monthly:1000});
});

test('Arabic AI replies localize headings and keep private account titles on the server',async t=>{
 const recommendation='بلّش بمهمة وحدة وخد استراحة بعدها.';
 const f=await fixture(t,{intent:{recommendation}});
 const response=await f.call({...input,language:'ar',question:'رتّب يومي'});
 assert.equal(response.status,200);const reply=await response.json();assert.equal(reply.language,'ar');assert.match(reply.answer,/\p{Script=Arabic}/u);
 assert.equal(reply.recommendation,recommendation);
 assert.doesNotMatch(JSON.stringify(f.requests),/Private task stays on server/);
 assert.deepEqual(f.reservations[0].limits,{daily:10,monthly:1000});
});

test('AI failures report bounded timing and model diagnostics without message content or credentials',async t=>{
 const logs=[];t.mock.method(console,'warn',(...args)=>logs.push(args));
 const f=await fixture(t,{providerStatus:503}),response=await f.call({...input,question:'Please plan my day'});
 assert.equal(response.status,503);assert.equal((await response.json()).code,'provider_busy');
 const diagnostic=JSON.parse(logs.find(row=>row[0]==='[companion-ai]')[1]);
 assert.equal(diagnostic.phase,'provider');assert.equal(diagnostic.providerStatus,503);assert.equal(diagnostic.timeoutMs,40000);assert.equal(diagnostic.model,'gemini-3.8-flash');assert.ok(diagnostic.elapsedMs>=0);
 assert.doesNotMatch(JSON.stringify(logs),/Please plan my day|server-only-test-key|private-email/);
});

test('a stalled AI provider is aborted and reports a timeout instead of hanging',async t=>{
 const f=await fixture(t,{env:{COMPANION_AI_TIMEOUT_MS:'5000'},fetchOverride:(_url,{signal})=>new Promise((resolve,reject)=>{signal.addEventListener('abort',()=>reject(new Error('aborted')),{once:true});})});
 const started=Date.now(),response=await f.call();assert.equal(response.status,503);assert.equal((await response.json()).code,'timeout');assert.ok(Date.now()-started<10000);
});

test('zero and invalid quota settings disable paid calls instead of silently using defaults',async t=>{
 assert.deepEqual(companionAILimits({}),{daily:10,monthly:1000});
 assert.deepEqual(companionAILimits({COMPANION_AI_DAILY_LIMIT:'999',COMPANION_AI_MONTHLY_LIMIT:'99999'}),{daily:10,monthly:1000});
 for(const setting of ['0','-1','NaN','Infinity','2.5','typo','9007199254740992']){
  const env={COMPANION_AI_ENABLED:'true',GEMINI_API_KEY:'test',COMPANION_AI_MONTHLY_LIMIT:setting};
  assert.equal(companionAIAvailable(env),false,setting);
  const f=await fixture(t,{env});assert.equal((await f.call()).status,503);assert.equal(f.reservations.length,0);assert.equal(f.requests.length,0);
 }
});

test('a real upstream redirect cannot forward the Gemini key to another host',async t=>{
 let sinkCalls=0;
 const sink=createServer((req,res)=>{sinkCalls++;res.end('{}');}).listen(0,'127.0.0.1');await once(sink,'listening');
 const upstream=createServer((req,res)=>{assert.equal(req.headers['x-goog-api-key'],'server-only-test-key');res.writeHead(302,{Location:`http://127.0.0.1:${sink.address().port}/capture`});res.end();}).listen(0,'127.0.0.1');await once(upstream,'listening');
 t.after(()=>{for(const server of [sink,upstream]){server.closeAllConnections();server.close();}});
 const f=await fixture(t,{fetchOverride:(_url,options)=>fetch(`http://127.0.0.1:${upstream.address().port}/provider`,options)});
 const response=await f.call();assert.equal(response.status,503);assert.equal(sinkCalls,0);
 assert.doesNotMatch(await response.text(),/server-only-test-key/);
});

test('quota exhaustion, invalid input and provider failures fail safely without leaking secrets',async t=>{
 const limited=await fixture(t,{quota:false});assert.equal((await limited.call()).status,429);assert.equal(limited.requests.length,0);
 const malformed=await fixture(t);assert.equal((await malformed.call({...input,question:'x'.repeat(1001)})).status,400);assert.equal(malformed.reservations.length,0);
 for(const options of [{providerStatus:401,raw:'server-only-test-key PRIVATE'},{raw:'not JSON'},{finishReason:'MAX_TOKENS'},{raw:'x'.repeat(33000)}]){
  const f=await fixture(t,options),response=await f.call();assert.equal(response.status,503);assert.doesNotMatch(await response.text(),/server-only-test-key|PRIVATE/);assert.equal(f.reservations.length,1);
 }
});

test('persistent quota reserves monthly first and rolls back both counters on denial',async()=>{
 const rows=new Map();let commits=0,rollbacks=0,saved;
 const connection={async beginTransaction(){saved=new Map(rows);},async commit(){commits++;},async rollback(){rows.clear();for(const [k,v] of saved)rows.set(k,v);rollbacks++;},release(){},async query(sql,args){
  const scope=args[0];
  if(sql.startsWith('INSERT')){if(!rows.has(scope))rows.set(scope,0);return [{}];}
  if(sql.startsWith('SELECT'))return [[{requests:rows.get(scope)}]];
  rows.set(scope,rows.get(scope)+1);return [{}];
 }};
 const store=mysqlCompanionUsage({getConnection:async()=>connection}),limits={daily:1,monthly:2};
 assert.equal(await store.reserve(1,'2026-11-01',limits),true);
 assert.equal(await store.reserve(1,'2026-11-01',limits),false);
 assert.equal(rows.get('month:2026-11'),1);
 assert.equal(await store.reserve(2,'2026-11-01',limits),true);
 assert.equal(await store.reserve(3,'2026-11-01',limits),false);
 assert.equal(await store.reserve(1,'2026-12-01',limits),true);
 assert.equal(commits,3);assert.equal(rollbacks,2);
 const dailyTen={daily:10,monthly:1000};
 for(let i=0;i<10;i++)assert.equal(await store.reserve(7,'2027-01-01',dailyTen),true);
 assert.equal(await store.reserve(7,'2027-01-01',dailyTen),false,'the eleventh request is denied');
 assert.equal(rows.get('user:7:2027-01-01'),10,'denial must not consume another request');
 assert.equal(await store.reserve(8,'2027-01-01',dailyTen),true,'another account has its own allowance');
 assert.equal(await store.reserve(7,'2027-01-02',dailyTen),true,'a new calendar day restores the allowance');
});


test('AI capability and failure codes distinguish configuration, allowance and provider failures',async t=>{
 for(const [options,expected] of [[{enabled:false},'disabled'],[{env:{GEMINI_API_KEY:''}},'missing_key'],[{env:{COMPANION_AI_DAILY_LIMIT:'0'}},'allowance_disabled']]){
  const f=await fixture(t,options);const capability=await (await f.call(input,{path:'ai'})).json();assert.equal(capability.available,false);assert.equal(capability.reason,expected);assert.equal((await (await f.call()).json()).code,expected);
 }
 for(const [status,code] of [[401,'provider_auth'],[403,'provider_auth'],[404,'model_unavailable'],[429,'provider_quota'],[400,'provider_request'],[500,'provider_busy']]){
  const f=await fixture(t,{providerStatus:status,raw:'PRIVATE server-only-test-key'});const reply=await (await f.call()).json();assert.equal(reply.code,code);assert.doesNotMatch(JSON.stringify(reply),/PRIVATE|server-only/);
 }
 const limited=await fixture(t,{quota:false});assert.equal((await (await limited.call()).json()).code,'allowance_reached');
 const malformed=await fixture(t,{raw:'broken JSON'});assert.equal((await (await malformed.call()).json()).code,'invalid_response');
});

test('companion model is configurable without accepting arbitrary URLs or forcing minimal reasoning',async t=>{
 const f=await fixture(t,{env:{COMPANION_AI_MODEL:'gemini-3.1-flash-lite'}});assert.equal((await f.call()).status,200);assert.match(f.requests[0].url,/models\/gemini-3\.1-flash-lite:generateContent$/);assert.equal(f.requests[0].body.generationConfig.thinkingConfig,undefined);
 const invalid=await fixture(t,{env:{COMPANION_AI_MODEL:'https://attacker.example'}});assert.equal((await (await invalid.call()).json()).code,'model_unavailable');assert.equal(invalid.requests.length,0);
});


test('database and record failures are distinct from AI transport failures',async t=>{
 for(const [options,code] of [[{usageError:true},'usage_unavailable'],[{loadError:true},'records_unavailable']]){
  const f=await fixture(t,options),response=await f.call();assert.equal(response.status,503);const reply=await response.json();assert.equal(reply.code,code);assert.doesNotMatch(JSON.stringify(reply),/PRIVATE|FAILURE/);
 }
});



test('only authorized explicit reports reach Gemini or consume its allowance',async t=>{
 const f=await fixture(t);
 for(const question of ['add 100$', 'add task Call Mama', 'change the amount to 30', 'reverse income Salary', 'write a polite message', 'tell me a joke', 'plan my day and add a task', 'how can I save more?']){
  const response=await f.call({...input,question});
  assert.equal(response.status,400,question);
  assert.equal((await response.json()).code,'report_only',question);
 }
 assert.deepEqual(f.loads,[]);
 assert.equal(f.requests.length,0);
 assert.equal(f.reservations.length,0);
 const response=await f.call({...input,question:'How can I save more?'},{token:'b'});
 assert.equal(response.status,200);
 assert.match((await response.json()).answer,/No expenses recorded/);
 const sent=JSON.parse(f.requests[0].body.contents[0].parts[0].text);
 assert.deepEqual(sent,{language:'en',signals:{hasRecentExpenses:false,hasRarelyUsedSubscriptions:false,hasActiveBudget:false}});
});

test('older clients can send context but no question, draft or chat history reaches Gemini',async t=>{
 const f=await fixture(t);
 const response=await f.call({...input,question:'Weekly report',history:['Prior private question'],dialogue:[{question:'Private message',answer:'Private answer'}],context:{draft:{type:'task',initial:{title:'Private draft'}}}});
 assert.equal(response.status,200);
 const request=JSON.stringify(f.requests[0].body);
 assert.doesNotMatch(request,/Private|Weekly report|2026-11-01/);
 assert.deepEqual(JSON.parse(f.requests[0].body.contents[0].parts[0].text),{language:'en',signals:{hasTasksDue:false,hasOverdueTasks:false,hasScheduledTasks:false,hasTasksWithoutEstimates:false}});
});

test('provider output cannot introduce drafts, changes, or unbounded recommendations',async t=>{
 for(const intent of [{recommendation:'A valid tip',draft:{type:'task'}},{recommendation:'A valid tip',change:{}},{recommendation:'x'.repeat(501)}]){
  const f=await fixture(t,{intent});
  const response=await f.call();
  assert.equal(response.status,503);
  assert.equal((await response.json()).code,'invalid_response');
 }
});

test('Reports requests get scoped summaries without sending records or widening access',async t=>{
 const advice={summary:'No money activity was recorded.',recommendation:'Add expenses as they happen.'};
 const f=await fixture(t,{intent:advice});
 const body={...input,question:'report',reportArea:'money'};
 assert.equal((await f.call(body)).status,403);
 assert.equal((await f.call({...body,question:'How can I save more?'},{token:'b'})).status,400);
 assert.equal(f.requests.length,0);
 const response=await f.call(body,{token:'b'});
 assert.equal(response.status,200);
 assert.deepEqual(await response.json(),{language:'en',...advice,engine:'gemini'});
 const sent=JSON.parse(f.requests[0].body.contents[0].parts[0].text);
 assert.deepEqual(sent,{language:'en',signals:{hasRecentExpenses:false,hasRarelyUsedSubscriptions:false,hasActiveBudget:false,hasActivity:false}});
 assert.doesNotMatch(JSON.stringify(f.requests[0].body),/Private task|private-email|2026-11-01/);
});
