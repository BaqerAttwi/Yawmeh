import test from 'node:test';
import assert from 'node:assert/strict';
import {localCompanion} from '../../shared/local-companion.js';
const user={role:'user',permissions:['money','tasks']},date='2026-10-05';
const data={entries:[{type:'income',amount:700,saved:300,date},{type:'expense',amount:50,category:'Food',date}],budgets:[{title:'October',amount:100,start:'2026-10-01',end:'2026-10-31'}],tasks:[{title:'Finish work',due:date,estimate_minutes:30,priority:'high',completed:false}],goals:[],subscriptions:[]};
const ask=(q,u=user,ctx=null)=>localCompanion(data,u,q,date,{start:date,end:date},ctx);

test('everyday money phrasings preserve the title, amount and date',()=>{
 for(const [question,title,amount,currency,recordedDate] of [
  ['I spend 15$ on Lunch','Lunch',15,'USD',date],
  ['Spent $12.50, coffee','coffee',12.5,'USD',date],
  ['I just paid $30 for gas yesterday','gas',30,'USD','2026-10-04'],
  ['Yesterday, I spent $10 on parking','parking',10,'USD','2026-10-04'],
  ['I was charged $12 for delivery','delivery',12,'USD',date],
  ['I bought an iPhone 16 for $400','an iPhone 16',400,'USD',date],
  ['I spent one hundred twenty-five bucks on groceries','groceries',125,'USD',date],
  ['I paid for parking $5','parking',5,'USD',date],
  ['Lunch $9','Lunch',9,'USD',date],
  ['Lunch $9.','Lunch',9,'USD',date],
  ['$8 coffee','coffee',8,'USD',date],
  ['I spend 15$ on قهوة','قهوة',15,'USD',date],
  ['اشتريت قهوة ب ٥ دولار','قهوة',5,'USD',date],
  ['ana sraft 150,000 LBP 3al taxi','taxi',150000,'LBP',date],
 ]){
  const result=ask(question);
  assert.equal(result.action?.type,'expense',question);
  assert.deepEqual(result.action.initial,{title,amount,currency,date:recordedDate},question);
 }
 const income=ask('I got paid $250 from Freelance');
 assert.deepEqual(income.action,{type:'income',initial:{title:'Freelance',amount:250,currency:'USD',date}});
 assert.equal(ask('Set a reminder to call Mom tomorrow at 7 pm').action.initial.scheduled_time,'19:00');
});

test('incomplete and ambiguous requests keep people in a safe draft flow',()=>{
 for(const phrase of ['I spend','I spent','I spend it','صرفت','sarfet']){
  const pending=ask(phrase);
  assert.equal(pending.context?.draft?.type,'expense',phrase);
  assert.equal(pending.context?.field,'title',phrase);
  assert.equal(ask('Lunch $15',user,pending.context).action.initial.amount,15);
  const priced=ask('15$',user,pending.context);
  assert.equal(priced.context.field,'title');
  assert.equal(ask('Lunch',user,priced.context).action.initial.amount,15);
 }
 const incompleteTask=ask('add task');
 assert.equal(ask('I spend',user,incompleteTask.context).context.draft.type,'expense');
 const yesterday=ask('I spent yesterday');
 assert.equal(ask('Lunch $15',user,yesterday.context).action.initial.date,'2026-10-04');
 const phone=ask('I bought iPhone 16');
 assert.equal(phone.context.field,'amount');
 assert.equal(phone.context.draft.initial.title,'iPhone 16');
 assert.equal(ask('twenty dollars.',user,phone.context).action.initial.amount,20);
 for(const question of ['I spent $12 on lunch and $4 on coffee','I spend 15 on coffee and $20 on lunch','I spend 12 and 4 on lunch','I spend $20 every week','I received a $20 refund','Paid back $30','Did I pay $30 for gas?','Lent Karim $40']){
  const result=ask(question);
  assert.equal(result.action,undefined,question);
  assert.equal(result.context?.draft,undefined,question);
 }
 assert.match(ask('I spend 15$ on Lunch',{role:'user',permissions:['tasks']}).answer,/Money access/);
});

test('a specific spending question totals matched expenses in their original currencies',()=>{
 const entries=[
  {type:'expense',title:'Coffee at work',date,amount:4},
  {type:'expense',title:'Cafe',category:'Coffee',date,amount:150000,currency:'LBP'},
  {type:'expense',title:'Bus',date,amount:10},
  {type:'expense',title:'Coffee',date,amount:99,voided_on:date},
 ];
 const question='How much did I spend on coffee this week?';
 const result=localCompanion({...data,entries},user,question,date,{start:date,end:date});
 assert.match(result.answer,/coffee.*2026-10-05 through 2026-10-11.*\$4\.00.*150,000/);
 assert.doesNotMatch(result.answer,/\$10\.00|\$99\.00/);
 assert.equal(result.action,undefined);
 assert.match(ask(question,{role:'user',permissions:['tasks']}).answer,/Money access/);
});

test('currency symbols resolve in initial messages, amount replies and corrections',()=>{
 const settings={last_currency:'LBP',custom_currencies:[
  {code:'Euro',name:'Euro',symbol:'€',rate:0.9},
  {code:'Canadian Dollar',name:'Canadian Dollar',symbol:'$',rate:1.4},
  {code:'UK Pound',name:'UK Pound',symbol:'£',rate:0.8},
  {code:'Egyptian Pound',name:'Egyptian Pound',symbol:'£',rate:50},
  {code:'UAE Dirham',name:'UAE Dirham',symbol:'د.إ',rate:3.67},
 ]};
 const chat=(q,context=null,account=user)=>localCompanion({...data,settings},account,q,date,{start:date,end:date},context);
 for(const question of ['add 100$','add $100','ضيف ١٠٠$']){
  const first=chat(question);
  assert.deepEqual(first.context.transaction,{amount:100,currency:'USD'});
  const expense=chat('Expense',first.context);
  assert.equal(expense.context.field,'title');
  assert.equal(chat('Lunch',expense.context).action.initial.currency,'USD');
 }
 for(const [question,currency] of [
  ['add expense 100$ for Lunch','USD'],
  ['add expense €100 for Lunch','Euro'],
  ['add expense 100€ for Lunch','Euro'],
  ['add expense 100د.إ for Lunch','UAE Dirham'],
  ['صرفت ١٠٠د.إ على الغدا','UAE Dirham'],
  ['add expense 100 Canadian Dollar for Lunch','Canadian Dollar'],
 ]){
  const result=chat(question);
  assert.equal(result.action?.initial.currency,currency,question);
  assert.equal(result.action?.initial.amount,100,question);
 }
 const awaitingAmount=chat('add expense for Lunch');
 const priced=chat('100€',awaitingAmount.context);
 assert.equal(priced.action.initial.currency,'Euro');
 assert.equal(chat('change the amount to 25$',priced.context).action.initial.currency,'USD');
 for(const value of ['100£','100¥','$100€','100 EUR','EUR 100']){
  const result=chat('add expense '+value+' for Lunch');
  assert.match(result.answer,/Choose one configured currency/,value);
  assert.equal(result.action,undefined);
  assert.equal(chat('USD',result.context).action.initial.title,'Lunch');
 }
 assert.equal(chat('add 100$',null,{role:'user',permissions:['tasks']}).context,undefined);
});

test('spoken expense requests prepare drafts instead of reports',()=>{
 for(const q of ['Can you add expenses?','Can you help me in adding more expenses?','Could you please add expense 15 for lunch?']){
  const result=ask(q);
  assert.equal((result.action||result.context?.draft)?.type,'expense');
  assert.doesNotMatch(result.answer,/^Report:/);
 }
 const pending=ask('Can you add expenses?');
 const named=ask('Lunch',user,pending.context);
 const ready=ask('15',user,named.context);
 assert.equal(ready.action.initial.amount,15);
 assert.equal(ready.action.initial.title,'Lunch');
 assert.equal(ready.action.initial.currency,'USD');
 assert.equal(ask('Can you add expenses?',{role:'user',permissions:['tasks']}).context,undefined);
 assert.match(ask('Can you add expenses?',{role:'user',permissions:['tasks']}).answer,/does not have Money access/);
});

test('voice checks preserve pending drafts and spoken planning remains supported',()=>{
 const pending=ask('add expense');
 for(const q of ['Osage, can you hear me?','So can you hear me right now?']){
  const result=ask(q,user,pending.context);
  assert.match(result.answer,/reached me as text/);
  assert.deepEqual(result.context,pending.context);
 }
 assert.match(ask('Oh thanks. Can you plan my day?').answer,/Suggested priorities/);
 assert.equal(ask('No, what I meant is adding.',user,{topic:'money'}).context.draft.type,'expense');
 assert.match(ask('Expenses today').answer,/Report:/);
});
test('a new request interrupts an incomplete draft without becoming its title',()=>{
 const pending=ask('add expense');
 assert.match(ask('Budget status',user,pending.context).answer,/October/);
 assert.equal(ask('add task read',user,pending.context).action.initial.title,'read');
});
test('reports handle tomorrow, next month and explicit ranges without replacing dates',()=>{
 assert.match(ask('Plans tomorrow').answer,/2026-10-06 through 2026-10-06/);
 assert.match(ask('Report next month').answer,/2026-11-01 through 2026-11-30/);
 assert.match(ask('Weekly report for 2026-10-01 to 2026-10-03').answer,/2026-10-01 through 2026-10-03/);
});
test('ready drafts accept corrections and unrelated questions leave draft mode',()=>{
 const original=ask('add task football');const changed=ask('change that to tomorrow',user,original.context);assert.equal(changed.action.initial.due,'2026-10-06');assert.equal(original.action.initial.due,date);
 const expense=ask('I spent 15 for lunch');assert.equal(ask('change the amount to 25',user,expense.context).action.initial.amount,25);
 assert.match(ask('Budget status',user,expense.context).answer,/October/);
 assert.equal(ask('cancel',user,expense.context).context,undefined);
});
test('budget warnings and matching-period comparisons exclude reversed and future entries',()=>{
 const sample={...data,entries:[...data.entries,{type:'expense',amount:35,category:'Food',date},{type:'expense',amount:20,category:'Food',date:'2026-09-05'},{type:'expense',amount:999,date,voided_on:date},{type:'expense',amount:999,date:'2026-10-06'}]};
 const run=q=>localCompanion(sample,user,q,date,{start:date,end:date});assert.match(run('Budget status').answer,/85%/);assert.match(run('Budget status').answer,/80% used/);assert.match(run('Compare spending this month').answer,/\$85.00.*versus.*\$20.00/);
 assert.match(ask('I have 15 minutes').answer,/No unfinished tasks/);assert.match(ask('I have 30 minutes').answer,/Finish work/);
});
test('affordability distinguishes available funds from remaining budget',()=>{const a=ask('Can I afford $100?').answer;assert.match(a,/\$350.00/);assert.match(a,/exceed that budget by .*\$50.00/);});
test('draft followups collect missing title and amount without writing records',()=>{let r=ask('add expense');assert.equal(r.context.field,'title');r=ask('lunch',user,r.context);assert.equal(r.context.field,'amount');assert.equal(ask('-4',user,r.context).context.field,'amount');r=ask('15.50',user,r.context);assert.equal(r.action.initial.amount,15.5);assert.equal(r.action.initial.title,'lunch');assert.equal(data.entries.length,2);});
test('conversational aliases and report followups work',()=>{assert.equal(ask('I spent 15 for lunch').action.type,'expense');assert.match(ask('Plan my day').answer,/30 estimated minutes/);const r=ask('My savings');assert.match(ask('and this week',user,r.context).answer,/Savings balance/);});
test('private records stay protected across advice and followups',()=>{const limited={role:'user',permissions:['tasks']};for(const q of ['Can I afford 100?','Savings goals','Review subscriptions','How can I save more?'])assert.match(ask(q,limited).answer,/does not have Money access/);assert.match(ask('lunch',limited,ask('add expense').context).answer,/access changed/);});
