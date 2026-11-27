import {workspaceText} from "../lib/workspace-text.js";
import React,{useState} from 'react';
import {balances,periodSummary} from '../../../shared/domain.js';
import {nativeEntries,formatMoney,currencyCatalog,currencyLabel,currencyOf} from '../../../shared/currency.js';
import {ValueChart} from './FinanceCharts.jsx';
export function CurrencyReport({language,data,start,end,currency,onCurrency,filtered=false,featured=false,showBalanceSummary=false,children}) {
 const t=workspaceText(language);
 const catalog=currencyCatalog(data.settings),codes=[...new Set([...catalog.map(c=>c.code),...data.entries.map(currencyOf)])];
 const [local,setLocal]=useState(data.settings?.home_currency||'USD'),display=currency||local,setDisplay=onCurrency||setLocal;
 const [showChart,setShowChart]=useState(false);
 const all=data.entries.filter(e=>!e.voided_on&&e.date<=end),summary=periodSummary(data,start,end,display),balance=balances(all,display);
 const native=Object.fromEntries(codes.map(c=>[c,{...periodSummary({...data,entries:nativeEntries(data.entries,c)},start,end,c),...balances(nativeEntries(all,c),c)}]));
 const values={...summary,...balance};
 const totalBalance=balance.available+balance.savings;
 const inPeriod=all.filter(entry=>entry.date>=start);
 const count=type=>inPeriod.filter(entry=>entry.type===type).length;
 const metrics=[
  ['available','Spending balance',t('As of {date}',{date:end})],
  ['savings','Savings balance',t('As of {date}',{date:end})],
  ['income','Income',t('{count} income entries',{count:count('income')})],
  ['spent','Spent',t('{count} expenses',{count:count('expense')})],
  ['saved','Saved from income',values.income>0&&Number.isFinite(values.saved)?t('{percent}% of income',{percent:Math.round(values.saved/values.income*100)}):t('This period')],
  ['withdrawn','Savings withdrawals',count('withdrawal')?t('{count} withdrawals',{count:count('withdrawal')}):t('None this period')],
 ];
 return <>
 {showBalanceSummary&&
  <section className="transaction-balances" aria-label={t('Balance summary')}>
   <div className="transaction-balance-total"><span>{t('Total balance')}</span><strong><bdi>{t(formatMoney(totalBalance,display,catalog))}</bdi></strong></div>
   <div><span>{t('Spending balance')}</span><strong><bdi>{t(formatMoney(balance.available,display,catalog))}</bdi></strong></div>
   <div><span>{t('Savings balance')}</span><strong><bdi>{t(formatMoney(balance.savings,display,catalog))}</bdi></strong></div>
   <small>{t('Balances as of {date}',{date:end})}</small>
  </section>}
 {children}
 <section className="card currency-report">
  <div className="currency-report-heading"><div><h3>{t("Money report")}</h3><p>{filtered?t("Balance effect of matching records"):t('Balances as of {date}',{date:end})}</p></div>
   <label className="field"><span className="sr-only">{t("Report currency")}</span><select aria-label={t("Report currency")} value={display} onChange={e=>setDisplay(e.target.value)}>{catalog.map(c=><option key={c.code} value={c.code}>{t(currencyLabel(c))}</option>)}</select></label>
  </div>
  <div className={featured?'currency-summary featured-currency-summary':'currency-summary'}>
  {featured&&<div className="balance-hero">
   <span className="balance-hero-label">{t("Total balance")}</span>
   <strong className="balance-hero-value"><bdi>{t(formatMoney(totalBalance,display,catalog))}</bdi></strong>
   <bdi className="balance-hero-pill">{display}</bdi>
  </div>}
  <div className="currency-report-grid">{metrics.map(([key,label,context])=>{
   const original=codes.filter(code=>native[code][key]!==0);
   return <div key={key} data-money={key}><small>{t(label)}</small><strong><bdi>{t(formatMoney(values[key],display,catalog))}</bdi></strong><span>{original.some(code=>code!==display)?original.map(code=>t(formatMoney(native[code][key],code,catalog))).join(' + '):context}</span></div>;
  })}</div>
  </div>
  <details className="currency-report-chart" onToggle={event=>setShowChart(event.currentTarget.open)}>
   <summary>{t("Chart breakdown")}</summary>
   {showChart&&<ValueChart data={metrics.map(([key,name])=>({
    name,value:values[key],color:`var(--${({income:'income',spent:'expense',savings:'savings',saved:'savings'}[key]||'chart-2')})`,
   }))} label="Amount" format={value=>formatMoney(value,display,catalog)}/>}
  </details>
  <p className="currency-report-note">{t("Converted totals use each entry’s saved exchange rate. Totals with missing rates are unavailable.")}</p>
 </section>
 </>;
}
