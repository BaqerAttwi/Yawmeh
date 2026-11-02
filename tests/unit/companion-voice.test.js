import test from 'node:test';
import assert from 'node:assert/strict';
import {createVoicePlayer,speechChunks} from '../../client/src/features/assistant/voice-player.js';
import {speechRequest,speechSchema,speechAvailable} from '../../server/src/modules/ai/speech.js';
const tick=()=>new Promise(resolve=>setImmediate(resolve));

test('natural speech uses fixed endpoint, bounded validated input, and server-side credentials',()=>{
 const value={text:'أهلا! $15.00',language:'ar',voice:'marin',avatar:'sage',speed:1};
 const request=speechRequest(value,{OPENAI_API_KEY:'test-key'});
 assert.equal(request.url,'https://api.openai.com/v1/audio/speech');assert.equal(request.headers.Authorization,'Bearer test-key');
 assert.equal(request.body.input,value.text);assert.match(request.body.instructions,/Lebanese Arabic/);assert.equal(request.body.response_format,'mp3');
 assert.equal(speechAvailable({OPENAI_API_KEY:'key'}),false);assert.equal(speechAvailable({COMPANION_VOICE_ENABLED:'true',OPENAI_API_KEY:'key'}),true);
 for(const invalid of [{...value,text:'x'.repeat(3001)},{...value,voice:'url-to-voice'},{...value,speed:4},{...value,key:'override'}])assert.equal(speechSchema.safeParse(invalid).success,false);
});

test('long speech is chunked without losing words and stop aborts a pending request',async()=>{
 const text=('A sentence.\n').repeat(700).trim(),chunks=speechChunks(text);
 assert.ok(chunks.every(c=>c.length<=2800));assert.equal(chunks.join(' ').replace(/\s+/g,' ').trim(),text.replace(/\s+/g,' '));
 let signal,finish;const states=[],errors=[];
 const player=createVoicePlayer({fetchAudio:async(_,options)=>{signal=options.signal;return await new Promise(resolve=>{finish=resolve;});},makeUrl:()=>{throw new Error('must not create audio after stop');},onState:s=>states.push(s),onError:e=>errors.push(e)});
 const active=player.play('Hello',{language:'en'});await tick();player.stop();assert.equal(signal.aborted,true);
 finish(new Response(new Uint8Array([1]),{headers:{'Content-Type':'audio/mpeg'}}));await active;
 assert.equal(states.at(-1),'idle');assert.deepEqual(errors,[]);
});

test('playback releases temporary audio URLs and reports blocked autoplay separately',async()=>{
 const states=[],revoked=[];let audio;
 const player=createVoicePlayer({fetchAudio:async()=>new Response(new Uint8Array([1]),{headers:{'Content-Type':'audio/mpeg'}}),makeUrl:()=> 'blob:test',revoke:u=>revoked.push(u),makeAudio:()=>audio={play:async()=>{},pause(){},removeAttribute(){},load(){}},onState:s=>states.push(s)});
 const playing=player.play('Hello',{language:'en'});await tick();assert.equal(states.at(-1),'speaking');audio.onended();await playing;assert.deepEqual(revoked,['blob:test']);assert.equal(states.at(-1),'idle');
 const errors=[];
 const denied=createVoicePlayer({fetchAudio:async()=>new Response(new Uint8Array([1]),{headers:{'Content-Type':'audio/mpeg'}}),makeUrl:()=> 'blob:blocked',revoke:()=>{},makeAudio:()=>({play:async()=>{const e=new Error('denied');e.name='NotAllowedError';throw e;},pause(){},removeAttribute(){},load(){}}),onError:e=>errors.push(e)});
 await denied.play('Hello',{language:'en'});assert.deepEqual(errors,[{played:false,blocked:true}]);
});
