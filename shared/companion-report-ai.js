import {hasAccess} from './access.js';
import {commonRequestAlias} from './companion-requests.js';
import {normalizeLebanese} from './lebanese-companion.js';

// Only explicit read-only requests can reach the AI report endpoint.
export function companionReportRequest(question,user){
 const alias=commonRequestAlias(question)||question;
 const command=(normalizeLebanese(alias).question||alias).trim().toLowerCase()
  .replace(/[.!?؟]+$/u,'').replace(/^(?:please\s+|(?:can|could) you\s+|help me\s+)+/,'');
 if(hasAccess(user,'tasks')&&/^(?:(?:(?:how can i|how should i) )?plan (?:my day|today|tomorrow)|organize what i should do|what should i do (?:today|tomorrow))$/.test(command)){
  const tomorrow=command.endsWith('tomorrow');
  return {kind:'day_plan',command:tomorrow?'plan tomorrow':'plan my day',tomorrow};
 }
 if(hasAccess(user,'money')&&/^(?:(?:how can i |how do i )?(?:save (?:more|money)|spend less|reduce my spending)|saving tips|where does my money go|(?:recommend|suggest) (?:ways to save(?: money)?|how i can save))$/.test(command)){
  return {kind:'saving_advice',command:'how can I save more'};
 }
 if(/^(?:weekly report|report(?: (?:today|yesterday|this week|last week|this month|last month))?)$/.test(command)
    &&(hasAccess(user,'money')||hasAccess(user,'tasks'))){
  return {kind:'review',command};
 }
 return null;
}
