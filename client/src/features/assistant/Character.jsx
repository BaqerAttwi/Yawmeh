import React from 'react';
import {Bot,Ellipsis,Volume2,Compass} from 'lucide-react';
import './assistant-icon.css';

export function Character({state='idle',className=''}) {
 const Badge=state==='speaking'?Volume2:state==='guide'?Compass:['thinking','preparing'].includes(state)?Ellipsis:null;
 return <i aria-hidden="true" className={`assistant-icon ${className}`} data-state={state}>
  <Bot className="assistant-icon-face" strokeWidth={1.65}/>
  {Badge&&<Badge className="assistant-icon-badge" strokeWidth={2}/>}
 </i>;
}
