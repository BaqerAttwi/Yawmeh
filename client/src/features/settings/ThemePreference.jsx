import React,{useEffect,useState} from 'react';
import {getTheme,setTheme,themeChanged} from '../../lib/theme.js';

export function ThemePreference(){
  const [theme,setSelection]=useState(getTheme);
  useEffect(()=>{
    const onStorage=()=>setSelection(getTheme());
    window.addEventListener('storage',onStorage);
    window.addEventListener(themeChanged,onStorage);
    return()=>{
      window.removeEventListener('storage',onStorage);
      window.removeEventListener(themeChanged,onStorage);
    };
  },[]);
  return <section className="card appearance-card" aria-labelledby="appearance-title">
    <h3 id="appearance-title">Appearance</h3>
    <label className="field" htmlFor="workspace-theme">Color theme</label>
    <select id="workspace-theme" value={theme} onChange={event=>{
      const next=event.target.value;
      setSelection(next);setTheme(next);
    }}>
      <option value="system">System</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  </section>;
}
