import {formatMoney,nativeEntries,currencyCatalog,currencyOf} from './currency.js';
import {balances,periodSummary} from './domain.js';
import {weekStart,addDays} from './planner.js';
import {daySchema} from './daily.js';
import {hasAccess} from './access.js';

const usd=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n/100);
export function chatReport(data,user,question,current,selected) {
 const q=question.toLowerCase();
 const dates=q.match(/\d{4}-\d{2}-\d{2}/g)||[];
 let start=selected.start,end=selected.end;
 if(dates.length>2||dates.some(d=>!daySchema.safeParse(d).success))return 'Please use valid dates as YYYY-MM-DD, or choose dates below.';
 if(dates.length){start=dates[0];end=dates[1]||dates[0];}
 else if(/\btoday\b/.test(q)){start=end=current;}
 else if(/\byesterday\b/.test(q)){start=end=addDays(current,-1);}
 else if(/\btomorrow\b/.test(q)){start=end=addDays(current,1);}
 if(!dates.length&&/\bweek(?:ly)?\b/.test(q)){start=weekStart(current);if(/last week/.test(q))start=addDays(start,-7);if(/next week/.test(q))start=addDays(start,7);end=addDays(start,6);}
 else if(!dates.length&&/\bmonth(?:ly)?\b/.test(q)){const anchor=new Date(current.slice(0,7)+'-01T12:00:00Z');if(/last month/.test(q))anchor.setUTCMonth(anchor.getUTCMonth()-1);if(/next month/.test(q))anchor.setUTCMonth(anchor.getUTCMonth()+1);start=anchor.toISOString().slice(0,7)+'-01';end=new Date(Date.UTC(anchor.getUTCFullYear(),anchor.getUTCMonth()+1,0,12)).toISOString().slice(0,10);}
 if(!daySchema.safeParse(start).success||!daySchema.safeParse(end).success||start>end)return 'Choose a valid start and end date, with the start first.';
 const report=/report|summary|overview/.test(q),money=report||/sav|spen|expens|money|income|balance/.test(q),tasks=report||/plan|task|schedule/.test(q);
 if(!money&&!tasks)return 'I can report on your records. Try “What are my savings?”, “What plans do I have this week?”, or “Report for 2026-10-01 to 2026-10-04”. You can also choose dates below. For open-ended advice, use AI assistant.';
 const allowedMoney=hasAccess(user,'money'),allowedTasks=hasAccess(user,'tasks');
 const safe={entries:allowedMoney?data.entries:[],tasks:allowedTasks?data.tasks:[]};
 const catalog=currencyCatalog(data.settings),display=catalog.find(c=>q.includes('in '+c.code.toLowerCase()))?.code||(/\blbp\b/.test(q)?'LBP':/\busd\b|dollars/.test(q)?'USD':data.settings?.home_currency||'USD'),usd=n=>formatMoney(n,display,catalog);
 const s=periodSummary(safe,start,end,display),lines=[`Report: ${start} through ${end} (inclusive).`];
 if(money&&allowedMoney){const asOf=end>current?current:end,b=balances(safe.entries.filter(e=>e.date<=asOf),display);const native=[...new Set(['USD',...safe.entries.map(currencyOf)])].map(c=>{const n=balances(nativeEntries(safe.entries.filter(e=>e.date<=asOf),c),c);return `${formatMoney(n.available,c,catalog)} spending; ${formatMoney(n.savings,c,catalog)} savings`;});lines.push(`Native balances: ${native.join(' / ')}. Combined figures below are approximate ${display} using saved entry rates.`);lines.push(`Savings balance as of ${asOf}: ${usd(b.savings)}. Available to spend: ${usd(b.available)}.`,`In this period: income ${usd(s.income)}, expenses ${usd(s.spent)}, income allocated to savings ${usd(s.saved)}, savings withdrawals ${usd(s.withdrawn)}.`);}
 else if(money&&!report)lines.push('Your account does not have Money access.');
 if(tasks&&allowedTasks){const pending=s.tasks.filter(t=>!t.completed).sort((a,b)=>a.due.localeCompare(b.due));lines.push(`Tasks due in this period: ${s.completed} of ${s.tasks.length} complete; ${pending.length} pending.`,...pending.slice(0,8).map(t=>`• ${t.due}${t.scheduled_time?' at '+t.scheduled_time:''}: ${t.title}`));if(pending.length>8)lines.push(`Plus ${pending.length-8} more pending tasks in Tasks.`);if(!s.tasks.length)lines.push('No tasks are scheduled in this period.');}
 else if(tasks&&!report)lines.push('Your account does not have Tasks access.');
 if(!allowedMoney&&!allowedTasks)lines.push('Your account has no Money or Tasks access.');
 lines.push('Based on recorded data; future transactions and uncreated recurring tasks are not predicted.');
 return lines.join('\n\n');
}

