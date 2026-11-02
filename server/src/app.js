import {mountSpeech} from './modules/ai/speech.js';
import {mountCompanionAI} from './modules/ai/companion.js';
import {mountCurrencies,moneyPreferences} from './modules/money/currencies.js';
import {captureRates,currencyCodeSchema,rateSchema} from '../../shared/currency.js';
import {recoveryStore} from './modules/auth/recovery.js';
import {setupStatus} from './modules/system/status.js';
import {mountDaily} from './modules/daily/routes.js';
import {mountInsights} from './modules/insights/routes.js';
import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import {trustedProxies} from './config/security.js';

import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {z} from 'zod';
import {pool,snapshot} from './database/connection.js';
import {entrySchema,schemas,taskCategorySchema} from './validation/index.js';
import {checkEntry,nextRenewal,today,periodSummary,balances} from '../../shared/domain.js';
import {hasAccess} from '../../shared/access.js';
import {aiRequest,aiText,providers} from './modules/ai/providers.js';
import {createAuth,mysqlAuthStore,protectMutation,requireAccess,requireAdmin} from './modules/auth/auth.js';
import {mountPlanner} from './modules/planning/routes.js';
import {PlannerError,checkUnassignedWithdrawal} from '../../shared/planner.js';

export function createApp({db=pool,authStore=mysqlAuthStore(db),recoveryOptions={recovery:recoveryStore(db)},speechOptions,companionOptions,trustProxy=trustedProxies()}={}) {
 const app=express();
 app.set('trust proxy',trustProxy);
 app.disable('x-powered-by');
 app.use(helmet({contentSecurityPolicy:{directives:{'style-src':["'self'","'unsafe-inline'",'https://fonts.googleapis.com'],'font-src':["'self'",'https://fonts.gstatic.com'],'script-src':["'self'"],'media-src':["'self'",'blob:'],'upgrade-insecure-requests':null}}}));
 app.use('/api',(req,res,next)=>{res.set('Cache-Control','no-store');next();});
 app.use('/api',rateLimit({windowMs:60000,limit:120,standardHeaders:'draft-7',legacyHeaders:false,message:{error:'Too many requests. Wait a minute and try again.'}}));
 app.use('/api',protectMutation);
 app.use(express.json({limit:'64kb'}));
 app.get('/api/health',async(req,res)=>{try{await db.query('SELECT id FROM users LIMIT 1');res.json({database:true});}catch{res.status(503).json({database:false});}});
 const auth=createAuth(authStore,recoveryOptions);
 app.use('/api/auth',auth.router);
 app.use('/api',auth.authenticate);
 app.use('/api/admin',auth.admin);
 // MySQL coerces values like "12junk" to numeric IDs. Reject ambiguous IDs.
 for(const name of ['id','subtaskId'])app.param(name,(req,res,next,value)=>{
  if(!/^[1-9]\d*$/.test(value)||!Number.isSafeInteger(Number(value)))return res.status(400).json({error:'Choose a valid record ID.'});
  next();
 });
 mountSpeech(app,speechOptions);
 mountCompanionAI(app,db,companionOptions);
 app.get('/api/system/status',requireAdmin,async(req,res)=>res.json(await setupStatus(db)));
 app.get('/api/data',async(req,res)=>res.json({...await snapshot(req.user,db),user:req.user,connections:{email:!!(process.env.SMTP_HOST&&process.env.SMTP_FROM),ai:hasAccess(req.user,'assistant')&&!!process.env.OPENAI_API_KEY,providers:hasAccess(req.user,'assistant')?Object.fromEntries(Object.entries(providers).map(([name,p])=>[name,!!process.env[p.key]])):{}}}));
 async function ledgerTransaction(userId,action) {
   const connection=await db.getConnection();
   try {await connection.beginTransaction();await connection.query('SELECT id FROM users WHERE id=? FOR UPDATE',[userId]);const result=await action(connection);await connection.commit();return result;}
   catch(error){await connection.rollback();throw error;}finally{connection.release();}
 }
 async function insertEntry(connection,userId,entry) {
   const preferences=await moneyPreferences(connection,userId);
   try{entry=captureRates(entry,preferences);}catch(error){throw new PlannerError(error.message);}
   const [entries]=await connection.query('SELECT * FROM entries WHERE user_id=?',[userId]);
   checkEntry(entry,entries);
   if(entry.type==='withdrawal'){
     const [moves]=await connection.query('SELECT * FROM goal_moves WHERE user_id=?',[userId]);
     checkUnassignedWithdrawal(entry,entries,moves);
   }
   const [result]=await connection.query('INSERT INTO entries SET ?',{...entry,rate_snapshot:JSON.stringify(entry.rate_snapshot),user_id:userId});
   await connection.query('UPDATE users SET last_currency=? WHERE id=?',[entry.currency,userId]);return result.insertId;
 }
 app.post('/api/entries',requireAccess('money'),async(req,res)=>{
   const entry=entrySchema.parse(req.body);
   if(entry.date>today(process.env.TIMEZONE||'Asia/Beirut'))return res.status(400).json({error:'Transactions cannot be dated in the future.'});
   const id=await ledgerTransaction(req.user.id,connection=>insertEntry(connection,req.user.id,entry));res.status(201).json({id});
 });
 mountCurrencies(app,ledgerTransaction);
 mountPlanner(app,db,ledgerTransaction);
 mountInsights(app,db,ledgerTransaction);
 mountDaily(app,db,ledgerTransaction);
 for(const table of ['items','budgets','subscriptions']) app.post(`/api/${table}`,requireAccess('money'),async(req,res)=>{
   const value=schemas[table].parse(req.body);
   const [result]=await db.query(`INSERT INTO ${table} SET ?`,{...value,user_id:req.user.id});res.status(201).json({id:result.insertId});
 });
 app.put('/api/settings',async(req,res)=>{
   const settings=schemas.settings.parse(req.body);
   if(settings.current_rate!==undefined&&!hasAccess(req.user,'money'))return res.status(403).json({error:'Money access is required to set an exchange rate.'});
   await ledgerTransaction(req.user.id,async connection=>{
     await connection.query('UPDATE users SET name=?,reminder_email=?,quiet_start=?,quiet_end=? WHERE id=?',[settings.name,settings.email,settings.quiet_start,settings.quiet_end,req.user.id]);
     if(settings.current_rate!==undefined)await connection.query('UPDATE users SET current_rate=? WHERE id=?',[settings.current_rate,req.user.id]);
   });res.json({ok:true});
 });
 app.patch('/api/tasks/:id/category',requireAccess('tasks'),async(req,res)=>{
   const {category}=z.object({category:taskCategorySchema}).strict().parse(req.body);
   const [result]=await db.query('UPDATE tasks SET category=? WHERE id=? AND user_id=?',[category,req.params.id,req.user.id]);
   if(!result.affectedRows)return res.status(404).json({error:'Task not found.'});res.json({ok:true});
 });
 app.patch('/api/subscriptions/:id',requireAccess('money'),async(req,res)=>{
   const {active}=z.object({active:z.boolean()}).parse(req.body);
   const [r]=await db.query('UPDATE subscriptions SET active=? WHERE id=? AND user_id=?',[active,req.params.id,req.user.id]);
   if(!r.affectedRows)return res.status(404).json({error:'Subscription not found.'});res.json({ok:true});
 });
 app.post('/api/subscriptions/:id/renew',requireAccess('money'),async(req,res)=>{
   await ledgerTransaction(req.user.id,async connection=>{
     const [[s]]=await connection.query('SELECT * FROM subscriptions WHERE id=? AND user_id=? FOR UPDATE',[req.params.id,req.user.id]);
     if(!s||!s.active)throw new Error('Active subscription not found.');
     const {renewal,currency,amount,exchange_rate,unit_rate,rate_reference}=z.object({unit_rate:rateSchema.optional(),rate_reference:currencyCodeSchema.optional(),exchange_rate:entrySchema.shape.exchange_rate,renewal:z.string(),currency:currencyCodeSchema.default('USD'),amount:entrySchema.shape.amount.optional()}).parse(req.body);
     if(currency!=='USD'&&amount===undefined)throw new PlannerError('Enter the actual amount paid in this currency.');
     if(renewal!==s.renewal)throw new Error('This renewal has already been recorded. Refresh the page.');
     await insertEntry(connection,req.user.id,{type:'expense',title:`${s.title} renewal`,currency,exchange_rate,unit_rate,rate_reference,amount:amount??s.amount,saved:0,category:s.category,date:today(process.env.TIMEZONE||'Asia/Beirut'),note:`Subscription #${s.id}; renewal date ${s.renewal}`});
     await connection.query('UPDATE subscriptions SET renewal=? WHERE id=? AND user_id=?',[nextRenewal(s.renewal,s.cycle),s.id,req.user.id]);
   });res.json({ok:true});
 });
 app.post('/api/chat',(req,res)=>res.status(403).json({error:'Paid AI chat has been removed. Use the free local companion.'}));
 app.use('/api',(req,res)=>res.status(404).json({error:'API route not found.'}));
 if(existsSync(fileURLToPath(new URL('../../dist/index.html',import.meta.url)))){app.use(express.static(fileURLToPath(new URL('../../dist/',import.meta.url))));app.get('/{*path}',(req,res)=>res.sendFile(fileURLToPath(new URL('../../dist/index.html',import.meta.url))));}
 app.use((error,req,res,next)=>{
   if(error.type==='entity.parse.failed'||error instanceof URIError)return res.status(400).json({error:'The request contains invalid JSON or an invalid URL.'});
   if(error.type==='entity.too.large')return res.status(413).json({error:'This request is too large. Shorten the text and try again.'});
   if(error instanceof PlannerError)return res.status(error.status).json({error:error.message});
   if(error instanceof z.ZodError)return res.status(400).json({error:error.issues.map(i=>`${i.path.join('.')}: ${i.message}`).join('; ')});
   if(error.code==='ER_DUP_ENTRY')return res.status(409).json({error:'An account with this email already exists.'});
   const known=['Savings allocation','Please explain','This withdrawal','Insufficient spending','Active subscription','This renewal'];
   const safe=known.some(x=>error.message.startsWith(x));console.error('API error:',error.code||error.name);
   res.status(safe?400:503).json({error:safe?error.message:'Service unavailable. Check MySQL configuration and run npm run db:init before signing in.'});
 });
 return app;
}

