import React,{useState} from 'react';
import {balances,periodSummary} from '../../../shared/domain.js';
import {nativeEntries,formatMoney,currencyCatalog,currencyLabel,currencyOf,entryCents} from '../../../shared/currency.js';
export function CurrencyReport({data,start,end,currency,onCurrency,filtered=false,explainAvailable=false}) {
 const catalog=currencyCatalog(data.settings),codes=[...new Set([...catalog.map(c=>c.code),...data.entries.map(currencyOf)])];
 const [local,setLocal]=useState(data.settings?.home_currency||'USD'),display=currency||local,setDisplay=onCurrency||setLocal;
 const all=data.entries.filter(e=>!e.voided_on&&e.date<=end),summary=periodSummary(data,start,end,display),balance=balances(all,display);
 const native=Object.fromEntries(codes.map(c=>[c,{...periodSummary({...data,entries:nativeEntries(data.entries,c)},start,end,c),...balances(nativeEntries(all,c),c)}]));
 const values={...summary,...balance};
 const formatted=amount=>(Number.isFinite(amount)?'≈ ':'')+formatMoney(amount,display,catalog);
 const spendingRows=[
  ['Income received','income','amount',1],
  ['Income set aside as savings','income','saved',-1],
  ['Withdrawn from savings','withdrawal','amount',1],
  ['Expenses','expense','amount',-1],
 ];
 const spendingBreakdown=<details className="spending-breakdown">
  <summary><small>Available to spend</small><strong>{formatted(balance.available)}</strong><span>See breakdown</span></summary>
  <p>Balance through {end}. This includes entries before the selected range.</p>
  <dl>{spendingRows.map(([label,type,field,sign])=><div key={label}>
   <dt>{label}</dt><dd>{formatted(sign*all.filter(entry=>entry.type===type).reduce((sum,entry)=>sum+entryCents(entry,display,field),0))}</dd>
  </div>)}</dl>
  <p>By currency: {codes.filter(code=>native[code].available!==0||code===display).map(code=>formatMoney(native[code].available,code,catalog)).join(' + ')}</p>
  <p>Opening savings enter this balance when withdrawn. Reversed entries are excluded.</p>
 </details>;
 return <section className="card currency-report"><div className="currency-report-heading"><div><h3>Money report</h3><p>{start} through {end} · {filtered?'balance effect of matching records':'balances as of '+end}</p></div><label className="field"><span>Report currency</span><select aria-label="Report currency" value={display} onChange={e=>setDisplay(e.target.value)}>{catalog.map(c=><option key={c.code} value={c.code}>{currencyLabel(c)}</option>)}</select></label></div><p className="form-hint">Combined totals are approximate, using each entry’s saved rate. Native balances stay separate. Missing historical rates make the affected total unavailable.</p><div className="currency-report-grid">{[['available','Spending balance'],['savings','Savings balance'],['income','Income in period'],['spent','Spent in period'],['saved','Income saved'],['withdrawn','Savings withdrawals']].map(([key,label])=>key==='available'&&explainAvailable?<div key={key}>{spendingBreakdown}</div>:<div key={key}><small>{label}</small><strong>{Number.isFinite(values[key])?'≈ ':''}{formatMoney(values[key],display,catalog)}</strong><span>{codes.filter(c=>native[c][key]!==0||c===display).map(c=>formatMoney(native[c][key],c,catalog)).join(' + ')}</span></div>)}</div></section>;
}
