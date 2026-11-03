import test from 'node:test';
import assert from 'node:assert/strict';
import {companionLanguage,draftFields,presentReply,replyMetrics} from '../../shared/companion-presentation.js';
import {localCompanion} from '../../shared/local-companion.js';
import {normalizeLebanese} from '../../shared/lebanese-companion.js';
import {formText} from '../../shared/companion-form-language.js';

const user={role:'admin'},date='2026-10-15',range={start:date,end:date};
const data={settings:{home_currency:'USD'},entries:[{type:'income',amount:100,saved:20,date}],tasks:[{title:'English at home',due:date,completed:false}],subscriptions:[]};

test('language follows explicit preference or Arabic/Arabizi input in automatic mode',()=>{
 assert.equal(companionLanguage('en','مرحبا'),'en');
 assert.equal(companionLanguage('ar','hello'),'ar');
 assert.equal(companionLanguage('auto','مرحبا'),'ar');
 assert.equal(companionLanguage('auto','sarfet 15 dollar'),'ar');
 assert.equal(companionLanguage('auto','plan my day','ar'),'en');
 assert.equal(companionLanguage('auto','','ar'),'ar');
 assert.equal(companionLanguage('auto','15.50','ar'),'ar');
 for(const question of ['baddi a3ref masare','kifak','ana 3ande task','zakerni bokra','hello شو عندي اليوم','ﷲ شو عندي'])assert.equal(companionLanguage('auto',question),'ar',question);
 for(const question of ['okay','thanks','15 USD'])assert.equal(companionLanguage('auto',question,'ar'),'ar');
 assert.equal(companionLanguage('auto','show my expenses','ar'),'en');
});

test('localized report preserves amounts, dates, user titles, and permission boundaries',()=>{
 const report=localCompanion(data,user,'report today',date,range);
 const localized=presentReply(report,'ar');
 assert.match(localized.answer,/تقرير من 2026-10-15/);
 assert.match(localized.answer,/المدخرات/);
 assert.match(localized.answer,/English at home/);
 assert.deepEqual(localized.answer.match(/\$[\d,]+\.\d{2}/g),report.answer.match(/\$[\d,]+\.\d{2}/g));
 const restricted=presentReply(localCompanion(data,{role:'user',permissions:['tasks']},'report today',date,range),'ar');
 assert.doesNotMatch(restricted.answer,/\$|المدخرات|الدخل/);
 assert.match(restricted.answer,/English at home/);
});

test('draft presentation keeps original values and does not invent a task currency',()=>{
 const result=localCompanion(data,user,'add task called football at 9 pm tomorrow',date,range);
 const localized=presentReply(result,'ar');
 assert.deepEqual(localized.action,result.action);
 assert.deepEqual(draftFields(localized.action,'en'),[['Name','football'],['Date','2026-10-16'],['Time','21:00']]);
 assert.match(localized.answer,/ما انحفظ شي/);
 assert.match(presentReply({...result,answer:'حضرتلك مسودة'},'en').answer,/Your draft is ready/);
 assert.deepEqual(draftFields({type:'expense',initial:{title:'Lunch',amount:15,currency:'LBP',date}},'en'),[['Name','Lunch'],['Amount','15 LBP'],['Date',date]]);
});

test('unsupported English details and validation feedback remain available in Arabic mode',()=>{
 const answer='Unrecognized request: keep these exact details.';
 assert.equal(presentReply({answer},'ar').hasEnglishDetails,true);
 assert.equal(presentReply({answer},'ar').answer,answer);
 const result=presentReply({answer:'Choose one configured currency: USD, EUR. Nothing was saved.',context:{field:'currency'}},'ar');
 assert.match(result.answer,/USD, EUR/);
 assert.match(result.answer,/ما انحفظ شي/);
 assert.equal(presentReply({answer:'No active subscriptions recorded.'},'ar').answer,'ما في اشتراكات مفعّلة مسجّلة.');
});

test('report cards preserve exact formatted values, context date, and negative balances',()=>{
 const line='Savings balance as of 2026-10-15: €1,234.56. Available to spend: -€80.50.';
 const card=replyMetrics(line);
 assert.deepEqual(card,{caption:'As of 2026-10-15',items:[['Savings','€1,234.56'],['Available to spend','-€80.50']]});
 const ar=presentReply({answer:line},'ar');
 assert.deepEqual(replyMetrics(ar.answer,'ar').items.map(x=>x[1]),card.items.map(x=>x[1]));
 assert.equal(replyMetrics('Custom text $500 and unrelated dates'),null);
});

test('Arabic detailed replies retain titles, dates, currency amounts, and every qualification',()=>{
 const rich={...data,entries:[...data.entries,{type:'expense',title:'Lunch',amount:10,currency:'USD',date,category:'Custom spending'}],tasks:[{title:'Quick custom task',due:date,estimate_minutes:10,priority:'high',completed:false}],budgets:[{title:'Custom budget',amount:80,start:'2026-10-01',end:'2026-10-31'}],goals:[{id:1,title:'Custom goal',target_amount:120,monthly_amount:10}],goal_moves:[],subscriptions:[{title:'Custom subscription',amount:10,cycle:'monthly',renewal:date,active:true,rarely_used:true}]};
 for(const question of ['Budget status','Review subscriptions','Savings goals','How can I save more?','Can I afford $15?','Can I afford 100 LBP?','Compare spending this month','I have 15 minutes','Plan my day']){
  const source=localCompanion(rich,user,question,date,range),translated=presentReply(source,'ar');
  assert.equal(translated.hasEnglishDetails,false,question+': '+translated.answer);
  assert.deepEqual(translated.answer.match(/\$[\d,]+\.\d{2}/g),source.answer.match(/\$[\d,]+\.\d{2}/g),question);
  for(const name of ['Custom spending','Quick custom task','Custom budget','Custom goal','Custom subscription'])if(source.answer.includes(name))assert.ok(translated.answer.includes(name),name);
 }
 assert.equal(normalizeLebanese('فيني اصرف 100 دولار؟').question,'Can I afford 100 USD?');
 assert.match(normalizeLebanese('فيني اصرف 100').answer,/العملة/);
 assert.equal(normalizeLebanese('عندي ١٥ دقيقة').question,'I have 15 minutes');
 assert.equal(formText('Due date','ar'),'موعد المهمة');assert.equal(formText('Amount (LBP)','ar'),'المبلغ (LBP)');
});
