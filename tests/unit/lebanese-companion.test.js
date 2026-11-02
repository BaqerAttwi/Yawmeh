import test from 'node:test';
import assert from 'node:assert/strict';
import {localCompanion} from '../../shared/local-companion.js';
const data={entries:[],tasks:[],settings:{last_currency:'USD'}};
const ask=(q,user={role:'admin'},context=null)=>localCompanion(data,user,q,'2026-10-13',{},context);
test('Lebanese task preserves title and resolves tomorrow and evening',()=>{
 const r=ask('ذكرني العب فوتبول بكرا الساعة ٩ المسا');
 assert.equal(r.action.type,'task');assert.equal(r.action.initial.title,'العب فوتبول');assert.equal(r.action.initial.due,'2026-10-14');assert.equal(r.action.initial.scheduled_time,'21:00');
});
test('Lebanese money recognizes original currency and Arabic digits',()=>{
 const r=ask('صرفت ١٥ دولار على الغدا');assert.equal(r.action.initial.amount,15);assert.equal(r.action.initial.currency,'USD');assert.equal(r.action.initial.title,'الغدا');
 const income=ask('قبضت ٩٠٠٠٠٠ ليرة من الشغل');assert.equal(income.action.type,'income');assert.equal(income.action.initial.currency,'LBP');
});
test('Lebanese permissions and ambiguous times do not produce drafts',()=>{
 assert.equal(ask('صرفت 15 دولار على الغدا',{role:'user',permissions:['tasks']}).action,undefined);
 assert.equal(ask('ذكرني فوتبول الساعة تسعة المسا').action,undefined);
 assert.equal(ask('حول كل مصرياتي').action,undefined);
 assert.equal(ask('ذكرني فوتبول بعد بكرا').action,undefined);
});
test('Arabic title followup and cancellation retain draft safety',()=>{
 const first=ask('ضيف مصروف 15 دولار');assert.equal(first.context.field,'title');
 const next=ask('الغدا',{role:'admin'},first.context);assert.equal(next.action.initial.title,'الغدا');
 assert.equal(ask('الغي',{role:'admin'},first.context).context,undefined);
});
test('Arabizi expense asks for title and currency without assuming USD',()=>{
 const first=ask('sarfet lyoum 20');assert.equal(first.context.field,'title');assert.equal(first.action,undefined);
 const second=ask('lunch',{role:'admin'},first.context);assert.equal(second.context.field,'currency');assert.equal(second.action,undefined);
 const last=ask('lira',{role:'admin'},second.context);assert.equal(last.action.initial.amount,20);assert.equal(last.action.initial.currency,'LBP');assert.equal(last.action.initial.date,'2026-10-13');
});
test('Arabizi full expense, income and task commands preserve details',()=>{
 assert.equal(ask('sarfet lyoum 20 dollar 3a lunch').action.initial.title,'lunch');
 assert.equal(ask('2ebedt lyoum 100 dollar').context.field,'title');
 const task=ask('zakerne football bokra se3a 9 masa').action;assert.equal(task.initial.scheduled_time,'21:00');assert.equal(task.initial.due,'2026-10-14');
});
test('Currency followups remain permission scoped and reject unknown currencies',()=>{
 const first=ask('sarfet 20 3a lunch');assert.equal(first.context.field,'currency');
 assert.equal(ask('XYZ',{role:'admin'},first.context).action,undefined);
 assert.equal(ask('USD',{role:'user',permissions:['tasks']},first.context).action,undefined);
 const title=ask('ضيف مصروف دولار');const amount=ask('غدا',{role:'admin'},title.context);assert.equal(ask('٢٠',{role:'admin'},amount.context).action.initial.amount,20);
});
