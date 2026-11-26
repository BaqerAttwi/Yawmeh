import assert from 'node:assert/strict';
import {once} from 'node:events';
import {mkdir} from 'node:fs/promises';
import {isAbsolute} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createApp} from '../server/src/app.js';
import {demoData} from '../client/src/features/demo/data.js';
import {memoryDatabase} from './helpers/memory-db.js';

const module=process.env.PLAYWRIGHT_MODULE||'playwright';
const {chromium}=await import(isAbsolute(module)?pathToFileURL(module).href:module);
const user={id:1,name:'Chart Tester',email:'charts@test.local',role:'user',active:true,permissions:['money','tasks'],current_rate:89000};
const records=Object.fromEntries(Object.entries(demoData()).filter(([,value])=>Array.isArray(value)).map(([key,value])=>[key,value.map(row=>({...row,user_id:1}))]));
const previousMonthEnd=new Date(records.budgets[0].start+'T00:00:00Z');
previousMonthEnd.setUTCDate(0);
const previousEnd=previousMonthEnd.toISOString().slice(0,10),previousStart=previousEnd.slice(0,7)+'-01';
records.entries.push({...records.entries[3],id:999,date:previousEnd,amount:150,currency:'USD'});
records.budgets.push({...records.budgets[0],id:999,start:previousStart,end:previousEnd,amount:100});
const server=createApp({db:memoryDatabase(records,[user]),authStore:{session:async()=>user},recoveryOptions:null}).listen(0,'127.0.0.1');
await once(server,'listening');
const url=`http://127.0.0.1:${server.address().port}`;
const screenshotDir=process.env.CHART_SCREENSHOT_DIR;
let browser;
try{
  browser=await chromium.launch({headless:true,channel:'msedge'});
  if(screenshotDir)await mkdir(screenshotDir,{recursive:true});
  for(const [width,scheme,rtl] of [[1280,'light',false],[360,'light',false],[360,'dark',false],[360,'light',true],[360,'dark',true]]){
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
    const budget=monthly.locator('.monthly-money-budget');
    const monthHeading=monthly.locator('.monthly-money-detail h3');
    const initialMonth=await monthHeading.textContent();
    const [summaryBounds,chartBounds]=await Promise.all([budget.boundingBox(),chart.boundingBox()]);
    assert.ok(summaryBounds&&chartBounds&&summaryBounds.y+summaryBounds.height<chartBounds.y);
    if(screenshotDir&&width===360)await monthly.screenshot({path:`${screenshotDir}/${rtl?'ar':'en'}-${scheme}.png`});
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
    assert.notEqual(await monthHeading.textContent(),initialMonth);
    assert.equal(await monthButtons.nth(4).getAttribute('aria-pressed'),'true');
    assert.match(await budget.textContent(),/\$50\.00Over the limit/);
    await chart.locator('.recharts-bar-rectangle path[fill="var(--danger)"]:visible').waitFor();
    await monthly.getByText('Compare monthly totals',{exact:true}).click();
    assert.match(await monthly.locator('tbody tr').nth(4).textContent(),/\$150\.00Over budget.*\$100\.00/);
    const tableBox=await monthly.locator('table').boundingBox();
    const monthlyBox=await monthly.boundingBox();
    assert.ok(tableBox.x>=monthlyBox.x&&tableBox.x+tableBox.width<=monthlyBox.x+monthlyBox.width);
    await monthly.getByText('Compare monthly totals',{exact:true}).click();
    const highlight=await monthly.locator('.monthly-money-highlight span').boundingBox();
    const selectedButton=await monthButtons.nth(4).boundingBox();
    assert.ok(highlight&&selectedButton&&Math.abs(highlight.x+highlight.width/2-selectedButton.x-selectedButton.width/2)<1);
    const bar=chart.locator('.recharts-bar-rectangle path[fill="var(--expense)"]:visible').last();
    await bar.hover();
    await chart.getByRole('status').getByText(/\$\d/).first().waitFor();
    await bar.click();
    assert.equal(await monthButtons.last().getAttribute('aria-pressed'),'true');
    assert.equal(await chart.locator('line[stroke="var(--budget-limit)"][stroke-dasharray]').count(),2);
    await page.locator('.filterbar').getByRole('button',{name:'Tasks',exact:true}).click();
    const completion=page.locator('.card').filter({has:page.getByRole('heading',{name:'Task completion',exact:true})});
    const ring=completion.locator('.finance-ring svg');
    await ring.waitFor();
    const [ringBox,cardBox,headingBox]=await Promise.all([
      ring.boundingBox(),completion.boundingBox(),completion.locator('.card-heading').boundingBox(),
    ]);
    assert.ok(ringBox.y>=headingBox.y+headingBox.height&&ringBox.x>=cardBox.x&&ringBox.x+ringBox.width<=cardBox.x+cardBox.width);
    assert.ok(ringBox.y+ringBox.height<=cardBox.y+cardBox.height);
    await page.locator('.filterbar').getByRole('button',{name:'All overview',exact:true}).click();

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
