import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {buildReportEmail,pendingReportEmails,scheduledReportPeriods} from '../../server/src/modules/reminders/report-email.js';
import {deliverReminderJobs} from '../../server/src/modules/reminders/delivery.js';

const weekly={kind:'weekly',start:'2026-10-25',end:'2026-10-31'};
const monthly={kind:'monthly',start:'2026-10-01',end:'2026-10-31'};
const user={id:1,permissions:['money','tasks'],report_emails:true,reminder_email:'private@test.local'};
const data={
  settings:{name:'<Yawmeh Tester>'},
  entries:[
    {title:'Income',type:'income',date:'2026-10-25',amount:80,saved:25,currency:'USD'},
    {title:'<script>alert(1)</script>',type:'expense',date:'2026-10-31',amount:20,currency:'USD',category:'Food',voided_on:'2026-11-01'},
    {title:'Outside the period',type:'expense',date:'2026-11-01',amount:30,currency:'USD'},
  ],
  tasks:[{title:'Private task',due:'2026-10-27',completed:true,completed_on:'2026-10-29'}],
};

test('weekly and monthly email schedules cover closed periods and retry only through the next day',()=>{
  assert.deepEqual(scheduledReportPeriods('2026-11-01',8),[]);
  assert.deepEqual(scheduledReportPeriods('2026-11-01',9),[weekly,monthly]);
  assert.deepEqual(scheduledReportPeriods('2026-11-02',0),[weekly,monthly]);
  assert.deepEqual(scheduledReportPeriods('2026-11-03',9),[]);
  assert.deepEqual(scheduledReportPeriods('2027-01-01',9),[{kind:'monthly',start:'2026-12-01',end:'2026-12-31'}]);
  const pending=pendingReportEmails([user,{...user,id:2,permissions:['tasks']},{...user,id:3,report_emails:false}], [weekly,monthly]);
  assert.deepEqual(pending.map(job=>job.key),['report:1:weekly:2026-10-31','report:1:monthly:2026-10-31','report:2:monthly:2026-10-31']);
});

test('Yawmeh mails a private summary and an escaped full report without crossing app permissions',async()=>{
  const job=buildReportEmail({user,period:weekly,key:'report:1:weekly:2026-10-31',data,from:'Reminders <sender@test.local>'});
  assert.deepEqual(job.from,{name:'Yawmeh',address:'sender@test.local'});
  assert.match(job.text,/Expenses \$20\.00/);
  assert.match(job.text,/You set aside \$25\.00/);
  assert.match(job.text,/One goal for next week/);
  assert.match(job.html,/cid:yawmeh-avatar/);
  assert.ok(existsSync(job.attachments[0].path));
  const fullReport=job.attachments[1].content;
  assert.match(fullReport,/&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(fullReport,/<script>|Private task|Outside the period/);
  const month=buildReportEmail({user:{...user,permissions:['tasks']},period:monthly,data,from:'sender@test.local'});
  assert.match(month.attachments[1].content,/Private task/);
  assert.doesNotMatch(month.attachments[1].content,/Transaction register|Largest spending/);
  const logged=new Set(),sent=[];
  const db={async query(sql,[key]){
    if(sql.startsWith('SELECT'))return [logged.has(key)?[{id:1}]:[]];
    logged.add(key);return [{}];
  }};
  const delivery={db,transport:{async sendMail(message){sent.push(message);}},to:user.reminder_email,jobs:[job]};
  await deliverReminderJobs(delivery);
  await deliverReminderJobs(delivery);
  assert.equal(sent.length,1);
  assert.equal(sent[0].to,'private@test.local');
  assert.equal(sent[0].attachments.length,2);
});
