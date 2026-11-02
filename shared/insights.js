import {nativeEntries,currencyOf} from './currency.js';
import {balances,cents,periodSummary,today} from './domain.js';
import {goalBalance,reservedSavings,PlannerError} from './planner.js';
export function budgetAlerts(data,date=today()) {
  return data.budgets.filter(b=>b.start<=date&&b.end>=date).map(b=>{
    const spent=periodSummary(data,b.start,b.end).spent,limit=cents(b.amount);
    return {...b,spent,limit,percent:Math.round(spent/limit*100),level:spent>=limit?'urgent':spent*100>=limit*80?'warning':'normal'};
  });
}
export function savingsForecast(goal,moves,monthly=goal.monthly_amount||0,date=today()) {
  const saved=goalBalance(moves,goal.id),remaining=Math.max(0,cents(goal.target_amount)-saved),contribution=cents(monthly);
  const months=remaining===0?0:contribution>0?Math.ceil(remaining/contribution):null;
  let finish=null;
  if(months!==null&&months<=1200){const d=new Date(date+'T12:00:00Z');const day=d.getUTCDate();d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+months);d.setUTCDate(Math.min(day,new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate()));finish=d.toISOString().slice(0,10);}
  return {saved,remaining,months,finish};
}
export const annualCost=s=>cents(s.amount)*(s.cycle==='weekly'?52:s.cycle==='monthly'?12:1);
export function checkVoid(entries,moves,id,reason) {
  const entry=entries.find(e=>String(e.id)===String(id));
  if(!entry)throw new PlannerError('Transaction not found.',404);
  if(entry.voided_on)throw new PlannerError('This transaction was already reversed.',409);
  if(!reason?.trim())throw new PlannerError('Explain the correction for your history.');
  const remaining=entries.filter(e=>e!==entry),after=balances(nativeEntries(remaining,'USD'));
  const negative=[...new Set(entries.map(currencyOf))].some(c=>{const b=balances(nativeEntries(remaining,c),c);return b.available<0||b.savings<0;});
  if(negative||after.available<0||after.savings<reservedSavings(moves))throw new PlannerError('This correction would use money already spent or reserved. Correct dependent transactions or release goal savings first.');
  return entry;
}
