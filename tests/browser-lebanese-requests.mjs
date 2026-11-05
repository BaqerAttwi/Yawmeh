import assert from 'node:assert/strict';
import {once} from 'node:events';
import {isAbsolute} from 'node:path';
import {pathToFileURL} from 'node:url';
import {mkdir} from 'node:fs/promises';
import {createApp} from '../server/src/app.js';
import {demoData} from '../client/src/features/demo/data.js';
const module=process.env.PLAYWRIGHT_MODULE||'playwright';
const {chromium}=await import(isAbsolute(module)?pathToFileURL(module).href:module);
const server=createApp({db:{},authStore:{},recoveryOptions:null}).listen(0,'127.0.0.1');await once(server,'listening');
const browser=await chromium.launch({headless:true,channel:'msedge'}),errors=[];
await mkdir('test-results/lebanese',{recursive:true});
try{
 for(const width of [375,1440]){
  const page=await browser.newPage({viewport:{width,height:900}});page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}`);await page.getByRole('button',{name:'Try admin demo'}).click();await page.locator('.companion-launcher').click();
  await page.getByRole('button',{name:'Examples',exact:true}).click();const examples=page.locator('.companion-examples');
  await examples.getByLabel('Writing style').selectOption('arabizi');
  await page.screenshot({path:`test-results/lebanese/examples-${width}.png`});
  await examples.getByRole('button',{name:/Track a subscription/}).click();
  assert.equal(await page.locator('#companion-question').inputValue(),'bdi zid subscription Claude b 20 dollar');
  assert.equal(await page.locator('.companion-question').count(),0,'choosing an example must not send it');
  assert.equal(await page.locator('.companion-chat-panel').getAttribute('lang'),'ar');
  await page.locator('.companion-chat-input button').click();await page.locator('.companion-draft').getByText('Claude',{exact:true}).waitFor();
  assert.match(await page.locator('.companion-draft').innerText(),/20 USD/);
  await page.screenshot({path:`test-results/lebanese/draft-${width}.png`});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.close();console.log(`Lebanese request examples passed at ${width}px`);
 }
 const page=await browser.newPage({viewport:{width:375,height:900}}),calls=[];page.on('pageerror',e=>errors.push(e.message));
 const user={id:12345,name:'Test',role:'user',permissions:['tasks'],active:true};
 await page.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  if(path==='/api/data')return route.fulfill({json:{...demoData(),user}});
  if(path==='/api/auth/me')return route.fulfill({json:{user}});
  if(path==='/api/companion/ai')return route.fulfill({json:{available:true,reason:null}});
  if(path==='/api/companion/chat'){calls.push(route.request().postDataJSON());return route.fulfill({json:{answer:'أكيد، شو بتحب نقول بالرسالة؟',language:'ar',engine:'gemini'}});}
  return route.fulfill({json:{available:false,google:false}});
 });
 await page.goto(`http://127.0.0.1:${server.address().port}`);await page.locator('.companion-launcher').click();
 await page.locator('#companion-question').fill('kteb li msg la followup');await page.locator('.companion-chat-input button').click();
 await page.getByText('أكيد، شو بتحب نقول بالرسالة؟',{exact:true}).waitFor();assert.equal(calls[0].languageMode,'auto');
 await page.locator('#companion-question').fill('500');assert.equal(await page.locator('.companion-chat-panel').getAttribute('lang'),'ar','AI-resolved language carries into a short follow-up');
 await page.locator('.companion-language-tabs').getByRole('button',{name:'English',exact:true}).click();
 await page.locator('#companion-question').fill('bdi zakkerni call Mama bokra');assert.equal(await page.locator('.companion-chat-panel').getAttribute('lang'),'en');
 await page.locator('.companion-bottom-tools').getByRole('button',{name:'Examples',exact:true}).click();
 assert.equal(await page.locator('.companion-examples').getByRole('button',{name:/Track a subscription/}).count(),0,'Tasks-only account does not receive Money examples');
 assert.deepEqual(errors,[]);console.log('AI-resolved Auto language, explicit preference and example permissions passed.');
}finally{await browser.close();server.closeAllConnections();server.close();}
