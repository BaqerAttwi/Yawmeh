const accountKey='yawmeh:offline-account';
const queuePrefix='yawmeh:offline-entry:';
export const queueChanged='yawmeh:offline-entries-changed';

export function offlineAccount() {
  try{return JSON.parse(localStorage.getItem(accountKey));}catch{return null;}
}

export function rememberOfflineAccount(account) {
  try{
    if(account)localStorage.setItem(accountKey,JSON.stringify(account));
    else localStorage.removeItem(accountKey);
  }catch{/* The online workspace can operate with storage disabled. */}
}

export function newOfflineEntry(userId,value,kind='entries') {
  return {kind,createdAt:performance.timeOrigin+performance.now(),value:{...value,offline_sync:{id:crypto.randomUUID(),account:String(userId)}}};
}

export const offlineKind=record=>record.kind||'entries';
export const offlineTitle=record=>record.value.title||record.value.text;
export function canSyncOffline(record,{money,tasks}){
  return offlineKind(record)==='entries'?money:tasks;
}

const prefix=account=>queuePrefix+account+':';
const key=record=>prefix(record.value.offline_sync.account)+record.value.offline_sync.id;

export function pendingEntries(account) {
  const records=[];
  try{
    for(let i=0;i<localStorage.length;i++){
      const name=localStorage.key(i);
      if(!name?.startsWith(prefix(account)))continue;
      const stored=JSON.parse(localStorage.getItem(name));
      if(stored&&key(stored)===name)records.push(stored);
    }
  }catch{/* Storage can be unavailable in private or restricted browsers. */}
  return records.sort((a,b)=>a.createdAt-b.createdAt);
}

export function storeOfflineEntry(record) {
  try{localStorage.setItem(key(record),JSON.stringify(record));}
  catch{throw new Error('This browser could not save the record on this device. Keep the form open and try again.');}
  window.dispatchEvent(new Event(queueChanged));
}

export function removeOfflineEntry(record) {
  localStorage.removeItem(key(record));
  window.dispatchEvent(new Event(queueChanged));
}

export const retryableEntryError=error=>!error.status||error.status===429||error.status>=500;

export async function syncOfflineEntries(account,send,onSaved,allowed=()=>true) {
  for(const record of pendingEntries(account)){
    if(record.error||!allowed(record))continue;
    try{await send(record.value,offlineKind(record));}
    catch(error){
      if([401,403].includes(error.status)||error.code==='OFFLINE_ACCOUNT_MISMATCH')return {needsAccount:true};
      if(retryableEntryError(error))break;
      // Another tab may have finished syncing this transaction while the request was in flight.
      if(localStorage.getItem(key(record)))storeOfflineEntry({...record,error:error.message});
      continue;
    }
    removeOfflineEntry(record);
    onSaved();
  }
}
