import React,{useState} from 'react';
import {PasswordInput} from './PasswordInput.jsx';
import {OWNER_EMAIL} from '../../../../shared/account-access.js';

export function InactiveAccount({onBack,created=false,verified=false,request,email=''}){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
 async function resend(event){event.preventDefault();setBusy(true);try{const result=await request('/auth/resend-verification','POST',Object.fromEntries(new FormData(event.currentTarget)));setMessage(result.message);}catch(error){setMessage(error.message);}finally{setBusy(false);}}
 return <main className="account-pending"><img src="/branding/yawmeh-logo-small.png" width="80" height="80" alt=""/><h1>{created?'Welcome to Yawmeh':'Your account is inactive'}</h1>{verified&&<p role="status">Your email is verified.</p>}<p>{created?'Your account has been created. Verify your email using the greeting we sent, then contact the owner to activate access.':'Please contact the owner to activate or renew your access.'}</p><a className="primary" href={`mailto:${OWNER_EMAIL}`}>{OWNER_EMAIL}</a><p>The owner can grant ongoing or temporary access.</p>{!verified&&request&&<details open={created}><summary>Need a signup verification email?</summary><form onSubmit={resend}><label className="field"><span>Signup email</span><input name="email" type="email" defaultValue={email} required maxLength={254}/></label><button className="secondary" disabled={busy}>{busy?'Sending…':'Resend verification email'}</button></form>{message&&<p role="status">{message}</p>}</details>}<button type="button" className="secondary" onClick={onBack}>Back to sign in</button></main>;
}
export function GoogleSignup({available}){
 return available?<a className="google-signup secondary" href="/api/auth/google">Continue with Google</a>:<div className="google-signup-pending"><button type="button" className="secondary" disabled>Continue with Google</button><small>Google signup is awaiting setup. You can create an account with email below.</small></div>;
}
export function SignupForm({request,onCreated,onBack,google}){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 async function submit(event){
  event.preventDefault();const input=Object.fromEntries(new FormData(event.currentTarget));setError('');
  if(input.password!==input.confirm){setError('Passwords do not match.');return;}
  delete input.confirm;setBusy(true);
  try{await request('/auth/signup','POST',input);onCreated(input.email);}catch(error){setError(error.message);}finally{setBusy(false);}
 }
 return <section className="signup-panel"><h2>Create your account</h2><p>Choose your own password. New accounts need owner activation.</p><GoogleSignup available={google}/><div className="demo-divider"><span>OR USE EMAIL</span></div><form onSubmit={submit}><label className="field"><span>Full name</span><input name="name" autoComplete="name" required maxLength={100}/></label><label className="field"><span>Email address</span><input type="email" name="email" autoComplete="email" required maxLength={254}/></label><label className="field"><span>Password</span><PasswordInput name="password" required minLength={8} maxLength={24} autoComplete="new-password"/></label><label className="field"><span>Confirm password</span><PasswordInput name="confirm" required minLength={8} maxLength={24} autoComplete="new-password"/></label><small>Use 8–24 characters.</small>{error&&<p className="error" role="alert">{error}</p>}<button className="primary" disabled={busy}>{busy?'Creating account…':'Create account'}</button></form><button type="button" className="text-button" onClick={onBack}>Already have an account? Sign in</button></section>;
}
