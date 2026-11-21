import test from 'node:test';
import assert from 'node:assert/strict';
import {buildWorkspaceReport,reportPreset,reportsFor,workspaceReportCsv,workspaceOverview} from '../../shared/workspace-reports.js';

const admin={role:'admin'};
const money={role:'user',permissions:['money']};
const tasks={role:'user',permissions:['tasks']};
const range={start:'2026-11-01',end:'2026-11-30',current:'2026-11-19'};
const data={
 entries:[
  {date:'2026-10-15',type:'income',title:'Salary',currency:'USD',amount:200,saved:20},
  {date:'2026-11-01',type:'income',title:'Salary',currency:'USD',amount:250,saved:30},
  {date:'2026-11-02',type:'expense',title:'Taxi',category:'Transport',currency:'LBP',amount:900000,exchange_rate:90000},
  {date:'2026-11-03',type:'withdrawal',currency:'USD',amount:10},
  {date:'2026-11-04',type:'opening',currency:'USD',amount:25},
  {date:'2026-11-06',type:'expense',title:'Reversed',currency:'USD',amount:90,voided_on:'2026-11-10',void_reason:'Duplicate'},
  {date:'2026-11-25',type:'income',title:'Future',currency:'USD',amount:300},
 ],
 budgets:[{title:'November',start:range.start,end:range.end,amount:50}],
 goals:[{id:1,title:'Laptop',target_amount:100,monthly_amount:15}],
 goal_moves:[{goal_id:1,date:'2026-11-04',kind:'fund',amount:20},{goal_id:1,date:'2026-11-22',kind:'fund',amount:40}],
 subscriptions:[{id:1,title:'Music',active:true,amount:12,cycle:'monthly',renewal:'2026-11-20'}],
 tasks:[
  {id:1,title:'Started earlier',category:'Work',due:'2026-10-31',completed:true,completed_on:'2026-11-01',priority:'high'},
  {id:2,title:'Overdue',category:'Work',due:'2026-11-03',estimate_minutes:30,priority:'high'},
 ],
 cancelled_tasks:[{id:3,title:'Cancelled',due:'2026-11-04',priority:'low',cancelled:true}],
};
const build=(id,user=admin,filters={})=>buildWorkspaceReport(id,data,user,{...range,...filters});

test('basic overviews use saved activity and respect separate Money and Tasks access',()=>{
 assert.deepEqual(workspaceOverview('money',data,money,range),{income:25000,expenses:1000,net:24000,hasActivity:true});
 assert.deepEqual(workspaceOverview('tasks',data,tasks,range),{completed:1,open:1,overdue:1,hasActivity:true});
 assert.equal(workspaceOverview('money',data,tasks,range),null);
 assert.equal(workspaceOverview('tasks',data,money,range),null);
});

test('money reports use saved rates, keep native balances and separate savings transfers',()=>{
 assert.deepEqual(build('cash-flow').rows,[['2026-11',25000,1000,24000,3000,1000,2500,22000]]);
 assert.deepEqual(build('comparison').rows[0],['Income',25000,20000,5000]);
 assert.deepEqual(build('balances').rows,[['LBP',-90000000,0,-90000000],['USD',41000,6500,47500]]);
 assert.deepEqual(build('expenses').rows,[['Transport',1,1000]]);
 assert.deepEqual(build('budgets').rows[0].slice(3),[5000,1000,4000,'20%']);
 assert.deepEqual(build('reversals').rows[0],['2026-11-10','2026-11-06','Reversed','Expense','USD',9000,'Duplicate']);
 assert.deepEqual(build('goals').rows[0].slice(2,6),[10000,2000,8000,1500]);
 assert.deepEqual(build('renewals').rows,[['2026-11-20','Music','Next recorded renewal',1200]]);
});

test('task reports scope records by completion or due date and gate catalog and results by access',()=>{
 assert.deepEqual(build('task-categories',tasks).rows,[['Work',1,0,1,1]]);
 assert.deepEqual(build('completions',tasks).rows,[['2026-11-01','Started earlier','Work','2026-10-31','Late']]);
 assert.equal(build('tasks',tasks).rows[1][4],'Cancelled');
 assert.equal(build('comparison',tasks),null);
 assert.equal(build('workload',money),null);
 assert.ok(reportsFor(tasks).every(report=>report.area==='tasks'));
 assert.ok(reportsFor(money).every(report=>report.area==='money'));
 for(const report of reportsFor(admin))assert.ok(build(report.id)?.columns.length,report.title);
});

test('period presets handle month boundaries and CSV guards formulas without breaking negative numbers',()=>{
 assert.deepEqual(reportPreset('last-month','2024-03-04'),{start:'2024-02-01',end:'2024-02-29'});
 assert.deepEqual(reportPreset('quarter','2026-11-19'),{start:'2026-10-01',end:'2026-11-19'});
 assert.equal(build('cash-flow',admin,{start:'2026-11-31'}),null);
 assert.match(workspaceReportCsv(build('balances')),/"LBP",-900000,0,-900000/);
 assert.match(workspaceReportCsv({columns:[{label:'Text'}],rows:[['＝1+1']]}),/"'＝1\+1"/);
 assert.equal(workspaceReportCsv({columns:[{label:'Title'},{label:'USD',currency:'USD'}],rows:[[' =1+1',-1250],['a,"b"',NaN]]}),
  '"Title","USD (USD)"\r\n"\' =1+1",-12.5\r\n"a,""b""",');
});
