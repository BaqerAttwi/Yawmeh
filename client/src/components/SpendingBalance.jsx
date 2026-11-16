import React from 'react';
import {balances} from '../../../shared/domain.js';
import {nativeEntries,formatMoney,currencyCatalog,currencyOf,entryCents} from '../../../shared/currency.js';

export function SpendingBalance({data,end}) {
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
 ];
 return <details className="spending-breakdown">
  <summary>
   <strong>{byCurrency.length===1?`${byCurrency[0]} available to spend`:'Available to spend'}</strong>
   {byCurrency.length>1&&<span className="spending-currencies">{byCurrency.join(' · ')}</span>}
   <span>See breakdown</span>
  </summary>
  <p>Balance through {end}. Spending is tracked separately in each currency.</p>
  {converts&&<p>Combined estimate ({display}): {formatted(balance.available)}. Uses saved exchange rates.</p>}
  <dl>{spendingRows.map(([label,type,field,sign])=><div key={label}>
   <dt>{label}</dt><dd>{formatted(sign*all.filter(entry=>entry.type===type).reduce((sum,entry)=>sum+entryCents(entry,display,field),0))}</dd>
  </div>)}</dl>
  <p>Opening savings enter this balance when withdrawn. Reversed entries are excluded.</p>
 </details>;
}
