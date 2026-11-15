import React,{useState} from 'react';
import {cents} from '../../../shared/domain.js';
import {Field} from './ui.jsx';

export function IncomeAllocation({initialAmount,currency,language}) {
 const [amount,setAmount]=useState(initialAmount==null?'':String(initialAmount));
 const [edited,setEdited]=useState({field:'saved',value:'0'});
 const ar=language==='ar';
 const total=amount===''?null:cents(amount);
 const portion=edited.value===''?null:cents(edited.value);
 const remainder=total!==null&&portion!==null&&portion>=0&&portion<=total
  ?String((total-portion)/100):'';
 const edit=field=>event=>setEdited({field,value:event.target.value});
 const label=(english,arabic)=>`${ar?arabic:english} (${currency})`;
 return <>
  <Field label={label('Amount','المبلغ')} name="amount" type="number" min="0.01" step="0.01" max="999999999" value={amount} onChange={event=>setAmount(event.target.value)} required/>
  <div className="field-pair">
   <Field label={label('Allocate to savings','خصّص للادخار')} name="saved" type="number" min="0" max={amount||undefined} step="0.01" value={edited.field==='saved'?edited.value:remainder} onChange={edit('saved')} required/>
   <Field label={label('Available to spend','المتاح للصرف')} type="number" min="0" max={amount||undefined} step="0.01" value={edited.field==='spending'?edited.value:remainder} onChange={edit('spending')} required/>
  </div>
  <p className="form-hint">{ar?'عدّل مبلغ الادخار أو الصرف، والخانة التانية بتنحسب لحالها.':'Edit either savings or spending. The other amount updates automatically.'}</p>
 </>;
}
