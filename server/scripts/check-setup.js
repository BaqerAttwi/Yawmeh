import 'dotenv/config';
import {pool} from '../src/database/connection.js';
import {setupStatus} from '../src/modules/system/status.js';
try{const status=await setupStatus(pool);console.log(JSON.stringify(status,null,2));if(!status.database.ready)process.exitCode=1;}finally{await pool.end();}
