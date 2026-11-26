import React,{useEffect,useState} from 'react';
import {getTheme,setTheme,themeChanged} from '../../lib/theme.js';
import {getPalette,palettes,setPalette} from '../../lib/palette.js';

const paletteLabels={
  en:{lime:'Lime',ocean:'Ocean',coral:'Coral',emerald:'Emerald'},
  ar:{lime:'ليموني',ocean:'محيطي',coral:'مرجاني',emerald:'زمردي'},
};

export function ThemePreference({language}){
  const [theme,setSelection]=useState(getTheme);
  const [palette,setColor]=useState(getPalette);
  const ar=language==='ar',labels=ar?paletteLabels.ar:paletteLabels.en;
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
    <div className="appearance-palettes" role="group" aria-labelledby="app-color-label">
      <span className="appearance-palette-label" id="app-color-label">{ar?'لون التطبيق':'App color'}</span>
      <div className="appearance-swatches">
        {palettes.map(name=><button type="button" key={name} className="palette-swatch" data-color={name}
          aria-pressed={palette===name} aria-label={labels[name]} onClick={()=>{setPalette(name);setColor(name);}}>
          <span className="palette-dot" aria-hidden="true"/>
          <span>{labels[name]}</span>
        </button>)}
      </div>
    </div>
  </section>;
}
