// Shared, curated vocabulary. Add aliases here instead of adding a regex for
// every spelling. Only the command prefix and its object are normalized.
const definitions=[
 ['want','bade','prefix','ar',['baddi','badde','bade','badi','bdi','bde','bdee','bdde','bedde','beddi','بدي','بدّي']],
 ['polite','please','prefix','en',['please','pls','plz','can you','could you','would you']],
 ['polite_ar','bade','prefix','ar',['law sama7et','iza fik','لو سمحت','بليز']],
 ['add','add','verb','en',['add','ad','create','record','log','make','schedule']],
 ['add_ar','zid','verb','ar',['zid','zed','zide','zedi','zidi','zeed','zidli','zidile','dif','difi','diif','ضيف','اضف','أضف','زيد','زيدي','ضيفي']],
 ['spent_ar','sarfet','action','ar',['sarfet','saraft','sraft','sereft','sarraft','daf3et','dafa3et','dfa3et','dfa3t','defe3et']],
 ['received_ar','2ebedt','action','ar',['2ebedt','2ebedet','2abadet','2badet','2abadt','2abedet','estalamet','istalamet']],
 ['remind_ar','zakerne','action','ar',['zakerne','zakerni','zakkerni','zakkerne','zakkirne']],
 ['saved_ar','waffaret','action','ar',['waffaret','wafaret']],
 ['subscription','subscription','object','neutral',['subscription','subscriptions','sub','subscrption','suscription','subskription','subskripshen','sobskription','eshtirak','ishtirak','اشتراك','الاشتراك','سبسكريبشن','سابسكريبشن']],
 ['task','task','object','neutral',['task','tasks','todo','to-do','mohimme','mohimma','mahame','مهمة','مهمه','المهمة']],
 ['expense','expense','object','neutral',['expense','expenses','purchase','purchases','masrouf','masroof','مصروف','مصاريف']],
 ['income','income','object','neutral',['income','earnings','dakhel','دخل']],
 ['savings','savings','object','neutral',['saving','savings','tawfir','tawfeer','مدخرات','توفير']],
 ['budget','budget','object','neutral',['budget','budgets','ميزانية','ميزانيه']],
 ['withdrawal','withdrawal','object','neutral',['withdrawal','withdrawals','سحب']],
 ['item','item','object','neutral',['item','items','صنف']],
 ['what_ar','shou','question','ar',['shu','shou','shoo','chou','shouu']],
 ['how_ar','kif','question','ar',['kif','keef']],
 ['how_much_ar','adde','question','ar',['adde','addeh','addesh','2adde','2addeh','2addesh']],
 ['where_ar','wein','question','ar',['wein','wen']],
 ['hello_ar','marhaba','greeting','ar',['marhaba','mar7aba','ahlan','ahla','مرحبا']],
 ['hello_en','hello','greeting','en',['hello','hi','hey','hii','heyy']],
 ['thanks_ar','merci','thanks','ar',['merci','mersi','mercii']],
 ['thanks_en','thanks','thanks','en',['thanks','thank you','thx','thanx','ty']],
];
export const chatDictionary=Object.freeze(definitions.map(([id,canonical,role,language,aliases])=>Object.freeze({id,canonical,role,language,aliases:Object.freeze(aliases)})));
const fold=value=>value.normalize('NFKD').replace(/\p{M}|\u0640/gu,'').toLowerCase().replace(/[أإآ]/g,'ا').replace(/[,،:]+$/,'');
const repeated=value=>value.replace(/([a-z\p{Script=Arabic}])\1+/gu,'$1');

// One insertion, deletion, substitution or adjacent transposition. Bounded to
// short Latin command words; not applied to values, names, currencies or dates.
function oneEdit(a,b){
 if(a===b)return true;if(Math.abs(a.length-b.length)>1)return false;
 if(a.length===b.length){const diff=[];for(let i=0;i<a.length;i++)if(a[i]!==b[i])diff.push(i);return diff.length===1||diff.length===2&&diff[1]===diff[0]+1&&a[diff[0]]===b[diff[1]]&&a[diff[1]]===b[diff[0]];}
 const short=a.length<b.length?a:b,long=a.length<b.length?b:a;let i=0,j=0,skipped=false;
 while(i<short.length&&j<long.length){if(short[i]===long[j]){i++;j++;}else{if(skipped)return false;skipped=true;j++;}}
 return true;
}
export function dictionaryWord(value,roles){
 const word=fold(value),entries=chatDictionary.filter(row=>roles.includes(row.role));
 const unique=(matches,kind)=>{const ids=new Set(matches.map(row=>row.id));return ids.size===1?{entry:matches[0],kind}:null;};
 const exact=entries.filter(row=>row.aliases.some(alias=>fold(alias)===word));if(exact.length)return unique(exact,'alias');
 if(!/^[a-z23789\p{Script=Arabic}]{3,32}$/u.test(word)||!/[a-z\p{L}]/u.test(word))return null;
 const stretched=entries.filter(row=>row.aliases.some(alias=>repeated(fold(alias))===repeated(word)));
 if(stretched.length)return unique(stretched,'spelling');
 if(!/^[a-z]{5,32}$/.test(word))return null;
 return unique(entries.filter(row=>row.aliases.some(alias=>/^[a-z]{5,32}$/.test(fold(alias))&&oneEdit(word,fold(alias)))),'typo');
}
export function dictionaryLanguageHints(language){return chatDictionary.filter(row=>row.language===language).flatMap(row=>row.aliases.filter(alias=>!alias.includes(' ')));}

export function normalizeChatRequest(input){
 const text=String(input),tokens=Array.from(text.matchAll(/"[^"]*"|'[^']*'|«[^»]*»|\S+/g));
 const changes=[];let cursor=0;
 const at=roles=>{
  if(cursor>=Math.min(tokens.length,7)||/^["'«]/.test(tokens[cursor][0]))return null;
  const pair=tokens[cursor+1]&&!/^["'«]/.test(tokens[cursor+1][0])?dictionaryWord(tokens[cursor][0]+' '+tokens[cursor+1][0],roles):null;
  const result=pair||dictionaryWord(tokens[cursor][0],roles);if(!result)return null;
  const count=pair?2:1,start=tokens[cursor].index,end=tokens[cursor+count-1].index+tokens[cursor+count-1][0].length;
  changes.push({start,end,from:text.slice(start,end),to:result.entry.canonical,kind:result.kind,concept:result.entry.id});cursor+=count;return result;
 };
 for(let i=0;i<3;i++){const previous=cursor;if(!at(['prefix'])){cursor=previous;break;}}
 if(at(['action'])){
  let normalized=text;for(const change of [...changes].reverse())normalized=normalized.slice(0,change.start)+change.to+normalized.slice(change.end);
  return {text:normalized,changes:changes.filter(change=>change.from!==change.to)};
 }
 if(!at(['verb'])){
  if(!at(['question','greeting','thanks']))return {text,changes:[]};
  let normalized=text;for(const change of [...changes].reverse())normalized=normalized.slice(0,change.start)+change.to+normalized.slice(change.end);
  return {text:normalized,changes:changes.filter(change=>change.from!==change.to)};
 }
 // Preserve familiar articles/prepositions; the parser already understands them.
 for(let i=0;i<3&&tokens[cursor]&&/^(?:to|the|a|an|my|new|quick|3a|3al|3ala|el|al)$/i.test(tokens[cursor][0]);i++)cursor++;
 if(!at(['object']))return {text,changes:[]};
 let normalized=text;for(const change of [...changes].reverse())normalized=normalized.slice(0,change.start)+change.to+normalized.slice(change.end);
 return {text:normalized,changes:changes.filter(change=>change.from!==change.to)};
}
