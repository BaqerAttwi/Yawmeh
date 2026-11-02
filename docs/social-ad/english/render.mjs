import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
process.env.PLAYWRIGHT_BROWSERS_PATH=path.resolve('.media-tools/browsers');
const {chromium}=await import('file:///C:/Users/BaQer.-.AtTwi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const dir=path.dirname(fileURLToPath(import.meta.url)),preview=process.argv.includes('--preview');
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:1080,height:1920},deviceScaleFactor:1,...(!preview?{recordVideo:{dir:path.join(dir,'raw'),size:{width:1080,height:1920}}}:{})});
const page=await context.newPage();
try{
 await page.goto(pathToFileURL(path.join(dir,'ad.html')).href);
 await page.evaluate(()=>Promise.all([...document.images].map(img=>img.decode())));
 await page.evaluate(()=>Promise.all(['sage','nova','pip'].map(id=>new Promise((resolve,reject)=>{const img=new Image();img.onload=resolve;img.onerror=reject;img.src=`../../../client/public/characters/${id}-wave.png`;}))));
 if(preview){for(const [i,t] of [1,4.5,8,12,16.5,21,25].entries()){await page.evaluate(t=>window.render(t),t);await page.screenshot({path:path.join(dir,`scene-${i+1}.png`)});}}
 else{await page.evaluate(()=>window.play());await page.waitForTimeout(28200);const video=page.video();await context.close();await video.saveAs(path.join(dir,'social-ad-silent.webm'));console.log('Vertical ad recorded.');}
}finally{await browser.close();}
