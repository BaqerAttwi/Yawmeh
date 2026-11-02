import {today} from '../../../../shared/domain.js';

export const ownerColumns={last_seen_at:'DATETIME NULL',last_login_at:'DATETIME NULL',login_count:'BIGINT UNSIGNED NOT NULL DEFAULT 0'};
export async function migrateOwner(db){
 for(const [column,definition] of Object.entries(ownerColumns)){
  const [found]=await db.query('SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=?',['users',column]);
  if(!found.length)await db.query(`ALTER TABLE users ADD COLUMN ${column} ${definition}`);
 }
}

export async function ownerUsage(db){
 const [[totals]]=await db.query(`SELECT COUNT(*) AS accounts,
  COALESCE(SUM(active=1),0) AS enabled,
  COALESCE(SUM(active=1 AND last_seen_at>=UTC_TIMESTAMP()-INTERVAL 5 MINUTE),0) AS active_5m,
  COALESCE(SUM(active=1 AND last_seen_at>=UTC_TIMESTAMP()-INTERVAL 7 DAY),0) AS active_7d,
  COALESCE(SUM(login_count),0) AS sign_ins FROM users`);
 const [activity]=await db.query('SELECT id,last_seen_at,last_login_at,login_count FROM users ORDER BY id');
 const [[ai]]=await db.query('SELECT requests FROM companion_usage WHERE scope=?',[`month:${today(process.env.TIMEZONE||'Asia/Beirut').slice(0,7)}`]);
 return {mode:'family',paymentsEnabled:false,counts:Object.fromEntries(Object.entries(totals).map(([key,value])=>[key,Number(value)])),ai_requests_month:Number(ai?.requests||0),activity:activity.map(row=>({...row,login_count:Number(row.login_count)})),generated_at:new Date().toISOString()};
}
