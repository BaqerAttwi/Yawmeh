import React,{useState} from 'react';
import {cents} from '../../../shared/domain.js';
import {formatMoney} from '../../../shared/currency.js';
import {Field} from './ui.jsx';

export function IncomeAllocation({initialAmount,currency,language,showExample=false,catalog}) {
 const [amount,setAmount]=useState(initialAmount==null?'':String(initialAmount));
 const [edited,setEdited]=useState({field:'saved',value:'0'});
 const ar=language==='ar';
 const total=amount===''?null:cents(amount);
 const portion=edited.value===''?null:cents(edited.value);
 const exceedsTotal=total!==null&&portion!==null&&portion>total;
 const remainder=total!==null&&portion!==null&&portion>=0&&portion<=total
  ?String((total-portion)/100):'';
 const edit=field=>event=>setEdited({field,value:event.target.value});
 const label=(english,arabic)=>`${ar?arabic:english} (${currency})`;
 const saved=edited.field==='saved'?portion:total-portion;
 const valid=total>0&&total<=99999999900&&remainder!==''&&
  Math.abs(Number(amount)*100-total)<0.00001&&Math.abs(Number(edited.value)*100-portion)<0.00001;
 return <>
  {showExample&&<p className="info-note">{ar?'بلّش بدفعة وحدة قبضتها. الأرقام هون بس للتوضيح: إذا قبضت ١٥٠٠ ووفّرت ١٠٠٠، بيضلّ ٥٠٠ للصرف.':'Start with one payment you received. Example only: if you receive 1,500 and set aside 1,000, you have 500 to spend.'}</p>}
  <Field label={label('Total income received','إجمالي الدخل اللي قبضته')} name="amount" type="number" min="0.01" step="0.01" max="999999999" value={amount} onChange={event=>setAmount(event.target.value)} required/>
  <div className="field-pair">
   <Field label={label('Allocate to savings','خصّص للادخار')} name="saved" type="number" min="0" max={amount||undefined} step="0.01" value={edited.field==='saved'?(showExample&&total===null&&edited.value==='0'?'':edited.value):remainder} onChange={edit('saved')} required/>
   <Field label={label('Available to spend','المتاح للصرف')} type="number" min="0" max={amount||undefined} step="0.01" value={edited.field==='spending'?edited.value:remainder} onChange={edit('spending')} required/>
  </div>
  <p className="form-hint">{ar?'حطّ كامل الدخل فوق. اكتب قديش بدّك توفّر أو تصرف تحت، والخانة التانية بتنحسب لحالها.':'Enter the full income above. Enter either savings or spending below, and the other field fills in automatically.'}</p>
  {exceedsTotal&&<p className="error" role="alert">{ar?'راجع إجمالي الدخل فوق. مبلغ الادخار أو الصرف لازم يكون قدّه أو أقل.':'Check the total income above. The savings or spending amount must be at most the full income received.'}</p>}
  {valid&&<dl className="money-effect" aria-label={ar?'قبل الحفظ':'Before saving'}>
   <div><dt>{ar?'الدخل المقبوض':'Income received'}</dt><dd>{formatMoney(total,currency,catalog)}</dd></div>
   <div><dt>{ar?'بينضاف للمدخرات':'Added to savings'}</dt><dd>{formatMoney(saved,currency,catalog)}</dd></div>
   <div><dt>{ar?'بينضاف للصرف':'Added to spending'}</dt><dd>{formatMoney(total-saved,currency,catalog)}</dd></div>
  </dl>}
 </>;
}
