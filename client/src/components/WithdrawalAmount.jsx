import React,{useState} from 'react';
import {balances,cents,checkEntry} from '../../../shared/domain.js';
import {checkUnassignedWithdrawal} from '../../../shared/planner.js';
import {currencyCatalog,formatMoney,nativeEntries} from '../../../shared/currency.js';
import {Field} from './ui.jsx';

export function WithdrawalAmount({initialAmount,currency,language,data,current}) {
 const [amount,setAmount]=useState(initialAmount==null?'':String(initialAmount));
 const ar=language==='ar';
 const t=(en,arabic)=>ar?arabic:en;
 const entries=data.entries.filter(entry=>entry.date<=current);
 const balance=balances(nativeEntries(entries,currency),currency);
 const catalog=currencyCatalog(data.settings);
 const format=value=>formatMoney(value,currency,catalog);
 const value=cents(amount);
 const valid=value>0&&value<=99999999900&&Math.abs(Number(amount)*100-value)<0.00001;
 let ruleError=false;
 if(valid){
  const draft={type:'withdrawal',amount:Number(amount),currency,note:'Preview'};
  try{
   checkEntry(draft,entries);
   checkUnassignedWithdrawal(draft,entries,data.goal_moves);
  }catch{
   ruleError=true;
  }
 }
 return <>
  <Field label={`${t('Amount','المبلغ')} (${currency})`} name="amount" type="number" min="0.01" max="999999999" step="0.01" value={amount} onChange={event=>setAmount(event.target.value)} required/>
  {ruleError&&<p className="error" role="alert">{t('This amount exceeds the savings you can withdraw in this currency. Savings reserved for goals may need to be released first.','المبلغ أكبر من المدخرات المتاحة للسحب بهالعملة. إذا في مدخرات محجوزة لهدف، حرّرها أول.')}</p>}
  {valid&&!ruleError&&<dl className="money-effect" aria-label={t('Before saving','قبل الحفظ')}>
   <div><dt>{t('Savings balance','رصيد المدخرات')}</dt><dd>{format(balance.savings)} → {format(balance.savings-value)}</dd></div>
   <div><dt>{t('Spending balance','رصيد الصرف')}</dt><dd>{format(balance.available)} → {format(balance.available+value)}</dd></div>
  </dl>}
 </>;
}
