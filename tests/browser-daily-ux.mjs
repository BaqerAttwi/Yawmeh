import assert from 'node:assert/strict';
import {once} from 'node:events';
import {isAbsolute} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createApp} from '../server/src/app.js';
import {demoData} from '../client/src/features/demo/data.js';
import {visibleData} from '../shared/access.js';

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
  await demo.getByRole('button',{name:'Start with tasks',exact:true}).click();
  await coach.getByText('Then, add your first task',{exact:true}).waitFor();
  await coach.getByRole('button',{name:'Take me there',exact:true}).click();
  await coach.getByText('You’re in the right place.',{exact:true}).waitFor();
  await coach.getByRole('button',{name:'Pause guided tour',exact:true}).click();
  await openGuide();
  await demo.getByRole('button',{name:'Start with money',exact:true}).click();
  await coach.getByText('First, set your currencies',{exact:true}).waitFor();
  await demo.close();

  const live = await browser.newPage({viewport});
  live.setDefaultTimeout(6000);
  const user = {id:321,name:'Tester',role:'user',permissions:['money','tasks'],active:true};
  const records = visibleData(demoData(),user), writes = [];
  const coffee = records.items.find(item=>item.title==='Morning coffee');
  await live.route('**/api/**',async route=>{
    const request=route.request(), path=new URL(request.url()).pathname;
    if(path==='/api/data')return route.fulfill({json:{...records,user}});
    if(path==='/api/auth/me')return route.fulfill({json:{user}});
    if(path==='/api/entries'&&request.method()==='POST'){
      const id=1001+writes.length, value=request.postDataJSON();
      writes.push({path,id,value});
      records.entries.push({...value,id});
      return route.fulfill({status:201,json:{id}});
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
  await live.close();
  console.log('Mobile demo entry, first steps, Today shortcuts and exact-record Undo passed.');
} finally {
  await browser.close();
  server.closeAllConnections();
  server.close();
}
