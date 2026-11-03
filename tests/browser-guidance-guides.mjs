import assert from 'node:assert/strict';
import {once} from 'node:events';
import {isAbsolute} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createApp} from '../server/src/app.js';
const module=process.env.PLAYWRIGHT_MODULE||'playwright';
const {chromium}=await import(isAbsolute(module)?pathToFileURL(module).href:module);
const server=createApp({db:{},authStore:{},recoveryOptions:null}).listen(0,'127.0.0.1');await once(server,'listening');
const browser=await chromium.launch({headless:true,channel:'msedge'}),errors=[];
try{
 for(const width of [375,1440]){
  const page=await browser.newPage({viewport:{width,height:width===375?740:900}}),media=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',request=>{if(request.url().includes('/guides/'))media.push(request.url());});
  await page.goto(`http://127.0.0.1:${server.address().port}`);await page.getByRole('button',{name:'Try admin demo'}).click();
  await page.locator('.companion-launcher').click();await page.locator('#companion-question').fill('I need help');await page.getByRole('button',{name:'Send message',exact:true}).click();
  let choices=page.locator('.companion-guidance-choices');await choices.getByRole('button',{name:'Tasks',exact:true}).click();
  await choices.getByRole('button',{name:'Add a task',exact:true}).click();
  await page.getByText(/What should I call this task/).waitFor();
  await page.locator('.companion-panel-header').getByRole('button',{name:'Close companion chat',exact:true}).click();
  await page.locator('.sidebar').getByRole('button',{name:'Tasks',exact:true}).click();await page.getByRole('button',{name:'Add task',exact:true}).click();
  const dialog=page.locator('dialog[open]');await dialog.locator('input[name=title]').fill('Keep my draft');assert.equal(media.length,0,'No tutorial traffic before opening a guide');
  await dialog.getByRole('button',{name:'Watch guide · English / عربي',exact:true}).click();let video=dialog.locator('video');
  assert.equal(await video.getAttribute('preload'),'none');assert.equal(await video.locator('track').count(),2);
  await video.evaluate(async el=>{el.muted=true;await el.play();});await page.waitForFunction(()=>{const v=document.querySelector('video');return v?.currentTime>0&&v.videoWidth===1280;});
  assert.equal(await dialog.locator('input[name=title]').inputValue(),'Keep my draft');await video.evaluate(el=>el.pause());
  assert.match(await dialog.locator('a[download]').getAttribute('href'),/create-task\.webm/);
  await dialog.getByRole('button',{name:'Cancel',exact:true}).click();
  await page.locator('.sidebar').getByRole('button',{name:'Money',exact:true}).click();await page.getByRole('button',{name:'Income',exact:true}).click();
  await dialog.getByRole('button',{name:'عربي',exact:true}).click();await dialog.getByRole('button',{name:'شاهد الشرح · English / عربي',exact:true}).click();
  video=dialog.locator('video');assert.match(await video.locator('source').getAttribute('src'),/record-money\.webm/);
  await video.evaluate(async el=>{el.muted=true;await el.play();});await page.waitForFunction(()=>document.querySelector('video')?.currentTime>0);
  assert.ok(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth+1),'Guide fits the dialog');
  await page.screenshot({path:`test-results/guides/embedded-${width}.png`});await page.close();
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,widths:[375,1440],goalChoices:true,bothVideosPlayable:true,noInitialMediaDownload:true,browserErrors:errors}));
}finally{await browser.close();server.closeAllConnections();server.close();}
