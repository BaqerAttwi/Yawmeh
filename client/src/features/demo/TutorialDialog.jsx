import React,{useEffect,useRef} from 'react';
import {X} from 'lucide-react';
import {DemoGuides} from './DemoGuides.jsx';

export function TutorialDialog({can,close}){
 const dialog=useRef();
 useEffect(()=>{dialog.current.showModal();},[]);
 return <dialog ref={dialog} className="tutorial-dialog" aria-label="Video tutorials" onCancel={event=>{event.preventDefault();close();}}><div className="modal-heading"><div><span className="eyebrow">ENGLISH / عربي</span><h2>Video tutorials</h2></div><button type="button" className="icon-button" aria-label="Close video tutorials" onClick={close}><X size={20}/></button></div><DemoGuides can={can}/></dialog>;
}
