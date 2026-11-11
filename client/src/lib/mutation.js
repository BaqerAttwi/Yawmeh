export class SaveStateError extends Error {constructor(message,state){super(message);this.state=state;}}
export async function mutateAndRefresh(api,action,onReceipt){
 let receipt;
 try{receipt=await api(action.path,action.method||'POST',action.value);}
 catch(error){if(!error.status||error.status>=500)throw new SaveStateError('The server could not confirm this save. Refresh your records and check whether it was recorded before trying again.','unknown');throw error;}
 onReceipt?.(receipt);
 try{return await api('/data');}
 catch{throw new SaveStateError('Your change was saved, but the latest records could not be loaded. Refresh your records before making another change.','saved');}
}
