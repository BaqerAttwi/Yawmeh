// Recognize statements about the user's own records and leave questions alone.
export function naturalCapture(question){
 const phrase=question.trim()
  .replace(/^(?:(?:oh\s+)?thanks[,.!]\s*|(?:sage|osage|nova|pip)[,.]\s*)+/i,'')
  .replace(/^[\s,]*(?:please\s+)?(?:so,?\s+)?/i,'')
  .replace(/[.!?؟]+$/u,'').trim();
 const dated=phrase.match(/^(today|yesterday|\d{4}-\d{2}-\d{2}),?\s+(.+)$/i);
 const text=dated?.[2]||phrase;
 const match=text.match(/^(?:(i(?:\s+have|['’]ve)?)(?:\s+(?:just|already))?\s+)?(spent|spend|paid|payed|was charged|bought|purchased|earned|received|got paid|remind me|set a reminder|log an expense|record a purchase)(?:[,:]\s*|\s+|$)(.*)$/i);
 if(!match)return null;
 const [,subject,word,value]=match;
 const verb=word.toLowerCase();
 if(verb==='spend'&&!subject)return null;
 const withDate=details=>dated?`${details} ${dated[1]}`.trim():details;
 if(verb==='remind me'||verb==='set a reminder')return {type:'task',details:withDate(value.replace(/^(?:to|for|about)\s+/i,''))};
 if(/[?؟]$/.test(question.trim()))return null;
 const type=/^(earned|received|got paid)$/.test(verb)?'income':'expense';
 const paidBack=(verb==='paid'||verb==='payed')&&/\bback\b/i.test(value);
 if(paidBack||/\b(?:refund(?:ed)?|reimburs(?:ed|ement)|borrowed|loan|paid back|payment back|repayment)\b/i.test(value)||/^(?:back|me back)\b/i.test(value)){
  return {type,issue:'This sounds like a refund, reimbursement, or repayment. Check the original transaction in Money before recording it.'};
 }
 if(/\b(?:every|each|per)\s+(?:day|week|month|year|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b|\b(?:daily|weekly|monthly|annually|a week|a month)\s*$/i.test(value)){
  return {type,issue:'Is this one payment or a recurring bill? For one payment, give the amount and date. For a recurring subscription, say “add subscription” and include the amount.'};
 }
 const details=value.replace(/^it(?:\s+on\s+|$)/i,'');
 return {type,details:withDate(details),requiresAmountMarker:/^(?:bought|purchased)$/.test(verb)&&!/\bfor\s+\d/i.test(value)};
}

const ones=['one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
const tens=['twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
const small=`(?:${tens.join('|')})(?:[ -](?:${ones.slice(0,9).join('|')}))?|(?:${ones.join('|')})`;
const numberWords=new RegExp(`^(?:(${ones.slice(0,9).join('|')}) hundred(?: (?:and )?(${small}))?|(${small}))(?=\\s|[.!?]|$)`,'i');

// Keep word amounts bounded and require a dollar marker in a full statement.
export function normalizeSpokenMoney(text,{bare=false}={}){
 const match=text.match(numberWords);
 if(!match)return text;
 const tail=text.slice(match[0].length);
 if(!/^\s+(?:dollars?|bucks?|USD)\b/i.test(tail)&&!(bare&&/^[.!?\s]*$/.test(tail)))return text;
 if(/^\s+(?:dollars?|bucks?|USD)\s+and\s+(?:a\s+half\b|[\w -]+\s+cents?\b)/i.test(tail))return text;
 const [,hundreds,remainder,standalone]=match;
 const [first,second]=(remainder||standalone||'').toLowerCase().split(/[ -]/);
 const tensIndex=tens.indexOf(first);
 const value=(hundreds?(ones.indexOf(hundreds.toLowerCase())+1)*100:0)
  +(tensIndex<0?ones.indexOf(first)+1:(tensIndex+2)*10+(second?ones.indexOf(second)+1:0));
 return value+tail;
}
