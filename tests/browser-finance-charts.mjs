import {workspaceText} from '../client/src/lib/workspace-text.js';
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
const server=createApp({db:memoryDatabase(records,[user]),authStore:{session:async()=>user,listSessions:async()=>[]},recoveryOptions:null}).listen(0,'127.0.0.1');
await once(server,'listening');
const url=`http://127.0.0.1:${server.address().port}`;
const screenshotDir=process.env.CHART_SCREENSHOT_DIR;
let browser;
try{
  browser=await chromium.launch({headless:true,channel:'msedge'});
  if(screenshotDir)await mkdir(screenshotDir,{recursive:true});
  for(const width of [1280,360])for(const scheme of ['light','dark'])for(const rtl of [false,true]){
    const t=workspaceText(rtl?'ar':'en');
    const context=await browser.newContext({viewport:{width,height:900},colorScheme:scheme,reducedMotion:'reduce'});
    await context.route('https://**/*',route=>route.abort());
    if(rtl)await context.addInitScript(()=>localStorage.setItem('yawmeh:workspace-language:live:1','ar'));
    await context.addCookies([{name:'daywell_session',value:'a'.repeat(64),url}]);
    const page=await context.newPage(),errors=[];
    page.setDefaultTimeout(10000);
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(url);
    await page.getByRole('button',{name:'Close getting started'}).click();
    await page.locator('.overview-tabs').getByRole('button',{name:t('Dashboard'),exact:true}).click();
    const monthly=page.getByRole('region',{name:t('Monthly money')});
    const monthButtons=monthly.getByRole('group',{name:'Select a month'}).getByRole('button');
    const chart=monthly.locator('.finance-chart');
    await chart.locator('.recharts-surface').waitFor();
    const chartColors=()=>chart.evaluate(el=>['--primary','--income','--expense','--savings','--budget-limit','--danger'].map(token=>getComputedStyle(el).getPropertyValue(token)));
    const originalChartColors=await chartColors();
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
    assert.ok((await budget.textContent()).includes('$50.00'+t('Over the limit')));
    await chart.locator('.recharts-bar-rectangle path[fill="var(--danger)"]:visible').waitFor();
    await monthly.getByText(t('Compare monthly totals'),{exact:true}).click();
    assert.ok((await monthly.locator('tbody tr').nth(4).textContent()).includes('$150.00'+t('Over budget')));
    const tableBox=await monthly.locator('table').boundingBox();
    const monthlyBox=await monthly.boundingBox();
    assert.ok(tableBox.x>=monthlyBox.x&&tableBox.x+tableBox.width<=monthlyBox.x+monthlyBox.width);
    await monthly.getByText(t('Compare monthly totals'),{exact:true}).click();
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

    await page.getByText(t('More dashboard details'),{exact:true}).click();
    const currency=page.getByRole('heading',{name:t('Money report'),exact:true}).locator('xpath=ancestor::section[1]');
    await currency.getByText(t('Chart breakdown'),{exact:true}).click();
    await currency.locator('.recharts-surface').waitFor();

    async function go(name){
      if(width<=700)await page.getByRole('button',{name:'Open navigation',exact:true}).click();
      await page.locator('.sidebar').getByRole('button',{name,exact:true}).click();
    }
    await go('Money');
    const originalTitle=records.entries.find(entry=>entry.id===4).title;
    const updatedTitle='Updated groceries '+[width,scheme,rtl?'RTL':'LTR'].join(' ');
    const transaction=page.locator('tr').filter({hasText:originalTitle});
    const transactionAmount=await transaction.locator('.amount').textContent();
    await transaction.getByRole('button',{name:t('Edit {name}',{name:originalTitle})}).click();
    const editor=page.getByRole('dialog',{name:t('Edit transaction')});
    await editor.locator('[name=title]').fill(updatedTitle);
    await editor.getByRole('combobox',{name:t('Category')}).selectOption({label:t('Add a custom category')});
    await editor.getByRole('textbox',{name:t('Custom category')}).fill('Household');
    await editor.locator('[name=note]').fill('Receipt checked');
    await editor.getByRole('button',{name:t('Save changes'),exact:true}).click();
    await editor.waitFor({state:'hidden'});
    const edited=page.locator('tr').filter({hasText:updatedTitle});
    await edited.getByText('Receipt checked',{exact:false}).waitFor();
    assert.equal(await edited.locator('.amount').textContent(),transactionAmount);
    const range=page.locator('.date-range');
    assert.equal(await range.getAttribute('dir'),'ltr');
    const [startBox,endBox]=await Promise.all([range.locator('input').first().boundingBox(),range.locator('input').last().boundingBox()]);
    assert.ok(startBox.x<endBox.x);
    if(rtl)await page.getByText('5 مصاريف',{exact:true}).waitFor();
    await page.locator('.page-heading').getByRole('button',{name:t('Income'),exact:true}).click();
    let dialog=page.locator('dialog[open]');
    await dialog.locator('[name=amount]').fill('500');
    await dialog.locator('[name=saved]').fill('200');
    await dialog.locator('.finance-detail-chart .recharts-surface').waitFor();
    await dialog.getByRole('button',{name:/^(Cancel|إلغاء|إلغِ)$/}).click();

    await go('Overview');
    await page.locator('.overview-more>summary').click();
    await page.locator('.overview-menu').getByRole('button',{name:t('History'),exact:true}).click();
    await page.locator('.history-record').filter({hasText:updatedTitle}).getByRole('button',{name:t('Edit {name}',{name:updatedTitle})}).click();
    assert.equal(await editor.locator('[name=category]').inputValue(),'Household');
    await editor.getByRole('button',{name:t('Cancel'),exact:true}).click();
    await page.locator('.overview-tabs').getByRole('button',{name:t('Today'),exact:true}).click();
    const summaryCards=page.locator('.today-money-summary > section');
    assert.equal(await summaryCards.count(),3);
    const positions=await summaryCards.evaluateAll(items=>items.map(item=>item.getBoundingClientRect().y));
    assert.equal(positions.every(y=>y===positions[0]),width>700);
    await summaryCards.nth(1).getByRole('progressbar').waitFor();
    assert.equal(await page.locator('.today-more').getAttribute('open'),null);
    await page.locator('.today-more>summary').click();
    await page.locator('.spending-breakdown summary').click();
    await page.locator('.spending-breakdown .recharts-surface').waitFor();
    await page.locator('.today-metrics .recharts-pie-sector').first().waitFor();

    await go('Reports');
    await page.locator('.report-review-chart .recharts-surface').first().waitFor();
    await page.getByText('View detailed reports and export',{exact:true}).click();
    await page.locator('.report-details select').first().selectOption('cash-flow');
    await page.locator('.report-details .recharts-surface').waitFor();
    await go('Settings');
    const swatches=page.getByRole('group',{name:rtl?'لون التطبيق':'App color'});
    const labels=rtl?['ليموني','محيطي','مرجاني','زمردي']:['Lime','Ocean','Coral','Emerald'];
    const paletteNames=['ocean','coral','emerald'];
    const lightCards=[[248,254,230],[229,236,253],[255,235,231],[225,242,237]];
    const darkCards=[[19,49,31],[16,36,77],[30,30,37],[5,150,105]];
    const paletteCardColor=()=>page.evaluate(()=>{
      const probe=document.createElement('span');
      probe.style.backgroundColor='var(--spend-card)';
      document.body.append(probe);
      const context=document.createElement('canvas').getContext('2d');
      context.fillStyle=getComputedStyle(probe).backgroundColor;
      context.fillRect(0,0,1,1);
      probe.remove();
      return [...context.getImageData(0,0,1,1).data].slice(0,3);
    });
    const cards=scheme==='dark'?darkCards:lightCards;
    const matchesColor=(actual,expected)=>actual.every((channel,i)=>Math.abs(channel-expected[i])<=1);
    assert.ok(matchesColor(await paletteCardColor(),cards[0]));
    for(const [index,name] of paletteNames.entries()){
      const swatch=swatches.getByRole('button',{name:labels[index+1]});
      await swatch.focus();
      await swatch.press('Space');
      assert.equal(await swatch.getAttribute('aria-pressed'),'true');
      assert.equal(await page.locator('html').getAttribute('data-palette'),name);
      const actualCard=await paletteCardColor();
      assert.ok(matchesColor(actualCard,cards[index+1]));
    }
    await page.reload();
    await go('Settings');
    assert.equal(await swatches.getByRole('button',{name:labels[3]}).getAttribute('aria-pressed'),'true');
    await go('Overview');
    const [heroColor,amountColor]=await page.locator('.spending-breakdown summary').evaluate(el=>[
      getComputedStyle(el).backgroundColor,getComputedStyle(el.querySelector('.balance-hero-value')).color,
    ]);
    assert.equal(heroColor,scheme==='dark'?'rgb(5, 150, 105)':'color(srgb 0.882353 0.950588 0.929412)');
    assert.equal(amountColor,scheme==='dark'?'rgb(255, 255, 255)':'rgb(15, 17, 21)');
    await page.locator('.overview-tabs').getByRole('button',{name:t('Dashboard'),exact:true}).click();
    await chart.locator('.recharts-surface').waitFor();
    assert.deepEqual(await chartColors(),originalChartColors);
    await go('Settings');
    await swatches.getByRole('button',{name:labels[0]}).click();
    assert.equal(await page.locator('html').getAttribute('data-palette'),null);
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
