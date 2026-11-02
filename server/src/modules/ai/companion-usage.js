export const companionUsageSQL='CREATE TABLE IF NOT EXISTS `companion_usage` (\n `scope` VARCHAR(100) PRIMARY KEY,\n `requests` INT UNSIGNED NOT NULL DEFAULT 0\n) ENGINE=InnoDB';

// Reserve before contacting Google. Attempts remain counted after failures so
// retries, concurrent calls and process restarts cannot bypass the allowance.
export function mysqlCompanionUsage(db){return {async reserve(userId,day,{daily,monthly}){
 const connection=await db.getConnection();
 try{
  await connection.beginTransaction();
  const scopes=[[`month:${day.slice(0,7)}`,monthly],[`user:${userId}:${day}`,daily]];
  for(const [scope,limit] of scopes){
   await connection.query('INSERT IGNORE INTO companion_usage(scope,requests) VALUES(?,0)',[scope]);
   const [[row]]=await connection.query('SELECT requests FROM companion_usage WHERE scope=? FOR UPDATE',[scope]);
   if(row.requests>=limit){await connection.rollback();return false;}
   await connection.query('UPDATE companion_usage SET requests=requests+1 WHERE scope=?',[scope]);
  }
  await connection.commit();return true;
 }catch(error){await connection.rollback();throw error;}finally{connection.release();}
}};}
