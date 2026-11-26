import React,{useState} from 'react';
import {balances} from '../../../shared/domain.js';
import {nativeEntries,formatMoney,currencyCatalog,currencyOf,entryCents} from '../../../shared/currency.js';
import {ValueChart} from './FinanceCharts.jsx';
import {monthlyMoney} from '../../../shared/monthly-money.js';
import {workspaceText} from '../lib/workspace-text.js';

export function TodayMoneySummary({data,end,language,children}){
 const t=workspaceText(language);
 const month=monthlyMoney(data,end).at(-1);
 const limit=month?.limit,spent=month?.expenses;
 const hasBudget=limit!==null&&Number.isFinite(limit)&&Number.isFinite(spent);
 const currency=data.settings?.home_currency||'USD';
 const available=balances(data.entries.filter(entry=>entry.date<=end),currency).available;
 return <div className="today-money-summary">
  {children}
  <section className="card today-money-stat">
   <h3>{t('Left this month')}</h3>
   <strong><bdi>{hasBudget?formatMoney(limit-spent):t(limit===null?'No monthly budget':'Unavailable')}</bdi></strong>
   {hasBudget&&<><progress max={Math.max(1,limit)} value={Math.min(spent,Math.max(1,limit))} aria-label={t('Monthly budget used')}/><small>{t('Monthly budget used')}</small></>}
  </section>
  <section className="card today-money-stat">
   <h3>{t('Cash available')}</h3>
   <strong><bdi>{Number.isFinite(available)?formatMoney(available,currency,currencyCatalog(data.settings)):t('Unavailable')}</bdi></strong>
  </section>
 </div>;
}

export function SpendingBalance({data,end,language}) {
 const t=workspaceText(language);
 const [open,setOpen]=useState(false);
 const catalog=currencyCatalog(data.settings);
 const display=data.settings?.home_currency||'USD';
 const all=data.entries.filter(entry=>!entry.voided_on&&entry.date<=end&&entry.type!=='opening');
 const balance=balances(all,display);
 const codes=all.length?[...new Set(all.map(currencyOf))]:[display];
 const native=Object.fromEntries(codes.map(code=>[code,balances(nativeEntries(all,code),code).available]));
 const byCurrency=codes.map(code=>formatMoney(native[code],code,catalog));
 const converts=codes.some(code=>code!==display);
 const formatted=amount=>formatMoney(amount,display,catalog);
 const spendingRows=[
  ['Income received','income','amount',1],
  ['Income set aside as savings','income','saved',-1],
  ['Withdrawn from savings','withdrawal','amount',1],
  ['Expenses','expense','amount',-1],
 ].map(([name,type,field,sign])=>({
  name,value:sign*all.filter(entry=>entry.type===type).reduce((sum,entry)=>sum+entryCents(entry,display,field),0),
  color:`var(--${field==='saved'||type==='withdrawal'?'savings':type==='expense'?'expense':'income'})`,
 }));
 return <details className="spending-breakdown" onToggle={event=>setOpen(event.currentTarget.open)}>
  <summary>
   <span className="balance-hero-label">{t('Safe to spend today')}</span>
   <strong className="balance-hero-value"><bdi>{byCurrency.length===1?byCurrency[0]:formatted(balance.available)}</bdi></strong>
   {byCurrency.length>1&&<span className="spending-currencies">{byCurrency.join(' · ')}</span>}
   <span className="balance-hero-pill">{t('See breakdown')}</span>
  </summary>
  <p>{t('Balance through {date}. Spending is tracked separately in each currency.',{date:end})}</p>
  {converts&&<p>{t('Combined estimate ({currency}): {amount}. Uses saved exchange rates.',{currency:display,amount:formatted(balance.available)})}</p>}
  <dl>{spendingRows.map(({name,value})=><div key={name}>
   <dt>{t(name)}</dt><dd><bdi>{formatted(value)}</bdi></dd>
  </div>)}</dl>
  {open&&<div className="finance-detail-chart"><ValueChart data={spendingRows} label="Amount" format={formatted}/></div>}
  <p>{t('Opening savings enter this balance when withdrawn. Reversed entries are excluded.')}</p>
 </details>;
}
