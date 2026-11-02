import {randomId} from './id.js';
import {entryCents,nativeEntries,currencyOf} from './currency.js';
import {balances,cents,daysUntil,nextRenewal,periodSummary,today} from './domain.js';
export class PlannerError extends Error {constructor(message,status=400){super(message);this.status=status;}}
export function supportedDate(d){
  if(!Number.isFinite(d.getTime())||d.getUTCFullYear()<1000||d.getUTCFullYear()>9999)throw new PlannerError('Choose a date between 1000-01-01 and 9999-12-31.');
  return d.toISOString().slice(0,10);
}
export function addDays(date,days){const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+days);return supportedDate(d);}
export function weekStart(date){const day=new Date(date+'T12:00:00Z').getUTCDay();return addDays(date,-((day+6)%7));}
export function nextTaskDue(due,recurrence,current=today()){
  if(!['daily','weekly'].includes(recurrence))return null;
  const step=recurrence==='daily'?1:7;
  return addDays(due,Math.max(1,Math.floor(daysUntil(current,due)/step)+1)*step);
}
export function nextTaskValues(task,current=today()){
  const due=nextTaskDue(task.due,task.recurrence,current);if(!due)return null;
  return {scheduled_time:task.scheduled_time||null,estimate_minutes:task.estimate_minutes||0,title:task.title,category:task.category||'Personal',due,priority:task.priority,note:task.note||'',recurrence:task.recurrence,reminder:task.reminder?addDays(due,-daysUntil(task.due,task.reminder)):null,previous_task_id:task.id,completed:0,completed_on:null};
}
export function completeDemoTask(data,id,completed,current=today(),newId=()=>randomId()){
  const task=data.tasks.find(t=>t.id===id);if(!task)throw new PlannerError('Task not found.',404);
  const parts=(data.subtasks||[]).filter(s=>s.task_id===id);
  if(completed&&parts.some(s=>!s.completed))throw new PlannerError('Complete the subtasks before completing this task.');
  if(!completed&&data.tasks.some(t=>t.previous_task_id===id))throw new PlannerError('This recurring occurrence already has a next task. Use that task instead.');
  if(!!task.completed===completed)return;
  task.completed=completed;task.completed_on=completed?current:null;
  if(completed){const next=nextTaskValues(task,current);if(next&&!data.tasks.some(t=>t.previous_task_id===id)){next.id=newId();data.tasks.unshift(next);data.subtasks.push(...parts.map(s=>({id:newId(),task_id:next.id,title:s.title,completed:0})));}}
}
export function goalBalance(moves,goalId){return (moves||[]).filter(m=>m.goal_id===goalId).reduce((total,m)=>total+(m.kind==='release'?-1:1)*cents(m.amount),0);}
export function reservedSavings(moves){return (moves||[]).reduce((total,m)=>total+(m.kind==='release'?-1:1)*cents(m.amount),0);}
export function checkGoalMove(goal,entries,moves,move){
  const current=goalBalance(moves,goal.id),amount=cents(move.amount);
  if(move.kind==='release'&&amount>current)throw new PlannerError('You cannot release more than this goal holds.');
  if(move.kind==='fund'){
    if(amount>balances(nativeEntries(entries,'USD')).savings-reservedSavings(moves))throw new PlannerError('Not enough unassigned savings. Add savings or release money from another goal.');
    if(current+amount>cents(goal.target_amount))throw new PlannerError('This amount would exceed the goal target.');
  }
}
export function checkUnassignedWithdrawal(entry,entries,moves){if(entry.type==='withdrawal'&&currencyOf(entry)==='USD'&&cents(entry.amount)>balances(nativeEntries(entries,'USD')).savings-reservedSavings(moves))throw new PlannerError('This money is reserved for savings goals. Release it from a goal before withdrawing.');}
export function calendarEvents(data,start,end){
  const events=[];
  for(const task of data.tasks||[]){
    if(task.due>=start&&task.due<=end)events.push({id:'task-'+task.id,sourceId:task.id,date:task.due,title:task.title+(task.scheduled_time?' · '+task.scheduled_time:''),kind:'task',completed:!!task.completed,category:task.category||'Personal',projected:false});
    if(!task.completed&&task.due<end&&['daily','weekly'].includes(task.recurrence)){
      const step=task.recurrence==='daily'?1:7;
      if(daysUntil(end,task.due)<step)continue;
      let date=addDays(task.due,step);
      if(date<start)date=addDays(date,Math.ceil(daysUntil(start,date)/step)*step);
      for(let count=0;date<=end&&count<370;count++){
        events.push({id:`repeat-${task.id}-${date}`,sourceId:task.id,date,title:task.title,kind:'task',completed:false,category:task.category||'Personal',projected:true});
        if(daysUntil(end,date)<step)break;
        date=addDays(date,step);
      }
    }
  }
  for(const subscription of (data.subscriptions||[]).filter(s=>s.active)){
    let date=subscription.renewal;
    // Jump near the window before stepping, so an old renewal cannot produce an unbounded loop.
    if(subscription.cycle==='weekly'&&date<start)date=addDays(date,Math.max(0,Math.ceil(daysUntil(start,date)/7))*7);
    let guard=0;while(date<=end&&guard++<12000){
      if(date>=start)events.push({id:`subscription-${subscription.id}-${date}`,sourceId:subscription.id,date,title:subscription.title,kind:'subscription',amount:subscription.amount,projected:date!==subscription.renewal});
      try{date=nextRenewal(date,subscription.cycle);}catch(error){if(error instanceof PlannerError)break;throw error;}
    }
  }
  return events.sort((a,b)=>a.date.localeCompare(b.date)||a.kind.localeCompare(b.kind)||a.title.localeCompare(b.title));
}
export function weeklyReview(data,anchor,display='USD'){
  const start=weekStart(anchor),end=addDays(start,6),summary=periodSummary(data,start,end,display),previous=periodSummary(data,addDays(start,-7),addDays(start,-1),display);
  const categories=new Map();for(const e of data.entries.filter(e=>!e.voided_on&&e.type==='expense'&&e.date>=start&&e.date<=end))categories.set(e.category,(categories.get(e.category)||0)+entryCents(e,display));
  return {...summary,start,end,previousSpent:previous.spent,spendingCategories:[...categories].map(([category,amount])=>({category,amount})).sort((a,b)=>b.amount-a.amount),renewals:calendarEvents({...data,tasks:[]},start,end),goalFunding:(data.goal_moves||[]).filter(m=>m.date>=start&&m.date<=end).reduce((sum,m)=>sum+(m.kind==='release'?-1:1)*cents(m.amount),0)};
}
