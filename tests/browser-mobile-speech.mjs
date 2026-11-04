import assert from 'node:assert/strict';
import {once} from 'node:events';
import {isAbsolute} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createApp} from '../server/src/app.js';
const module=process.env.PLAYWRIGHT_MODULE||'playwright';
const {chromium}=await import(isAbsolute(module)?pathToFileURL(module).href:module);
const server=createApp({db:{},authStore:{},recoveryOptions:null}).listen(0,'127.0.0.1');await once(server,'listening');
const browser=await chromium.launch({headless:true,channel:'msedge'});
try{
 const page=await browser.newPage({viewport:{width:375,height:850}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  window.SpeechRecognition=class {
   constructor(){window.testRecognition=this;}
   start(){}
   stop(){this.onend?.();}
   abort(){}
  };
 });
 await page.goto(`http://127.0.0.1:${server.address().port}`);await page.getByRole('button',{name:'Try admin demo'}).click();
 await page.locator('.companion-launcher').click();
 const panel=page.locator('.companion-chat-panel');await panel.getByRole('button',{name:'English',exact:true}).first().click();
 for(const [snapshots,expected,title] of [
  [['add','add to','add to the','add to the subscription','add to the subscription $20','add to the subscription $20 for Claude'],'add to the subscription $20 for Claude','Claude'],
  [['زيدي','زيدي عالسبسكريبشن','زيدي عالسبسكريبشن كلود','زيدي عالسبسكريبشن كلود ب 20 دولار','زيدي عالسبسكريبشن كلود ب 20 دولار 16 الشهر'],'زيدي عالسبسكريبشن كلود ب 20 دولار 16 الشهر','كلود'],
 ]){
  await panel.getByRole('button',{name:'Speak your message',exact:true}).click();
  await page.evaluate(words=>{const results=words.map(transcript=>Object.assign([{transcript}],{isFinal:true}));window.testRecognition.onresult({results,resultIndex:0});window.testRecognition.stop();},snapshots);
  assert.equal(await page.locator('#companion-question').inputValue(),expected);
  await panel.getByRole('button',{name:'Send message',exact:true}).click();await panel.locator('.companion-draft').getByText(title,{exact:true}).waitFor();
  assert.match(await panel.locator('.companion-draft').innerText(),new RegExp(title));assert.match(await panel.locator('.companion-draft').innerText(),/20/);
 }
 assert.deepEqual(errors,[]);console.log('Mobile cumulative speech produces one subscription draft in English and Arabic.');
}finally{await browser.close();server.closeAllConnections();server.close();}
