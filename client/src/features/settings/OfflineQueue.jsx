import React,{useState} from 'react';
import {entrySchema,schemas} from '../../../../shared/validation.js';
import {captureSchema} from '../../../../shared/daily.js';
import {today} from '../../../../shared/domain.js';
import {Field} from '../../components/ui.jsx';
import {offlineKind,offlineTitle,removeOfflineEntry,storeOfflineEntry} from '../../lib/offline-entries.js';

export function OfflineQueue({records,ready,offline,busy,onRetry}){
  return <section className="card everyday-card" aria-label="Offline queue">
    <div className="button-row">
      <strong role="status">{offline?'You’re offline':ready?'Offline ready':'Offline capture isn’t ready on this device yet'}</strong>
      {ready&&<a href="/offline.html">Open offline capture</a>}
    </div>
    {records.length>0&&<details open={offline||records.some(record=>record.error)||undefined}>
      <summary>Pending records ({records.length})</summary>
      {records.map(record=><OfflineRecord key={record.value.offline_sync.id} record={record} busy={busy} onRetry={onRetry}/>)}
    </details>}
  </section>;
}

function OfflineRecord({record,busy,onRetry}){
  const [editing,setEditing]=useState(false),[error,setError]=useState('');
  const {value}=record,kind=offlineKind(record);
  function save(event){
    event.preventDefault();
    try{
      const fields=Object.fromEntries(new FormData(event.currentTarget));
      const input={...value,...fields};
      let parsed;
      if(kind==='entries'){
        parsed=entrySchema.parse(input);
        if(parsed.saved>parsed.amount)throw new Error('Savings allocation cannot exceed income.');
        if(parsed.date>today())throw new Error('Transactions cannot be dated in the future.');
      }else if(kind==='tasks')parsed=schemas.tasks.parse(input);
      else parsed=captureSchema.parse({text:input.text});
      storeOfflineEntry({...record,value:{...value,...parsed},error:undefined});
      setEditing(false);setError('');onRetry();
    }catch(failure){setError(failure.issues?.[0]?.message||failure.message);}
  }
  function discard(){
    if(!window.confirm('Discard this unsynced record?'))return;
    try{removeOfflineEntry(record);}catch(failure){setError(failure.message);}
  }
  const detail=kind==='entries'?`${value.type==='income'?'Income':'Expense'} · ${value.amount} ${value.currency} · ${value.date}`:kind==='tasks'?`Task · due ${value.due}`:'Inbox note';
  return <div className="recovery-row">
    <div>
      <strong>{offlineTitle(record)}</strong>
      <p>{detail} · {record.error?'Needs review':'Pending sync'}</p>
      {record.error&&<p role="status">{record.error}</p>}
    </div>
    {record.error&&!editing&&<div className="button-row">
      <button type="button" className="secondary" disabled={busy} onClick={()=>setEditing(true)}>Edit</button>
      <button type="button" className="secondary" disabled={busy} onClick={()=>{try{storeOfflineEntry({...record,error:undefined});onRetry();}catch(failure){setError(failure.message);}}}>Retry sync</button>
      <button type="button" className="secondary" disabled={busy} onClick={discard}>Discard</button>
    </div>}
    {record.error&&editing&&<form onSubmit={save} aria-label="Edit pending record">
      {kind==='inbox'?<label className="field"><span>Note</span><textarea name="text" defaultValue={value.text} required maxLength={1000}/></label>:<Field label="Description" name="title" defaultValue={value.title} required maxLength={160}/>}
      {kind==='entries'&&<>
        <Field label={`Amount (${value.currency})`} name="amount" type="number" min="0.01" max="999999999" step="0.01" defaultValue={value.amount} required/>
        <Field label="Date" name="date" type="date" min="1000-01-01" max={today()} defaultValue={value.date} required/>
        {value.type==='income'&&<Field label="Savings allocation" name="saved" type="number" min="0" max="999999999" step="0.01" defaultValue={value.saved} required/>}
      </>}
      {kind==='tasks'&&<Field label="Due date" name="due" type="date" min="1000-01-01" defaultValue={value.due} required/>}
      <div className="button-row"><button className="primary" disabled={busy}>Save correction</button><button type="button" className="secondary" onClick={()=>{setEditing(false);setError('');}}>Cancel</button></div>
    </form>}
    {error&&<p role="alert">{error}</p>}
  </div>;
}
