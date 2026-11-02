// Keep one failing recipient from blocking everyone else's reminders.
export async function deliverReminderJobs({db,transport,from,to,jobs,onFailure}){
 const result={sent:0,failed:0,skipped:0};
 for(const job of jobs){
  try {
   const [existing]=await db.query('SELECT id FROM reminder_log WHERE reminder_key=?',[job.key]);if(existing.length){result.skipped++;continue;}
   await transport.sendMail({from,to,subject:job.subject,text:job.text});
   await db.query('INSERT INTO reminder_log(reminder_key) VALUES(?)',[job.key]);result.sent++;
  }catch(error){result.failed++;onFailure?.(error);}
 }
 return result;
}
