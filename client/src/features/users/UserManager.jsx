import {PasswordInput} from '../auth/PasswordInput.jsx';
import {randomId} from '../../../../shared/id.js';
import {OwnerDashboard} from './OwnerDashboard.jsx';
import React,{useEffect,useState} from 'react';
import {Users,Plus,ShieldCheck,Check,Eye,Wallet,CheckSquare,Sparkles} from 'lucide-react';
import {APP_LABELS} from '../../../../shared/access.js';
import {demoAdmin,demoMember} from '../auth/Auth.jsx';
const APP_ACCESS=['money','tasks'];
const icons={money:Wallet,tasks:CheckSquare,assistant:Sparkles};
function readDemoUsers(){try{return JSON.parse(localStorage.getItem('daywell-demo-users'))||[demoAdmin,demoMember];}catch{return [demoAdmin,demoMember];}}

export function UserManager({mode,api,onPreview}){
  const [users,setUsers]=useState([]),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[editing,setEditing]=useState(null),[permissions,setPermissions]=useState(['tasks']);
  async function load(){if(mode==='demo'){setUsers(readDemoUsers());}else{const result=await api('/admin/users');setUsers(result.users);}}
  useEffect(()=>{load().catch(e=>setError(e.message)).finally(()=>setLoading(false));},[]);
  function edit(user){setEditing(user);setPermissions(user.permissions.filter(p=>APP_ACCESS.includes(p)));setError('');setNotice('');}
  async function removeUser(user){
    if(user.role==='admin'||busy)return;
    if(!window.confirm(`Permanently delete ${user.name} (${user.email})? Their account, tasks, financial records and active sessions will be removed. This cannot be undone.`))return;
    setBusy(true);setError('');setNotice('');
    try{
      if(mode==='demo'){
        const next=users.filter(value=>value.id!==user.id);localStorage.setItem('daywell-demo-users',JSON.stringify(next));setUsers(next);
      }else{
        await api('/admin/users/'+user.id,'DELETE',{email:user.email});await load();
      }
      if(editing?.id===user.id){setEditing(null);setPermissions(['tasks']);}
      setNotice('User deleted. Their account and records have been removed.');
    }catch(error){setError(error.message);}finally{setBusy(false);}
  }
  async function save(e){
    e.preventDefault();setError('');setNotice('');setBusy(true);
    try{
      if(!permissions.length)throw new Error('Tick at least one app, or select All apps.');
      const fields=Object.fromEntries(new FormData(e.target));
      let invitation;
      const value=editing?{permissions,active:fields.active==='on',...(mode==='live'&&fields.password?{password:fields.password}:{})}:{name:fields.name.trim(),email:fields.email.trim().toLowerCase(),permissions,...(mode==='live'&&fields.password?{password:fields.password}:{})};
      if(mode==='demo'){
        if(!editing&&users.some(u=>u.email===value.email))throw new Error('An account with this email already exists.');
        const next=editing?users.map(u=>u.id===editing.id?{...u,...value}:u):[...users,{...value,id:randomId(),role:'user',active:true}];
        localStorage.setItem('daywell-demo-users',JSON.stringify(next));setUsers(next);
      }else{const result=await api(editing?'/admin/users/'+editing.id:'/admin/users',editing?'PATCH':'POST',value);invitation=result.invitation;await load();}
      setEditing(null);setPermissions(['tasks']);e.target.reset();setNotice(editing?'Access updated. The user will need to sign in again.':mode==='demo'?'Demo user added. Use Preview access to try their workspace.':invitation==='sent'?'Account created. Welcome email accepted for sending; the member can set their password.':invitation==='failed'?'Account created, but the welcome email failed. Do not create it again. Check email settings, then use Forgot password to send a new link.':'Account created. Email is not configured; share the initial sign-in details privately.');
    }catch(err){setError(err.message);}finally{setBusy(false);}
  }
  return <><OwnerDashboard mode={mode} api={api} users={users}/><div className="admin-layout"><section className="card user-list-card"><div className="card-heading"><div><h3>People & access</h3><p>Only you can add users and choose their apps.</p></div><span className="count-badge">{users.length} accounts</span></div>{mode==='demo'&&<div className="info-note"><Eye size={17}/>Demo accounts are previews, not real login accounts.</div>}{loading?<p className="empty">Loading accounts…</p>:<div className="user-list">{users.map(user=><article key={user.id} className="user-row"><div className="user-row-top"><span className="avatar">{user.name.slice(0,2).toUpperCase()}</span><div className="grow"><strong>{user.name}</strong><small>{user.email}</small></div><span className={'badge '+(user.active?'low':'high')}>{user.role==='admin'?'Owner':user.active?'Active':'Disabled'}</span></div><div className="access-chips">{user.permissions.filter(p=>APP_ACCESS.includes(p)).map(p=><span key={p}><Check size={11}/>{APP_LABELS[p]}</span>)}</div>{user.role!=='admin'&&<div className="button-row"><button className="secondary" disabled={busy} onClick={()=>edit(user)}>Edit access</button><button className="secondary delete-user" disabled={busy} onClick={()=>removeUser(user)}>Delete user</button>{mode==='demo'&&<button className="text-button" disabled={!user.active||busy} onClick={()=>onPreview(user)}><Eye size={14}/>Preview access</button>}</div>}</article>)}</div>}</section><section className="card user-editor"><div className="card-heading"><div><h3>{editing?'Edit '+editing.name+'’s access':'Add a family member'}</h3><p>{editing?'Changes end existing sessions.':'Family testing access. No payment is required.'}</p></div>{editing?<ShieldCheck size={20}/>:<Plus size={20}/>}</div><form key={editing?.id||'new'} onSubmit={save}>{!editing&&<><label className="field"><span>Full name</span><input name="name" required maxLength={100} placeholder="e.g. Maya Haddad"/></label><label className="field"><span>Sign-in email</span><input name="email" type="email" required maxLength={254} placeholder="maya@example.com"/></label>{mode==='live'&&<label className="field"><span>Initial password (optional)</span><PasswordInput name="password"  autoComplete="new-password" minLength={8} maxLength={24} placeholder="Leave blank to send a password setup invitation"/></label>}</>}{editing&&mode==='live'&&<label className="field"><span>Reset password (optional)</span><PasswordInput name="password"  autoComplete="new-password" minLength={8} maxLength={24} placeholder="Leave blank to keep current password"/></label>}<fieldset className="access-fieldset"><legend>Which apps can they access?</legend><label className="all-access-option"><input type="checkbox" checked={permissions.length===APP_ACCESS.length} onChange={e=>setPermissions(e.target.checked?[...APP_ACCESS]:[])}/><span><strong>All apps</strong><small>Money and Tasks</small></span></label><div className="access-options">{APP_ACCESS.map(app=>{const Icon=icons[app];return <label key={app} className={permissions.includes(app)?'checked':''}><input type="checkbox" checked={permissions.includes(app)} onChange={e=>setPermissions(e.target.checked?[...permissions,app]:permissions.filter(p=>p!==app))}/><Icon size={19}/><span>{APP_LABELS[app]}</span></label>;})}</div></fieldset><p className="form-hint access-hint">{permissions.length?`${permissions.length} of 2 apps selected. Unticked apps are hidden and blocked.`:'Select Money, Tasks, or both.'}</p>{editing&&<label className="context-toggle"><input name="active" type="checkbox" defaultChecked={editing.active}/>Account enabled — allow this user to sign in</label>}{error&&<div className="error" role="alert">{error}</div>}{notice&&<div className="success-note" role="status"><Check size={16}/>{notice}</div>}<div className="button-row"><button className="primary" disabled={busy}>{busy?'Saving…':editing?'Save access':'Create user'}<Check size={15}/></button>{editing&&<button type="button" className="secondary" disabled={busy} onClick={()=>{setEditing(null);setPermissions(['tasks']);setError('');}}>Cancel edit</button>}</div><p className="admin-footnote">App access doesn’t grant access to other people’s records or to user management.</p></form></section></div></>;
}

