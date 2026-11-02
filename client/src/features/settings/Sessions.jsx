import React,{useEffect,useState} from 'react';
export function Sessions({api,mode}){
 const [rows,setRows]=useState([]),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function load(){try{setRows((await api('/auth/sessions')).sessions);}catch(e){setError(e.message);}}
 useEffect(()=>{if(mode==='live')load();},[]);
 async function revoke(id){setBusy(true);setError('');try{await api('/auth/sessions/'+id,'DELETE',{});await load();}catch(e){setError(e.message);}finally{setBusy(false);}}
 return <section className="card everyday-card"><h3>Signed-in sessions</h3><p>End access on another browser. Password changes end all sessions.</p>{mode==='demo'?<p>Session management is available when signed in to a live account.</p>:rows.map((row,i)=><div className="recovery-row" key={row.id}><strong>{row.current?'This browser':'Other browser session '+(i+1)}</strong><span>Expires {row.expires_at} UTC</span>{!row.current&&<button className="secondary" disabled={busy} onClick={()=>revoke(row.id)}>Sign out this session</button>}</div>)}{error&&<p role="alert">{error}</p>}</section>;
}
