// A recording owns its microphone tracks, upload and timer until stop/cancel.
export function createVoiceRecorder({onState,onTranscript,onError,mediaDevices=navigator.mediaDevices,Recorder=MediaRecorder,fetchAudio=fetch}) {
 let generation=0,stream,recorder,timer,controller;
 function release(){clearTimeout(timer);stream?.getTracks().forEach(track=>track.stop());stream=null;}
 function cancel(){generation++;controller?.abort();controller=null;if(recorder){recorder.ondataavailable=null;recorder.onstop=null;recorder.onerror=null;if(recorder.state!=='inactive')recorder.stop();recorder=null;}release();onState('idle');}
 async function start(language='auto'){
  cancel();const id=generation;onState('starting');
  try{
   const input=await mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
   if(id!==generation){input.getTracks().forEach(track=>track.stop());return;}
   stream=input;
   const mimeType=['audio/webm;codecs=opus','audio/mp4','audio/ogg;codecs=opus'].find(type=>Recorder.isTypeSupported(type));
   if(!mimeType)throw new Error('format');
   const active=new Recorder(stream,{mimeType});recorder=active;const chunks=[];let size=0;
   active.ondataavailable=e=>{if(id!==generation||!e.data.size)return;size+=e.data.size;if(size>8*1024*1024){cancel();onError();return;}chunks.push(e.data);};
   active.onerror=()=>{if(id===generation){cancel();onError();}};
   active.onstop=async()=>{
    release();recorder=null;if(id!==generation)return;
    if(!chunks.length){onState('idle');onError();return;}
    onState('transcribing');controller=new AbortController();const request=controller;
    timer=setTimeout(()=>request.abort(),35000);
    try{
     const response=await fetchAudio('/api/companion/transcription?language='+encodeURIComponent(language),{method:'POST',credentials:'same-origin',headers:{'Content-Type':mimeType},body:new Blob(chunks,{type:mimeType}),signal:request.signal});
     if(!response.ok)throw new Error('transcription');
     const result=await response.json();if(id!==generation)return;
     if(typeof result.text!=='string'||!result.text.trim())throw new Error('empty');
     onTranscript(result.text);onState('done');
    }catch{if(id===generation){onState('idle');onError();}}
    finally{if(id===generation){clearTimeout(timer);controller=null;}}
   };
   active.start(1000);onState('listening');timer=setTimeout(()=>{if(id===generation&&active.state==='recording')active.stop();},60000);
  }catch{if(id===generation){cancel();onError();}}
 }
 return {start,cancel,stop(){if(recorder?.state==='recording')recorder.stop();}};
}
