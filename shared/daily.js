import {z} from 'zod';
import {addDays,PlannerError} from './planner.js';
import {daysUntil} from './domain.js';
export const daySchema=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v=>v>='1000-01-01'&&v<='9999-12-31'&&!isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v,'Choose a valid date');
export const clockSchema=z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
export const planSchema=z.object({energy:z.enum(['low','normal','high']).optional(),top_ids:z.array(z.union([z.number().int().positive(),z.string().min(1).max(100)])).max(3).optional(),went_well:z.string().trim().max(2000).optional(),tomorrow_help:z.string().trim().max(2000).optional()}).strict();
export const captureSchema=z.object({text:z.string().trim().min(1).max(1000)}).strict();
export const rescheduleSchema=z.object({due:daySchema}).strict();
export const ENERGY={low:{minutes:30,label:'Keep it light',hint:'Try one small essential task and leave space to rest.'},normal:{minutes:90,label:'A steady day',hint:'Choose a few priorities and leave room between them.'},high:{minutes:180,label:'Room for a challenge',hint:'Try a deeper task, with breaks and a clear stopping point.'}};
export function topIds(plan){try{const ids=typeof plan?.top_ids==='string'?JSON.parse(plan.top_ids):plan?.top_ids;return Array.isArray(ids)?ids:[];}catch{return [];}}
export function mergePlan(existing,patch,tasks,date){
 const next={energy:'normal',top_ids:[],went_well:'',tomorrow_help:'',...existing,...patch};
 const ids=patch.top_ids===undefined?topIds(existing):patch.top_ids;
 if(ids.length>3||new Set(ids.map(String)).size!==ids.length)throw new PlannerError('Choose up to three different priorities.');
 if(patch.top_ids!==undefined&&ids.some(id=>!tasks.some(t=>!t.cancelled&&String(t.id)===String(id))))throw new PlannerError('Choose active tasks from your own workspace.',404);
 next.top_ids=JSON.stringify(ids.filter(id=>tasks.some(t=>!t.cancelled&&String(t.id)===String(id))));next.date=date;return next;
}
export function rescheduled(task,due){
 if(task.cancelled)throw new PlannerError('Restore a cancelled task before moving it.');
 if(task.completed)throw new PlannerError('Reopen a completed task before moving it.');
 const shift=daysUntil(due,task.due);
 const reminder=task.reminder?addDays(task.reminder,shift):null;
 if(reminder&&(reminder<'1000-01-01'||reminder>'9999-12-31'))throw new PlannerError('Choose a date within the supported reminder range.');
 return {due,reminder};
}
export function inQuietHours(start,end,now=new Date(),zone='Asia/Beirut'){
 if(!start||!end||start===end)return false;
 const time=new Intl.DateTimeFormat('en-GB',{timeZone:zone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(now);
 return start<end?time>=start&&time<end:time>=start||time<end;
}
