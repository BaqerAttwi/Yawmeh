import {hasAccess} from './access.js';

export function guidanceGoal(question,context){
 const q=question.trim().toLowerCase().replace(/[أإآ]/g,'ا').replace(/[؟?!.]+$/,'');
 if(context?.goal&&/^(?:tasks?|planning|my day|مهام|المهام|يومي|نهاري)$/.test(q))return 'tasks';
 if(context?.goal&&/^(?:money|finances|spending|مصاري|المصاري|مصاريف|المصاريف)$/.test(q))return 'money';
 if(/^(?:i (?:need|want) (?:some )?help|help me|i (?:do not|don't) know (?:what to do|where to start)|ساعدني|بدي مساعدة|مش عارف (?:شو اعمل|من وين بلش))$/.test(q))return 'choose_topic';
 if(/(?:too much to do|too many tasks|overwhelmed (?:by|with) (?:my )?tasks|organize my (?:day|tasks)|عندي كتير (?:شغل|مهام)|مش ملحق (?:شغلي|مهامي)|رتبلي (?:يومي|نهاري))/.test(q))return 'tasks';
 if(/(?:manage my money|control my spending|reduce my spending|organize my finances|help (?:me )?(?:with )?my money|رتبلي مصرياتي|نظم مصرياتي|خفف مصاريفي|بدي نظم مصرياتي)/.test(q))return 'money';
 return null;
}

export function guidanceReply(user,goal){
 if(goal!=='choose_topic'&&!hasAccess(user,goal==='tasks'?'tasks':'money'))return {answer:goal==='tasks'?'Your account does not have Tasks access.':'Your account does not have Money access.'};
 const available=['tasks','money'].filter(app=>hasAccess(user,app));
 if(!available.length)return {answer:'Your account has no Money or Tasks access.'};
 if(goal==='choose_topic'&&available.length===1)goal=available[0];
 return {answer:goal==='tasks'?'Let’s make this manageable. Would you like a plan from your tasks, to add a task, or to review overdue work? Nothing changes until you confirm.':goal==='money'?'What would help most: check your budget, record an expense, or find saving opportunities from your records? Nothing changes until you confirm.':'What would you like help with: your tasks or your money? Choose one, or describe what you want to achieve.',context:{goal}};
}

export function guidanceChoices(goal,user,language){
 const ar=language==='ar';
 const options=goal==='tasks'?[['plan my day','Plan my day','رتّب يومي'],['add task','Add a task','ضيف مهمة'],['show overdue tasks','Review overdue work','راجع المهام المتأخرة']]:goal==='money'?[['budget status','Check my budget','راجع ميزانيتي'],['add expense','Record an expense','سجّل مصروف'],['how can I save more','Find saving opportunities','وين فيني وفّر؟']]:[['tasks','Tasks','المهام'],['money','Money','المصاري']].filter(([app])=>hasAccess(user,app));
 if(goal!=='choose_topic'&&!hasAccess(user,goal==='tasks'?'tasks':'money'))return [];
 return options.map(([question,en,arabic])=>({question,label:ar?arabic:en}));
}
