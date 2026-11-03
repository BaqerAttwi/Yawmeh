import {deliverReminderJobs} from './delivery.js';
import {inQuietHours} from '../../../../shared/daily.js';
import nodemailer from 'nodemailer';
import {pool,snapshot} from '../../database/connection.js';
import {today,daysUntil} from '../../../../shared/domain.js';
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
let running=false;
export async function sendReminders() {
  if(running||!process.env.SMTP_HOST||!process.env.SMTP_FROM) return;
  running=true;let db;
  try {
    db=await pool.getConnection();
    const [[lock]]=await db.query("SELECT GET_LOCK('daywell_reminders',0) AS acquired");
    if(!lock.acquired) return;
    const [users]=await db.query("SELECT id,name,role,permissions FROM users WHERE active=1 AND (role='admin' OR access_expires_at IS NULL OR access_expires_at>UTC_TIMESTAMP()) AND reminder_email<>''");
    const transport=nodemailer.createTransport({host:process.env.SMTP_HOST,port:Number(process.env.SMTP_PORT||587),secure:process.env.SMTP_SECURE==='true',auth:process.env.SMTP_USER?{user:process.env.SMTP_USER,pass:process.env.SMTP_PASSWORD}:undefined,connectionTimeout:15000,socketTimeout:20000});
    for(const user of users) {
     try {
      if(typeof user.permissions==='string')user.permissions=JSON.parse(user.permissions);
      const data=await snapshot(user,db);
      if(inQuietHours(data.settings.quiet_start,data.settings.quiet_end,new Date(),process.env.TIMEZONE||'Asia/Beirut'))continue;
      await deliverReminderJobs({db,transport,from:process.env.SMTP_FROM,to:data.settings.email,jobs:pendingReminders(data,today(process.env.TIMEZONE||'Asia/Beirut')),onFailure:error=>console.error('Reminder delivery failed:',error.code||error.name)});
     }catch(error){console.error('User reminders unavailable:',error.code||error.name);}
    }
  } catch(error) {console.error('Reminder delivery failed:',error.code||error.name);} finally {if(db){await db.query("SELECT RELEASE_LOCK('daywell_reminders')").catch(()=>{});db.release();}running=false;}
}
