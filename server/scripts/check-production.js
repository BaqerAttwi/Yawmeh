import 'dotenv/config';
import {existsSync} from 'node:fs';
import {validateProductionSecurity} from '../src/config/security.js';
import {pool} from '../src/database/connection.js';
import {setupStatus} from '../src/modules/system/status.js';

try {
 if(process.env.NODE_ENV!=='production')throw new Error('Set NODE_ENV=production for this deployment check.');
 validateProductionSecurity();
 if(/(^localhost$|^example\.(com|org|net)$|\.(example|invalid|test)$)/i.test(new URL(process.env.APP_ORIGIN).hostname))throw new Error('Replace the example APP_ORIGIN with your public HTTPS domain.');
 if(!existsSync(new URL('../../dist/index.html',import.meta.url)))throw new Error('Run npm run build before deployment.');
 const status=await setupStatus(pool);
 if(!status.database.ready)throw new Error(status.database.message);
 const [[admins]]=await pool.query("SELECT COUNT(*) AS count FROM users WHERE role='admin' AND active=1");
 if(!admins.count)throw new Error('Create the first administrator with npm run db:init before launch.');
 console.log('PASS: production security settings, frontend build and database schema.');
 if(!status.email.configured||!process.env.APP_ORIGIN)throw new Error('Configure SMTP_HOST, SMTP_FROM and APP_ORIGIN for reminders and password recovery before launch.');
 console.log('PASS: email settings are present. Verify actual delivery before launch.');
 if(!process.env.TRUST_PROXY)console.log('NOTE: configure TRUST_PROXY when running behind an HTTPS reverse proxy.');
 console.log('This check does not verify public DNS, TLS, email delivery or backup restoration.');
}catch(error){console.error('NOT READY: '+error.message);process.exitCode=1;}
finally{await pool.end();}
