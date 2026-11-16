import React from 'react';
import {balances} from '../../../shared/domain.js';
import {nativeEntries,formatMoney,currencyCatalog,currencyOf,entryCents} from '../../../shared/currency.js';

export function SpendingBalance({data,end}) {
 const catalog=currencyCatalog(data.settings);
 const display=data.settings?.home_currency||'USD';
 const all=data.entries.filter(entry=>!entry.voided_on&&entry.date<=end);
 const balance=balances(all,display);
 const codes=[...new Set([display,...all.map(currencyOf)])];
 const native=Object.fromEntries(codes.map(code=>[code,balances(nativeEntries(all,code),code).available]));
 const formatted=amount=>(Number.isFinite(amount)?'≈ ':'')+formatMoney(amount,display,catalog);
 const spendingRows=[
  ['Income received','income','amount',1],
  ['Income set aside as savings','income','saved',-1],
  ['Withdrawn from savings','withdrawal','amount',1],
  ['Expenses','expense','amount',-1],
 ];
 return <details className="spending-breakdown">
  <summary><strong>{formatted(balance.available)} available to spend</strong><span>See breakdown</span></summary>
  <p>Balance through {end}. Combined totals use saved exchange rates.</p>
  <dl>{spendingRows.map(([label,type,field,sign])=><div key={label}>
   <dt>{label}</dt><dd>{formatted(sign*all.filter(entry=>entry.type===type).reduce((sum,entry)=>sum+entryCents(entry,display,field),0))}</dd>
  </div>)}</dl>
  <p>By currency: {codes.filter(code=>native[code]!==0||code===display).map(code=>formatMoney(native[code],code,catalog)).join(' + ')}</p>
  <p>Opening savings enter this balance when withdrawn. Reversed entries are excluded.</p>
 </details>;
}
