import {currencyCatalog,currencyOf,entryCents,formatMoney} from '../../../../shared/currency.js';
import {taskCategory} from '../../../../shared/domain.js';
import {buildWorkspaceReport,workspaceOverview} from '../../../../shared/workspace-reports.js';

const cleanLabel=value=>String(value||'Other').replace(/[\p{Cc}\p{Cf}]/gu,' ').replace(/\s+/g,' ').trim()||'Other';
const label=value=>cleanLabel(value).slice(0,90);
const nameKey=value=>cleanLabel(value).normalize('NFKC').toLowerCase();
const inPeriod=(date,start,end)=>date&&date>=start&&date<=end;

function moneyEvidence(data,user,range,overview,display,catalog){
 const {income,expenses,net}=overview;
 const {start,end,current,currency}=range;
 const evidence=[{id:'totals',detail:`Recorded income ${display(income)}; spending ${display(expenses)}; difference ${display(net)}.`}];
 const purchases=(data.entries||[]).filter(entry=>entry.type==='expense'&&!entry.voided_on&&inPeriod(entry.date,start,end)&&entry.date<=current);
 const groups=new Map();
 let largest;
 for(const purchase of purchases){
  const amount=entryCents(purchase,currency);
  if(amount>0&&(!largest||amount>largest.amount))largest={purchase,amount};
  const code=currencyOf(purchase),nativeAmount=entryCents(purchase,code);
  if(!(nativeAmount>0))continue;
  const name=label(purchase.title);
  const key=JSON.stringify([nameKey(purchase.title),nameKey(purchase.category),code]);
  const price={amount:nativeAmount,date:purchase.date};
  const group=groups.get(key);
  if(group){
   group.count++;
   group.total+=nativeAmount;
   if(nativeAmount<group.low.amount)group.low=price;
   if(nativeAmount>group.high.amount)group.high=price;
  }else groups.set(key,{name,code,count:1,total:nativeAmount,low:price,high:price});
 }
 const repeat=[...groups.values()].filter(group=>group.count>1).sort((a,b)=>b.count-a.count);
 const compared=repeat.filter(group=>group.low.amount<group.high.amount).slice(0,3);
 for(const [index,{name,code,count,total,low,high}] of compared.entries()){
  const money=value=>formatMoney(value,code,catalog);
  evidence.push({id:`price-${index+1}`,detail:`“${name}” appeared on ${count} purchases totaling ${money(total)}. Lowest recorded purchase: ${money(low.amount)} on ${low.date}; highest: ${money(high.amount)} on ${high.date}. The amounts are per purchase, and quantities may differ.`});
 }
 for(const [index,{name,code,count,total}] of repeat.filter(group=>!compared.includes(group)).slice(0,2).entries()){
  evidence.push({id:`repeat-${index+1}`,detail:`“${name}” appeared on ${count} purchases totaling ${formatMoney(total,code,catalog)}.`});
 }
 if(largest){
  const {purchase,amount}=largest;
  evidence.push({id:'largest',detail:`Largest purchase with a known report-currency value: “${label(purchase.title)}” on ${purchase.date} for ${display(amount)}.`});
 }
 const categories=buildWorkspaceReport('expenses',data,user,range).rows.filter(([, ,amount])=>Number.isFinite(amount)&&amount>0).slice(0,3);
 for(const [index,[name,count,amount]] of categories.entries()){
  evidence.push({id:`category-${index+1}`,detail:`“${label(name)}” accounted for ${display(amount)} across ${count} purchases.`});
 }
 return evidence;
}

export function reportEvidence(area,data,user,selected,current){
 const currency=data.settings?.home_currency||'USD',catalog=currencyCatalog(data.settings);
 const range={...selected,current,currency};
 const overview=workspaceOverview(area,data,user,range);
 if(area==='money')return moneyEvidence(data,user,range,overview,value=>formatMoney(value,currency,catalog),catalog);

 const evidence=[{id:'totals',detail:`${overview.completed} tasks completed during the period. ${overview.open} tasks due in the period are still open, including ${overview.overdue} overdue.`}];
 const open=(data.tasks||[]).filter(task=>!task.completed&&!task.cancelled&&inPeriod(task.due,selected.start,selected.end));
 const dueDates=new Map(),categories=new Map();
 for(const task of open){
  dueDates.set(task.due,(dueDates.get(task.due)||0)+1);
  const category=taskCategory(task);
  categories.set(category,(categories.get(category)||0)+1);
 }
 const busiest=[...dueDates].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))[0];
 if(busiest)evidence.push({id:'due-date',detail:`${busiest[0]} has ${busiest[1]} tasks still open, the most on any due date in the period.`});
 const category=[...categories].sort((a,b)=>b[1]-a[1])[0];
 if(category)evidence.push({id:'category',detail:`“${label(category[0])}” has ${category[1]} tasks still open.`});
 if(open.length){
  const minutes=open.reduce((total,task)=>total+Number(task.estimate_minutes||0),0);
  const missing=open.filter(task=>!task.estimate_minutes).length;
  evidence.push({id:'time',detail:`Known estimates total ${minutes} minutes. ${missing} open tasks have no estimate.`});
 }
 return evidence;
}
