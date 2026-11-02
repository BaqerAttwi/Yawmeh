// Uses a stub Gemini provider and test database; no paid calls or real records.
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {isAbsolute} from 'node:path';
import {pathToFileURL} from 'node:url';
import {mkdir} from 'node:fs/promises';
import {createApp} from '../server/src/app.js';
import {memoryDatabase} from './helpers/memory-db.js';
import {demoData} from '../client/src/features/demo/data.js';
import {today} from '../shared/domain.js';
import {tokenHash} from '../server/src/modules/auth/passwords.js';
const module=process.env.PLAYWRIGHT_MODULE||'playwright';
const {chromium}=await import(isAbsolute(module)?pathToFileURL(module).href:module);
const user={id:1,name:'Test member',email:'test@example.local',role:'user',active:true,permissions:['money','tasks'],current_rate:90000};
const sample=demoData(),records=Object.fromEntries(Object.entries(sample).filter(([,v])=>Array.isArray(v)).map(([k,v])=>[k,v.map(r=>({...r,user_id:1}))]));
const secondUser={...user,id:2};
const db=memoryDatabase(records,[user,secondUser]);
let intent='draft',calls=0,releaseDelayed;
const server=createApp({db,authStore:{session:async hash=>hash===tokenHash('a'.repeat(64))?user:secondUser},recoveryOptions:null,companionOptions:{env:{COMPANION_AI_ENABLED:'true',GEMINI_API_KEY:'test-key'},usage:{reserve:async()=>true},fetchAI:async()=>{
 calls++;if(intent==='failure')return new Response('private error',{status:503});
 if(intent==='delayed')await new Promise(resolve=>{releaseDelayed=resolve;});
 const value=intent==='draft'?{intent:'draft',draft:{type:'task',initial:{title:'AI browser draft',due:today()}}}:{intent:'off_topic'};
 return new Response(JSON.stringify({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(value)}]}}]}),{headers:{'Content-Type':'application/json'}});
}}}).listen(0,'127.0.0.1');await once(server,'listening');
const browser=await chromium.launch({headless:true,channel:'msedge'}),errors=[];
await mkdir('test-results',{recursive:true});
try{
 for(const width of [375,1440]){
  const context=await browser.newContext({viewport:{width,height:width===375?740:900}});
  const base=`http://127.0.0.1:${server.address().port}`;
  await context.addCookies([{name:'daywell_session',value:(width===375?'a':'b').repeat(64),url:base}]);
  const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
  await page.goto(base);await page.locator('.companion-launcher').click();
  await page.getByRole('button',{name:'Companion settings',exact:true}).click();
  const toggle=page.getByRole('checkbox',{name:'Understand requests with Gemini',exact:true});
  assert.equal(await toggle.isChecked(),true,'AI defaults on when no preference is saved');
  await toggle.uncheck();
  await page.reload();await page.locator('.companion-launcher').click();
  await page.getByRole('button',{name:'Companion settings',exact:true}).click();
  assert.equal(await toggle.isChecked(),false,'An explicit opt-out survives reload');
  await toggle.check();await page.getByRole('button',{name:'Companion settings',exact:true}).click();
  const before=records.tasks.length;intent='draft';
  const ask=async text=>{await page.locator('#companion-question').fill(text);await page.getByRole('button',{name:'Send message',exact:true}).click();};
  await ask('Prepare a small task for today');
  await page.locator('.companion-draft').waitFor();assert.equal(records.tasks.length,before,'AI must not write');
  await page.getByRole('button',{name:'Review & save',exact:true}).click();
  const dialog=page.locator('dialog[open]');await dialog.locator('input[name=title]').fill(`Confirmed AI task ${width}`);
  await dialog.getByRole('button',{name:'Save task',exact:true}).click();await dialog.waitFor({state:'detached'});
  assert.equal(records.tasks.length,before+1,'only explicit Save writes');
  await page.locator('.companion-launcher').click();intent='off_topic';
  await ask('Tell me about political news');
  await page.getByText('I can help with your tasks, money and using this app. Shall we plan your day?',{exact:true}).waitFor();
  intent='failure';await ask('What are my savings?');
  await page.getByText('AI unavailable or allowance reached. Using local responses.',{exact:true}).waitFor();
  const replyCount=await page.locator('.companion-reply').count();intent='delayed';
  const pendingRequest=page.waitForRequest(request=>request.url().endsWith('/api/companion/chat'));
  releaseDelayed=null;await ask('Please plan my day');await pendingRequest;
  for(let i=0;!releaseDelayed&&i<100;i++)await new Promise(resolve=>setTimeout(resolve,10));
  assert.equal(typeof releaseDelayed,'function','provider must be pending during close');
  await page.locator('.companion-panel-header').getByRole('button',{name:'Close companion chat',exact:true}).click();
  releaseDelayed();
  await page.waitForTimeout(650);await page.locator('.companion-launcher').click();
  assert.equal(await page.locator('.companion-reply').count(),replyCount,'closing chat must discard late replies');
  await page.screenshot({path:`test-results/gemini-${width}.png`});
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);assert.equal(overflow,false);
  await context.close();
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,widths:[375,1440],providerCalls:calls,browserErrors:errors}));
}finally{await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
