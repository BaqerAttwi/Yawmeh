import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {once} from 'node:events';
import {mountRecovery} from '../../server/src/modules/auth/recovery.js';
import {hashPassword,verifyPassword,tokenHash} from '../../server/src/modules/auth/passwords.js';

test('password change requires current secret; recovery tokens are hashed, single use and expiring',async t=>{
 const user={id:1,email:'member@example.com',active:true,password_hash:await hashPassword('original password 123')};
 let pending,delivered,revoked=0;
 const recovery={async issue(id,hash){pending={hash,expires:Date.now()+1800000};},async replace({previous,token,passwordHash}){if(previous&&previous!==user.password_hash)return false;if(token&&(!pending||token!==pending.hash||pending.expires<Date.now()))return false;user.password_hash=passwordHash;pending=null;revoked++;return true;}};
 const app=express();app.use(express.json());mountRecovery(app,{store:{findByEmail:async email=>email===user.email?user:null},recovery,authenticate:(req,res,next)=>{req.user=user;next();},clearCookie:()=>{},configured:()=>true,send:async(email,token)=>{delivered=token;}});
 app.use((err,req,res,next)=>res.status(400).json({error:'Invalid input'}));
 const server=app.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>{server.closeAllConnections();server.close();});
 const call=async(path,body)=>{const r=await fetch(`http://127.0.0.1:${server.address().port}/${path}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return {status:r.status,body:await r.json()};};
 assert.equal((await call('change-password',{currentPassword:'wrong',newPassword:'replacement password 123'})).status,400);assert.equal(revoked,0);
 assert.equal((await call('change-password',{currentPassword:'original password 123',newPassword:'replacement password 123'})).status,200);assert.equal(revoked,1);
 assert.equal(await verifyPassword('replacement password 123',user.password_hash),true);
 const missing=await call('forgot-password',{email:'missing@example.com'}),known=await call('forgot-password',{email:user.email});assert.deepEqual(missing,known);assert.equal(pending.hash,tokenHash(delivered));assert.notEqual(pending.hash,delivered);
 assert.equal((await call('reset-password',{token:delivered,newPassword:'short'})).status,400);
 assert.equal((await call('reset-password',{token:delivered,newPassword:'x'.repeat(25)})).status,400);
 assert.equal((await call('reset-password',{token:delivered,newPassword:'12345678'})).status,200);assert.equal(revoked,2);
 assert.equal((await call('reset-password',{token:delivered,newPassword:'another password secret'})).status,400);
 await call('forgot-password',{email:user.email});pending.expires=0;
 assert.equal((await call('reset-password',{token:delivered,newPassword:'another password secret'})).status,400);
 assert.equal(await verifyPassword('12345678',user.password_hash),true);
});
