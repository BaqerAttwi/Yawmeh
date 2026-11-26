import React,{useState} from 'react';
import {workspaceText} from '../../lib/workspace-text.js';

export const moneyCategories=[
 'Food & drinks','Groceries','Dining out','Housing','Utilities','Transport','Shopping',
 'Health','Insurance','Learning','Entertainment','Travel','Gifts','Bills','Work','Freelance','Savings','Other',
];

export function MoneyCategoryField({language,categories=[],value='',allowLater=false}){
 const t=workspaceText(language);
 const [choice,setChoice]=useState(value);
 const options=[...new Set([...moneyCategories,...categories,value].filter(Boolean))];
 let custom='__custom__';
 while(options.includes(custom))custom+='-';
 return <>
  <label className="field">
   <span>{t('Category')}</span>
   <select name={choice===custom?undefined:'category'} value={choice} onChange={event=>setChoice(event.target.value)} required={!allowLater}>
    {allowLater&&<option value="">{t('Choose a category later')}</option>}
    {options.map(option=><option value={option} key={option}>{t(option)}</option>)}
    <option value={custom}>{t('Add a custom category')}</option>
   </select>
  </label>
  {choice===custom&&<label className="field"><span>{t('Custom category')}</span><input name="category" maxLength={80} required dir="auto"/></label>}
 </>;
}
