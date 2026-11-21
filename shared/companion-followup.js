import {arabiziRequest,arabiziRest} from './arabizi-requests.js';
import {commonRequestAlias} from './companion-requests.js';
import {naturalCapture} from './companion-capture.js';
export function normalizeFollowupText(text,{punctuation=true}={}){
 const normalized=text.trim().replace(/[٠-٩]/g,d=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/[۰-۹]/g,d=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[\u064B-\u065F\u0670]/g,'').replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').replace(/٫/g,'.').replace(/٬/g,'');
 return punctuation?normalized.replace(/[؟?!]+$/,'').trim():normalized;
}

export function draftCorrection(text){
 const q=normalizeFollowupText(text);let match;
 const patterns=[
  ['amount',/^(?:change|make|set)\s+(?:the\s+)?amount\s+(?:to\s+)?(.+)$/i],
  ['currency',/^(?:change|make|set)\s+(?:the\s+)?currency\s+(?:to\s+)?(.+)$/i],
  ['title',/^(?:rename (?:it|that)|(?:change|set) (?:the )?(?:title|name))\s+(?:to\s+)?(.+)$/i],
  ['date',/^(?:change|set)\s+(?:the\s+)?date\s+(?:to\s+)?(.+)$/i],
  ['time',/^(?:change|set)\s+(?:the\s+)?time\s+(?:to\s+)?(.+)$/i],
  ['amount',/^(?:غير|غيّر|عدل|خلي)\s+(?:المبلغ|المصروف)\s*(?:لـ?|الى)?\s*(.+)$/],
  ['currency',/^(?:غير|عدل|خلي)\s+العملة\s*(?:لـ?|الى)?\s*(.+)$/],
  ['title',/^(?:غير|عدل|خلي)\s+(?:الاسم|العنوان)\s*(?:لـ?|الى)?\s*(.+)$/],
  ['date',/^(?:غير|عدل|خلي)\s+(?:التاريخ|الموعد)\s*(?:لـ?|الى)?\s*(.+)$/],
  ['time',/^(?:غير|عدل|خلي)\s+(?:الوقت|الساعة)\s*(?:لـ?|الى)?\s*(.+)$/],
  ['auto',/^(?:(?:change|make|set)\s+(?:that|it)(?:\s+to)?|i meant|actually[, ]*|khalli(?:ha|h)?|8ayer(?:ha)?|ghayer(?:ha)?)\s+(.+)$/i],
  ['auto',/^(?:خليها|خليه|غيرها|غيره|قصدي|انا قصدي|لا قصدي)\s+(.+)$/],
 ];
 for(const [field,pattern] of patterns)if((match=q.match(pattern))){
  const originalTitle=field==='title'?text.trim().match(/^(?:rename (?:it|that)|(?:change|set) (?:the )?(?:title|name)|(?:غير|غيّر|عدل|عدّل|خلي|خلّي)\s+(?:الاسم|الإسم|العنوان))\s+(?:to\s+|الى\s+|إلى\s+|لـ\s*|ل\s+)?(.+)$/i):null;
  return {field,value:(originalTitle?.[1]||match[1]).trim()};
 }
 return null;
}

export function isLocalCompanionFollowup(text,context){
 const q=normalizeFollowupText(text);
 if(commonRequestAlias(text))return false;
 if(naturalCapture(text))return false;
 if(arabiziRequest(q)?.fresh)return false;
 if(/^(?:help me|write|rewrite|draft|translate|summarize|break down)\b/i.test(q)||/^(?:baddi|badde|bade|bdi|bde|bdee|bdde|bedde|beddi|sa3edne|se3edne|kteb|ektob|fasser|eshra7)\s+\S+\s+/i.test(q))return false;
 // A fresh request must escape an unfinished form instead of becoming its title.
 if(/^(?:(?:please|can you|could you)\s+)?(?:add|create|record|log|schedule|what|why|how|tell me|explain)\b/i.test(q)||/^(?:انا\s+)?(?:صرفت|دفعت|اشتريت|انفقت|قبضت|استلمت|وصلني|استلفت|وفرت|ضيف|اضف|سجل|شو|ليش|كيف)(?:\s|$)/.test(q))return false;
 return !!context?.field||!!draftCorrection(text)||/^(?:cancel|never mind|nevermind|الغي|الغيها|خلص بلاش|بلاها|لغّي|الغاء)[.!؟?\s]*$/i.test(q);
}

const builtInAliases={
 USD:['USD','$','dollar','dollars','dolar','buck','bucks','دولار','دولارات'],
 LBP:['LBP','ليرة','ليره','ل.ل','ليرة لبنانية','ليره لبنانيه','لبناني','ليرة لبناني','lebanese pound','lebanese pounds','lira','liret'],
};
const currencyKey=value=>normalizeFollowupText(value,{punctuation:false}).toLowerCase();
const aliasesFor=c=>[c.code,c.name,c.symbol,...(Object.hasOwn(builtInAliases,c.code)?builtInAliases[c.code]:[])].filter(Boolean);
const isoCurrencies=new Set(Intl.supportedValuesOf?.('currency')||['EUR','GBP']);
export function followupCurrency(value,catalog){
 const key=currencyKey(value);
 if(key==='$')return 'USD';
 const exactCode=catalog.find(c=>c.code.toLowerCase()===value.trim().toLowerCase()&&(!c.symbol||c.name||currencyKey(c.symbol)!==key));
 if(exactCode)return exactCode.code;
 const matches=catalog.filter(c=>aliasesFor(c).some(alias=>currencyKey(alias)===key));
 return matches.length===1?matches[0].code:null;
}

// Match currency markers next to the amount, leaving the entry title intact.
export function companionAmount(text,catalog,{whole=false,preferExplicit=false}={}){
 const aliases=catalog.flatMap(aliasesFor);
 const escapedAliases=[...new Set([...aliases,...aliases.map(currencyKey)])].sort((a,b)=>b.length-a.length)
  .map(alias=>alias.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'));
 const marker='(?:'+[...escapedAliases,'\\p{Sc}+'].join('|')+')';
 const number=String.raw`(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?`;
 const pattern=new RegExp(String.raw`(?:^|\s)(?:(${marker})\s*)?(${number})(?:\s*(${marker}))?(?=[,;.!?](?:\s|$)|\s|$)(?![.,]\d)`,preferExplicit?'giu':'iu');
 const matches=preferExplicit?[...text.matchAll(pattern)]:null;
 const match=matches?(matches.find(([,prefix,,suffix])=>prefix||suffix)||matches[0]):text.match(pattern);
 if(!match)return null;
 const [,prefix,digits,suffix]=match;
 const amount=Number(digits.replaceAll(',',''));
 if(amount<=0||amount>999999999)return null;
 const currency=followupCurrency(prefix||suffix||'',catalog);
 const start=match.index,end=start+match[0].length;
 const before=text.slice(0,start).trimEnd();
 const leadingCode=!prefix&&before.match(/(?:^|\s)([A-Z]{3})$/)?.[1];
 const followingCode=!suffix&&text.slice(end).match(/^\s+([A-Z]{3})(?=\s|$)/)?.[1];
 const unknownCode=code=>isoCurrencies.has(code)&&!followupCurrency(code,catalog);
 const index=unknownCode(leadingCode)?before.length-leadingCode.length:start;
 const stop=unknownCode(followingCode)?end+text.slice(end).match(/^\s+/)[0].length+followingCode.length:end;
 if(whole&&(text.slice(0,index).trim()||!/^[.!?؟]?$/.test(text.slice(stop).trim())))return null;
 const unknown=index!==start||stop!==end,explicit=!!(prefix||suffix||unknown);
 return {amount,currency,explicit,unresolved:explicit&&(unknown||!currency||!!(prefix&&suffix&&followupCurrency(suffix,catalog)!==currency)),index,length:stop-index};
}

export function followupClock(value){
 const q=normalizeFollowupText(arabiziRest(value)).replace(/^(?:at|الساعة|عالساعة)\s*/i,'').replace(/\b([ap])\.\s*m\.?$/i,'$1m').replace(/(?:المسا|مسا|بالليل)$/,'pm').replace(/(?:الصبح|صباحا|صباح)$/,'am');
 const match=q.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);if(!match)return null;
 let hour=Number(match[1]);const minute=Number(match[2]||0);if(minute>59)return null;
 if(match[3]){if(hour<1||hour>12)return null;hour=hour%12+(match[3].toLowerCase()==='pm'?12:0);}
 else if(!match[2]||hour>23)return null;
 return `${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}`;
}
