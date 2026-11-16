import assert from 'node:assert/strict';
import {once} from 'node:events';
import {isAbsolute} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createApp} from '../server/src/app.js';
import {demoData} from '../client/src/features/demo/data.js';
import {visibleData} from '../shared/access.js';
import {nextRenewal,today} from '../shared/domain.js';
import {addDays} from '../shared/planner.js';

const module = process.env.PLAYWRIGHT_MODULE || 'playwright';
const {chromium} = await import(isAbsolute(module) ? pathToFileURL(module).href : module);
const server = createApp({db:{},authStore:{},recoveryOptions:null}).listen(0,'127.0.0.1');
await once(server,'listening');
const browser = await chromium.launch({headless:true,channel:'msedge'});
const url = `http://127.0.0.1:${server.address().port}`;
const viewport = {width:320,height:620};
try {
  const demo = await browser.newPage({viewport});
  await demo.goto(url);
  const demoButton = demo.getByRole('region',{name:'Try the demo'}).getByRole('button',{name:'Try admin demo'});
  await demoButton.waitFor();
  assert.ok(await demoButton.evaluate(el=>el.getBoundingClientRect().bottom<=innerHeight));
  await demoButton.click();
  const actions = demo.getByRole('region',{name:"Today's quick actions"});
  await actions.getByRole('button',{name:'Add task',exact:true}).click();
  await demo.locator('dialog[open] [name=due]').waitFor();
  await demo.locator('dialog[open]').getByRole('button',{name:'Cancel',exact:true}).click();
  await actions.getByRole('button',{name:'Log expense',exact:true}).click();
  await demo.locator('dialog[open] [name=amount]').waitFor();
  await demo.locator('dialog[open]').getByRole('button',{name:'Cancel',exact:true}).click();
  await actions.getByRole('button',{name:/Log Morning coffee/}).click();
  await demo.getByRole('button',{name:'Undo',exact:true}).click();
  await demo.getByText('Purchase undone',{exact:true}).waitFor();
  const demoCoffees=await demo.evaluate(()=>JSON.parse(localStorage.getItem('daywell-demo')).entries.filter(entry=>entry.title==='Morning coffee'));
  assert.equal(demoCoffees.filter(entry=>!entry.voided_on).length,1);
  assert.equal(demoCoffees.filter(entry=>entry.voided_on).length,1);
  const openGuide = ()=>demo.locator('.topbar-actions').getByRole('button',{name:'Guide',exact:true}).click();
  const coach = demo.getByRole('region',{name:'Guided tour'});
  await openGuide();
  await demo.getByRole('button',{name:'All task steps',exact:true}).click();
  await coach.getByText('Then, add your first task',{exact:true}).waitFor();
  await coach.getByRole('button',{name:'Take me there',exact:true}).click();
  await coach.getByText('You’re in the right place.',{exact:true}).waitFor();
  await coach.getByRole('button',{name:'Pause guided tour',exact:true}).click();
  await openGuide();
  await demo.getByRole('button',{name:'All money steps',exact:true}).click();
  await coach.getByText('First, set your currencies',{exact:true}).waitFor();
  await coach.getByRole('button',{name:'Pause guided tour',exact:true}).click();
  await openGuide();
  await demo.getByLabel('Or choose one topic').selectOption('items');
  await demo.getByRole('button',{name:'Start topic'}).click();
  await coach.getByText('Save purchases you repeat',{exact:true}).waitFor();
  await coach.getByRole('button',{name:'Take me there',exact:true}).click();
  await demo.locator('[data-tour="add-item"].tour-target').waitFor();
  await coach.getByRole('button',{name:'Finish tour',exact:true}).click();
  await demo.close();

  const live = await browser.newPage({viewport});
  await live.context().addCookies([{name:'daywell_session',value:'a'.repeat(64),url,httpOnly:true,sameSite:'Strict'}]);
  live.setDefaultTimeout(6000);
  const user = {id:321,name:'Tester',role:'user',permissions:['money','tasks'],active:true};
  const records = visibleData(demoData(),user), writes = [];
  records.subscriptions.push(...records.subscriptions.slice(0,2).map(record=>({...record,id:record.id+100})));
  const coffee = records.items.find(item=>item.title==='Morning coffee');
  await live.route('**/api/**',async route=>{
    const request=route.request(), path=new URL(request.url()).pathname;
    if(path==='/api/data')return route.fulfill({json:{...records,user}});
    if(path==='/api/auth/me')return route.fulfill({json:{user}});
    if(path==='/api/tasks'&&request.method()==='POST'){
      const id=3001;
      records.tasks.unshift({...request.postDataJSON(),id,completed:0});
      return route.fulfill({status:201,json:{id}});
    }
    if(path==='/api/entries'&&request.method()==='POST'){
      const id=1001+writes.length, value=request.postDataJSON();
      writes.push({path,id,value});
      records.entries.push({...value,id});
      if(value.save_as_item)records.items.unshift({id,title:value.title,amount:value.item_price_usd,category:value.category});
      return route.fulfill({status:201,json:{id}});
    }
    if(path==='/api/subscriptions/901/renew'&&request.method()==='POST'){
      const value=request.postDataJSON(),bill=records.subscriptions.find(record=>record.id===901);
      assert.equal(value.renewal,bill.renewal);
      bill.renewal=nextRenewal(bill.renewal,bill.cycle);
      writes.push({path,value});
      return route.fulfill({json:{ok:true,renewal:bill.renewal}});
    }
    if(path.endsWith('/void')&&request.method()==='POST'){
      const id=Number(path.split('/').at(-2)), value=request.postDataJSON();
      writes.push({path,id,value});
      const entry=records.entries.find(item=>item.id===id);
      entry.voided_on=entry.date;
      entry.void_reason=value.reason;
      return route.fulfill({json:{ok:true}});
    }
    return route.fulfill({json:{available:false,google:false}});
  });
  await live.goto(url);
  const firstGuide=live.getByRole('dialog',{name:'Start here'});
  await firstGuide.getByRole('button',{name:'Close getting started'}).click();
  await firstGuide.waitFor({state:'hidden'});
  const attention=live.getByRole('region',{name:'Needs attention'});
  assert.equal(await attention.locator('.attention-row:visible').count(),3);
  await attention.getByText(/^See \d+ more$/).click();
  assert.ok(await attention.locator('.attention-row:visible').count()>3);
  const spending=live.getByRole('region',{name:'Your spending balance'});
  await spending.locator('summary').click();
  await spending.getByText('Income set aside as savings',{exact:true}).waitFor();
  for(const [option,field] of [['Expense','[name=amount]'],['Income','[name=saved]'],['Existing savings','[name=amount]'],['Withdraw from savings','textarea[required]']]){
    await live.locator('.today-actions').getByRole('button',{name:'Add transaction',exact:true}).click();
    const chooser=live.getByRole('dialog',{name:'Add transaction',exact:true});
    await chooser.getByRole('button',{name:new RegExp('^'+option)}).click();
    const transaction=live.locator('dialog[open]');
    await transaction.locator(field).waitFor();
    if(option==='Expense'){
      assert.equal(await transaction.locator('[name=amount]').evaluate(input=>input===document.activeElement),true);
      assert.equal(await transaction.locator('[name=note]').isVisible(),false);
      assert.ok(await transaction.locator('[name=date]').inputValue());
    }
    await transaction.getByRole('button',{name:'Cancel',exact:true}).click();
  }
  assert.equal(writes.length,0);
  await live.locator('.companion-launcher').click();
  const chat=live.getByRole('dialog',{name:'Sage companion chat'});
  await chat.locator('.assistant-icon[data-look="robot"] .assistant-robot-face').waitFor();
  await chat.getByRole('button',{name:'Companion settings',exact:true}).click();
  await chat.getByLabel('Customize assistant appearance').selectOption('nova');
  await chat.locator('.assistant-icon-artwork').waitFor();
  assert.equal(await live.evaluate(()=>localStorage.getItem('daywell-companion:live:321:look')),'nova');
  await chat.getByRole('button',{name:'Examples',exact:true}).click();
  const examples=chat.getByRole('region',{name:'Request examples'});
  assert.equal(await examples.evaluate(el=>{
    const rect=el.getBoundingClientRect();
    return rect.height>0&&rect.bottom<=el.parentElement.querySelector('.companion-bottom-tools').getBoundingClientRect().top;
  }),true);
  await examples.locator('.companion-example-list button').first().click();
  assert.ok(await chat.locator('#companion-question').inputValue());
  await chat.getByRole('button',{name:'Close companion chat',exact:true}).click();
  const purchase=live.locator('.today-actions').getByRole('button',{name:/Log Morning coffee/});
  assert.match(await purchase.innerText(),/4\.50 USD/);
  const refresh=()=>live.waitForResponse(response=>new URL(response.url()).pathname==='/api/data');
  await Promise.all([refresh(),purchase.click()]);
  await live.getByRole('button',{name:'Undo',exact:true}).waitFor();
  await Promise.all([refresh(),purchase.click()]);
  const undo=live.getByRole('button',{name:'Undo',exact:true});
  await Promise.all([refresh(),undo.click()]);
  await live.getByText('Purchase undone',{exact:true}).waitFor();
  assert.deepEqual(writes.map(write=>write.path),['/api/entries','/api/entries','/api/entries/1002/void']);
  assert.equal(writes[0].value.amount,coffee.amount);
  assert.equal(writes[0].value.category,coffee.category);
  assert.equal(records.entries.find(entry=>entry.id===1001).voided_on,undefined);
  assert.ok(records.entries.find(entry=>entry.id===1002).voided_on);
  assert.equal(await live.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  records.entries.length=0;
  records.tasks.length=0;
  await live.reload();
  await live.getByRole('button',{name:'Add my first task',exact:true}).waitFor();
  const guideButton=live.locator('.topbar-actions').getByRole('button',{name:'Guide',exact:true});
  await guideButton.click();
  await firstGuide.getByRole('button',{name:'Start with Money',exact:true}).click();
  const form=live.locator('dialog[open]');
  await form.getByText(/Example only/).waitFor();
  for(const name of ['Total income received (USD)','Allocate to savings (USD)','Available to spend (USD)']){
    assert.equal(await form.getByLabel(name,{exact:true}).inputValue(),'');
  }
  await form.locator('[name=title]').fill('First payment');
  await form.locator('[name=amount]').fill('90');
  await form.locator('[name=saved]').fill('20');
  assert.deepEqual(await form.locator('.money-effect dd').allTextContents(),['$90.00','$20.00','$70.00']);
  await form.getByRole('button',{name:'Save transaction',exact:true}).click();
  const balance=live.getByRole('region',{name:'Your spending balance'});
  await balance.getByText(/70.00 available to spend/).waitFor();
  await balance.getByRole('button',{name:'Log an expense'}).click();
  await form.locator('[name=title]').fill('Tea');
  await form.locator('[name=amount]').fill('4');
  await form.getByRole('checkbox',{name:'Also save as an item'}).check();
  await form.getByRole('button',{name:'Save transaction',exact:true}).click();
  await live.locator('.today-actions').getByRole('button',{name:/Log Tea/}).waitFor();
  await live.locator('.today-actions').getByRole('button',{name:'Add transaction',exact:true}).click();
  await live.getByRole('dialog',{name:'Add transaction',exact:true}).getByRole('button',{name:/^Withdraw from savings/}).click();
  await form.locator('[name=amount]').fill('5');
  assert.deepEqual(await form.locator('.money-effect dd').allTextContents(),['$20.00 → $15.00','$66.00 → $71.00']);
  await form.locator('[name=amount]').fill('21');
  await form.getByRole('alert').filter({hasText:'exceeds the savings'}).waitFor();
  assert.equal(await form.locator('.money-effect').count(),0);
  await form.getByRole('button',{name:'Cancel',exact:true}).click();
  await guideButton.click();
  await firstGuide.getByRole('button',{name:'Start with Tasks',exact:true}).click();
  assert.equal(await form.locator('[name=title]').inputValue(),'');
  await form.locator('[name=title]').fill('My first task');
  await form.getByRole('button',{name:'Save task',exact:true}).click();
  await live.getByRole('region',{name:'Your first task'}).getByText('My first task',{exact:true}).waitFor();
  const date=records.entries[0].date;
  records.entries.push(
    {id:2001,type:'income',title:'LBP payment',amount:90000,currency:'LBP',exchange_rate:90000,saved:0,date},
    {id:2002,type:'expense',title:'Reversed purchase',amount:30,currency:'USD',date,voided_on:date},
    {id:2003,type:'income',title:'Future payment',amount:100,currency:'USD',saved:0,date:'2099-01-01'},
  );
  await live.reload();
  const mixedSummary=spending.locator('summary');
  assert.match(await mixedSummary.innerText(),/\$66\.00.*LBP.*90,000\.00/s);
  await mixedSummary.click();
  await spending.getByText(/Combined estimate \(USD\): \$67\.00/).waitFor();

  const current=today(),past=addDays(current,-1),soon=addDays(current,7);
  records.tasks.length=0;
  records.subscriptions=[
    {id:903,title:'Cloud storage',amount:5,cycle:'monthly',active:1,renewal:soon},
    {id:904,title:'Paused gym',amount:10,cycle:'monthly',active:0,renewal:addDays(current,-2)},
    {id:902,title:'Internet',amount:30,cycle:'monthly',active:1,renewal:current},
    {id:901,title:'Music',amount:9,cycle:'monthly',active:1,renewal:past},
  ];
  await live.reload();
  const nextBill=attention.locator('.next-bill');
  await nextBill.getByText(`Past due · ${past} · $9.00 USD`,{exact:true}).waitFor();
  await attention.getByText(`Due today · ${current} · $30.00 USD`,{exact:true}).waitFor();
  await attention.getByText(`Due soon · ${soon} · $5.00 USD`,{exact:true}).waitFor();
  assert.equal(await attention.getByText('Paused gym').count(),0);
  assert.equal(await attention.evaluate(section=>section.scrollWidth<=section.clientWidth),true);
  const writesBeforePayment=writes.length;
  await nextBill.getByRole('button',{name:'Review payment',exact:true}).click();
  await form.locator('[name=amount]').waitFor();
  await form.getByRole('button',{name:'Cancel',exact:true}).click();
  assert.equal(writes.length,writesBeforePayment);
  await nextBill.getByRole('button',{name:'Review payment',exact:true}).click();
  await form.locator('[name=amount]').fill('8.50');
  await form.getByRole('button',{name:'Record payment',exact:true}).click();
  await live.getByText(`Payment recorded. Next renewal is ${nextRenewal(past,'monthly')}.`,{exact:true}).waitFor();
  await nextBill.getByText('Internet',{exact:true}).waitFor();
  assert.equal(writes.length,writesBeforePayment+1);
  assert.equal(writes.at(-1).value.amount,8.5);
  records.subscriptions=records.subscriptions.filter(record=>record.id===901);
  await live.reload();
  await nextBill.getByText(/^Upcoming · /).waitFor();
  await live.close();
  console.log('Mobile demo entry, first steps, Today shortcuts, bill review and exact-record Undo passed.');
} finally {
  await browser.close();
  server.closeAllConnections();
  server.close();
}
