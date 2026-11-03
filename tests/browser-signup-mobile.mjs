import assert from 'node:assert/strict';
import {once} from 'node:events';
import {isAbsolute} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createApp} from '../server/src/app.js';
import {memoryDatabase} from './helpers/memory-db.js';
import {demoData} from '../client/src/features/demo/data.js';
import {tokenHash,hashPassword} from '../server/src/modules/auth/passwords.js';
import {accountEnabled} from '../shared/account-access.js';
const module=process.env.PLAYWRIGHT_MODULE||'playwright';
const {chromium}=await import(isAbsolute(module)?pathToFileURL(module).href:module);
const owner={id:1,name:'Owner',email:'owner@test.local',role:'admin',active:true,permissions:['money','tasks'],current_rate:90000,password_hash:await hashPassword('owner password')};
const users=[owner],sessions=new Map([[tokenHash('a'.repeat(64)),1]]),verification=new Map(),sent=[];
const db=memoryDatabase(Object.fromEntries(Object.entries(demoData()).filter(([,v])=>Array.isArray(v)).map(([key,rows])=>[key,rows.map(row=>({...row,user_id:1}))])),users);
const store={session:async hash=>users.find(user=>user.id===sessions.get(hash)),findByEmail:async email=>users.find(user=>user.email===email),findById:async id=>users.find(user=>user.id===id),create:async value=>{users.push({...value,id:users.length+1,role:'user'});return users.at(-1).id;},list:async()=>users,issueVerification:async(id,hash)=>verification.set(hash,id),verifyEmail:async hash=>{const id=verification.get(hash);if(!id)return false;verification.delete(hash);users.find(user=>user.id===id).email_verified=true;return true;},createSession:async(hash,id)=>{sessions.set(hash,id);return true;},deleteSession:async hash=>sessions.delete(hash),update:async(id,value)=>{const user=users.find(user=>user.id===id&&user.role==='user');if(!user)return false;Object.assign(user,value);for(const [hash,uid] of sessions)if(uid===id)sessions.delete(hash);return true;},usage:async()=>({counts:{accounts:users.length,enabled:users.filter(accountEnabled).length,active_5m:0,active_7d:0,sign_ins:0},activity:[],ai_requests_month:0,generated_at:new Date().toISOString()})};
const server=createApp({db,authStore:store,recoveryOptions:null,signupOptions:{sendGreeting:async(...args)=>{sent.push(args);return true;},google:{env:{GOOGLE_CLIENT_ID:'test-client',GOOGLE_CLIENT_SECRET:'test-secret',APP_ORIGIN:'https://yawmeh.me'}}}}).listen(0,'127.0.0.1');await once(server,'listening');
const browser=await chromium.launch({headless:true,channel:'msedge'}),errors=[];const base=`http://127.0.0.1:${server.address().port}`;
try{
 for(const width of [320,375,1440]){
  const context=await browser.newContext({viewport:{width,height:width<700?800:1000},hasTouch:width<700,isMobile:width<700,timezoneId:'Asia/Beirut'}),page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
  const press=async locator=>width<700?locator.tap():locator.click();
  await page.goto(base);await press(page.getByRole('button',{name:'Try admin demo',exact:true}));
  await press(page.locator('.sidebar').getByRole('button',{name:'Settings',exact:true}));await page.getByText('Your account & access',{exact:true}).waitFor();
  await press(page.getByRole('button',{name:'Open app launcher',exact:true}));await press(page.locator('.launcher').getByRole('button',{name:'Tasks',exact:true}));
  await press(page.getByRole('button',{name:'Add task',exact:true}));let dialog=page.locator('dialog[open]');await dialog.locator('input[name=title]').fill('Mobile task '+width);await press(dialog.getByRole('button',{name:'Save task',exact:true}));await dialog.waitFor({state:'detached'});
  const guide=page.locator('.demo-guides');await press(guide.getByRole('button',{name:'Watch guide · English / عربي',exact:true}));assert.match(await guide.locator('source').getAttribute('src'),/create-task/);await press(guide.getByRole('button',{name:'Watch guide · English / عربي',exact:true}));
  await press(page.locator('.sidebar').getByRole('button',{name:'Money',exact:true}));await press(page.getByRole('button',{name:'Income',exact:true}));dialog=page.locator('dialog[open]');await dialog.locator('input[name=title]').fill('Mobile income');await dialog.locator('input[name=amount]').fill('100');await press(dialog.getByRole('button',{name:'Save transaction',exact:true}));await dialog.waitFor({state:'detached'});
  await press(guide.getByRole('button',{name:'Watch guide · English / عربي',exact:true}));assert.match(await guide.locator('source').getAttribute('src'),/record-money/);
  await press(page.getByRole('button',{name:'Create your account',exact:true}));await page.getByRole('heading',{name:'Create your account',exact:true}).waitFor();
  assert.equal(await page.getByRole('link',{name:'Continue with Google',exact:true}).getAttribute('href'),'/api/auth/google');
  await page.locator('input[name=name]').fill('New member '+width);await page.locator('input[name=email]').fill(`member${width}@test.local`);await page.locator('input[name=password]').fill('12345678');await page.locator('input[name=confirm]').fill('12345678');await press(page.getByRole('button',{name:'Create account',exact:true}));await page.getByRole('link',{name:'yawmehme@gmail.com',exact:true}).waitFor();
  const user=users.at(-1);assert.equal(user.active,false);assert.equal(user.payment_status,'unpaid');
  await context.request.get(base+'/api/auth/verify-email?token='+sent.at(-1)[2],{maxRedirects:0});assert.equal(user.email_verified,true);
  const ownerContext=await browser.newContext({viewport:{width,height:width<700?800:1000},hasTouch:width<700,isMobile:width<700,timezoneId:'Asia/Beirut'});await ownerContext.addCookies([{name:'daywell_session',value:'a'.repeat(64),url:base}]);const ownerPage=await ownerContext.newPage();ownerPage.on('pageerror',error=>errors.push(error.message));await ownerPage.goto(base);
  await press(ownerPage.locator('.sidebar').getByRole('button',{name:'Users & access',exact:true}));const row=ownerPage.locator('.user-row').filter({hasText:user.email});await row.getByText(/Unpaid/).waitFor();await press(row.getByRole('button',{name:'Edit access',exact:true}));await ownerPage.getByRole('checkbox',{name:/Account enabled/}).check();await ownerPage.locator('select[name=accessMode]').selectOption('until');
  const local=await ownerPage.evaluate(()=>{const date=new Date(Date.now()+3600000);return new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,16);});await ownerPage.locator('input[name=accessUntil]').fill(local);await press(ownerPage.getByRole('button',{name:'Save access',exact:true}));await row.getByText('Active',{exact:true}).waitFor();assert.equal(accountEnabled(user),true);assert.ok(user.access_expires_at);
  await press(page.getByRole('button',{name:'Back to sign in',exact:true}));await page.locator('input[name=email]').fill(user.email);await page.locator('input[name=password]').fill('12345678');await press(page.getByRole('button',{name:'Sign in',exact:true}));await page.locator('.sidebar').waitFor();
  user.access_expires_at='2020-01-01T00:00:00.000Z';await page.reload();await page.getByRole('heading',{name:'Your account is inactive',exact:true}).waitFor();
  await press(row.getByRole('button',{name:'Edit access',exact:true}));await ownerPage.locator('select[name=accessMode]').selectOption('forever');await press(ownerPage.getByRole('button',{name:'Save access',exact:true}));assert.equal(user.access_expires_at,null);
  assert.ok(await ownerPage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await ownerPage.screenshot({path:`test-results/signup-owner-${width}.png`,fullPage:true});
  await ownerContext.close();await context.close();
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,widths:[320,375,1440],touchNavigation:true,demoVideos:true,signup:true,verification:true,timedAndOngoingAccess:true,browserErrors:errors}));
}finally{await browser.close();server.closeAllConnections();server.close();}
