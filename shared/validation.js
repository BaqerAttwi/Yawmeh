import {currencyCodeSchema,rateSchema} from './currency.js';
import {clockSchema,daySchema} from './daily.js';
import {z} from 'zod';
const text=z.string().trim().min(1).max(160);
const date=daySchema;
const money=z.coerce.number().positive().max(999999999).refine(v=>Math.abs(v*100-Math.round(v*100))<0.00001,'Use at most two decimal places');
export const exchangeRateSchema=z.coerce.number().positive().max(1000000).refine(v=>Math.abs(v*1e6-Math.round(v*1e6))<0.0001,'Use at most six decimal places');
const category=z.string().trim().min(1).max(80).default('Other');
export const taskCategorySchema=z.string().trim().min(1,'Enter a category.').max(80,'Use at most 80 characters.');
export const recurrenceSchema=z.enum(['none','daily','weekly']);
export const subtaskSchema=z.object({title:text}).strict();
export const goalMoveSchema=z.object({kind:z.enum(['fund','release']),amount:money,note:z.string().trim().max(500).default('')}).strict();
export const entrySchema=z.object({exchange_rate:exchangeRateSchema.optional(),unit_rate:rateSchema.optional(),rate_reference:currencyCodeSchema.optional(),currency:currencyCodeSchema.default('USD'),type:z.enum(['income','opening','expense','withdrawal']),title:text,amount:money,saved:z.coerce.number().min(0).max(999999999).default(0).refine(v=>Math.abs(v*100-Math.round(v*100))<0.00001),category,date,note:z.string().trim().max(2000).default('')}).refine(e=>e.type==='income'||e.saved===0,'Only income can include an allocation');
export const schemas={
  items:z.object({title:text,amount:money,category}),
  budgets:z.object({title:text,amount:money,start:date,end:date}).refine(b=>b.end>=b.start,'End must be after start'),
  subscriptions:z.object({title:text,amount:money,cycle:z.enum(['weekly','monthly','yearly']),renewal:date,category}),
  tasks:z.object({scheduled_time:clockSchema.nullable().default(null),estimate_minutes:z.coerce.number().int().min(0).max(1440).default(0),title:text,category:taskCategorySchema.default('Personal'),due:date,priority:z.enum(['low','medium','high']),note:z.string().max(2000).default(''),reminder:date.nullable().default(null),recurrence:recurrenceSchema.default('none'),subtasks:z.array(text).max(30).default([])}).refine(t=>!t.reminder||t.reminder<=t.due,'Reminder must be on or before the due date'),
  goals:z.object({title:text,target_amount:money,target_date:date.nullable().default(null)}).strict(),
  settings:z.object({current_rate:exchangeRateSchema.optional(),quiet_start:z.union([clockSchema,z.literal('')]).default(''),quiet_end:z.union([clockSchema,z.literal('')]).default(''),name:z.string().trim().min(1).max(100),email:z.union([z.string().email().max(254),z.literal('')])}).refine(s=>(!s.quiet_start&&!s.quiet_end)||(!!s.quiet_start&&!!s.quiet_end&&s.quiet_start!==s.quiet_end),'Choose both quiet-hour times, with different start and end times.')
};
