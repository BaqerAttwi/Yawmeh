import {balances,cents,periodSummary} from './domain.js';
import {weekStart,addDays} from './planner.js';
import {hasAccess} from './access.js';

export function companionSummary(data,user,date,period='day') {
 const start=period==='week'?weekStart(date):date,end=period==='week'?addDays(start,6):date;
 const money=hasAccess(user,'money'),tasks=hasAccess(user,'tasks');
 const summary=periodSummary({entries:money?data.entries:[],tasks:tasks?data.tasks:[]},start,end);
 const pending=summary.tasks.filter(t=>!t.completed);
 return {start,end,money,tasks,completed:summary.completed,total:summary.tasks.length,
  minutes:pending.reduce((sum,t)=>sum+Number(t.estimate_minutes||0),0),next:pending.slice().sort((a,b)=>a.due.localeCompare(b.due))[0]?.title,
  spent:summary.spent,saved:summary.saved,withdrawn:summary.withdrawn,
  savings:money?balances(data.entries).savings:0,
  monthlyPlan:money?(data.goals||[]).reduce((sum,g)=>sum+cents(g.monthly_amount||0),0):0};
}
