import {newPasswordSchema} from '../../shared/password-policy.js';
import {resetTableSQL} from '../src/modules/auth/recovery.js';
import {companionUsageSQL} from '../src/modules/ai/companion-usage.js';
import {migrateOwner} from '../src/modules/auth/owner.js';
import {pool} from '../src/database/connection.js';
import {hashPassword} from '../src/modules/auth/passwords.js';
import {z} from 'zod';
import {APP_ACCESS} from '../../shared/access.js';
export async function migrate() {
  await pool.query(companionUsageSQL);
  const statements=[
    `CREATE TABLE IF NOT EXISTS settings (id INT PRIMARY KEY, name VARCHAR(100) NOT NULL DEFAULT 'Alex', email VARCHAR(254) NOT NULL DEFAULT '')`,
    `INSERT IGNORE INTO settings(id) VALUES(1)`,
    `CREATE TABLE IF NOT EXISTS entries (id INT AUTO_INCREMENT PRIMARY KEY, type ENUM('income','opening','expense','withdrawal') NOT NULL, title VARCHAR(160) NOT NULL, amount DECIMAL(12,2) NOT NULL, saved DECIMAL(12,2) NOT NULL DEFAULT 0, category VARCHAR(80) NOT NULL DEFAULT 'Other', date DATE NOT NULL, note TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, INDEX(date))`,
    `CREATE TABLE IF NOT EXISTS items (id INT AUTO_INCREMENT PRIMARY KEY, title VARCHAR(160) NOT NULL, amount DECIMAL(12,2) NOT NULL, category VARCHAR(80) NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS budgets (id INT AUTO_INCREMENT PRIMARY KEY, title VARCHAR(160) NOT NULL, amount DECIMAL(12,2) NOT NULL, \`start\` DATE NOT NULL, \`end\` DATE NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS subscriptions (id INT AUTO_INCREMENT PRIMARY KEY, title VARCHAR(160) NOT NULL, amount DECIMAL(12,2) NOT NULL, cycle ENUM('weekly','monthly','yearly') NOT NULL, renewal DATE NOT NULL, category VARCHAR(80) NOT NULL, active BOOLEAN NOT NULL DEFAULT TRUE)`,
    `CREATE TABLE IF NOT EXISTS tasks (id INT AUTO_INCREMENT PRIMARY KEY, title VARCHAR(160) NOT NULL, due DATE NOT NULL, priority ENUM('low','medium','high') NOT NULL, note TEXT NOT NULL, reminder DATE NULL, completed BOOLEAN NOT NULL DEFAULT FALSE)`,
    `CREATE TABLE IF NOT EXISTS reminder_log (id INT AUTO_INCREMENT PRIMARY KEY, reminder_key VARCHAR(200) NOT NULL UNIQUE, sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`
  ];
  for(const sql of statements) await pool.query(sql);
  const [taskColumns]=await pool.query("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tasks' AND COLUMN_NAME='category'");
  if(!taskColumns.length)await pool.query("ALTER TABLE tasks ADD COLUMN category VARCHAR(80) NOT NULL DEFAULT 'Personal'");
  for(const [column,definition] of [['recurrence',"ENUM('none','daily','weekly') NOT NULL DEFAULT 'none'"],['previous_task_id','INT NULL'],['completed_on','DATE NULL']]){
    const [found]=await pool.query("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tasks' AND COLUMN_NAME=?",[column]);
    if(!found.length)await pool.query(`ALTER TABLE tasks ADD COLUMN ${column} ${definition}`);
  }
  const [recurrenceIndex]=await pool.query("SELECT INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tasks' AND INDEX_NAME='unique_previous_task'");
  if(!recurrenceIndex.length)await pool.query('ALTER TABLE tasks ADD UNIQUE INDEX unique_previous_task(previous_task_id)');
  await pool.query(`CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(100) NOT NULL,
    email VARCHAR(254) NOT NULL UNIQUE, reminder_email VARCHAR(254) NOT NULL DEFAULT '',
    password_hash VARCHAR(200) NOT NULL, role ENUM('admin','user') NOT NULL DEFAULT 'user',
    permissions JSON NOT NULL, active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
  await pool.query(resetTableSQL);
  await migrateOwner(pool);
  const [[existingAdmin]]=await pool.query("SELECT id FROM users WHERE role='admin' ORDER BY id LIMIT 1");
  let adminId=existingAdmin?.id;
  if(!adminId) {
    const credentials=z.object({email:z.string().email(),password:newPasswordSchema.refine(p=>!p.startsWith('replace-'),'Choose your own admin password.')}).parse({email:process.env.ADMIN_EMAIL,password:process.env.ADMIN_PASSWORD});
    const [[legacy]]=await pool.query('SELECT name,email FROM settings WHERE id=1');
    const [created]=await pool.query('INSERT INTO users SET ?',{
      name:process.env.ADMIN_NAME||legacy.name||'Administrator',email:credentials.email.toLowerCase(),
      reminder_email:legacy.email||credentials.email,password_hash:await hashPassword(credentials.password),
      role:'admin',permissions:JSON.stringify(APP_ACCESS),
    });
    adminId=created.insertId;
  }
  for(const table of ['entries','items','budgets','subscriptions','tasks']) {
    const [columns]=await pool.query('SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=?',[table,'user_id']);
    if(!columns.length) await pool.query(`ALTER TABLE ${table} ADD COLUMN user_id INT NULL, ADD INDEX(user_id)`);
    // Claim legacy records once for the bootstrap administrator; never expose them to new users.
    await pool.query(`UPDATE ${table} SET user_id=? WHERE user_id IS NULL`,[adminId]);
    await pool.query(`ALTER TABLE ${table} MODIFY user_id INT NOT NULL`);
  }
  await pool.query(`CREATE TABLE IF NOT EXISTS sessions (
    token_hash CHAR(64) PRIMARY KEY, user_id INT NOT NULL,
    expires_at DATETIME NOT NULL, INDEX(user_id), INDEX(expires_at),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS subtasks (id INT AUTO_INCREMENT PRIMARY KEY,user_id INT NOT NULL,task_id INT NOT NULL,title VARCHAR(160) NOT NULL,completed BOOLEAN NOT NULL DEFAULT FALSE,INDEX(user_id),INDEX(task_id),FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE)`);
  await pool.query(`CREATE TABLE IF NOT EXISTS goals (id INT AUTO_INCREMENT PRIMARY KEY,user_id INT NOT NULL,title VARCHAR(160) NOT NULL,target_amount DECIMAL(12,2) NOT NULL,target_date DATE NULL,INDEX(user_id))`);
  await pool.query(`CREATE TABLE IF NOT EXISTS goal_moves (id INT AUTO_INCREMENT PRIMARY KEY,user_id INT NOT NULL,goal_id INT NOT NULL,kind ENUM('fund','release') NOT NULL,amount DECIMAL(12,2) NOT NULL,note VARCHAR(500) NOT NULL DEFAULT '',date DATE NOT NULL,INDEX(user_id),INDEX(goal_id),FOREIGN KEY(goal_id) REFERENCES goals(id))`);
  for(const [table,column,definition] of [
    ['entries','rate_snapshot','JSON NULL'],
    ['users','custom_currencies','JSON NULL'],
    ['users','home_currency',"VARCHAR(40) NOT NULL DEFAULT 'USD'"],
    ['entries','currency',"ENUM('USD','LBP') NOT NULL DEFAULT 'USD'"],
    ['entries','exchange_rate','DECIMAL(13,6) NULL'],
    ['users','current_rate','DECIMAL(13,6) NULL'],
    ['users','last_currency',"ENUM('USD','LBP') NOT NULL DEFAULT 'USD'"],
    ['tasks','scheduled_time','VARCHAR(5) NULL'],
    ['tasks','cancelled','BOOLEAN NOT NULL DEFAULT FALSE'],
    ['users','quiet_start',"VARCHAR(5) NOT NULL DEFAULT ''"],
    ['users','quiet_end',"VARCHAR(5) NOT NULL DEFAULT ''"],
    ['tasks','estimate_minutes','INT NOT NULL DEFAULT 0'],
    ['subscriptions','rarely_used','BOOLEAN NOT NULL DEFAULT FALSE'],
    ['goals','monthly_amount','DECIMAL(12,2) NOT NULL DEFAULT 0'],
    ['entries','voided_on','DATE NULL'],
    ['entries','void_reason',"VARCHAR(500) NOT NULL DEFAULT ''"]
  ]) {
    const [found]=await pool.query('SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=?',[table,column]);
    if(!found.length)await pool.query('ALTER TABLE '+table+' ADD COLUMN '+column+' '+definition);
  }
  await pool.query("ALTER TABLE entries MODIFY currency VARCHAR(40) NOT NULL DEFAULT 'USD'");
  await pool.query("ALTER TABLE users MODIFY last_currency VARCHAR(40) NOT NULL DEFAULT 'USD'");
  await pool.query("CREATE TABLE IF NOT EXISTS day_plans (id INT AUTO_INCREMENT PRIMARY KEY,user_id INT NOT NULL,date DATE NOT NULL,energy ENUM('low','normal','high') NOT NULL DEFAULT 'normal',top_ids JSON NOT NULL,went_well TEXT NOT NULL,tomorrow_help TEXT NOT NULL,UNIQUE KEY user_day(user_id,date))");
  const [closeColumn]=await pool.query("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='day_plans' AND COLUMN_NAME='closed_at'");
  if(!closeColumn.length)await pool.query('ALTER TABLE day_plans ADD COLUMN closed_at VARCHAR(30) NULL');
  await pool.query("CREATE TABLE IF NOT EXISTS inbox (id INT AUTO_INCREMENT PRIMARY KEY,user_id INT NOT NULL,text VARCHAR(1000) NOT NULL,date DATE NOT NULL,archived BOOLEAN NOT NULL DEFAULT FALSE,task_id INT NULL,INDEX(user_id))");
}
if(process.argv[1]?.endsWith('migrate.js')) {try {await migrate();console.log('Database tables ready.');} finally {await pool.end();}}

