import React,{lazy,Suspense} from 'react';
import './lib/install.js';
import {createRoot} from 'react-dom/client';
import './styles/styles.css';
import './styles/access.css';
import {AuthGate} from './features/auth/Auth.jsx';
import {WorkspaceLoading} from './features/auth/WorkspaceLoading.jsx';

let workspaceModule;
function loadWorkspace(){
 return workspaceModule??=import('./app/App.jsx').catch(error=>{workspaceModule=undefined;throw error;});
}
const App=lazy(loadWorkspace);
const prepareWorkspace=()=>{void loadWorkspace().catch(()=>{});};

createRoot(document.getElementById('root')).render(
 <AuthGate prepareWorkspace={prepareWorkspace}>{session => <Suspense fallback={<WorkspaceLoading/>}><App key={session.mode + session.user.id} session={session}/></Suspense>}</AuthGate>
);

if(import.meta.env.PROD && 'serviceWorker' in navigator){window.addEventListener('load',()=>{navigator.serviceWorker.register('/sw.js').catch(()=>{});});}
