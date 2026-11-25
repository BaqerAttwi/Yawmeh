import {entryCents} from './currency.js';
import {cents} from './domain.js';

export function monthlyMoney(data,current,rangeEnd=current){
  const anchor=rangeEnd&&rangeEnd<current?rangeEnd:current;
  const last=Number(anchor.slice(0,4))*12+Number(anchor.slice(5,7))-1;
  const months=new Map();
  for(let index=Math.max(1000*12,last-5);index<=last;index++){
    const year=Math.floor(index/12),month=index%12+1;
    const key=`${year}-${String(month).padStart(2,'0')}`;
    const lastDay=new Date(Date.UTC(year,month,0)).getUTCDate();
    months.set(key,{key,start:key+'-01',end:key+'-'+lastDay,expenses:0,savings:0,budget:null});
  }
  for(const entry of data.entries){
    if(entry.voided_on||entry.date>current)continue;
    const month=months.get(entry.date.slice(0,7));
    if(!month)continue;
    if(entry.type==='expense')month.expenses+=entryCents(entry,'USD');
    if(entry.type==='income')month.savings+=entryCents(entry,'USD','saved');
  }
  for(const budget of data.budgets){
    const month=months.get(budget.start.slice(0,7));
    // Both the workspace snapshot and demo list order budgets newest first.
    if(month&&!month.budget&&budget.start===month.start&&budget.end===month.end)month.budget=budget;
  }
  return [...months.values()].map(month=>({...month,limit:month.budget?cents(month.budget.amount):null}));
}
