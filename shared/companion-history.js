import {z} from 'zod';
import {hasAccess} from './access.js';
import {companionDraftSchema as action,companionContextSchema as context} from './companion-ai.js';

const message=z.object({id:z.number().int().nonnegative(),question:z.string().max(1000),answer:z.string().max(24000),language:z.enum(['en','ar']),engine:z.enum(['gemini']).optional(),action:action.optional(),context:context.optional(),hasEnglishDetails:z.boolean().optional(),dismissed:z.boolean().optional(),saved:z.boolean().optional()});
const session=z.object({id:z.string().max(80),updated:z.number().finite(),messages:z.array(message).max(20),text:z.string().max(1000),context,start:z.string().max(10),end:z.string().max(10)});
export const historyKey=key=>key+':history:v1';
export const historyScope=user=>['money','tasks'].filter(app=>hasAccess(user,app)).join(',');

export function readCompanionHistory(raw,user,now=Date.now()) {
 try{
  if(!raw||raw.length>1000000)return [];
  const value=JSON.parse(raw);
  if(value.scope!==historyScope(user)||!Array.isArray(value.sessions))return [];
  return value.sessions.slice(0,5).flatMap(row=>{
   const parsed=session.safeParse(row);
   if(!parsed.success||now-row.updated>30*86400000||row.updated>now+60000)return [];
   const result=parsed.data;
   const permitted=draft=>!draft||hasAccess(user,draft.type==='task'?'tasks':'money');
   if(!permitted(result.context?.draft)||result.messages.some(m=>!permitted(m.action)||!permitted(m.context?.draft)))return [];
   return [result];
  }).sort((a,b)=>b.updated-a.updated);
 }catch{return [];}
}

export function writeCompanionHistory(sessions,user) {
 const kept=sessions.slice(0,5);let value;
 do{value=JSON.stringify({scope:historyScope(user),sessions:kept});if(value.length<=1000000)return value;kept.pop();}while(kept.length);
 return JSON.stringify({scope:historyScope(user),sessions:[]});
}

export function rememberConversation(sessions,current) {
 if(!current.messages.length&&!current.text.trim())return sessions.filter(s=>s.id!==current.id);
 return [current,...sessions.filter(s=>s.id!==current.id)].slice(0,5);
}
