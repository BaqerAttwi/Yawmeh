import test from 'node:test';
import assert from 'node:assert/strict';
import {aiRequest,aiText} from '../../server/src/modules/ai/providers.js';
test('AI adapters use provider-specific roles and server-side credentials',()=>{
 const messages=[{role:'user',content:'Help me plan'},{role:'assistant',content:'Start small'},{role:'user',content:'What next?'}];
 const env={OPENAI_API_KEY:'test',ANTHROPIC_API_KEY:'test',GEMINI_API_KEY:'test'};
 assert.equal(aiRequest('openai',messages,'system',env).body.store,false);
 assert.equal(aiRequest('claude',messages,'system',env).headers['anthropic-version'],'2023-06-01');
 assert.equal(aiRequest('gemini',messages,'system',env).body.contents[1].role,'model');
 assert.throws(()=>aiRequest('openai',messages,'system',{}),/OPENAI_API_KEY/);
});
test('AI adapters extract only answer text',()=>{
 assert.equal(aiText('openai',{output:[{type:'reasoning'},{content:[{type:'output_text',text:'Plan'}]}]}),'Plan');
 assert.equal(aiText('claude',{content:[{type:'thinking',thinking:'Private'},{type:'text',text:'Plan'}]}),'Plan');
 assert.equal(aiText('gemini',{candidates:[{content:{parts:[{thought:true,text:'Private'},{text:'Plan'}]}}]}),'Plan');
});
