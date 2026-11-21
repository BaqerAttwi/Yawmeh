// Isolated live-mode UI with mocked API responses; never calls a real AI provider.
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {isAbsolute} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createApp} from '../server/src/app.js';
import {demoData} from '../client/src/features/demo/data.js';
import {visibleData} from '../shared/access.js';
const module=process.env.PLAYWRIGHT_MODULE||'playwright';
const {chromium}=await import(isAbsolute(module)?pathToFileURL(module).href:module);
const server=createApp({db:{},authStore:{},recoveryOptions:null}).listen(0,'127.0.0.1');await once(server,'listening');
const browser=await chromium.launch({headless:true,channel:'msedge'}),errors=[];
try{
 for(const width of [375,1440]){
  const avatar='sage';
  const page=await browser.newPage({viewport:{width,height:900}}),calls=[],writes=[];
  let releaseReport,markReportReceived,reportAttempts=0;
  const reportReceived=new Promise(resolve=>{markReportReceived=resolve;});
  await page.context().addCookies([{name:'daywell_session',value:'a'.repeat(64),url:`http://127.0.0.1:${server.address().port}`,httpOnly:true,sameSite:'Strict'}]);
  const user={id:12345,name:'Test',role:'user',permissions:['tasks','money'],active:true};
  await page.addInitScript(()=>{
   localStorage.setItem('daywell-companion:live:12345','pip');
   localStorage.setItem('yawmeh-start-here:v1:live:12345','done');
   const setTimeout=window.setTimeout;
   window.requestDeadlines=[];
   window.setTimeout=(callback,delay,...args)=>{
    if(delay===20000||delay===45000)window.requestDeadlines.push(delay);
    return setTimeout(callback,delay,...args);
   };
  });
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/**',async route=>{
   const request=route.request(),path=new URL(request.url()).pathname;
   if(path==='/api/data')return route.fulfill({json:{...visibleData(demoData(),user),user}});
   if(path==='/api/auth/me')return route.fulfill({json:{user}});
   if(path==='/api/companion/ai')return route.fulfill({json:{available:true,reason:null,model:'gemini-3.8-flash'}});
   if(path==='/api/companion/chat'){
    calls.push(request.postDataJSON());
    if(request.postDataJSON().reportArea){
     if(++reportAttempts===1){
      await new Promise(resolve=>{releaseReport=resolve;markReportReceived();});
      return route.fulfill({status:503,json:{code:'timeout'}});
     }
     if(request.postDataJSON().reportFormat==='detailed')return route.fulfill({json:{
      summary:'Compare the numbers for this period.',recommendation:'Review one regular cost.',
      steps:[{title:'Review spending',explanation:'Use the bars to compare the totals.'},{title:'Choose a next action',explanation:'Check which costs were optional.'}],
     }});
     return route.fulfill({json:{summary:'The selected period has money activity.',recommendation:'Review a discretionary cost.'}});
    }
    return calls.length===1?route.fulfill({status:503,json:{code:'provider_quota'}}):route.fulfill({json:{answer:'Recorded report for the selected dates.',recommendation:'Review one optional cost before planning next week.',language:'en',engine:'gemini'}});

   }
   if(request.method()!=='GET')writes.push(path);
   return route.fulfill({json:{available:false,google:false}});
  });
  await page.goto(`http://127.0.0.1:${server.address().port}`);await page.locator('.companion-launcher').click();
  const panel=page.getByRole('dialog',{name:avatar[0].toUpperCase()+avatar.slice(1)+' companion chat'});
  await panel.getByRole('button',{name:'English',exact:true}).first().click();
  const ask=async text=>{await page.locator('#companion-question').fill(text);await panel.getByRole('button',{name:'Send message',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.companion-chat-log')?.getAttribute('aria-busy')==='false');};
  await ask('add Claude');await panel.getByText(/Do you mean a subscription for Claude/).waitFor();
  await ask('20 dollars');assert.match(await panel.locator('.companion-draft').innerText(),/\$20/);assert.equal(calls.length,0);
  await ask('I spend');
  await panel.getByText(/What should I call this expense/).waitFor();
  await ask('Coffee $8');
  await panel.locator('.companion-draft').getByText('Coffee',{exact:true}).waitFor();
  assert.match(await panel.locator('.companion-draft').innerText(),/\$8/);
  await ask('I bought an iPhone 16 for $400');
  await panel.locator('.companion-draft').getByText('an iPhone 16',{exact:true}).waitFor();
  assert.match(await panel.locator('.companion-draft').innerText(),/\$400/);
  assert.equal(calls.length,0);
  await ask('How can I save more?');
  await panel.getByText(/AI provider has reached a usage or rate limit/).waitFor();
  assert.equal(calls.length,1);
  await ask('Bde zed subscription claude b 20 dollar');
  await panel.locator('.companion-draft').getByText('claude',{exact:true}).waitFor();
  assert.equal(calls.length,1);
  assert.equal(await panel.getByText(/AI provider has reached a usage or rate limit/).count(),0);
  await ask('Weekly report');await panel.getByText('Review one optional cost before planning next week.',{exact:true}).waitFor();
  assert.equal(calls.length,2);
  assert.deepEqual(Object.keys(calls[1]).sort(),['avatar','end','language','question','start']);
  await ask('Explain compound interest');assert.equal(calls.length,2);
  await panel.getByRole('button',{name:'Examples',exact:true}).click();
  await panel.getByRole('searchbox',{name:'Search examples'}).fill('taxi');
  assert.equal(await panel.locator('.companion-example-list button').count(),1);
  await panel.getByRole('button',{name:/Record a payment in lira/}).click();
  assert.equal(await page.locator('#companion-question').inputValue(),'I paid 150,000 LBP for a taxi');
  await panel.getByRole('button',{name:'Close companion chat',exact:true}).click();
  if(await page.locator('.app-shell').evaluate(el=>el.classList.contains('sidebar-closed')))await page.locator('.sidebar-toggle').click();
  await page.locator('.sidebar').getByRole('button',{name:'Reports',exact:true}).click();
  await page.evaluate(()=>{window.requestDeadlines=[];});
  await page.getByRole('button',{name:'Short summary',exact:true}).click();
  await page.getByRole('heading',{name:'Quick summary'}).waitFor();
  assert.ok((await page.evaluate(()=>window.requestDeadlines)).includes(45000));
  await reportReceived;
  assert.equal(reportAttempts,1);
  releaseReport();
  await page.getByRole('alert').filter({hasText:'The AI summary timed out'}).waitFor();
  await page.getByRole('heading',{name:'Quick summary'}).waitFor();
  await page.getByRole('button',{name:'Try AI again'}).click();
  await page.getByRole('heading',{name:'AI summary'}).waitFor();
  assert.equal(await page.getByRole('heading',{name:'Quick summary'}).count(),0);
  assert.equal(await page.getByRole('figure',{name:'Income and spending chart'}).count(),0);
  await page.getByRole('button',{name:'Step-by-step review'}).click();
  const chart=page.getByRole('figure',{name:'Income and spending chart'});
  await chart.waitFor();
  const metrics=await page.locator('.report-metrics dd').allTextContents();
  assert.deepEqual(await chart.locator('dd').allTextContents(),metrics.slice(0,2));
  await page.getByRole('heading',{name:'AI walkthrough'}).waitFor();
  assert.equal(await page.locator('.report-review-steps li').count(),2);
  await page.getByRole('heading',{name:'How to improve'}).waitFor();
  await page.getByText('Review one regular cost.',{exact:true}).waitFor();
  assert.equal(calls.at(-1).reportFormat,'detailed');
  await page.getByRole('button',{name:'Short summary',exact:true}).click();
  assert.equal(await chart.count(),0);
  assert.equal(reportAttempts,3,'switching to a completed review reuses its result');
  await page.getByRole('group',{name:'Report area'}).getByRole('button',{name:'Tasks',exact:true}).click();
  await page.getByRole('button',{name:'Step-by-step review'}).click();
  const taskChart=page.getByRole('figure',{name:'Task status chart'});
  await taskChart.waitFor();
  const [completed,open,overdue]=(await page.locator('.report-metrics dd').allTextContents()).map(Number);
  assert.deepEqual((await taskChart.locator('dd').allTextContents()).map(Number),[completed,open-overdue,overdue]);
  await page.getByRole('heading',{name:'AI walkthrough'}).waitFor();
  assert.equal(calls.at(-1).reportArea,'tasks');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  assert.deepEqual(writes,[]);await page.close();console.log(`${avatar} clarification, voice fallback and AI recovery passed at ${width}px`);
 }
 assert.deepEqual(errors,[]);
}finally{await browser.close();server.closeAllConnections();server.close();}
