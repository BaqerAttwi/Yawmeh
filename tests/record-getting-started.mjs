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
   panel.style.cssText='position:fixed;inset:0 0 auto 0;margin:0;width:100%;box-sizing:border-box;border:0;background:rgba(17,40,31,.97);color:white;padding:16px 36px;text-align:center;font-family:Arial,sans-serif;pointer-events:none;';
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
 await record('getting-started',async({page,caption,focus,pause})=>{
  await caption('New here? Choose Start here. Sage will guide you at your pace.','جديد هون؟ اختار Start here. سايج بيرشدك خطوة خطوة وعلى مهلك.');
  await focus(page.getByRole('button',{name:'Start here',exact:true}).first());await pause(3500);
  await page.getByRole('button',{name:'Start here',exact:true}).first().click();
  const menu=page.getByRole('dialog',{name:'Start here',exact:true});
  await caption('Recommended: follow the avatar. Or watch the videos before trying.','مننصحك تتبع المساعد. أو فيك تشوف الفيديوهات قبل ما تجرّب.');await pause(4000);
  await menu.getByRole('button',{name:/Guide me step by step/}).click();
  const coach=page.getByRole('region',{name:'Guided tour',exact:true});
  await caption('First, click Settings. Check your name, reminder email, and currencies.','أول شي اضغط Settings. راجع اسمك وإيميل التذكير والعملات.');await pause(2000);
  await page.locator('[data-tour="nav-settings"]').click();await pause(4500);
  await coach.getByRole('button',{name:'Next step',exact:true}).click();
  await caption('Next, click Tasks. Start with one small task and a clear due date.','بعدين اضغط Tasks. بلّش بمهمة صغيرة وحدّد موعدها.');await pause(2000);
  await page.locator('[data-tour="nav-tasks"]').click();await pause(4500);
  await coach.getByRole('button',{name:'Next step',exact:true}).click();
  await caption('In Money, record income first, then expenses. Check the currency each time.','بـMoney، سجّل الدخل وبعدين المصاريف. تأكّد من العملة بكل مرة.');await pause(2000);
  await page.locator('[data-tour="nav-money"]').click();await pause(4500);
  await coach.getByRole('button',{name:'Next step',exact:true}).click();
  await caption('Return to Overview. Today is your daily starting point.','ارجع لـOverview. صفحة Today هي نقطة البداية كل يوم.');await pause(2000);
  await page.locator('[data-tour="nav-overview"]').click();await pause(4000);
  await caption('Finish when ready. Reopen Start here any time for the tour or videos.','لما تكون جاهز، خلّص الجولة. فيك ترجع لـStart here بأي وقت.');
  await coach.getByRole('button',{name:'Finish tour',exact:true}).click();await pause(3500);
 });
}finally{await browser.close();server.closeAllConnections();server.close();}
