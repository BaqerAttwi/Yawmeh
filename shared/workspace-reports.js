import {hasAccess} from './access.js';
import {currencyOf,entryCents} from './currency.js';
import {daySchema} from './daily.js';
import {balances,cents,daysUntil,taskCategory} from './domain.js';
import {annualCost,savingsForecast} from './insights.js';
import {addDays,calendarEvents,weekStart} from './planner.js';

export const workspaceReports=[
 {id:'comparison',area:'money',title:'Income and spending',description:'Compare this period with the preceding period of the same length.'},
 {id:'cash-flow',area:'money',title:'Monthly cash flow',description:'Recorded income, expenses, and movements between spending and savings.'},
 {id:'balances',area:'money',title:'Balances by currency',description:'Spending, savings, and combined balances in their original currencies.'},
 {id:'income',area:'money',title:'Income by source',description:'Income sources and the amount allocated to savings.'},
 {id:'expenses',area:'money',title:'Expenses by category',description:'Spending totals and the number of purchases in each category.'},
 {id:'transactions',area:'money',title:'Transaction register',description:'Recorded income, expenses, opening savings, and withdrawals.'},
 {id:'budgets',area:'money',title:'Budget performance',description:'Budget limits and recorded spending over each budget’s own period, through the report date.'},
 {id:'goals',area:'money',title:'Savings goals',description:'Reserved amounts, remaining targets, and projections at the planned contribution.'},
 {id:'goal-activity',area:'money',title:'Goal activity',description:'Savings assigned to or released from goals.'},
 {id:'subscriptions',area:'money',title:'Subscription costs',description:'Current plans and estimated yearly cost for active subscriptions.'},
 {id:'items',area:'money',title:'Saved item prices',description:'Current prices and categories for reusable purchase items.'},
 {id:'renewals',area:'money',title:'Renewal schedule',description:'Upcoming renewals from current plans, including projected recurring dates.'},
 {id:'reversals',area:'money',title:'Transaction reversals',description:'Entries corrected during the period, listed by reversal date.'},
 {id:'task-categories',area:'tasks',title:'Tasks by category',description:'Completion and overdue counts for tasks due during the period.'},
 {id:'tasks',area:'tasks',title:'Task register',description:'Tasks due during the period, including cancelled tasks.'},
 {id:'completions',area:'tasks',title:'Completion history',description:'Tasks completed during the period, measured by their completion date.'},
 {id:'workload',area:'tasks',title:'Open workload',description:'Remaining tasks by due date and priority, with known estimates and missing estimates.'},
 {id:'check-ins',area:'tasks',title:'Daily check-ins',description:'Energy ratings, day closures, and saved reflections.'},
];

export const reportsFor=user=>workspaceReports.filter(report=>hasAccess(user,report.area));
export const validReportRange=(start,end)=>daySchema.safeParse(start).success&&daySchema.safeParse(end).success&&start<=end&&daysUntil(end,start)<=3659;

export function reportPreset(preset,current){
 const month=current.slice(0,7)+'-01';
 if(preset==='last-month'){
  const end=addDays(month,-1);
  return {start:end.slice(0,7)+'-01',end};
 }
 if(preset==='next-30')return {start:current,end:addDays(current,29)};
 const starts={today:current,week:weekStart(current),month,
  quarter:current.slice(0,4)+'-'+String(Math.floor((Number(current.slice(5,7))-1)/3)*3+1).padStart(2,'0')+'-01',
  year:current.slice(0,4)+'-01-01'};
 return {start:starts[preset]||month,end:current};
}

const types={income:'Income',expense:'Expense',opening:'Opening savings',withdrawal:'Savings withdrawal'};
const inRange=(date,start,end)=>!!date&&date>=start&&date<=end;
const groupBy=(rows,key)=>{
 const groups=new Map();
 for(const row of rows){
  const value=key(row);
  if(!groups.has(value))groups.set(value,[]);
  groups.get(value).push(row);
 }
 return [...groups];
};
const sortedBy=(rows,key)=>[...rows].sort((a,b)=>String(key(a)||'').localeCompare(String(key(b)||'')));
const amount=(label,currency)=>({label,currency});
const result=(columns,rows,note)=>({columns:columns.map(column=>typeof column==='string'?{label:column}:column),rows,note});
const total=(entries,currency,field='amount')=>entries.reduce((sum,entry)=>sum+entryCents(entry,currency,field),0);

function cashFlow(entries,currency){
 const byType=Object.fromEntries(groupBy(entries,entry=>entry.type));
 const income=total(byType.income||[],currency),expenses=total(byType.expense||[],currency);
 const saved=total(byType.income||[],currency,'saved'),withdrawn=total(byType.withdrawal||[],currency);
 const opening=total(byType.opening||[],currency);
 return {income,expenses,net:income-expenses,saved,withdrawn,opening,spendingChange:income-expenses-saved+withdrawn};
}

export function buildWorkspaceReport(id,data,user,{start,end,current,currency='USD'}){
 const report=reportsFor(user).find(row=>row.id===id);
 if(!report||!validReportRange(start,end))return null;
 const asOf=end<current?end:current;
 if(report.area==='tasks')return tasksReport(id,data,start,end,current);

 const allEntries=data.entries||[];
 const recorded=allEntries.filter(entry=>!entry.voided_on&&entry.date<=current);
 const period=recorded.filter(entry=>inRange(entry.date,start,end));
 const money=label=>amount(label,currency);
 const historical='Recorded through '+asOf+'. Converted figures use each transaction’s saved rate. An unavailable amount indicates a missing historical rate.';
 switch(id){
  case 'comparison': {
   const length=daysUntil(end,start)+1;
   const previousEnd=daysUntil(start,'1000-01-01')>0?addDays(start,-1):null;
   const previousStart=daysUntil(start,'1000-01-01')>=length?addDays(start,-length):null;
   const previous=previousStart?cashFlow(recorded.filter(entry=>inRange(entry.date,previousStart,previousEnd)),currency):null;
   const flow=cashFlow(period,currency);
   const fields=[['Income','income'],['Expenses','expenses'],['Income less expenses','net'],['Income allocated to savings','saved'],['Savings withdrawn','withdrawn'],['Change in spending balance','spendingChange']];
   return result(['Measure',money('Selected period'),money('Previous period'),money('Change')],fields.map(([label,key])=>[label,flow[key],previous?.[key]??null,previous?flow[key]-previous[key]:null]),[previous?('Previous period '+previousStart+' to '+previousEnd+'.'):'Previous period unavailable.',historical].join(' '));
  }
  case 'cash-flow':
   return result(['Month',money('Income'),money('Expenses'),money('Net income'),money('Saved from income'),money('Savings withdrawals'),money('Opening savings'),money('Spending balance change')],
    groupBy(period,e=>e.date.slice(0,7)).sort(([a],[b])=>a.localeCompare(b)).map(([month,entries])=>{
     const flow=cashFlow(entries,currency);
     return [month,flow.income,flow.expenses,flow.net,flow.saved,flow.withdrawn,flow.opening,flow.spendingChange];
    }),historical);
  case 'balances': {
   const byCurrency=groupBy(recorded.filter(entry=>entry.date<=asOf),currencyOf);
   return result(['Currency',{label:'Spending',native:true},{label:'Savings',native:true},{label:'Total',native:true}],
    byCurrency.sort(([a],[b])=>a.localeCompare(b)).map(([code,entries])=>{
     const balance=balances(entries,code);
     return [code,balance.available,balance.savings,balance.available+balance.savings];
    }),'Balances as of '+asOf+'. Opening savings and transfers are included.');
  }
  case 'income':
  case 'expenses': {
   const income=id==='income';
   const rows=groupBy(period.filter(entry=>entry.type===(income?'income':'expense')),
    entry=>(income?entry.title:entry.category)||'Other').map(([name,entries])=>{
     const value=total(entries,currency);
     return income?[name,entries.length,value,total(entries,currency,'saved')]:[name,entries.length,value];
    });
   rows.sort((a,b)=>(Number.isFinite(b[2])?b[2]:-Infinity)-(Number.isFinite(a[2])?a[2]:-Infinity)||String(a[0]).localeCompare(String(b[0])));
   return result(income?['Source','Transactions',money('Income'),money('Saved')]:['Category','Transactions',money('Expenses')],rows,historical);
  }
  case 'transactions':
   return result(['Date','Description','Type','Category','Currency',{label:'Original amount',native:4},{label:'Original saved',native:4},money('Report amount')],
    sortedBy(period,e=>e.date).reverse().map(e=>[e.date,e.title,types[e.type],e.category,currencyOf(e),cents(e.amount),cents(e.saved||0),entryCents(e,currency)]),historical);
  case 'budgets':
   return result(['Budget','Starts','Ends',amount('Limit','USD'),amount('Spent','USD'),amount('Remaining','USD'),'Used'],
    sortedBy((data.budgets||[]).filter(b=>b.start<=end&&b.end>=start),b=>b.start).map(b=>{
     const spent=total(recorded.filter(e=>e.type==='expense'&&inRange(e.date,b.start,b.end)&&e.date<=asOf),'USD');
     const limit=cents(b.amount);
     return [b.title,b.start,b.end,limit,spent,limit-spent,Number.isFinite(spent)&&limit>0?Math.round(spent/limit*100)+'%':null];
    }),historical);
  case 'goals':
   return result(['Goal','Target date',amount('Target','USD'),amount('Reserved','USD'),amount('Remaining','USD'),amount('Monthly plan','USD'),'Estimated finish'],
    sortedBy(data.goals||[],g=>g.title).map(goal=>{
     const progress=savingsForecast(goal,(data.goal_moves||[]).filter(move=>move.date<=asOf),goal.monthly_amount,asOf);
     return [goal.title,goal.target_date,cents(goal.target_amount),progress.saved,progress.remaining,cents(goal.monthly_amount||0),progress.remaining?progress.finish:'Reached'];
    }),'Balances as of '+asOf+'. Forecasts use the current plan and assume regular contributions.');
  case 'goal-activity': {
   const goals=new Map((data.goals||[]).map(goal=>[String(goal.id),goal.title]));
   return result(['Date','Goal','Activity',amount('Amount','USD'),'Note'],
    sortedBy((data.goal_moves||[]).filter(move=>inRange(move.date,start,asOf)),move=>move.date).reverse()
     .map(move=>[move.date,goals.get(String(move.goal_id))||'Goal',move.kind==='release'?'Released':'Assigned',cents(move.amount),move.note]));
  }
  case 'subscriptions': {
   const rows=sortedBy(data.subscriptions||[],s=>s.renewal);
   const annual=rows.filter(s=>s.active).reduce((sum,s)=>sum+annualCost(s),0);
   return result(['Subscription','Status','Billing cycle','Next renewal',amount('Plan amount','USD'),amount('Annual estimate','USD'),'Usage'],
    rows.map(s=>[s.title,s.active?'Active':'Paused',s.cycle,s.renewal,cents(s.amount),s.active?annualCost(s):null,s.rarely_used?'Rarely used':'—']),
    'Current plans across all dates. Estimated yearly cost for active plans: '+(annual/100).toLocaleString('en-US',{style:'currency',currency:'USD'})+'.');
  }
  case 'renewals': {
   const forecastStart=start>current?start:current;
   const rows=forecastStart>end?[]:calendarEvents({subscriptions:data.subscriptions||[]},forecastStart,end);
   return result(['Date','Subscription','Schedule',amount('Planned amount','USD')],
    rows.map(event=>[event.date,event.title,event.projected?'Projected':'Next recorded renewal',cents(event.amount)]),
    'Forecasts start on '+forecastStart+'. Past-due renewals remain visible in Subscription costs. Planned amounts are estimates.');
  }
  case 'items':
   return result(['Saved item','Category',amount('Current price','USD')],
    sortedBy(data.items||[],item=>item.title).map(item=>[item.title,item.category,cents(item.amount)]),'Current saved items across all dates.');
  case 'reversals':
   return result(['Reversed on','Original date','Description','Type','Currency',{label:'Original amount',native:4},'Reason'],
    sortedBy(allEntries.filter(e=>inRange(e.voided_on?.slice(0,10),start,asOf)),e=>e.voided_on).reverse()
     .map(e=>[e.voided_on.slice(0,10),e.date,e.title,types[e.type],currencyOf(e),cents(e.amount),e.void_reason]));
  default:return null;
 }
}

function tasksReport(id,data,start,end,current){
 if(id==='check-ins')return result(['Date','Energy','Day status','What went well','What would help tomorrow'],
  sortedBy((data.day_plans||[]).filter(plan=>inRange(plan.date,start,end)),plan=>plan.date).reverse()
   .map(plan=>[plan.date,plan.energy,plan.closed_at?'Closed':'Open',plan.went_well,plan.tomorrow_help]));
 const tasks=(data.tasks||[]).filter(task=>!task.cancelled);
 const due=tasks.filter(task=>inRange(task.due,start,end));
 const outstanding=due.filter(task=>!task.completed);
 if(id==='task-categories')return result(['Category','Due','Completed','Open','Overdue'],
  groupBy(due,taskCategory).sort(([a],[b])=>a.localeCompare(b)).map(([category,rows])=>{
   const open=rows.filter(task=>!task.completed);
   return [category,rows.length,rows.length-open.length,open.length,open.filter(task=>task.due<current).length];
  }),'Status reflects the current task records.');
 if(id==='workload')return result(['Due date','Priority','Open tasks','Estimated minutes','Without estimate'],
  groupBy(sortedBy(outstanding,task=>task.due),task=>task.due+'|'+task.priority).map(([,rows])=>
   [rows[0].due,rows[0].priority,rows.length,rows.reduce((sum,task)=>sum+Number(task.estimate_minutes||0),0),rows.filter(task=>!task.estimate_minutes).length]));
 if(id==='completions')return result(['Completed on','Task','Category','Due date','Timing'],
  sortedBy(tasks.filter(task=>task.completed&&inRange(task.completed_on,start,end)),task=>task.completed_on).reverse()
   .map(task=>[task.completed_on,task.title,taskCategory(task),task.due,task.completed_on<=task.due?'On time':'Late']));
 const cancelled=(data.cancelled_tasks||[]).filter(task=>inRange(task.due,start,end));
 const cancelledTasks=new Set(cancelled);
 return result(['Due date','Task','Category','Priority','Status','Estimated minutes','Completed on'],
  sortedBy([...due,...cancelled],task=>task.due).map(task=>[task.due,task.title,taskCategory(task),task.priority,
   cancelledTasks.has(task)?'Cancelled':task.completed?'Completed':task.due<current?'Overdue':'Open',task.estimate_minutes||null,task.completed_on]));
}

export function workspaceReportCsv(report){
 const escape=value=>{
  if(value==null)return '';
  if(typeof value==='number')return Number.isFinite(value)?String(value):'';
  const safe=/^\s*[=+\-@]|^[\t\r\n]/u.test(value.normalize('NFKC'))?"'"+value:value;
  return '"'+safe.replaceAll('"','""')+'"';
 };
 return [report.columns.map(column=>escape(column.label+(column.currency?' ('+column.currency+')':''))),
  ...report.rows.map(row=>row.map((value,index)=>{
   const column=report.columns[index];
   return escape(typeof value==='number'&&(column.currency||column.native)?value/100:value);
  }))].map(row=>row.join(',')).join('\r\n');
}
