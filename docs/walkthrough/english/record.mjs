import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const dir=path.dirname(fileURLToPath(import.meta.url));
process.env.PLAYWRIGHT_BROWSERS_PATH=path.resolve('.media-tools/browsers');
const {chromium}=await import('file:///C:/Users/BaQer.-.AtTwi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const chapters=JSON.parse(await fs.readFile(path.join(dir,'chapters.json'),'utf8'));
const check=process.argv.includes('--check');
function duration(buf){let rate,bytes;for(let i=12;i+8<=buf.length;){const id=buf.toString('ascii',i,i+4),size=buf.readUInt32LE(i+4);if(id==='fmt ')rate=buf.readUInt32LE(i+16);if(id==='data')bytes=size;i+=8+size+(size%2);}return bytes/rate;}
for(const c of chapters)c.duration=duration(await fs.readFile(path.join(dir,c.id+'.wav')));
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1,recordVideo:{dir:path.join(dir,'raw'),size:{width:1440,height:1000}}});
const page=await context.newPage(),video=page.video(),origin=Date.now();
page.setDefaultTimeout(12000);
async function click(name){await page.getByRole('button',{name,exact:true}).first().click();}
async function caption(chapter){await page.evaluate(({title,text})=>{
 let box=document.getElementById('recording-caption');if(!box){box=document.createElement('div');box.id='recording-caption';}
 box.style.cssText='position:fixed;z-index:2147483647;bottom:18px;left:260px;right:24px;background:rgba(17,35,29,.96);color:white;padding:16px 22px;border-radius:14px;box-shadow:0 8px 30px #0003;font:20px/1.5 Arial,sans-serif;pointer-events:none;text-align:left;';
 if(document.querySelector('dialog[open]')){box.style.left='20px';box.style.right='auto';box.style.width='380px';box.style.boxSizing='border-box';}
 else if(document.querySelector('.companion-chat-panel'))box.style.left='680px';
 box.replaceChildren();const label=document.createElement('div');label.textContent='ENGLISH WALKTHROUGH · '+title;label.style.cssText='font-size:13px;font-weight:bold;letter-spacing:1px;color:#c8e1a8;margin-bottom:5px';const body=document.createElement('div');body.textContent=text;box.append(label,body);(document.querySelector('dialog[open]')||document.body).append(box);
 let badge=document.getElementById('recording-badge');if(!badge){badge=document.createElement('div');badge.id='recording-badge';badge.textContent='DEMO DATA · ENGLISH';badge.style.cssText='position:fixed;right:20px;top:12px;z-index:2147483646;padding:7px 12px;border-radius:20px;background:#17392c;color:#fff;font:12px Arial;pointer-events:none';document.body.append(badge);}
 },chapter);}
async function ask(q){await page.getByLabel('Ask your companion',{exact:true}).fill(q);await click('Send message');await page.locator('.companion-thinking').waitFor({state:'hidden'});}
const actions=[
 async()=>{await page.goto('http://127.0.0.1:5173');await page.getByRole('button',{name:'Try admin demo',exact:true}).waitFor();},
 async()=>{await click('Try admin demo');await page.getByRole('button',{name:'Chat with Sage',exact:true}).waitFor();},
 async()=>{await click('Tasks');await page.getByRole('button',{name:'Add a task',exact:true}).waitFor();},
 async()=>{await click('Add a task');await page.getByLabel('What would you like to do?',{exact:true}).fill('Plan tomorrow in 10 minutes');await page.getByLabel('Due date',{exact:true}).fill('2026-10-22');},
 async()=>{await click('Save task');await page.locator('dialog').waitFor({state:'hidden'});await click('Money');},
 async()=>{await click('Chat with Sage');await click('English');await ask('I spent 15 for lunch');await page.getByRole('button',{name:'Review & save',exact:true}).waitFor();},
 async()=>{await click('Review & save');await page.getByRole('button',{name:'Save transaction',exact:true}).waitFor();},
 async()=>{await click('Save transaction');await page.locator('dialog').waitFor({state:'hidden'});await click('Chat with Sage');await ask('What can I ask?');},
 async()=>{await click('Voice settings');await page.getByLabel('Microphone language',{exact:true}).selectOption('en-US');},
 async()=>{await click('Close companion chat');await click('Overview');await click('Dashboard');},
 async()=>{await click('Today');await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));}
];
try{
 for(let i=0;i<chapters.length;i++){
  const c=chapters[i];await actions[i]();await caption(c);c.start=(Date.now()-origin)/1000;
  await page.screenshot({path:path.join(dir,c.id+'.png')});
  console.log(JSON.stringify({chapter:c.id,start:c.start,duration:c.duration}));
  await page.waitForTimeout(check?100:(c.duration+1)*1000);
 }
 await context.close();await video.saveAs(path.join(dir,check?'smoke-check.webm':'screen-recording.webm'));
 await fs.writeFile(path.join(dir,check?'smoke-timeline.json':'timeline.json'),JSON.stringify(chapters,null,2));
 console.log('Recording complete.');
}catch(error){await page.screenshot({path:path.join(dir,'recording-error.png')}).catch(()=>{});throw error;}
finally{await browser.close();}
