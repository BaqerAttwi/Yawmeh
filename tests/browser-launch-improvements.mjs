import assert from 'node:assert/strict';
import {once} from 'node:events';
import {isAbsolute} from 'node:path';
import {pathToFileURL} from 'node:url';
import {mkdir} from 'node:fs/promises';
import {createApp} from '../server/src/app.js';
import {memoryDatabase} from './helpers/memory-db.js';
import {hashPassword} from '../server/src/modules/auth/passwords.js';

const module=process.env.PLAYWRIGHT_MODULE||'playwright';
const {chromium}=await import(isAbsolute(module)?pathToFileURL(module).href:module);
const user={id:1,name:'Startup tester',email:'startup@test.local',role:'user',permissions:['tasks'],active:true,current_rate:90000,password_hash:await hashPassword('startup password')};
const sessions=new Set();
const authStore={
 session:async hash=>sessions.has(hash)?user:null,
 findByEmail:async email=>email===user.email?user:null,
 createSession:async hash=>sessions.add(hash),
 deleteSession:async hash=>sessions.delete(hash),
};
const db=memoryDatabase({},[user]);
const google={env:{GOOGLE_CLIENT_ID:'test-id',GOOGLE_CLIENT_SECRET:'test-secret',APP_ORIGIN:'https://yawmeh.me'}};
const server=createApp({db,authStore,recoveryOptions:null,signupOptions:{google}}).listen(0,'127.0.0.1');
await once(server,'listening');
const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,channel:'msedge'}),errors=[];
await mkdir('test-results',{recursive:true});
try{
 const home=await fetch(base,{headers:{'Sec-Fetch-Site':'none'}});assert.equal(home.headers.get('cache-control'),'no-cache');
 const html=await home.text(),asset=html.match(/src="(\/assets\/[^\"]+\.js)"/)[1];
 assert.match(html,/data-check-session="false"/);
 assert.match(html,/data-has-session-cookie="false"/);
 const external=await fetch(base,{headers:{'Sec-Fetch-Site':'cross-site'}});
 assert.match(await external.text(),/data-check-session="true"/);
 const cookie='daywell_session='+'a'.repeat(64);
 const returning=await fetch(base,{headers:{cookie}});
 assert.equal(returning.headers.get('cache-control'),'private, no-store');
 const returningHtml=await returning.text();
 assert.match(returningHtml,/data-check-session="true"/);
 assert.match(returningHtml,/data-has-session-cookie="true"/);
 const smallLogo=await fetch(base+'/branding/yawmeh-logo-192.webp');
 assert.equal(smallLogo.status,200);
 assert.ok((await smallLogo.arrayBuffer()).byteLength<30000);
 for(const [file,type] of [
  ['yawmeh-logo.svg','image/svg+xml'],['yawmeh-logo-512.webp','image/webp'],
  ...['app-icon-192.png','app-icon-512.png','apple-touch-icon.png','favicon-32.png','favicon-48.png'].map(file=>[file,'image/png']),
 ]){
  const response=await fetch(base+'/branding/'+file);
  assert.equal(response.status,200,file);
  assert.ok(response.headers.get('content-type').startsWith(type),file);
  await response.arrayBuffer();
 }
 const manifest=await (await fetch(base+'/manifest.webmanifest')).json();
 assert.deepEqual(manifest.icons,[192,512].map(size=>({src:'/branding/app-icon-'+size+'.png',sizes:size+'x'+size,type:'image/png',purpose:'any'})));
 const cached=await fetch(base+asset);assert.match(cached.headers.get('cache-control'),/max-age=31536000, immutable/);
 const privateResponse=await fetch(base+'/api/data');assert.equal(privateResponse.headers.get('cache-control'),'no-store');
 for(const width of [375,1440]){
  const page=await browser.newPage({viewport:{width,height:900}});page.on('pageerror',e=>errors.push(e.message));
  let release;const hold=new Promise(resolve=>{release=resolve;});const requests=[],workspaceAssets=[];
  const isWorkspaceAsset=url=>/\/assets\/App-[^/]+\.js$/.test(new URL(url).pathname);
  page.on('request',r=>{
   if(r.url().includes('/api/'))requests.push(new URL(r.url()).pathname);
   if(isWorkspaceAsset(r.url()))workspaceAssets.push(r.url());
  });
  await page.goto(base);
  await page.getByRole('button',{name:'Sign in',exact:true}).waitFor();
  assert.equal(await page.getByRole('link',{name:'Continue with Google'}).getAttribute('href'),'/api/auth/google');
  assert.deepEqual(requests,[],'the signed-out page needs no startup API requests');
  assert.deepEqual(workspaceAssets,[],'the signed-out page keeps the workspace deferred');
  await page.context().addCookies([{name:'daywell_session',value:'a'.repeat(64),url:base,httpOnly:true,sameSite:'Strict'}]);
  await page.route('**/api/data',async route=>{await hold;await route.fulfill({status:401,contentType:'application/json',body:JSON.stringify({error:'Please sign in.'})});});
  const workspaceDownload=page.waitForResponse(response=>isWorkspaceAsset(response.url())&&response.ok());
  await page.goto(base);
  await page.locator('.workspace-loading img').waitFor();
  assert.deepEqual(await page.locator('.workspace-loading img').evaluate(async img=>{
   await img.decode();
   return [img.getAttribute('src'),img.width,img.height,img.naturalWidth];
  }),['/branding/yawmeh-logo-192.webp',48,48,192]);
  assert.equal(await page.locator('.workspace-loading strong').innerText(),'yawmeh.me');
  await page.locator('.workspace-skeleton').waitFor();
  await workspaceDownload;
  assert.equal(workspaceAssets.length,1,'workspace code downloads while account data is still pending');
  await page.screenshot({path:`test-results/loading-${width}.png`});release();
  await page.getByRole('button',{name:'Sign in',exact:true}).waitFor();
  assert.deepEqual(requests,['/api/data'],'a returning session makes one workspace request');
  await page.context().clearCookies();
  const password=page.locator('input[name=password]');await password.fill('testpass');
  await page.getByRole('button',{name:'Show password',exact:true}).click();assert.equal(await password.getAttribute('type'),'text');
  await page.getByRole('button',{name:'Hide password',exact:true}).click();assert.equal(await password.getAttribute('type'),'password');
  await page.goto(base+'/#reset='+'a'.repeat(64));await page.reload();
  const newPassword=page.locator('input[name=newPassword]');await newPassword.waitFor();
  assert.equal(await newPassword.getAttribute('minlength'),'8');assert.equal(await newPassword.getAttribute('maxlength'),'24');
  await newPassword.fill('12345678');await page.locator('input[name=confirm]').fill('12345678');
  assert.equal(await newPassword.evaluate(el=>el.checkValidity()),true);
  await page.getByRole('button',{name:'Show password',exact:true}).first().click();assert.equal(await newPassword.getAttribute('type'),'text');
  assert.equal(await page.locator('input[name=confirm]').getAttribute('type'),'password');
  await page.goto(base);await page.reload();await page.getByRole('button',{name:'Try admin demo'}).click();
  await page.locator('.companion-launcher').click();
  await page.locator('#companion-question').fill('شو عندي اليوم');
  await page.getByRole('button',{name:'إرسال الرسالة',exact:true}).click();
  await page.locator('.companion-reply[dir=rtl]').waitFor();
  await page.locator('#companion-question').fill('baddi a3ref masare');
  await page.getByRole('button',{name:'إرسال الرسالة',exact:true}).click();
  await page.waitForFunction(()=>document.querySelectorAll('.companion-reply[dir=rtl]').length===2);
  assert.ok(await page.locator('.companion-reply').last().innerText().then(text=>/[\u0600-\u06ff]/.test(text)));
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.close();
 }
 const loginPage=await browser.newPage();
 await loginPage.goto(base);
 await loginPage.locator('input[name=email]').fill(user.email);
 await loginPage.locator('input[name=password]').fill('startup password');
 const loadWorkspace=()=>loginPage.waitForResponse(response=>new URL(response.url()).pathname==='/api/data'&&response.ok());
 let workspace=loadWorkspace();
 await loginPage.getByRole('button',{name:'Sign in',exact:true}).click();
 await workspace;
 await loginPage.getByRole('button',{name:'Account menu'}).waitFor();
 workspace=loadWorkspace();
 await loginPage.reload();
 await workspace;
 await loginPage.getByRole('button',{name:'Account menu'}).waitFor();
 await loginPage.close();
 const page=await browser.newPage();
 await page.context().addCookies([{name:'daywell_session',value:'a'.repeat(64),url:base,httpOnly:true,sameSite:'Strict'}]);
 await page.route('**/api/data',()=>{});
 await page.goto(base);await page.locator('.workspace-loading').waitFor();
 await page.getByRole('button',{name:'Sign in',exact:true}).waitFor({timeout:25000});
 assert.match(await page.locator('.error').innerText(),/taking too long/);
 assert.equal(errors.length,0,JSON.stringify(errors));
 console.log(JSON.stringify({passed:true,widths:[375,1440],singleStartupRequest:true,timeoutRecovery:true,browserErrors:errors}));
}finally{await browser.close();server.closeAllConnections();server.close();}
