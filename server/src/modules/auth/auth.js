import {newPasswordSchema} from '../../../../shared/password-policy.js';
import {mountRecovery,recoveryConfigured} from './recovery.js';
import {ownerUsage} from './owner.js';
import express from 'express';
import rateLimit from 'express-rate-limit';
import {randomBytes} from 'node:crypto';
import {z} from 'zod';
import {pool} from '../../database/connection.js';
import {hashPassword, verifyPassword, tokenHash} from './passwords.js';
import {APP_ACCESS, hasAccess} from '../../../../shared/access.js';
import {accountEnabled,accessExpiry,inactiveAccount} from '../../../../shared/account-access.js';
import {mountSignup,sendSignupGreeting} from './signup.js';
import {mountGoogle,googleConfigured} from './google.js';

const email = z.string().trim().email().max(254).transform(v => v.toLowerCase());
const access = z.array(z.enum(APP_ACCESS)).min(1, 'Select at least one app.').max(3).transform(v => [...new Set(v)]);
export const userSchema = z.object({
  name: z.string().trim().min(1).max(100), email,
  password: newPasswordSchema.optional(), permissions: access,
}).strict();
const permissionsSchema = z.object({permissions: access, active: z.boolean(),payment_status:z.enum(['unpaid','paid']).optional(),access_expires_at:z.string().datetime().nullable().optional(), password:newPasswordSchema.optional()}).strict();
const cookieName = 'daywell_session';
const cookieOptions = () => ({httpOnly: true, sameSite: 'strict', secure: process.env.COOKIE_SECURE === 'true', path: '/'});
const publicUser = u => ({id:u.id, name:u.name, email:u.email, role:u.role, active:accountEnabled(u),payment_status:u.payment_status||'unpaid',access_expires_at:accessExpiry(u.access_expires_at),email_verified:u.email_verified!==false&&u.email_verified!==0, permissions:u.role === 'admin' ? [...APP_ACCESS] : (typeof u.permissions === 'string' ? JSON.parse(u.permissions) : u.permissions)});
function readToken(req) {
  const raw = (req.headers.cookie || '').split(';').map(v => v.trim()).find(v => v.startsWith(cookieName + '='))?.slice(cookieName.length + 1);
  return /^[a-f0-9]{64}$/.test(raw || '') ? raw : null;
}

export function mysqlAuthStore(db = pool) {
  return {
    async findByEmail(value) {const [[user]] = await db.query('SELECT * FROM users WHERE email=?', [value]); return user;},
    async findById(id){const [[user]]=await db.query('SELECT * FROM users WHERE id=?',[id]);return user;},
    async issueVerification(userId,hash){await db.query('INSERT INTO signup_verifications(token_hash,user_id,expires_at) VALUES(?,?,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 30 MINUTE)) ON DUPLICATE KEY UPDATE token_hash=VALUES(token_hash),expires_at=VALUES(expires_at)',[hash,userId]);},
    async verifyEmail(hash){const cx=await db.getConnection();try{await cx.beginTransaction();const [[token]]=await cx.query('SELECT user_id FROM signup_verifications WHERE token_hash=? AND expires_at>UTC_TIMESTAMP() FOR UPDATE',[hash]);if(!token){await cx.rollback();return false;}await cx.query('UPDATE users SET email_verified=1 WHERE id=?',[token.user_id]);await cx.query('DELETE FROM signup_verifications WHERE user_id=?',[token.user_id]);await cx.commit();return true;}catch(error){await cx.rollback();throw error;}finally{cx.release();}},
    async session(hash) {const [[user]] = await db.query('SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>UTC_TIMESTAMP()', [hash]); return user;},
    async findByGoogle(sub){const [[user]]=await db.query('SELECT * FROM users WHERE google_sub=?',[sub]);return user;},
    async issueOAuthState(hash,verifier,nonce){await db.query('DELETE FROM oauth_states WHERE expires_at<=UTC_TIMESTAMP()');await db.query('INSERT INTO oauth_states(state_hash,code_verifier,nonce,expires_at) VALUES(?,?,?,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 10 MINUTE))',[hash,verifier,nonce]);},
    async consumeOAuthState(hash){const cx=await db.getConnection();try{await cx.beginTransaction();const [[row]]=await cx.query('SELECT code_verifier,nonce FROM oauth_states WHERE state_hash=? AND expires_at>UTC_TIMESTAMP() FOR UPDATE',[hash]);await cx.query('DELETE FROM oauth_states WHERE state_hash=?',[hash]);await cx.commit();return row;}catch(error){await cx.rollback();throw error;}finally{cx.release();}},
    async createSession(hash, userId, hours=8, passwordHash) {
      await db.query('DELETE FROM sessions WHERE expires_at<=UTC_TIMESTAMP()');
      // Serialize with password changes and administrator updates, even when
      // MySQL is configured to use READ COMMITTED isolation.
      const cx=await db.getConnection();
      try {
        await cx.beginTransaction();
        const [[user]]=await cx.query('SELECT active,password_hash,role,access_expires_at,email_verified FROM users WHERE id=? FOR UPDATE',[userId]);
        if(!accountEnabled(user)||user.password_hash!==passwordHash){await cx.rollback();return false;}
        await cx.query('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? HOUR))',[hash,userId,hours]);
        await cx.query('UPDATE users SET last_seen_at=UTC_TIMESTAMP(),last_login_at=UTC_TIMESTAMP(),login_count=login_count+1 WHERE id=?',[userId]);
        await cx.commit();return true;
      }catch(error){await cx.rollback();throw error;}finally{cx.release();}
    },
    async deleteSession(hash) {await db.query('DELETE FROM sessions WHERE token_hash=?', [hash]);},
    async touch(userId){await db.query('UPDATE users SET last_seen_at=UTC_TIMESTAMP() WHERE id=? AND (last_seen_at IS NULL OR last_seen_at<UTC_TIMESTAMP()-INTERVAL 1 MINUTE)',[userId]);},
    async usage(){return ownerUsage(db);},
    async listSessions(userId){const [rows]=await db.query('SELECT token_hash AS id,expires_at FROM sessions WHERE user_id=? AND expires_at>UTC_TIMESTAMP() ORDER BY expires_at DESC',[userId]);return rows;},
    async revokeSession(userId,id){const [result]=await db.query('DELETE FROM sessions WHERE user_id=? AND token_hash=?',[userId,id]);return !!result.affectedRows;},
    async list() {const [rows] = await db.query('SELECT id,name,email,role,permissions,active,payment_status,access_expires_at,email_verified FROM users ORDER BY id'); return rows;},
    async create(value) {const [result] = await db.query('INSERT INTO users SET ?', {active:false,payment_status:'unpaid',access_expires_at:null,...value, permissions:JSON.stringify(value.permissions), role:'user'}); return result.insertId;},
    async remove(id, email) {
      const cx=await db.getConnection();
      try{
        await cx.beginTransaction();
        const [[member]]=await cx.query('SELECT id,email,role FROM users WHERE id=? FOR UPDATE',[id]);
        if(!member||member.role!=='user'||member.email!==email){await cx.rollback();return false;}
        for(const [table,prefix] of [['tasks','task:'],['subscriptions','subscription:']]){
          await cx.query(`DELETE log FROM reminder_log AS log JOIN ${table} AS record ON log.reminder_key LIKE CONCAT(?,record.id,':%') WHERE record.user_id=?`,[prefix,id]);
        }
        for(const table of ['sessions','password_resets','signup_verifications','subtasks','goal_moves','inbox','day_plans','entries','items','budgets','subscriptions','tasks','goals']){
          await cx.query(`DELETE FROM ${table} WHERE user_id=?`,[id]);
        }
        await cx.query('DELETE FROM companion_usage WHERE scope LIKE ?',[`user:${id}:%`]);
        const [result]=await cx.query("DELETE FROM users WHERE id=? AND role='user'",[id]);
        if(!result.affectedRows){await cx.rollback();return false;}
        await cx.commit();return true;
      }catch(error){await cx.rollback();throw error;}finally{cx.release();}
    },
    async update(id, value) {
      const dbx = await db.getConnection();
      try {
        await dbx.beginTransaction();
        const [result] = await dbx.query("UPDATE users SET permissions=?,active=? WHERE id=? AND role='user'", [JSON.stringify(value.permissions),value.active,id]);
        if(result.affectedRows&&value.payment_status!==undefined)await dbx.query("UPDATE users SET payment_status=? WHERE id=? AND role='user'",[value.payment_status,id]);
        if(result.affectedRows&&value.access_expires_at!==undefined)await dbx.query("UPDATE users SET access_expires_at=? WHERE id=? AND role='user'",[value.access_expires_at?new Date(value.access_expires_at).toISOString().slice(0,19).replace('T',' '):null,id]);
        if(result.affectedRows && value.password_hash) await dbx.query("UPDATE users SET password_hash=? WHERE id=? AND role='user'",[value.password_hash,id]);
        if(result.affectedRows) await dbx.query('DELETE FROM sessions WHERE user_id=?', [id]);
        if(result.affectedRows) await dbx.query('DELETE FROM password_resets WHERE user_id=?', [id]);
        await dbx.commit(); return !!result.affectedRows;
      } catch(error) {await dbx.rollback();throw error;} finally {dbx.release();}
    },
  };
}

export function requireAccess(app) {
  return (req,res,next) => hasAccess(req.user,app) ? next() : res.status(403).json({error:`You do not have access to ${app === 'assistant' ? 'AI assistant' : app}. Contact your administrator.`});
}
export const requireAdmin = (req,res,next) => req.user?.role === 'admin' ? next() : res.status(403).json({error:'Only the administrator can manage users.'});

// SameSite cookies plus a required JSON content type and a same-origin check protect mutations.
export function protectMutation(req,res,next) {
  if(['GET','HEAD','OPTIONS'].includes(req.method)) return next();
  const origin = req.headers.origin;
  if(req.headers['sec-fetch-site']==='cross-site')return res.status(403).json({error:'Cross-site requests are not allowed.'});
  if (origin) {
    try {
      const expected=process.env.APP_ORIGIN || `${process.env.COOKIE_SECURE==='true'?'https':req.protocol}://${req.get('host')}`;
      if(new URL(origin).origin !== new URL(expected).origin || new URL(origin).origin==='null')return res.status(403).json({error:'Cross-origin requests are not allowed.'});
    }
    catch {return res.status(403).json({error:'Invalid request origin.'});}
  }
  const audioUpload=req.method==='POST'&&(req.originalUrl||'').split('?')[0]==='/api/companion/transcription'&&req.is(['audio/webm','audio/mp4','audio/ogg','audio/wav']);
  if(!req.is('application/json')&&!audioUpload) return res.status(415).json({error:'Use application/json for this request.'});
  next();
}

export function createAuth(store = mysqlAuthStore(), recoveryOptions,signupOptions={}) {
  const router = express.Router();
  // A dummy hash makes unknown-email attempts perform the same expensive password check.
  const dummyHash = hashPassword(randomBytes(24).toString('hex'));
  async function authenticate(req,res,next) {
    const token = readToken(req);
    if(!token) return res.status(401).json({error:'Please sign in to continue.'});
    const user = await store.session(tokenHash(token));
    if(!user) {res.clearCookie(cookieName,cookieOptions());return res.status(401).json({error:'Your session has ended. Please sign in again.'});}
    if(!accountEnabled(user)){res.clearCookie(cookieName,cookieOptions());return res.status(403).json(inactiveAccount);}
    req.user = publicUser(user);
    // Usage metadata never grants access to a member's workspace records.
    try{await store.touch?.(user.id);}catch{console.error('Account activity tracking unavailable.');}
    next();
  }
  async function issueSession(user,req,res,hours=8){
    if(!accountEnabled(user))return false;
    const oldToken=readToken(req);if(oldToken)await store.deleteSession(tokenHash(oldToken));
    const token=randomBytes(32).toString('hex');
    if(await store.createSession(tokenHash(token),user.id,hours,user.password_hash)===false)return false;
    res.cookie(cookieName,token,{...cookieOptions(),maxAge:hours*60*60*1000});return true;
  }
  router.get('/options',(req,res)=>res.json({signup:true,google:googleConfigured(signupOptions.google?.env),ownerEmail:inactiveAccount.ownerEmail}));
  mountSignup(router,{store,...signupOptions});
  mountGoogle(router,{store,issueSession,sendGreeting:signupOptions.sendGreeting,...signupOptions.google});
  router.post('/login',rateLimit({windowMs:15*60000,limit:20,standardHeaders:'draft-7',legacyHeaders:false,message:{error:'Too many login attempts. Try again in 15 minutes.'}}),async(req,res)=>{
    const input = z.object({email,password:z.string().min(1).max(128),remember:z.boolean().default(false)}).strict().parse(req.body);
    const user = await store.findByEmail(input.email);
    const valid = await verifyPassword(input.password,user?.password_hash || await dummyHash);
    if(!valid) return res.status(401).json({error:'Email or password is incorrect.'});
    if(!accountEnabled(user))return res.status(403).json(inactiveAccount);
    const hours=input.remember?30*24:8;
    if(!await issueSession(user,req,res,hours))return res.status(403).json(inactiveAccount);
    res.json({user:publicUser(user)});
  });
  if(recoveryOptions)mountRecovery(router,{...recoveryOptions,store,authenticate,clearCookie:res=>res.clearCookie(cookieName,cookieOptions())});
  router.get('/me',authenticate,(req,res)=>res.json({user:req.user}));
  router.get('/sessions',authenticate,async(req,res)=>{const current=tokenHash(readToken(req));res.json({sessions:(await store.listSessions(req.user.id)).map(s=>({...s,current:s.id===current}))});});
  router.delete('/sessions/:id',authenticate,async(req,res)=>{const id=z.string().regex(/^[a-f0-9]{64}$/).parse(req.params.id);if(!await store.revokeSession(req.user.id,id))return res.status(404).json({error:'Session not found.'});if(id===tokenHash(readToken(req)))res.clearCookie(cookieName,cookieOptions());res.json({ok:true});});
  router.post('/logout',async(req,res)=>{const token=readToken(req);if(token) await store.deleteSession(tokenHash(token));res.clearCookie(cookieName,cookieOptions());res.json({ok:true});});
  const admin = express.Router();
  admin.use(requireAdmin);
  admin.get('/usage',async(req,res)=>res.json(await store.usage()));
  admin.get('/users',async(req,res)=>res.json({users:(await store.list()).map(publicUser)}));
  admin.post('/users',async(req,res)=>{
    const input=userSchema.parse(req.body);
    const {password,...value}=input;
    const canInvite=!!recoveryOptions?.recovery&&(recoveryOptions.configured||recoveryConfigured)();
    if(!canInvite&&!password)return res.status(503).json({error:'Configure email invitations first, or provide an initial password for manual account setup.'});
    const id=await store.create({...value,password_hash:await hashPassword(password||randomBytes(48).toString('hex')),reminder_email:value.email,active:false,payment_status:'unpaid',access_expires_at:null});
    let invitation='not_configured';
    if(canInvite){
      try{
        const sent=await (signupOptions.sendGreeting||sendSignupGreeting)(value.email,value.name);
        invitation=sent?'sent':'not_configured';
      }catch{invitation='failed';console.error('Welcome email delivery failed.');}
    }
    res.status(201).json({id,invitation});
  });
  admin.patch('/users/:id',async(req,res)=>{
    const id=z.coerce.number().int().positive().parse(req.params.id);
    const value=permissionsSchema.parse(req.body);
    if(value.active&&store.findById){const member=await store.findById(id);if(member&&(member.email_verified===false||member.email_verified===0))return res.status(400).json({error:'This member must verify their signup email before you can activate access.'});}
    if(value.active&&value.access_expires_at&&new Date(value.access_expires_at).getTime()<=Date.now())return res.status(400).json({error:'Choose an access expiry in the future, or select ongoing access.'});
    const {password,...update}=value;
    if(password)update.password_hash=await hashPassword(password);
    if(!await store.update(id,update))return res.status(404).json({error:'Member account not found. Administrator access cannot be changed here.'});
    res.json({ok:true});
  });
  admin.delete('/users/:id',async(req,res)=>{
    if(!/^[1-9]\d*$/.test(req.params.id)||!Number.isSafeInteger(Number(req.params.id)))return res.status(400).json({error:'Choose a valid account ID.'});
    const id=Number(req.params.id),input=z.object({email}).strict().parse(req.body);
    if(id===req.user.id)return res.status(403).json({error:'The owner account cannot be deleted.'});
    if(!await store.remove(id,input.email))return res.status(404).json({error:'Member account not found or confirmation does not match. Owner accounts cannot be deleted.'});
    res.json({ok:true});
  });
  return {router,admin,authenticate};
}

