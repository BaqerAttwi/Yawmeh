import React,{useState} from 'react';
import {balances,periodSummary} from '../../../shared/domain.js';
import {nativeEntries,formatMoney,currencyCatalog,currencyLabel,currencyOf} from '../../../shared/currency.js';
export function CurrencyReport({data,start,end,currency,onCurrency,filtered=false}) {
 const catalog=currencyCatalog(data.settings),codes=[...new Set([...catalog.map(c=>c.code),...data.entries.map(currencyOf)])];
 const [local,setLocal]=useState(data.settings?.home_currency||'USD'),display=currency||local,setDisplay=onCurrency||setLocal;
 const all=data.entries.filter(e=>!e.voided_on&&e.date<=end),summary=periodSummary(data,start,end,display),balance=balances(all,display);
 const native=Object.fromEntries(codes.map(c=>[c,{...periodSummary({...data,entries:nativeEntries(data.entries,c)},start,end,c),...balances(nativeEntries(all,c),c)}]));
 const values={...summary,...balance};
 return <section className="card currency-report"><div className="currency-report-heading"><div><h3>Money report</h3><p>{start} through {end} · {filtered?'balance effect of matching records':'balances as of '+end}</p></div><label className="field"><span>Report currency</span><select aria-label="Report currency" value={display} onChange={e=>setDisplay(e.target.value)}>{catalog.map(c=><option key={c.code} value={c.code}>{currencyLabel(c)}</option>)}</select></label></div><p className="form-hint">Combined totals are approximate, using each entry’s saved rate. Native balances stay separate. Missing historical rates make the affected total unavailable.</p><div className="currency-report-grid">{[['available','Spending balance'],['savings','Savings balance'],['income','Income in period'],['spent','Spent in period'],['saved','Income saved'],['withdrawn','Savings withdrawals']].map(([key,label])=><div key={key}><small>{label}</small><strong>{Number.isFinite(values[key])?'≈ ':''}{formatMoney(values[key],display,catalog)}</strong><span>{codes.filter(c=>native[c][key]!==0||c===display).map(c=>formatMoney(native[c][key],c,catalog)).join(' + ')}</span></div>)}</div></section>;
}
