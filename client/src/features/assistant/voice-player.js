// Each player owns its requests, audio elements, and temporary object URLs.
export function speechChunks(text,limit=2800){
 const chunks=[];let rest=text.trim();
 while(rest.length>limit){
  const candidate=rest.slice(0,limit),boundary=Math.max(candidate.lastIndexOf('\n'),candidate.lastIndexOf('. '),candidate.lastIndexOf(' '));
  let end=boundary>limit/2?boundary+1:limit;
  if(/[\uD800-\uDBFF]/.test(rest[end-1]))end--;
  chunks.push(rest.slice(0,end));rest=rest.slice(end).trimStart();
 }
 if(rest)chunks.push(rest);return chunks;
}

export function createVoicePlayer({fetchAudio=fetch,makeAudio=url=>new Audio(url),makeUrl=blob=>URL.createObjectURL(blob),revoke=url=>URL.revokeObjectURL(url),onState=()=>{},onError=()=>{}}={}){
 let generation=0,controller,audio,url,settle;
 function release(){if(audio){audio.onended=null;audio.onerror=null;audio.pause();audio.removeAttribute('src');audio.load();audio=null;}if(url){revoke(url);url=null;}}
 function stop(){generation++;controller?.abort();controller=null;settle?.();settle=null;release();onState('idle');}
 async function play(text,options){
  stop();const active=generation;controller=new AbortController();let played=false;
  try{
   for(const chunk of speechChunks(text)){
    if(active!==generation)return;onState('preparing');
    const response=await fetchAudio('/api/companion/speech',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({...options,text:chunk}),signal:controller.signal});
    if(!response.ok||!response.headers.get('content-type')?.startsWith('audio/'))throw new Error('service');
    const blob=await response.blob();if(active!==generation)return;
    url=makeUrl(blob);audio=makeAudio(url);
    await new Promise((resolve,reject)=>{
     settle=resolve;audio.onended=resolve;audio.onerror=()=>reject(new Error('playback'));
     audio.play().then(()=>{if(active===generation){played=true;onState('speaking');}}).catch(reject);
    });
    settle=null;if(active!==generation)return;release();
   }
   if(active===generation){controller=null;onState('idle');}
  }catch(error){if(active!==generation)return;release();controller=null;settle=null;onState('idle');onError({played,blocked:error.name==='NotAllowedError'});}
 }
 return {play,stop};
}
