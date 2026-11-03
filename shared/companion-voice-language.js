export function microphoneLocale(choice,chatLanguage){return choice==='ar-LB'||choice==='en-US'?choice:chatLanguage==='ar'?'ar-LB':'en-US';}
export function replyLocale(reply,fallback='en'){
 if(reply?.language==='ar'||reply?.language==='en')return reply.language==='ar'?'ar-LB':'en-US';
 return /\p{Script=Arabic}/u.test(reply?.answer||'')?'ar-LB':fallback==='ar'?'ar-LB':'en-US';
}
export function selectDeviceVoice(voices,locale,preferred){
 const matching=voices.filter(v=>v.lang.toLowerCase().startsWith(locale.slice(0,2)));
 return matching.find(v=>v.voiceURI===preferred)||matching.find(v=>v.lang.toLowerCase()===locale.toLowerCase())||matching.find(v=>v.localService)||matching.find(v=>v.default)||matching[0];
}
