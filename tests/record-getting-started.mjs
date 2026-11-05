import {gettingStartedSteps} from '../shared/getting-started.js';
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
 const context=await browser.newContext({viewport:{width:1440,height:1000},recordVideo:{dir:'test-results/guides/raw',size:{width:1440,height:1000}}});
 const page=await context.newPage(),video=page.video(),started=Date.now(),cues=[];
 await page.goto(base);await page.getByRole('button',{name:'Try admin demo'}).click();await page.locator('.sidebar').waitFor();
 await page.addStyleTag({content:'dialog:not(#record-caption){max-height:calc(100dvh - 190px)!important;bottom:145px!important;} html{scroll-padding-bottom:145px}'});
 const caption=async(en,ar)=>{
  const now=Date.now()-started;if(cues.length)cues.at(-1).end=now;cues.push({start:now,en,ar});
  await page.evaluate(({en,ar})=>{
   let panel=document.getElementById('record-caption');if(!panel){panel=document.createElement('div');panel.id='record-caption';panel.setAttribute('popover','manual');document.body.append(panel);}
   if(panel.matches(':popover-open'))panel.hidePopover();
   panel.style.cssText='position:fixed;inset:0 0 auto 0;margin:0;width:100%;box-sizing:border-box;border:0;background:rgba(17,40,31,.97);color:white;padding:8px 30px;text-align:center;font-family:Arial,sans-serif;pointer-events:none;';
   panel.replaceChildren();for(const [value,dir,size] of [[en,'ltr','20px'],[ar,'rtl','20px']]){const line=document.createElement('div');line.textContent=value;line.dir=dir;line.style.cssText=`font-size:${size};line-height:1.45;margin:3px 0`;panel.append(line);}panel.showPopover();
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
 await record('getting-started',async({page,caption,pause})=>{
  const before=await page.evaluate(()=>localStorage.getItem('daywell-demo'));
  await caption('Look for G Guide. Start with currencies, then savings, income, expenses and tasks.','دوّر على G Guide. بلّش بالعملات، وبعدين المدخرات والدخل والمصاريف والمهام.');await pause(3500);
  await page.locator('.sidebar').getByRole('button',{name:'Guide',exact:true}).click();
  const menu=page.getByRole('dialog',{name:'Start here',exact:true});
  await caption('Choose the recommended avatar tour. You can pause or return to Guide any time.','اختار الجولة مع المساعد. فيك توقف وترجع لـGuide بأي وقت.');await pause(3500);
  await menu.getByRole('button',{name:/Guide me step by step/}).click();
  const coach=page.getByRole('region',{name:'Guided tour',exact:true});
  const captions={
   currencies:['Settings first: choose your report currency. Set manual rates for other currencies.','أول شي الإعدادات: اختار عملة التقارير وحدّد أسعار التحويل للعملات التانية.'],
   savings:['Add existing savings once. It is money already saved, not new income.','ضيف مدخراتك الموجودة مرة وحدة. هيدي مصاري موفّرها من قبل، مش دخل جديد.'],
   income:['Record the full income. Its savings allocation is part of that amount, not extra money.','سجّل الدخل كامل. الجزء المخصّص للادخار من نفس المبلغ، مش مصاري زيادة.'],
   expense:['Expenses reduce spending money. Savings stay separate until you withdraw from them.','المصاريف بتنقص المصاري المتاحة للصرف. المدخرات بتضل منفصلة لوقت تسحب منها.'],
   tasks:['Then add one small task. Pick its date, and optionally its time and reminder.','بعدين ضيف مهمة صغيرة. حدّد موعدها، وإذا بدك الوقت والتذكير.'],
   overview:['Return to Today each day. All amounts in the guide are examples, not your balances.','ارجع لـToday كل يوم. المبالغ بالشرح أمثلة، مش أرصدتك الفعلية.'],
  };
  const previews={savings:['Example existing savings','500'],income:['Example salary','700'],expense:['Example lunch','15'],tasks:['Call the dentist',null]};
  const steps=gettingStartedSteps({role:'admin'});
  for(const [index,step] of steps.entries()){
   const navigate=coach.getByRole('button',{name:'Take me there',exact:true});if(await navigate.count())await navigate.click();
   await coach.getByText('You’re in the right place.',{exact:true}).waitFor();
   await caption(...captions[step.id]);await pause(4500);
   if(previews[step.id]){
    await page.locator('[data-tour="'+step.target+'"]').click();const form=page.locator('dialog[open]');
    await form.locator('input[name=title]').fill(previews[step.id][0]);
    if(previews[step.id][1])await form.locator('input[name=amount]').fill(previews[step.id][1]);
    if(step.id==='income')await form.locator('input[name=saved]').fill('200');
    if(step.id==='tasks')await form.locator('input[name=due]').fill(addDays(today(),1));
    await caption(step.id==='income'?'Preview: 700 USD income, save 200; 500 remains for spending. Cancel leaves records unchanged.':'This is a preview only. Review currency and date; Cancel leaves your records unchanged.',step.id==='income'?'مثال: دخل 700 دولار، وفّر 200، وبيضل 500 للصرف. إلغاء ما بيغيّر السجلات.':'هيدا عرض تجريبي بس. راجع العملة والتاريخ؛ إلغاء ما بيغيّر سجلاتك.');await pause(4500);
    await form.getByRole('button',{name:'Cancel',exact:true}).click();
   }
   await coach.getByRole('button',{name:index===steps.length-1?'Finish tour':'Next step',exact:true}).click();
  }
  await caption('Use G Guide whenever you need help. No example records were saved in this walkthrough.','استعمل G Guide وقت تحتاج شرح. ما انحفظت أي عملية تجريبية بهالجولة.');await pause(3000);
  assert.equal(await page.evaluate(()=>localStorage.getItem('daywell-demo')),before);
 });
}finally{await browser.close();server.closeAllConnections();server.close();}
