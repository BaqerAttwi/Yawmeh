// Records only isolated demo workspaces. Never connect this recorder to production.
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {mkdir,copyFile,writeFile,stat} from 'node:fs/promises';
import {isAbsolute} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createApp} from '../server/src/app.js';
import {today} from '../shared/domain.js';
import {addDays} from '../shared/planner.js';
const module=process.env.PLAYWRIGHT_MODULE||'playwright';
const {chromium}=await import(isAbsolute(module)?pathToFileURL(module).href:module);
const server=createApp({db:{},authStore:{},recoveryOptions:null}).listen(0,'127.0.0.1');await once(server,'listening');
const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,channel:'msedge'});
await mkdir('client/public/guides',{recursive:true});await mkdir('test-results/guides/raw',{recursive:true});
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const stamp=ms=>{const seconds=Math.floor(ms/1000);return `${String(Math.floor(seconds/3600)).padStart(2,'0')}:${String(Math.floor(seconds/60)%60).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}.${String(ms%1000).padStart(3,'0')}`;};
async function record(name,steps){
 const context=await browser.newContext({viewport:{width:1280,height:900},recordVideo:{dir:'test-results/guides/raw',size:{width:1280,height:900}}});
 const page=await context.newPage(),video=page.video(),started=Date.now(),cues=[];
 await page.goto(base);await page.getByRole('button',{name:'Try admin demo'}).click();await page.locator('.sidebar').waitFor();
 await page.addStyleTag({content:'dialog:not(#record-caption){max-height:calc(100dvh - 190px)!important;bottom:145px!important;} html{scroll-padding-bottom:145px}'});
 const caption=async(en,ar)=>{
  const now=Date.now()-started;if(cues.length)cues.at(-1).end=now;cues.push({start:now,en,ar});
  await page.evaluate(({en,ar})=>{
   let panel=document.getElementById('record-caption');if(!panel){panel=document.createElement('div');panel.id='record-caption';panel.setAttribute('popover','manual');document.body.append(panel);}
   if(panel.matches(':popover-open'))panel.hidePopover();
   panel.style.cssText='position:fixed;inset:auto 0 0 0;margin:0;width:100%;box-sizing:border-box;border:0;background:rgba(17,40,31,.97);color:white;padding:16px 36px;text-align:center;font-family:Arial,sans-serif;pointer-events:none;';
   panel.replaceChildren();for(const [value,dir,size] of [['YAWMEH · DEMO / شرح تجريبي','ltr','12px'],[en,'ltr','23px'],[ar,'rtl','23px']]){const line=document.createElement('div');line.textContent=value;line.dir=dir;line.style.cssText=`font-size:${size};line-height:1.45;margin:3px 0`;panel.append(line);}panel.showPopover();
  },{en,ar});
 };
 const focus=async locator=>{await locator.scrollIntoViewIfNeeded();await locator.evaluate(el=>{el.style.outline='3px solid #b18a42';el.style.outlineOffset='3px';});await locator.hover();};
 await steps({page,caption,focus,pause});
 cues.at(-1).end=Date.now()-started;
 await page.screenshot({path:`test-results/guides/${name}-final.png`});
 await context.close();const raw=await video.path();await copyFile(raw,`client/public/guides/${name}.webm`);
 for(const language of ['en','ar'])await writeFile(`client/public/guides/${name}.${language}.vtt`,'WEBVTT\n\n'+cues.map((cue,index)=>`${index+1}\n${stamp(cue.start)} --> ${stamp(cue.end)}\n${cue[language]}\n`).join('\n'));
 console.log(JSON.stringify({name,durationSeconds:Math.round(cues.at(-1).end/1000),bytes:(await stat(`client/public/guides/${name}.webm`)).size}));
}
try{
 await record('create-task',async({page,caption,focus,pause})=>{
  await page.locator('.sidebar').getByRole('button',{name:'Tasks',exact:true}).click();
  await caption('Create a task — start in Tasks, then Add task.','لإضافة مهمة، افتح المهام واضغط Add task.');await focus(page.getByRole('button',{name:'Add task',exact:true}));await pause(3000);
  await page.getByRole('button',{name:'Add task',exact:true}).click();const form=page.locator('dialog[open]');
  await caption('Give your task a clear name and choose its due date.','اكتب اسم واضح للمهمة واختار موعدها.');await focus(form.locator('input[name=title]'));await form.locator('input[name=title]').pressSequentially('Take a short break',{delay:75});await form.locator('input[name=due]').fill(addDays(today(),1));await pause(3000);
  await form.getByText('More options: time, repeat, subtasks and reminders',{exact:true}).click();
  await caption('More options: set a time, priority, and estimated minutes.','من الخيارات الإضافية، حدّد الوقت والأولوية والمدة التقديرية.');await form.locator('input[name=scheduled_time]').fill('13:00');await form.locator('input[name=estimate_minutes]').fill('15');await form.locator('select[name=priority]').selectOption('medium');await focus(form.locator('input[name=scheduled_time]'));await pause(4000);
  await caption('Email reminders are optional and need your reminder email configured.','التذكير بالإيميل اختياري وبدّه عنوان تذكير مضبوط بالإعدادات.');await focus(form.locator('input[name=reminder]'));await pause(3000);
  await form.getByRole('button',{name:'عربي',exact:true}).click();
  await caption('You can switch the form to Arabic without losing your entries.','فيك تغيّر لغة النموذج للعربي، والمعلومات بتضل محفوظة فيه.');await form.locator('input[name=title]').scrollIntoViewIfNeeded();await pause(3000);
  await caption('Review the details. Save is what creates the task.','راجع التفاصيل. المهمة ما بتتسجّل إلا لما تضغط احفظ المهمة.');await focus(form.locator('.modal-footer button.primary'));await pause(3000);await form.locator('.modal-footer button.primary').click();await form.waitFor({state:'detached'});
  await page.getByPlaceholder('Find a task…').fill('Take a short break');await page.getByText('Take a short break',{exact:true}).waitFor();
  await caption('Your task is ready. Use its checkbox when you complete it.','مهمتك صارت جاهزة. علّم عليها لما تخلّصها.');assert.equal(await page.getByText('Take a short break',{exact:true}).count(),1);await pause(4500);
 });
 await record('record-money',async({page,caption,focus,pause})=>{
  await page.locator('.sidebar').getByRole('button',{name:'Money',exact:true}).click();
  await caption('Money: record income first, then track your expenses.','بالمصاري، سجّل الدخل وبعدين تابع مصاريفك.');await focus(page.getByRole('button',{name:'Income',exact:true}));await pause(3000);await page.getByRole('button',{name:'Income',exact:true}).click();let form=page.locator('dialog[open]');
  await caption('Income example: enter a name, currency, and amount of 700 USD.','مثال دخل: اكتب الاسم والعملة ومبلغ 700 دولار.');await form.locator('input[name=title]').pressSequentially('Tutorial income',{delay:60});await form.locator('input[name=amount]').fill('700');await focus(form.locator('input[name=amount]'));await pause(3500);
  await caption('Allocate 300 to savings. The remaining 400 is for spending.','خصّص 300 للادخار. الباقي، 400 دولار، بيصير متاح للصرف.');await form.locator('input[name=saved]').fill('300');await focus(form.locator('input[name=saved]'));await pause(4000);
  await caption('Check the currency and date, then save the transaction.','تأكّد من العملة والتاريخ، وبعدين احفظ العملية.');await focus(form.locator('.modal-footer button.primary'));await pause(2500);await form.locator('.modal-footer button.primary').click();await form.waitFor({state:'detached'});
  await caption('For a purchase, choose Expense. Each entry keeps its own currency.','لتسجيل شراء، اختار Expense. كل عملية بتحتفظ بعملتها.');await focus(page.getByRole('button',{name:'Expense',exact:true}));await pause(3000);await page.getByRole('button',{name:'Expense',exact:true}).click();form=page.locator('dialog[open]');
  await form.getByRole('button',{name:'عربي',exact:true}).click();
  await caption('Expense example: lunch, 15 USD. Choose its category.','مثال مصروف: غدا، 15 دولار. اختار الفئة المناسبة.');await form.locator('input[name=title]').fill('Tutorial lunch / غدا');await form.locator('input[name=amount]').fill('15');await form.locator('select[name=category]').selectOption('Food & drinks');await focus(form.locator('input[name=amount]'));await pause(3500);
  await caption('Review and save. This records spending; it does not make a payment.','راجع واحفظ. هيدا بيسجّل المصروف؛ ما بينفّذ أي دفعة مالية.');await focus(form.locator('.modal-footer button.primary'));await pause(3000);await form.locator('.modal-footer button.primary').click();await form.waitFor({state:'detached'});
  await page.getByPlaceholder('Search transactions, categories or notes…').fill('Tutorial');await page.getByText('Tutorial lunch / غدا',{exact:true}).waitFor();
  await caption('Both entries appear in your history. These are demo records only.','العمليتين بيظهروا بالسجل. هيدي بيانات تجريبية بس.');await pause(4500);
 });
}finally{await browser.close();server.closeAllConnections();server.close();}
