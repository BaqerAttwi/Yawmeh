import React,{lazy,Suspense} from 'react';
import './lib/install.js';
import {createRoot} from 'react-dom/client';
import './styles/styles.css';
import './styles/access.css';
const App=lazy(()=>import('./app/App.jsx'));
import {AuthGate} from './features/auth/Auth.jsx';

createRoot(document.getElementById('root')).render(
 <AuthGate>{session => <Suspense fallback={<p role="status">Loading your workspace…</p>}><App key={session.mode + session.user.id} session={session}/></Suspense>}</AuthGate>
);

if(import.meta.env.PROD && 'serviceWorker' in navigator){window.addEventListener('load',()=>{navigator.serviceWorker.register('/sw.js').catch(()=>{});});}
