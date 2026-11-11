// Run with PLAYWRIGHT_MODULE pointing to an installed Playwright index.mjs.
import {once} from 'node:events';
import {mkdir,writeFile} from 'node:fs/promises';
import {isAbsolute} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createApp} from '../server/src/app.js';
const playwrightModule=process.env.PLAYWRIGHT_MODULE||'playwright';
const {chromium}=await import(isAbsolute(playwrightModule)?pathToFileURL(playwrightModule).href:playwrightModule);
const server=createApp({db:{query:async()=>[[]]},authStore:{}}).listen(0,'127.0.0.1');
await once(server,'listening');
const browser=await chromium.launch({headless:true,channel:'msedge'});
const results=[],errors=[];
await mkdir('test-results',{recursive:true});
try{
 for(const [width,height] of [[320,740],[375,740],[568,320],[768,900],[1024,900],[1440,900]]){
  const page=await browser.newPage({viewport:{width,height}});
  const navigate=async name=>{
   const button=page.locator('.sidebar').getByRole('button',{name,exact:true});
   if(width<=700)await page.locator('.sidebar-toggle').click();
   await button.click();
  };
  page.on('pageerror',e=>errors.push({width,error:e.message}));
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.getByRole('button',{name:'Sign in',exact:true}).waitFor();
  results.push(await page.evaluate(width=>({width,page:'Login',scrollWidth:document.documentElement.scrollWidth}),width));
  await page.getByRole('button',{name:'Forgot password?',exact:true}).click();
  results.push(await page.evaluate(width=>({width,page:'Password recovery',scrollWidth:document.documentElement.scrollWidth}),width));
  await page.reload();
  await page.getByRole('button',{name:'Try admin demo'}).click();
  await page.locator('.main-shell').waitFor();
  for(const name of ['Overview','Money','Tasks','Users & access','Settings']){
   await navigate(name);
   await page.waitForTimeout(100);
   results.push(await page.evaluate(({name,width})=>({width,page:name,scrollWidth:document.documentElement.scrollWidth,overflow:[...document.querySelectorAll('main *')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.right>innerWidth+1&&!e.closest('.table-wrap');}).slice(0,12).map(e=>({tag:e.tagName,cls:e.className,right:Math.round(e.getBoundingClientRect().right)}))}),{name,width}));
   const tabs=name==='Overview'?['Dashboard','History','Weekly review','Calendar']:name==='Money'?['Savings','Goals','Items','Budgets','Subscriptions']:[];
   for(const tab of tabs){
    await page.locator(name==='Overview'?'.overview-tabs':'.filterbar .segmented').getByRole('button',{name:tab,exact:true}).click();
    results.push(await page.evaluate(({name,width})=>({width,page:name,scrollWidth:document.documentElement.scrollWidth,overflow:[...document.querySelectorAll('main *')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.right>innerWidth+1&&!e.closest('.table-wrap, .segmented, .orbit');}).slice(0,15).map(e=>({tag:e.tagName,cls:e.className,parent:e.parentElement.className,right:Math.round(e.getBoundingClientRect().right)}))}),{name:name+' / '+tab,width}));
   }
  }
  await navigate('Tasks');
  await page.getByRole('button',{name:'Add task',exact:true}).click();
  const dialog=page.locator('dialog[open]');
  results.push(await dialog.evaluate((e,{width,height})=>{const r=e.getBoundingClientRect();return {width,height,page:'Task dialog',left:r.left,right:r.right,top:r.top,bottom:r.bottom};},{width,height}));
  await dialog.locator('input[name=title]').fill('Browser audit task');
  await dialog.getByRole('button',{name:'عربي',exact:true}).click();
  if(await dialog.getAttribute('dir')!=='rtl')throw new Error('Arabic form direction did not switch');
  await dialog.getByRole('button',{name:'English',exact:true}).click();
  await dialog.getByRole('button',{name:'Save task',exact:true}).click();
  await page.getByText('Browser audit task',{exact:true}).waitFor();
  const task=page.locator('.planning-task').filter({has:page.getByText('Browser audit task',{exact:true})});
  await task.getByRole('button',{name:'Details for Browser audit task',exact:true}).click();
  await task.getByRole('textbox',{name:'New subtask for Browser audit task',exact:true}).fill('Audit checklist step');
  await task.getByRole('button',{name:'Add',exact:true}).click();
  await task.getByRole('checkbox',{name:'Audit checklist step',exact:true}).check();
  await task.getByRole('button',{name:'Complete Browser audit task',exact:true}).click();
  await task.getByRole('button',{name:'Reopen Browser audit task',exact:true}).click();
  await navigate('Overview');
  await page.locator('.overview-tabs').getByRole('button',{name:'Today',exact:true}).click();
  await page.locator('.today-tools > summary').click();
  await page.getByRole('button',{name:'Low',exact:false}).filter({has:page.locator('small')}).click();
  await page.locator('.capture-form textarea').fill('Browser audit inbox note');
  await page.getByRole('button',{name:'Capture thought',exact:true}).click();
  await page.locator('.daily-panel details > summary').filter({hasText:'Organize your inbox'}).click();
  await page.getByText('Browser audit inbox note',{exact:true}).waitFor();
  results.push(await page.evaluate(width=>({width,page:'Daily tools expanded',scrollWidth:document.documentElement.scrollWidth,overflow:[...document.querySelectorAll('.today-tools *')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.right>innerWidth+1;}).slice(0,12).map(e=>({tag:e.tagName,cls:e.className}))}),width));
  await page.screenshot({path:`test-results/overview-${width}.png`,fullPage:true});
  await page.locator('.companion-launcher').click();
  await page.locator('#companion-question').fill('What are my savings?');
  await page.getByRole('button',{name:'Send message',exact:true}).click();
  await page.locator('.companion-reply').waitFor();
  results.push(await page.locator('.companion-chat-panel').evaluate((e,{width,height})=>{const r=e.getBoundingClientRect();return {width,height,page:'Companion',left:r.left,right:r.right,top:r.top,bottom:r.bottom};},{width,height}));
  await page.screenshot({path:`test-results/audit-${width}.png`,fullPage:true});
  await page.close();
 }
 await writeFile('test-results/browser-audit.json',JSON.stringify({results,errors},null,2));
 console.log(JSON.stringify({results,errors},null,2));
 if(errors.length||results.some(r=>r.scrollWidth>r.width+1||r.overflow?.length||r.height&&(r.left<0||r.right>r.width+1||r.top<0||r.bottom>r.height+1)))process.exitCode=1;
}finally{await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}

