import {entryCents,nativeEntries,currencyOf} from './currency.js';
import {supportedDate} from './planner.js';
export const today = (zone = 'Asia/Beirut', now = new Date()) => new Intl.DateTimeFormat('en-CA', {timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
export const cents = value => Math.round(Number(value) * 100);
export function balances(entries,display='USD') {
  return entries.filter(e=>!e.voided_on).reduce((a,e) => {
    const amount = entryCents(e,display), saved = entryCents(e,display,'saved');
    if(e.type === 'income') { a.available += amount-saved; a.savings += saved; }
    if(e.type === 'opening') a.savings += amount;
    if(e.type === 'expense') a.available -= amount;
    if(e.type === 'withdrawal') {a.savings -= amount; a.available += amount;}
    return a;
  }, {available:0,savings:0});
}
export function checkEntry(entry, entries) {
  const currency=currencyOf(entry),b=balances(nativeEntries(entries,currency),currency);
  if(cents(entry.saved || 0)>cents(entry.amount)) throw new Error('Savings allocation cannot exceed income.');
  if(entry.type==='withdrawal' && !entry.note?.trim()) throw new Error('Please explain why you are withdrawing savings.');
  if(entry.type==='withdrawal' && cents(entry.amount)>b.savings) throw new Error('This withdrawal exceeds your savings balance.');
  if(entry.type==='expense' && cents(entry.amount)>b.available) throw new Error('Insufficient spending balance in this currency. Record income or a savings withdrawal in the same currency first.');
}
export function nextRenewal(date, cycle) {
  const d=new Date(date+'T12:00:00Z');
  if(cycle==='weekly') d.setUTCDate(d.getUTCDate()+7);
  else {const day=d.getUTCDate(); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth()+(cycle==='yearly'?12:1)); const last=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate(); d.setUTCDate(Math.min(day,last));}
  return supportedDate(d);
}
export function daysUntil(date, current=today()) {return Math.round((Date.parse(date)-Date.parse(current))/86400000);}
export const DEFAULT_TASK_CATEGORIES=['Personal','Work','Learning','Health','Finance','Home'];
export const taskCategory=task=>task.category?.trim()||'Personal';
export function taskCategorySummary(tasks) {
  const groups=new Map();
  for(const task of tasks){
    const category=taskCategory(task);
    const group=groups.get(category)||{category,total:0,completed:0,pending:0,percent:0};
    group.total++;if(task.completed)group.completed++;else group.pending++;
    group.percent=Math.round(group.completed/group.total*100);groups.set(category,group);
  }
  return [...groups.values()].sort((a,b)=>b.total-a.total||a.category.localeCompare(b.category));
}
export function periodSummary(data,start,end,display='USD') {
  const entries=data.entries.filter(e=>!e.voided_on&&e.date>=start&&e.date<=end);
  const sum=type=>entries.filter(e=>e.type===type).reduce((s,e)=>s+entryCents(e,display),0);
  const tasks=data.tasks.filter(t=>t.due>=start&&t.due<=end);
  return {income:sum('income'),spent:sum('expense'),withdrawn:sum('withdrawal'),saved:entries.filter(e=>e.type==='income').reduce((s,e)=>s+entryCents(e,display,'saved'),0),tasks,completed:tasks.filter(t=>t.completed).length,taskCategories:taskCategorySummary(tasks)};
}
