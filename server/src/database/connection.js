import 'dotenv/config';
import mysql from 'mysql2/promise';
import {hasAccess} from '../../../shared/access.js';
export const pool=mysql.createPool({host:process.env.MYSQL_HOST||'127.0.0.1',port:Number(process.env.MYSQL_PORT||3306),user:process.env.MYSQL_USER||'daywell',password:process.env.MYSQL_PASSWORD,database:process.env.MYSQL_DATABASE||'daywell',dateStrings:true,decimalNumbers:true,connectionLimit:5});
export async function snapshot(user, db=pool) {
  if(!user?.id) throw new Error('A user is required to load a workspace.');
  const result={};
  await Promise.all(['entries','items','budgets','subscriptions','tasks','subtasks','goals','goal_moves','day_plans','inbox'].map(async table=>{
    if(!hasAccess(user,['tasks','subtasks','day_plans','inbox'].includes(table)?'tasks':'money')) {result[table]=[];return;}
    const [rows]=await db.query(`SELECT * FROM ${table} WHERE user_id=? ORDER BY id DESC`,[user.id]);result[table]=rows;
  }));
  const [[settings]]=await db.query('SELECT name,reminder_email AS email,quiet_start,quiet_end,current_rate,last_currency,custom_currencies,home_currency FROM users WHERE id=?',[user.id]);
  result.settings=settings;
  result.cancelled_tasks=result.tasks.filter(t=>t.cancelled);
  result.tasks=result.tasks.filter(t=>!t.cancelled);
  return result;
}
