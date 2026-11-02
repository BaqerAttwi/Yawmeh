import test from 'node:test';
import assert from 'node:assert/strict';
import {chatReport} from '../../shared/companion-chat.js';
const data={entries:[{type:'income',amount:700,saved:200,date:'2026-10-01'},{type:'expense',amount:20,date:'2026-10-04'}],tasks:[{title:'Study',due:'2026-10-05',completed:false}]};
const range={start:'2026-10-01',end:'2026-10-04'};
const answer=(q,user={role:'admin'})=>chatReport(data,user,q,'2026-10-04',range);
test('chat supports named periods, selected ranges and explicit ISO dates',()=>{
 assert.match(answer('Weekly report'),/2026-09-28 through 2026-10-04/);
 assert.match(answer('Monthly report'),/2026-10-01 through 2026-10-31/);
 assert.match(answer('report for selected dates'),/2026-10-01 through 2026-10-04/);
 assert.match(answer('plans 2026-10-05'),/Study/);
 assert.match(answer('report 2026-02-30'),/valid dates/);
 assert.match(answer('report 2026-10-04 to 2026-10-01'),/start first/);
});
test('chat respects access and reports savings as of the specified date',()=>{
 assert.match(answer('my savings'),/\$200.00/);
 assert.doesNotMatch(answer('report',{role:'user',permissions:['tasks']}),/\$200/);
 assert.match(answer('savings',{role:'user',permissions:['tasks']}),/does not have Money access/);
 assert.match(answer('savings 2026-09-30'),/Savings balance as of 2026-09-30: \$0.00/);
 assert.match(answer('write me a poem'),/I can report on your records/);
});
