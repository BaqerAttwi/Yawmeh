import assert from 'node:assert/strict';
import {once} from 'node:events';
import {isAbsolute} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createApp} from '../server/src/app.js';
import {demoData} from '../client/src/features/demo/data.js';
import {memoryDatabase} from './helpers/memory-db.js';

const module=process.env.PLAYWRIGHT_MODULE||'playwright';
const {chromium}=await import(isAbsolute(module)?pathToFileURL(module).href:module);
const user={id:1,name:'Chart Tester',email:'charts@test.local',role:'user',active:true,permissions:['money','tasks'],current_rate:89000};
const records=Object.fromEntries(Object.entries(demoData()).filter(([,value])=>Array.isArray(value)).map(([key,value])=>[key,value.map(row=>({...row,user_id:1}))]));
const server=createApp({db:memoryDatabase(records,[user]),authStore:{session:async()=>user},recoveryOptions:null}).listen(0,'127.0.0.1');
await once(server,'listening');
const url=`http://127.0.0.1:${server.address().port}`;
let browser;
try{
  browser=await chromium.launch({headless:true,channel:'msedge'});
  for(const [width,scheme,rtl] of [[1280,'light',false],[360,'dark',true]]){
    const context=await browser.newContext({viewport:{width,height:900},colorScheme:scheme,reducedMotion:'reduce'});
    await context.route('https://**/*',route=>route.abort());
    if(rtl)await context.addInitScript(()=>localStorage.setItem('yawmeh:workspace-language:live:1','ar'));
    await context.addCookies([{name:'daywell_session',value:'a'.repeat(64),url}]);
    const page=await context.newPage(),errors=[];
    page.setDefaultTimeout(10000);
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(url);
    await page.getByRole('button',{name:'Close getting started'}).click();
    await page.locator('.overview-tabs').getByRole('button',{name:'Dashboard',exact:true}).click();
    const monthly=page.getByRole('region',{name:'Monthly money'});
    const monthButtons=monthly.getByRole('group',{name:'Select a month'}).getByRole('button');
    const chart=monthly.locator('.finance-chart');
    await chart.locator('.recharts-surface').waitFor();
    assert.equal(await chart.getAttribute('data-rtl'),String(rtl));
    const axis=chart.locator('.recharts-surface text').first();
    await axis.waitFor();
    const axisSide=await axis.evaluate(el=>{
      const bounds=el.closest('svg').getBoundingClientRect(),ticks=el.getBoundingClientRect();
      return {midpoint:bounds.left+bounds.width/2,x:ticks.left};
    });
    assert.equal(axisSide.x>axisSide.midpoint,rtl,JSON.stringify(axisSide));
    assert.equal(await monthButtons.count(),6);
    await monthButtons.nth(4).click();
    assert.equal(await monthButtons.nth(4).getAttribute('aria-pressed'),'true');
    const bar=chart.locator('.recharts-bar-rectangle path[fill="var(--expense)"]:visible').last();
    await bar.hover();
    await chart.getByRole('status').getByText(/\$\d/).first().waitFor();
    await bar.click();
    assert.equal(await monthButtons.last().getAttribute('aria-pressed'),'true');
    await chart.locator('line[stroke="var(--budget-limit)"][stroke-dasharray]').waitFor({state:'attached'});

    const currency=page.getByRole('heading',{name:'Money report',exact:true}).locator('xpath=ancestor::section[1]');
    await currency.getByText('Chart breakdown',{exact:true}).click();
    await currency.locator('.recharts-surface').waitFor();

    async function go(name){
      if(width<=700)await page.getByRole('button',{name:'Open navigation',exact:true}).click();
      await page.locator('.sidebar').getByRole('button',{name,exact:true}).click();
    }
    await go('Money');
    await page.locator('.page-heading').getByRole('button',{name:'Income',exact:true}).click();
    let dialog=page.locator('dialog[open]');
    await dialog.locator('[name=amount]').fill('500');
    await dialog.locator('[name=saved]').fill('200');
    await dialog.locator('.finance-detail-chart .recharts-surface').waitFor();
    await dialog.getByRole('button',{name:'Cancel',exact:true}).click();

    await go('Overview');
    await page.locator('.overview-tabs').getByRole('button',{name:'Today',exact:true}).click();
    await page.locator('.spending-breakdown summary').click();
    await page.locator('.spending-breakdown .recharts-surface').waitFor();
    await page.locator('.today-metrics .recharts-pie-sector').first().waitFor();

    await go('Reports');
    await page.locator('.report-review-chart .recharts-surface').first().waitFor();
    await page.getByText('View detailed reports and export',{exact:true}).click();
    await page.locator('.report-details select').first().selectOption('cash-flow');
    await page.locator('.report-details .recharts-surface').waitFor();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    assert.deepEqual(errors,[]);
    await context.close();
    console.log(`Financial charts passed at ${width}px, ${scheme}, ${rtl?'RTL':'LTR'}.`);
  }
}finally{
  await browser?.close();
  server.closeAllConnections();
  server.close();
}
