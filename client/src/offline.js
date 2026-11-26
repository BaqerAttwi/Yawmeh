import './styles/tokens.css';
import './styles/offline.css';
import './lib/theme.js';
import {applyPalette,getPalette} from './lib/palette.js';
import {entrySchema,schemas} from '../../shared/validation.js';
import {captureSchema} from '../../shared/daily.js';
import {today} from '../../shared/domain.js';
import {canSyncOffline,newOfflineEntry,offlineAccount,offlineTitle,pendingEntries,queueChanged,storeOfflineEntry,syncOfflineEntries} from './lib/offline-entries.js';
import {request} from './lib/request.js';

applyPalette(getPalette());

const form=document.querySelector('#entry'),task=document.querySelector('#task'),note=document.querySelector('#note');
const intro=document.querySelector('#intro'),queue=document.querySelector('#queue'),list=queue.querySelector('ul');
const status=document.querySelector('#pending'),error=document.querySelector('#error');
const account=offlineAccount();
let syncing=false,synced=0,needsAccount=false;

function activeProfile(){
  const profile=offlineAccount();
  return account&&profile?.id===account.id?profile:null;
}
function allowed(record){
  const profile=activeProfile();
  return !!profile&&canSyncOffline(record,{money:!!profile.currencies?.length,tasks:!!profile.tasks});
}
function updatePending(){
  const profile=activeProfile();
  form.hidden=!profile?.currencies?.length;
  task.hidden=note.hidden=!profile?.tasks;
  const records=profile?pendingEntries(profile.id).filter(allowed):[];
  const review=records.filter(record=>record.error).length;
  const pending=records.length-review;
  status.textContent=[
    synced&&profile&&`${synced} synced.`,
    pending&&`${pending} pending sync.`,
    pending&&needsAccount&&'Sign in to your original workspace to sync.',
    review&&`${review} need review in your workspace.`,
  ].filter(Boolean).join(' ');
  queue.hidden=!records.length;
  list.replaceChildren(...records.map(record=>{
    const item=document.createElement('li');
    item.textContent=`${offlineTitle(record)} · ${record.error?'Needs review':'Pending sync'}`;
    return item;
  }));
}
async function sync(){
  if(syncing||!activeProfile()||!navigator.onLine||!pendingEntries(account.id).some(record=>!record.error&&allowed(record)))return;
  syncing=true;
  try{
    const result=await syncOfflineEntries(account.id,(value,kind)=>request('/'+kind,'POST',value),()=>{synced++;},allowed);
    needsAccount=!!result?.needsAccount;
  }catch{
    // Keep the local queue available to retry.
  }finally{syncing=false;updatePending();}
}
function bind(element,kind,parse,reset){
  element.addEventListener('submit',event=>{
    event.preventDefault();
    error.hidden=true;
    try{
      if(!allowed({kind}))throw new Error('Your workspace changed. Reopen it before saving another record.');
      const value=parse(Object.fromEntries(new FormData(element)));
      storeOfflineEntry(newOfflineEntry(account.id,value,kind));
      element.reset();
      reset?.();
      element.querySelector('input,textarea')?.focus();
      void sync();
    }catch(failure){
      error.textContent=failure.issues?.[0]?.message||failure.message;
      error.hidden=false;
    }
  });
}
if(account)intro.textContent='New records stay on this device and sync when you reconnect. Transaction balances are checked at sync.';
if(account?.currencies?.length){
  const fields=form.elements;
  for(const {code,rate} of account.currencies){
    if(rate>0)fields.currency.add(new Option(code,code,code===account.currency,code===account.currency));
  }
  fields.date.defaultValue=fields.date.max=today();
  bind(form,'entries',raw=>{
    const currency=account.currencies.find(item=>item.code===raw.currency);
    const missingCategory=!raw.category.trim();
    const value=entrySchema.parse({...raw,category:raw.category.trim()||'Other',unit_rate:currency?.rate,
      ...(raw.type==='expense'&&missingCategory?{category_review_requested:true}:{})});
    if(value.date>today())throw new Error('Transactions cannot be dated in the future.');
    return value;
  },()=>{fields.date.value=fields.date.max=today();});
}
if(account?.tasks){
  task.elements.due.defaultValue=today();
  bind(task,'tasks',raw=>schemas.tasks.parse({...raw,priority:'medium'}),()=>{task.elements.due.value=today();});
  bind(note,'inbox',raw=>({...captureSchema.parse(raw),captured_on:today()}));
}
updatePending();
window.addEventListener(queueChanged,updatePending);
window.addEventListener('storage',updatePending);
window.addEventListener('online',sync);
if(account){setInterval(sync,15000);void sync();}
