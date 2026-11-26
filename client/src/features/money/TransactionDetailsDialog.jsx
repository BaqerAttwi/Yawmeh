import React,{useEffect,useRef,useState} from 'react';
import {entryDetailsSchema} from '../../../../shared/validation.js';
import {formatMoney,currencyOf,savedRates} from '../../../../shared/currency.js';
import {cents} from '../../../../shared/domain.js';
import {Field} from '../../components/ui.jsx';
import {workspaceText} from '../../lib/workspace-text.js';
import {MoneyCategoryField} from './MoneyCategoryField.jsx';

export function TransactionDetailsDialog({entry,language,categories,busy,error,onClose,onSave,review=false}){
 const dialog=useRef(null);
 const [validation,setValidation]=useState('');
 const t=workspaceText(language);
 useEffect(()=>{dialog.current.showModal();},[]);
 function submit(event){
  event.preventDefault();
  const result=entryDetailsSchema.safeParse(Object.fromEntries(new FormData(event.currentTarget)));
  if(!result.success){setValidation(t('Enter a valid name, category and note.'));return;}
  setValidation('');
  void onSave(entry,review?{...result.data,reviewed:true}:result.data);
 }
 return <dialog ref={dialog} dir={language==='ar'?'rtl':'ltr'} aria-labelledby="transaction-details-title"
  onCancel={event=>{event.preventDefault();if(!busy)onClose();}}>
  <div className="modal-heading">
   <div>
    <h2 id="transaction-details-title">{t(review?'Review category':'Edit transaction')}</h2>
    <p className="muted"><bdi>{formatMoney(cents(entry.amount),currencyOf(entry),savedRates(entry))}</bdi> · <bdi>{entry.date}</bdi></p>
   </div>
  </div>
  <form onSubmit={submit}>
   <Field label={t('Transaction name')} name="title" dir="auto" defaultValue={entry.title} maxLength={160} required/>
   <MoneyCategoryField language={language} categories={categories} value={entry.category||'Other'}/>
   <label className="field"><span>{t('Note (optional)')}</span><textarea name="note" dir="auto" defaultValue={entry.note||''} maxLength={2000} rows={3}/></label>
   <p className="form-hint">{t('To correct the amount, currency, or date, reverse the transaction in History and enter it again.')}</p>
   {(validation||error)&&<p className="error" role="alert">{validation||error}</p>}
   <div className="modal-footer">
    <button type="button" className="secondary" disabled={busy} onClick={onClose}>{t('Cancel')}</button>
    <button type="submit" className="primary" disabled={busy}>{t(review?'Confirm review':'Save changes')}</button>
   </div>
  </form>
 </dialog>;
}
