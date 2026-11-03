import nodemailer from 'nodemailer';
import rateLimit from 'express-rate-limit';
import {z} from 'zod';
import {newPasswordSchema} from '../../../../shared/password-policy.js';
import {OWNER_EMAIL,inactiveAccount} from '../../../../shared/account-access.js';
import {hashPassword} from './passwords.js';
import {tokenHash} from './passwords.js';
import {randomBytes} from 'node:crypto';

export const oauthStatesSQL=`CREATE TABLE IF NOT EXISTS oauth_states (state_hash CHAR(64) PRIMARY KEY,code_verifier VARCHAR(128) NOT NULL,nonce VARCHAR(128) NOT NULL,expires_at DATETIME NOT NULL,INDEX(expires_at))`;
export async function migrateSignup(db){
 for(const [column,definition] of [['payment_status',"ENUM('unpaid','paid') NOT NULL DEFAULT 'unpaid'"],['access_expires_at','DATETIME NULL'],['google_sub','VARCHAR(255) NULL UNIQUE'],['email_verified','BOOLEAN NOT NULL DEFAULT TRUE']]){
  const [rows]=await db.query('SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=?',['users',column]);
  if(!rows.length){await db.query(`ALTER TABLE users ADD COLUMN ${column} ${definition}`);if(column==='payment_status')await db.query("UPDATE users SET active=0 WHERE role='user'");}
 }
 await db.query(oauthStatesSQL);
 await db.query('CREATE TABLE IF NOT EXISTS signup_verifications (token_hash CHAR(64) PRIMARY KEY,user_id INT NOT NULL UNIQUE,expires_at DATETIME NOT NULL,FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE)');
}
const html=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function signupGreeting(name,origin=process.env.APP_ORIGIN,verificationToken){
 const url=new URL('/',origin).toString();
 if(verificationToken){const link=new URL('/api/auth/verify-email',origin);link.searchParams.set('token',verificationToken);return {subject:'Welcome to Yawmeh — verify your email',text:`Hi ${name},\n\nWelcome to Yawmeh! Verify your email using this single-use link (expires in 30 minutes):\n${link}\n\nAfter verification, your account stays inactive until the owner grants ongoing or temporary access. Contact ${OWNER_EMAIL}.\n\nIf you did not create this account, ignore this email and do not verify it.\n\nThe Yawmeh team`,html:`<div style="font-family:Arial,sans-serif;background:#f4f7f4;padding:30px"><div style="max-width:520px;margin:auto;background:white;padding:28px;border-radius:14px"><p>YAWMEH</p><h1>Welcome to Yawmeh</h1><p>Hi ${html(name)},</p><p>Confirm your email to finish signup.</p><p><a style="display:inline-block;background:#315e48;color:white;padding:14px 22px;border-radius:8px;text-decoration:none" href="${html(link.toString())}">Verify my email</a></p><p>This link expires in 30 minutes and works once. Your account then needs owner activation.</p><p>Contact <a href="mailto:${OWNER_EMAIL}">${OWNER_EMAIL}</a> for ongoing or temporary access.</p><p>If you did not create this account, ignore this email and do not verify it.</p></div></div>`};}
 return {subject:'Welcome to Yawmeh — your account is ready for activation',text:`Hi ${name},\n\nWelcome to Yawmeh! Your account has been created. Access is currently inactive until the owner approves it.\n\nContact ${OWNER_EMAIL} to request activation. The owner can grant ongoing or temporary access.\n\nSign in at ${url} after activation. If you need to choose or reset a password, select Forgot password after your account is activated.\n\nThe Yawmeh team`,html:`<div style="font-family:Arial,sans-serif;background:#f4f7f4;padding:30px"><div style="max-width:520px;margin:auto;background:white;border-radius:14px;padding:28px"><p>YAWMEH</p><h1>Welcome to Yawmeh</h1><p>Hi ${html(name)},</p><p>Your account has been created. The owner needs to activate your access before you can use your workspace.</p><p>Request activation at <a href="mailto:${OWNER_EMAIL}">${OWNER_EMAIL}</a>.</p><p>You can receive ongoing or temporary access. After activation, <a href="${html(url)}">sign in to Yawmeh</a>. Use Forgot password if you need to choose or reset your password.</p><p>The Yawmeh team</p></div></div>`};
}
export async function sendSignupGreeting(email,name,verificationToken){
 if(!process.env.SMTP_HOST||!process.env.SMTP_FROM||!process.env.APP_ORIGIN)return false;
 const transport=nodemailer.createTransport({host:process.env.SMTP_HOST,port:Number(process.env.SMTP_PORT||587),secure:process.env.SMTP_SECURE==='true',auth:process.env.SMTP_USER?{user:process.env.SMTP_USER,pass:process.env.SMTP_PASSWORD}:undefined,connectionTimeout:5000,socketTimeout:8000});
 const result=await transport.sendMail({from:process.env.SMTP_FROM,to:email,...signupGreeting(name,process.env.APP_ORIGIN,verificationToken)});return !!result.accepted?.length;
}
export function mountSignup(router,{store,sendGreeting=sendSignupGreeting}){
 const limiter=rateLimit({windowMs:60*60000,limit:5,standardHeaders:'draft-7',legacyHeaders:false,message:{error:'Too many signup attempts. Please try again later.'}});
 router.post('/signup',limiter,async(req,res)=>{
  const input=z.object({name:z.string().trim().min(1).max(100),email:z.string().trim().email().max(254).transform(v=>v.toLowerCase()),password:newPasswordSchema}).strict().parse(req.body);
  if(await store.findByEmail(input.email))return res.status(409).json({error:'An account with this email already exists. Sign in or use Forgot password.'});
  const id=await store.create({name:input.name,email:input.email,password_hash:await hashPassword(input.password),permissions:['money','tasks'],reminder_email:input.email,active:false,payment_status:'unpaid',access_expires_at:null,email_verified:false});
  const token=randomBytes(32).toString('hex');await store.issueVerification(id,tokenHash(token));
  let greeting='failed';try{greeting=await sendGreeting(input.email,input.name,token)?'sent':'not_configured';}catch{console.error('Signup greeting delivery failed.');}
  res.status(201).json({...inactiveAccount,created:true,greeting});
 });
 router.get('/verify-email',async(req,res)=>{
  const token=req.query.token;
  if(typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token)||!await store.verifyEmail(tokenHash(token)))return res.redirect('/#auth=verification_failed');
  res.redirect('/#auth=verified');
 });
 router.post('/resend-verification',limiter,async(req,res)=>{
  const {email}=z.object({email:z.string().trim().email().max(254).transform(value=>value.toLowerCase())}).strict().parse(req.body);
  const user=await store.findByEmail(email);
  if(user&&(user.email_verified===false||user.email_verified===0)){
   const token=randomBytes(32).toString('hex');await store.issueVerification(user.id,tokenHash(token));
   try{await sendGreeting(user.email,user.name,token);}catch{console.error('Verification email delivery failed.');}
  }
  res.json({message:'If this account needs verification, a new email will arrive. Check your inbox and spam folder.'});
 });
}
