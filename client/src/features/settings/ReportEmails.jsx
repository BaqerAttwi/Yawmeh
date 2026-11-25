import React from 'react';

export function ReportEmails({settings,money,tasks,emailConfigured,busy,onChange}){
  const enabled=!!settings.report_emails;
  return <section className="card everyday-card" aria-label="Report emails">
    <h3>Report emails from Yawmeh</h3>
    <p>{money?'Full money report every Sunday. ':''}{tasks&&money?'Money and Tasks recap':tasks?'Tasks recap':'Money recap'} on the first of each month.</p>
    {settings.email?<p>Send to <strong>{settings.email}</strong>. Full reports contain private workspace details.</p>:<p>Save a reminder email address in your preferences to receive reports.</p>}
    {!emailConfigured&&<p>Email delivery needs to be configured on the server.</p>}
    <button type="button" className={enabled?'secondary':'primary'} disabled={busy||(!enabled&&(!settings.email||!emailConfigured))} onClick={()=>onChange(!enabled)}>
      {enabled?'Turn off report emails':'Enable report emails'}
    </button>
    <p role="status">{enabled?'Report emails are on.':'Report emails are off.'}</p>
  </section>;
}
