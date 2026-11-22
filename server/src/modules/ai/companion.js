import {z} from 'zod';
import {setTimeout as pause} from 'node:timers/promises';
import rateLimit from 'express-rate-limit';
import {companionInputSchema} from '../../../../shared/companion-ai.js';
import {companionReportRequest} from '../../../../shared/companion-report-ai.js';
import {chatReportRange} from '../../../../shared/companion-chat.js';
import {hasAccess} from '../../../../shared/access.js';
import {localCompanion} from '../../../../shared/local-companion.js';
import {presentReply} from '../../../../shared/companion-presentation.js';
import {daysUntil,today} from '../../../../shared/domain.js';
import {addDays} from '../../../../shared/planner.js';
import {snapshot} from '../../database/connection.js';
import {mysqlCompanionUsage} from './companion-usage.js';
import {companionStatusMessage} from '../../../../shared/companion-status.js';
import {workspaceOverview} from '../../../../shared/workspace-reports.js';

const defaultCompanionModel='gemini-3.8-flash';
const reportFallbackModel='gemini-3.5-flash-lite';

export function companionAIReason(env){
 if(env.COMPANION_AI_ENABLED!=='true')return 'disabled';
 if(!env.GEMINI_API_KEY?.trim())return 'missing_key';
 if(!Object.values(companionAILimits(env)).every(value=>value>0))return 'allowance_disabled';
 return null;
}
export function companionAIModel(env){
 const model=env.COMPANION_AI_MODEL?.trim()||defaultCompanionModel;
 if(!/^gemini-[a-z0-9.-]{1,90}$/.test(model))throw new Error('model_unavailable');
 return model;
}

export function companionAILimits(env){
 const count=(value,ceiling)=>{
  const text=String(value??'').trim();
  if(!text)return ceiling;
  return /^\d+$/.test(text)&&Number.isSafeInteger(Number(text))?Math.min(Number(text),ceiling):0;
 };
 return {daily:count(env.COMPANION_AI_DAILY_LIMIT,10),monthly:count(env.COMPANION_AI_MONTHLY_LIMIT,1000)};
}
export const companionAIAvailable=env=>!companionAIReason(env);
// Keep the server deadline below the client's 45-second network deadline.
export function companionAITimeout(env){
 const value=Number(env.COMPANION_AI_TIMEOUT_MS||40000);
 return Number.isFinite(value)?Math.max(5000,Math.min(40000,value)):40000;
}
const limits=companionAILimits;
const adviceSchema=z.object({recommendation:z.string().trim().min(1).max(500)}).strict();
const summarySchema=adviceSchema.extend({summary:z.string().trim().min(1).max(300)});
const detailedSummarySchema=summarySchema.extend({
 steps:z.array(z.object({title:z.string().trim().min(1).max(70),explanation:z.string().trim().min(1).max(280)}).strict()).min(2).max(4),
});
const reportResponseSchema=report=>report.format==='detailed'?detailedSummarySchema:report.area?summarySchema:adviceSchema;

function reportSignals(report,data,user,current,selected){
 const day=report.tomorrow?addDays(current,1):current;
 const range=report.kind==='review'?chatReportRange(report.command,current,selected):{start:current.slice(0,7)+'-01',end:current};
 const signals={};
 if(report.kind!=='saving_advice'&&hasAccess(user,'tasks')){
  const due=(data.tasks||[]).filter(task=>!task.completed&&!task.cancelled&&(report.kind==='review'?task.due>=range.start&&task.due<=range.end:task.due<=day));
  signals.hasTasksDue=due.length>0;
  signals.hasOverdueTasks=due.some(task=>task.due<day);
  signals.hasScheduledTasks=due.some(task=>task.scheduled_time);
  signals.hasTasksWithoutEstimates=due.some(task=>!task.estimate_minutes);
 }
 if(report.kind!=='day_plan'&&hasAccess(user,'money')){
  signals.hasRecentExpenses=(data.entries||[]).some(entry=>entry.type==='expense'&&!entry.voided_on&&entry.date>=range.start&&entry.date<=range.end&&entry.date<=current);
  signals.hasRarelyUsedSubscriptions=(data.subscriptions||[]).some(subscription=>subscription.active&&subscription.rarely_used);
  signals.hasActiveBudget=(data.budgets||[]).some(budget=>budget.start<=range.end&&budget.end>=range.start);
 }
 if(report.area){
  const overview=workspaceOverview(report.area,data,user,{...range,current,currency:data.settings?.home_currency||'USD'});
  signals.hasActivity=overview.hasActivity;
  if(report.area==='money'&&overview.hasActivity&&Number.isFinite(overview.net)){
   signals.incomeComparedWithExpenses=overview.net>0?'higher':overview.net<0?'lower':'equal';
  }
  if(report.area==='tasks')signals.hasCompletions=overview.completed>0;
 }
 return signals;
}

function geminiCompanionRequest(input,report,signals,model,env){
 const style={sage:'calm and concise',nova:'warm and encouraging',pip:'friendly and lightly playful'}[input.avatar];
 const topic={day_plan:'prioritizing tasks and planning a realistic day',saving_advice:'reducing optional spending and saving money',review:'choosing a practical next step after a money or tasks review'}[report.kind];
 const instructions=`Give one or two concrete, optional next steps about ${topic}. Use the supplied flags to choose advice. The app displays the factual report separately. Use the requested language, natural Lebanese Arabic for ar, and a ${style} tone. Give at most 500 characters. Do not invent names, amounts, dates, available time or account facts. Do not claim to schedule, read, or change records. Do not tell the user to make a payment or modify the app. Return only the supplied JSON.`;
 const summaryInstruction=report.area?` Summarize the ${report.area} report in plain language using only the supplied signals. If there is no activity, say so. The summary is at most 300 characters. Put next steps in recommendation.`:'';
 const detailInstruction=report.format==='detailed'
  ?' Give 2 to 4 ordered actions suited to the supplied signals. Give each a short title and one or two sentences explaining where to look and what decision to make. Use recommendation for one practical change to try next and how to check whether it helped. Avoid repeating the facts from the report. The app renders the chart from its own records. Do not supply chart values.'
  :report.area?' Keep the summary and recommendation to one short sentence each.':'';
 const body={systemInstruction:{parts:[{text:instructions+summaryInstruction+detailInstruction}]},contents:[{role:'user',parts:[{text:JSON.stringify({language:input.language,signals})}]}],generationConfig:{maxOutputTokens:8192,responseMimeType:'application/json',responseJsonSchema:z.toJSONSchema(reportResponseSchema(report))}};
 if(report.area&&model===defaultCompanionModel)body.generationConfig.thinkingConfig={thinkingLevel:'LOW'};
 return {url:`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,headers:{'Content-Type':'application/json','x-goog-api-key':env.GEMINI_API_KEY},body};
}

export function mountCompanionAI(app,db,{env=process.env,fetchAI=fetch,usage=mysqlCompanionUsage(db),loadData=user=>snapshot(user,db)}={}){
 const permitted=(req,res,next)=>hasAccess(req.user,'money')||hasAccess(req.user,'tasks')?next():res.status(403).json({error:'Companion access is required.'});
 app.get('/api/companion/ai',permitted,(req,res)=>{try{res.json({available:companionAIAvailable(env),reason:companionAIReason(env),model:companionAIModel(env),limits:limits(env)});}catch{res.json({available:false,reason:'model_unavailable',limits:limits(env)});}});
 const limiter=rateLimit({windowMs:60000,limit:6,keyGenerator:req=>String(req.user.id),standardHeaders:'draft-7',legacyHeaders:false,message:{code:'rate_limited',error:'Please wait a minute. Local responses are still available.'}});
 function requireReport(req,res,next){
  const input=companionInputSchema.parse(req.body);
  if(input.start>input.end||daysUntil(input.end,input.start)>365)return res.status(400).json({error:'Choose an ordered range of at most 366 days.'});
  const report=companionReportRequest(input.question,req.user);
  if(!report)return res.status(400).json({code:'report_only',error:'AI is available for reports and recommendations.'});
  const area=input.reportArea;
  if(area&&!hasAccess(req.user,area))return res.status(403).json({error:'Access to this report is required.'});
  if((area&&report.command!=='report')||(input.reportFormat&&!area))return res.status(400).json({code:'report_only',error:'Use the selected report period for a summary.'});
  const reportUser=area?{...req.user,role:'user',permissions:[area]}:req.user;
  res.locals.companionReport={input,report:{...report,area,format:input.reportFormat},reportUser};
  next();
 }
 app.post('/api/companion/chat',permitted,requireReport,limiter,async(req,res)=>{
  const {input,report,reportUser}=res.locals.companionReport;
  if(!companionAIAvailable(env)){const code=companionAIReason(env);return res.status(503).json({code,error:companionStatusMessage(code,input.language)});}
  const current=today(env.TIMEZONE||'Asia/Beirut');
  const started=Date.now(),timeoutMs=companionAITimeout(env);
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
  const cancel=()=>controller.abort();req.on('aborted',cancel);res.on('close',cancel);
  let phase='request',providerStatus,model;
  try{
   model=companionAIModel(env);
   phase='allowance';
   if(!await usage.reserve(req.user.id,current,limits(env)))return res.status(429).json({code:'allowance_reached',error:companionStatusMessage('allowance_reached',input.language)});
   if(res.destroyed)return;
   if(controller.signal.aborted)throw new Error('timeout');
   phase='records';
   const data=await loadData(reportUser);
   if(res.destroyed)return;
   if(controller.signal.aborted)throw new Error('timeout');
   const selected={start:input.start,end:input.end};
   const reply=report.area?{language:input.language}:presentReply(localCompanion(data,reportUser,report.command,current,selected),input.language);
   const signals=reportSignals(report,data,reportUser,current,selected);
   const send=targetModel=>{
    const request=geminiCompanionRequest(input,report,signals,targetModel,env);
    return fetchAI(request.url,{method:'POST',headers:request.headers,body:JSON.stringify(request.body),signal:controller.signal,redirect:'error'});
   };
   phase='provider';
   let response=await send(model);
   const alternate=report.area&&model===defaultCompanionModel?reportFallbackModel:null;
   if((alternate||report.format==='detailed')&&response.status===503&&!response.headers.has('retry-after')&&Date.now()-started+1000<timeoutMs){
    // Use one recovery attempt within the original deadline and allowance.
    providerStatus=response.status;
    void response.body?.cancel().catch(()=>{});
    if(!alternate)await pause(750,undefined,{signal:controller.signal});
    model=alternate||model;
    response=await send(model);
   }
   providerStatus=response.status;
   if(!response.ok)throw new Error(response.status===429?'provider_quota':[401,403].includes(response.status)?'provider_auth':response.status===404?'model_unavailable':response.status===400?'provider_request':response.status>=500?'provider_busy':'unavailable');
   phase='response';
   const chunks=[];let bytes=0;
   for await(const chunk of response.body){bytes+=chunk.length;if(bytes>32768){controller.abort();throw new Error('size');}chunks.push(Buffer.from(chunk));}
   const result=JSON.parse(Buffer.concat(chunks).toString('utf8')),candidate=result.candidates?.[0];
   if(candidate?.finishReason!=='STOP')throw new Error('incomplete');
   const advice=reportResponseSchema(report).parse(JSON.parse(candidate.content.parts.filter(p=>p.text&&!p.thought).map(p=>p.text).join('')));
   if(controller.signal.aborted)throw new Error('timeout');
   if(!res.destroyed)res.json({...reply,...advice,engine:'gemini'});
  }catch(error){const code=controller.signal.aborted?(error.message==='size'?'invalid_response':'timeout'):phase==='allowance'?'usage_unavailable':phase==='records'?'records_unavailable':['provider_quota','provider_auth','model_unavailable','provider_request','provider_busy','unavailable'].includes(error.message)?error.message:error instanceof SyntaxError||error instanceof z.ZodError||['incomplete','size'].includes(error.message)?'invalid_response':'unavailable';console.warn('[companion-ai]',JSON.stringify({code,phase,providerStatus,model,elapsedMs:Date.now()-started,timeoutMs}));if(!res.destroyed)res.status(503).json({code,error:companionStatusMessage(code,input.language)});}
  finally{clearTimeout(timer);req.off('aborted',cancel);res.off('close',cancel);}
 });
}
