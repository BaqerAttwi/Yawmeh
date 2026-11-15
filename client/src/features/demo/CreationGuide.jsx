import React,{useState} from 'react';
import {CircleHelp,Play} from 'lucide-react';
import {formGuideSteps} from './form-guide-steps.js';
import {GuideAvatar} from './GuideAvatar.jsx';
import './creation-guide.css';

export function CreationGuide({kind,language='en',showVideo=false}){
 const [open,setOpen]=useState(false);
 const ar=language==='ar';
 const steps=formGuideSteps[kind];
 const video=showVideo?(kind==='task'?'create-task':'record-money'):null;
 if(!steps)return null;
 const label=video?(ar?'شاهد الشرح · English / عربي':'Watch guide · English / عربي'):(ar?'دليل الخطوات':'Step-by-step guide');
 const Icon=video?Play:CircleHelp;
 return <section className="creation-guide">
  <button type="button" className="text-button" aria-expanded={open} onClick={()=>setOpen(value=>!value)}><Icon size={15}/>{label}</button>
  {open&&<div>
   {video?<ol>{steps.map(([en,arabic])=><li key={en}>{ar?arabic:en}</li>)}</ol>:<div className="form-guide-steps"><GuideAvatar/><ol>{steps.map(([en,arabic])=><li key={en}>{ar?arabic:en}</li>)}</ol></div>}
   {video&&<>
    <p>{ar?'الفيديو شرح عام ببيانات تجريبية.':'The video is a general walkthrough with sample data.'}</p>
    <video key={kind} controls playsInline preload="none" aria-label={kind==='task'?'Task creation tutorial — English and Arabic':'Money entry tutorial — English and Arabic'}>
     <source src={`/guides/${video}.webm`} type="video/webm"/>
     <track kind="captions" src={`/guides/${video}.en.vtt`} srcLang="en" label="English"/>
     <track kind="captions" src={`/guides/${video}.ar.vtt`} srcLang="ar" label="العربية"/>
    </video>
    <a href={`/guides/${video}.webm`} download>{ar?'تحميل الفيديو':'Download video'}</a>
   </>}
  </div>}
 </section>;
}
