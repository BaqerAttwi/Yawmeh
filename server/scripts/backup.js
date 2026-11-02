import 'dotenv/config';
import {spawn} from 'node:child_process';
import {existsSync,createWriteStream} from 'node:fs';
import {mkdir,rename,unlink,stat,writeFile} from 'node:fs/promises';
import {pipeline} from 'node:stream/promises';
import {createGzip} from 'node:zlib';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

export async function backup(){
 const root=fileURLToPath(new URL('../../',import.meta.url));
 const dir=resolve(root,'backups');await mkdir(dir,{recursive:true});
 const database=process.env.MYSQL_DATABASE||'daywell';
 if(!/^[a-zA-Z0-9_]+$/.test(database))throw new Error('Unsupported database name.');
 const executable=process.env.MYSQLDUMP_PATH||(existsSync('C:/xampp/mysql/bin/mysqldump.exe')?'C:/xampp/mysql/bin/mysqldump.exe':'mysqldump');
 const stamp=new Date().toISOString().replace(/[:.]/g,'-');
 const target=resolve(dir,`${database}-${stamp}.sql.gz`),temporary=target+'.partial';
 // Password travels only in the child environment, never in command-line arguments.
 const child=spawn(executable,['--host='+ (process.env.MYSQL_HOST||'127.0.0.1'),'--port='+(process.env.MYSQL_PORT||3306),'--user='+(process.env.MYSQL_USER||'daywell'),'--single-transaction','--quick','--hex-blob','--default-character-set=utf8mb4',database],{windowsHide:true,env:{...process.env,MYSQL_PWD:process.env.MYSQL_PASSWORD||''},stdio:['ignore','pipe','pipe']});
 child.stderr.resume(); // Never echo database diagnostic text that could contain sensitive values.
 const completed=new Promise((resolve,reject)=>{child.once('error',()=>reject(new Error('Cannot launch mysqldump. Set MYSQLDUMP_PATH to its executable.')));child.once('close',code=>code===0?resolve():reject(new Error('Database backup failed. Check that MySQL is running and credentials permit backups.')));});
 try{
  await Promise.all([completed,pipeline(child.stdout,createGzip(),createWriteStream(temporary,{flags:'wx',mode:0o600}))]);
  if((await stat(temporary)).size<100)throw new Error('Backup output is unexpectedly small.');
  await rename(temporary,target);
  console.log('Backup created: '+target);
  return target;
 }catch(error){child.kill();await unlink(temporary).catch(()=>{});throw error;}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))backup().catch(error=>{console.error(error.message);process.exitCode=1;});
