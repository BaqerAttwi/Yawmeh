import nodemailer from 'nodemailer';
import {randomBytes} from 'node:crypto';
import rateLimit from 'express-rate-limit';
import {z} from 'zod';
import {hashPassword,verifyPassword,tokenHash} from './passwords.js';

export const resetTableSQL=`CREATE TABLE IF NOT EXISTS password_resets (token_hash CHAR(64) PRIMARY KEY,user_id INT NOT NULL UNIQUE,expires_at DATETIME NOT NULL,FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE)`;
export function recoveryStore(db){
 return {
  async issue(userId,hash){await db.query('INSERT INTO password_resets(token_hash,user_id,expires_at) VALUES(?,?,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 30 MINUTE)) ON DUPLICATE KEY UPDATE token_hash=VALUES(token_hash),expires_at=VALUES(expires_at)',[hash,userId]);},
  async replace({userId,previous,token,passwordHash}){
   const cx=await db.getConnection();
   try{
    await cx.beginTransaction();
    if(token){const [[row]]=await cx.query('SELECT user_id FROM password_resets WHERE token_hash=?',[token]);if(!row){await cx.rollback();return false;}userId=row.user_id;}
    const [[user]]=await cx.query('SELECT password_hash,active FROM users WHERE id=? FOR UPDATE',[userId]);
    if(!user?.active || (previous&&user.password_hash!==previous)){await cx.rollback();return false;}
    if(token){const [result]=await cx.query('DELETE FROM password_resets WHERE token_hash=? AND user_id=? AND expires_at>UTC_TIMESTAMP()',[token,userId]);if(!result.affectedRows){await cx.rollback();return false;}}
    await cx.query('UPDATE users SET password_hash=? WHERE id=?',[passwordHash,userId]);
    await cx.query('DELETE FROM sessions WHERE user_id=?',[userId]);
    await cx.query('DELETE FROM password_resets WHERE user_id=?',[userId]);
    await cx.commit();return true;
   }catch(error){await cx.rollback();throw error;}finally{cx.release();}
  }
 };
}
export function recoveryConfigured(){return !!(process.env.SMTP_HOST&&process.env.SMTP_FROM&&process.env.APP_ORIGIN);}
export async function sendReset(email,token){
 const url=new URL(process.env.APP_ORIGIN);url.pathname='/';url.search='';url.hash='reset='+token;
 const transport=nodemailer.createTransport({host:process.env.SMTP_HOST,port:Number(process.env.SMTP_PORT||587),secure:process.env.SMTP_SECURE==='true',auth:process.env.SMTP_USER?{user:process.env.SMTP_USER,pass:process.env.SMTP_PASSWORD}:undefined,connectionTimeout:15000,socketTimeout:20000});
 await transport.sendMail({from:process.env.SMTP_FROM,to:email,subject:'Reset your yawmeh.me password',text:`Open this link to choose a new password:\n${url}\n\nThis link expires in 30 minutes and works once. If you did not request this, ignore this email.`});
}
export function mountRecovery(router,{store,recovery,authenticate,clearCookie,send=sendReset,configured=recoveryConfigured}){
 const password=z.string().min(12,'Use at least 12 characters.').max(128);
 const limit=()=>rateLimit({windowMs:15*60000,limit:10,standardHeaders:'draft-7',legacyHeaders:false,message:{error:'Too many password attempts. Try again in 15 minutes.'}});
 router.post('/change-password',limit(),authenticate,async(req,res)=>{
  const input=z.object({currentPassword:z.string().min(1).max(128),newPassword:password}).strict().parse(req.body);
  const user=await store.findByEmail(req.user.email);
  if(!user||!await verifyPassword(input.currentPassword,user.password_hash))return res.status(400).json({error:'Current password is incorrect.'});
  if(input.currentPassword===input.newPassword)return res.status(400).json({error:'Choose a different new password.'});
  if(!await recovery.replace({userId:user.id,previous:user.password_hash,passwordHash:await hashPassword(input.newPassword)}))return res.status(409).json({error:'Account changed. Please sign in again.'});
  clearCookie(res);res.json({message:'Password changed. Please sign in again on all devices.'});
 });
 router.post('/forgot-password',limit(),async(req,res)=>{
  const {email}=z.object({email:z.string().trim().email().max(254).transform(v=>v.toLowerCase())}).strict().parse(req.body);
  if(!configured())return res.status(503).json({error:'Password reset email is not configured. Contact your administrator to reset your password.'});
  const user=await store.findByEmail(email);
  if(user?.active){const token=randomBytes(32).toString('hex');await recovery.issue(user.id,tokenHash(token));try{await send(user.email,token);}catch{console.error('Password reset email delivery failed.');}}
  res.json({message:'If an active account matches, a reset link will arrive by email. Check your spam folder. If it does not arrive, contact your administrator.'});
 });
 router.post('/reset-password',limit(),async(req,res)=>{
  const input=z.object({token:z.string().regex(/^[a-f0-9]{64}$/),newPassword:password}).strict().parse(req.body);
  if(!await recovery.replace({token:tokenHash(input.token),passwordHash:await hashPassword(input.newPassword)}))return res.status(400).json({error:'This reset link is invalid or expired. Request a new one.'});
  clearCookie(res);res.json({message:'Password reset. You can now sign in with your new password.'});
 });
}
