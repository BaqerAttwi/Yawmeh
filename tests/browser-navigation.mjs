import assert from 'node:assert/strict';
import {once} from 'node:events';
import {isAbsolute} from 'node:path';
import {pathToFileURL} from 'node:url';
import {mkdir} from 'node:fs/promises';
import {createApp} from '../server/src/app.js';
const module=process.env.PLAYWRIGHT_MODULE||'playwright';
const {chromium}=await import(isAbsolute(module)?pathToFileURL(module).href:module);
const server=createApp({db:{},authStore:{},recoveryOptions:null}).listen(0,'127.0.0.1');await once(server,'listening');
const browser=await chromium.launch({headless:true,channel:'msedge'}),errors=[];
await mkdir('test-results/navigation',{recursive:true});
try{
 for(const width of [375,1440]){
  const phone=width<700,page=await browser.newPage({viewport:{width,height:850}});page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}`);await page.getByRole('button',{name:'Try admin demo'}).click();await page.locator('.main-shell').waitFor();
  assert.equal(await page.locator('.app-shell').evaluate(el=>el.classList.contains('sidebar-closed')),phone);
  if(phone){
   assert.equal(await page.locator('.breadcrumb>span').innerText(),'Overview');
   assert.ok(await page.locator('.main-shell').evaluate(el=>Math.abs(el.getBoundingClientRect().width-innerWidth)<1));
   assert.equal(await page.locator('.sidebar nav').isVisible(),false);
   await page.screenshot({path:'test-results/navigation/tasks-'+width+'.png'});
   await page.locator('.companion-launcher').click();await page.locator('.companion-chat-panel').waitFor();
   assert.ok(await page.locator('.companion-chat-panel').evaluate(el=>{const r=el.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth;}));
   await page.locator('.companion-panel-header').getByRole('button',{name:'Close companion chat',exact:true}).click();
   await page.locator('.sidebar-toggle').click();assert.equal(await page.locator('.main-shell').getAttribute('inert'),'');
   await page.screenshot({path:'test-results/navigation/open-'+width+'.png'});
   await page.keyboard.press('Escape');await page.waitForFunction(()=>document.activeElement?.classList.contains('sidebar-toggle'));
   await page.locator('.sidebar-toggle').click();await page.locator('.sidebar').getByRole('button',{name:'Money',exact:true}).click();
   await page.getByRole('heading',{name:'Money',exact:true}).waitFor();assert.equal(await page.locator('.sidebar nav').isVisible(),false);
   await page.locator('.sidebar-toggle').click();await page.getByRole('button',{name:'Close navigation backdrop',exact:true}).click({position:{x:width-10,y:200}});assert.equal(await page.locator('.sidebar nav').isVisible(),false);
  }else{
   await page.locator('.sidebar-toggle').click();assert.ok(await page.locator('.main-shell').evaluate(el=>Math.abs(el.getBoundingClientRect().width-innerWidth)<1));
   await page.locator('.sidebar-toggle').click();assert.equal(await page.locator('.sidebar nav').isVisible(),true);
   await page.locator('.sidebar').getByRole('button',{name:'Tasks',exact:true}).click();await page.getByPlaceholder('Find a task…').waitFor();
  }
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.close();console.log(`Sidebar navigation passed at ${width}px`);
 }
 assert.deepEqual(errors,[]);
}finally{await browser.close();server.closeAllConnections();server.close();}
