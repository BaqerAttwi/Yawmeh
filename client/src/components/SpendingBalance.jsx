import React,{useState} from 'react';
import {balances} from '../../../shared/domain.js';
import {nativeEntries,formatMoney,currencyCatalog,currencyOf,entryCents} from '../../../shared/currency.js';
import {ValueChart} from './FinanceCharts.jsx';

export function SpendingBalance({data,end}) {
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
   <span className="balance-hero-label">Safe to spend today</span>
   <strong className="balance-hero-value"><bdi>{byCurrency.length===1?byCurrency[0]:formatted(balance.available)}</bdi></strong>
   {byCurrency.length>1&&<span className="spending-currencies">{byCurrency.join(' · ')}</span>}
   <span className="balance-hero-pill">See breakdown</span>
  </summary>
  <p>Balance through {end}. Spending is tracked separately in each currency.</p>
  {converts&&<p>Combined estimate ({display}): {formatted(balance.available)}. Uses saved exchange rates.</p>}
  <dl>{spendingRows.map(({name,value})=><div key={name}>
   <dt>{name}</dt><dd>{formatted(value)}</dd>
  </div>)}</dl>
  {open&&<div className="finance-detail-chart"><ValueChart data={spendingRows} label="Amount" format={formatted}/></div>}
  <p>Opening savings enter this balance when withdrawn. Reversed entries are excluded.</p>
 </details>;
}
