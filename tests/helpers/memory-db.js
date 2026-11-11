// SQL-shaped test double. No live MySQL service is required for HTTP authorization tests.
export function memoryDatabase(records,users,queries=[]){
  for(const table of ['tasks','entries','items','budgets','subscriptions','subtasks','goals','goal_moves','day_plans','inbox'])records[table]??=[];
  let tail=Promise.resolve();
  async function query(sql,args=[]){
    queries.push({sql,args});
    let match=sql.match(/^SELECT \* FROM (\w+) WHERE user_id=\?(?: ORDER BY id DESC)?$/);
    if(match)return [records[match[1]].filter(r=>r.user_id===args[0])];
    if(sql==='SELECT name,reminder_email AS email,quiet_start,quiet_end,current_rate,last_currency,custom_currencies,home_currency FROM users WHERE id=?')return [[{...users.find(u=>u.id===args[0]),email:''}]];
    if(sql==='SELECT current_rate,last_currency,custom_currencies,home_currency FROM users WHERE id=?')return [users.filter(u=>u.id===args[0]).map(u=>({current_rate:u.current_rate,last_currency:u.last_currency||'USD',custom_currencies:u.custom_currencies,home_currency:u.home_currency||'USD'}))];
    if(/^UPDATE users SET (last_currency|current_rate|custom_currencies|home_currency)=\? WHERE id=\?$/.test(sql)){const u=users.find(u=>u.id===args[1]);u[sql.match(/SET (\w+)=/)[1]]=args[0];return [{affectedRows:1}];}
    if(sql==='SELECT id FROM users WHERE id=? FOR UPDATE')return [users.filter(u=>u.id===args[0]).map(u=>({id:u.id}))];
    match=sql.match(/^SELECT \* FROM (tasks|goals|inbox|subscriptions) WHERE id=\? AND user_id=\? FOR UPDATE$/);
    if(match)return [records[match[1]].filter(r=>r.id===Number(args[0])&&r.user_id===args[1])];
    if(sql==='SELECT * FROM subtasks WHERE task_id=? AND user_id=?')return [records.subtasks.filter(r=>r.task_id===args[0]&&r.user_id===args[1])];
    if(sql==='SELECT id FROM tasks WHERE previous_task_id=? AND user_id=?')return [records.tasks.filter(r=>r.previous_task_id===args[0]&&r.user_id===args[1]).map(r=>({id:r.id}))];
    match=sql.match(/^INSERT INTO (tasks|subtasks|goals|goal_moves|entries|day_plans|inbox) SET \?$/);
    if(match){const table=records[match[1]],id=Math.max(0,...table.map(r=>r.id))+1;table.push({...args,id});return [{insertId:id}];}
    if(sql==='UPDATE subscriptions SET renewal=? WHERE id=? AND user_id=?'){const row=records.subscriptions.find(r=>r.id===Number(args[1])&&r.user_id===args[2]);if(row)row.renewal=args[0];return [{affectedRows:row?1:0}];}
    if(sql==='UPDATE tasks SET completed=?,completed_on=? WHERE id=? AND user_id=?'){
      const task=records.tasks.find(r=>r.id===Number(args[2])&&r.user_id===args[3]);if(task)Object.assign(task,{completed:args[0],completed_on:args[1]});return [{affectedRows:task?1:0}];
    }
    match=sql.match(/^UPDATE tasks SET (category|recurrence|cancelled)=\? WHERE id=\? AND user_id=\?$/);
    if(match){const task=records.tasks.find(r=>r.id===Number(args[1])&&r.user_id===args[2]);if(task)task[match[1]]=args[0];return [{affectedRows:task?1:0}];}
    if(sql==='UPDATE subtasks SET completed=? WHERE id=? AND task_id=? AND user_id=?'){
      const part=records.subtasks.find(r=>r.id===Number(args[1])&&r.task_id===args[2]&&r.user_id===args[3]);if(part)part.completed=args[0];return [{affectedRows:part?1:0}];
    }
    match=sql.match(/^UPDATE (tasks|goals|subscriptions) SET (estimate_minutes|monthly_amount|rarely_used)=\? WHERE id=\? AND user_id=\?$/);
    if(match){const row=records[match[1]].find(r=>r.id===Number(args[1])&&r.user_id===args[2]);if(row)row[match[2]]=args[0];return [{affectedRows:row?1:0}];}
    match=sql.match(/^UPDATE (tasks|entries|subscriptions|budgets|goals|items) SET title=\? WHERE id=\? AND user_id=\?( AND voided_on IS NULL| AND cancelled=0)?$/);
    if(match){
      const row=records[match[1]].find(r=>r.id===Number(args[1])&&r.user_id===args[2]&&
        (match[2]!==' AND voided_on IS NULL'||!r.voided_on)&&(match[2]!==' AND cancelled=0'||!r.cancelled));
      if(row)row.title=args[0];
      return [{affectedRows:row?1:0}];
    }
    if(sql==='UPDATE entries SET voided_on=?,void_reason=? WHERE id=? AND user_id=?'){const row=records.entries.find(r=>r.id===Number(args[2])&&r.user_id===args[3]);if(row)Object.assign(row,{voided_on:args[0],void_reason:args[1]});return [{affectedRows:row?1:0}];}

    if(sql==='UPDATE day_plans SET energy=?,top_ids=?,went_well=?,tomorrow_help=? WHERE id=? AND user_id=?') {const row=records.day_plans.find(r=>r.id===Number(args[4])&&r.user_id===args[5]);if(row)Object.assign(row,{energy:args[0],top_ids:args[1],went_well:args[2],tomorrow_help:args[3]});return [{affectedRows:row?1:0}];}
    if(sql==='UPDATE inbox SET archived=? WHERE id=? AND user_id=?'){const row=records.inbox.find(r=>r.id===Number(args[1])&&r.user_id===args[2]);if(row)row.archived=args[0];return [{affectedRows:row?1:0}];}
    if(sql==='UPDATE inbox SET task_id=?,archived=? WHERE id=? AND user_id=?'){const row=records.inbox.find(r=>r.id===Number(args[2])&&r.user_id===args[3]);if(row)Object.assign(row,{task_id:args[0],archived:args[1]});return [{affectedRows:row?1:0}];}
    if(sql==='UPDATE tasks SET due=?,reminder=? WHERE id=? AND user_id=?'){const row=records.tasks.find(r=>r.id===Number(args[2])&&r.user_id===args[3]);if(row)Object.assign(row,{due:args[0],reminder:args[1]});return [{affectedRows:row?1:0}];}
    if(sql==='UPDATE users SET name=?,reminder_email=?,quiet_start=?,quiet_end=? WHERE id=?'){const row=users.find(u=>u.id===args[4]);Object.assign(row,{name:args[0],reminder_email:args[1],quiet_start:args[2],quiet_end:args[3]});return [{affectedRows:1}];}
    if(sql==='UPDATE day_plans SET went_well=?,tomorrow_help=?,closed_at=? WHERE id=? AND user_id=?'){const row=records.day_plans.find(r=>r.id===Number(args[3])&&r.user_id===args[4]);if(row)Object.assign(row,{went_well:args[0],tomorrow_help:args[1],closed_at:args[2]});return [{affectedRows:row?1:0}];}
    if(sql==='UPDATE day_plans SET closed_at=? WHERE id=? AND user_id=?'){const row=records.day_plans.find(r=>r.id===Number(args[1])&&r.user_id===args[2]);if(row)row.closed_at=args[0];return [{affectedRows:row?1:0}];}
    throw new Error('Unexpected database query: '+sql);
  }
  return {query,async getConnection(){let unlock,backup;return {query,async beginTransaction(){const previous=tail;tail=new Promise(resolve=>{unlock=resolve;});await previous;backup=structuredClone(records);},async commit(){unlock();},async rollback(){for(const key of Object.keys(records))records[key]=backup[key];unlock();},release(){}};}};
}
