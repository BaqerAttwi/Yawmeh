import React,{useState} from 'react';
import {availableCompanionRequests} from '../../../../shared/companion-requests.js';
import {languageProfile} from '../../../../shared/lebanese-language.js';

const groups={tasks:['Plan and remember','خطّط وتذكّر'],money:['Track and review money','سجّل وراجع المصاري'],drafts:['Fix a draft','عدّل مسودة'],ideas:['Think, learn and write','فكّر وتعلّم واكتب']};
export function CompanionExamples({user,language,text,aiAvailable,onChoose}){
 const [style,setStyle]=useState('auto'),ar=language==='ar';
 const selected=style==='auto'?(languageProfile(text,language).script==='arabizi'?'arabizi':language):style;
 const rows=availableCompanionRequests(user),column={en:0,ar:1,arabizi:2}[selected];
 return <section className="companion-examples" aria-label={ar?'أمثلة طلبات':'Request examples'}><div className="companion-examples-heading"><strong>{ar?'جرّب تسأل بطريقتك':'Ask in your own words'}</strong><label>{ar?'طريقة الكتابة':'Writing style'}<select value={style} onChange={e=>setStyle(e.target.value)}><option value="auto">{ar?'حسب المحادثة':'Follow chat'}</option><option value="en">English</option><option value="ar">لبناني</option><option value="arabizi">Arabizi · 3 / 7</option></select></label></div><small>{ar?'اختار مثال لنحطّه بمربع الكتابة. فيك تعدّله قبل الإرسال.':'Choose an example to fill the message box. Edit it before sending.'}</small><div className="companion-example-list">{Object.entries(groups).map(([group,title])=>{
  const entries=rows.filter(row=>row.group===group);return entries.length>0&&<section key={group}><h3>{title[ar?1:0]}</h3>{entries.map(row=><button key={row.id} type="button" disabled={row.ai&&!aiAvailable} onClick={()=>onChoose(row.examples[column])}><strong>{row.title[ar?1:0]}{row.ai&&<small>{ar?'بدّه AI':'Needs AI'}</small>}</strong><span dir="auto">{row.examples[column]}</span></button>)}</section>;
 })}</div></section>;
}
