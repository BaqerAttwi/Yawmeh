import React from 'react';

export function WorkspaceLoading(){
 return <div className="auth-loading workspace-loading" role="status" aria-live="polite"><img src="/branding/yawmeh-logo-small.png" width="88" height="88" alt=""/><strong>yawmeh.me</strong><p>Your everyday, a little clearer.</p><span className="workspace-loading-progress" aria-hidden="true"/><small>Opening your workspace…</small></div>;
}
