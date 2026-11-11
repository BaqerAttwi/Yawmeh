import {gettingStartedSteps} from '../shared/getting-started.js';
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
await mkdir('test-results/getting-started',{recursive:true});
try{
 for(const [width,height] of [[320,390],[375,810],[1440,1000]]){
  const page=await browser.newPage({viewport:{width,height}}),assets=[];
  const tappable=button=>button.evaluate(el=>{
   const rect=el.getBoundingClientRect();
   return rect.top>=0&&rect.bottom<=innerHeight&&el.contains(document.elementFromPoint(rect.x+rect.width/2,rect.y+rect.height/2));
  });
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>assets.push(r.url()));
  await page.goto(`http://127.0.0.1:${server.address().port}`);await page.getByRole('button',{name:'Try admin demo'}).click();
  await page.locator('.main-shell').waitFor();await page.waitForFunction(()=>localStorage.getItem('daywell-demo'));
  const before=await page.evaluate(()=>localStorage.getItem('daywell-demo'));
  assert.equal(await page.getByRole('button',{name:'Guide',exact:true}).count(),width<700?1:2);
  await page.locator('.topbar-actions').getByRole('button',{name:'Guide',exact:true}).click();
  const menu=page.getByRole('dialog',{name:'Start here',exact:true});await menu.waitFor();
  await page.screenshot({path:`test-results/getting-started/choices-${width}.png`});
  await menu.getByRole('button',{name:/Guide me step by step/}).click();
  const coach=page.getByRole('region',{name:'Guided tour',exact:true});await coach.waitFor();
  const steps=gettingStartedSteps({role:'admin'});
  for(const [index,step] of steps.entries()){
   const navigate=coach.getByRole('button',{name:'Take me there',exact:true});
   if(await navigate.count()){
    assert.ok(await tappable(navigate),`Navigation button visible on ${width}×${height} at ${step.id}`);
    await navigate.click();
   }
   await coach.getByText('You’re in the right place.',{exact:true}).waitFor();
   const target=step.target||'nav-'+step.page;await page.locator('[data-tour="'+target+'"].tour-target').waitFor();
   await page.waitForFunction(name=>{
    const element=document.querySelector(`button[data-tour="${name}"]`);
    if(!element)return true;
    const rect=element.getBoundingClientRect();
    return rect.top>=0&&rect.bottom<=innerHeight&&element.contains(document.elementFromPoint(rect.x+rect.width/2,rect.y+rect.height/2));
   },target,{timeout:5000});
   assert.ok(await coach.evaluate(el=>{const r=el.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.bottom<=innerHeight;}));
   if(step.id==='income'){
    await page.screenshot({path:'test-results/getting-started/income-'+width+'.png'});
    await page.locator('[data-tour="add-income"]').click();const form=page.locator('dialog[open]');await form.locator('input[name=amount]').waitFor();assert.equal(await form.locator('input[name=amount]').inputValue(),'');await form.getByRole('button',{name:'Cancel',exact:true}).click();
   }
   if(index===1)await page.screenshot({path:'test-results/getting-started/tour-'+width+'.png'});
   const advance=coach.getByRole('button',{name:index===steps.length-1?'Finish tour':'Next step',exact:true});
   assert.ok(await tappable(advance),`Advance button visible on ${width}×${height} at ${step.id}`);
   assert.ok(await tappable(coach.getByRole('button',{name:'Back',exact:true})),`Back button visible at ${step.id}`);
   await advance.click();
  }
  await menu.waitFor();assert.equal(await page.evaluate(()=>localStorage.getItem('daywell-demo')),before,'tour must not create records');
  await menu.getByRole('button',{name:/Watch, then try/}).click();
  const video=menu.getByLabel('Getting started walkthrough');assert.equal(await video.getAttribute('preload'),'none');
  assert.equal(assets.filter(url=>url.includes('getting-started.webm')).length,0,'video must not load before playback');
  await video.evaluate(el=>el.load());await page.waitForFunction(()=>document.querySelector('video[aria-label="Getting started walkthrough"]').readyState>=1);
  assert.ok(await video.evaluate(el=>el.duration>50));
  await menu.getByRole('button',{name:'Close getting started',exact:true}).click();
  await page.reload();await page.getByRole('button',{name:'Try admin demo'}).click();await page.locator('.main-shell').waitFor();if(width<700){await page.locator('.sidebar-toggle').click();await page.locator('.sidebar').getByRole('button',{name:'Overview',exact:true}).click();}assert.equal(await page.locator('.start-here-banner').count(),0);
  assert.ok(assets.some(url=>url.endsWith('sage-wave.webp')));assert.equal(assets.filter(url=>/characters\/.*\.png$/.test(url)).length,0);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.close();console.log(`Getting started passed at ${width}px`);
 }
 assert.deepEqual(errors,[]);
}finally{await browser.close();server.closeAllConnections();server.close();}
