import {PasswordInput} from './PasswordInput.jsx';
import React,{useState} from 'react';

export function PasswordForm({kind,request,token,onDone,onCancel,disabled=false}){
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const forgot=kind==='forgot';
 async function submit(e){
  e.preventDefault();const form=e.currentTarget;const values=Object.fromEntries(new FormData(form));setError('');setMessage('');
  if(!forgot&&values.newPassword!==values.confirm){setError('New passwords do not match.');return;}
  delete values.confirm;if(token)values.token=token;setBusy(true);
  try{const result=await request('/auth/'+(forgot?'forgot-password':kind==='change'?'change-password':'reset-password'),'POST',values);form.reset();setMessage(result.message);if(!forgot)onDone?.(result.message);}catch(err){setError(err.message);}finally{setBusy(false);}
 }
 return <form className="settings-form" onSubmit={submit}><h3>{forgot?'Forgot password?':kind==='change'?'Change password':'Choose a new password'}</h3><p>{forgot?'Enter your account email to request a reset link.':'Use 8–24 characters. A long, unique passphrase works well. All devices will be signed out.'}</p>{disabled&&<p>Passwords can only be changed in a live account.</p>}
 {forgot?<label className="field"><span>Account email</span><input required type="email" name="email" autoComplete="email" maxLength={254}/></label>:<>{kind==='change'&&<label className="field"><span>Current password</span><PasswordInput required  name="currentPassword" autoComplete="current-password" maxLength={128} disabled={disabled}/></label>}<label className="field"><span>New password</span><PasswordInput required  name="newPassword" autoComplete="new-password" minLength={8} maxLength={24} disabled={disabled}/></label><label className="field"><span>Confirm new password</span><PasswordInput required  name="confirm" autoComplete="new-password" minLength={8} maxLength={24} disabled={disabled}/></label></>}
 {error&&<p className="error" role="alert">{error}</p>}{message&&<p role="status">{message}</p>}<button className="primary" disabled={busy||disabled}>{busy?'Please wait…':forgot?'Send reset link':kind==='change'?'Change password':'Reset password'}</button>{onCancel&&<button type="button" className="text-button" onClick={onCancel}>Back to sign in</button>}</form>;
}
