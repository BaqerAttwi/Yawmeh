import {z} from 'zod';
import {daySchema,clockSchema} from './daily.js';
import {currencyCodeSchema} from './currency.js';

export const companionDraftSchema=z.object({
 type:z.enum(['task','expense','income','opening','withdrawal','budget','subscription','item']),
 initial:z.object({title:z.string().trim().max(160).optional(),amount:z.number().positive().max(999999999).refine(v=>Math.abs(v*100-Math.round(v*100))<.00001).optional(),currency:currencyCodeSchema.optional(),due:daySchema.optional(),date:daySchema.optional(),renewal:daySchema.optional(),start:daySchema.optional(),scheduled_time:clockSchema.optional()}).strict()
}).strict();
export const companionContextSchema=z.object({draft:companionDraftSchema.optional(),field:z.enum(['title','amount','currency']).optional(),topic:z.enum(['money','tasks','report']).optional()}).strict().nullable();
export const companionInputSchema=z.object({question:z.string().trim().min(1).max(1000),language:z.enum(['en','ar']),avatar:z.enum(['sage','nova','pip']),start:daySchema,end:daySchema,context:companionContextSchema.optional(),history:z.array(z.string().max(1000)).max(4).default([])}).strict();
export const companionIntentSchema=z.object({
 intent:z.enum(['greeting','help','cancel','plan','next_task','overdue','tasks','completed','savings','balance','expenses','budget_status','subscriptions','goals','spending_compare','weekly_report','report','afford','draft','clarify','off_topic']),
 draft:companionDraftSchema.optional(),amount:z.number().positive().max(999999999).optional(),currency:z.enum(['USD','LBP']).optional(),start:daySchema.optional(),end:daySchema.optional()
}).strict();
