import React,{useState} from 'react';
import {balances,periodSummary} from '../../../shared/domain.js';
import {nativeEntries,formatMoney,currencyCatalog,currencyLabel,currencyOf} from '../../../shared/currency.js';
import {ValueChart} from './FinanceCharts.jsx';
export function CurrencyReport({data,start,end,currency,onCurrency,filtered=false,featured=false}) {
 const catalog=currencyCatalog(data.settings),codes=[...new Set([...catalog.map(c=>c.code),...data.entries.map(currencyOf)])];
 const [local,setLocal]=useState(data.settings?.home_currency||'USD'),display=currency||local,setDisplay=onCurrency||setLocal;
 const [showChart,setShowChart]=useState(false);
 const all=data.entries.filter(e=>!e.voided_on&&e.date<=end),summary=periodSummary(data,start,end,display),balance=balances(all,display);
 const native=Object.fromEntries(codes.map(c=>[c,{...periodSummary({...data,entries:nativeEntries(data.entries,c)},start,end,c),...balances(nativeEntries(all,c),c)}]));
 const values={...summary,...balance};
 const inPeriod=all.filter(entry=>entry.date>=start);
 const count=type=>inPeriod.filter(entry=>entry.type===type).length;
 const metrics=[
  ['available','Spending balance','As of '+end],
  ['savings','Savings balance','As of '+end],
  ['income','Income',count('income')+' income entries'],
  ['spent','Spent',count('expense')+' expenses'],
  ['saved','Saved from income',values.income>0&&Number.isFinite(values.saved)?Math.round(values.saved/values.income*100)+'% of income':'This period'],
  ['withdrawn','Savings withdrawals',count('withdrawal')?count('withdrawal')+' withdrawals':'None this period'],
 ];
 return <section className="card currency-report">
  <div className="currency-report-heading"><div><h3>Money report</h3><p>{filtered?'Balance effect of matching records':'Balances as of '+end}</p></div>
   <label className="field"><span className="sr-only">Report currency</span><select aria-label="Report currency" value={display} onChange={e=>setDisplay(e.target.value)}>{catalog.map(c=><option key={c.code} value={c.code}>{currencyLabel(c)}</option>)}</select></label>
  </div>
  <div className={featured?'currency-summary featured-currency-summary':'currency-summary'}>
  {featured&&<div className="balance-hero">
   <span className="balance-hero-label">Total balance</span>
   <strong className="balance-hero-value"><bdi>{formatMoney(balance.available+balance.savings,display,catalog)}</bdi></strong>
   <bdi className="balance-hero-pill">{display}</bdi>
  </div>}
  <div className="currency-report-grid">{metrics.map(([key,label,context])=>{
   const original=codes.filter(code=>native[code][key]!==0);
   return <div key={key} data-money={key}><small>{label}</small><strong><bdi>{formatMoney(values[key],display,catalog)}</bdi></strong><span>{original.some(code=>code!==display)?original.map(code=>formatMoney(native[code][key],code,catalog)).join(' + '):context}</span></div>;
  })}</div>
  </div>
  <details className="currency-report-chart" onToggle={event=>setShowChart(event.currentTarget.open)}>
   <summary>Chart breakdown</summary>
   {showChart&&<ValueChart data={metrics.map(([key,name])=>({
    name,value:values[key],color:`var(--${({income:'income',spent:'expense',savings:'savings',saved:'savings'}[key]||'chart-2')})`,
   }))} label="Amount" format={value=>formatMoney(value,display,catalog)}/>}
  </details>
  <p className="currency-report-note">Converted totals use each entry’s saved exchange rate. Totals with missing rates are unavailable.</p>
 </section>;
}
