import fs from "node:fs/promises";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {build} from "vite";
import {pathToFileURL} from "node:url";


process.env.PLAYWRIGHT_BROWSERS_PATH=path.resolve(".media-tools/browsers");
const {chromium}=await import("file:///C:/Users/BaQer.-.AtTwi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs");
const output=path.resolve("docs/social-ad/user-trailers");
const htmlFile=path.join(output,"capture.html");
await fs.writeFile(htmlFile,`<!doctype html><html><div id="root"></div><script type="module">
import React from "react";
import {createRoot} from "react-dom/client";
import App from "/client/src/app/App.jsx";
import {demoData} from "/client/src/features/demo/data.js";
const data=demoData();
data.settings={...data.settings,name:"Alex",home_currency:"USD",current_rate:90000};
const user={id:882,name:"Alex",email:"alex@example.com",role:"user",active:true,permissions:["money","tasks","assistant"]};
window.recordingUser=user;
createRoot(document.getElementById("root")).render(React.createElement(App,{session:{mode:"live",user,data,onLogout:()=>{},onExpired:()=>{}}}));
</script></html>`);
await build({configFile:false,base:"./",build:{outDir:path.join(output,"capture-build"),emptyOutDir:true,rollupOptions:{input:htmlFile}}});
await fs.cp("client/public/branding",path.join(output,"capture-build/branding"),{recursive:true});
const base=pathToFileURL(path.join(output,"capture-build/docs/social-ad/user-trailers/capture.html")).href;
const browser=await chromium.launch({channel:"chrome",headless:true,args:["--allow-file-access-from-files"]});
const plans=[
 {file:"01-plan-your-day",hook:"A clearer day starts here.",sub:"Your tasks, priorities and schedule.",scenes:[
 ["Today","See your day at a glance.","today"],["Tasks","Make room for what matters.","tasks"],
 ["Calendar","See what’s coming next.","calendar"],["Weekly review","Look back at your progress.","review"],
 ["Smart Assistant","Get help with your next small step.","companion"]]},
 {file:"02-your-money",hook:"Give your money a plan.",sub:"Track spending, savings and renewals.",scenes:[
 ["Your money","See your spending records.","money"],["Savings","Keep savings in view.","savings"],
 ["Budgets","Compare spending with your plan.","budgets"],["Subscriptions","Know which renewals are next.","subscriptions"],
 ["Your dashboard","Bring the numbers together.","dashboard"]]},
 {file:"03-one-workspace",hook:"Your day. In one place.",sub:"Explore the full user workspace.",scenes:[
 ["Today","A place to start each morning.","today"],["Tasks","See priorities and due dates.","tasks"],
 ["Money","Review income and expenses.","money"],["Calendar","Connect your plans across the week.","calendar"],
 ["Smart Assistant","Prepare your next step with a helper.","companion"]]}
];
async function navigate(page,kind){
 if(["today","calendar","review","dashboard"].includes(kind)){
  await page.locator(".sidebar nav").getByRole("button",{name:"Overview",exact:true}).click();
  const tab={today:"Today",calendar:"Calendar",review:"Weekly review",dashboard:"Dashboard"}[kind];
  await page.locator(".overview-tabs").getByRole("button",{name:tab,exact:true}).click();
 }else if(kind==="tasks"){
  await page.locator(".sidebar nav").getByRole("button",{name:"Tasks",exact:true}).click();
 }else if(kind==="companion"){
  await page.locator(".companion-launcher").click();
 }else{
  await page.locator(".sidebar nav").getByRole("button",{name:"Money",exact:true}).click();
  await page.locator(".filterbar .segmented").getByRole("button",{name:kind==="money"?"Transactions":kind[0].toUpperCase()+kind.slice(1),exact:true}).click();
 }
 await page.evaluate(()=>window.scrollTo(0,0));
}
try{
 for(const plan of plans){
  const context=await browser.newContext({viewport:{width:1000,height:1000},recordVideo:{dir:path.join(output,"raw"),size:{width:1000,height:1000}}});
  const recordedAt=Date.now();
  const page=await context.newPage();
  await page.route("**/api/**",route=>route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({})}));
  await page.route("**/branding/**",async route=>{const name=route.request().url().split("/").pop(); await route.fulfill({path:path.resolve("client/public/branding",name)});});
  page.on("pageerror",e=>console.log("PAGE "+e.message));
  await page.route("https://**",route=>route.abort());
  await page.goto(base,{waitUntil:"domcontentloaded"});
  console.log("Loaded "+plan.file);
  await page.locator(".sidebar").waitFor();
  if(await page.locator(".sidebar").getByRole("button",{name:"Users & access",exact:true}).count())throw Error("Admin navigation is present");
  if((await page.evaluate(()=>window.recordingUser.role))!=="user")throw Error("Expected user role");
  await page.addStyleTag({content:'.start-here-banner{display:none!important}'});
  await page.waitForTimeout(300);
  const first=(await page.video().path());
  await page.keyboard.press("Escape"); await page.waitForTimeout(150);
  const start=Date.now(); plan.offset=(start-recordedAt)/1000;
  for(const [i,scene] of plan.scenes.entries()){
   await navigate(page,scene[2]);
   if(i===0)await page.screenshot({path:path.join(output,plan.file+"-user-screen.png")});
   await page.waitForTimeout(1700);
   if(scene[2]!=="companion"){
    await page.evaluate(()=>window.scrollTo({top:Math.min(480,document.documentElement.scrollHeight-innerHeight),behavior:"smooth"}));
   }
   await page.waitForTimeout(Math.max(0,start+(i+1)*5000-Date.now()));
  }
  await context.close();
  plan.raw=first;
  console.log("Recorded "+plan.file);
 }
}finally{await browser.close()}
const font="C\\:/Windows/Fonts/segoeuib.ttf";
const ff=path.resolve(".media-tools/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe");
for(const plan of plans){
 const titles=plan.scenes.map((scene,i)=>"drawtext=fontfile='"+font+"':text='"+scene[0]+"':fontsize=65:fontcolor=0xf7f8fa:x=132:y=416:enable='gte(t,"+(2+i*5)+")*lt(t,"+(7+i*5)+")'").join(",");
 const subtitles=plan.scenes.map((scene,i)=>"drawtext=fontfile='"+font+"':text='"+scene[1].replaceAll("'","")+"':fontsize=29:fontcolor=0xc1e3ce:x=132:y=505:enable='gte(t,"+(2+i*5)+")*lt(t,"+(7+i*5)+")'").join(",");
 const graph=`
 [0:v]trim=start=${plan.offset}:duration=25,setpts=PTS-STARTPTS+2/TB,scale=700:700,setsar=1[app];
 color=c=0xf7f8fa:s=1080x1920:r=25:d=30,
 drawbox=x=75:y=245:w=930:h=1120:color=0x19382b:t=fill,
 drawbox=x=75:y=245:w=930:h=1120:color=0x68967a:t=3,
 drawtext=fontfile='${font}':text=TECHBYATTWI:fontsize=30:fontcolor=0xf7f8fa:x=132:y=307,
 drawtext=fontfile='${font}':text=yawmeh.me:fontsize=28:fontcolor=0xc1e3ce:x=785:y=310,
 drawbox=x=132:y=371:w=816:h=2:color=0x68967a:t=fill,
 drawtext=fontfile='${font}':text='${plan.hook}':fontsize=57:fontcolor=0xf7f8fa:x=132:y=500:enable='lt(t,2)',
 drawtext=fontfile='${font}':text='${plan.sub}':fontsize=31:fontcolor=0xc1e3ce:x=132:y=596:enable='lt(t,2)',
 ${titles},${subtitles}[bg];
 [bg][app]overlay=x=190:y=575:enable='gte(t,2)*lt(t,27)'[withapp];
 [withapp]
 drawtext=fontfile='${font}':text=yawmeh.me:fontsize=89:fontcolor=0xf7f8fa:x=(w-tw)/2:y=980:enable='gte(t,27)',
 drawtext=fontfile='${font}':text='Explore your workspace':fontsize=34:fontcolor=0xc1e3ce:x=(w-tw)/2:y=1100:enable='gte(t,27)'[endbg];
 [1:v]scale=255:255:force_original_aspect_ratio=decrease[logo];
 [endbg][logo]overlay=x=(W-w)/2:y=690:enable='gte(t,27)'[story];
 color=c=0xb2dfc4:s=154x5:r=25:d=30[glow];
 [story][glow]overlay=x='169+584*(0.5-0.5*cos(2*PI*t/3.2))':y=245[out]
 `;
 const filter=path.join(output,plan.file+"-filter.txt");
 await fs.writeFile(filter,graph);
 const run=spawnSync(ff,["-hide_banner","-loglevel","error","-y","-filter_complex_threads","2","-i",plan.raw,"-i","client/public/branding/yawmeh-logo.png","-stream_loop","1","-i","docs/social-ad/english/original-music.wav","-filter_complex_script",filter,"-map","[out]","-map","2:a","-af","afade=t=in:d=0.2,afade=t=out:st=28.5:d=1.5","-c:v","libx264","-preset","fast","-crf","17","-pix_fmt","yuv420p","-c:a","aac","-b:a","160k","-t","30","-movflags","+faststart",path.join(output,plan.file+".mp4")],{stdio:"inherit"});
 if(run.status!==0)throw Error("Export failed "+plan.file);
 console.log("Exported "+plan.file);
}
