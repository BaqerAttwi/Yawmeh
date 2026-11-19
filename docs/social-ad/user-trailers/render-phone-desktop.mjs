import fs from "node:fs/promises";
import path from "node:path";
import {pathToFileURL} from "node:url";
import {spawnSync} from "node:child_process";
process.env.PLAYWRIGHT_BROWSERS_PATH=path.resolve(".media-tools/browsers");
const {chromium}=await import("file:///C:/Users/BaQer.-.AtTwi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs");
const folder=path.resolve("docs/social-ad/user-trailers");
const dest=path.join(folder,"phone-and-desktop");
await fs.mkdir(dest,{recursive:true});
const base=pathToFileURL(path.join(folder,"capture-build/docs/social-ad/user-trailers/capture.html")).href;
const plans=[
 {file:"01-plan-your-day",hook:"A clearer day starts here.",scenes:[["Today","Your day at a glance.","today"],["Tasks","See priorities and due dates.","tasks"],["Calendar","Keep your plans in view.","calendar"],["Weekly review","Look back at your progress.","review"],["Smart Assistant","Ask about your plans and records.","companion"]]},
 {file:"02-your-money",hook:"Give your money a plan.",scenes:[["Your money","Review income and expenses.","money"],["Savings","See your saved money.","savings"],["Budgets","Compare spending with your plan.","budgets"],["Subscriptions","See which renewals are next.","subscriptions"],["Smart Assistant","Get help with your money records.","companion"]]},
 {file:"03-one-workspace",hook:"Your day. In one place.",scenes:[["Today","Start with your daily overview.","today"],["Tasks","Organize the work ahead.","tasks"],["Money","Keep your finances in view.","money"],["Calendar","See your week ahead.","calendar"],["Smart Assistant","A helper for your everyday plans.","companion"]]}
];
const browser=await chromium.launch({channel:"chrome",headless:true,args:["--allow-file-access-from-files"]});
const embed=async file=>"data:image/png;base64,"+(await fs.readFile(file)).toString("base64");
const logo=await embed("client/public/branding/yawmeh-logo.png");
const iconcss=await fs.readFile("client/src/features/assistant/assistant-icon.css","utf8");
async function setup(width,height){
 const page=await browser.newPage({viewport:{width,height}});
 await page.route("https://**",route=>route.abort());
 await page.route("**/api/**",route=>route.fulfill({status:200,contentType:"application/json",body:"{}"}));
 await page.route("**/branding/**",async route=>route.fulfill({path:path.resolve("client/public/branding",route.request().url().split("/").pop())}));
 await page.goto(base,{waitUntil:"domcontentloaded"});
 await page.locator(".sidebar").waitFor({state:"attached"});
 await page.waitForTimeout(200);
 await page.keyboard.press("Escape");
 await page.addStyleTag({content:'.start-here-banner{display:none!important} html,body,button,input,select,textarea,h1,h2,h3{font-family:"Segoe UI",sans-serif!important}'});
 if(await page.getByRole("button",{name:"Users & access",exact:true}).count())throw Error("Admin screen");
 return page;
}
async function nav(page,kind){
 if(await page.locator(".companion-chat-panel").count())await page.locator(".companion-panel-header").getByRole("button",{name:"Close companion chat"}).click();
 const mobile=page.viewportSize().width<700;
 if(mobile && await page.locator(".sidebar-toggle").getAttribute("aria-expanded")==="false")await page.locator(".sidebar-toggle").click();
 const side=page.locator(".sidebar nav");
 if(["today","calendar","review"].includes(kind)){
  await side.getByRole("button",{name:"Overview",exact:true}).click();
  await page.locator(".overview-tabs").getByRole("button",{name:{today:"Today",calendar:"Calendar",review:"Weekly review"}[kind],exact:true}).click();
 }else if(kind==="tasks")await side.getByRole("button",{name:"Tasks",exact:true}).click();
 else if(kind==="companion"){
  await page.locator(".companion-launcher").click();
 }else{
  await side.getByRole("button",{name:"Money",exact:true}).click();
  await page.locator(".filterbar .segmented").getByRole("button",{name:kind==="money"?"Transactions":kind[0].toUpperCase()+kind.slice(1),exact:true}).click();
 }
 await page.evaluate(()=>{
  window.scrollTo(0,0);
  const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  let node;while(node=walker.nextNode())if(node.textContent.includes("Sage"))node.textContent=node.textContent.replaceAll("Sage","Assistant");
 });
 await page.waitForTimeout(250);
}
const durations=[2,4.4,4.4,4.4,4.4,4.4,3,3];
try{
 const desktop=await setup(1000,1000);
 const phone=await setup(390,844);
 const stage=await browser.newPage({viewport:{width:1080,height:1920}});
 for(const plan of plans){
  const files=[];
  for(let i=0;i<8;i++){
   let body,title,sub;
   if(i===0){
    body='<div class="intro"><div class="avatar">'+ '<img src="'+logo+'"></div><h1>'+plan.hook+'</h1><p>On your phone. At your desk.</p></div>';
   }else if(i<6){
    const scene=plan.scenes[i-1];title=scene[0];sub=scene[1];
    await nav(desktop,scene[2]);await nav(phone,scene[2]);
    const shots=[];
    for(const [label,page] of [["desktop",desktop],["phone",phone]]){
     const file=path.join(dest,plan.file+"-"+i+"-"+label+".png");
     await page.screenshot({path:file});shots.push(await embed(file));
    }
    body='<h1 class="title">'+title+'</h1><p class="subtitle">'+sub+'</p><div class="desktop"><img src="'+shots[0]+'"></div><div class="phone"><div class="camera"></div><img src="'+shots[1]+'"></div>';
   }else if(i===6){
    body='<div class="assistant"><div class="avatar"><img src="'+logo+'"></div><h1>Your assistant.</h1><p>Review your day.<br>Check your records.<br>Prepare a draft to review.</p></div>';
   }else{
    body='<div class="intro end"><div class="avatar"><img src="'+logo+'"></div><h1>yawmeh.me</h1><p class="cta">Explore your workspace ↗</p></div>';
   }
   await stage.setContent(`<!doctype html><html lang="en"><meta charset="utf-8"><style>
   *{box-sizing:border-box}body{margin:0;width:1080px;height:1920px;background:radial-gradient(ellipse at 80% 15%,#3a6450,#19382b 48%,#0c251c);color:#f7f8fa;font-family:"Segoe UI",sans-serif}
   .frame{position:absolute;inset:210px 42px 430px;border-radius:52px;padding:3px;background:linear-gradient(145deg,#a0c5ae,#385c43 38%,#b8d9c3 65%,#385c43);box-shadow:0 40px 100px #061a1490}
   .inside{position:relative;height:100%;border-radius:49px;overflow:hidden;background:radial-gradient(ellipse at 10% 70%,#305a42,#19382b 70%)}
   header{position:absolute;top:67px;left:47px;right:47px;padding-bottom:28px;border-bottom:1px solid #91b49a66;display:flex;justify-content:space-between;align-items:center}
   header b{letter-spacing:5px;font-size:30px}header span{font-size:28px;color:#c1e3ce}
   h1,p{margin:0}.title{position:absolute;top:195px;left:44px;font-size:78px;font-weight:750;letter-spacing:-3px}.subtitle{position:absolute;top:300px;left:46px;font-size:33px;color:#c1e3ce}
   .desktop{position:absolute;left:24px;top:444px;width:600px;height:600px;border:5px solid #91b49a;border-radius:27px;overflow:hidden;box-shadow:0 25px 55px #0005}
   .desktop img{display:block;width:100%;height:100%}
   .phone{position:absolute;left:647px;top:365px;width:302px;height:653px;border:7px solid #0b1c16;outline:2px solid #a0c5ae;border-radius:38px;overflow:hidden;background:#f7f8fa;box-shadow:0 25px 55px #0007}
   .phone img{display:block;width:100%;height:100%}.camera{position:absolute;top:5px;left:115px;width:55px;height:10px;border-radius:10px;background:#10261e}
   .intro,.assistant{position:absolute;inset:240px 48px 0;text-align:center}
   .avatar{display:grid;place-items:center;width:260px;height:260px;border:12px solid #b99a66;border-radius:50%;background:radial-gradient(circle at 37% 30%,#fffdf6,#e5dcc5);box-shadow:inset 0 0 0 2px #6c5127,0 20px 60px #0004;margin:0 auto 48px}
   .avatar img{width:75%;height:75%;object-fit:contain}
   .intro h1,.assistant h1{font-size:84px;letter-spacing:-4px;line-height:1.05}.intro p,.assistant p{font-size:37px;line-height:1.5;color:#c1e3ce;margin-top:28px}
   .assistant p{text-align:left;display:inline-block}.end h1{font-size:110px}.cta{display:inline-block;background:#a0c5ae;color:#19382b!important;border-radius:50px;padding:18px 28px;font-weight:650}
   </style><div class="frame"><div class="inside"><header><b>TECHBYATTWI</b><span>yawmeh.me</span></header>${body}</div></div></html>`);
   await stage.evaluate(()=>Promise.all([...document.images].map(image=>image.decode())));
   const file=path.join(dest,plan.file+"-scene-"+i+".png");await stage.screenshot({path:file});files.push(file);
  }
  const inputs=files.flatMap((file,i)=>["-loop","1","-framerate","25","-t",String(durations[i]),"-i",file]);
  const graphs=files.map((_,i)=>"["+i+":v]format=yuv420p,setsar=1[v"+i+"]");
  graphs.push(files.map((_,i)=>"[v"+i+"]").join("")+"concat=n=8:v=1:a=0[story]");
  graphs.push("color=c=0xb2dfc4:s=130x4:r=25:d=30[light]","[story][light]overlay=x='130+660*(0.5-0.5*cos(2*PI*t/3.2))':y=210[out]");
  const run=spawnSync(path.resolve(".media-tools/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe"),[
   "-hide_banner","-loglevel","error","-y","-filter_complex_threads","2",...inputs,"-stream_loop","1","-i","docs/social-ad/english/original-music.wav",
   "-filter_complex",graphs.join(";"),"-map","[out]","-map","8:a","-af","afade=t=in:d=0.2,afade=t=out:st=28.5:d=1.5",
   "-c:v","libx264","-preset","fast","-crf","17","-pix_fmt","yuv420p","-c:a","aac","-b:a","160k","-t","30","-movflags","+faststart",path.join(dest,plan.file+"-phone-desktop.mp4")
  ],{stdio:"inherit"});
  if(run.status!==0)throw Error("Export failed");
  console.log("Finished "+plan.file);
 }
}finally{await browser.close()}
