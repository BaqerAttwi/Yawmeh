import React from 'react';

export function WorkspaceLoading(){
 return <div className="workspace-loading" role="status" aria-live="polite">
  <div className="workspace-loading-heading">
   <img src="/branding/yawmeh-logo-small.webp" width="48" height="48" alt=""/>
   <div><strong>yawmeh.me</strong><p>Opening your workspace…</p></div>
  </div>
  <div className="workspace-skeleton" aria-hidden="true">
   <div className="workspace-skeleton-card"><span/><span/><span/></div>
   <div className="workspace-skeleton-grid">
    <div className="workspace-skeleton-card"><span/><span/></div>
    <div className="workspace-skeleton-card"><span/><span/></div>
   </div>
  </div>
 </div>;
}
