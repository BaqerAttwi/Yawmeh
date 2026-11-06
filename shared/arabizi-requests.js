import {languageProfile} from './lebanese-language.js';
// Normalize known request words, not arbitrary names or every 2/3/7 in a string.
const words={
 lyom:'اليوم',lyoum:'اليوم',lyawm:'اليوم',elyom:'اليوم',elyoum:'اليوم',bokra:'بكرا',bukra:'بكرا',bekra:'بكرا',mbereh:'مبارح',mberih:'مبارح',mbarah:'مبارح',mbara7:'مبارح',embe7:'مبارح',
 dollar:'دولار',dollars:'دولار',dolar:'دولار',dolars:'دولار',lira:'ليرة',liret:'ليرة',lire:'ليرة',
 da2aye2:'دقيقة',d2aye2:'دقيقة',de2i2a:'دقيقة',d2i2a:'دقيقة',minutes:'دقيقة',mins:'دقيقة',halla2:'هلق',hala2:'هلق',a3mol:'اعمل',e3mol:'اعمل',khalaset:'خلصت',khallaset:'خلصت',
 se3a:'الساعة',se3et:'الساعة',sa3a:'الساعة',masa:'المسا',masaa:'المسا',sobe7:'الصبح',soboh:'الصبح',sabah:'الصبح',
 '3a':'على','3ala':'على','3al':'على',for:'على',mn:'من',men:'من',
};
const outsideQuotes=(text,fn)=>text.split(/("[^"]*"|'[^']*'|«[^»]*»)/g).map((part,i)=>i%2?part:fn(part)).join('');
export function arabiziRest(text){
 return outsideQuotes(text,part=>part.replace(/\b(?:ba3d|baad|ba3ed)\s*(?:bokra|bukra)\b/gi,'بعد بكرا')
  .replace(/\b(?:3al\s*se3a|3alse3a|3al\s*sa3a|el\s+se3a)\b/gi,'الساعة')
  .replace(/\b(?:bel\s+(?:lel|leil)|bil\s+lel)\b/gi,'المسا')
  .replace(/\b(?:hal\s+shaher|halshaher|halshahr)\b/gi,'هالشهر').replace(/\b(?:hal\s+esbou3|halesbou3)\b/gi,'هالاسبوع')
  .replace(/\b3al([a-z][a-z0-9]*)\b/gi,(_,name)=>'على '+name)
  .replace(/\b(?:[a-z]+[23789]?[a-z]*|[23789][a-z]+)\b/gi,token=>words[token.toLowerCase()]||token)
  .replace(/(\d+(?:\.\d{1,2})?)\s*\$/g,'$$$1')
  .replace(/\b(?:b|bi)\s+(?=\$?\d)/gi,''));
}

export function arabiziRequest(input){
 let text=input.trim().replace(/^(?:ya\s+)?(?:sage|nova|pip)[,:!]?\s+/i,'');
 text=text.replace(/^(?:(?:ana|ena|baddi|badde|bade|badi|bdi|bde|bdee|bdde|bedde|beddi|please|plz|pls|fini|fine|fik|fiki|fina|law sama7et|iza fik)[,\s]+)+/i,'');
 let match;
 if((match=text.match(/^(?:esrof|esref|esraf|eshtere|eshtre)\s+(.+)$/i)))return {question:'فيني اصرف '+arabiziRest(match[1]),fresh:true};
 if((match=text.match(/^(sarfet|saraft|sraft|sereft|sarraft|daf3et|dafa3et|dfa3et|dfa3t|defe3et|2ebedt|2ebedet|2abadet|2badet|2abadt|2abedet|estalamet|istalamet|zakerne|zakerni|zakkerni|zakkerne|zakkirne|waffaret|wafaret)\s+(.+)$/i))){
  const verb=match[1].toLowerCase(),command=/^s|^d/.test(verb)?'صرفت':/^z/.test(verb)?'ذكرني':/^w/.test(verb)?'وفرت':'قبضت';
  return {question:command+' '+arabiziRest(match[2]),fresh:true};
 }
 if((match=text.match(/^(?:zid|zed|zide|zedi|zidi|zeed|zidli|zidile|dif|difi|diif|add)\s+(?:(?:3al?|3ala|to|the|el|al)\s*)?(subscription|subscriptions|subskription|subskripshen|sobskription|eshtirak|ishtirak|task|tasks|mohimme|mohimma|mahame|expense|masrouf|masroof|income|dakhel|savings?|tawfir|tawfeer)\s*(.*)$/i))){
  if(/^add\b/i.test(text)&&languageProfile(input).language!=='ar')return null;
  const noun=match[1].toLowerCase(),kind=/sub|sobs|shtirak/.test(noun)?'اشتراك':/task|mohim|maham/.test(noun)?'مهمة':/income|dakhel/.test(noun)?'دخل':/saving|tawf/.test(noun)?'مدخرات':'مصروف';
  return {question:'ضيف '+kind+' '+arabiziRest(match[2]),fresh:true};
 }
 if((match=text.match(/^(?:a3ref|e3raf|e3ref|a3rif)\s+(.+)$/i)))text=match[1];
 if(/^(?:shu|shou|shoo|chou|adde|addeh|addesh|2adde|2addeh|2addesh|kif|keef|wein|wen|sa3edne|se3edne|ratteb|rattibli|nazem|3ande|3andi|3ende|3endi|3ndi)\b/i.test(text)){
  const query=arabiziRest(text).replace(/\b(?:shu|shou|shoo|chou)\b/gi,'شو').replace(/\b(?:adde|addeh|addesh|2adde|2addeh|2addesh)\b/gi,'قديش')
   .replace(/\b(?:3ande|3andi|3ende|3endi|3ndi)\b/gi,'عندي').replace(/\b(?:sarfet|saraft|sraft)\b/gi,'صرفت')
   .replace(/\b(?:waffaret|wafaret)\b/gi,'وفرت').replace(/\b(?:masare|masari|masriyeti|masreyeti)\b/gi,'مصاري').replace(/\b(?:ma3e|ma3i)\b/gi,'معي')
   .replace(/\b(?:kif|keef)\b/gi,'كيف').replace(/\b(?:wein|wen)\b/gi,'وين').replace(/\b(?:waffer|waffar|waffir)\b/gi,'وفر')
   .replace(/\b(?:fini|fine)\b/gi,'فيني').replace(/\b(?:ratteb|rattibli|nazem)\b/gi,'رتب').replace(/\b(?:yomi|yawmi|nahare|nahari)\b/gi,'يومي')
   .replace(/\b(?:sa3edne|se3edne)\b/gi,'ساعدني');
  return {question:query,fresh:true};
 }
 if(/^(?:kifak|kifik|kifek|keefak|kifkon|marhaba|ahlan|ahla)[.!?\s]*$/i.test(text))return {question:'مرحبا',fresh:false};
 if(/^(?:cancel|khalas balash|balaha|elghi|elgha)[.!?\s]*$/i.test(text))return {question:'cancel',fresh:false};
 return null;
}
