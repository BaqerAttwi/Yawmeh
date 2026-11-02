import {REQUIRED_SCHEMA} from '../../database/schema-contract.js';
export async function setupStatus(db,env=process.env){
 let database={ready:false,reachable:false,missing:[],message:''};
 try{
  const [rows]=await db.query('SELECT TABLE_NAME AS table_name,COLUMN_NAME AS column_name FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE()');
  const columns=new Set(rows.map(r=>r.table_name+'.'+r.column_name));
  const missing=Object.entries(REQUIRED_SCHEMA).flatMap(([table,fields])=>fields.filter(field=>!columns.has(table+'.'+field)).map(field=>table+'.'+field));
  database={reachable:true,ready:missing.length===0,missing,message:missing.length?'Database connected, but schema updates are required. Back up the database, then run node server/scripts/migrate.js.':'All required tables and columns are present.'};
 }catch(error){database.message=error.code==='ER_ACCESS_DENIED_ERROR'?'MySQL rejected the login. Check MYSQL_USER and MYSQL_PASSWORD in .env.':error.code==='ER_BAD_DB_ERROR'?'The configured database was not found. Import daywell.sql or check MYSQL_DATABASE.':'MySQL could not be reached. Check that it is running and verify the host and port.';}
 return {database,email:{configured:!!(env.SMTP_HOST&&env.SMTP_FROM)},ai:{openai:!!env.OPENAI_API_KEY,claude:!!env.ANTHROPIC_API_KEY,gemini:!!env.GEMINI_API_KEY},timezone:env.TIMEZONE||'Asia/Beirut',secureCookies:env.COOKIE_SECURE==='true'};
}
