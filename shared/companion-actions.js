import {addDays} from './planner.js';
import {daySchema} from './daily.js';
import {hasAccess} from './access.js';

// Drafts only: existing forms validate and persist after the user presses Save.
export function companionIntent(question,user,current) {
 const text=question.trim(),q=text.toLowerCase();
 if(/^(what are you|who are you|what can you do|help)[?.! ]*$/.test(q))return {answer:'I’m your yawmeh.me companion. I can prepare tasks, expenses, income, savings withdrawals, budgets, subscriptions and frequent items, or report on your records. Try “add a task called football at 9 pm tomorrow” or “add expense 15 for lunch”. I open a draft for you to review and save; I never change your records silently.'};
 if(/^(hi|hello|hey|thanks|thank you)[!. ]*$/.test(q))return {answer:'Hi! What would help today? I can prepare a task or money entry, or show your plans and savings. Use a quick action below or tell me what to add.'};
 const command=text.match(/^(?:please\s+)?(?:add|create|record|log|schedule|make)\s+(?:to\s+)?(?:(?:my|the|a|an|new|quick)\s+)*(tasks?|to-do|todo|expense|purchase|income|savings|withdrawal|budget|subscription|item)\b\s*(.*)$/i);
 if(!command){if(/^(?:please\s+)?(?:add|create|record|log|schedule|delete|remove|edit|update|complete|pay|transfer)\b/i.test(text))return {answer:'I didn’t understand that action, so nothing was changed. Try “add task called football at 9 pm”, “add expense 15 for lunch”, or use a quick action below. Existing records can be edited in their app.'};return null;}
 const type={tasks:'task',todo:'task','to-do':'task',purchase:'expense',savings:'opening'}[command[1].toLowerCase()]||command[1].toLowerCase();
 if(!hasAccess(user,type==='task'?'tasks':'money'))return {answer:`Your account does not have ${type==='task'?'Tasks':'Money'} access. Ask your administrator to enable it.`};
 let rest=command[2].replace(/\b([ap])\.\s*m\.?/gi,'$1m'),date=current,needsDate=false;
 const explicit=rest.match(/\b\d{4}-\d{2}-\d{2}\b/g)||[];
 if(explicit.length>1||explicit.some(d=>!daySchema.safeParse(d).success)){
  if(type!=='task')return {answer:'Please give one valid date as YYYY-MM-DD. For a budget range, use the budget form.'};
  needsDate=true;date=undefined;rest=rest.replace(/\b(?:on\s+)?\d{4}-\d{2}-\d{2}\b/g,'');
 }
 if(explicit.length&&!needsDate){date=explicit[0];rest=rest.replace(new RegExp('(?:\\bon\\s+)?'+date),'');}
 else if(/\btomorrow\b/i.test(rest)){date=addDays(current,1);rest=rest.replace(/\b(?:on\s+)?tomorrow\b/i,'');}
 else if(/\byesterday\b/i.test(rest)){date=addDays(current,-1);rest=rest.replace(/\b(?:on\s+)?yesterday\b/i,'');}
 else rest=rest.replace(/\b(?:on\s+)?today\b/i,'');
 const initial={};
 if(type==='task'){
  if(date)initial.due=date;
  const time=rest.match(/\bat\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i);
  if(time){let hour=Number(time[1]),minute=Number(time[2]||0);const meridiem=time[3]?.toLowerCase();
   if(minute>59||hour>(meridiem?12:23)||(meridiem&&hour<1)||(!meridiem&&!time[2])){
    initial.title=rest.replace(time[0],'').replace(/^(?:called|named|to)\s+/i,'').trim().replace(/^['"]|['"]$/g,'');
    return {answer:'Please specify a clear time, such as 9 pm or 21:00. Nothing has been saved.',context:{draft:{type,initial},field:'time'}};
   }
   if(meridiem)hour=hour%12+(meridiem==='pm'?12:0);
   initial.scheduled_time=`${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}`;rest=rest.replace(time[0],'');
  }
  initial.title=rest.replace(/^(?:called|named|to)\s+/i,'').trim().replace(/^['"]|['"]$/g,'');
  if(needsDate)return {answer:'Which date should I use? Say today, tomorrow, or enter YYYY-MM-DD. Your task draft is still here.',context:{draft:{type,initial},field:'date'}};
 }else{
  if(['expense','income','opening','withdrawal'].includes(type)){initial.date=date;if(/\blbp\b/i.test(rest))initial.currency='LBP';else if(/\busd\b|dollars|\$/i.test(rest))initial.currency='USD';}
  if(/\blbp\b/i.test(rest)&&!['expense','income','opening','withdrawal'].includes(type))return {answer:'Budgets, subscription plans and saved items use USD in v1. For an LBP transaction, add income, expense or savings instead.'};
  if(type==='subscription')initial.renewal=date;
  if(type==='budget')initial.start=date;
  const amount=rest.match(/(?:^|\s)(?:\$\s*)?(\d+(?:\.\d{1,2})?)(?:\s*(?:usd|dollars|lbp))?(?=\s|$)/i);
  if(amount){initial.amount=Number(amount[1]);rest=rest.replace(amount[0],' ');}
  initial.title=rest.trim().replace(/^(?:called|named|for|from|of)\s+/i,'').trim();
 }
 return {action:{type,initial},answer:`Draft ready. Review the ${type==='opening'?'existing savings':type} details below, then press Save. Nothing has been saved yet.`};
}


