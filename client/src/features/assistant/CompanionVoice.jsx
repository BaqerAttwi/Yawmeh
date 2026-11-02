import {createVoicePlayer} from './voice-player.js';
import React,{useEffect,useRef,useState} from 'react';
import {Mic,MicOff,Volume2,VolumeX,Square,SlidersHorizontal} from 'lucide-react';

// Mounted only while chat is open: closing or signing out releases microphone/audio.
export function CompanionVoice({onTranscript,response,storageKey,onStateChange,language,busy,mode,avatar,conversationId}) {
 const answer=response?.answer;
 const ar=language==='ar',t=(en,arabic)=>ar?arabic:en;
 const arabicStatus={
  'Microphone stopped.':'وقف الميكروفون.',
  'Playback was blocked. Tap a preview or Read last reply to play.':'المتصفح وقف التشغيل. اضغط تجربة أو اسمع آخر رد.',
  'Natural voice stopped. Try device voices.':'وقف الصوت الطبيعي. جرّب صوت الجهاز.',
  'Natural voice is unavailable. Using your device voice.':'الصوت الطبيعي مش متاح. رح نستعمل صوت الجهاز.',
  'Listening… احكي لبناني.':'عم اسمعك… احكي لبناني.',
  'Listening… Speak in English.':'عم اسمعك… احكي بالإنكليزي.',
  'Check your words, then press Send.':'راجع الكلام، وبعدها اضغط إرسال.',
  'Microphone permission was denied. Allow it in your browser settings, or type below.':'إذن الميكروفون مرفوض. فعّله من إعدادات المتصفح، أو اكتب تحت.',
  'No speech heard. Try again or type below.':'ما سمعت كلام. جرّب مرة تانية أو اكتب تحت.',
  'No microphone is available. You can still type below.':'ما في ميكروفون متاح. فيك تكتب تحت.',
  'Voice recognition is unavailable. Check your connection or type below.':'التعرّف على الصوت مش متاح. تأكّد من الاتصال أو اكتب تحت.',
  'Microphone stopped. Try again or type below.':'وقف الميكروفون. جرّب مرة تانية أو اكتب تحت.',
  'Could not start the microphone. Try your regular browser or type below.':'ما قدرت شغّل الميكروفون. جرّب متصفحك العادي أو اكتب تحت.',
  'Could not play this voice. Try another voice.':'ما قدرت شغّل هالصوت. جرّب صوت تاني.',
  'No Arabic voice is available on this device. Install an Arabic speech voice in your device settings, then reopen this chat.':'ما في صوت عربي بهالجهاز. ضيف صوت عربي من إعدادات الجهاز وافتح المحادثة من جديد.',
  'No English voice is available on this device. Install an English speech voice, then reopen this chat.':'ما في صوت إنكليزي بهالجهاز. ضيف صوت إنكليزي وافتح المحادثة من جديد.',
 };
 const preferenceKey=storageKey+':voice';
 const [preferences]=useState(()=>{try{return JSON.parse(localStorage.getItem(preferenceKey))||{};}catch{return {};}});
 const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
 const synth=window.speechSynthesis;
 const recognition=useRef(null),utterance=useRef(null),previous=useRef(response?.id),player=useRef(null),fallback=useRef(null),speechTimer=useRef(null),listenTimer=useRef(null);
 const [naturalAvailable,setNaturalAvailable]=useState(false),[source,setSource]=useState('device'),[naturalVoice,setNaturalVoice]=useState(['marin','cedar'].includes(preferences.naturalVoice)?preferences.naturalVoice:'marin');
 const [listening,setListening]=useState(false),[speaking,setSpeaking]=useState(false),[enabled,setEnabled]=useState(preferences.enabled===true),[status,setStatus]=useState(''),[voices,setVoices]=useState([]),[voiceChoices,setVoiceChoices]=useState(preferences.voices||{}),[microphoneLanguage,setMicrophoneLanguage]=useState(['auto','en-US','ar-LB'].includes(preferences.microphoneLanguage)?preferences.microphoneLanguage:'auto'),[settingsOpen,setSettingsOpen]=useState(false),[preparing,setPreparing]=useState(false),[speed,setSpeed]=useState([0.85,1,1.1].includes(preferences.speed)?preferences.speed:1);
 useEffect(()=>{try{localStorage.setItem(preferenceKey,JSON.stringify({enabled,voices:voiceChoices,speed,naturalVoice,microphoneLanguage}));}catch{}},[enabled,voiceChoices,speed,naturalVoice,microphoneLanguage,preferenceKey]);
 useEffect(()=>{onStateChange?.(listening?'listening':speaking?'speaking':preparing?'preparing':'idle');},[listening,speaking,preparing,onStateChange]);
 useEffect(()=>()=>onStateChange?.('idle'),[onStateChange]);
 useEffect(()=>{stopSpeech();},[conversationId]);
 useEffect(()=>{if(busy){stopListening();stopSpeech();setStatus('');}},[busy]);
 useEffect(()=>{stopListening();stopSpeech();setStatus('');},[language]);
 useEffect(()=>{
  if(mode!=='live')return;const controller=new AbortController();fetch('/api/companion/voice',{credentials:'same-origin',signal:controller.signal}).then(r=>r.ok?r.json():null).then(value=>{if(!controller.signal.aborted)setNaturalAvailable(value?.available===true);}).catch(()=>{});return()=>controller.abort();
 },[mode]);
 useEffect(()=>()=>player.current?.stop(),[]);
 function stopSpeech(){clearTimeout(speechTimer.current);player.current?.stop();fallback.current=null;utterance.current=null;synth?.cancel();setSpeaking(false);setPreparing(false);}
 function stopListening(){clearTimeout(listenTimer.current);const active=recognition.current;recognition.current=null;if(active){active.onresult=null;active.onerror=null;active.onend=null;active.abort();}setListening(false);}
 function deviceSpeak(value,previewLanguage){
  if(!synth||!value)return;
  const spokenLanguage=previewLanguage||(/[\u0600-\u06ff]/.test(value)?'ar-LB':'en-US');
  const matching=voices.filter(v=>v.lang.toLowerCase().startsWith(spokenLanguage.slice(0,2)));
  const selected=matching.find(v=>v.voiceURI===voiceChoices[spokenLanguage])||matching.find(v=>v.lang.toLowerCase()===spokenLanguage.toLowerCase())||matching.find(v=>v.default)||matching[0];
  if(!selected){setStatus(spokenLanguage==='ar-LB'?'No Arabic voice is available on this device. Install an Arabic speech voice in your device settings, then reopen this chat.':'No English voice is available on this device. Install an English speech voice, then reopen this chat.');return;}
  const line=new SpeechSynthesisUtterance(value);line.voice=selected;line.lang=selected.lang;line.rate=speed;
  utterance.current=line;
  line.onstart=()=>{if(utterance.current===line){clearTimeout(speechTimer.current);setPreparing(false);setSpeaking(true);setStatus('');}};
  line.onend=()=>{if(utterance.current===line){clearTimeout(speechTimer.current);setSpeaking(false);setPreparing(false);utterance.current=null;setStatus('');}};
  line.onerror=()=>{if(utterance.current===line){clearTimeout(speechTimer.current);setSpeaking(false);setPreparing(false);utterance.current=null;setStatus('Could not play this voice. Try another voice.');}};
  setPreparing(true);setStatus('');speechTimer.current=setTimeout(()=>{if(utterance.current===line){utterance.current=null;synth.cancel();setPreparing(false);setSpeaking(false);setStatus(t('This voice did not start. Try another voice or your regular browser.','هالصوت ما اشتغل. جرّب صوت تاني أو متصفحك العادي.'));}},8000);try{synth.resume();synth.speak(line);}catch{clearTimeout(speechTimer.current);utterance.current=null;setPreparing(false);setStatus('Could not play this voice. Try another voice.');}
 }
 function speak(value,previewLanguage){
  stopListening();stopSpeech();if(!value)return;
  if(source!=='natural'||!naturalAvailable){deviceSpeak(value,previewLanguage);return;}
  fallback.current=()=>deviceSpeak(value,previewLanguage);
  if(!player.current)player.current=createVoicePlayer({onState:state=>{setPreparing(state==='preparing');setSpeaking(state==='speaking');},onError:({played,blocked})=>{
   if(blocked){setStatus('Playback was blocked. Tap a preview or Read last reply to play.');return;}
   if(played){setStatus('Natural voice stopped. Try device voices.');return;}
   setStatus('Natural voice is unavailable. Using your device voice.');
   if(!played)fallback.current?.();
  }});
  player.current.play(value,{language:(previewLanguage||(/[\u0600-\u06ff]/.test(value)?'ar-LB':'en-US')).slice(0,2),voice:naturalVoice,avatar,speed});
 }
 useEffect(()=>{if(!synth)return;const refresh=()=>setVoices(synth.getVoices());refresh();synth.addEventListener('voiceschanged',refresh);return()=>synth.removeEventListener('voiceschanged',refresh);},[synth]);
 useEffect(()=>{if(response?.id!==previous.current){previous.current=response?.id;stopListening();if(enabled&&answer)speak(answer);}},[response]);
 useEffect(()=>{const hide=()=>{if(document.hidden){stopListening();stopSpeech();}};document.addEventListener('visibilitychange',hide);return()=>{clearTimeout(speechTimer.current);document.removeEventListener('visibilitychange',hide);stopListening();utterance.current=null;synth?.cancel();player.current?.stop();};},[]);
 function listen(){
  if(listening){stopListening();setStatus('Microphone stopped.');return;}
  if(!Recognition)return;stopSpeech();const inputLanguage=microphoneLanguage==='auto'?(ar?'ar-LB':'en-US'):microphoneLanguage;setStatus(inputLanguage==='ar-LB'?'Listening… احكي لبناني.':'Listening… Speak in English.');
  const active=new Recognition();recognition.current=active;active.lang=inputLanguage;active.continuous=false;active.interimResults=true;
  let heard=false;
  active.onresult=e=>{if(recognition.current!==active)return;const results=Array.from(e.results),words=results.map(r=>r[0].transcript).join(' ').trim().slice(0,1000);if(!words)return;heard=true;onTranscript(words);if(results.every(r=>r.isFinal)){stopListening();setStatus('Check your words, then press Send.');}else setStatus(t('Hearing your words… Pause when finished, then press Send.','عم اسمع كلامك… وقف شوي لما تخلّص، وبعدها اضغط إرسال.'));};
  active.onerror=e=>{if(recognition.current!==active)return;stopListening();setStatus(e.error==='not-allowed'?'Microphone permission was denied. Allow it in your browser settings, or type below.':e.error==='no-speech'?'No speech heard. Try again or type below.':e.error==='audio-capture'?'No microphone is available. You can still type below.':'Voice recognition is unavailable. Check your connection or type below.');};
  active.onend=()=>{if(recognition.current===active){clearTimeout(listenTimer.current);recognition.current=null;setListening(false);setStatus(s=>heard?'Check your words, then press Send.':s.startsWith('Listening')?'No speech heard. Try again or type below.':s);}};
  try{active.start();setListening(true);listenTimer.current=setTimeout(()=>{if(recognition.current!==active)return;stopListening();setStatus(heard?'Check your words, then press Send.':t('No words were recognized. Check your browser microphone and the microphone language in Voice settings, then try again.','ما تعرّفنا على الكلام. تأكّد من ميكروفون المتصفح ولغة الميكروفون بإعدادات الصوت وجرّب مرة تانية.'));},20000);}catch{stopListening();setStatus('Could not start the microphone. Try your regular browser or type below.');}
 }
 return <div className="companion-voice-bar">
  <div className="companion-voice-shortcuts">
   <button type="button" disabled={!Recognition||busy} aria-label={listening?t('Stop microphone','إيقاف الميكروفون'):t('Speak your message','احكي رسالتك')} aria-pressed={listening} onClick={listen}>{listening?<MicOff size={17}/>:<Mic size={17}/>}<span>{listening?t('Stop mic','وقف التسجيل'):t('Speak','احكي')}</span></button>
   <button type="button" disabled={!synth&&!naturalAvailable} aria-label={t('Read replies aloud','قراءة الردود بصوت')} aria-pressed={enabled} onClick={()=>{setEnabled(!enabled);if(enabled){stopSpeech();setStatus('');}}}>{enabled?<Volume2 size={17}/>:<VolumeX size={17}/>}<span>{enabled?t('Voice on','الصوت شغّال'):t('Voice off','الصوت مطفّي')}</span></button>
   {(speaking||preparing)&&<button className="companion-stop" type="button" onClick={()=>{stopSpeech();setStatus('');}}><Square size={14}/>{t('Stop','وقف')}</button>}
   <button type="button" className="companion-voice-settings-button" aria-label={t('Voice settings','إعدادات الصوت')} aria-expanded={settingsOpen} onClick={()=>setSettingsOpen(!settingsOpen)}><SlidersHorizontal size={17}/></button>
  </div>
  {!Recognition&&<small>{t('Microphone unavailable in this browser. You can type below.','الميكروفون مش متاح بهالمتصفح. فيك تكتب تحت.')}</small>}
  {settingsOpen&&<div className="companion-voice-settings"><label className="companion-voice-choice">{t('Voice quality','نوع الصوت')}<select aria-label={t('Voice quality','نوع الصوت')} value={source} onChange={e=>{stopSpeech();setSource(e.target.value);}}><option value="device">{t('Device voices','أصوات الجهاز')}</option><option value="natural" disabled={!naturalAvailable}>{t('Natural voice · OpenAI','صوت طبيعي · OpenAI')}</option></select></label>{!naturalAvailable&&<small>{t('Natural voice needs an enabled live server and an OpenAI API key.','الصوت الطبيعي بدّه خادم مفعّل بوضع الحساب الفعلي ومفتاح OpenAI.')}</small>}{source==='natural'&&<><small>{t('AI-generated voice. Reply text is sent to OpenAI when played; API usage is billed to the configured account. A Lebanese accent may vary.','صوت مولّد بالذكاء الاصطناعي. نص الرد بينبعت لـOpenAI عند التشغيل، والكلفة على الحساب المُعدّ. اللهجة اللبنانية ممكن تختلف.')}</small><label className="companion-voice-choice">{t('Natural voice','الصوت الطبيعي')}<select aria-label={t('Natural voice','الصوت الطبيعي')} value={naturalVoice} onChange={e=>{stopSpeech();setNaturalVoice(e.target.value);}}><option value="marin">Marin</option><option value="cedar">Cedar</option></select></label></>}
   <label className="companion-voice-choice">{t('Microphone language','لغة الميكروفون')}<select aria-label={t('Microphone language','لغة الميكروفون')} value={microphoneLanguage} onChange={e=>{stopListening();setMicrophoneLanguage(e.target.value);setStatus('');}}><option value="auto">{t('Match chat language','حسب لغة المحادثة')}</option><option value="en-US">English</option><option value="ar-LB">لبناني · Lebanese Arabic</option></select></label>
   {(synth||naturalAvailable)?<>{source==='device'&&[['en-US',t('English voice','الصوت الإنكليزي')],['ar-LB',t('Arabic voice','الصوت العربي')]].map(([code,label])=><label key={code} className="companion-voice-choice">{label}<select aria-label={label} value={voiceChoices[code]||''} onChange={e=>{stopSpeech();setVoiceChoices(old=>({...old,[code]:e.target.value}));}}><option value="">{t('Automatic · best language match','تلقائي · حسب اللغة')}</option>{voices.filter(v=>v.lang.toLowerCase().startsWith(code.slice(0,2))).map(v=><option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>)}</select></label>)}
   <label className="companion-voice-choice">{t('Speaking speed','سرعة الكلام')}<select aria-label={t('Speaking speed','سرعة الكلام')} value={speed} onChange={e=>{stopSpeech();setSpeed(Number(e.target.value));}}><option value={0.85}>{t('Relaxed','هادي')}</option><option value={1}>{t('Normal','عادي')}</option><option value={1.1}>{t('Lively','سريع')}</option></select></label>
   <div className="companion-voice-controls"><button type="button" onClick={()=>speak('Hi! I’m here to help you plan your day.','en-US')}>{t('Preview English','جرّب الإنكليزي')}</button><button type="button" onClick={()=>speak('أهلا! أنا هون لساعدك ترتّب نهارك. شو بدّك نعمل اليوم؟','ar-LB')}>{t('Preview Arabic','جرّب العربي')}</button><button type="button" disabled={!answer||busy} onClick={()=>speak(answer)}>{t('Read last reply','اسمع آخر رد')}</button></div>
   </>:<p>{t('Spoken replies are unavailable in this browser.','قراءة الردود مش متاحة بهالمتصفح.')}</p>}
   <small>{t('Voices depend on your device; a Lebanese accent is not guaranteed. Your browser may process speech online. Audio is not stored by Yawmeh.','الأصوات حسب جهازك، واللهجة اللبنانية مش مضمونة. المتصفح ممكن يعالج الصوت أونلاين. يومي ما بيحفظ الصوت.')}</small>
  </div>}
  <p className="companion-voice-status" role="status" dir="auto">{ar?(arabicStatus[status]||status):status}</p>
 </div>;
}
