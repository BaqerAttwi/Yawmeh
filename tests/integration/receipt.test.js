import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createApp} from '../../server/src/app.js';
import {tokenHash} from '../../server/src/modules/auth/passwords.js';

test('receipt scans require Money access and return only draft fields',async t=>{
  const shop={merchant:'Corner Market',amount:12.5,currency:'USD'};
  const users=new Map(['a','b'].map((letter,index)=>[tokenHash(letter.repeat(64)),{id:index+1,email:letter+'@test.local',active:true,role:'user',permissions:index?['tasks']:['money']}]));
  const calls=[];
  let output=shop,reserved=0;
  const db={query(){assert.fail('Receipt scanning must not access records');}};
  const options={
    env:{COMPANION_AI_ENABLED:'true',GEMINI_API_KEY:'test-key'},
    usage:{async reserve(){reserved++;return true;}},
    fetchAI:async(url,request)=>{
      calls.push({url,request});
      return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(output)}]}}]});
    },
  };
  const server=createApp({db,authStore:{session:async hash=>users.get(hash)},recoveryOptions:null,companionOptions:options}).listen(0,'127.0.0.1');
  await once(server,'listening');
  t.after(()=>{server.closeAllConnections();server.close();});
  const url=`http://127.0.0.1:${server.address().port}/api/companion/receipt`;
  const image=Buffer.concat([Buffer.from([255,216,255]),Buffer.alloc(70000),Buffer.from([255,217])]).toString('base64');
  const send=(letter,body={image},headers={})=>fetch(url,{method:'POST',headers:{'content-type':'application/json',...(letter?{cookie:'daywell_session='+letter.repeat(64)}:{}),...headers},body:JSON.stringify(body)});
  assert.equal((await send()).status,401);
  assert.equal((await send('b')).status,403);
  assert.equal((await send('a',{image},{origin:'https://other.test'})).status,403);
  assert.equal((await send('a',{image:'bm90IGEgcGhvdG8='})).status,400);
  assert.equal((await send('a',{image:'A'.repeat(1048576)})).status,413);
  assert.equal(reserved,0);
  const result=await send('a');
  assert.equal(result.status,200);
  assert.equal(result.headers.get('cache-control'),'no-store');
  assert.deepEqual(await result.json(),shop);
  assert.equal(reserved,1);
  assert.equal(calls[0].request.redirect,'error');
  const wire=JSON.parse(calls[0].request.body);
  assert.deepEqual(wire.contents,[{role:'user',parts:[{inlineData:{mimeType:'image/jpeg',data:image}}]}]);
  output={merchant:null,amount:3.333,currency:null};
  assert.deepEqual(await (await send('a')).json(),{merchant:null,amount:null,currency:null});
  output={...shop,card:'1234'};
  assert.equal((await send('a')).status,503);
});
