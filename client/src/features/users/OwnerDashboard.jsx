import React,{useEffect,useState} from 'react';
import './owner.css';

const dateLabel=value=>value?new Date(value.endsWith('Z')?value:value.replace(' ','T')+'Z').toLocaleString():'Not recorded yet';
export function OwnerDashboard({mode,api,users}){
 const [stats,setStats]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function refresh(){
  setBusy(true);setError('');
  try{setStats(await api('/admin/usage'));}catch(e){setError(e.message);}finally{setBusy(false);}
 }
 useEffect(()=>{if(mode==='live')refresh();},[mode,users]);
 const counts=mode==='demo'?{accounts:users.length,enabled:users.filter(u=>u.active).length,active_5m:0,active_7d:0,sign_ins:0}:stats?.counts;
 return <section className="card owner-dashboard" aria-label="Owner dashboard">
  <div className="owner-heading"><div><span className="eyebrow">OWNER AREA</span><h2>Accounts & access</h2><p>Review signups, grant ongoing or temporary access, and review usage.</p></div><span className="badge low">Payment collection not enabled</span></div>
  <p className="owner-privacy">Each member has private records. This dashboard shows account activity, not their tasks, transactions or chats.</p>
  {mode==='demo'&&<p className="info-note">Demo account counts only. Activity tracking is available after live sign-in.</p>}
  {counts&&<div className="owner-metrics">{[['accounts','Total accounts'],['enabled','Enabled accounts'],['active_5m','Active in last 5 minutes'],['active_7d','Active in last 7 days'],['sign_ins','Successful sign-ins']].map(([key,label])=><div key={key}><strong>{counts[key]}</strong><span>{label}</span></div>)}<div><strong>{mode==='demo'?0:stats?.ai_requests_month??0}</strong><span>Gemini attempts this month</span></div></div>}
  <p className="owner-caption">Activity is approximate signed-in request activity, not a live visitor count. Sign-ins count from when tracking was enabled. Disabled accounts are excluded from active counts.</p>
  {mode==='live'&&<><div className="button-row"><button className="secondary" disabled={busy} onClick={refresh}>{busy?'Refreshing…':'Refresh usage'}</button>{stats&&<small>Updated {dateLabel(stats.generated_at)}</small>}</div>{stats&&<details className="owner-activity"><summary>Account activity details</summary><div className="table-wrap"><table><thead><tr><th>Account</th><th>Last activity</th><th>Last sign-in</th><th>Sign-ins</th></tr></thead><tbody>{users.map(user=>{const activity=stats.activity.find(row=>row.id===user.id);return <tr key={user.id}><td><strong>{user.name}</strong><small>{user.role==='admin'?'Owner':'Family member'} · {user.active?'Enabled':'Disabled'}</small></td><td>{dateLabel(activity?.last_seen_at)}</td><td>{dateLabel(activity?.last_login_at)}</td><td>{activity?.login_count??0}</td></tr>;})}</tbody></table></div></details>}</>}
  {error&&<p role="alert" className="error">{error}</p>}
 </section>;
}
