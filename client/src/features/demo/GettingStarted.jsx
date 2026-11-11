import React,{useEffect,useRef,useState} from 'react';
import {ArrowRight,Check,ChevronLeft,Compass,Play,X} from 'lucide-react';
import {Character} from '../assistant/Character.jsx';
import {DemoGuides} from './DemoGuides.jsx';
import {gettingStartedSteps,guideStepReached} from '../../../../shared/getting-started.js';
import './getting-started.css';

export function GettingStarted({user,mode,page,tab,overviewTab,can,open,onClose,onOpen,onNavigate,onTourChange}) {
 const key=`yawmeh-start-here:v1:${mode}:${user.id}`;
 const [dismissed,setDismissed]=useState(()=>{try{return localStorage.getItem(key)==='done';}catch{return false;}});
 const [view,setView]=useState('choices'),[index,setIndex]=useState(null),[completed,setCompleted]=useState(false);
 const [focus,setFocus]=useState('all');
 const dialog=useRef(),next=useRef();const steps=gettingStartedSteps(user,focus),step=index===null?null:steps[index],reached=guideStepReached(step,{page,tab,overviewTab});
 const remember=()=>{setDismissed(true);try{localStorage.setItem(key,'done');}catch{}};
 useEffect(()=>{if(open){setView('choices');dialog.current?.showModal();}},[open]);
 useEffect(()=>{onTourChange(index!==null);return()=>onTourChange(false);},[index!==null,onTourChange]);
 useEffect(()=>{
  if(!step)return;
  const target=document.querySelector(`[data-tour="${reached&&step.target?step.target:'nav-'+step.page}"]`);
  target?.classList.add('tour-target');const frame=requestAnimationFrame(()=>target?.scrollIntoView({block:reached&&step.target?'start':'nearest',inline:'nearest'}));
  const escape=e=>{if(e.key==='Escape'){setIndex(null);next.current?.focus();}};
  document.addEventListener('keydown',escape);
  return()=>{cancelAnimationFrame(frame);target?.classList.remove('tour-target');document.removeEventListener('keydown',escape);};
 },[step?.id,reached]);
 function begin(topic){onClose();setCompleted(false);setFocus(topic);setIndex(0);}
 function finish(){setIndex(null);remember();setCompleted(true);onOpen();}
 return <>
  {page==='overview'&&!dismissed&&index===null&&<section className="start-here-banner"><div><Compass size={20}/><span><strong>A little guidance for your first day</strong><small>See where to begin, with a video or your companion.</small></span></div><button className="primary" onClick={onOpen}>Start here <ArrowRight size={16}/></button><button className="icon-button" aria-label="Dismiss getting started" onClick={remember}><X size={16}/></button></section>}
  {open&&<dialog ref={dialog} className="start-here-dialog" aria-label="Start here" onCancel={e=>{e.preventDefault();onClose();}}>
   <header><span className="eyebrow">YOUR FIRST SMALL STEPS</span><button className="icon-button" aria-label="Close getting started" onClick={onClose}><X size={20}/></button></header>
   <div className="start-here-intro"><Character avatar={{id:'sage'}} animated={false}/><div><h2>{completed?'You know your way around.':'Let’s find your starting point.'}</h2><p>{completed?'Come back any time for a refresher.':'I’m Sage. Start with the guided tour, or watch the steps before trying them yourself.'}</p></div></div>
   <div className="start-topic-buttons">
    {can('tasks')&&<button type="button" className="primary" onClick={()=>begin('tasks')}>Start with tasks <ArrowRight size={15}/></button>}
    {can('money')&&<button type="button" className="secondary" onClick={()=>begin('money')}>Start with money <ArrowRight size={15}/></button>}
   </div>
   <div className="start-here-choices"><button onClick={()=>begin('all')}><Compass size={24}/><strong>Guide me step by step</strong><small>Take the full tour of the workspace at your own pace.</small><span>Start full tour <ArrowRight size={15}/></span></button><button onClick={()=>setView(view==='videos'?'choices':'videos')} aria-expanded={view==='videos'}><Play size={24}/><strong>Watch, then try</strong><small>A first-day walkthrough, followed by short task and money tutorials. English / عربي captions.</small><span>{view==='videos'?'Hide videos':'Show videos'} <ArrowRight size={15}/></span></button></div>
   {view==='videos'&&<section className="start-here-videos"><h3>Your first day, step by step</h3><p>Start in Settings, add your first record, then return to Today. Recorded in a demo workspace.</p><video controls playsInline preload="none" aria-label="Getting started walkthrough"><source src="/guides/getting-started.webm" type="video/webm"/><track kind="captions" src="/guides/getting-started.en.vtt" srcLang="en" label="English" default/><track kind="captions" src="/guides/getting-started.ar.vtt" srcLang="ar" label="العربية"/></video><DemoGuides can={can}/></section>}
   <footer><button className="text-button" onClick={()=>{remember();onClose();}}>I’ll explore on my own</button><small>Look for the G Guide button in the sidebar or top bar.</small></footer>
  </dialog>}
  {step&&<section className="getting-started-coach" aria-label="Guided tour">
   <div className="tour-top"><span>STEP {index+1} OF {steps.length}</span><button className="icon-button" aria-label="Pause guided tour" onClick={()=>setIndex(null)}><X size={18}/></button></div>
   <div key={step.id} className="tour-body" aria-live="polite" tabIndex={0}>
    <div className="tour-copy"><Character avatar={{id:'sage'}} animated={false}/><div><h2>{step.title}</h2><p className="tour-instruction">{reached?<><Check size={16}/> You’re in the right place.</>:step.instruction}</p><p>{step.explanation}</p>{step.example&&<p className="tour-example">{step.example}</p>}</div></div>
   </div>
   <footer>
    <button className="text-button" disabled={!index} onClick={()=>setIndex(i=>i-1)}><ChevronLeft size={15}/>Back</button>
    {!reached?<button className="primary" onClick={()=>onNavigate(step)}>Take me there <ArrowRight size={15}/></button>:<button ref={next} className="primary" onClick={()=>index===steps.length-1?finish():setIndex(i=>i+1)}>{index===steps.length-1?'Finish tour':'Next step'} <ArrowRight size={15}/></button>}
   </footer>
  </section>}
 </>;
}
