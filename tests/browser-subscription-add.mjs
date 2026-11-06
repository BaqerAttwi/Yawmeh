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
 const page=await browser.newPage({viewport:{width:375,height:850}});page.on('pageerror',e=>errors.push(e.message));
 const records={...demoData(),subscriptions:[{id:1,title:'Cloud',amount:20,cycle:'monthly',renewal:'2026-11-16',active:true}]};
 await page.addInitScript(data=>localStorage.setItem('daywell-demo',JSON.stringify(data)),records);
 await page.goto(`http://127.0.0.1:${server.address().port}`);await page.getByRole('button',{name:'Try admin demo'}).click();await page.locator('.companion-launcher').click();
 const before=await page.evaluate(()=>localStorage.getItem('daywell-demo'));
 const questions=['Bde zed subscription claude b 20 dollar','Bde zid subscription claude b 20'];
 for(const [index,text] of questions.entries()){
  await page.locator('#companion-question').fill(text);await page.locator('.companion-chat-input button').click();
  await page.waitForFunction(count=>document.querySelectorAll('.companion-question').length===count&&document.querySelector('.companion-chat-log')?.getAttribute('aria-busy')==='false',index+1);
  assert.equal(await page.locator('.companion-chat-panel').getAttribute('lang'),'ar');
  const draft=page.locator('.companion-draft');assert.equal(await draft.count(),1);assert.match(await draft.innerText(),/claude/);assert.match(await draft.innerText(),/20 USD/);
  assert.doesNotMatch(await page.locator('.companion-chat-log').innerText(),/240|Cloud:/);
 }
 assert.equal(await page.evaluate(()=>localStorage.getItem('daywell-demo')),before,'drafts must not save subscriptions automatically');
 assert.deepEqual(errors,[]);console.log('Both exact screenshot requests create subscription drafts; existing Cloud is not returned or changed.');
}finally{await browser.close();server.closeAllConnections();server.close();}
