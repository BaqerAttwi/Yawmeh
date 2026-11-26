import React from 'react';
import {Ellipsis,Volume2,Compass} from 'lucide-react';
import './assistant-icon.css';

export const assistantLooks=[
 {id:'logo',label:'Framed Yawmeh logo',ar:'شعار يومي بإطار'},
 {id:'sage',label:'Classic Sage',ar:'Sage الكلاسيكي'},
 {id:'nova',label:'Classic Nova artwork',ar:'رسمة Nova الكلاسيكية'},
 {id:'pip',label:'Classic Pip artwork',ar:'رسمة Pip الكلاسيكية'},
];

export function Character({state='idle',className='',look='logo'}) {
 const artwork=look!=='logo'&&assistantLooks.some(option=>option.id===look)?look:null;
 const Badge=state==='speaking'?Volume2:state==='guide'?Compass:['thinking','preparing'].includes(state)?Ellipsis:null;
 return <i aria-hidden="true" className={`assistant-icon ${className}`} data-state={state} data-look={artwork?'classic':'logo'}>
  {artwork?<span className="assistant-icon-face assistant-icon-artwork" style={{backgroundImage:`url(/characters/${artwork}-wave.webp)`}}/>:
   <img className="assistant-icon-face assistant-icon-logo" src="/branding/yawmeh-logo-192.webp" alt="" decoding="async"/>}
  {Badge&&<Badge className="assistant-icon-badge" strokeWidth={2}/>}
 </i>;
}
