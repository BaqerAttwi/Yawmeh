import test from 'node:test';
import assert from 'node:assert/strict';
import {balances,checkEntry,nextRenewal,periodSummary,today,daysUntil,taskCategorySummary} from '../../shared/domain.js';
test('income allocation, spending and savings transfers balance in integer cents',()=>{
 const entries=[{type:'income',amount:700,saved:300},{type:'opening',amount:200},{type:'expense',amount:40.1},{type:'withdrawal',amount:50,note:'Emergency repair'}];
 assert.deepEqual(balances(entries),{available:40990,savings:45000});
});
test('overspending, over-allocation and unexplained withdrawals are rejected',()=>{
 assert.throws(()=>checkEntry({type:'income',amount:100,saved:101},[]),/allocation/);
 assert.throws(()=>checkEntry({type:'withdrawal',amount:1,note:'   '},[]),/explain/);
 assert.throws(()=>checkEntry({type:'withdrawal',amount:1,note:'Repair'},[]),/exceeds/);
 assert.throws(()=>checkEntry({type:'expense',amount:.01},[]),/Insufficient/);
});
test('monthly and yearly renewals clamp at month ends, including leap years',()=>{
 assert.equal(nextRenewal('2026-01-31','monthly'),'2026-02-28');
 assert.equal(nextRenewal('2024-01-31','monthly'),'2024-02-29');
 assert.equal(nextRenewal('2024-02-29','yearly'),'2025-02-28');
 assert.equal(nextRenewal('2026-12-29','weekly'),'2027-01-05');
});
test('period summaries include boundaries and do not count transfers as expenses',()=>{
 const data={entries:[{type:'income',amount:700,saved:300,date:'2026-10-01'},{type:'expense',amount:80,date:'2026-10-31'},{type:'expense',amount:60,date:'2026-11-01'},{type:'withdrawal',amount:25,date:'2026-10-02'}],tasks:[{due:'2026-10-31',completed:1},{due:'2026-11-01',completed:0}]};
 const result=periodSummary(data,'2026-10-01','2026-10-31');assert.equal(result.spent,8000);assert.equal(result.withdrawn,2500);assert.equal(result.saved,30000);assert.equal(result.completed,1);assert.equal(result.tasks.length,1);
});
test('timezone dates use the configured local day',()=>{assert.equal(today('Asia/Beirut',new Date('2026-09-30T22:30:00Z')),'2026-10-01');assert.equal(daysUntil('2026-10-04','2026-10-01'),3);});
test('category summaries count completed and pending tasks including custom and legacy categories',()=>{
 const rows=taskCategorySummary([{category:'Work',completed:1},{category:'Work',completed:0},{category:' Side project ',completed:true},{completed:false},{category:'__proto__',completed:0}]);
 assert.deepEqual(rows.find(r=>r.category==='Work'),{category:'Work',total:2,completed:1,pending:1,percent:50});
 assert.equal(rows.find(r=>r.category==='Side project').percent,100);
 assert.equal(rows.find(r=>r.category==='Personal').pending,1);
 assert.equal(rows.find(r=>r.category==='__proto__').total,1);
 assert.deepEqual(taskCategorySummary([]),[]);
});
test('date-filtered summaries exclude categories outside the selected period',()=>{
 const result=periodSummary({entries:[],tasks:[{category:'Work',due:'2026-10-01',completed:1},{category:'Work',due:'2026-10-31',completed:0},{category:'Health',due:'2026-11-01',completed:1}]},'2026-10-01','2026-10-31');
 assert.deepEqual(result.taskCategories,[{category:'Work',total:2,completed:1,pending:1,percent:50}]);
});
