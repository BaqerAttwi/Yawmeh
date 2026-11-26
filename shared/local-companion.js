import {arabiziRest} from './arabizi-requests.js';
import {commonRequestAlias} from './companion-requests.js';
import {entryCents,nativeEntries,formatMoney,currencyCatalog} from './currency.js';
import {balances,cents,daysUntil} from './domain.js';
import {addDays,goalBalance} from './planner.js';
import {hasAccess} from './access.js';
import {companionIntent} from './companion-actions.js';
import {chatReport,spendingReport} from './companion-chat.js';
import {daySchema} from './daily.js';
import {normalizeLebanese} from './lebanese-companion.js';
import {everydayCompanion} from './companion-everyday.js';
import {draftCorrection,normalizeFollowupText,followupCurrency,companionAmount,followupClock,isLocalCompanionFollowup} from './companion-followup.js';
import {companionDraftSchema} from './companion-ai.js';
import {guidanceGoal,guidanceReply} from './companion-guidance.js';
import {dictionaryWord} from './chat-dictionary.js';
import {languageProfile} from './lebanese-language.js';
import {naturalCapture,normalizeSpokenMoney} from './companion-capture.js';
import {companionHelp} from './companion-help.js';
const usd=n=>'≈ '+new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n/100)+' (USD estimate)';

// Deterministic local conversation. No network, generated numbers or automatic writes.
export function localCompanion(data,user,question,current,selected,context=null){
 const help=companionHelp(user,question);
 if(help)return {...help,context};
 question=commonRequestAlias(question)||question;
 // A short service name is a suggestion, never a saved subscription or price.
 const tokens=question.trim().split(/\s+/);
 for(let i=0;i<3&&tokens[0]&&dictionaryWord(tokens[0],['prefix']);i++)tokens.shift();
 const verb=tokens[0]&&dictionaryWord(tokens.shift(),['verb']);
 const short=verb&&tokens.join(' ').match(/^(Claude|ChatGPT|Netflix|Spotify|YouTube Premium)\s*[.!?؟]*$/i);
 if(short&&hasAccess(user,'money')){
  const draft={type:'subscription',initial:{title:short[1],renewal:current}};
  return {answer:languageProfile(question).language==='ar'?`قصدك اشتراك ${short[1]}؟ إذا هيك، قديش سعره بالدولار؟ راجع دورة الدفع وتاريخ التجديد بالنموذج قبل الحفظ. فيك تقول «الغي» إذا قصدك شي تاني.`:`Do you mean a subscription for ${short[1]}? If so, what is its price in USD? Review the billing cycle and renewal date in the form before saving. Say cancel if that is not what you meant.`,context:{draft,field:'amount'}};
 }
 const meta=normalizeFollowupText(question).toLowerCase();
 if(context?.field&&/^(?:no|nope|la|لا|مش هيك)[.!؟?\s]*$/.test(meta))return {answer:languageProfile(question).language==='ar'?'لغيت المسودة. ما انحفظ شي.':'Draft cancelled. Nothing was saved.'};
 if(/^why\b.*(?:ask|question)|^ليش.*(?:بتسال|عم تسال|اسئل)/.test(meta))return {answer:/[\u0600-\u06ff]/.test(meta)?'بسأل عن التفاصيل الناقصة كرمال ما سجّل مبلغ أو عملة غلط. فيك تعطيني الاسم والمبلغ والعملة بجملة وحدة، مثل «صرفت 15 دولار على الغدا». بجهّز مسودة وبتراجعها قبل الحفظ.': 'I ask for missing details so I do not record the wrong amount or currency. You can give the title, amount and currency together, like “I spent 15 USD for lunch”. I prepare a draft for you to review before saving.',context};
 if(context?.field&&!isLocalCompanionFollowup(question,context))context=null;
 const goal=guidanceGoal(question,context);if(goal)return guidanceReply(user,goal);
 const correction=draftCorrection(question);
 if(correction)return correctCompanionDraft(data,user,correction,current,context);
 const translated=normalizeLebanese(question);
 if(translated.answer)return {answer:translated.answer,context};
 if(translated.arabic&&!context?.field&&!/^(?:ضيف|اضف|سجل|ذكرني|صرفت|دفعت|قبضت)\s/.test(question.trim())){const everyday=everydayCompanion(data,user,question,current,true);if(everyday)return everyday;}
 if(translated.arabic&&!translated.question&&!context?.field&&!context?.transaction)return {answer:'ما فهمت الطلب منيح. جرب «شو عندي اليوم؟»، «قديش صرفت هالشهر؟» او «صرفت 15 دولار على الغدا». بفهم طلبات محددة، وما انحفظ شي.',context};
 const result=localCompanionCore(data,user,translated.question||question,current,selected,context,translated);
 if(translated.arabic&&result.action){const d=result.action.initial;result.answer=`حضرتلك مسودة: ${d.title}${d.amount?' · '+d.amount+' '+(d.currency||'USD'):''} · ${d.due||d.date||''}${d.scheduled_time?' · '+d.scheduled_time:''}. راجع التفاصيل واضغط حفظ. بعد ما انحفظ شي.`;}
 else if(translated.arabic&&result.context?.field)result.answer=result.context.field==='time'?'حدّد الوقت مثل 1 المسا أو 13:00. طلبك بعده محفوظ كمسودة.':result.context.field==='date'?'بأي تاريخ؟ قلّي اليوم أو بكرا أو اكتب YYYY-MM-DD.':result.context.field==='currency'?`بأي عملة لـ${result.context.draft?.initial.title||'هالعملية'}؟ اكتب USD، LBP، او اسم العملة اللي ضفتها بالاعدادات.`:result.context.field==='title'?'على شو؟ اكتب اسم المصروف او الدخل. فيك تقول «الغي» لنوقف.':`قديش المبلغ لـ${result.context.draft?.initial.title||'هالعملية'}؟ اكتب المبلغ والعملة، مثل 20 دولار. فيك تقول «الغي» لنوقف.`;
 else if(translated.arabic&&translated.question==='cancel')result.answer='لغيت المسودة. ما انحفظ شي.';
 return result;
}
function correctCompanionDraft(data,user,{field,value},current,context){
 if(!context?.draft)return {answer:'Prepare a draft first, then tell me what to change. Existing saved records must be edited in their app.'};
 const draft=structuredClone(context.draft);
 if(!hasAccess(user,draft.type==='task'?'tasks':'money'))return {answer:'Your access changed. This draft is no longer available.'};
 const raw=normalizeFollowupText(arabiziRest(field==='amount'||field==='auto'?normalizeSpokenMoney(value,{bare:field==='amount'}):value)),catalog=currencyCatalog(data.settings),currency=followupCurrency(raw,catalog);
 const day={today:current,tomorrow:addDays(current,1),yesterday:addDays(current,-1),اليوم:current,بكرا:addDays(current,1),بكرة:addDays(current,1),مبارح:addDays(current,-1),bokra:addDays(current,1),bukra:addDays(current,1),lyoum:current,elyoum:current,mbarah:addDays(current,-1)}[raw.toLowerCase()]||raw;
 const validDate=daySchema.safeParse(day).success;
 const amount=companionAmount(raw,catalog,{whole:true});
 const clock=followupClock(raw);
 if(field==='auto')field=currency?'currency':validDate?'date':amount?'amount':clock?'time':'unknown';
 if(field==='date'&&validDate&&draft.type!=='item')draft.initial[draft.type==='task'?'due':draft.type==='subscription'?'renewal':draft.type==='budget'?'start':'date']=day;
 else if(field==='amount'&&draft.type!=='task'&&amount){
  if(amount.unresolved)return currencyPrompt(catalog,context);
  draft.initial.amount=amount.amount;
  if(amount.currency)draft.initial.currency=amount.currency;
 }else if(field==='currency'&&draft.type!=='task'&&currency)draft.initial.currency=currency;
 else if(field==='title'&&value.trim()&&value.trim().length<=160)draft.initial.title=value.trim();
 else if(field==='time'&&draft.type==='task'&&clock)draft.initial.scheduled_time=clock;
 else return {answer:'Tell me a clear date, amount, currency, title or time for this draft. Nothing was saved.',context};
 if(!companionDraftSchema.safeParse(draft).success)return {answer:'That value is not valid for this draft. Nothing was saved.',context};
 if(!['task','expense','income','opening','withdrawal'].includes(draft.type)&&draft.initial.currency&&draft.initial.currency!=='USD')return {answer:'Budgets, subscription plans and saved items use USD in v1. For an LBP transaction, add income, expense or savings instead.',context};
 return finishDraft(draft);
}
function currencyPrompt(catalog,context){
 return {answer:'Choose one configured currency: '+catalog.map(c=>c.symbol?c.code+' ('+c.symbol+')':c.code).join(', ')+'. Nothing was saved.',context,handled:true};
}
function expenseShorthand(text,catalog){
 if(/[?؟]$/.test(text)||/^(?:i|my|we|you|is|was|it|can|could|should|how|what|when|where|why|show|list|review|report|add|record|log|create|set|edit|change|plan|schedule|transfer|delete|remove|complete|borrow(?:ed)?|lend|lent|refund(?:ed)?|repay(?:ment)?|compare)\b/i.test(text))return false;
 const amount=companionAmount(text,catalog,{preferExplicit:true});
 if(!amount?.explicit)return false;
 const before=text.slice(0,amount.index).trim(),after=text.slice(amount.index+amount.length).replace(/^[\s,;:.!]+/,'').trim();
 return (!before||!after)&&/\p{L}/u.test(before||after);
}
function localCompanionCore(data,user,question,current,selected,context=null,{needsCurrency,requiresAmountMarker}={}){
 let q=question.trim();
 // Spoken requests often include a name, a greeting, or a polite question.
 q=q.replace(/^(?:(?:oh\s+)?thanks[,.!]\s*|(?:sage|osage|nova|pip)[,.]\s*)+/i,'');
 if(/\b(?:can|could) you hear me\b|\bare you listening\b/i.test(q))return {answer:'Your message reached me as text. If you used Speak, your words were transcribed. Tell me what you would like to add or ask.',context};
 q=q.replace(/^(?:so\s+)?(?:can|could|would) you\s+(?:please\s+)?(?:help me\s+(?:(?:with|in)\s+)?)?(?=(?:add(?:ing)?|create|record|log|schedule|plan)\b)/i,'');
 const capture=naturalCapture(q);
 const isQuestion=/[?؟]$/.test(q);
 q=q.replace(/^adding\b/i,'add').replace(/^(add\s+)(?:more\s+)?expenses\b/i,'$1expense').replace(/\?\s*$/,'');
 if(/^(?:no[, ]+)?(?:what i meant is|i meant)\s+adding[.! ]*$/i.test(q)&&context?.topic==='money')q='add expense';
 const lower=q.toLowerCase();
 if(/^(cancel|never mind|nevermind)$/i.test(q))return {answer:'Draft cancelled. Nothing was saved.'};
 // Explicit requests must not become a pending draft's title or amount.
 if(context?.field&&/^(?:please\s+)?(?:add|create|record|log|schedule|remind me|i spent|i paid|i earned|i received|budget status|plan my day|compare spending|review subscriptions|what|how|can i)\b/i.test(q))context=null;
 const catalog=currencyCatalog(data.settings);
 if(capture?.issue)return {answer:hasAccess(user,'money')?capture.issue:'Your account does not have Money access.',handled:true};
 if(capture)context=null;
 const shorthandExpense=!capture&&!isQuestion&&(!context?.field||(context.field==='title'&&context.draft?.type==='expense'&&!context.draft.initial.amount))
  &&expenseShorthand(q,catalog);
 const shortAmount=q.match(/^(?:please\s+)?(?:add|record|log)\s+(.+)$/i);
 const shorthand=shortAmount&&companionAmount(shortAmount[1],catalog,{whole:true});
 if(shorthand?.explicit){
  if(!hasAccess(user,'money'))return {answer:'Your account does not have Money access.',handled:true};
  if(shorthand.unresolved)return currencyPrompt(catalog,context);
  const {amount,currency}=shorthand;
  return {answer:`How should I record ${formatMoney(cents(amount),currency,catalog)}? Choose Income, Expense, Existing savings or Withdrawal.`,context:{transaction:{amount,currency}},handled:true};
 }
 if(context?.transaction){
  const types={income:'income',expense:'expense',savings:'opening','existing savings':'opening',withdrawal:'withdrawal',دخل:'income',مصروف:'expense',مدخرات:'opening',سحب:'withdrawal'};
  const type=Object.hasOwn(types,lower)?types[lower]:undefined;
  if(type&&hasAccess(user,'money')&&catalog.some(c=>c.code===context.transaction.currency)){
   return finishDraft({type,initial:{...context.transaction,date:current,...(type==='opening'?{title:'Existing savings'}:{})}});
  }
 }
 if(context?.draft&&context.field&&!shorthandExpense){
  const draft=structuredClone(context.draft);
  if(!hasAccess(user,draft.type==='task'?'tasks':'money'))return {answer:'Your access changed. This draft is no longer available.'};
  if(context.field==='time'){
   const clock=followupClock(q);
   if(!clock)return {answer:'Please specify a clear time, such as 9 pm or 21:00. Nothing has been saved.',context};
   draft.initial.scheduled_time=clock;return finishDraft(draft);
  }
  if(context.field==='date')return correctCompanionDraft(data,user,{field:'date',value:q},current,context);
  if(context.field==='currency'){
   const currency=followupCurrency(q,catalog);
   if(!currency)return currencyPrompt(catalog,context);
   draft.initial.currency=currency;return finishDraft(draft);
  }
  if(context.field==='title'){
   if(!draft.initial.amount&&['expense','income','opening','withdrawal'].includes(draft.type)){
    const value=normalizeFollowupText(arabiziRest(normalizeSpokenMoney(q,{bare:true})));
    if(companionAmount(value,catalog,{whole:true}))return correctCompanionDraft(data,user,{field:'amount',value:q},current,context);
   }
   draft.initial.title=q.slice(0,160);
  }
  else {
   const stripped=q.replace(/^(?:yes|yeah|eh|اي|نعم)[,،\s]+/i,'');
   const value=normalizeFollowupText(arabiziRest(normalizeSpokenMoney(stripped,{bare:true})));
   const amount=companionAmount(value,catalog,{whole:true});
   if(!amount)return {answer:`What is the amount for ${draft.initial.title||'this draft'}? Include its currency, for example 20 USD, or say cancel.`,context};
   if(amount.unresolved)return currencyPrompt(catalog,context);
   if(amount.currency){
    if(['subscription','budget','item'].includes(draft.type)&&amount.currency!=='USD')return {answer:'This plan uses USD. Please give the price in USD; I have not converted it or saved anything.',context,handled:true};
    if(!['subscription','budget','item'].includes(draft.type))draft.initial.currency=amount.currency;
   }
   draft.initial.amount=amount.amount;
  }
  return finishDraft(draft);
 }
 const normalized=capture?`add ${capture.type} ${capture.type==='task'?capture.details:normalizeSpokenMoney(capture.details)}`:shorthandExpense?`add expense ${q}`:q;
 const everyday=everydayCompanion(data,user,normalized,current);
 const intent=/^(?:help|what (?:else )?can (?:i ask|you do)|show (?:me )?examples)[?!. ]*$/i.test(normalized)?everyday:companionIntent(normalized,user,current,catalog,{requiresAmountMarker:capture?.requiresAmountMarker||requiresAmountMarker});
 if(intent?.action){
  if(shorthandExpense&&context?.field==='title'&&context.draft.initial.date&&!/\b(?:today|yesterday|tomorrow|\d{4}-\d{2}-\d{2})\b/i.test(q))intent.action.initial.date=context.draft.initial.date;
  if(!needsCurrency&&!intent.needsCurrency&&['expense','income','opening','withdrawal'].includes(intent.action.type))intent.action.initial.currency??=data.settings?.last_currency||'USD';
  const result=finishDraft(intent.action);
  return intent.needsCurrency&&result.context?.field==='currency'?currencyPrompt(catalog,result.context):result;
 }
 if(intent)return intent;
 const spending=spendingReport(data,user,q,current,selected);
 if(spending)return {answer:spending};
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
  const amount=companionAmount(q,catalog);
  if(!amount)return {answer:'How much would it cost? Ask “Can I afford $100?”'};
  if(amount.unresolved)return currencyPrompt(catalog,context);
  const currency=amount.currency||'USD',native=balances(nativeEntries(entries,currency),currency);
  const cost=cents(amount.amount);
  if(currency==='LBP')return {answer:`Your native LBP spending balance is ${(native.available/100).toLocaleString()} LBP. This purchase costs ${amount.amount.toLocaleString()} LBP. ${cost>native.available?'Your LBP balance does not cover it.':'Your LBP balance covers it.'} USD balances are separate; no currency exchange is performed.`,handled:amount.explicit};
  if(currency!=='USD')return {answer:`Available to spend: ${formatMoney(native.available,currency,catalog)}. Purchase cost: ${formatMoney(cost,currency,catalog)}. ${cost>native.available?'This exceeds your recorded spending balance.':'Your recorded balance covers this purchase.'}`,handled:true};
  const budgets=(data.budgets||[]).filter(x=>x.start<=current&&x.end>=current);
  const lines=[`You have ${usd(native.available)} available to spend in USD. A ${usd(cost)} purchase would leave ${usd(native.available-cost)}.`,cost>native.available?'This exceeds your recorded spending balance.':'Your recorded balance covers this purchase.'];
  for(const budget of budgets){const spent=entries.filter(e=>e.type==='expense'&&e.date>=budget.start&&e.date<=budget.end).reduce((s,e)=>s+entryCents(e),0);const remaining=cents(budget.amount)-spent;lines.push(`${budget.title}: ${usd(remaining)} remains through ${budget.end}. ${cost>remaining?'This purchase would exceed that budget by '+usd(cost-remaining)+'.':'After this purchase: '+usd(remaining-cost)+' remains.'}`);}
  if(!budgets.length)lines.push('No active spending budget is recorded. Add one to check this against your plan.');
  lines.push('Recorded balances only; unpaid bills and future income are not deducted or predicted. Savings are not treated as spending money.');return {answer:lines.join('\n\n'),handled:amount.explicit};
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
 if(answer.startsWith('I can report'))return guidanceReply(user,'choose_topic');
 return {answer,context:{topic}};
}
export function finishDraft(draft){
 const field=!draft.initial.title?'title':draft.type==='task'&&!draft.initial.due?'date':draft.type!=='task'&&!draft.initial.amount?'amount':['expense','income','opening','withdrawal'].includes(draft.type)&&!draft.initial.currency?'currency':null;
 if(field==='date')return {answer:'Which date should I use? Say today, tomorrow, or enter YYYY-MM-DD. Your task draft is still here.',context:{draft,field}};
 if(field)return {answer:field==='currency'?`Which currency for ${draft.initial.title}? Enter USD, LBP, or a currency name from Settings. Nothing was saved.`:field==='title'?`What should I call this ${draft.type}? Say cancel to stop.`:`What is the amount for ${draft.initial.title}? Include its currency, for example 20 USD, or say cancel.`,context:{draft,field}};
 return {answer:`Your ${draft.type==='opening'?'existing savings':draft.type} draft is ready: ${draft.initial.title}${draft.initial.amount?' · '+formatMoney(cents(draft.initial.amount),draft.initial.currency||'USD'):''} · ${draft.initial.due||draft.initial.date||draft.initial.renewal||draft.initial.start||'review date in form'}. You can say “change that to tomorrow”${draft.type!=='task'?' or “change the amount to 25”':''}. Review and save when ready. Nothing has been saved yet.`,action:draft,context:{draft}};
}
