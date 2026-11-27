import React from 'react';

export function WorkspaceSkeleton(){
 return <div className="workspace-skeleton" aria-hidden="true">
  <div className="workspace-skeleton-card"><span/><span/><span/></div>
  <div className="workspace-skeleton-grid">
   <div className="workspace-skeleton-card"><span/><span/></div>
   <div className="workspace-skeleton-card"><span/><span/></div>
  </div>
 </div>;
}

export function WorkspaceLoading(){
 return <div className="workspace-loading" role="status" aria-live="polite">
  <div className="workspace-loading-heading">
   <img src="/branding/yawmeh-logo-192.webp" width="48" height="48" alt="" decoding="async"/>
   <div><strong>yawmeh.me</strong><p>Opening your workspace…</p></div>
  </div>
  <WorkspaceSkeleton/>
 </div>;
}
