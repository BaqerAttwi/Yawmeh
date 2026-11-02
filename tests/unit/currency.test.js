import test from 'node:test';
import assert from 'node:assert/strict';
import {entryCents,nativeEntries,formatMoney} from '../../shared/currency.js';
import {balances,checkEntry,periodSummary} from '../../shared/domain.js';
import {checkGoalMove,checkUnassignedWithdrawal,weeklyReview} from '../../shared/planner.js';
import {checkVoid,budgetAlerts} from '../../shared/insights.js';
import {entrySchema,exchangeRateSchema} from '../../shared/validation.js';
const entries=[
 {id:1,type:'income',amount:100,saved:20,currency:'USD',exchange_rate:90000,date:'2026-10-12'},
 {id:2,type:'income',amount:9000000,saved:1800000,currency:'LBP',exchange_rate:90000,date:'2026-10-12'},
 {id:3,type:'expense',amount:1000000,currency:'LBP',exchange_rate:100000,category:'Food',date:'2026-10-13'},
 {id:4,type:'expense',amount:10,currency:'USD',exchange_rate:95000,category:'Food',date:'2026-10-13'},
];
test('mixed totals use each record snapshot, retain native balances, and exclude reversals',()=>{
 assert.deepEqual(balances(entries),{available:14000,savings:4000});
 assert.deepEqual(balances(entries,'LBP'),{available:1245000000,savings:360000000});
 assert.deepEqual(balances(nativeEntries(entries,'USD')),{available:7000,savings:2000});
 assert.deepEqual(balances(nativeEntries(entries,'LBP'),'LBP'),{available:620000000,savings:180000000});
 assert.equal(balances([...entries,{...entries[3],voided_on:'2026-10-13'}]).available,14000);
});
test('reports, charts and budget comparisons convert purchases at their snapshots',()=>{
 const data={entries,tasks:[],budgets:[{amount:25,start:'2026-10-01',end:'2026-10-31'}]};
 assert.equal(periodSummary(data,'2026-10-13','2026-10-13').spent,2000);
 assert.equal(periodSummary(data,'2026-10-13','2026-10-13','LBP').spent,195000000);
 assert.equal(weeklyReview(data,'2026-10-13','LBP').spendingCategories[0].amount,195000000);
 assert.equal(budgetAlerts(data,'2026-10-13')[0].level,'warning');
});
test('legacy USD is preserved without inventing a historical exchange rate',()=>{
 assert.equal(entryCents({amount:25}),2500);
 assert.ok(Number.isNaN(entryCents({amount:25},'LBP')));
 assert.match(formatMoney(NaN,'LBP'),/Unavailable/);
 assert.equal(entryCents({amount:0},'LBP'),0);
});
test('spending, withdrawals and reversals cannot silently exchange currencies',()=>{
 assert.throws(()=>checkEntry({type:'expense',amount:71,currency:'USD'},entries),/Insufficient/);
 assert.throws(()=>checkEntry({type:'withdrawal',amount:21,currency:'USD',note:'Repair'},entries),/exceeds/);
 assert.doesNotThrow(()=>checkEntry({type:'expense',amount:1000000,currency:'LBP'},entries));
 assert.throws(()=>checkVoid(entries,[],2,'Wrong entry'),/already spent/);
 assert.throws(()=>checkGoalMove({id:1,target_amount:100},entries,[],{kind:'fund',amount:21}),/unassigned/);
 assert.doesNotThrow(()=>checkUnassignedWithdrawal({type:'withdrawal',amount:1000000,currency:'LBP'},entries,[{kind:'fund',amount:20}]));
});
test('currency names reject unsafe keys and invalid or overprecise rates',()=>{
 for(const rate of [0,-1,Infinity,NaN,1000001,0.0000001])assert.equal(exchangeRateSchema.safeParse(rate).success,false);
 assert.equal(exchangeRateSchema.parse('89500.125'),89500.125);
 assert.equal(entrySchema.safeParse({type:'income',title:'Pay',amount:10,date:'2026-10-13',currency:'__proto__'}).success,false);
});

import {currencyDefinition,currencyCatalog,captureRates,currencyLabel} from '../../shared/currency.js';
test('custom currencies accept a name, symbol, or both and resolve rates against USD or home',()=>{
 const settings={current_rate:90000,custom_currencies:[{code:'Euro',name:'Euro',symbol:'€',rate:.8}],home_currency:'Euro'};
 assert.deepEqual(currencyDefinition({name:'Pound',symbol:'£',rate:.9,reference:'Euro'},settings),{code:'Pound',name:'Pound',symbol:'£',rate:.72});
 assert.equal(currencyDefinition({symbol:'¥',rate:150},settings).code,'¥');
 assert.equal(currencyDefinition({name:'Credits',rate:2},settings).code,'Credits');
 assert.throws(()=>currencyDefinition({rate:1},settings));assert.throws(()=>currencyDefinition({name:'usd',rate:1},settings),/already exists/);
 assert.throws(()=>currencyDefinition({name:'Euro',rate:1},settings),/already exists/);
 assert.match(currencyLabel(settings.custom_currencies[0]),/Euro.*€/);
});
test('cross-currency snapshots never read changed current or home rates',()=>{
 const settings={current_rate:90000,custom_currencies:[{code:'Euro',name:'Euro',symbol:'€',rate:.8}]};
 const a=captureRates({currency:'Euro',type:'income',amount:80},settings);
 assert.equal(entryCents(a),10000);assert.equal(entryCents(a,'LBP'),900000000);
 settings.custom_currencies[0].rate=.9;settings.current_rate=100000;settings.home_currency='Euro';
 const b=captureRates({currency:'USD',type:'income',amount:100},settings);
 assert.equal(entryCents(a,'USD'),10000);assert.equal(entryCents(b,'Euro'),9000);
 assert.equal(balances([a,b],'Euro').available,17000);
 settings.custom_currencies.push({code:'Pound',rate:.7});assert.ok(Number.isNaN(entryCents(a,'Pound')));
 assert.match(formatMoney(8000,'Euro',currencyCatalog(settings)),/Euro.*€.*80.00/);
});
test('per-entry rates can use the home reference without altering currency defaults',()=>{
 const settings={current_rate:90000,custom_currencies:[{code:'Euro',rate:.8,name:'Euro',symbol:'€'}]};
 const entry=captureRates({currency:'LBP',amount:80000,unit_rate:100000,rate_reference:'Euro'},settings);
 assert.equal(entry.exchange_rate,80000);assert.equal(entryCents(entry,'USD'),100);assert.equal(entryCents(entry,'Euro'),80);assert.equal(settings.current_rate,90000);
 assert.throws(()=>captureRates({currency:'Unknown',amount:1},settings),/Add this currency/);
 assert.throws(()=>captureRates({currency:'USD',amount:1,unit_rate:2},settings),/must equal 1/);
});
test('reversing a custom-currency income cannot spend funds in another currency',()=>{
 const data=[{id:1,type:'income',currency:'Euro',amount:20},{id:2,type:'expense',currency:'Euro',amount:10},{id:3,type:'income',currency:'USD',amount:1000}];
 assert.throws(()=>checkVoid(data,[],1,'Correction'),/already spent/);
});
