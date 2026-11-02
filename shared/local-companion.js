import {entryCents,nativeEntries,formatMoney,currencyCatalog} from './currency.js';
import {balances,cents,daysUntil} from './domain.js';
import {addDays,goalBalance} from './planner.js';
import {hasAccess} from './access.js';
import {companionIntent} from './companion-actions.js';
import {chatReport} from './companion-chat.js';
import {daySchema} from './daily.js';
import {normalizeLebanese} from './lebanese-companion.js';
import {everydayCompanion} from './companion-everyday.js';
const usd=n=>'≈ '+new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n/100)+' (USD estimate)';

// Deterministic local conversation. No network, generated numbers or automatic writes.
export function localCompanion(data,user,question,current,selected,context=null){
 const translated=normalizeLebanese(question);
 if(translated.answer)return {answer:translated.answer,context};
 if(translated.arabic&&!context?.field&&!/^(?:ضيف|اضف|سجل|ذكرني|صرفت|دفعت|قبضت)\s/.test(question.trim())){const everyday=everydayCompanion(data,user,question,current,true);if(everyday)return everyday;}
 if(translated.arabic&&!translated.question&&!context?.field)return {answer:'ما فهمت الطلب منيح. جرب «شو عندي اليوم؟»، «قديش صرفت هالشهر؟» او «صرفت 15 دولار على الغدا». بفهم طلبات محددة، وما انحفظ شي.',context};
 let result=localCompanionCore(data,user,translated.question||question,current,selected,context);
 if(translated.needsCurrency&&(result.action||result.context?.draft)){
  const draft=structuredClone(result.action||result.context.draft);delete draft.initial.currency;result=finishDraft(draft);
 }
 if(translated.arabic&&result.action){const d=result.action.initial;result.answer=`حضرتلك مسودة: ${d.title}${d.amount?' · '+d.amount+' '+(d.currency||'USD'):''} · ${d.due||d.date||''}${d.scheduled_time?' · '+d.scheduled_time:''}. راجع التفاصيل واضغط حفظ. بعد ما انحفظ شي.`;}
 else if(translated.arabic&&result.context?.field)result.answer=result.context.field==='currency'?'بأي عملة؟ اكتب USD، LBP، او اسم العملة اللي ضفتها بالاعدادات.':result.context.field==='title'?'على شو؟ اكتب اسم المصروف او الدخل. فيك تقول «الغي» لنوقف.':'قديش المبلغ؟ اكتبه بالارقام، مثلا 15.50. فيك تقول «الغي» لنوقف.';
 else if(translated.arabic&&translated.question==='cancel')result.answer='لغيت المسودة. ما انحفظ شي.';
 return result;
}
function localCompanionCore(data,user,question,current,selected,context=null){
 let q=question.trim();
 // Spoken requests often include a name, a greeting, or a polite question.
 q=q.replace(/^(?:(?:oh\s+)?thanks[,.!]\s*|(?:sage|osage|nova|pip)[,.]\s*)+/i,'');
 if(/\b(?:can|could) you hear me\b|\bare you listening\b/i.test(q))return {answer:'Your message reached me as text. If you used Speak, your words were transcribed. Tell me what you would like to add or ask.',context};
 q=q.replace(/^(?:so\s+)?(?:can|could|would) you\s+(?:please\s+)?(?:help me\s+(?:(?:with|in)\s+)?)?(?=(?:add(?:ing)?|create|record|log|schedule|plan)\b)/i,'');
 q=q.replace(/^adding\b/i,'add').replace(/^(add\s+)(?:more\s+)?expenses\b/i,'$1expense').replace(/\?\s*$/,'');
 if(/^(?:no[, ]+)?(?:what i meant is|i meant)\s+adding[.! ]*$/i.test(q)&&context?.topic==='money')q='add expense';
 const lower=q.toLowerCase();
 if(/^(cancel|never mind|nevermind)$/i.test(q))return {answer:'Draft cancelled. Nothing was saved.'};
 // Explicit requests must not become a pending draft's title or amount.
 if(context?.field&&/^(?:please\s+)?(?:add|create|record|log|schedule|remind me|i spent|i paid|i earned|i received|budget status|plan my day|compare spending|review subscriptions|what|how|can i)\b/i.test(q))context=null;
 const correction=q.match(/^(?:change|make|set)\s+(?:that|it|the amount|the date)\s+to\s+(.+)$/i);
 if(correction&&context?.draft){
  const draft=structuredClone(context.draft),value=correction[1].trim();
  if(!hasAccess(user,draft.type==='task'?'tasks':'money'))return {answer:'Your access changed. This draft is no longer available.'};
  const date={today:current,tomorrow:addDays(current,1),yesterday:addDays(current,-1)}[value.toLowerCase()]||value;
  if(daySchema.safeParse(date).success){draft.initial[draft.type==='task'?'due':draft.type==='subscription'?'renewal':draft.type==='budget'?'start':'date']=date;}
  else if(draft.type!=='task'&&/^\$?\d+(\.\d{1,2})?$/.test(value)&&Number(value.replace('$',''))>0)draft.initial.amount=Number(value.replace('$',''));
  else return {answer:'I can change this draft to today, tomorrow, a YYYY-MM-DD date, or a positive money amount. Nothing was saved.',context};
  return finishDraft(draft);
 }
 if(correction)return {answer:'Prepare a draft first, then tell me what to change. Existing saved records must be edited in their app.'};
 if(context?.draft&&context.field){
  const draft=structuredClone(context.draft);
  if(!hasAccess(user,draft.type==='task'?'tasks':'money'))return {answer:'Your access changed. This draft is no longer available.'};
  if(context.field==='currency'){
   const alias={دولار:'USD',dollar:'USD',dolar:'USD','$':'USD',ليرة:'LBP',ليره:'LBP',lira:'LBP'}[q.toLowerCase()]||q;
   const matches=currencyCatalog(data.settings).filter(c=>[c.code,c.name,c.symbol].some(v=>v&&v.toLowerCase()===alias.toLowerCase()));
   if(matches.length!==1)return {answer:'Choose one configured currency: '+currencyCatalog(data.settings).map(c=>c.code).join(', ')+'. Nothing was saved.',context};
   draft.initial.currency=matches[0].code;return finishDraft(draft);
  }
  if(context.field==='title')draft.initial.title=q.slice(0,160);
  else {if(!/^\$?\d+(\.\d{1,2})?$/.test(q)||Number(q.replace('$',''))<=0)return {answer:'Enter a positive amount, such as 15.50, or say cancel.',context};draft.initial.amount=Number(q.replace('$',''));}
  return finishDraft(draft);
 }
 const normalized=q.replace(/^i (?:spent|paid)\s+/i,'add expense ').replace(/^remind me to\s+/i,'add task ').replace(/^i (?:earned|received)\s+/i,'add income ');
 const everyday=everydayCompanion(data,user,normalized,current);
 const intent=/^(?:help|what (?:else )?can (?:i ask|you do)|show (?:me )?examples)[?!. ]*$/i.test(normalized)?everyday:companionIntent(normalized,user,current);
 if(intent){if(intent.action&&['expense','income','opening','withdrawal'].includes(intent.action.type))intent.action.initial.currency??=data.settings?.last_currency||'USD';return intent.action?finishDraft(intent.action):intent;}
 if(everyday)return everyday;
 const money=hasAccess(user,'money'),tasks=hasAccess(user,'tasks');
 const entries=money?(data.entries||[]).filter(e=>!e.voided_on&&e.date<=current):[];
 const b=balances(entries);
 if(/budget (?:status|warning|alert)|am i on track|how much.*left.*budget/.test(lower)){
  if(!money)return {answer:'Your account does not have Money access.'};
  const active=(data.budgets||[]).filter(x=>x.start<=current&&x.end>=current);
  return {answer:active.map(x=>{const spent=entries.filter(e=>e.type==='expense'&&e.date>=x.start).reduce((s,e)=>s+entryCents(e),0),limit=cents(x.amount),left=limit-spent,days=daysUntil(x.end,current)+1;return `${x.title}: ${usd(spent)} of ${usd(limit)} used${limit>0?' ('+Math.round(spent/limit*100)+'%)':''}. ${left<0?'Over budget by '+usd(-left):usd(left)+' remaining'}. ${spent>=limit?'Limit reached.':spent>=limit*.8?'Warning: at least 80% used.':'Below the 80% warning level.'} Through ${x.end}: ${usd(Math.max(0,Math.floor(left/days)))}/day if spread across the remaining ${days} days, including today. This is a budget allowance, not a cash balance.`;}).join('\n\n')||'No active budgets recorded. Add a spending limit in Money → Budgets.'};
 }
 if(/compar|versus|vs\b/.test(lower)&&/spend|expens|categor|month/.test(lower)){
  if(!money)return {answer:'Your account does not have Money access.'};
  const start=current.slice(0,7)+'-01',anchor=new Date(start+'T12:00:00Z');anchor.setUTCMonth(anchor.getUTCMonth()-1);
  const previousStart=anchor.toISOString().slice(0,10),last=addDays(start,-1),previousEnd=previousStart.slice(0,8)+String(Math.min(Number(current.slice(-2)),Number(last.slice(-2)))).padStart(2,'0');
  const groups=new Map();for(const e of entries.filter(e=>e.type==='expense')){const period=e.date>=start?0:e.date>=previousStart&&e.date<=previousEnd?1:null;if(period===null)continue;const row=groups.get(e.category||'Other')||[0,0];row[period]+=entryCents(e);groups.set(e.category||'Other',row);}
  return {answer:`Spending comparison: ${start}–${current} versus ${previousStart}–${previousEnd} (matching elapsed calendar days where possible).\n\n`+([...groups].sort((a,b)=>b[1][0]-a[1][0]).map(([name,[now,before]])=>`${name}: ${usd(now)} versus ${usd(before)} — ${now===before?'unchanged':usd(Math.abs(now-before))+(now>before?' more':' less')}${before>0?' ('+Math.round((now-before)/before*100)+'%)':''}.`).join('\n\n')||'No expenses recorded in either period.')+'\n\nOnly recorded, non-reversed expenses are included; missing records can affect the comparison.'};
 }
 if(/quick win|(?:have|got) \d+ minutes/.test(lower)){
  if(!tasks)return {answer:'Your account does not have Tasks access.'};
  const available=Number(lower.match(/(\d+) minutes/)?.[1]||15);
  const list=(data.tasks||[]).filter(t=>!t.completed&&t.due<=current&&t.estimate_minutes>0&&t.estimate_minutes<=available).sort((a,b)=>a.estimate_minutes-b.estimate_minutes);
  return {answer:list.length?`Tasks due by today that individually fit ${available} minutes:\n\n${list.slice(0,3).map(t=>`• ${t.title} — ${t.estimate_minutes} minutes${t.due<current?' · overdue':''}`).join('\n')}\n\nChoose one. Estimates are approximate; scheduled commitments may affect when you can start.`:'No unfinished tasks due by today have an estimate that fits. Add time estimates in Tasks, or break a larger task into a small subtask.'};
 }
 if(/afford|can i (?:buy|spend)/i.test(q)){
  if(!money)return {answer:'Your account does not have Money access.'};
  const amount=q.match(/\$?\b(\d+(?:\.\d{1,2})?)\b/);
  if(!amount)return {answer:'How much would it cost? Ask “Can I afford $100?”'};
  const currency=/\bLBP\b/i.test(q)?'LBP':'USD',native=balances(nativeEntries(entries,currency),currency);
  const cost=cents(amount[1]);
  if(currency==='LBP')return {answer:`Your native LBP spending balance is ${(native.available/100).toLocaleString()} LBP. This purchase costs ${Number(amount[1]).toLocaleString()} LBP. ${cost>native.available?'Your LBP balance does not cover it.':'Your LBP balance covers it.'} USD balances are separate; no currency exchange is performed.`};
  const budgets=(data.budgets||[]).filter(x=>x.start<=current&&x.end>=current);
  const lines=[`You have ${usd(native.available)} available to spend in USD. A ${usd(cost)} purchase would leave ${usd(native.available-cost)}.`,cost>native.available?'This exceeds your recorded spending balance.':'Your recorded balance covers this purchase.'];
  for(const budget of budgets){const spent=entries.filter(e=>e.type==='expense'&&e.date>=budget.start&&e.date<=budget.end).reduce((s,e)=>s+entryCents(e),0);const remaining=cents(budget.amount)-spent;lines.push(`${budget.title}: ${usd(remaining)} remains through ${budget.end}. ${cost>remaining?'This purchase would exceed that budget by '+usd(cost-remaining)+'.':'After this purchase: '+usd(remaining-cost)+' remains.'}`);}
  if(!budgets.length)lines.push('No active spending budget is recorded. Add one to check this against your plan.');
  lines.push('Recorded balances only; unpaid bills and future income are not deducted or predicted. Savings are not treated as spending money.');return {answer:lines.join('\n\n')};
 }
 if(/plan (?:my |a |the )?(?:day|tomorrow)|what should i do|overdue|prioriti|overwhelmed|too much to do/.test(lower)){
  if(!tasks)return {answer:'Your account does not have Tasks access.'};
  const day=/tomorrow/.test(lower)?addDays(current,1):current;
  const pending=(data.tasks||[]).filter(t=>!t.completed&&t.due<=day).sort((a,b)=>a.due.localeCompare(b.due)||({high:0,medium:1,low:2}[a.priority]-{high:0,medium:1,low:2}[b.priority]));
  const minutes=pending.reduce((s,t)=>s+Number(t.estimate_minutes||0),0),unknown=pending.filter(t=>!t.estimate_minutes).length;
  return {answer:[`Suggested priorities for ${day}:`,...pending.slice(0,3).map((t,i)=>`${i+1}. ${t.title} — ${t.due<day?'overdue from '+t.due:'due '+t.due}${t.scheduled_time?' at '+t.scheduled_time:''}${t.estimate_minutes?' · '+t.estimate_minutes+' minutes':''}`),pending.length?`${pending.length} unfinished tasks due by this date; ${minutes} estimated minutes${unknown?`, plus ${unknown} tasks without estimates`:''}. Start with one task, then take a break. This is a suggestion; nothing has been rescheduled.`:'No unfinished tasks are recorded by this date. Choose one small priority, some personal time, and room to rest.'].join('\n\n')};
 }
 if(/subscription|renewal/.test(lower)){
  if(!money)return {answer:'Your account does not have Money access.'};
  const list=(data.subscriptions||[]).filter(s=>s.active).sort((a,b)=>a.renewal.localeCompare(b.renewal));
  return {answer:list.length?list.map(s=>`${s.title}: ${usd(cents(s.amount))} ${s.cycle}; approximately ${usd(cents(s.amount)*({weekly:52,monthly:12,yearly:1}[s.cycle]||1))}/year. Next recorded renewal: ${s.renewal}${daysUntil(s.renewal,current)<0?' (past due; check whether paid)':''}.${s.rarely_used?' Marked rarely used — consider whether you still need it.':''}`).join('\n\n'):'No active subscriptions recorded.'};
 }
 if(/goal|forecast|when.*(?:save|reach)/.test(lower)){
  if(!money)return {answer:'Your account does not have Money access.'};
  return {answer:(data.goals||[]).map(g=>{const held=goalBalance((data.goal_moves||[]).filter(m=>m.date<=current),g.id),left=Math.max(0,cents(g.target_amount)-held),monthly=cents(g.monthly_amount||0);return `${g.title}: ${usd(held)} of ${usd(cents(g.target_amount))}; ${usd(left)} remaining. ${left===0?'Target reached.':monthly>0?`Approximately ${Math.ceil(left/monthly)} monthly contributions at ${usd(monthly)}/month, assuming no withdrawals or interest.`:'Set a monthly contribution to estimate time to target.'}`;}).join('\n\n')||'No savings goals yet. Add a target in Money → Goals.'};
 }
 if(/save more|saving tips|reduce.*spend|spend less|where.*money|biggest.*expens/.test(lower)){
  if(!money)return {answer:'Your account does not have Money access.'};
  const groups=new Map();for(const e of entries.filter(e=>e.type==='expense'&&e.date>=current.slice(0,7)+'-01'))groups.set(e.category||'Other',(groups.get(e.category||'Other')||0)+entryCents(e));
  const top=[...groups].sort((a,b)=>b[1]-a[1]).slice(0,3);
  return {answer:top.length?`Largest spending categories this month through ${current}:\n${top.map(([name,n])=>`• ${name}: ${usd(n)}`).join('\n')}\n\nReview which purchases were optional. If 10% of ${top[0][0]} spending were avoidable, that would free ${usd(Math.round(top[0][1]*.1))}. This is an illustration, not a judgment about essential costs. You can also ask me to review subscriptions.`:'No expenses recorded this month. Record purchases to identify useful savings opportunities.'};
 }
 let reportQuestion=q;
 if(/^and (?:this |last )?(?:week|month|today|yesterday)\??$/i.test(q)&&context?.topic)reportQuestion=context.topic+' '+q;
 const topic=/sav|spend|money|income|expense|balance/i.test(reportQuestion)?'money':/task|plan|schedule/i.test(reportQuestion)?'tasks':'report';
 const answer=chatReport(data,user,reportQuestion,current,selected);
 return {answer:answer.startsWith('I can report')?'I’m a free local helper, so I work with supported requests and your recorded data. Try “Plan my day”, “Can I afford $100?”, “How can I save more?”, “Review subscriptions”, “Savings goals”, or “I spent 15 for lunch”.':answer,context:{topic}};
}
export function finishDraft(draft){
 const field=!draft.initial.title?'title':draft.type!=='task'&&!draft.initial.amount?'amount':['expense','income','opening','withdrawal'].includes(draft.type)&&!draft.initial.currency?'currency':null;
 if(field)return {answer:field==='currency'?'Which currency? Enter USD, LBP, or a currency name from Settings. Nothing was saved.':field==='title'?`What should I call this ${draft.type}? Say cancel to stop.`:'What is the amount? Enter a number such as 15.50, or say cancel.',context:{draft,field}};
 return {answer:`Your ${draft.type==='opening'?'existing savings':draft.type} draft is ready: ${draft.initial.title}${draft.initial.amount?' · '+formatMoney(cents(draft.initial.amount),draft.initial.currency||'USD'):''} · ${draft.initial.due||draft.initial.date||draft.initial.renewal||draft.initial.start||'review date in form'}. You can say “change that to tomorrow”${draft.type!=='task'?' or “change the amount to 25”':''}. Review and save when ready. Nothing has been saved yet.`,action:draft,context:{draft}};
}
