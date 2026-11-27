import React from 'react';
import {Search} from 'lucide-react';
import {cents} from '../../../../shared/domain.js';
import {currencyOf,formatMoney,rateLabel,savedRates} from '../../../../shared/currency.js';
import {workspaceText} from '../../lib/workspace-text.js';
import {Empty,CardTitle} from '../../components/ui.jsx';
import './transaction-register.css';

const types=[['','All transactions'],['income','Income'],['expense','Expense'],['opening','Existing savings'],['withdrawal','Savings → spending']];
const columns=['Transaction','Category','Date','Actions','Amount'];

export function TransactionRegister({language,entries,hasRecords,query,onSearch,type,onType,dates,review,action,feedbackId,busy,onEdit,onAdd,onGuide}){
 const t=workspaceText(language);
 const dateFormat=new Intl.DateTimeFormat(language==='ar'?'ar':'en',{month:'short',day:'numeric',timeZone:'UTC'});
 const rows=type?entries.filter(entry=>entry.type===type):entries;
 return <section className="card money-tab-panel transaction-register">
  <CardTitle title={t('Transactions')} subtitle={t('Income, expenses, and savings transfers.')} action={action}/>
  <div className="transaction-toolbar">
   <label className="search-box"><Search size={17} aria-hidden="true"/><span className="sr-only">{t('Search transactions')}</span>
    <input placeholder={t('Search transactions, categories or notes…')} value={query} onChange={event=>onSearch(event.target.value)}/>
   </label>
   <label className="transaction-type"><span className="sr-only">{t('Transaction type')}</span>
    <select value={type} onChange={event=>onType(event.target.value)}>
     {types.map(([value,label])=><option key={value} value={value}>{t(label)}</option>)}
    </select>
   </label>
   {dates}
   {review}
  </div>
  {rows.length?<div className="table-wrap register-table-wrap">
   <table role="table" aria-label={t('Transactions')}>
    <thead role="rowgroup"><tr role="row">{columns.map(label=><th role="columnheader" key={label} scope="col">{t(label)}</th>)}</tr></thead>
    <tbody role="rowgroup">{rows.map(entry=>{
     const currency=currencyOf(entry),rates=savedRates(entry),amount=formatMoney(cents(entry.amount),currency,rates);
     const directionMark=entry.type==='expense'?'−':entry.type==='withdrawal'?'↔':'+';
     return <tr key={entry.id} role="row" className={feedbackId!=null&&String(feedbackId)===String(entry.id)?'transaction-feedback':undefined}>
      <td role="cell" className="register-title">
       <strong dir="auto">{entry.title}{entry.voided_on?t(' · Reversed'):''}</strong>
       <small className="register-details">
        {entry.type==='income'&&<span>{t('Income · {amount} to savings',{amount:formatMoney(cents(entry.saved),currency,rates)})}</span>}
        {entry.note&&<span dir="auto">{entry.note}</span>}<span>{rateLabel(entry)}</span>
       </small>
      </td>
      <td role="cell" className="register-category"><span className="category" dir="auto">{t(entry.category)}</span></td>
      <td role="cell" className="register-date"><time dateTime={entry.date}>{dateFormat.format(new Date(entry.date+'T00:00:00Z'))}</time></td>
      <td role="cell" className="register-edit">{!entry.voided_on&&<button type="button" className="text-button" aria-label={t('Edit {name}',{name:entry.title})} disabled={busy} onClick={()=>onEdit(entry)}>{t('Edit')}</button>}</td>
      <td role="cell" className={`amount register-amount ${['income','opening'].includes(entry.type)?'positive':''}`}><bdi>{directionMark}{amount}</bdi></td>
     </tr>;
    })}</tbody>
   </table>
  </div>:<Empty text={t(hasRecords?'No transactions match this view.':'Start by recording your first transaction.')}>
   {(query||type)?<button type="button" className="secondary" onClick={()=>{onSearch('');onType('');}}>{t('Clear filters')}</button>:
    <><button type="button" className="secondary" disabled={busy} onClick={onAdd}>{t('Add transaction')}</button>{!hasRecords&&<button type="button" className="text-button" onClick={onGuide}>{t('Guide')}</button>}</>}
  </Empty>}
 </section>;
}
