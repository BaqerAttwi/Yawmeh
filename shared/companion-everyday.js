import {hasAccess} from './access.js';
import {addDays} from './planner.js';
import {cents} from './domain.js';
import {formatMoney} from './currency.js';

// Read-only answers: list recorded facts, preserving each entry's own currency.
export function everydayCompanion(data,user,question,today,ar=false){
 const q=question.toLowerCase().trim().replace(/[أإآ]/g,'ا');
 const t=(en,arabic)=>ar?arabic:en;
 const tasks=hasAccess(user,'tasks'),money=hasAccess(user,'money');
 const taskKind=/overdue tasks|what.*overdue|late tasks|مهام.*متاخر|شو.*متاخر/.test(q)?'overdue':
  /completed today|finished today|done today|خلصت.*اليوم|انجزت.*اليوم/.test(q)?'completed':
  /tasks (?:this|next) week|upcoming tasks|مهام.*(?:الاسبوع|اسبوع)|مهامي الجاي/.test(q)?'upcoming':
  /next task|what.*(?:do|work on) next|شو اعمل هلق|المهمة الجاية/.test(q)?'next':null;
 const expenseKind=/recent expenses|last (?:expenses|purchases)|اخر.*(?:مصاريف|مصروف|مشتريات)/.test(q)?'recent':
  /(?:largest|biggest) (?:expense|purchase)(?!s)|اكبر (?:مصروف|عملية شراء)/.test(q)?'largest':null;
 const renewals=/next renewal|(?:bills|subscriptions).*due|اشتراك.*(?:جاي|مستحق)|شو.*بدي ادفع/.test(q);
 if(/^(?:what (?:else )?can (?:i ask|you do)|show (?:me )?examples|help|شو فيني اسال|شو بتقدر تعمل|اعطيني امثلة)[?؟.! ]*$/.test(q)){
  return {answer:[t('Here are things you can ask:','فيك تسالني:'),
   ...(tasks?[t('• What is my next task?\n• Show overdue tasks\n• What have I completed today?\n• Upcoming tasks\n• Add task call the dentist tomorrow','• شو اعمل هلق؟\n• شو المهام المتاخرة؟\n• شو خلصت اليوم؟\n• مهامي الجاي\n• ذكرني اتصل بطبيب الاسنان بكرا')]:[]),
   ...(money?[t('• Recent expenses\n• Largest expense this month\n• Which subscriptions are due?\n• Can you add expenses?\n• I spent 15 for lunch','• اخر المصاريف\n• اكبر مصروف هالشهر\n• شو الاشتراكات المستحقة؟\n• ضيف مصروف 15 دولار على الغدا')]:[]),
   t('New entries are drafts. Review and save to record them.','العمليات الجديدة مسودات. راجعها واضغط حفظ لتتسجل.')].join('\n\n')};
 }
 if(taskKind){
  if(!tasks)return {answer:t('Your account does not have Tasks access.','حسابك ما عنده صلاحية للمهام.')};
  const pending=(data.tasks||[]).filter(x=>!x.cancelled&&!x.completed).sort((a,b)=>a.due.localeCompare(b.due)||({high:0,medium:1,low:2}[a.priority]-{high:0,medium:1,low:2}[b.priority]));
  let list,title;
  if(taskKind==='overdue'){list=pending.filter(x=>x.due<today);title=t('Overdue tasks','المهام المتاخرة');}
  if(taskKind==='completed'){list=(data.tasks||[]).filter(x=>!x.cancelled&&x.completed&&x.completed_on===today);title=t('Completed today','اللي خلصته اليوم');}
  if(taskKind==='upcoming'){list=pending.filter(x=>x.due>=today&&x.due<=addDays(today,6));title=t('Tasks for the next 7 days','مهام للسبعة ايام الجايين');}
  if(taskKind==='next'){list=pending.slice(0,1);title=t('Suggested next task','المهمة الجاية المقترحة');}
  return {answer:title+' ('+today+'):\n'+(list.length?list.slice(0,10).map(x=>`• ${x.title} — ${x.due}${x.scheduled_time?' · '+x.scheduled_time:''}`).join('\n'):t('No matching tasks recorded.','ما في مهام مسجلة مطابقة.'))+(list.length>10?t('\nShowing the first 10. See Tasks for the full list.','\nعم نعرض اول 10. شوف الباقي بتطبيق المهام.'):'')};
 }
 if(expenseKind){
  if(!money)return {answer:t('Your account does not have Money access.','حسابك ما عنده صلاحية للمصاري.')};
  const entries=(data.entries||[]).filter(x=>x.type==='expense'&&!x.voided_on&&x.date<=today);
  const line=x=>`• ${x.title} — ${formatMoney(cents(x.amount),x.currency||'USD')} · ${x.date}`;
  if(expenseKind==='recent')return {answer:t('Latest 5 recorded expenses:','اخر 5 مصاريف مسجلة:')+'\n'+(entries.sort((a,b)=>b.date.localeCompare(a.date)||Number(b.id||0)-Number(a.id||0)).slice(0,5).map(line).join('\n')||t('No expenses recorded.','ما في مصاريف مسجلة.'))};
  const groups=new Map();
  for(const x of entries.filter(x=>x.date>=today.slice(0,7)+'-01')){const code=x.currency||'USD',previous=groups.get(code);if(!previous||cents(x.amount)>cents(previous.amount))groups.set(code,x);}
  return {answer:t('Largest expense this month, separately for each currency:','اكبر مصروف هالشهر، بكل عملة لحالها:')+'\n'+([...groups.values()].map(line).join('\n')||t('No expenses recorded this month.','ما في مصاريف مسجلة هالشهر.'))};
 }
 if(renewals){
  if(!money)return {answer:t('Your account does not have Money access.','حسابك ما عنده صلاحية للمصاري.')};
  const list=(data.subscriptions||[]).filter(x=>x.active&&x.renewal<=addDays(today,6)).sort((a,b)=>a.renewal.localeCompare(b.renewal));
  return {answer:t('Active subscriptions past due or due in the next 7 days:','الاشتراكات الفعالة المتاخرة او المستحقة بالسبعة ايام الجايين:')+'\n'+(list.slice(0,10).map(x=>`• ${x.title} — ${formatMoney(cents(x.amount),'USD')} · ${x.renewal}`).join('\n')||t('None recorded.','ما في اشتراكات مطابقة.'))+'\n'+t('Check whether past-due renewals were already paid. See Subscriptions for all renewals.','تاكد اذا التجديدات المتاخرة اندفعت. شوف كل التجديدات بتطبيق الاشتراكات.')};
 }
 return null;
}
