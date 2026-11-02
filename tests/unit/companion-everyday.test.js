import test from 'node:test';
import assert from 'node:assert/strict';
import {localCompanion} from '../../shared/local-companion.js';
const today='2026-10-20',user={role:'user',permissions:['money','tasks']};
const data={tasks:[
 {title:'Late',due:'2026-10-19',priority:'high'},
 {title:'Today',due:today,priority:'medium'},
 {title:'Soon',due:'2026-10-26',priority:'low'},
 {title:'Later',due:'2026-10-27',priority:'high'},
 {title:'Finished',due:'2026-10-19',completed:true,completed_on:today},
 {title:'Cancelled',due:'2026-10-18',cancelled:true}],
 entries:[{title:'Lunch',type:'expense',amount:15,currency:'USD',date:today},
 {title:'Bus',type:'expense',amount:100000,currency:'LBP',date:today},
 {title:'Reversed',type:'expense',amount:999,currency:'USD',date:today,voided_on:today},
 {title:'Future',type:'expense',amount:999,currency:'USD',date:'2026-10-21'},
 {title:'Old',type:'expense',amount:999,currency:'USD',date:'2026-09-20'}],
 subscriptions:[{title:'Due',active:true,amount:10,renewal:'2026-10-26'},
 {title:'Paused',active:false,amount:10,renewal:today},
 {title:'Distant',active:true,amount:10,renewal:'2026-10-27'}]};
const ask=(q,u=user)=>localCompanion(data,u,q,today,{start:today,end:today});
test('everyday task queries use due dates, completion dates and exclude cancelled tasks',()=>{
 for(const q of ['What is my next task?','Show overdue tasks']){const r=ask(q);assert.match(r.answer,/Late/);assert.doesNotMatch(r.answer,/Finished|Cancelled|Later/);assert.equal(r.action,undefined);}
 assert.match(ask('What have I completed today?').answer,/Finished/);
 const upcoming=ask('Upcoming tasks').answer;assert.match(upcoming,/Today/);assert.match(upcoming,/Soon/);assert.doesNotMatch(upcoming,/Late\b|Later|Cancelled/);
});
test('largest expenses preserve native currencies and exclude future, reversed and old entries',()=>{
 const r=ask('Largest expense this month');assert.match(r.answer,/Lunch/);assert.match(r.answer,/Bus/);assert.match(r.answer,/100,000/);assert.doesNotMatch(r.answer,/Reversed|Future|Old/);
 const recent=ask('Recent expenses').answer;assert.match(recent,/Lunch/);assert.doesNotMatch(recent,/Reversed|Future/);
 assert.match(ask('Which subscriptions are due?').answer,/Due/);assert.doesNotMatch(ask('Which subscriptions are due?').answer,/Paused|Distant/);
});
test('examples and answers respect account permissions',()=>{
 const tasksOnly={role:'user',permissions:['tasks']};
 const help=ask('What can I ask?',tasksOnly).answer;assert.match(help,/next task/);assert.doesNotMatch(help,/expenses|subscriptions/);
 assert.match(ask('Recent expenses',tasksOnly).answer,/does not have Money access/);
 assert.match(ask('Upcoming tasks',{role:'user',permissions:['money']}).answer,/does not have Tasks access/);
});
test('Lebanese questions and visible suggestions reach the new answers',()=>{
 const pairs=[['شو المهام المتأخرة؟','Late'],['شو اعمل هلق؟','Late'],['شو خلصت اليوم؟','Finished'],['مهامي الجاي','Soon'],['آخر المصاريف','Lunch'],['أكبر مصروف هالشهر','Bus'],['شو الاشتراكات المستحقة؟','Due']];
 for(const [q,name] of pairs){assert.match(ask(q).answer,new RegExp(name));assert.match(ask(q).answer,/[\u0600-\u06ff]/);}
 assert.match(ask('شو فيني اسأل؟').answer,/فيك تسالني/);
 assert.equal(ask('ضيف مصروف').context.draft.type,'expense');
});
