// Fake browser speech APIs: no microphone, paid provider, or personal data used.
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {isAbsolute} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createApp} from '../server/src/app.js';
const module=process.env.PLAYWRIGHT_MODULE||'playwright';
const {chromium}=await import(isAbsolute(module)?pathToFileURL(module).href:module);
const server=createApp({db:{},authStore:{},recoveryOptions:null}).listen(0,'127.0.0.1');await once(server,'listening');
const browser=await chromium.launch({headless:true,channel:'msedge'}),errors=[];
try{
 for(const width of [375,1440]){
  const page=await browser.newPage({viewport:{width,height:width===375?740:900}});page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>{
   window.__speech={aborts:0,spoken:[]};
   class Recognition{start(){window.__recognizer=this;}abort(){window.__speech.aborts++;}}
   Object.defineProperty(window,'SpeechRecognition',{value:Recognition,configurable:true});
   Object.defineProperty(window,'SpeechSynthesisUtterance',{value:class{constructor(text){this.text=text;}},configurable:true});
   Object.defineProperty(window,'speechSynthesis',{value:{getVoices:()=>[{voiceURI:'en',name:'English',lang:'en-US',localService:true},{voiceURI:'ar',name:'Arabic',lang:'ar-LB',localService:true}],addEventListener(){},removeEventListener(){},cancel(){},resume(){},speak(line){window.__speech.spoken.push({text:line.text,lang:line.lang});line.onstart?.();line.onend?.();}},configurable:true});
  });
  await page.goto(`http://127.0.0.1:${server.address().port}`);await page.getByRole('button',{name:'Try admin demo'}).click();
  await page.locator('.companion-launcher').click();
  await page.getByRole('group',{name:'Microphone language shortcuts',exact:true}).getByRole('button',{name:'العربية',exact:true}).click();
  await page.getByRole('button',{name:'Speak your message',exact:true}).click();
  assert.equal(await page.evaluate(()=>window.__recognizer.lang),'ar-LB');
  await page.evaluate(()=>{const results=[Object.assign([{transcript:'ذكرني فوتبول بكرا الساعة 9 المسا'}],{isFinal:false})];window.__recognizer.onresult({results});});
  await page.getByRole('button',{name:'إيقاف الميكروفون',exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>window.__speech.aborts),0,'An Arabic interim transcript must not abort recording');
  await page.evaluate(()=>{const results=[Object.assign([{transcript:'ذكرني فوتبول بكرا الساعة 9 المسا'}],{isFinal:true})];window.__recognizer.onresult({results});});
  assert.equal(await page.locator('.companion-reply').count(),0,'Transcription never sends automatically');
  await page.getByRole('button',{name:'إرسال الرسالة',exact:true}).click();await page.locator('.companion-draft').waitFor();
  assert.match(await page.locator('.companion-draft').innerText(),/21:00/);
  await page.getByRole('button',{name:'قراءة الردود بصوت',exact:true}).click();
  const ask=async text=>{await page.locator('#companion-question').fill(text);await page.getByRole('button',{name:'إرسال الرسالة',exact:true}).click();};
  await ask('غير الوقت 10 المسا');await page.waitForFunction(()=>document.querySelector('.companion-draft')?.textContent.includes('22:00'));
  await page.waitForFunction(()=>window.__speech.spoken.length>0);assert.equal(await page.evaluate(()=>window.__speech.spoken.at(-1).lang),'ar-LB');
  await page.locator('#companion-question').fill('change the time to 09:30');await page.getByRole('button',{name:'Send message',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('.companion-draft')?.textContent.includes('09:30'));
  await page.waitForFunction(()=>window.__speech.spoken.at(-1)?.lang==='en-US');
  const group=page.getByRole('group',{name:'Microphone language shortcuts',exact:true});
  await group.getByRole('button',{name:'Follow chat',exact:true}).click();await page.getByRole('button',{name:'Speak your message',exact:true}).click();
  assert.equal(await page.evaluate(()=>window.__recognizer.lang),'en-US');await page.getByRole('button',{name:'Stop microphone',exact:true}).click();
  assert.ok(await page.evaluate(()=>document.querySelector('.companion-chat-panel').getBoundingClientRect().width<=innerWidth));
  await page.close();
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,widths:[375,1440],interimArabicRecording:true,voiceLocales:true,draftCorrections:true,browserErrors:errors}));
}finally{await browser.close();server.closeAllConnections();server.close();}
