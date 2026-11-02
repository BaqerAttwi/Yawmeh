import React,{useEffect,useState} from 'react';
import {installationPrompt,clearInstallationPrompt} from '../../lib/install.js';
export function InstallApp(){
 const [prompt,setPrompt]=useState(installationPrompt),[installed,setInstalled]=useState(()=>window.matchMedia('(display-mode: standalone)').matches),[message,setMessage]=useState('');
 useEffect(()=>{const ready=()=>setPrompt(installationPrompt());const done=()=>{setInstalled(true);setPrompt(null);};window.addEventListener('yawmeh-install-ready',ready);window.addEventListener('appinstalled',done);return()=>{window.removeEventListener('yawmeh-install-ready',ready);window.removeEventListener('appinstalled',done);};},[]);
 async function install(){if(!prompt)return;try{await prompt.prompt();await prompt.userChoice;clearInstallationPrompt();setPrompt(null);}catch{setMessage('Use your browser menu to install or add to your home screen.');}}
 return <section className="card" style={{padding:20,marginBottom:20}}><h3>Keep yawmeh.me close</h3><p>{installed?'You’re using the installed app.':'Add yawmeh.me to your home screen for quick access to Today.'}</p>{!installed&&<><button className="secondary" disabled={!prompt} onClick={install}>Install app</button><p>On iPhone or iPad: Safari → Share → Add to Home Screen. On supported desktop and Android browsers, use the browser’s Install app menu.</p><small>Installation requires HTTPS when deployed. An internet connection is needed to load and save records.</small></>}{message&&<p role="status">{message}</p>}</section>;
}
