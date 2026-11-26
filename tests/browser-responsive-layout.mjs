import {workspaceText} from '../client/src/lib/workspace-text.js';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {isAbsolute} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createApp} from '../server/src/app.js';
import {demoData} from '../client/src/features/demo/data.js';
import {memoryDatabase} from './helpers/memory-db.js';

const module=process.env.PLAYWRIGHT_MODULE||'playwright';
const {chromium}=await import(isAbsolute(module)?pathToFileURL(module).href:module);
const user={id:1,name:'Alex Responsiveness Tester',email:'alex.responsive@example.test',reminder_email:'alex.responsive@example.test',role:'admin',active:true,permissions:['money','tasks','assistant'],current_rate:89000};
const data=demoData();
const records=Object.fromEntries(Object.entries(data).filter(([,value])=>Array.isArray(value)).map(([key,value])=>[key,value.map(row=>({...row,user_id:1}))]));
const longBudgetTitle='A_Long_Unbroken_Budget_Label_That_Must_Wrap_Inside_Its_Panel';
const longItemTitle='قهوةومشترياتلجميعأفرادالعائلةفيعطلةنهايةالأسبوع';
records.items.unshift({...records.items[0],id:999,title:longItemTitle,amount:123456.78});
records.budgets.push({id:999,user_id:1,title:longBudgetTitle,amount:95000000,start:data.budgets[0].start,end:data.budgets[0].end});
const server=createApp({db:memoryDatabase(records,[user]),authStore:{session:async()=>user,listSessions:async()=>[],list:async()=>[user]},recoveryOptions:null}).listen(0,'127.0.0.1');
await once(server,'listening');
const url='http://127.0.0.1:'+server.address().port,issues=[];
const sizes=[[320,640],[360,800],[390,844],[568,320],[701,768],[768,900],[1024,768],[1440,900]];
let browser;
try {
 browser=await chromium.launch({headless:true,channel:'msedge'});
 for(const [width,height] of sizes)for(const rtl of [false,true]){
  const t=workspaceText(rtl?'ar':'en');
  const context=await browser.newContext({viewport:{width,height},locale:rtl?'ar-LB':'en-US',colorScheme:rtl?'dark':'light',reducedMotion:'reduce'});
  await context.route('https://**/*',route=>route.abort());
  await context.route('**/api/system/status',route=>route.fulfill({json:{database:{reachable:true,ready:true,missing:[]},email:{configured:false},ai:{},timezone:'Asia/Beirut'}}));
  await context.route('**/api/admin/usage',route=>route.fulfill({json:{activity:[],counts:{},ai_requests_month:0}}));
  if(rtl)await context.addInitScript(()=>{
   localStorage.setItem('yawmeh:workspace-language:live:1','ar');
   localStorage.setItem('daywell-companion:live:1:language','ar');
  });
  const page=await context.newPage();
  const brandingErrors=[];
  page.on('response',response=>{
   if(new URL(response.url()).pathname.startsWith('/branding/')&&response.status()>=400)brandingErrors.push(response.url());
  });
  async function checkLogo(selector,asset,pixels){
   const logo=page.locator(selector);
   assert.equal(await logo.getAttribute('src'),'/branding/'+asset);
   assert.equal(await logo.getAttribute('decoding'),'async');
   assert.equal(await logo.evaluate(async img=>{await img.decode();return img.naturalWidth;}),pixels);
  }
  page.setDefaultTimeout(8000);
  page.on('pageerror',error=>issues.push({width,height,rtl,name:'Page error',error:error.message}));
  async function check(name,selector){
   const problems=await page.evaluate(({selector,longBudgetTitle})=>{
    const result=[];
    if(document.documentElement.scrollWidth>innerWidth+1)result.push('page width '+document.documentElement.scrollWidth);
    for(const row of document.querySelectorAll('.budget-overview-row')){
     if(!row.textContent.includes(longBudgetTitle))continue;
     const bounds=row.getBoundingClientRect();
     for(const label of row.querySelectorAll('span')){
      const range=document.createRange();
      range.selectNodeContents(label);
      if([...range.getClientRects()].some(rect=>rect.left<bounds.left-1||rect.right>bounds.right+1)){
       result.push('budget text exceeds its row');
      }
     }
    }
    if(!selector)return result;
    const box=document.querySelector(selector);
    if(!box)return [...result,'missing '+selector];
    const rect=box.getBoundingClientRect(),touch=(r,s)=>Math.min(r.right,s.right)-Math.max(r.left,s.left)>2&&Math.min(r.bottom,s.bottom)-Math.max(r.top,s.top)>2;
    const bounds=r=>[r.left,r.top,r.right,r.bottom].map(Math.round).join(',');
    const inBounds=rect.width>0&&rect.height>0&&rect.left>=-1&&rect.top>=-1&&rect.right<=innerWidth+1&&rect.bottom<=innerHeight+1;
    if(!inBounds)result.push(selector+' outside viewport ('+bounds(rect)+')');
    if(box.matches('.companion-chat-panel')){
     for(const child of box.querySelectorAll('.companion-panel-header,.companion-composer,.companion-bottom-tools')){
      const r=child.getBoundingClientRect();
      if(r.width&&r.height){
       const verticallyScrollable=['auto','scroll'].includes(getComputedStyle(box).overflowY);
       if(r.left<rect.left-1||r.right>rect.right+1||(!verticallyScrollable&&r.bottom>rect.bottom+1)){
        result.push(child.className+' clipped by companion panel ('+bounds(r)+')');
       }
      }
     }
    }
    if(box.matches('.topbar')){
     const controls=[...box.querySelectorAll('.sidebar-toggle,.sync-status,.language-switch,.theme-menu>summary,.topbar-notifications,.avatar')].filter(el=>el.getBoundingClientRect().width&&getComputedStyle(el).visibility!=='hidden');
     for(let i=0;i<controls.length;i++)for(let j=i+1;j<controls.length;j++){
      if(touch(controls[i].getBoundingClientRect(),controls[j].getBoundingClientRect()))result.push(controls[i].className+' overlaps '+controls[j].className);
     }
    }
    return result;
   },{selector,longBudgetTitle});
   if(problems.length)issues.push({width,height,rtl,name,problems});
  }
  await page.goto(url);
  await page.getByRole('heading',{name:'Welcome back.'}).waitFor();
  await checkLogo('.login-story .brand-logo','yawmeh-logo-512.webp',512);
  assert.deepEqual(await page.locator('link[rel="icon"]').evaluateAll(icons=>icons.map(icon=>icon.getAttribute('href'))),[
   '/branding/favicon-32.png','/branding/favicon-48.png','/branding/yawmeh-logo.svg',
  ]);
  await check('Login');
  await context.addCookies([{name:'daywell_session',value:'a'.repeat(64),url}]);
  await page.reload();
  await page.getByRole('button',{name:'Close getting started'}).click();
  await checkLogo('.sidebar .brand-logo','yawmeh-logo-192.webp',192);
  await checkLogo('.companion-launcher .assistant-icon-logo','yawmeh-logo-192.webp',192);
  await check('Top bar','.topbar');
  for(const [label,toggle,popup] of [
   ['Sync','.sync-status','.sync-menu .topbar-popover'],
   ['Theme','.theme-menu summary','.theme-menu .topbar-popover'],
   ['Account','[aria-label="Account menu"]','.account-menu'],
  ]){
   await page.locator(toggle).click();
   await page.locator(popup).waitFor();
   await check(label,popup);
   await page.locator(toggle).click();
  }
  async function go(name){
   if(width<=700)await page.getByRole('button',{name:'Open navigation',exact:true}).click();
   await page.locator('.sidebar').getByRole('button',{name,exact:true}).click();
  }
  for(const tab of ['Today','Dashboard','Calendar','Weekly review','History']){
   if(['Calendar','Weekly review','History'].includes(tab)){
    await page.locator('.overview-more>summary').click();
    await check('More overview views','.overview-menu');
   }
   await page.locator('.overview-tabs').getByRole('button',{name:t(tab),exact:true}).click();
   if(rtl&&(tab==='Today'||tab==='Dashboard')){
    assert.match(await page.locator('.page-date').textContent(),/\p{Script=Arabic}/u);
   }
   if(rtl&&tab==='Today'){
    const purchase=page.locator('.quick-purchase-card button').filter({hasText:longItemTitle});
    assert.equal(await purchase.locator('small').getAttribute('dir'),'ltr');
    const fits=await purchase.evaluate(row=>{
     const {left,right}=row.getBoundingClientRect();
     const label=row.querySelector('strong').getBoundingClientRect(),price=row.querySelector('small').getBoundingClientRect();
     return price.left>=left&&label.right<=right&&price.right<=label.left+1;
    });
    assert.ok(fits,'Arabic purchase label and price fit in the row');
   }
   if(tab==='Dashboard')await page.locator('.budget-overview-row').getByText(longBudgetTitle,{exact:true}).waitFor();
   await check(tab);
  }
  await go('Money');
  for(const tab of ['Transactions','Savings','Goals','Items','Budgets','Subscriptions']){
   await page.locator('.filterbar').getByRole('button',{name:t(tab),exact:true}).click();
   await check('Money / '+tab);
  }
  await go('Tasks');
  await check('Tasks');
  await page.getByRole('button',{name:t('Add task'),exact:true}).click();
  await page.locator('dialog[open]').waitFor();
  await check('Task dialog','dialog[open]');
  await page.locator('dialog[open]').getByRole('button',{name:'Cancel',exact:true}).click();
  for(const name of ['Reports','Settings','Users & access']){
   await go(name);
   if(name==='Reports')await page.locator('.reports-workspace').waitFor();
   await check(name);
   if(name==='Settings'){
    const form=page.locator('.currency-home');
    const select=form.getByRole('combobox',{name:'Home currency'});
    const save=form.getByRole('button',{name:'Save home currency'});
    const [row,field,button]=await Promise.all([form.boundingBox(),select.boundingBox(),save.boundingBox()]);
    assert.ok(row&&field&&button);
    assert.ok(field.x+field.width<=button.x||button.x+button.width<=field.x||field.y+field.height<=button.y);
    assert.ok([field,button].every(box=>box.x>=row.x&&box.x+box.width<=row.x+row.width&&box.y+box.height<=row.y+row.height));
    if(width===360){
     const next=await select.inputValue()==='USD'?'LBP':'USD';
     await select.selectOption(next);
     await save.click();
     await page.getByText('Home currency updated',{exact:true}).waitFor();
     assert.equal(await page.locator('.settings-currency-code').textContent(),next);
    }
   }
  }
  await page.locator('.companion-launcher').click();
  await page.locator('.companion-chat-panel').waitFor();
  await check('Companion','.companion-chat-panel');
  await page.locator('.companion-bottom-tools button').nth(2).click();
  await check('Companion quick add','.companion-chat-panel');
  await page.locator('#companion-question').click();
  assert.equal(await page.locator('#companion-question').evaluate(input=>input===document.activeElement),true);
  await page.locator('.companion-panel-header button').last().click();
  if(width<=700){
   await page.getByRole('button',{name:'Open navigation',exact:true}).click();
   await check('Navigation drawer','.sidebar');
   await page.locator('.companion-launcher').click();
   await page.locator('.companion-chat-panel').waitFor();
   await check('Companion from navigation','.companion-chat-panel');
  }
  assert.deepEqual(brandingErrors,[]);
  await context.close();
  console.log(width+'×'+height,rtl?'RTL':'LTR');
 }
 console.log(JSON.stringify(issues,null,2));
 assert.deepEqual(issues,[]);
}finally{
 await browser?.close();server.closeAllConnections();server.close();
}
