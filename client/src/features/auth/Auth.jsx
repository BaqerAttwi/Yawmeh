import {SignupForm,GoogleSignup,InactiveAccount} from './SignupForm.jsx';
import {PasswordInput} from './PasswordInput.jsx';
import {WorkspaceLoading} from './WorkspaceLoading.jsx';
import {PasswordForm} from './PasswordForm.jsx';
import React, {useEffect, useState} from 'react';
import {Leaf, ArrowRight, LockKeyhole, ShieldCheck, CheckSquare, LogIn} from 'lucide-react';
import {APP_ACCESS} from '../../../../shared/access.js';

export const demoAdmin = {id:'demo-admin',name:'Alex',email:'admin@demo.local',role:'admin',permissions:APP_ACCESS,active:true};
export const demoMember = {id:'demo-tasks',name:'Sam',email:'sam@demo.local',role:'user',permissions:['tasks'],active:true};
export async function request(path, method='GET', body) {
  const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),20000);
  try{
  const response=await fetch('/api'+path,{method,credentials:'same-origin',signal:controller.signal,headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
  let result;try{result=await response.json();}catch{throw new Error('The server is unavailable. Please try again shortly.');}
  if(!response.ok){const error=new Error(result.error||'Request failed.');error.status=response.status;error.code=result.code;throw error;}
  return result;
  }catch(error){if(error.name==='AbortError')throw new Error('The connection is taking too long. Please try again.');throw error;}finally{clearTimeout(timeout);}
}

export function AuthGate({children}) {
  const [authResult]=useState(()=>{const value=new URLSearchParams(window.location.hash.slice(1)).get('auth');if(value)window.history.replaceState(null,'',window.location.pathname+window.location.search);return value;});
  const [signup,setSignup]=useState(false),[inactive,setInactive]=useState(['inactive','verified','verification_failed'].includes(authResult)),[created,setCreated]=useState(false),[pendingEmail,setPendingEmail]=useState(''),[google,setGoogle]=useState(false);
  useEffect(()=>{let active=true;request('/auth/options').then(value=>{if(active)setGoogle(value.google);}).catch(()=>{});return()=>{active=false;};},[]);
  const [resetToken]=useState(()=>{const token=new URLSearchParams(window.location.hash.slice(1)).get('reset');if(token)window.history.replaceState(null,'',window.location.pathname+window.location.search);return token;});
  const [recovery,setRecovery]=useState(resetToken?'reset':null),[notice,setNotice]=useState('');
  const [session,setSession]=useState(null),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(authResult==='google_existing_account'?'This email already has an account. Sign in with your password or use Forgot password.':authResult?.startsWith('google_')?'Google sign-in could not be completed. Try again or use email.':'');
  useEffect(()=>{let active=true;request('/data').then(data=>{if(active)setSession({user:data.user,mode:'live',data});}).catch(error=>{if(active&&error.code==='ACCOUNT_INACTIVE')setInactive(true);else if(active&&error.status!==401)setError(error.message);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[]);
  useEffect(()=>{
    if(session?.mode!=='live')return;
    let active=true;
    const check=()=>request('/auth/me').then(({user})=>{if(active)setSession(s=>s?{...s,user}:s);}).catch(e=>{if(active&&e.code==='ACCOUNT_INACTIVE'){setSession(null);setInactive(true);}else if(active&&e.status===401){setSession(null);setError('Your session ended or your access changed. Please sign in again.');}});
    const timer=setInterval(check,60000);window.addEventListener('focus',check);
    return()=>{active=false;clearInterval(timer);window.removeEventListener('focus',check);};
  },[session?.mode]);
  async function login(event){
    event.preventDefault();setError('');setBusy(true);
    try {const credentials=Object.fromEntries(new FormData(event.target));credentials.remember=credentials.remember==="on";const {user}=await request('/auth/login','POST',credentials);const data=await request('/data');setSession({user,data,mode:'live'});}
    catch(e){if(e.code==='ACCOUNT_INACTIVE')setInactive(true);else setError(e.message);}finally{setBusy(false);}
  }
  async function logout(){
    if(session?.mode==='live') {try{await request('/auth/logout','POST',{});}catch(e){setError(e.message);throw e;}}
    setSession(null);setError('');
  }
  if(loading)return <WorkspaceLoading/>;
  if(inactive)return <InactiveAccount email={pendingEmail} request={request} verified={authResult==='verified'} created={created} onBack={()=>{setInactive(false);setCreated(false);setSignup(false);setError('');}}/>;
  if(recovery)return <div className="login-page"><section className="login-panel"><div className="login-form-wrap"><PasswordForm kind={recovery} token={resetToken} request={request} onCancel={()=>setRecovery(null)} onDone={message=>{setSession(null);setNotice(message);setRecovery(null);}}/></div></section></div>;
  if(session)return children({...session,onSignup:()=>{setSession(null);setSignup(true);setError('');},onInactive:()=>{setSession(null);setInactive(true);},onLogout:logout,onExpired:()=>{setSession(null);setError('Please sign in again. Your session has ended.');},onPreview:user=>{if(session.mode==='demo')setSession({mode:'demo',user});}});
  return <div className="login-page"><section className="login-story"><a className="brand" aria-label="yawmeh.me home" href="#"><img className="brand-logo" src="/branding/yawmeh-logo-small.png" alt=""/><span className="brand-name">yawmeh.me</span></a><div className="login-story-body"><span className="eyebrow">YOUR EVERYDAY, A LITTLE CLEARER</span><h1>A space for your kind of day.</h1><p>Your money, your plans, and a little guidance. All together. All on your terms.</p>{!signup&&<section className="login-demo" aria-label="Try the demo"><h2>Try the demo</h2><div className="demo-login-options"><button className="primary" disabled={busy} onClick={()=>{setError('');setSession({mode:'demo',user:demoAdmin});}}><ShieldCheck size={17}/>Try admin demo</button><button className="secondary" disabled={busy} onClick={()=>{setError('');setSession({mode:'demo',user:demoMember});}}><CheckSquare size={17}/>Try Tasks-only demo</button></div><small className="demo-explainer">Explore with sample data, no account needed.</small></section>}<div className="login-preview"><div><span className="mini-check">✓</span><span>Plan one small win</span><span className="badge low">Today</span></div><div><span className="mini-check">✓</span><span>Give your savings a little room</span></div><div><span className="mini-check">✓</span><span>Make time for what matters</span></div></div></div><span className="login-footer"><ShieldCheck size={15}/>Your own account. Your own records.</span></section><section className="login-panel"><div className="login-form-wrap"><span className="login-lock"><LockKeyhole size={23}/></span>{signup?<SignupForm request={request} google={google} onCreated={email=>{setPendingEmail(email);setCreated(true);setInactive(true);setSignup(false);}} onBack={()=>setSignup(false)}/>:<><h2>Welcome back.</h2><p>Sign in to the apps your administrator has shared with you.</p>{notice&&<p role="status">{notice}</p>}<GoogleSignup available={google}/><form onSubmit={login}><label className="field"><span>Email address</span><input type="email" name="email" autoComplete="username" placeholder="you@example.com" required maxLength={254}/></label><label className="field"><span>Password</span><PasswordInput  name="password" autoComplete="current-password" placeholder="Enter your password" required maxLength={128}/></label><label style={{display:"flex",gap:8,alignItems:"center",marginBottom:16}}><input type="checkbox" name="remember"/>Remember this device for 30 days</label><small>Use only on a device you trust.</small>{error&&<div className="error" role="alert">{error}</div>}<button className="primary login-submit" disabled={busy}>{busy?'Signing in…':'Sign in'}<ArrowRight size={17}/></button></form><button className="text-button" onClick={()=>setRecovery('forgot')}>Forgot password?</button><button type="button" className="text-button" onClick={()=>{setSignup(true);setError('');}}>Create an account</button><p className="invite-note">New accounts require owner activation.</p></>}</div></section></div>;
}

