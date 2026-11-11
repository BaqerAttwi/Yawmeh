import React,{useEffect,useRef,useState} from 'react';
import {changeCandidates,changeOperations,changeRecordName} from '../../../../shared/companion-changes.js';
import {addDays} from '../../../../shared/planner.js';
import {formText} from '../../../../shared/companion-form-language.js';

const labels = {
  title:['New name','الاسم الجديد'], date:['New date','التاريخ الجديد'],
  category:['Category','الفئة'], repeat:['Repeat','التكرار'],
  step:['Checklist step','خطوة بقائمة المهام'], reason:['Reason for reversal','سبب عكس العملية'],
  amount:['Amount (USD)','المبلغ بالدولار'],
  minutes:['Estimated minutes','المدة بالدقايق'],
};

function recordLabel(record) {
  return [changeRecordName(record), record.date || record.due || record.renewal, record.amount == null ? '' : `${record.amount} ${record.currency || 'USD'}`].filter(Boolean).join(' · ');
}

export function CompanionChangeReview({proposal, data, user, current, language, busy, error, onClose, onConfirm}) {
  const dialog=useRef(null);
  const [selected,setSelected]=useState('');
  const [value,setValue]=useState(()=>{
    const raw=proposal.value || '';
    const dates={today:current,tomorrow:addDays(current,1),bokra:addDays(current,1),بكرا:addDays(current,1),اليوم:current};
    return changeOperations[proposal.operation].field==='date' ? (dates[raw.toLowerCase()] || raw) : raw;
  });
  useEffect(()=>{dialog.current.showModal();},[]);
  const ar=language==='ar', t=(en,arabic)=>ar?arabic:en;
  const operation=changeOperations[proposal.operation];
  const matches=changeCandidates(data,user,proposal);
  const record=selected ? matches.find(item=>String(item.id)===selected) : matches.length===1?matches[0]:null;
  const field=operation.field;
  const fieldLabel=proposal.operation==='updateGoal'?['Monthly amount (USD)','المبلغ الشهري بالدولار']:labels[field];
  return <dialog ref={dialog} dir={ar?'rtl':'ltr'} lang={language} aria-labelledby="companion-change-title" onCancel={event=>{event.preventDefault();if(!busy)onClose();}}>
    <div className="modal-heading"><h2 id="companion-change-title">{t('Review change','راجع التغيير')}</h2></div>
    <form onSubmit={event=>{event.preventDefault();if(record&&!busy)onConfirm(record,value.trim());}}>
      <p>{operation.label}</p>
      {matches.length>1&&<label className="field">
        <span>{t('Choose the exact record','اختار السجل المقصود')}</span>
        <select required value={selected} onChange={event=>setSelected(event.target.value)}>
          <option value="">{t('Select a record','اختار سجل')}</option>
          {matches.map(item=><option key={item.id} value={item.id}>{recordLabel(item)} · #{item.id}</option>)}
        </select>
      </label>}
      {record&&<p dir="auto" className="info-note">{recordLabel(record)}</p>}
      {!matches.length&&<p role="status">{t('No matching record is available. Close this review and try the exact name.','ما في سجل مطابق. سكّر المراجعة وجرّب الاسم الكامل.')}</p>}
      {proposal.operation==='cancelTask'&&<p>{t('The task moves to Cancelled tasks in Today, where you can restore it.','المهمة بتنتقل للمهام الملغاة بصفحة اليوم وفيك ترجعها.')}</p>}
      {proposal.operation==='reverseEntry'&&<p>{t('This updates your balances and keeps the original transaction in history.','هالتغيير بيحدّث الأرصدة وبيخلّي العملية الأصلية بالسجل.')}</p>}
      {field&&<label className="field">
        <span>{t(...fieldLabel)}</span>
        {field==='repeat'?<select required value={value} onChange={event=>setValue(event.target.value)}>
          <option value="">{t('Choose a schedule','اختار التكرار')}</option>
          <option value="none">{t('Does not repeat','ما بتتكرر')}</option>
          <option value="daily">{t('Daily','يومياً')}</option>
          <option value="weekly">{t('Weekly','أسبوعياً')}</option>
        </select>:<input required dir="auto" type={field==='date'?'date':['amount','minutes'].includes(field)?'number':'text'}
          min={field==='amount'||field==='minutes'?0:undefined} max={field==='minutes'?1440:field==='amount'?999999999:undefined} step={field==='amount'?0.01:undefined}
          maxLength={field==='reason'?500:160} value={value} onChange={event=>setValue(event.target.value)}/>}
      </label>}
      {error&&<p className="error" role="alert">{formText(error,language)}</p>}
      <div className="modal-footer">
        <button type="button" className="secondary" disabled={busy} onClick={onClose}>{t('Cancel','إلغاء')}</button>
        <button className="primary" disabled={busy||!record||!!field&&!value.trim()}>{busy?t('Saving…','عم ينحفظ…'):proposal.operation==='renewSubscription'?t('Review payment','راجع الدفعة'):t('Confirm change','أكّد التغيير')}</button>
      </div>
    </form>
  </dialog>;
}
