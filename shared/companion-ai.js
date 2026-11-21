import {z} from 'zod';
import {daySchema,clockSchema} from './daily.js';
import {currencyCodeSchema} from './currency.js';

export const companionDraftSchema=z.object({
 type:z.enum(['task','expense','income','opening','withdrawal','budget','subscription','item']),
 initial:z.object({title:z.string().trim().max(160).optional(),amount:z.number().positive().max(999999999).refine(v=>Math.abs(v*100-Math.round(v*100))<.00001).optional(),currency:currencyCodeSchema.optional(),due:daySchema.optional(),date:daySchema.optional(),renewal:daySchema.optional(),start:daySchema.optional(),scheduled_time:clockSchema.optional()}).strict()
}).strict();
export const companionContextSchema=z.object({draft:companionDraftSchema.optional(),field:z.enum(['title','amount','currency','time','date']).optional(),topic:z.enum(['money','tasks','report']).optional(),goal:z.enum(['choose_topic','tasks','money']).optional(),transaction:z.object({amount:companionDraftSchema.shape.initial.shape.amount.unwrap(),currency:currencyCodeSchema}).strict().optional()}).strict().nullable();
export const companionInputSchema=z.object({question:z.string().trim().min(1).max(1000),language:z.enum(['en','ar']),languageMode:z.enum(['auto','explicit']).default('explicit'),avatar:z.enum(['sage','nova','pip']),start:daySchema,end:daySchema,reportArea:z.enum(['money','tasks']).optional(),context:companionContextSchema.optional(),dialogue:z.array(z.object({question:z.string().max(1000),answer:z.string().max(3000)}).strict()).max(4).default([]),history:z.array(z.string().max(1000)).max(4).default([])}).strict();
