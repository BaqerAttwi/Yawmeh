import {z} from 'zod';
import {daySchema,mergePlan,rescheduled} from './daily.js';
import {addDays,PlannerError,calendarEvents} from './planner.js';
import {periodSummary,daysUntil} from './domain.js';
export const viewRangeSchema=z.object({start:daySchema,end:daySchema}).refine(v=>v.end>=v.start&&daysUntil(v.end,v.start)<=365,'Choose an ordered range of up to 366 days.');
export function rangeFor(preset,current){const days={today:1,'2days':2,'3days':3,week:7}[preset];if(!days)throw new PlannerError('Choose a valid range.');return {start:current,end:addDays(current,days-1)};}
export function todayView(data,range){viewRangeSchema.parse(range);const summary=periodSummary(data,range.start,range.end);return {...summary,minutes:summary.tasks.filter(t=>!t.completed).reduce((s,t)=>s+Number(t.estimate_minutes||0),0),renewals:calendarEvents({...data,tasks:[]},range.start,range.end),expenses:data.entries.filter(e=>!e.voided_on&&e.type==='expense'&&e.date>=range.start&&e.date<=range.end)};}
export const closeDaySchema=z.object({task_ids:z.array(z.union([z.number().int().positive(),z.string().min(1).max(100)])).max(100),move_to:daySchema,went_well:z.string().trim().max(2000),tomorrow_help:z.string().trim().max(2000)}).strict();
export function closeDayValues(data,date,input,now=new Date().toISOString()){
 const value=closeDaySchema.parse(input),existing=data.day_plans.find(p=>p.date===date);
 if(existing?.closed_at)return {alreadyClosed:true,plan:existing,moves:[]};
 if(value.move_to<=date)throw new PlannerError('Move unfinished tasks to a date after today.');
 if(new Set(value.task_ids.map(String)).size!==value.task_ids.length)throw new PlannerError('Choose each task only once.');
 const moves=value.task_ids.map(id=>{const task=data.tasks.find(t=>String(t.id)===String(id));if(!task)throw new PlannerError('Task not found in your workspace.',404);if(task.completed||task.due>date)throw new PlannerError('Only unfinished tasks due today or earlier can be moved. Refresh your review.');return {id:task.id,...rescheduled(task,value.move_to)};});
 return {alreadyClosed:false,plan:{...mergePlan(existing,{went_well:value.went_well,tomorrow_help:value.tomorrow_help},data.tasks,date),closed_at:now},moves};
}
