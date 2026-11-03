import React,{useState} from 'react';
import {Eye,EyeOff} from 'lucide-react';

export function PasswordInput(props){
 const [visible,setVisible]=useState(false);
 return <span className="password-input"><input {...props} type={visible?'text':'password'}/><button type="button" className="password-toggle" aria-label={visible?'Hide password':'Show password'} aria-pressed={visible} disabled={props.disabled} onClick={()=>setVisible(value=>!value)}>{visible?<EyeOff size={18}/>:<Eye size={18}/>}</button></span>;
}
