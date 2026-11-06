// Isolated live-mode UI with mocked API responses; never calls a real AI provider.
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {isAbsolute} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createApp} from '../server/src/app.js';
import {demoData} from '../client/src/features/demo/data.js';
const module=process.env.PLAYWRIGHT_MODULE||'playwright';
const {chromium}=await import(isAbsolute(module)?pathToFileURL(module).href:module);
const server=createApp({db:{},authStore:{},recoveryOptions:null}).listen(0,'127.0.0.1');await once(server,'listening');
const browser=await chromium.launch({headless:true,channel:'msedge'}),errors=[];
try{
 for(const width of [375,1440]){
  const page=await browser.newPage({viewport:{width,height:900}}),calls=[],writes=[];
  const user={id:12345,name:'Test',role:'user',permissions:['tasks','money'],active:true};
  await page.addInitScript(()=>localStorage.setItem('daywell-companion:live:12345','pip'));
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/**',async route=>{
   const request=route.request(),path=new URL(request.url()).pathname;
   if(path==='/api/data')return route.fulfill({json:{...demoData(),user}});
   if(path==='/api/auth/me')return route.fulfill({json:{user}});
   if(path==='/api/companion/ai')return route.fulfill({json:{available:true,reason:null,model:'gemini-3.8-flash'}});
   if(path==='/api/companion/chat'){
    calls.push(request.postDataJSON());
    return calls.length===1?route.fulfill({status:503,json:{code:'provider_quota'}}):route.fulfill({json:{answer:'Compound interest means earning interest on earlier interest.',language:'en',engine:'gemini'}});
   }
   if(request.method()!=='GET')writes.push(path);
   return route.fulfill({json:{available:false,google:false}});
  });
  await page.goto(`http://127.0.0.1:${server.address().port}`);await page.locator('.companion-launcher').click();
  const panel=page.getByRole('dialog',{name:'Pip companion chat'});
  await panel.getByRole('button',{name:'English',exact:true}).first().click();
  const ask=async text=>{await page.locator('#companion-question').fill(text);await panel.getByRole('button',{name:'Send message',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.companion-chat-log')?.getAttribute('aria-busy')==='false');};
  await ask('add to saving $500');await panel.getByRole('button',{name:'Review & save',exact:true}).waitFor();assert.equal(calls.length,0);
  assert.match(await panel.locator('.companion-draft').innerText(),/500/);
  await ask('add task');await ask('Explain compound interest');
  await panel.getByText(/AI provider has reached a usage or rate limit/).waitFor({timeout:5000}).catch(async error=>{console.log(JSON.stringify({calls,panel:await panel.innerText()}));throw error;});assert.equal(calls.length,1,'fresh questions must escape the task title follow-up');
  await ask('Bde zed subscription claude b 20 dollar');await panel.locator('.companion-draft').getByText('claude',{exact:true}).waitFor();assert.equal(calls.length,1);assert.equal(await panel.getByText(/AI provider has reached a usage or rate limit/).count(),0,'a successful local draft clears the old timeout/quota notice');
  await ask('Explain compound interest again');await panel.getByText('Compound interest means earning interest on earlier interest.',{exact:true}).waitFor();
  assert.equal(calls[1].avatar,'pip');assert.ok(calls[1].dialogue.every(row=>!row.answer.includes('existing savings')));
  assert.deepEqual(writes,[]);await page.close();console.log(`Companion recovery passed at ${width}px`);
 }
 assert.deepEqual(errors,[]);
}finally{await browser.close();server.closeAllConnections();server.close();}
