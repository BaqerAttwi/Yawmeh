import {CompanionExamples} from './CompanionExamples.jsx';
import {companionStatusMessage} from '../../../../shared/companion-status.js';
import {randomId} from '../../../../shared/id.js';
import React,{useState,useRef,useEffect} from 'react';
import {X,Settings2,Plus,CalendarDays,ArrowUp,ChevronRight,RotateCw,Check,FileText,History,MessageSquarePlus,Trash2} from 'lucide-react';
import {localCompanion} from '../../../../shared/local-companion.js';
import {isLocalCompanionFollowup} from '../../../../shared/companion-followup.js';
import {guidanceChoices,guidanceGoal} from '../../../../shared/companion-guidance.js';
import {hasAccess} from '../../../../shared/access.js';
import {companionLanguage,draftFields,presentReply,replyMetrics} from '../../../../shared/companion-presentation.js';
import {readCompanionHistory,writeCompanionHistory,rememberConversation,historyKey,historyScope} from '../../../../shared/companion-history.js';
import {Character} from './Character.jsx';
import {CompanionVoice} from './CompanionVoice.jsx';
import './companion.css';
import './companion-chat.css';

const avatars=[
 {id:'sage',name:'Sage',color:'#527f6d',intro:'One small step, a calmer day.',ar:'خطوة صغيرة، ونهار أروق.'},
 {id:'nova',name:'Nova',color:'#7466ab',intro:'Let’s find a little room to grow.',ar:'خلّينا نلاقي مجال لنكبر شوي.'},
 {id:'pip',name:'Pip',color:'#b87746',intro:'Ready when you are. Let’s get it done.',ar:'جاهز وقت ما تكون. يلّا نبلّش.'},
];
const read=(key,fallback)=>{try{return localStorage.getItem(key)||fallback;}catch{return fallback;}};
const save=(key,value)=>{try{localStorage.setItem(key,value);}catch{}};
const actionNames={task:['Task','مهمة'],expense:['Expense','مصروف'],income:['Income','دخل'],opening:['Existing savings','مدخرات موجودة'],withdrawal:['Withdrawal','سحب'],budget:['Budget','ميزانية'],subscription:['Subscription','اشتراك'],item:['Frequent item','عملية متكرّرة']};

function BidiText({text}) {
 return text.split(/(\d{4}-\d{2}-\d{2}|\d{2}:\d{2}|[-−]?[\$€£][\d,]+\.\d{2})/g).map((part,i)=>i%2?<bdi key={i}>{part}</bdi>:part);
}

function Reply({message,avatar,t,onReview,onDismiss,onChoose,user}) {
 const {action,answer,language}=message;
 const lines=answer.split('\n'),long=lines.length>5,visibleAnswer=long?lines.slice(0,3).join('\n'):answer;
 return <article className="companion-reply" dir={language==='ar'?'rtl':'ltr'}>
  <div className="companion-message-author"><span style={{background:avatar.color}}/>{avatar.name}<small>{message.engine==='gemini'?t('AI-assisted','بمساعدة AI'):t('From your records','من سجلاتك')}</small></div>
  {message.hasEnglishDetails&&<small className="companion-language-note">بعض التفاصيل المفصّلة بعدها بالإنكليزي.</small>}
  <div className="companion-reply-sections">{visibleAnswer.split(/\n\n+/).filter(Boolean).map((part,i)=>{const metrics=replyMetrics(part,language);return metrics?<section className="companion-metrics" key={i}><small><BidiText text={metrics.caption}/></small><dl>{metrics.items.map(([label,value])=><div key={label}><dt>{label}</dt><dd dir="auto">{value}</dd></div>)}</dl></section>:<p dir="auto" key={i}><BidiText text={part}/></p>;})}{long&&<details className="companion-full-reply"><summary>{language==='ar'?'شوف باقي الجواب والملاحظات':'Show the rest and notes'}</summary>{lines.slice(3).join('\n').split(/\n\n+/).filter(Boolean).map((part,i)=><p dir="auto" key={i}><BidiText text={part}/></p>)}</details>}</div>
  {message.context?.goal&&onChoose&&<div className="companion-guidance-choices">{guidanceChoices(message.context.goal,user,language).map(choice=><button type="button" key={choice.question} onClick={()=>onChoose(choice.question,choice.label)}>{choice.label}</button>)}</div>}
  {action&&<section className="companion-draft" aria-label={t('Draft to review','مسودة للمراجعة')}>
   <div className="companion-draft-heading"><FileText size={16}/><strong>{actionNames[action.type]?.[language==='ar'?1:0]||action.type}</strong><span>{t('DRAFT','مسودة')}</span></div>
   <dl>{draftFields(action,language).map(([label,value])=><div key={label}><dt>{label}</dt><dd dir="auto">{value}</dd></div>)}</dl>
   <div className="companion-draft-buttons"><button type="button" className="primary" onClick={onReview}>{t('Review & save','راجع واحفظ')}<ChevronRight size={15}/></button><button type="button" onClick={onDismiss}>{t('Dismiss','إلغاء')}</button></div>
   <small>{t('Nothing is saved until you confirm in the form.','ما بينحفظ شي قبل ما تأكّد بالنموذج.')}</small>
  </section>}
  {message.saved&&<small className="companion-dismissed"><Check size={13}/>{t('Saved successfully','انحفظت بنجاح')}</small>}
  {message.dismissed&&<small className="companion-dismissed"><Check size={13}/>{t('Draft dismissed · nothing saved','تم إلغاء المسودة · ما انحفظ شي')}</small>}
 </article>;
}

export function CompanionChat(props) {
 return <CompanionSession key={`${props.mode}:${props.user.id}:${historyScope(props.user)}`} {...props}/>;
}
function CompanionSession({data,user,date,mode,onAction}) {
 const key=`daywell-companion:${mode}:${user.id}`;
 const [history,setHistory]=useState(()=>readCompanionHistory(read(historyKey(key),''),user));
 const historyRef=useRef(history);
 const [sessionId,setSessionId]=useState(()=>randomId()),[storageError,setStorageError]=useState(false),[restored,setRestored]=useState(false);
 const [viewport,setViewport]=useState({height:window.visualViewport?.height||window.innerHeight,gap:0,keyboard:false});
 const [avatarId,setAvatar]=useState(()=>read(key,'sage'));
 const [preference,setPreference]=useState(()=>{const value=read(key+':language','auto');return ['en','ar','auto'].includes(value)?value:'auto';});
 const [lastLanguage,setLastLanguage]=useState(()=>read(key+':last-language',navigator.language?.startsWith('ar')?'ar':'en'));
 const [open,setOpen]=useState(false),[voiceState,setVoiceState]=useState('idle'),[thinking,setThinking]=useState(false),[tools,setTools]=useState(null);
 const [moving,setMoving]=useState(()=>read(key+':motion','moving')!=='paused');
 const [useAI,setUseAI]=useState(()=>read(key+':ai','on')==='on'),[aiAvailable,setAIAvailable]=useState(false),[aiReason,setAIReason]=useState(null),[aiNotice,setAINotice]=useState('');
 const remote=useRef(),requestGeneration=useRef(0),inFlight=useRef(false);
 useEffect(()=>{
  if(mode!=='live')return;
  const controller=new AbortController();
  fetch('/api/companion/ai',{credentials:'same-origin',signal:controller.signal}).then(r=>r.ok?r.json():null).then(r=>{if(!controller.signal.aborted){setAIAvailable(!!r?.available);setAIReason(r?.reason||(!r?'unavailable':null));}}).catch(()=>{if(!controller.signal.aborted){setAIAvailable(false);setAIReason('unavailable');}});
  return()=>controller.abort();
 },[mode,open]);
 const [text,setText]=useState(''),[start,setStart]=useState(date),[end,setEnd]=useState(date),[messages,setMessages]=useState([]),[promptPage,setPromptPage]=useState(0);
 const conversation=useRef(null),pending=useRef(null),sequence=useRef(0),input=useRef(),launcher=useRef(),bottom=useRef();
 const avatar=avatars.find(a=>a.id===avatarId)||avatars[0];
 const language=companionLanguage(preference,text,lastLanguage),ar=language==='ar',t=(en,arabic)=>ar?arabic:en;
 const state=voiceState!=='idle'?voiceState:thinking?'thinking':'idle';
 const stateLabel={idle:t('Here to help','جاهز ساعدك'),listening:t('Listening…','عم اسمعك…'),thinking:t('Thinking…','عم حضّر الجواب…'),preparing:t('Preparing voice…','عم حضّر الصوت…'),speaking:t('Speaking…','عم احكي…')}[state];
 useEffect(()=>{if(open&&window.matchMedia('(pointer:fine)').matches)input.current?.focus();},[open]);
 useEffect(()=>{if(open)bottom.current?.scrollIntoView({block:'nearest'});},[messages,open,thinking,viewport.height]);
 useEffect(()=>()=>{clearTimeout(pending.current);remote.current?.abort();requestGeneration.current++;},[]);
 useEffect(()=>{
  const view=window.visualViewport;if(!view)return;
  const update=()=>setViewport({height:view.height,gap:Math.max(0,window.innerHeight-view.height-view.offsetTop),keyboard:view.height<window.innerHeight*.78});
  update();view.addEventListener('resize',update);view.addEventListener('scroll',update);
  return()=>{view.removeEventListener('resize',update);view.removeEventListener('scroll',update);};
 },[]);
 useEffect(()=>{
  const current={id:sessionId,updated:Date.now(),messages,text,context:conversation.current,start,end};
  const next=rememberConversation(historyRef.current,current);historyRef.current=next;setHistory(next);
  try{localStorage.setItem(historyKey(key),writeCompanionHistory(next,user));setStorageError(false);}catch{setStorageError(true);}
 },[messages,text,start,end,sessionId]);
 function cancelPending(){clearTimeout(pending.current);remote.current?.abort();remote.current=null;requestGeneration.current++;inFlight.current=false;setThinking(false);}
 function newChat(){cancelPending();setAINotice('');conversation.current=null;setMessages([]);setText('');setSessionId(randomId());setStart(date);setEnd(date);setRestored(false);setTools(null);}
 function restoreChat(saved){cancelPending();const restoredLanguage=saved.messages.at(-1)?.language;if(restoredLanguage){setLastLanguage(restoredLanguage);save(key+':last-language',restoredLanguage);}conversation.current=saved.context;setMessages(saved.messages);setText(saved.text);setStart(saved.start);setEnd(saved.end);setSessionId(saved.id);sequence.current=Math.max(0,...saved.messages.map(m=>m.id));setRestored(true);setTools(null);}
 function deleteChat(id){const next=historyRef.current.filter(s=>s.id!==id);historyRef.current=next;setHistory(next);try{localStorage.setItem(historyKey(key),writeCompanionHistory(next,user));}catch{setStorageError(true);}if(id===sessionId)newChat();}

 function clearDrafts(){conversation.current=null;setMessages(old=>old.map(m=>({...m,action:undefined})));}
 function ask(question,displayQuestion=question,forceLocal=false){
  if(!question.trim()||thinking||inFlight.current)return;
  inFlight.current=true;const generation=++requestGeneration.current;
  const nextLanguage=companionLanguage(preference,displayQuestion,lastLanguage);
  setLastLanguage(nextLanguage);save(key+':last-language',nextLanguage);setThinking(true);setText('');
  // Yield once so the activity indicator paints while preparing a local reply.
  pending.current=setTimeout(async()=>{
   try{
    const prepared=localCompanion(data,user,question,date,{start,end},conversation.current);
    const localDraft=!!prepared.action||(!!prepared.context?.goal&&!!guidanceGoal(question,conversation.current))||(!!prepared.context?.field&&!!prepared.context?.draft);
    let result=localDraft?prepared:undefined,reply;
    const localFollowup=isLocalCompanionFollowup(question,conversation.current);
    if(mode==='live'&&useAI&&aiAvailable&&!localFollowup&&!localDraft&&!forceLocal){
     const controller=new AbortController();remote.current=controller;const timeout=setTimeout(()=>controller.abort(),30000);
     try{
      const response=await fetch('/api/companion/chat',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},signal:controller.signal,body:JSON.stringify({question,language:nextLanguage,languageMode:preference==='auto'?'auto':'explicit',avatar:avatar.id,start,end,context:conversation.current,history:messages.slice(-3).map(m=>m.question),dialogue:messages.slice(-4).map(m=>({question:m.question.slice(0,1000),answer:m.engine==='gemini'?m.answer.slice(0,3000):'[Local app result not shared]'}))})});
      if(!response.ok){const failure=await response.json().catch(()=>({}));throw new Error(failure.code||(response.status===429?'rate_limited':'unavailable'));}
      const received=await response.json();
      if(generation!==requestGeneration.current)return;
      result=received;reply=result;if(received.language==='ar'||received.language==='en'){setLastLanguage(received.language);save(key+':last-language',received.language);}setAINotice('');
     }catch(error){if(generation!==requestGeneration.current)return;setAINotice(companionStatusMessage(controller.signal.aborted?'timeout':error.message,nextLanguage));}
     finally{clearTimeout(timeout);if(remote.current===controller)remote.current=null;}
    }
    if(generation!==requestGeneration.current)return;
    result??=prepared;
    conversation.current=result.context||null;
    reply??=presentReply(result,nextLanguage);
    setMessages(old=>[...old.map(m=>({...m,action:undefined})),{...reply,question:displayQuestion,id:++sequence.current}].slice(-20));
   }finally{if(generation===requestGeneration.current){inFlight.current=false;setThinking(false);pending.current=null;}}
  },80);
 }
 function close(){cancelPending();pending.current=null;setOpen(false);setTools(null);launcher.current?.focus();}
 function startDraft(type){clearDrafts();close();onAction(type,{},language);}
 const prompts=[
  ['What can I ask?','شو فيني اسأل؟'],
  ...(hasAccess(user,'tasks')?[['Plan my day','رتّب يومي'],['I have 15 minutes','عندي ١٥ دقيقة'],['What is my next task?','شو اعمل هلق؟'],['Show overdue tasks','شو المهام المتأخرة؟'],['What have I completed today?','شو خلصت اليوم؟'],['Upcoming tasks','مهامي الجاي']]:[]),
  ...(hasAccess(user,'money')?[['What are my savings?','شو مدخراتي؟'],['Budget status','وضع الميزانية'],['Review subscriptions','راجع الاشتراكات'],['Compare spending this month','قارن مصاريف الشهر']]:[]),
  ...(hasAccess(user,'money')?[['Recent expenses','آخر المصاريف'],['Largest expense this month','أكبر مصروف هالشهر'],['Which subscriptions are due?','شو الاشتراكات المستحقة؟'],['Can you add expenses?','ضيف مصروف']]:[]),
  ['Weekly report','تقرير الأسبوع'],
 ];
 const pageCount=Math.ceil(prompts.length/3),visiblePrompts=prompts.slice((promptPage%pageCount)*3,(promptPage%pageCount)*3+3);
 return <div className={`companion-dock companion-state-${state}${moving?' companion-motion':''}`} style={{'--companion-accent':avatar.color,'--companion-viewport-height':viewport.height+'px','--companion-keyboard-gap':viewport.gap+'px'}}>
  {open&&<section className={'companion-chat-panel companion-redesign'+(viewport.keyboard?' companion-keyboard-open':'')} role="dialog" aria-label={`${avatar.name} ${t('companion chat','محادثة المساعد')}`} dir={ar?'rtl':'ltr'} lang={ar?'ar':'en'} onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();tools?setTools(null):close();}}}>
   <header className="companion-panel-header"><div className="companion-header-avatar"><Character avatar={avatar} animated={false}/></div><div className="companion-header-title"><strong>{avatar.name}</strong><small role="status"><i/>{stateLabel}</small></div><button type="button" aria-label={t('Companion settings','إعدادات المساعد')} aria-expanded={tools==='settings'} onClick={()=>setTools(tools==='settings'?null:'settings')}><Settings2 size={19}/></button><button type="button" aria-label={t('Close companion chat','إغلاق المحادثة')} onClick={close}><X size={20}/></button></header>
   <div className="companion-language-tabs" role="group" aria-label={t('Reply language','لغة الرد')}>
    {[['en','English'],['ar','عربي'],['auto',t('Auto','تلقائي')]].map(([value,label])=><button key={value} type="button" aria-pressed={preference===value} onClick={()=>{setPreference(value);save(key+':language',value);}}>{label}</button>)}
    <small>{t('Your everyday companion','رفيق نهارك')}</small>
   </div>
   {tools==='settings'&&<section className="companion-tools"><label className="companion-motion-option"><input type="checkbox" disabled={!aiAvailable||mode!=='live'} checked={useAI&&aiAvailable&&mode==='live'} onChange={e=>{cancelPending();setUseAI(e.target.checked);save(key+':ai',e.target.checked?'on':'off');setAINotice('');}}/>{t('Understand requests with Gemini','فهم الطلبات مع Gemini')}</label><small>{aiAvailable?t('Sends your message, recent questions and pending draft to Google. Account records stay in this app. 10 AI requests/day; local chat continues after the limit. Shared monthly allowance.','بيبعت رسالتك، الأسئلة الأخيرة والمسودة لـGoogle. سجلاتك بتضل بالتطبيق. ١٠ طلبات AI باليوم، وبعدها بتكمّل الدردشة المحلية. في حد شهري مشترك.'):companionStatusMessage(aiReason||'unavailable',language)}</small></section>}
   {mode==='live'&&useAI&&aiAvailable&&tools!=='settings'&&<small className="companion-chat-note">{t('AI is on. Messages, recent questions and pending drafts are sent to Google. Turn off in companion settings.','الذكاء الاصطناعي مفعّل. الرسائل والأسئلة الأخيرة والمسودات بتنبعت لـGoogle. فيك تطفّيه من إعدادات المساعد.')}</small>}
   {mode==='live'&&useAI&&!aiAvailable&&aiReason&&<small className="companion-chat-note" role="status">{companionStatusMessage(aiReason,language)}</small>}
   {aiNotice&&<small className="companion-chat-note" role="status">{aiNotice}</small>}
   {tools==='settings'&&<section className="companion-tools" aria-label={t('Companion settings','إعدادات المساعد')}><label>{t('Your companion','مساعدك')}<select value={avatar.id} onChange={e=>{setAvatar(e.target.value);save(key,e.target.value);}}>{avatars.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label><label className="companion-motion-option"><input type="checkbox" checked={moving} onChange={e=>{setMoving(e.target.checked);save(key+':motion',e.target.checked?'moving':'paused');}}/>{t('Animate companion','حركة المساعد')}</label><p>{t(avatar.intro,avatar.ar)}</p></section>}
   {tools==='history'&&<section className="companion-tools companion-history" aria-label={t('Recent chats','المحادثات الأخيرة')}><div className="companion-history-heading"><strong>{t('Recent chats','المحادثات الأخيرة')}</strong><button type="button" onClick={newChat}><MessageSquarePlus size={15}/>{t('New chat','محادثة جديدة')}</button></div><small>{t('Saved on this browser for 30 days. Previous answers are snapshots.','محفوظة بهالمتصفح لـ٣٠ يوم. الأجوبة السابقة بتعكس وقت السؤال.')}</small>{history.length?history.map(saved=><div className="companion-history-row" key={saved.id}><button type="button" onClick={()=>restoreChat(saved)}><strong dir="auto">{saved.messages[0]?.question||saved.text||t('Unfinished chat','محادثة غير مكتملة')}</strong><small>{new Date(saved.updated).toLocaleDateString(ar?'ar-LB':'en-GB')} · {saved.context?.draft?t('Unfinished draft','مسودة غير محفوظة'):t('Conversation','محادثة')}</small></button><button type="button" aria-label={t('Delete chat','حذف المحادثة')} onClick={()=>deleteChat(saved.id)}><Trash2 size={14}/></button></div>):<p>{t('Your chats will appear here.','محادثاتك رح تظهر هون.')}</p>}</section>}
   {tools==='examples'&&<CompanionExamples user={user} language={language} text={text} aiAvailable={mode==='live'&&useAI&&aiAvailable} onChoose={example=>{setText(example);setTools(null);input.current?.focus();}}/>}
   <div className="companion-chat-log" hidden={tools==='history'||tools==='examples'} role="log" aria-label={t('Conversation','المحادثة')} aria-live="polite" aria-busy={thinking}>
    {restored&&<p className="companion-restored-note">{t('Reopened chat · Previous answers show saved snapshots. New questions use your current records. Review dates before saving an unfinished draft.','محادثة سابقة · الأجوبة القديمة بتعكس وقت السؤال. الأسئلة الجديدة بتستعمل سجلاتك الحالية. راجع التواريخ قبل حفظ أي مسودة.')}</p>}
    {!messages.length&&<div className="companion-welcome"><span className="companion-eyebrow">{t('A LITTLE CLARITY, EVERY DAY','شوي وضوح، كل يوم')}</span><h2>{t(`Hi, I’m ${avatar.name}.`,`أهلا، أنا ${avatar.name}.`)}</h2><p>{t(avatar.intro,avatar.ar)}</p><small>{t('Plan your day, check your money, or prepare something to add.','رتّب نهارك، راجع مصاريك، أو حضّر عملية جديدة.')}</small></div>}
    {messages.map((message,i)=><React.Fragment key={i}><div className="companion-question" dir="auto"><span className="sr-only">{t('You','أنت')}: </span>{message.question}</div><Reply message={message} avatar={avatar} t={t} user={user} onChoose={i===messages.length-1&&!thinking?(question,label)=>ask(question,label,true):undefined} onReview={()=>{close();onAction(message.action.type,message.action.initial,message.language,()=>{conversation.current=null;setMessages(old=>old.map(m=>m.id===message.id?{...m,action:undefined,saved:true}:m));});}} onDismiss={()=>{conversation.current=null;setMessages(old=>old.map((m,index)=>index===i?{...m,action:undefined,dismissed:true}:m));input.current?.focus();}}/></React.Fragment>)}
    {thinking&&<div className="companion-thinking"><span/><span/><span/><small>{stateLabel}</small></div>}
    <span ref={bottom}/>
   </div>
   <div className="companion-prompts">{visiblePrompts.map(([question,label])=><button type="button" key={question} disabled={thinking} onClick={()=>ask(question,ar?label:question)}>{ar?label:question}</button>)}{pageCount>1&&<button type="button" className="companion-more-prompts" aria-label={t('More suggestions','اقتراحات إضافية')} onClick={()=>setPromptPage(p=>p+1)}><RotateCw size={14}/></button>}</div>
   <div className="companion-bottom-tools"><button type="button" aria-expanded={tools==='examples'} onClick={()=>setTools(tools==='examples'?null:'examples')}><FileText size={15}/>{t('Examples','أمثلة')}</button><button type="button" aria-expanded={tools==='history'} onClick={()=>setTools(tools==='history'?null:'history')}><History size={15}/>{t('Recent chats','آخر المحادثات')}</button><button type="button" aria-expanded={tools==='add'} onClick={()=>setTools(tools==='add'?null:'add')}><Plus size={15}/>{t('Quick add','إضافة')}</button><button type="button" aria-expanded={tools==='dates'} onClick={()=>setTools(tools==='dates'?null:'dates')}><CalendarDays size={15}/>{t('Date range','فترة التقرير')}</button></div>
   {tools==='add'&&<section className="companion-tools companion-add-grid" aria-label={t('Quick add','إضافة سريعة')}>{Object.entries(actionNames).filter(([type])=>hasAccess(user,type==='task'?'tasks':'money')).map(([type,names])=><button type="button" key={type} onClick={()=>startDraft(type)}><Plus size={14}/>{names[ar?1:0]}</button>)}</section>}
   {tools==='dates'&&<form className="companion-date-form" onSubmit={e=>{e.preventDefault();setTools(null);ask('Report for selected dates',t('Report for selected dates','تقرير للفترة المختارة'));}}><label>{t('From','من')}<input type="date" required value={start} max={end} onChange={e=>setStart(e.target.value)}/></label><label>{t('Through','إلى')}<input type="date" required value={end} min={start} onChange={e=>setEnd(e.target.value)}/></label><button type="submit" disabled={thinking}>{t('Report','تقرير')}</button></form>}
   <div className="companion-composer">
    <CompanionVoice key={sessionId} storageKey={key} mode={mode} avatar={avatar.id} conversationId={sessionId} onStateChange={setVoiceState} onTranscript={words=>{setText(words);setLastLanguage(companionLanguage(preference,words,lastLanguage));}} response={messages.at(-1)} language={language} busy={thinking}/>
    <form className="companion-chat-input" onSubmit={e=>{e.preventDefault();ask(text);}}><label className="sr-only" htmlFor="companion-question">{t('Ask your companion','اسأل مساعدك')}</label><input id="companion-question" dir="auto" ref={input} value={text} maxLength={1000} onChange={e=>setText(e.target.value)} placeholder={t('What’s on your mind?','شو ببالك؟')}/><button disabled={!text.trim()||thinking} type="submit" aria-label={t('Send message','إرسال الرسالة')}><ArrowUp size={19}/></button></form>
   </div>
   <small className="companion-chat-note">{storageError?t('Chat could not be saved in this browser.','ما قدرنا نحفظ المحادثة بهالمتصفح.'):t('Based on your records · You review every draft','حسب سجلاتك · بتراجع كل مسودة قبل الحفظ')}</small>
  </section>}
  <button ref={launcher} className={`companion-launcher${state==='speaking'?' is-speaking':''}`} aria-label={open?t('Close companion chat','إغلاق المحادثة'):t(`Chat with ${avatar.name}`,`احكي مع ${avatar.name}`)} aria-expanded={open} onClick={()=>open?close():setOpen(true)}><strong className="companion-greeting">{state==='idle'?t(avatar.intro,avatar.ar):stateLabel}</strong><Character key={avatar.id} avatar={avatar} animated={moving}/><span className="companion-launcher-label">{state==='idle'?(open?t('Close','إغلاق'):t('Ask '+avatar.name,'اسأل '+avatar.name)):stateLabel}</span></button>
 </div>;
}
