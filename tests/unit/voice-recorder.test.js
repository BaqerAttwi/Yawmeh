import test from 'node:test';
import assert from 'node:assert/strict';
import {createVoiceRecorder} from '../../client/src/features/assistant/voice-recorder.js';
const tick=()=>new Promise(resolve=>setImmediate(resolve));

test('cancelling while permission is pending releases the late microphone without uploading',async()=>{
 let grant,stopped=0,uploads=0;
 const recorder=createVoiceRecorder({mediaDevices:{getUserMedia:()=>new Promise(resolve=>{grant=resolve;})},Recorder:class {},fetchAudio:async()=>{uploads++;},onState:()=>{},onTranscript:()=>assert.fail('stale transcript'),onError:()=>assert.fail('cancel is not an error')});
 const pending=recorder.start();recorder.cancel();grant({getTracks:()=>[{stop(){stopped++;}}]});await pending;
 assert.equal(stopped,1);assert.equal(uploads,0);
});

test('stop uploads once, releases microphone, and cancellation suppresses late transcripts',async()=>{
 let active,stopped=0,complete,signal;const transcripts=[],states=[];
 class Recorder {
  static isTypeSupported(type){return type==='audio/webm;codecs=opus';}
  constructor(){active=this;this.state='inactive';}
  start(){this.state='recording';}
  stop(){this.state='inactive';this.ondataavailable?.({data:new Blob(['audio'])});this.onstop?.();}
 }
 const recorder=createVoiceRecorder({Recorder,mediaDevices:{getUserMedia:async()=>({getTracks:()=>[{stop(){stopped++;}}]})},onState:s=>states.push(s),onTranscript:t=>transcripts.push(t),onError:()=>assert.fail('cancel is not an error'),fetchAudio:async(url,options)=>{assert.match(url,/language=auto$/);signal=options.signal;assert.equal(options.body.size,5);return new Promise(resolve=>{complete=resolve;});}});
 await recorder.start();assert.equal(active.state,'recording');recorder.stop();await tick();
 assert.equal(stopped,1);assert.equal(states.at(-1),'transcribing');recorder.cancel();assert.equal(signal.aborted,true);
 complete(Response.json({text:'ignore stale words'}));await tick();assert.deepEqual(transcripts,[]);assert.equal(states.at(-1),'idle');
});
