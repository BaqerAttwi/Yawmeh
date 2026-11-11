import {z} from 'zod';
import {daySchema,clockSchema} from './daily.js';
import {currencyCodeSchema} from './currency.js';
import {companionChangeSchema} from './companion-changes.js';

export const companionDraftSchema=z.object({
 type:z.enum(['task','expense','income','opening','withdrawal','budget','subscription','item']),
 initial:z.object({title:z.string().trim().max(160).optional(),amount:z.number().positive().max(999999999).refine(v=>Math.abs(v*100-Math.round(v*100))<.00001).optional(),currency:currencyCodeSchema.optional(),due:daySchema.optional(),date:daySchema.optional(),renewal:daySchema.optional(),start:daySchema.optional(),scheduled_time:clockSchema.optional()}).strict()
}).strict();
export const companionContextSchema=z.object({draft:companionDraftSchema.optional(),field:z.enum(['title','amount','currency','time','date']).optional(),topic:z.enum(['money','tasks','report']).optional(),goal:z.enum(['choose_topic','tasks','money']).optional()}).strict().nullable();
export const companionInputSchema=z.object({question:z.string().trim().min(1).max(1000),language:z.enum(['en','ar']),languageMode:z.enum(['auto','explicit']).default('explicit'),avatar:z.enum(['sage','nova','pip']),start:daySchema,end:daySchema,context:companionContextSchema.optional(),dialogue:z.array(z.object({question:z.string().max(1000),answer:z.string().max(3000)}).strict()).max(4).default([]),history:z.array(z.string().max(1000)).max(4).default([])}).strict();
export const companionIntentSchema=z.object({
 intent:z.enum(['greeting','help','cancel','plan','next_task','overdue','tasks','completed','savings','balance','expenses','budget_status','subscriptions','goals','spending_compare','weekly_report','report','afford','draft','change','clarify','guide','conversation','off_topic']),
 change:companionChangeSchema.optional(),
 replyLanguage:z.enum(['en','ar']).optional(),answer:z.string().trim().min(1).max(3000).optional(),draft:companionDraftSchema.optional(),clarificationField:z.enum(['time','date','amount','currency','title']).optional(),goal:z.enum(['choose_topic','tasks','money']).optional(),amount:z.number().positive().max(999999999).optional(),currency:z.enum(['USD','LBP']).optional(),start:daySchema.optional(),end:daySchema.optional()
}).strict();
