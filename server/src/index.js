import {createApp} from './app.js';
import {sendReminders} from './modules/reminders/reminders.js';
import {validateProductionSecurity} from './config/security.js';
import {pool} from './database/connection.js';
import {existsSync} from 'node:fs';

validateProductionSecurity();
if(process.env.NODE_ENV==='production'&&!existsSync(new URL('../../dist/index.html',import.meta.url)))throw new Error('Production frontend is missing. Run npm run build before starting.');
const host = process.env.HOST || '127.0.0.1';
const port = Number(process.env.PORT || 3001);
if(!Number.isInteger(port)||port<1||port>65535)throw new Error('PORT must be between 1 and 65535.');
const server=createApp().listen(port, host, () => console.log(`Daywell: http://${host}:${port}`));
let reminderJob=Promise.resolve(),reminderActive=false,stopping=false;
function runReminders(){
 if(stopping||reminderActive)return;
 reminderActive=true;reminderJob=sendReminders().finally(()=>{reminderActive=false;});
}
runReminders();
const timer=setInterval(runReminders,60000);
timer.unref();
async function shutdown(){
 if(stopping)return;stopping=true;clearInterval(timer);
 const deadline=setTimeout(()=>{server.closeAllConnections();process.exit(1);},30000);deadline.unref();
 try{
  await Promise.all([new Promise(resolve=>server.close(resolve)),reminderJob]);
  await pool.end();clearTimeout(deadline);
 }catch{process.exitCode=1;}
}
process.once('SIGTERM',shutdown);process.once('SIGINT',shutdown);
