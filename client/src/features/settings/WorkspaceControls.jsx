import React,{useEffect,useState} from 'react';
import {Moon} from 'lucide-react';
import {getTheme,setTheme,themeChanged} from '../../lib/theme.js';

export function WorkspaceControls({language,onLanguage}){
  const [theme,setSelection]=useState(getTheme);
  useEffect(()=>{
    const update=()=>setSelection(getTheme());
    window.addEventListener('storage',update);
    window.addEventListener(themeChanged,update);
    return()=>{
      window.removeEventListener('storage',update);
      window.removeEventListener(themeChanged,update);
    };
  },[]);
  return <>
    <button type="button" className="language-switch" aria-label="Switch workspace direction and companion language" onClick={onLanguage}>{language==='ar'?'EN':'العربية'}</button>
    <details className="topbar-menu theme-menu">
      <summary className="icon-button" aria-label="Color theme"><Moon size={17}/></summary>
      <div className="topbar-popover">
        {['system','light','dark'].map(option=><button type="button" key={option} aria-pressed={theme===option} onClick={event=>{
          setSelection(option);setTheme(option);
          const menu=event.currentTarget.closest('details');
          menu.open=false;menu.querySelector('summary')?.focus();
        }}>{option[0].toUpperCase()+option.slice(1)}</button>)}
      </div>
    </details>
  </>;
}
