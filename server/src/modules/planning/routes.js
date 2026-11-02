import {z} from 'zod';
import {requireAccess} from '../auth/auth.js';
import {schemas,recurrenceSchema,subtaskSchema,goalMoveSchema} from '../../../../shared/validation.js';
import {today} from '../../../../shared/domain.js';
import {PlannerError,nextTaskValues,checkGoalMove} from '../../../../shared/planner.js';

export function mountPlanner(app,db,transaction){
  const date=()=>today(process.env.TIMEZONE||'Asia/Beirut');
  async function ownedTask(connection,userId,id){
    const [[task]]=await connection.query('SELECT * FROM tasks WHERE id=? AND user_id=? FOR UPDATE',[id,userId]);
    if(!task||task.cancelled)throw new PlannerError('Active task not found.',404);return task;
  }
  app.post('/api/tasks',requireAccess('tasks'),async(req,res)=>{
    const {subtasks,...task}=schemas.tasks.parse(req.body);
    const id=await transaction(req.user.id,async connection=>{
      const [created]=await connection.query('INSERT INTO tasks SET ?',{...task,user_id:req.user.id});
      for(const title of subtasks)await connection.query('INSERT INTO subtasks SET ?',{title,user_id:req.user.id,task_id:created.insertId,completed:0});
      return created.insertId;
    });res.status(201).json({id});
  });
  app.patch('/api/tasks/:id/cancel',requireAccess('tasks'),async(req,res)=>{
    const {cancelled}=z.object({cancelled:z.boolean()}).strict().parse(req.body);
    const id=z.coerce.number().int().positive().parse(req.params.id);
    await transaction(req.user.id,async cx=>{
      const [[task]]=await cx.query('SELECT * FROM tasks WHERE id=? AND user_id=? FOR UPDATE',[id,req.user.id]);
      if(!task)throw new PlannerError('Task not found.',404);
      if(task.completed)throw new PlannerError('Completed tasks cannot be cancelled.');
      await cx.query('UPDATE tasks SET cancelled=? WHERE id=? AND user_id=?',[cancelled,id,req.user.id]);
    });res.json({ok:true});
  });
  app.patch('/api/tasks/:id',requireAccess('tasks'),async(req,res)=>{
    const {completed}=z.object({completed:z.boolean()}).strict().parse(req.body);
    await transaction(req.user.id,async connection=>{
      const task=await ownedTask(connection,req.user.id,req.params.id);
      const [parts]=await connection.query('SELECT * FROM subtasks WHERE task_id=? AND user_id=?',[task.id,req.user.id]);
      if(completed&&parts.some(s=>!s.completed))throw new PlannerError('Complete the subtasks before completing this task.');
      const [children]=await connection.query('SELECT id FROM tasks WHERE previous_task_id=? AND user_id=?',[task.id,req.user.id]);
      if(!completed&&children.length)throw new PlannerError('This recurring occurrence already has a next task. Use that task instead.');
      if(!!task.completed===completed)return;
      await connection.query('UPDATE tasks SET completed=?,completed_on=? WHERE id=? AND user_id=?',[completed,completed?date():null,task.id,req.user.id]);
      const next=completed?nextTaskValues(task,date()):null;
      if(next&&!children.length){
        const [created]=await connection.query('INSERT INTO tasks SET ?',{...next,user_id:req.user.id});
        for(const part of parts)await connection.query('INSERT INTO subtasks SET ?',{title:part.title,task_id:created.insertId,user_id:req.user.id,completed:0});
      }
    });res.json({ok:true});
  });
  app.patch('/api/tasks/:id/recurrence',requireAccess('tasks'),async(req,res)=>{
    const {recurrence}=z.object({recurrence:recurrenceSchema}).strict().parse(req.body);
    await transaction(req.user.id,async connection=>{
      const task=await ownedTask(connection,req.user.id,req.params.id);
      if(task.completed)throw new PlannerError('Change the repeat schedule on the pending occurrence.');
      await connection.query('UPDATE tasks SET recurrence=? WHERE id=? AND user_id=?',[recurrence,task.id,req.user.id]);
    });res.json({ok:true});
  });
  app.post('/api/tasks/:id/subtasks',requireAccess('tasks'),async(req,res)=>{
    const value=subtaskSchema.parse(req.body);
    const id=await transaction(req.user.id,async connection=>{
      const task=await ownedTask(connection,req.user.id,req.params.id);
      if(task.completed)throw new PlannerError('Reopen the task before adding subtasks.');
      const [parts]=await connection.query('SELECT * FROM subtasks WHERE task_id=? AND user_id=?',[task.id,req.user.id]);
      if(parts.length>=30)throw new PlannerError('A task can have up to 30 subtasks.');
      const [result]=await connection.query('INSERT INTO subtasks SET ?',{...value,task_id:task.id,user_id:req.user.id,completed:0});return result.insertId;
    });res.status(201).json({id});
  });
  app.patch('/api/tasks/:id/subtasks/:subtaskId',requireAccess('tasks'),async(req,res)=>{
    const {completed}=z.object({completed:z.boolean()}).strict().parse(req.body);
    await transaction(req.user.id,async connection=>{
      const task=await ownedTask(connection,req.user.id,req.params.id);
      if(task.completed)throw new PlannerError('Reopen the task before changing its subtasks.');
      const [result]=await connection.query('UPDATE subtasks SET completed=? WHERE id=? AND task_id=? AND user_id=?',[completed,req.params.subtaskId,task.id,req.user.id]);
      if(!result.affectedRows)throw new PlannerError('Subtask not found.',404);
    });res.json({ok:true});
  });
  app.post('/api/goals',requireAccess('money'),async(req,res)=>{
    const value=schemas.goals.parse(req.body);
    const [result]=await db.query('INSERT INTO goals SET ?',{...value,user_id:req.user.id});res.status(201).json({id:result.insertId});
  });
  app.post('/api/goals/:id/moves',requireAccess('money'),async(req,res)=>{
    const value=goalMoveSchema.parse(req.body);
    await transaction(req.user.id,async connection=>{
      const [[goal]]=await connection.query('SELECT * FROM goals WHERE id=? AND user_id=? FOR UPDATE',[req.params.id,req.user.id]);
      if(!goal)throw new PlannerError('Goal not found.',404);
      const [entries]=await connection.query('SELECT * FROM entries WHERE user_id=?',[req.user.id]);
      const [moves]=await connection.query('SELECT * FROM goal_moves WHERE user_id=?',[req.user.id]);
      checkGoalMove(goal,entries,moves,value);
      await connection.query('INSERT INTO goal_moves SET ?',{...value,goal_id:goal.id,user_id:req.user.id,date:date()});
    });res.status(201).json({ok:true});
  });
}
