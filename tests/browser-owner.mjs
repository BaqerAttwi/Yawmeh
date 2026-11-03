// Owner/family UI test against an in-memory store. No real accounts are created.
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {isAbsolute} from 'node:path';
import {pathToFileURL} from 'node:url';
import {mkdir} from 'node:fs/promises';
import {createApp} from '../server/src/app.js';
import {memoryDatabase} from './helpers/memory-db.js';
import {demoData} from '../client/src/features/demo/data.js';
import {tokenHash} from '../server/src/modules/auth/passwords.js';
const module=process.env.PLAYWRIGHT_MODULE||'playwright';
const {chromium}=await import(isAbsolute(module)?pathToFileURL(module).href:module);
const owner={id:1,name:'Family owner',email:'owner@test.local',role:'admin',active:true,permissions:['money','tasks'],current_rate:90000};
const member={id:2,name:'Family member',email:'member@test.local',role:'user',active:true,permissions:['tasks'],current_rate:90000};
const users=[owner,member],sample=demoData(),records=Object.fromEntries(Object.entries(sample).filter(([,value])=>Array.isArray(value)).map(([key,value])=>[key,value.map(row=>({...row,user_id:1}))]));
const db=memoryDatabase(records,users);
const store={async session(hash){return hash===tokenHash('a'.repeat(64))?owner:member;},async list(){return users;},async create(value){users.push({...value,id:users.length+1,role:'user',active:true});return users.length;},async update(id,value){const user=users.find(u=>u.id===id&&u.role==='user');if(!user)return false;Object.assign(user,value);return true;},async remove(id,email){const index=users.findIndex(user=>user.id===id&&user.role==='user'&&user.email===email);if(index<0)return false;users.splice(index,1);return true;},async usage(){return {mode:'family',paymentsEnabled:false,counts:{accounts:users.length,enabled:users.filter(u=>u.active).length,active_5m:1,active_7d:1,sign_ins:1},ai_requests_month:0,activity:users.map(user=>({id:user.id,last_seen_at:null,last_login_at:null,login_count:0})),generated_at:new Date().toISOString()};}};
const server=createApp({db,authStore:store,recoveryOptions:null}).listen(0,'127.0.0.1');await once(server,'listening');
const browser=await chromium.launch({headless:true,channel:'msedge'}),errors=[];
await mkdir('test-results',{recursive:true});
try{
 for(const width of [375,1440]){
  const context=await browser.newContext({viewport:{width,height:width===375?740:900}}),base=`http://127.0.0.1:${server.address().port}`;
  await context.addCookies([{name:'daywell_session',value:'a'.repeat(64),url:base}]);
  const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));await page.goto(base);
  await page.locator('.sidebar').getByRole('button',{name:'Users & access',exact:true}).click();
  await page.getByRole('heading',{name:'Family testing',exact:true}).waitFor();
  await page.getByText('Payments not enabled',{exact:true}).waitFor();
  const before=users.length;
  await page.getByRole('textbox',{name:'Full name',exact:true}).fill(`New family member ${width}`);
  await page.getByRole('textbox',{name:'Sign-in email',exact:true}).fill(`family${width}@test.local`);
  await page.locator('input[name=password]').fill('family test password');
  await page.getByRole('button',{name:'Create user',exact:true}).click();
  await page.getByText('Account created. Email is not configured; share the initial sign-in details privately.',{exact:true}).waitFor();
  assert.equal(users.length,before+1);assert.equal(users.at(-1).role,'user');
  await page.locator('.owner-metrics > div').filter({hasText:'Total accounts'}).getByText(String(users.length),{exact:true}).waitFor();
  const row=page.locator('.user-row').filter({hasText:`New family member ${width}`});
  await row.getByRole('button',{name:'Edit access',exact:true}).click();
  await page.getByRole('checkbox',{name:/Account enabled/}).uncheck();
  await page.getByRole('button',{name:'Save access',exact:true}).click();
  await row.getByText('Disabled',{exact:true}).waitFor();assert.equal(users.at(-1).active,false);
  page.once('dialog',dialog=>dialog.dismiss());
  await row.getByRole('button',{name:'Delete user',exact:true}).click();assert.equal(users.length,before+1);
  page.once('dialog',dialog=>dialog.accept());
  await row.getByRole('button',{name:'Delete user',exact:true}).click();
  await row.waitFor({state:'detached'});assert.equal(users.length,before);
  assert.equal(await page.locator('.user-row').filter({hasText:'Family owner'}).getByRole('button',{name:'Delete user',exact:true}).count(),0);
  await page.locator('.owner-activity > summary').click();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  await page.screenshot({path:`test-results/owner-${width}.png`,fullPage:true});
  await context.addCookies([{name:'daywell_session',value:'b'.repeat(64),url:base}]);await page.reload();
  await page.locator('.sidebar').getByRole('button',{name:'Tasks',exact:true}).waitFor();
  assert.equal(await page.locator('.sidebar').getByRole('button',{name:'Users & access',exact:true}).count(),0);
  assert.equal((await context.request.get(base+'/api/admin/usage')).status(),403);
  await context.close();
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,widths:[375,1440],familyAccountsCreated:2,browserErrors:errors}));
}finally{await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
