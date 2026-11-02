import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createApp} from '../../server/src/app.js';
import {tokenHash} from '../../server/src/modules/auth/passwords.js';

async function fixture(t,{enabled=true,providerError=false}={}){
 let calls=0;const users=new Map(['a','b','c'].map((letter,i)=>[tokenHash(letter.repeat(64)),{id:i+1,name:'Test',email:'test@example.local',active:true,role:'user',permissions:i===2?[]:['tasks']}]));
 const server=createApp({db:{},authStore:{session:async hash=>users.get(hash)},recoveryOptions:null,speechOptions:{env:{COMPANION_VOICE_ENABLED:enabled?'true':'false',OPENAI_API_KEY:'private-test-key'},fetchSpeech:async(url,options)=>{calls++;assert.equal(url,'https://api.openai.com/v1/audio/speech');assert.equal(options.headers.Authorization,'Bearer private-test-key');return providerError?new Response('PRIVATE PROVIDER FAILURE',{status:401}):new Response(new Uint8Array([73,68,51]),{headers:{'Content-Type':'audio/mpeg'}});}}}).listen(0,'127.0.0.1');
 await once(server,'listening');t.after(()=>new Promise(resolve=>{server.close(resolve);server.closeAllConnections();}));
 const base='http://127.0.0.1:'+server.address().port;
 const call=(path,{token='a',method='GET',body,origin}={})=>fetch(base+'/api/companion/'+path,{method,headers:{'Content-Type':'application/json',...(token?{Cookie:'daywell_session='+token.repeat(64)}:{}),...(origin?{Origin:origin}:{})},body:body===undefined?undefined:JSON.stringify(body)});
 return {call,calls:()=>calls};
}
const body={text:'Hello',language:'en',voice:'marin',avatar:'sage',speed:1};

test('natural voice requires authentication, companion access, explicit server enablement and same-origin requests',async t=>{
 const f=await fixture(t,{enabled:false});
 assert.equal((await f.call('voice',{token:null})).status,401);
 assert.equal((await f.call('voice',{token:'c'})).status,403);
 assert.deepEqual(await (await f.call('voice')).json(),{available:false,voices:['marin','cedar']});
 assert.equal((await f.call('speech',{method:'POST',body})).status,503);
 assert.equal((await f.call('speech',{method:'POST',body,origin:'https://other.example'})).status,403);
 assert.equal(f.calls(),0);
});

test('voice proxy validates input, returns uncached audio, and hides provider failures and credentials',async t=>{
 const f=await fixture(t);
 assert.equal((await f.call('speech',{method:'POST',body:{...body,text:'x'.repeat(3001)}})).status,400);
 const response=await f.call('speech',{method:'POST',body});
 assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/audio\/mpeg/);assert.equal(response.headers.get('cache-control'),'no-store');assert.match(response.headers.get('content-security-policy'),/media-src 'self' blob:/);
 assert.deepEqual([...new Uint8Array(await response.arrayBuffer())],[73,68,51]);
 const error=await fixture(t,{providerError:true}),failed=await error.call('speech',{method:'POST',body});
 assert.equal(failed.status,502);assert.doesNotMatch(await failed.text(),/PRIVATE|private-test-key/);
});

test('paid speech rate limits are per user and do not block another account',async t=>{
 const f=await fixture(t);
 for(let i=0;i<8;i++)assert.equal((await f.call('speech',{method:'POST',body})).status,200);
 assert.equal((await f.call('speech',{method:'POST',body})).status,429);
 assert.equal((await f.call('speech',{token:'b',method:'POST',body})).status,200);
 assert.equal(f.calls(),9);
});
