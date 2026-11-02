import {chromium} from 'file:///C:/Users/BaQer.-.AtTwi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const dir=path.dirname(fileURLToPath(import.meta.url));
const browser=await chromium.launch({headless:true,channel:'chrome'});
const page=await browser.newPage({viewport:{width:700,height:1000},deviceScaleFactor:1.5});
try{
 await page.goto('http://127.0.0.1:5173');await page.getByRole('button',{name:'Try admin demo',exact:true}).click();
 await page.getByRole('button',{name:'Chat with Sage',exact:true}).waitFor();
 await page.getByRole('button',{name:'Tasks',exact:true}).click();await page.screenshot({path:path.join(dir,'tasks.png')});
 await page.getByRole('button',{name:'Money',exact:true}).click();await page.screenshot({path:path.join(dir,'money.png')});
 await page.getByRole('button',{name:'Chat with Sage',exact:true}).click();
 await page.getByRole('button',{name:'English',exact:true}).click();
 await page.getByLabel('Ask your companion',{exact:true}).fill('What is my next task?');
 await page.getByRole('button',{name:'Send message',exact:true}).click();
 await page.locator('.companion-thinking').waitFor({state:'hidden'});
 await page.locator('.companion-chat-panel').screenshot({path:path.join(dir,'chat.png')});
}finally{await browser.close();}
