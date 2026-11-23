import {deliverReminderJobs} from './delivery.js';
import {inQuietHours} from '../../../../shared/daily.js';
import nodemailer from 'nodemailer';
import {pool} from '../../database/connection.js';
import {today,daysUntil} from '../../../../shared/domain.js';
import {hasAccess} from '../../../../shared/access.js';
import {addDays} from '../../../../shared/planner.js';
export function pendingReminders(data,current) {
  const jobs=[];
  for(const s of data.subscriptions.filter(s=>s.active)) {
    const days=daysUntil(s.renewal,current);
    if(days>=0&&days<=3) {
      const urgent=days<=1;
      jobs.push({key:`subscription:${s.id}:${s.renewal}:${urgent?'urgent':'notice'}`,subject:`${urgent?'Urgent: ':'Upcoming: '}${s.title} renewal`,text:`${s.title} renews on ${s.renewal} for $${Number(s.amount).toFixed(2)}. ${urgent?'Your renewal is due within one day.':'A friendly three-day reminder.'}`});
    }
  }
  for(const t of data.tasks.filter(t=>!t.completed&&t.reminder&&t.reminder<=current)) jobs.push({key:`task:${t.id}:${t.reminder}`,subject:`Task reminder: ${t.title}`,text:`${t.title}\nDue: ${t.due}\n${t.note}`});
  return jobs;
}

export async function dueReminderRecords(db,users,current) {
 const records=new Map(users.map(user=>[user.id,{subscriptions:[],tasks:[]}]));
 const moneyIds=users.filter(user=>hasAccess(user,'money')).map(user=>user.id);
 const taskIds=users.filter(user=>hasAccess(user,'tasks')).map(user=>user.id);
 if(moneyIds.length){
  const [rows]=await db.query('SELECT id,user_id,title,amount,renewal,active FROM subscriptions WHERE user_id IN (?) AND active=1 AND renewal BETWEEN ? AND ? ORDER BY id DESC',[moneyIds,current,addDays(current,3)]);
  for(const row of rows)records.get(row.user_id).subscriptions.push(row);
 }
 if(taskIds.length){
  const [rows]=await db.query('SELECT id,user_id,title,due,reminder,completed,note FROM tasks WHERE user_id IN (?) AND completed=0 AND cancelled=0 AND reminder<=? ORDER BY id DESC',[taskIds,current]);
  for(const row of rows)records.get(row.user_id).tasks.push(row);
 }
 return records;
}

let running=false;
export async function sendReminders() {
  if(running||!process.env.SMTP_HOST||!process.env.SMTP_FROM) return;
  running=true;let db;
  try {
    db=await pool.getConnection();
    const [[lock]]=await db.query("SELECT GET_LOCK('daywell_reminders',0) AS acquired");
    if(!lock.acquired) return;
    const [users]=await db.query("SELECT id,role,permissions,reminder_email,quiet_start,quiet_end FROM users WHERE active=1 AND (role='admin' OR access_expires_at IS NULL OR access_expires_at>UTC_TIMESTAMP()) AND reminder_email<>''");
    const zone=process.env.TIMEZONE||'Asia/Beirut',now=new Date(),current=today(zone,now);
    const eligible=[];
    for(const user of users) {
     try {
      if(inQuietHours(user.quiet_start,user.quiet_end,now,zone))continue;
      if(typeof user.permissions==='string')user.permissions=JSON.parse(user.permissions);
      eligible.push(user);
     }catch(error){console.error('User reminders unavailable:',error.code||error.name);}
    }
    const records=await dueReminderRecords(db,eligible,current);
    if(!eligible.length)return;
    const transport=nodemailer.createTransport({host:process.env.SMTP_HOST,port:Number(process.env.SMTP_PORT||587),secure:process.env.SMTP_SECURE==='true',auth:process.env.SMTP_USER?{user:process.env.SMTP_USER,pass:process.env.SMTP_PASSWORD}:undefined,connectionTimeout:15000,socketTimeout:20000});
    for(const user of eligible) {
     try {
      // Long delivery runs can cross into a recipient's quiet hours.
      if(inQuietHours(user.quiet_start,user.quiet_end,new Date(),zone))continue;
      await deliverReminderJobs({db,transport,from:process.env.SMTP_FROM,to:user.reminder_email,jobs:pendingReminders(records.get(user.id),current),onFailure:error=>console.error('Reminder delivery failed:',error.code||error.name)});
     }catch(error){console.error('User reminders unavailable:',error.code||error.name);}
    }
  } catch(error) {console.error('Reminder delivery failed:',error.code||error.name);} finally {if(db){await db.query("SELECT RELEASE_LOCK('daywell_reminders')").catch(()=>{});db.release();}running=false;}
}
