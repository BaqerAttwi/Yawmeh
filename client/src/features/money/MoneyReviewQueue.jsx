import React from 'react';
import {currencyOf,formatMoney,savedRates} from '../../../../shared/currency.js';
import {cents} from '../../../../shared/domain.js';
import {needsCategoryReview} from '../../lib/receipt-review.js';
import {workspaceText} from '../../lib/workspace-text.js';
import './money-review.css';

export function MoneyReviewQueue({drafts,entries,language,busy,onReceipt,onDiscard,onCategory}){
 const t=workspaceText(language);
 const uncategorized=entries.filter(needsCategoryReview);
 const count=drafts.length+uncategorized.length;
 if(!count)return <span className="money-review-empty">{t('Needs review')} <span className="count-badge">0</span></span>;
 return <details className="money-review">
  <summary>{t('Needs review')} <span className="count-badge">{count}</span></summary>
  <div className="money-review-list">
   {drafts.length>0&&<p className="muted">{t('Receipt drafts are saved in this browser until you record or discard them.')}</p>}
   {drafts.map(draft=><div className="money-review-row" key={draft.id}>
    <div><strong>{draft.initial.title||t('Receipt draft')}</strong><small>{t('Receipt draft')}</small></div>
    <div className="button-row">
     <button type="button" className="text-button" disabled={busy} onClick={()=>onDiscard(draft)}>{t('Discard draft')}</button>
     <button type="button" className="secondary" disabled={busy} onClick={()=>onReceipt(draft)}>{t('Review receipt')}</button>
    </div>
   </div>)}
   {uncategorized.map(entry=><div className="money-review-row" key={entry.id}>
    <div><strong>{entry.title}</strong><small>{t('Uncategorized expense')} · <bdi>{formatMoney(cents(entry.amount),currencyOf(entry),savedRates(entry))}</bdi></small></div>
    <button type="button" className="secondary" disabled={busy} onClick={()=>onCategory(entry)}>{t('Review category')}</button>
   </div>)}
  </div>
 </details>;
}
