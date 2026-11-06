// Lightweight, explainable hints; not a trained language classifier.
import {dictionaryLanguageHints,normalizeChatRequest} from './chat-dictionary.js';
// A digit in a product name (B2B, GPT4, 2FA) is not evidence of Arabizi.
const strong=new Set(`ratteb rattibli nazem 2aren ahdef fare2 esrof esref esraf eshtre eshtere baddi badde bade badi bdi bde bdee bdde zed zedi bedde beddi baddee baddei sarfet saraft sraft sereft sarraft daf3et dafa3et dfa3et dfa3t defe3et 2ebedt 2ebedet 2abadet 2badet 2abadt 2abedet zakerne zakerni zakkerni zakkerne zakkirne shou shu shoo chou shouu kifak kifik kifek keefak kifkon marhaba ahlan ahla habibi 7abibi 7abibe b7eb b7ebb b7ebbak 3ande 3andi 3ende 3endi 3ndi 3am 3amb 3ayez 3ayze ma3e ma3i ma3ak ma3ik ya3ne yaane ya3ni y3ne ya3ni leish lesh lech leh wein wen lyom lyoum lyawm elyom elyoum bokra bukra bekra mbereh mberih mbarah mbara7 embe7 masare masari masriyeti masreyeti masriyet masriyyet tawfir tawfeer waffaret wafaret waffar waffer waffir 2adde 2addeh 2addesh adde addeh addesh addi adeish ade a3ref e3raf e3ref a3rif 7atet 7ott 7ot 7otti zid zide zidi zeed zidli zidile dif diif khalliha khalli kheliha 8ayer ghayer 8ayyer ghayyer 8ayerha sa3edne se3edne sa3edni mesh mish mch mosh hala2 halla2 halla2a hal2a halla2 halshaher halshahr halesbou3 hal2osbou3 se3a se3et de2i2a d2i2a d2aye2 da2aye2`.split(/\s+/));
const weak=new Set('ana ena fi fik fiki fina fini fine w ma la eh ya men min ktir kteer merci yalla aktar hek heik hayda hayde haydi hol holi'.split(' '));
const english=new Set('i my me the a an what how why when where who show add create record log call visit meet called named bought read buy save task tasks expense expenses income subscription subscriptions savings budget plan day please can could would you your is are do does did have spent paid received earned help explain tell need want remind this that it in about written speak speaking tomorrow today yesterday for from with on at to and'.split(' '));
const neutral=/^(?:(?:ok(?:ay)?|yes|no|yep|sure|thanks?|thx|merci|done|cancel|تمام|اوكي|اوك|نعم|لا|شكرا|يسلمو)[.!؟?\s]*)$/i;
const fold=word=>word.toLowerCase().replace(/([a-z])\1{2,}/g,'$1$1');
for(const word of dictionaryLanguageHints('ar'))if(word!=='merci')strong.add(word);

export function languageProfile(text='',fallback='en'){
 const raw=String(text).normalize('NFKC').replace(/[\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g,'').trim();
 const base={language:fallback==='ar'?'ar':'en',script:'neutral',mixed:false};
 if(!raw||neutral.test(raw))return base;
 const clean=raw.replace(/https?:\/\/\S+|www\.\S+|[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi,' ');
 const tokens=clean.match(/[\p{L}\p{N}]+/gu)||[];
 const letters=tokens.filter(t=>/\p{L}/u.test(t));
 const arabic=letters.filter(t=>/\p{Script=Arabic}/u.test(t));
 const latin=letters.filter(t=>/[a-z]/i.test(t));
 let strongCount=0,weakCount=0,englishCount=0;
 const hints=normalizeChatRequest(clean).text.match(/[\p{L}\p{N}]+/gu)||[];
 for(let i=0;i<hints.length;i++){
  const word=fold(hints[i]);
  if(strong.has(word)&&word!=='3am')strongCount++;
  if(weak.has(word))weakCount++;
  if(english.has(word))englishCount++;
 }
 // Keep currency-only, date-only and short entity replies in the conversation language.
 if(!letters.length||letters.every(t=>/^(?:usd|lbp|eur|gbp|dollars?|dolar|lira|liret|am|pm|دولار|دولارات|ليرة|ليره)$/i.test(t)))return base;
 const arabizi=strongCount>0&&(englishCount<4||strongCount>=2)||weakCount>=2&&englishCount<2;
 if(arabic.length){
  const language=englishCount>=3&&arabic.length===1&&!arabizi?'en':'ar';
  return {language,script:'arabic',mixed:latin.length>0};
 }
 if(arabizi)return {language:'ar',script:'arabizi',mixed:englishCount>0};
 if(englishCount||latin.length>=3)return {language:'en',script:'latin',mixed:false};
 return {...base,script:latin.length?'latin':'neutral'};
}

export function detectedCompanionLanguage(preference,text='',fallback='en'){
 return preference==='en'||preference==='ar'?preference:languageProfile(text,fallback).language;
}
