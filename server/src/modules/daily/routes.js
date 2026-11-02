import {closeDayValues,closeDaySchema} from '../../../../shared/today.js';
import {z} from 'zod';
import {requireAccess} from '../auth/auth.js';
import {daySchema,planSchema,captureSchema,rescheduleSchema,mergePlan,rescheduled} from '../../../../shared/daily.js';
import {PlannerError} from '../../../../shared/planner.js';
import {today} from '../../../../shared/domain.js';
export function mountDaily(app,db,transaction){
 const current=()=>today(process.env.TIMEZONE||'Asia/Beirut');
 app.post('/api/day_plans/today/close',requireAccess('tasks'),async(req,res)=>{
  const input=closeDaySchema.parse(req.body),date=current();
  await transaction(req.user.id,async connection=>{
   const [day_plans]=await connection.query('SELECT * FROM day_plans WHERE user_id=?',[req.user.id]);
   const [tasks]=await connection.query('SELECT * FROM tasks WHERE user_id=?',[req.user.id]);
   const result=closeDayValues({day_plans,tasks:tasks.filter(t=>!t.cancelled)},date,input);if(result.alreadyClosed)return;
   for(const move of result.moves)await connection.query('UPDATE tasks SET due=?,reminder=? WHERE id=? AND user_id=?',[move.due,move.reminder,move.id,req.user.id]);
   const p=result.plan,existing=day_plans.find(p=>p.date===date);
   if(existing)await connection.query('UPDATE day_plans SET went_well=?,tomorrow_help=?,closed_at=? WHERE id=? AND user_id=?',[p.went_well,p.tomorrow_help,p.closed_at,existing.id,req.user.id]);
   else await connection.query('INSERT INTO day_plans SET ?',{...p,user_id:req.user.id});
  });res.json({ok:true});
 });
 app.post('/api/day_plans/today/reopen',requireAccess('tasks'),async(req,res)=>{
  z.object({}).strict().parse(req.body);
  await transaction(req.user.id,async connection=>{
   const [plans]=await connection.query('SELECT * FROM day_plans WHERE user_id=?',[req.user.id]);
   const plan=plans.find(p=>p.date===current());if(plan)await connection.query('UPDATE day_plans SET closed_at=? WHERE id=? AND user_id=?',[null,plan.id,req.user.id]);
  });res.json({ok:true});
 });
 app.patch('/api/day_plans/:date',requireAccess('tasks'),async(req,res)=>{
  const date=daySchema.parse(req.params.date),patch=planSchema.parse(req.body);
  await transaction(req.user.id,async connection=>{
   const [plans]=await connection.query('SELECT * FROM day_plans WHERE user_id=?',[req.user.id]);
   const [tasks]=await connection.query('SELECT * FROM tasks WHERE user_id=?',[req.user.id]);
   const existing=plans.find(p=>p.date===date),value=mergePlan(existing,patch,tasks,date);
   if(existing)await connection.query('UPDATE day_plans SET energy=?,top_ids=?,went_well=?,tomorrow_help=? WHERE id=? AND user_id=?',[value.energy,value.top_ids,value.went_well,value.tomorrow_help,existing.id,req.user.id]);
   else await connection.query('INSERT INTO day_plans SET ?',{...value,user_id:req.user.id});
  });res.json({ok:true});
 });
 app.post('/api/inbox',requireAccess('tasks'),async(req,res)=>{
  const value=captureSchema.parse(req.body);const [r]=await db.query('INSERT INTO inbox SET ?',{...value,user_id:req.user.id,date:current(),archived:0,task_id:null});res.status(201).json({id:r.insertId});
 });
 app.patch('/api/inbox/:id',requireAccess('tasks'),async(req,res)=>{
  const {archived}=z.object({archived:z.boolean()}).strict().parse(req.body);
  const [r]=await db.query('UPDATE inbox SET archived=? WHERE id=? AND user_id=?',[archived,req.params.id,req.user.id]);
  if(!r.affectedRows)throw new PlannerError('Inbox note not found.',404);res.json({ok:true});
 });
 app.post('/api/inbox/:id/convert',requireAccess('tasks'),async(req,res)=>{
  const {due}=rescheduleSchema.parse(req.body);
  const id=await transaction(req.user.id,async connection=>{
   const [[item]]=await connection.query('SELECT * FROM inbox WHERE id=? AND user_id=? FOR UPDATE',[req.params.id,req.user.id]);
   if(!item)throw new PlannerError('Inbox note not found.',404);
   if(item.task_id)return item.task_id;
   const [r]=await connection.query('INSERT INTO tasks SET ?',{title:item.text.slice(0,160),note:item.text,category:'Personal',due,priority:'medium',estimate_minutes:0,recurrence:'none',reminder:null,scheduled_time:null,completed:0,user_id:req.user.id});
   await connection.query('UPDATE inbox SET task_id=?,archived=? WHERE id=? AND user_id=?',[r.insertId,true,item.id,req.user.id]);return r.insertId;
  });res.json({id});
 });
 app.patch('/api/tasks/:id/reschedule',requireAccess('tasks'),async(req,res)=>{
  const {due}=rescheduleSchema.parse(req.body);
  await transaction(req.user.id,async connection=>{
   const [[task]]=await connection.query('SELECT * FROM tasks WHERE id=? AND user_id=? FOR UPDATE',[req.params.id,req.user.id]);
   if(!task||task.cancelled)throw new PlannerError('Active task not found.',404);
   const value=rescheduled(task,due);
   await connection.query('UPDATE tasks SET due=?,reminder=? WHERE id=? AND user_id=?',[value.due,value.reminder,task.id,req.user.id]);
  });res.json({ok:true});
 });
}
