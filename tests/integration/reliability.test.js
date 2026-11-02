import test from 'node:test';
import assert from 'node:assert/strict';
import {deliverReminderJobs} from '../../server/src/modules/reminders/delivery.js';
import {setupStatus} from '../../server/src/modules/system/status.js';
import {REQUIRED_SCHEMA} from '../../server/src/database/schema-contract.js';
import {mutateAndRefresh} from '../../client/src/lib/mutation.js';
import {schemas} from '../../shared/validation.js';
import {readFileSync} from 'node:fs';
test('one failed reminder does not block later jobs and failures remain retryable',async()=>{
 const logged=new Set(),sent=[],failures=[];const jobs=['bad','good','already'].map(key=>({key,subject:key,text:key}));logged.add('already');
 const db={async query(sql,args){if(sql.startsWith('SELECT'))return [logged.has(args[0])?[{id:1}]:[]];logged.add(args[0]);return [{}];}};
 const transport={async sendMail(mail){if(mail.subject==='bad')throw Object.assign(new Error('Recipient rejected'),{code:'EENVELOPE'});sent.push(mail.subject);}};
 const result=await deliverReminderJobs({db,transport,jobs,from:'sender@test.local',to:'recipient@test.local',onFailure:e=>failures.push(e.code)});
 assert.deepEqual(result,{sent:1,failed:1,skipped:1});assert.deepEqual(sent,['good']);assert.equal(logged.has('bad'),false);assert.deepEqual(failures,['EENVELOPE']);
});
test('setup check distinguishes full schema, missing fields and failed credentials without exposing secrets',async()=>{
 const rows=Object.entries(REQUIRED_SCHEMA).flatMap(([table_name,fields])=>fields.map(column_name=>({table_name,column_name})));
 const env={MYSQL_PASSWORD:'secret',SMTP_HOST:'mail.test',SMTP_FROM:'sender@test.local',OPENAI_API_KEY:'secret-key'};
 const good=await setupStatus({query:async()=>[rows]},env);assert.equal(good.database.ready,true);assert.equal(good.email.configured,true);assert.equal(good.ai.openai,true);assert.equal(JSON.stringify(good).includes('secret'),false);
 const missing=await setupStatus({query:async()=>[rows.filter(r=>r.column_name!=='closed_at')]},{});assert.deepEqual(missing.database.missing,['day_plans.closed_at']);
 const denied=await setupStatus({query:async()=>{throw Object.assign(new Error('password secret'),{code:'ER_ACCESS_DENIED_ERROR'});}},env);assert.equal(denied.database.reachable,false);assert.match(denied.database.message,/rejected/);assert.equal(JSON.stringify(denied).includes('secret'),false);
});
test('schema contract covers the complete phpMyAdmin export',()=>{
 const sql=readFileSync(new URL('../../database/daywell.sql',import.meta.url),'utf8'),found={};for(const m of sql.matchAll(/CREATE TABLE IF NOT EXISTS `([^`]+)` \(([\s\S]*?)\) ENGINE/g))found[m[1]]=[...m[2].matchAll(/^ `([^`]+)`/gm)].map(x=>x[1]);assert.deepEqual(found,REQUIRED_SCHEMA);
});
test('saved changes with failed refresh cannot be mistaken for failed writes',async()=>{
 const calls=[];await assert.rejects(()=>mutateAndRefresh(async(path)=>{calls.push(path);if(path==='/data')throw new Error('Offline');return {id:1};},{path:'/entries',value:{}}),e=>e.state==='saved');assert.deepEqual(calls,['/entries','/data']);
 await assert.rejects(()=>mutateAndRefresh(async()=>{throw new TypeError('Network error');},{path:'/entries'}),e=>e.state==='unknown');
 await assert.rejects(()=>mutateAndRefresh(async()=>{throw Object.assign(new Error('Invalid amount'),{status:400});},{path:'/entries'}),e=>e.message==='Invalid amount'&&!e.state);
 assert.deepEqual(await mutateAndRefresh(async path=>path==='/data'?{entries:[]}:{id:1},{path:'/entries'}),{entries:[]});
});
test('dates outside the MySQL DATE range are rejected before insertion',()=>{
 for(const due of ['0000-01-01','0999-12-31','2026-02-30'])assert.equal(schemas.tasks.safeParse({title:'Task',priority:'low',due}).success,false);
 assert.equal(schemas.tasks.safeParse({title:'Task',priority:'low',due:'1000-01-01'}).success,true);
});
