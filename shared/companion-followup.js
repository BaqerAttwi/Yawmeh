import {arabiziRequest,arabiziRest} from './arabizi-requests.js';
import {commonRequestAlias} from './companion-requests.js';
export function normalizeFollowupText(text){
 return text.trim().replace(/[٠-٩]/g,d=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/[۰-۹]/g,d=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[\u064B-\u065F\u0670]/g,'').replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').replace(/٫/g,'.').replace(/٬/g,'').replace(/[؟?!]+$/,'').trim();
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
 if(arabiziRequest(q)?.fresh)return false;
 if(/^(?:help me|write|rewrite|draft|translate|summarize|break down)\b/i.test(q)||/^(?:baddi|badde|bade|bdi|bde|bdee|bdde|bedde|beddi|sa3edne|se3edne|kteb|ektob|fasser|eshra7)\s+\S+\s+/i.test(q))return false;
 // A fresh request must escape an unfinished form instead of becoming its title.
 if(/^(?:(?:please|can you|could you)\s+)?(?:add|create|record|log|schedule|what|why|how|tell me|explain|i (?:spent|paid|earned|received))\b/i.test(q)||/^(?:انا\s+)?(?:صرفت|دفعت|قبضت|استلمت|استلفت|وفرت|ضيف|اضف|سجل|شو|ليش|كيف)\s/.test(q))return false;
 return !!context?.field||!!draftCorrection(text)||/^(?:cancel|never mind|nevermind|الغي|الغيها|خلص بلاش|بلاها|لغّي|الغاء)[.!؟?\s]*$/i.test(q);
}

export function followupCurrency(value,catalog){
 const normalized=normalizeFollowupText(arabiziRest(value)).toLowerCase();
 const code=/^(?:دولار|دولارات|dollars?|dolar|usd|\$)$/.test(normalized)?'USD':/^(?:ليرة|ليره|ليرة لبنانية|ليره لبنانيه|لبناني|ليرة لبناني|lebanese pounds?|lira|liret|lbp)$/.test(normalized)?'LBP':normalized;
 const matches=catalog.filter(c=>[c.code,c.name,c.symbol].some(v=>v&&v.toLowerCase()===code.toLowerCase()));
 return matches.length===1?matches[0].code:null;
}

export function followupClock(value){
 const q=normalizeFollowupText(arabiziRest(value)).replace(/^(?:at|الساعة|عالساعة)\s*/i,'').replace(/\b([ap])\.\s*m\.?$/i,'$1m').replace(/(?:المسا|مسا|بالليل)$/,'pm').replace(/(?:الصبح|صباحا|صباح)$/,'am');
 const match=q.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);if(!match)return null;
 let hour=Number(match[1]);const minute=Number(match[2]||0);if(minute>59)return null;
 if(match[3]){if(hour<1||hour>12)return null;hour=hour%12+(match[3].toLowerCase()==='pm'?12:0);}
 else if(!match[2]||hour>23)return null;
 return `${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}`;
}
