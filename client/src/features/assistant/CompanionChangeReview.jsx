import React,{useEffect,useRef,useState} from 'react';
import {changeCandidates,changeOperations,changeRecordName} from '../../../../shared/companion-changes.js';
import {addDays,goalBalance} from '../../../../shared/planner.js';
import {cents,nextRenewal} from '../../../../shared/domain.js';
import {daySchema} from '../../../../shared/daily.js';
import {taskCategorySchema} from '../../../../shared/validation.js';
import {formText} from '../../../../shared/companion-form-language.js';
import './companion-change-review.css';

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

function validValue(field,value,operation) {
  if(!field)return true;
  if(!value)return false;
  switch(field){
    case 'date': return daySchema.safeParse(value).success;
    case 'repeat': return ['none','daily','weekly'].includes(value);
    case 'category': return taskCategorySchema.safeParse(value).success;
    case 'minutes': return /^\d+$/.test(value)&&Number(value)<=1440;
    case 'amount': return /^\d+(?:\.\d{1,2})?$/.test(value)&&Number(value)<=999999999
      &&(operation==='updateGoal'||Number(value)>0);
    default: return value.length<=(field==='reason'?500:160);
  }
}

function changePreview(proposal,record,value,data,t) {
  const missing=t('Enter a value below','اكتب القيمة تحت');
  const usd=amount=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(amount);
  const text=value.trim()||missing;
  const schedule=repeat=>{
    if(repeat==='none')return t('Does not repeat','ما بتتكرر');
    if(repeat==='daily')return t('Daily','يومياً');
    if(repeat==='weekly')return t('Weekly','أسبوعياً');
    return missing;
  };
  switch(proposal.operation) {
    case 'rename': return [changeRecordName(record),text];
    case 'rescheduleTask': return [record.due,text];
    case 'categorizeTask': return [record.category||'Personal',text];
    case 'repeatTask': return [schedule(record.recurrence||'none'),schedule(value)];
    case 'estimateTask': return [`${record.estimate_minutes||0} ${t('min','دقيقة')}`,value?`${value} ${t('min','دقيقة')}`:missing];
    case 'addSubtask': return [t('Current checklist','القائمة الحالية'),value?t('Add','ضيف')+' '+value:missing];
    case 'cancelTask': return [t('Active','فعّالة'),t('Cancelled','ملغاة')];
    case 'restoreTask': return [t('Cancelled','ملغاة'),t('Active','فعّالة')];
    case 'completeTask':
    case 'reopenTask': return [record.completed?t('Completed','منجزة'):t('Open','مفتوحة'),proposal.operation==='completeTask'?t('Completed','منجزة'):t('Open','مفتوحة')];
    case 'reverseEntry': return [t('Included in balances','محسوبة بالأرصدة'),t('Reversed in history','معكوسة بالسجل')];
    case 'pauseSubscription':
    case 'resumeSubscription': return [record.active?t('Active','فعّال'):t('Paused','متوقّف'),proposal.operation==='resumeSubscription'?t('Active','فعّال'):t('Paused','متوقّف')];
    case 'renewSubscription': return [record.renewal,nextRenewal(record.renewal,record.cycle)];
    case 'markRarelyUsed':
    case 'markRegularlyUsed': return [record.rarely_used?t('Rarely used','نادراً ما بينستعمل'):t('Regular use','استعمال عادي'),proposal.operation==='markRarelyUsed'?t('Rarely used','نادراً ما بينستعمل'):t('Regular use','استعمال عادي')];
    case 'archiveNote':
    case 'restoreNote': return [record.archived?t('Archived','بالأرشيف'):t('In inbox','بصندوق الوارد'),proposal.operation==='archiveNote'?t('Archived','بالأرشيف'):t('In inbox','بصندوق الوارد')];
    case 'convertNote': return [t('Note','ملاحظة'),value?t('Task due','مهمة بتاريخ')+' '+value:missing];
    case 'updateGoal': return [usd(record.monthly_amount||0),value?usd(Number(value)):missing];
    case 'fundGoal':
    case 'releaseGoal': {
      const assigned=goalBalance((data.goal_moves||[]).filter(move=>String(move.goal_id)===String(record.id)));
      const delta=cents(value)*(proposal.operation==='fundGoal'?1:-1);
      return [usd(assigned/100),value?usd((assigned+delta)/100):missing];
    }
    default: return null;
  }
}

export function CompanionChangeReview({proposal, data, user, current, language, busy, error, onClose, onConfirm}) {
  const dialog=useRef(null);
  const [selected,setSelected]=useState('');
  const operation=changeOperations[proposal.operation],field=operation.field;
  const [value,setValue]=useState(()=>{
    const raw=proposal.value || '';
    const dates={today:current,tomorrow:addDays(current,1),bokra:addDays(current,1),بكرا:addDays(current,1),اليوم:current};
    const dateKey=raw.toLowerCase();
    const initial=field==='date'&&Object.hasOwn(dates,dateKey)?dates[dateKey]:raw;
    return validValue(field,initial,proposal.operation)?initial:'';
  });
  useEffect(()=>{dialog.current.showModal();},[]);
  const ar=language==='ar', t=(en,arabic)=>ar?arabic:en;
  const matches=changeCandidates(data,user,proposal);
  const needsSelection=matches.length>1||(matches.length>0&&(!proposal.target||!!selected));
  const record=needsSelection?matches.find(item=>String(item.id)===selected):matches[0];
  const trimmed=value.trim(),valid=validValue(field,trimmed,proposal.operation);
  const fieldLabel=proposal.operation==='updateGoal'?['Monthly amount (USD)','المبلغ الشهري بالدولار']:labels[field];
  const preview=record?changePreview(proposal,record,valid?trimmed:'',data,t):null;
  return <dialog className="companion-change-dialog" ref={dialog} dir={ar?'rtl':'ltr'} lang={language} aria-labelledby="companion-change-title" onCancel={event=>{event.preventDefault();if(!busy)onClose();}}>
    <div className="modal-heading"><h2 id="companion-change-title">{t('Review change','راجع التغيير')}</h2></div>
    <form onSubmit={event=>{event.preventDefault();if(record&&valid&&!busy)onConfirm(record,trimmed);}}>
      <p>{operation.label}</p>
      {needsSelection&&<label className="field">
        <span>{t('Choose the exact record','اختار السجل المقصود')}</span>
        <select required value={selected} onChange={event=>setSelected(event.target.value)}>
          <option value="">{t('Select a record','اختار سجل')}</option>
          {matches.map(item=><option key={item.id} value={item.id}>{recordLabel(item)} · #{item.id}</option>)}
        </select>
      </label>}
      {record&&<p dir="auto" className="info-note">{recordLabel(record)}</p>}
      {preview&&<dl className="companion-change-preview">
        <div><dt>{t('Before','قبل')}</dt><dd dir="auto">{preview[0]}</dd></div>
        <div><dt>{t('After','بعد')}</dt><dd dir="auto">{preview[1]}</dd></div>
      </dl>}
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
          min={field==='amount'?(proposal.operation==='updateGoal'?0:0.01):field==='minutes'?0:undefined}
          max={field==='minutes'?1440:field==='amount'?999999999:undefined} step={field==='amount'?0.01:undefined}
          maxLength={field==='reason'?500:160} value={value} aria-invalid={!!trimmed&&!valid} onChange={event=>setValue(event.target.value)}/>}
      </label>}
      {error&&<p className="error" role="alert">{formText(error,language)}</p>}
      <div className="modal-footer">
        <button type="button" className="secondary" disabled={busy} onClick={onClose}>{t('Cancel','إلغاء')}</button>
        <button className="primary" disabled={busy||!record||!valid}>{busy?t('Saving…','عم ينحفظ…'):proposal.operation==='renewSubscription'?t('Review payment','راجع الدفعة'):t('Confirm change','أكّد التغيير')}</button>
      </div>
    </form>
  </dialog>;
}
