import {workspaceText} from "../lib/workspace-text.js";
import {GettingStarted} from '../features/demo/GettingStarted.jsx';
import {TutorialDialog} from '../features/demo/TutorialDialog.jsx';
import {DemoGuides} from '../features/demo/DemoGuides.jsx';
import {CreationGuide} from '../features/demo/CreationGuide.jsx';
import {GuideAvatar} from '../features/demo/GuideAvatar.jsx';
import {IncomeAllocation} from '../components/IncomeAllocation.jsx';
import {WithdrawalAmount} from '../components/WithdrawalAmount.jsx';
import {randomId} from '../../../shared/id.js';
import {formText} from '../../../shared/companion-form-language.js';
import {Currencies,CurrencyFields} from '../features/settings/Currencies.jsx';
import {CurrencyReport} from '../components/CurrencyReport.jsx';
import {TransactionDetailsDialog} from '../features/money/TransactionDetailsDialog.jsx';
import {MoneyCategoryField,moneyCategories} from '../features/money/MoneyCategoryField.jsx';
import {MoneyReviewQueue} from '../features/money/MoneyReviewQueue.jsx';
import {receiptDrafts,removeReceiptDraft,storeReceiptDraft} from '../lib/receipt-review.js';
import {MonthlyMoney} from '../features/money/MonthlyMoney.jsx';
import {BudgetOverview} from '../features/money/BudgetOverview.jsx';
import {SpendingBalance,TodayMoneySummary} from '../components/SpendingBalance.jsx';
import {formatMoney,rateLabel,currencyOf,captureRates,savedRates,currencyCatalog} from '../../../shared/currency.js';
import {Everyday} from '../features/today/Everyday.jsx';
import {Sessions} from '../features/settings/Sessions.jsx';
import {InstallApp} from '../features/settings/InstallApp.jsx';
import {ReportEmails} from '../features/settings/ReportEmails.jsx';
import {ThemePreference} from '../features/settings/ThemePreference.jsx';
import {WorkspaceControls} from '../features/settings/WorkspaceControls.jsx';
import {PasswordForm} from '../features/auth/PasswordForm.jsx';
import {CompanionChat} from '../features/assistant/CompanionChat.jsx';
import {SavedItems} from '../features/money/SavedItems.jsx';
import {CompanionChangeReview} from '../features/assistant/CompanionChangeReview.jsx';
import {canReviewChange,changeCandidates,changeTable,companionChangeSchema} from '../../../shared/companion-changes.js';

import {Stat,CardTitle,Empty,Donut,Field} from '../components/ui.jsx';
import {SetupStatus} from '../features/settings/SetupStatus.jsx';
import {mutateAndRefresh,SaveStateError} from '../lib/mutation.js';
import {canSyncOffline,newOfflineEntry,offlineAccount,offlineKind,pendingEntries,queueChanged,rememberOfflineAccount,retryableEntryError,storeOfflineEntry,syncOfflineEntries} from '../lib/offline-entries.js';
import {OfflineQueue} from '../features/settings/OfflineQueue.jsx';
import {TodayScreen} from '../features/today/Today.jsx';
import {closeDayValues} from '../../../shared/today.js';
import '../styles/today.css';
import {DailyLife} from '../features/daily/DailyLife.jsx';
import {mergePlan,captureSchema,rescheduleSchema,rescheduled} from '../../../shared/daily.js';
import '../styles/daily.css';
import {BudgetAlerts,DayCheckIn,Forecasts,SubscriptionReview,History} from '../features/insights/Insights.jsx';
import {checkVoid} from '../../../shared/insights.js';
import '../styles/insights.css';
import React,{lazy,Suspense,useState,useEffect,useRef,useMemo} from 'react';

import {LayoutDashboard,Wallet,CheckSquare,Sparkles,Settings,ArrowUpRight,ArrowDownLeft,Plus,ChevronDown,ChevronRight,ArrowRight,X,Search,Bell,CalendarDays,PiggyBank,MoreHorizontal,Coffee,ShoppingBag,Repeat,Mail,Check,LogOut,Download,Target,Leaf,Users,Play,Compass,Menu,FileChartColumn} from 'lucide-react';
import {balances,cents,today,periodSummary,checkEntry,nextRenewal,daysUntil,DEFAULT_TASK_CATEGORIES,taskCategory} from '../../../shared/domain.js';
import {demoData} from '../features/demo/data.js';
import {entrySchema,expenseItem,schemas,taskCategorySchema} from '../../../shared/validation.js';
import {request,demoAdmin} from '../features/auth/Auth.jsx';
import {DemoTrailer} from '../features/demo/DemoTrailer.jsx';
import {hasAccess,visibleData,APP_LABELS} from '../../../shared/access.js';
import '../styles/styles.css';
import '../styles/access.css';
import '../features/settings/settings-workspace.css';
import '../styles/navigation.css';
import {TaskCategoryField,TaskCategoryBreakdown} from '../features/tasks/TaskCategories.jsx';
import {PlanningTaskRow,SavingsGoals,WeeklyReview,PlanningCalendar} from '../features/planning/Planning.jsx';
import {completeDemoTask,checkGoalMove,checkUnassignedWithdrawal,PlannerError} from '../../../shared/planner.js';
import {subtaskSchema} from '../../../shared/validation.js';
import '../styles/planning.css';
const Reports=lazy(()=>import('../features/reports/Reports.jsx').then(module=>({default:module.Reports})));
const UserManager=lazy(()=>import('../features/users/UserManager.jsx').then(module=>({default:module.UserManager})));
const pageLoading=<p className="muted" role="status">Loading…</p>;
const money=formatMoney;
const dateLabel=d=>new Date(d+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'});
const pageDateFormats={
 en:new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'}),
 ar:new Intl.DateTimeFormat('ar',{month:'short',day:'numeric',year:'numeric',numberingSystem:'latn',timeZone:'UTC'}),
};
function pageDateLabel(language,start,end=start){
 const format=pageDateFormats[language==='ar'?'ar':'en'];
 const from=new Date(start+'T12:00:00Z'),to=new Date(end+'T12:00:00Z');
 return from<=to?format.formatRange(from,to):[from,to].filter(date=>Number.isFinite(+date)).map(date=>format.format(date)).join(' – ');
}
const categories=moneyCategories;
const pages={overview:{name:'Overview',icon:LayoutDashboard},money:{name:'Money',icon:Wallet},tasks:{name:'Tasks',icon:CheckSquare},reports:{name:'Reports',icon:FileChartColumn},users:{name:'Users & access',icon:Users},settings:{name:'Settings',icon:Settings}};
export default function App({session}){
 const {mode,onLogout,onExpired,onPreview}=session,user=session.user;
 const can=app=>hasAccess(user,app);
 const allowed=page=>page!=='assistant'&&(page==='overview'||page==='settings'||(page==='users'?user.role==='admin':page==='reports'?(can('money')||can('tasks')):can(page)));
 const demoKey=user.id==='demo-admin'?'daywell-demo':'daywell-demo-'+user.id;
 const [isPhone,setIsPhone]=useState(()=>window.matchMedia('(max-width:700px)').matches),[sidebarOpen,setSidebarOpen]=useState(()=>!window.matchMedia('(max-width:700px)').matches);
 const navigationToggle=useRef();
 const languageKey='yawmeh:workspace-language:'+mode+':'+user.id;
 const [language,setLanguage]=useState(()=>{try{return localStorage.getItem(languageKey)||null;}catch{return null;}});
 const t=workspaceText(language||document.documentElement.lang);
 const [receiptQueue,setReceiptQueue]=useState(()=>mode==='live'&&can('money')?receiptDrafts(user.id):[]);
 useEffect(()=>{
   if(mode!=='live'||!can('money'))return;
   const reloadDrafts=event=>{
     if(event.key===null||event.key.startsWith('yawmeh:receipt-review:'+user.id+':'))setReceiptQueue(receiptDrafts(user.id));
   };
   window.addEventListener('storage',reloadDrafts);
   return()=>window.removeEventListener('storage',reloadDrafts);
 },[mode,user.id,user.permissions]);
 function switchLanguage(){
   const next=(language||document.documentElement.lang)==='ar'?'en':'ar';
   setLanguage(next);
   try{localStorage.setItem(languageKey,next);localStorage.setItem('daywell-companion:'+mode+':'+user.id+':language',next);}catch{}
   window.dispatchEvent(new CustomEvent('yawmeh:workspace-language',{detail:next}));
 }
 useEffect(()=>{const media=window.matchMedia('(max-width:700px)'),resize=()=>{setIsPhone(media.matches);setSidebarOpen(!media.matches);};media.addEventListener('change',resize);return()=>media.removeEventListener('change',resize);},[]);
 useEffect(()=>{if(!sidebarOpen)return;const escape=event=>{if(event.key==='Escape'&&!document.querySelector('dialog[open],.companion-chat-panel')){closeNavigation();}};document.addEventListener('keydown',escape);return()=>document.removeEventListener('keydown',escape);},[sidebarOpen]);
 function closeNavigation(){setSidebarOpen(false);requestAnimationFrame(()=>navigationToggle.current?.focus());}
 function showTutorials(){if(isPhone)closeNavigation();setTutorials(true);}
 function showTrailer(){if(isPhone)closeNavigation();setTrailer(true);}
 function showGuide(){if(isPhone)closeNavigation();setGettingStarted(true);}
 const [gettingStarted,setGettingStarted]=useState(false),[guideActive,setGuideActive]=useState(false);
 const [showFirstBalance,setShowFirstBalance]=useState(false);
 const [firstTaskId,setFirstTaskId]=useState(null);
 const [tutorials,setTutorials]=useState(false),[trailer,setTrailer]=useState(false),[overviewTab,setOverviewTab]=useState('checkin');
 async function signOut(){try{await onLogout();}catch(e){setError(e.message);}}
 const [page,setPage]=useState('overview'),[data,setData]=useState(()=>{if(mode==='live')return visibleData(session.data,user);let saved;try{saved=JSON.parse(localStorage.getItem(demoKey));}catch{}return visibleData(saved||{...demoData(),settings:{name:user.name,email:''}},user);}),[launcher,setLauncher]=useState(false),[modal,setModal]=useState(null),[lastSaved,setLastSaved]=useState(null),[toast,setToast]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[filter,setFilter]=useState(can('money')?(can('tasks')?'all':'money'):'tasks'),[tab,setTab]=useState('transactions'),[query,setQuery]=useState(''),[taskFilter,setTaskFilter]=useState('all'),[categoryFilter,setCategoryFilter]=useState('');
 const mutationBusy=useRef(false),refreshLock=useRef(false);const [needsRefresh,setNeedsRefresh]=useState(false),[,tickClock]=useState(0);
 const offlineMoney=mode==='live'&&can('money'),offlineTasks=mode==='live'&&can('tasks');
 const offlineEnabled=offlineMoney||offlineTasks;
 const [offline,setOffline]=useState(()=>!navigator.onLine),[queued,setQueued]=useState([]),[offlineReady,setOfflineReady]=useState(false);
 const showOfflinePanel=offline||queued.some(record=>record.error);
 const retrySync=useRef(()=>{});

 useEffect(()=>{
   if(mode!=='live')return;
   rememberOfflineAccount(offlineEnabled?{id:String(user.id),tasks:offlineTasks,currency:data.settings.last_currency,currencies:offlineMoney?currencyCatalog(data.settings).map(({code,rate})=>({code,rate})):[]}:null);
 },[mode,user.id,offlineEnabled,offlineMoney,offlineTasks,data.settings.current_rate,data.settings.custom_currencies,data.settings.last_currency]);
 useEffect(()=>{
   if(!offlineEnabled||!import.meta.env.PROD||!navigator.serviceWorker||!window.caches)return;
   let active=true;
   const check=async()=>{
     const cached=await caches.match('/offline.html',{ignoreSearch:true}).catch(()=>null);
     if(active)setOfflineReady(!!(navigator.serviceWorker.controller&&offlineAccount()?.id===String(user.id)&&cached));
   };
   navigator.serviceWorker.addEventListener('controllerchange',check);
   void check();
   return()=>{active=false;navigator.serviceWorker.removeEventListener('controllerchange',check);};
 },[offlineEnabled,user.id]);
 useEffect(()=>{
   if(!offlineEnabled)return;
   const controller=new AbortController();
   const allowed=record=>canSyncOffline(record,{money:offlineMoney,tasks:offlineTasks});
   const update=()=>setQueued(pendingEntries(user.id).filter(allowed));
   const sync=async()=>{
     setOffline(!navigator.onLine);
     if(!navigator.onLine||mutationBusy.current||!pendingEntries(user.id).some(record=>!record.error&&allowed(record)))return;
     mutationBusy.current=true;
     setBusy(true);
     let saved=false;
     try{
       await syncOfflineEntries(user.id,(value,kind)=>api('/'+kind,'POST',value,{signal:controller.signal}),()=>{saved=true;},allowed);
       if(saved&&!controller.signal.aborted){
         setData(await api('/data','GET',undefined,{signal:controller.signal}));
         refreshLock.current=false;setNeedsRefresh(false);setLastSaved(new Date());
         notify('Offline records synced');
       }
     }catch(e){
       if(!controller.signal.aborted){
         if(saved){refreshLock.current=true;setNeedsRefresh(true);}
         setError(saved?'Offline records synced. Refresh to see your latest records.':e.message);
       }
     }finally{
       mutationBusy.current=false;
       setBusy(false);
       if(!controller.signal.aborted)update();
     }
   };
   retrySync.current=sync;
   const timer=setInterval(sync,15000);
   const events=['online','offline','focus'];
   for(const event of events)window.addEventListener(event,sync);
   window.addEventListener(queueChanged,update);
   window.addEventListener('storage',update);
   update();
   void sync();
   return()=>{
     controller.abort();
     retrySync.current=()=>{};
     clearInterval(timer);
     for(const event of events)window.removeEventListener(event,sync);
     window.removeEventListener(queueChanged,update);
     window.removeEventListener('storage',update);
   };
 },[offlineEnabled,offlineMoney,offlineTasks,user.id]);
 useEffect(()=>{const tick=()=>tickClock(n=>n+1);const id=setInterval(tick,30000);window.addEventListener('focus',tick);return()=>{clearInterval(id);window.removeEventListener('focus',tick);};},[]);
 const current=today();const [start,setStart]=useState(current.slice(0,7)+'-01'),[end,setEnd]=useState(new Date(Number(current.slice(0,4)),Number(current.slice(5,7)),0,12).toLocaleDateString('en-CA'));
 const taskCategories=useMemo(()=>[...new Set([...DEFAULT_TASK_CATEGORIES,...data.tasks.map(taskCategory)])],[data.tasks]);
 const filteredTasks=useMemo(()=>{
  if(page!=='tasks')return [];
  const search=query.toLowerCase();
  return data.tasks.filter(task=>{
   const category=taskCategory(task);
   return (!categoryFilter||category===categoryFilter)&&(taskFilter==='all'||(taskFilter==='today'?task.due===current:taskFilter==='completed'?!!task.completed:!task.completed))
    &&(task.title+' '+category).toLowerCase().includes(search);
  }).sort((a,b)=>a.completed-b.completed||a.due.localeCompare(b.due));
 },[page,data.tasks,categoryFilter,taskFilter,current,query]);
 useEffect(()=>{if(mode==='demo'){try{localStorage.setItem(demoKey,JSON.stringify(data));}catch{setError('This browser could not save the demo records. Export your data before closing the page.');}}},[data,mode]);
 useEffect(()=>{window.scrollTo(0,0);},[page]);
 useEffect(()=>{if(categoryFilter&&!taskCategories.includes(categoryFilter))setCategoryFilter('');},[data.tasks,categoryFilter]);
 useEffect(()=>{
   if(!toast||busy)return;
   const timer=setTimeout(()=>setToast(null),toast.undoId==null?4000:10000);
   return()=>clearTimeout(timer);
 },[toast,busy]);
 const b=useMemo(()=>balances(data.entries),[data.entries]),summary=useMemo(()=>periodSummary(data,start,end),[data.entries,data.tasks,start,end]);
 const upcoming=data.subscriptions.filter(s=>s.active).sort((a,b)=>a.renewal.localeCompare(b.renewal));
 async function api(path,method='GET',body,options){try{return await request(path,method,body,options);}catch(e){if(e.code==='ACCOUNT_INACTIVE')session.onInactive?.();else if(e.status===401)onExpired();throw e;}}

 function notify(message,undoId){setToast({message,undoId});}
 async function refreshRecords(){if(mutationBusy.current)return;mutationBusy.current=true;setBusy(true);try{setData(await api('/data'));refreshLock.current=false;setNeedsRefresh(false);setError('');notify('Records refreshed. Review the latest changes before retrying.');}catch(e){setError(e.message);}finally{mutationBusy.current=false;setBusy(false);}}
 async function change(action){
   if(mutationBusy.current)return false;
   if(refreshLock.current&&!action.offlineEntry){setError('Refresh your records before making another change.');return false;}
   mutationBusy.current=true;setError('');setBusy(true);
   let receipt;
   try{
     if(mode==='live'){
       if(action.offlineEntry&&globalThis.crypto?.randomUUID){
         const kind=action.path.slice(1);
         const record=newOfflineEntry(user.id,kind==='inbox'?{...action.value,captured_on:current}:action.value,kind,action.value.offline_sync?.id);
         let queuedLocally=!navigator.onLine||pendingEntries(user.id).some(entry=>!entry.error&&offlineKind(entry)===kind);
         if(!queuedLocally){
           try{receipt=await api(action.path,'POST',record.value);}
           catch(e){if(!retryableEntryError(e))throw e;queuedLocally=true;}
         }
         if(queuedLocally){
           storeOfflineEntry(record);action.onQueued?.();setModal(null);notify('Saved on this device · pending sync');
           return true;
         }
         try{
           setData(await api('/data'));
           refreshLock.current=false;setNeedsRefresh(false);
         }catch{throw new SaveStateError('Your change was saved, but the latest records could not be loaded. Refresh your records before making another change.','saved');}
       }else setData(await mutateAndRefresh(api,action,result=>{receipt=result;}));
     }else{
       const next=structuredClone(data);
       receipt=action.demo(next);
       setData(next);
     }
     modal?.onSaved?.(receipt);setModal(null);setLastSaved(new Date());
     const message=typeof action.message==='function'?action.message(receipt):action.message;
     notify(message||'Saved successfully',action.undoPurchase?receipt?.id:undefined);
     return true;
   }catch(e){
     if(e instanceof SaveStateError){
       refreshLock.current=true;setNeedsRefresh(true);
       if(e.state==='saved'){modal?.onSaved?.(receipt);setModal(null);}
     }
     setError(e.message);
     return e instanceof SaveStateError&&e.state==='saved';
   }finally{mutationBusy.current=false;setBusy(false);}
 }

 function addEntry(value,message='Transaction recorded',undoPurchase=false){
   const {save_as_item,item_price_usd}=value;
   const draftId=modal?.type==='expense'?modal.initial.receipt?.draftId:undefined;
   const offlineEntry=offlineMoney&&['income','expense'].includes(value.type)&&!!globalThis.crypto?.randomUUID;
   let item;
   value={note:'',category:'Other',...value,amount:Number(value.amount),saved:Number(value.saved||0)};
   try{
     value=entrySchema.parse(value);
     item=expenseItem(value,{save_as_item,item_price_usd});
     captureRates(value,data.settings);
     if(offlineEntry&&(!navigator.onLine||pendingEntries(user.id).some(entry=>!entry.error&&offlineKind(entry)==='entries'))){
       if(value.saved>value.amount)throw new Error('Savings allocation cannot exceed income.');
     }else checkEntry(value,data.entries);
     checkUnassignedWithdrawal(value,data.entries,data.goal_moves);
     if(value.date>current)throw new Error('Transactions cannot be dated in the future.');
   }catch(e){setError(e.issues?.map(i=>i.message).join('; ')||e.message);return;}
   const payload=item?{...value,save_as_item:true,item_price_usd:item.amount}:value;
   return change({
     path:'/entries',value:draftId?{...payload,offline_sync:{id:draftId,account:String(user.id)}}:payload,offlineEntry,
     onQueued:draftId?()=>clearSavedReceiptDraft(draftId):undefined,
     message:item?'Expense recorded and item saved':message,undoPurchase,
     demo:d=>{
       let id=Date.now();
       while(d.entries.some(entry=>entry.id===id))id++;
       d.entries.push({...captureRates(value,d.settings),id});
       if(item)d.items.unshift({...item,id:randomId()});
       d.settings.last_currency=value.currency;
       return {id};
     },
   });
 }
 function logSavedPurchase(item){
   if(!can('money')||mutationBusy.current)return;
   return addEntry({
     type:'expense',title:item.title,amount:item.amount,category:item.category,date:current,currency:'USD',
   },`${item.title} recorded · ${money(cents(item.amount))} USD`,true);
 }
 function add(table,value){try{value=schemas[table].parse(value);}catch(e){setError(e.issues.map(i=>i.message).join('; '));return false;}return change({path:'/'+table,value,offlineEntry:offlineTasks&&table==='tasks',demo:d=>{const {subtasks,...record}=value;const id=randomId();d[table].unshift({...record,id,...(table==='tasks'?{completed:0}:{}),...(table==='subscriptions'?{active:1}:{})});if(table==='tasks')d.subtasks.push(...subtasks.map(title=>({id:randomId(),task_id:id,title,completed:0})));return {id};}});}
 function toggleTask(t){return change({path:'/tasks/'+t.id,method:'PATCH',value:{completed:!t.completed},demo:d=>completeDemoTask(d,t.id,!t.completed,current),message:t.completed?'Task reopened':t.recurrence&&t.recurrence!=='none'?'Done! Your next occurrence is ready.':'One more thing done. Nice work!'});}
 function changeRecurrence(task,recurrence){return change({path:'/tasks/'+task.id+'/recurrence',method:'PATCH',value:{recurrence},demo:d=>{d.tasks.find(t=>t.id===task.id).recurrence=recurrence;},message:recurrence==='none'?'Repeating stopped':'Repeat schedule updated'});}
 function addSubtask(task,title){const parsed=subtaskSchema.safeParse({title});if(!parsed.success){setError(parsed.error.issues[0].message);return false;}return change({path:'/tasks/'+task.id+'/subtasks',value:parsed.data,demo:d=>{if(task.completed)throw new PlannerError('Reopen the task before adding subtasks.');if(d.subtasks.filter(s=>s.task_id===task.id).length>=30)throw new PlannerError('A task can have up to 30 subtasks.');d.subtasks.push({id:randomId(),task_id:task.id,title:parsed.data.title,completed:0});},message:'Small step added'});}
 function toggleSubtask(task,part){return change({path:'/tasks/'+task.id+'/subtasks/'+part.id,method:'PATCH',value:{completed:!part.completed},demo:d=>{if(task.completed)throw new PlannerError('Reopen the task before changing its subtasks.');d.subtasks.find(s=>s.id===part.id).completed=!part.completed;},message:'Checklist updated'});}
 function moveGoal(goal,value){return change({path:'/goals/'+goal.id+'/moves',value,demo:d=>{checkGoalMove(goal,d.entries,d.goal_moves,value);d.goal_moves.push({...value,id:randomId(),goal_id:goal.id,date:current});},message:value.kind==='fund'?'Savings assigned to your goal':'Savings released back to your balance'});}

 function finishToday(value){return change({path:'/day_plans/today/close',value,demo:d=>{const result=closeDayValues(d,current,value);if(result.alreadyClosed)return;for(const move of result.moves)Object.assign(d.tasks.find(t=>t.id===move.id),move);const index=d.day_plans.findIndex(p=>p.date===current);if(index<0)d.day_plans.push({...result.plan,id:randomId()});else d.day_plans[index]=result.plan;},message:'Today is wrapped up. Your plan is saved.'});}
 function reopenToday(){return change({path:'/day_plans/today/reopen',value:{},demo:d=>{const plan=d.day_plans.find(p=>p.date===current);if(plan)plan.closed_at=null;},message:'Today reopened; moved tasks keep their dates'});}
 function savePlan(date,patch){return change({path:'/day_plans/'+date,method:'PATCH',value:patch,demo:d=>{const index=d.day_plans.findIndex(p=>p.date===date),value=mergePlan(d.day_plans[index],patch,d.tasks,date);if(index<0)d.day_plans.push({...value,id:randomId()});else d.day_plans[index]=value;},message:'Daily plan saved'});}
 function captureNote(text){const parsed=captureSchema.safeParse({text});if(!parsed.success){setError(parsed.error.issues[0].message);return false;}return change({path:'/inbox',value:parsed.data,offlineEntry:offlineTasks,demo:d=>d.inbox.unshift({...parsed.data,id:randomId(),date:current,archived:0,task_id:null}),message:'Thought captured'});}
 function archiveNote(note,archived){return change({path:'/inbox/'+note.id,method:'PATCH',value:{archived},demo:d=>{d.inbox.find(n=>n.id===note.id).archived=archived;},message:archived?'Note archived; you can restore it':'Note restored'});}
 function convertNote(note,due){return change({path:'/inbox/'+note.id+'/convert',value:{due},demo:d=>{rescheduleSchema.parse({due});const n=d.inbox.find(n=>n.id===note.id);if(n.task_id)return;const id=randomId();d.tasks.unshift({id,title:n.text.slice(0,160),note:n.text,category:'Personal',due,priority:'medium',recurrence:'none',estimate_minutes:0,reminder:null,scheduled_time:null,completed:0});n.task_id=id;n.archived=1;},message:'Task ready; original note kept in Archived notes'});}
 function moveTask(task,due){return change({path:'/tasks/'+task.id+'/reschedule',method:'PATCH',value:{due},demo:d=>{rescheduleSchema.parse({due});const t=d.tasks.find(t=>t.id===task.id);Object.assign(t,rescheduled(t,due));},message:'Task moved, with its reminder'});}
 function saveDetail(table,record,field,value){return change({path:'/'+table+'/'+record.id+'/'+field,method:'PATCH',value:{[field]:value},demo:d=>{d[table].find(r=>r.id===record.id)[field]=value;},message:'Plan updated'});}
 function editEntry(entry,review=false){setError('');setModal({type:'entryDetails',entry,review});}
 function saveEntryDetails(entry,value){
   return change({path:'/entries/'+entry.id+'/details',method:'PATCH',value,message:t(value.reviewed?'Transaction reviewed':'Transaction updated'),demo:d=>{
     const record=d.entries.find(item=>String(item.id)===String(entry.id)&&!item.voided_on);
     if(!record)throw new Error('Active record not found.');
     Object.assign(record,value);
     if(value.reviewed||value.category!=='Other')record.category_review_requested=false;
   }});
 }
 function clearSavedReceiptDraft(id){
   try{removeReceiptDraft(user.id,id);}catch{/* The stable submission ID prevents a duplicate if this draft reappears. */}
   setReceiptQueue(queue=>queue.filter(draft=>draft.id!==id));
 }
 function reviewReceiptDraft(draft){
   open('expense',{...draft.initial,receipt:{...draft.initial.receipt,draftId:draft.id}},draft.language,()=>clearSavedReceiptDraft(draft.id));
 }
 function discardReceiptDraft(draft){
   if(!window.confirm(t('Discard this receipt draft?')))return;
   try{removeReceiptDraft(user.id,draft.id);setReceiptQueue(receiptDrafts(user.id));}
   catch{setError(t('This browser could not discard the receipt draft.'));}
 }
 function openCompanionAction(type,initial,entryLanguage,onSaved){
   if(type!=='expense'||!initial?.receipt)return open(type,initial,entryLanguage,onSaved);
   try{
     const draft=storeReceiptDraft(user.id,{...initial,date:current},entryLanguage);
     setReceiptQueue(receiptDrafts(user.id));
     reviewReceiptDraft(draft);
   }catch{
     open(type,initial,entryLanguage,onSaved);
     notify(t('This browser could not save the receipt draft. You can still review it now.'));
   }
 }
 function voidEntry(entry,reason,message='Transaction reversed; original retained in history'){return change({path:'/entries/'+entry.id+'/void',value:{reason},demo:d=>{const record=checkVoid(d.entries,d.goal_moves,entry.id,reason);record.voided_on=current;record.void_reason=reason.trim();},message});}
 function undoQuickPurchase(){
   if(!can('money')||toast?.undoId==null||mutationBusy.current)return;
   const entry=data.entries.find(item=>String(item.id)===String(toast.undoId)&&item.type==='expense'&&!item.voided_on);
   if(entry)voidEntry(entry,'Undid quick purchase','Purchase undone');
 }
 function recategorize(task,category){const parsed=taskCategorySchema.safeParse(category);if(!parsed.success){setError(parsed.error.issues[0].message);return;}category=parsed.data;change({path:'/tasks/'+task.id+'/category',method:'PATCH',value:{category},demo:d=>{d.tasks.find(t=>t.id===task.id).category=category;},message:'Task category updated'});}
 function renew(s,payment={}){
   const currency=payment.currency||'USD',amount=Number(payment.amount??s.amount);
   const unit_rate=Number(payment.unit_rate||1),rate_reference=payment.rate_reference||'USD';
   return change({
     path:`/subscriptions/${s.id}/renew`,value:{renewal:s.renewal,currency,amount,unit_rate,rate_reference},
     demo:d=>{
       const subscription=d.subscriptions.find(record=>record.id===s.id&&record.active);
       if(!subscription)throw new Error('Active subscription not found.');
       if(subscription.renewal!==s.renewal)throw new Error('This renewal has already been recorded.');
       const renewal=nextRenewal(subscription.renewal,subscription.cycle);
       let id=Date.now();
       while(d.entries.some(entry=>entry.id===id))id++;
       const entry=entrySchema.parse({currency,unit_rate,rate_reference,type:'expense',title:subscription.title+' renewal',amount,saved:0,date:current,category:subscription.category,note:'Renewal for '+subscription.renewal});
       checkEntry(entry,d.entries);
       d.entries.push({...captureRates(entry,d.settings),id});
       d.settings.last_currency=currency;
       subscription.renewal=renewal;
       return {renewal};
     },
     message:receipt=>receipt?.renewal?`Payment recorded. Next renewal is ${receipt.renewal}.`:'Payment recorded and renewal date updated',
   });
 }
 function open(type,initial={},entryLanguage=(page==='money'||isToday)&&language==='ar'?'ar':'en',onSaved){setError('');setModal({type,language:entryLanguage,onSaved,initial:{currency:data.settings.last_currency||'USD',...initial}});}
 function cancelTask(task,cancelled){return change({path:'/tasks/'+task.id+'/cancel',method:'PATCH',value:{cancelled},demo:d=>{d.cancelled_tasks??=[];if(cancelled){d.tasks=d.tasks.filter(t=>t.id!==task.id);d.cancelled_tasks.push({...task,cancelled:true});}else{d.cancelled_tasks=d.cancelled_tasks.filter(t=>t.id!==task.id);d.tasks.push({...task,cancelled:false});}},message:cancelled?'Task cancelled. Restore it in Today.':'Task restored'});}
 function openChangeReview(proposal,language,onSaved){
   const parsed=companionChangeSchema.safeParse(proposal);
   if(!parsed.success||!canReviewChange(user,parsed.data))return;
   setError('');
   setModal({type:'companionChange',proposal:parsed.data,language,onSaved});
 }
 function confirmCompanionChange(record,value){
   if(modal?.type!=='companionChange'||mutationBusy.current)return;
   const proposal=modal.proposal;
   const currentRecord=changeCandidates(data,user,proposal).find(candidate=>candidate.id===record.id);
   if(!currentRecord){setError('This record changed. Close the review and try again.');return;}
   switch(proposal.operation){
     case 'cancelTask':
       if(currentRecord.completed){setError('Reopen the completed task before cancelling it.');return;}
       return cancelTask(currentRecord,true);
     case 'restoreTask': return cancelTask(currentRecord,false);
     case 'completeTask':
     case 'reopenTask': {
       if(!!currentRecord.completed===(proposal.operation==='completeTask')){
         setError('The task already has that status.');
         return;
       }
       return toggleTask(currentRecord);
     }
     case 'rescheduleTask': return moveTask(currentRecord,value);
     case 'categorizeTask': return recategorize(currentRecord,value);
     case 'repeatTask': return changeRecurrence(currentRecord,value);
     case 'addSubtask': return addSubtask(currentRecord,value);
     case 'estimateTask': return saveDetail('tasks',currentRecord,'estimate_minutes',Number(value));
     case 'reverseEntry': return voidEntry(currentRecord,value);
     case 'rename': {
       if(!value||value.length>160){setError('Enter a name with 1 to 160 characters.');return;}
       return saveDetail(changeTable(proposal),currentRecord,'title',value);
     }
     case 'pauseSubscription':
     case 'resumeSubscription': return setSubscriptionActive(currentRecord,proposal.operation==='resumeSubscription');
     case 'markRarelyUsed':
     case 'markRegularlyUsed': return saveDetail('subscriptions',currentRecord,'rarely_used',proposal.operation==='markRarelyUsed');
     case 'renewSubscription':
       if(!currentRecord.active){setError('Resume the subscription before recording a payment.');return;}
       return open('renew',currentRecord,modal.language,modal.onSaved);
     case 'archiveNote':
     case 'restoreNote': return archiveNote(currentRecord,proposal.operation==='archiveNote');
     case 'convertNote': return convertNote(currentRecord,value);
     case 'updateGoal': return saveDetail('goals',currentRecord,'monthly_amount',Number(value));
     case 'fundGoal':
     case 'releaseGoal': {
       if(Number(value)<=0){setError('Enter a positive amount.');return;}
       return moveGoal(currentRecord,{kind:proposal.operation==='fundGoal'?'fund':'release',amount:Number(value),note:''});
     }
   }
 }
 function setSubscriptionActive(subscription,active){
   return change({
     path:'/subscriptions/'+subscription.id,method:'PATCH',value:{active},
     demo:d=>{d.subscriptions.find(item=>item.id===subscription.id).active=active;},
     message:active?'Subscription resumed':'Subscription paused',
   });
 }
 function go(p){if(!allowed(p))return;if(isPhone)closeNavigation();setPage(p);setLauncher(false);setError('');setQuery('');}
 const filteredEntries=data.entries.filter(e=>e.date>=start&&e.date<=end&&(!query||(e.title+' '+e.category+' '+e.note).toLowerCase().includes(query.toLowerCase()))).sort((a,b)=>b.date.localeCompare(a.date)||b.id-a.id);
 function exportData(){const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`yawmeh-${current}.json`;a.click();URL.revokeObjectURL(url);notify('Data exported');}
 const taskIndex=useMemo(()=>{const parts=new Map(),parents=new Set();for(const part of data.subtasks){const rows=parts.get(part.task_id)||[];rows.push(part);parts.set(part.task_id,rows);}for(const task of data.tasks)if(task.previous_task_id)parents.add(task.previous_task_id);return {parts,parents};},[data.subtasks,data.tasks]);
 const isToday=page==='overview'&&overviewTab==='checkin';
 const firstTask=can('tasks')&&!data.tasks.length&&!data.cancelled_tasks.length;
 const firstIncome=can('money')&&!data.entries.some(entry=>entry.type==='income'&&!entry.voided_on);
 const savedFirstTask=can('tasks')&&firstTaskId!=null?data.tasks.find(task=>String(task.id)===String(firstTaskId)):null;
 function startFirstRecord(type){
   if(busy||needsRefresh||!(type==='task'?firstTask:type==='income'&&firstIncome))return;
   open(type,type==='task'?{due:current}:{firstIncome:true},'en',receipt=>{
     go('overview');
     setOverviewTab('checkin');
     if(type==='task')setFirstTaskId(receipt?.id??null);
     else setShowFirstBalance(true);
     window.scrollTo(0,0);
   });
 }
 const quickPurchases=data.items?.length>0&&<section className="quick-card quick-purchase-card">
   <h3>{t("Quick purchases")}</h3><p>{t("Tap an item to record one purchase today.")}</p>
   <div className="quick-items">{data.items.slice(0,4).map((item,i)=><button type="button" key={item.id} className="secondary" disabled={busy||needsRefresh} onClick={()=>logSavedPurchase(item)}>
     <span>{i===0?<Coffee size={18}/>:<ShoppingBag size={18}/>}</span>
     <strong>{t("Log {item}",{item:item.title})}</strong><small dir="ltr"><bdi>{money(cents(item.amount))} USD</bdi></small>
   </button>)}</div>
 </section>;
 const renderTask=task=><PlanningTaskRow language={language} key={task.id} task={task} parts={taskIndex.parts.get(task.id)||[]} hasNext={taskIndex.parents.has(task.id)} busy={busy} onToggle={toggleTask} onCategory={t=>open('taskCategory',t)} onRecurrence={changeRecurrence} onAddSubtask={addSubtask} onToggleSubtask={toggleSubtask} onSaveDetail={saveDetail} onReschedule={moveTask}/>;

 const TransactionTable=({entries})=><div className="table-wrap"><table><thead><tr><th>{t("Transaction")}</th><th>{t("Category")}</th><th>{t("Date")}</th><th className="right">{t("Amount")}</th></tr></thead><tbody>{entries.map(e=><tr key={e.id}><td><div className="transaction-name"><span className={'transaction-icon '+e.type}>{e.type==='expense'?<ShoppingBag size={17}/>:e.type==='withdrawal'?<PiggyBank size={17}/>:<ArrowDownLeft size={17}/>}</span><div><strong>{e.title}{e.voided_on?t(" · Reversed"):''}</strong><small>{e.type==='income'?t('Income · {amount} to savings',{amount:formatMoney(cents(e.saved),currencyOf(e),savedRates(e))}):e.type==='opening'?t("Added to savings"):e.type==='withdrawal'?t("Savings → spending"):t("Purchase")}{e.note&&' · '+e.note}<br/>{rateLabel(e)}</small>{!e.voided_on&&<button type="button" className="text-button" aria-label={t("Edit {name}",{name:e.title})} disabled={busy||needsRefresh} onClick={()=>editEntry(e)}>{t("Edit transaction")}</button>}</div></div></td><td><span className="category">{e.category}</span></td><td className="muted nowrap">{dateLabel(e.date)}</td><td className={'right amount '+(['income','opening'].includes(e.type)?'positive':'')}><bdi>{e.type==='expense'?'−':e.type==='withdrawal'?'↔':'+'}{formatMoney(cents(e.amount),currencyOf(e),savedRates(e))}</bdi></td></tr>)}</tbody></table>{!entries.length&&<Empty text={t("No transactions in this period. Add one to get started.")}/>}</div>;
 return <div className={`app-shell ${sidebarOpen?'sidebar-open':'sidebar-closed'}`} dir={language==='ar'?'rtl':language==='en'?'ltr':undefined} lang={language||undefined}><aside id="workspace-sidebar" className="sidebar" aria-label="Workspace navigation and companion"><button type="button" className="sidebar-close" aria-label="Close navigation" onClick={closeNavigation}><X size={20}/></button><a className="brand" aria-label="yawmeh.me home" href="#" onClick={e=>{e.preventDefault();go('overview');}}><img className="brand-logo" src="/branding/yawmeh-logo-small.webp" alt=""/><span className="brand-name">yawmeh.me</span></a>
 <div className="nav-label">Workspace</div>
 <nav>{Object.entries(pages).filter(([key])=>key!=='settings'&&allowed(key)).map(([key,pageInfo])=>
   <button key={key} className={page===key?'active':''} aria-label={pageInfo.name} data-tour={'nav-'+key} onClick={()=>go(key)}><pageInfo.icon size={16}/>{pageInfo.name}</button>
 )}</nav>
 <div className="nav-label help-label">Help</div>
 <nav className="help-nav"><button type="button" aria-label="Guide" onClick={showGuide}><Compass size={16}/>Guide &amp; tutorials</button></nav>
 {!guideActive&&<CompanionChat data={data} user={user} date={current} mode={mode} onAction={openCompanionAction} onChangeReview={openChangeReview}/>}
 <div className="sidebar-bottom"><button data-tour="nav-settings" className={'settings-nav '+(page==='settings'?'active':'')} onClick={()=>go('settings')}><Settings size={18}/>Settings</button><div className="profile"><span className="avatar">{data.settings.name.slice(0,2).toUpperCase()}</span><div><strong>{data.settings.name}</strong><small>Personal account</small></div><button className="icon-button" aria-label="Account settings" onClick={()=>go('settings')}><MoreHorizontal size={19}/></button></div></div></aside>{isPhone&&sidebarOpen&&<button type="button" className="sidebar-scrim" aria-label="Close navigation backdrop" onClick={closeNavigation}/>}
 <div className="main-shell" inert={isPhone&&sidebarOpen?true:undefined}><header className="topbar"><div className="topbar-leading"><button ref={navigationToggle} type="button" className="sidebar-toggle" aria-label={sidebarOpen?'Close navigation':'Open navigation'} aria-expanded={sidebarOpen} aria-controls="workspace-sidebar" onClick={()=>setSidebarOpen(value=>!value)}>{sidebarOpen?<X size={20}/>:<Menu size={20}/>}</button><div className="breadcrumb">Workspace <ChevronRight size={13}/><span>{pages[page].name}</span></div></div> <div className="topbar-actions">
   <details className="topbar-menu sync-menu">
     <summary className="sync-status" title={lastSaved?'Last saved '+lastSaved.toLocaleTimeString():undefined}>
       <i className={offline?'is-offline':queued.length?'is-pending':''} aria-hidden="true"/>
       <span>{offline?'Offline':needsRefresh?'Refresh needed':busy?'Saving…':queued.length?'Pending sync':offlineReady?'Synced · works offline':mode==='demo'?'Demo':'Synced'}</span>
     </summary>
     <div className="topbar-popover">{offlineEnabled
       ?<OfflineQueue compact records={showOfflinePanel?[]:queued} ready={offlineReady} offline={offline} busy={busy} onRetry={()=>void retrySync.current()}/>
       :<p>{mode==='demo'?'Changes are saved in this browser.':'Workspace is synced.'}</p>}</div>
   </details>
   <WorkspaceControls language={language||document.documentElement.lang} onLanguage={switchLanguage}/>
   {can('money')&&<button className="icon-button topbar-notifications" aria-label="Upcoming reminders" onClick={()=>{go('money');setTab('subscriptions');}}><Bell size={17}/>{upcoming.some(s=>daysUntil(s.renewal)<=3)&&<i className="notification-dot"/>}</button>}
   <div className="launcher-wrap"><button type="button" className="avatar small" aria-label="Account menu" aria-expanded={launcher} onClick={()=>setLauncher(!launcher)}>{data.settings.name.slice(0,2).toUpperCase()}</button>
     {launcher&&<div className="topbar-popover account-menu"><strong>{data.settings.name}</strong>
       <button type="button" onClick={()=>go('settings')}><Settings size={16}/>Settings</button>
       <details><summary>Open app launcher</summary><div className="account-app-links">{Object.entries(pages).filter(([key])=>key!=='settings'&&allowed(key)).map(([key,pageInfo])=><button key={key} onClick={()=>go(key)}><pageInfo.icon size={16}/>{pageInfo.name}</button>)}</div></details>
       <button type="button" onClick={signOut}><LogOut size={16}/>Sign out</button>
     </div>}
   </div>
 </div></header>
 <main className={page==='overview'&&overviewTab==='dashboard'?'dashboard-page':undefined}>{mode==='demo'&&<section className="demo-welcome-actions"><strong>You’re exploring demo data.</strong><button className="secondary" onClick={()=>session.onSignup?.()}>Create your account</button></section>}{mode==='demo'&&user.role!=='admin'&&<div className="preview-note"><span>Previewing {user.name}’s access: {user.permissions.filter(p=>p!=='assistant').map(p=>APP_LABELS[p]).join(', ')}</span><button className="text-button" onClick={()=>onPreview(demoAdmin)}>Back to admin demo <ArrowRight size={14}/></button></div>}<div className="page-heading">
   <div><p className="page-date">{page==='money'||page==='overview'&&overviewTab==='dashboard'?pageDateLabel(language||document.documentElement.lang,start,end):pageDateLabel(language||document.documentElement.lang,current)}</p>
   <h1>{t(page==='overview'?({checkin:'Today',dashboard:'Dashboard',history:'History',review:'Weekly review',calendar:'Calendar'}[overviewTab]):pages[page].name)}</h1></div>
   <div className="button-row">
     {page==='tasks'&&<><button className="secondary" onClick={showTrailer}><Play size={15}/>Watch demo</button><button data-tour="add-task" className="primary" onClick={()=>open('task')}><Plus size={15}/>{t("Add task")}</button></>}
     {page==='money'&&can('money')&&<><button className="secondary" data-tour={tab==='transactions'?'add-income':undefined} onClick={()=>open('income')}><Plus size={15}/>{t("Income")}</button><button className="primary" data-tour={tab==='transactions'?'add-expense':undefined} onClick={()=>open('expense')}><Plus size={15}/>{t("Expense")}</button></>}
     {page==='overview'&&!isToday&&can('money')&&<button className="primary" onClick={()=>open('transactionChoice')}><Plus size={15}/>{t("Add transaction")}</button>}
   </div>
 </div>
 {offlineEnabled&&showOfflinePanel&&<OfflineQueue records={queued} ready={offlineReady} offline={offline} busy={busy} onRetry={()=>void retrySync.current()}/>}
 {needsRefresh&&<div className="info-note" role="status">Refresh the latest records before making more changes.<button className="secondary" disabled={busy} onClick={refreshRecords}>Refresh records</button></div>}
 {error&&!modal&&<div className="error" role="alert">{error}<button className="icon-button" onClick={()=>setError('')} aria-label="Dismiss error"><X size={15}/></button></div>}
 {page==='overview'&&<nav className="overview-tabs" aria-label="Overview views">
   {[['checkin','Today'],['dashboard','Dashboard']].map(([key,title])=><button key={key} data-tour={key==='checkin'?'today-tab':undefined}
     className={overviewTab===key?'selected':''} aria-current={overviewTab===key?'page':undefined} onClick={()=>setOverviewTab(key)}>{t(title)}</button>)}
   <details className="overview-more">
     <summary className={['history','review','calendar'].includes(overviewTab)?'selected':undefined}>{t('More views')}<ChevronDown size={15} aria-hidden="true"/></summary>
     <div className="overview-menu">
       {[['calendar','Calendar'],['review','Weekly review'],['history','History']].map(([key,title])=><button key={key}
         aria-current={overviewTab===key?'page':undefined} onClick={event=>{const menu=event.currentTarget.closest('details');menu.open=false;menu.querySelector('summary').focus();setOverviewTab(key);}}>{t(title)}</button>)}
     </div>
   </details>
 </nav>}
 {can('money')&&!isToday&&(page==='overview'||page==='money')&&<BudgetAlerts language={language} data={data}/>}

 {isToday&&(can('money')||can('tasks'))&&<section className="today-actions" aria-label={t("Today's quick actions")}>
   {can('money')&&<TodayMoneySummary data={data} end={current} language={language}><section className="card today-panel today-balance" aria-label={t("Your spending balance")}>
     <SpendingBalance data={data} end={current} language={language}/>
     {showFirstBalance&&!firstIncome&&<button type="button" className="primary" disabled={busy||needsRefresh} onClick={()=>open('expense',{},language==='ar'?'ar':'en',()=>setShowFirstBalance(false))}>{t("Log an expense")}</button>}
   </section></TodayMoneySummary>}
   <div className="button-row">
     {can('money')&&<button type="button" className="primary" disabled={busy||needsRefresh} onClick={()=>open('transactionChoice')}><Plus size={17}/>{t("Add transaction")}</button>}
     {can('tasks')&&<button type="button" className={can('money')?'secondary':'primary'} disabled={busy||needsRefresh} onClick={()=>open('task',{due:current})}><Plus size={17}/>{t("Add task")}</button>}
     {can('money')&&<button type="button" className="secondary" disabled={busy||needsRefresh} onClick={()=>open('expense')}>{t("Log expense")}</button>}
   </div>
   {can('money')&&quickPurchases}
   {savedFirstTask&&<section className="card today-panel first-record" aria-label="Your first task">
     <h3>{t("Task saved")}</h3>
     <p><strong>{savedFirstTask.title}</strong> · Due {dateLabel(savedFirstTask.due)}</p>
   </section>}
   {(firstTask||firstIncome)&&<section className="card today-panel first-record">
     <h3>{t("Create your first record")}</h3>
     <p>{t("Pick what’s useful today. You can set up the rest whenever you’re ready.")}</p>
     <div className="button-row">
       {firstTask&&<button type="button" className="primary" disabled={busy||needsRefresh} onClick={()=>startFirstRecord('task')}>{t("Add my first task")}</button>}
       {firstIncome&&<button type="button" className="secondary" disabled={busy||needsRefresh} onClick={()=>startFirstRecord('income')}>{t("Set up my money")}</button>}
     </div>
   </section>}
 </section>}
 {isToday&&can('money')&&<BudgetAlerts language={language} data={data}/>}
 <GettingStarted firstTask={firstTask} firstIncome={firstIncome} onStartRecord={startFirstRecord} user={user} mode={mode} page={page} tab={tab} overviewTab={overviewTab} can={can} open={gettingStarted} onClose={()=>setGettingStarted(false)} onOpen={showGuide} onTutorials={()=>{setGettingStarted(false);showTutorials();}} onTrailer={()=>{setGettingStarted(false);showTrailer();}} onNavigate={step=>{go(step.page);if(step.overviewTab)setOverviewTab(step.overviewTab);if(step.tab)setTab(step.tab);}} onTourChange={setGuideActive}/>
 {page==='overview'&&overviewTab==='checkin'&&<TodayScreen language={language} data={data} user={user} busy={busy} error={error} renderTask={renderTask} onReviewPayment={subscription=>open('renew',subscription)} onAddTask={due=>open('task',{due})} onPlan={savePlan} onToggle={toggleTask} onSubtask={toggleSubtask} onCloseDay={finishToday} onReopen={reopenToday} tools={can('tasks')&&<DailyLife language={language} data={data} busy={busy} onPlan={savePlan} onCapture={captureNote} onArchive={archiveNote} onConvert={convertNote} onAdd={v=>add('tasks',v)} onToggle={toggleTask} onSubtask={toggleSubtask} onReschedule={moveTask}/>}/>}
 {page==='overview'&&overviewTab==='checkin'&&<details className="card overview-disclosure"><summary>{t('Suggestions and setup')}</summary><div className="overview-details"><Everyday language={language} data={data} user={user} current={current} mode={mode} open={open} busy={busy} moveTask={moveTask} cancelTask={cancelTask}/></div></details>}
 {page==='overview'&&overviewTab==='history'&&<History language={language} data={data} user={user} busy={busy||needsRefresh} onEdit={editEntry} onVoid={voidEntry} onReopen={toggleTask}/>}
 {page==='overview'&&overviewTab==='review'&&<WeeklyReview data={data} user={user}/>}
 {page==='reports'&&allowed('reports')&&<Suspense fallback={pageLoading}><Reports data={data} user={user} current={current} reportAPI={mode==='live'?api:null} busy={busy} onAddItem={category=>open('item',{category})}/></Suspense>}
 {page==='overview'&&overviewTab==='calendar'&&<PlanningCalendar data={data} user={user} onOpen={event=>{if(event.kind==='task'){go('tasks');setTaskFilter('all');setCategoryFilter('');setQuery(data.tasks.find(t=>t.id===event.sourceId)?.title||event.title);}else{go('money');setTab('subscriptions');}}}/>}
 {((page==='overview'&&overviewTab==='dashboard')||page==='money')&&<div className="filterbar"><div className="segmented">{(page==='overview'?['all','money','tasks'].filter(f=>f==='all'?(can('money')&&can('tasks')):can(f)):['transactions','savings','goals','items','budgets','subscriptions']).map(key=><button key={key} className={(page==='overview'?filter:tab)===key?'selected':''} onClick={()=>page==='overview'?setFilter(key):setTab(key)}>{key==='all'?'All overview':t(key[0].toUpperCase()+key.slice(1))}</button>)}</div><div className="date-range" dir="ltr" lang="en-US"><CalendarDays size={15}/><input aria-label={t("Start date")} type="date" value={start} max={end} onChange={e=>setStart(e.target.value)}/><span>–</span><input aria-label={t("End date")} type="date" min={start} value={end} onChange={e=>setEnd(e.target.value)}/></div></div>}
 {page==='overview'&&overviewTab==='dashboard'&&<>{can('money')&&filter!=='tasks'&&<><div className="money-overview-grid"><MonthlyMoney language={language} data={data} current={current} end={end} onSetLimit={value=>open('budget',value)} onManage={()=>{go('money');setTab('budgets');}}/><BudgetOverview language={language} data={data} start={start} end={end} onManage={()=>{go('money');setTab('budgets');}}/></div></>}
 <div className="stat-grid">{can('tasks')&&filter!=='money'&&<Stat icon={CheckSquare} label="Tasks completed" value={<>{summary.completed}<em> / {summary.tasks.length}</em></>} foot={summary.tasks.length?`${Math.round(summary.completed/summary.tasks.length*100)}% of your plans, done`:'A fresh start for your plans'} color="blue"/>}</div>
 <div className="dashboard-essentials">
 {can('tasks')&&filter!=='money'&&<section className="card"><CardTitle title="Upcoming tasks" action={<button className="text-button" onClick={()=>go('tasks')}>All tasks <ArrowRight size={14}/></button>}/><div className="task-list">{data.tasks.filter(t=>!t.completed).sort((a,b)=>a.due.localeCompare(b.due)).slice(0,3).map(renderTask)}{!data.tasks.some(t=>!t.completed)&&<Empty text="All caught up. Enjoy a little breathing room."/>}</div><button className="add-inline" onClick={()=>open('task')}><Plus size={16}/>Add a task</button></section>}
 {can('tasks')&&filter==='tasks'&&<section className="card"><CardTitle title="Task completion" subtitle="Tasks due in your selected period."/><div className="budget-content"><Donut percent={summary.tasks.length?summary.completed/summary.tasks.length*100:0} center={`${summary.completed}/${summary.tasks.length}`} label="tasks completed"/><div><h2>{summary.tasks.length-summary.completed} to go</h2><p className="muted">Every completed task is a step forward.</p></div></div></section>}
 </div>
 <details className="card overview-disclosure"><summary>{t('More dashboard details')}</summary><div className="overview-details">
 {can('money')&&filter!=='tasks'&&<CurrencyReport language={language} data={data} start={start} end={end}/>}
 {can('tasks')&&filter!=='money'&&<TaskCategoryBreakdown tasks={summary.tasks} subtitle={`Tasks due ${dateLabel(start)} – ${dateLabel(end)}. See where your effort goes.`}/>}
 {can('money')&&filter!=='tasks'&&<section className="card"><CardTitle title="Upcoming subscriptions" action={<span className="count-badge">{upcoming.length}</span>}/><div className="subscription-list">{upcoming.slice(0,3).map((s,i)=><div className="subscription-row" key={s.id}><span className={'subscription-logo logo-'+i}>{s.title.includes('ChatGPT')?<Sparkles size={21}/>:s.title.includes('Gym')?<Target size={22}/>:<Repeat size={20}/>}</span><div className="grow"><strong>{s.title}</strong><small>{dateLabel(s.renewal)} <span className={daysUntil(s.renewal)<=1?'urgent-text':''}>· {daysUntil(s.renewal)<0?'Overdue':`in ${daysUntil(s.renewal)} days`}</span></small></div><div><strong>{money(cents(s.amount))}</strong><small className="right">{s.cycle}</small></div></div>)}{!upcoming.length&&<Empty text="No upcoming subscriptions."/>}</div><button className="card-link" onClick={()=>{go('money');setTab('subscriptions');}}>View all subscriptions <ArrowRight size={15}/></button></section>}

 {can('money')&&filter!=='tasks'&&<section className="card recent-card"><CardTitle title="Recent transactions" action={<button className="text-button" onClick={()=>go('money')}>View all <ArrowRight size={14}/></button>}/><TransactionTable entries={filteredEntries.slice(0,5)}/></section>}

 </div></details>
 </>}
 {page==='money'&&<>
 {tab==='transactions'&&<MoneyReviewQueue drafts={receiptQueue} entries={data.entries} language={language} busy={busy||needsRefresh}
   onReceipt={reviewReceiptDraft} onDiscard={discardReceiptDraft} onCategory={entry=>editEntry(entry,true)}/>}
 <CurrencyReport language={language} data={data} start={start} end={end} featured/>
 {tab==='transactions'&&<div className="money-overview-grid"><MonthlyMoney language={language} data={data} current={current} end={end} onSetLimit={value=>open('budget',value)} onManage={()=>{go('money');setTab('budgets');}}/><BudgetOverview language={language} data={data} start={start} end={end} onManage={()=>{go('money');setTab('budgets');}}/></div>}
 {tab==='transactions'&&<section className="card"><CardTitle title={t("Transactions")} subtitle={t("Income, expenses, and savings transfers.")}/><div className="search-box"><Search size={17}/><input placeholder={t("Search transactions, categories or notes…")} value={query} onChange={e=>setQuery(e.target.value)}/></div><TransactionTable entries={filteredEntries}/></section>}
 {tab==='savings'&&<section className="card"><CardTitle title={t("Savings activity")} subtitle={t("Withdrawals always include a reason and date. Transfers do not count as expenses.")} action={<div className="button-row"><button data-tour="add-savings" className="secondary" onClick={()=>open('opening')}>{t("Add existing savings")}</button><button className="primary" onClick={()=>open('withdrawal')}>{t("Withdraw savings")}</button></div>}/><TransactionTable entries={filteredEntries.filter(e=>e.type==='withdrawal'||e.type==='opening'||(e.type==='income'&&e.saved>0))}/></section>}
 {tab==='goals'&&<><Forecasts language={language} data={data} busy={busy} onSave={saveDetail}/><SavingsGoals language={language} data={data} busy={busy} error={error} clearError={()=>setError('')} onCreate={value=>add('goals',value)} onMove={moveGoal}/></>}
 {tab==='items'&&<SavedItems language={language} items={data.items} categories={[...new Set([...categories,...data.entries.filter(entry=>entry.type==='expense'&&entry.category).map(entry=>entry.category)])]}
  busy={busy} needsRefresh={needsRefresh} onAdd={category=>open('item',category?{category}:{})}
  onLog={logSavedPurchase} onAdjust={item=>open('expense',{...item,currency:'USD'})}/>}
 {tab==='budgets'&&<section className="card"><CardTitle title={t("Spending limits")} subtitle={t("USD limits. Spending is approximately converted using each transaction’s saved rate.")} action={<button data-tour="add-budget" className="primary" onClick={()=>open('budget')}><Plus size={15}/>{t("New budget")}</button>}/><div className="tile-grid">{data.budgets.map(budget=>{const spent=periodSummary(data,budget.start,budget.end).spent,limit=cents(budget.amount);return <div className="item-tile" key={budget.id}><span className="eyebrow">{dateLabel(budget.start)} — {dateLabel(budget.end)}</span><h3>{budget.title}</h3><h2>{money(spent)} <small>/ {money(limit)}</small></h2><div className="progress-track"><div className={spent>limit?'over':spent>=limit*.8?'near':undefined} style={{width:Math.min(spent/limit*100,100)+'%'}}/></div><p className={spent>limit?'urgent-text':'muted'}>{money(Math.abs(limit-spent))} {spent>limit?t("over budget"):t("remaining")}</p></div>;})}</div>{!data.budgets.length&&<Empty text={t("Try a $400 spending limit from your $700 income.")}/>}</section>}
 {tab==='subscriptions'&&<SubscriptionReview data={data} busy={busy} onSave={saveDetail}/>}
 {tab==='subscriptions'&&<section className="card"><CardTitle title={t("Subscriptions")} subtitle={t("Email reminders 3 days and 1 day before renewal.")} action={<button data-tour="add-subscription" className="primary" onClick={()=>open('subscription')}><Plus size={15}/>{t("Subscription")}</button>}/>{!data.connections?.email&&<div className="info-note"><Mail size={16}/>{t("Email delivery needs SMTP configuration and your email in Settings.")}{mode==='demo'?t(" Demo mode does not send emails."):''}</div>}<div className="tile-grid">{data.subscriptions.map((s,i)=><div className={'item-tile '+(!s.active?'paused':'')} key={s.id}><div className="tile-top"><span className="subscription-logo"><Repeat size={21}/></span><span className={'badge '+(s.active?'low':'medium')}>{s.active?t("Active"):t("Paused")}</span></div><h3>{s.title}</h3><h2>{money(cents(s.amount))}<small> / {t(s.cycle)}</small></h2><p className="muted">{t("Next renewal · {date}",{date:dateLabel(s.renewal)})}</p><div className="button-row"><button disabled={busy||!s.active} className="secondary" onClick={()=>open('renew',s)}>{t("Record payment")}</button><button disabled={busy} className="text-button" onClick={()=>setSubscriptionActive(s,!s.active)}>{s.active?t("Pause"):t("Resume")}</button></div></div>)}</div>{!data.subscriptions.length&&<Empty text={t("Add your gym, learning, AI or other subscriptions.")}/>}</section>}
 </>}
 {page==='tasks'&&<><div className="stat-grid three"><Stat icon={CheckSquare} label="Completed" value={data.tasks.filter(t=>t.completed).length} foot="Completed tasks" color="green"/><Stat icon={CalendarDays} label="Due today" value={data.tasks.filter(t=>t.due===current&&!t.completed).length} foot="A little focus for today" color="blue"/><Stat icon={Target} label="Still to do" value={data.tasks.filter(t=>!t.completed).length} foot="One step at a time" color="purple"/></div><section className="card"><CardTitle title="Task list" subtitle="Filter and manage your tasks."/><div className="task-toolbar"><label className="category-filter"><span>Category</span><select aria-label="Filter tasks by category" value={categoryFilter} onChange={e=>setCategoryFilter(e.target.value)}><option value="">All categories</option>{taskCategories.map(category=><option key={category} value={category}>{category}</option>)}</select></label><div className="segmented">{['all','today','pending','completed'].map(f=><button className={taskFilter===f?'selected':''} key={f} onClick={()=>setTaskFilter(f)}>{f[0].toUpperCase()+f.slice(1)}</button>)}</div><div className="search-box"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Find a task…"/></div></div><div className="task-list">{filteredTasks.map(renderTask)}{!filteredTasks.length&&<Empty text="No tasks here. A little room for something new."/>}</div><button className="add-inline" onClick={()=>open('task')}><Plus size={15}/>Add a task</button></section><TaskCategoryBreakdown tasks={data.tasks} subtitle="All your tasks, grouped by category. Use Overview for a date-filtered summary."/></>}

 {page==='settings'&&<div className="settings-workspace">
   <section className="settings-group" aria-labelledby="settings-preferences">
     <h2 id="settings-preferences"><Settings size={18} aria-hidden="true"/>Preferences</h2>
     {can('money')&&<Currencies settings={data.settings} change={change} busy={busy}/>}
     <section data-tour="profile-settings" className="card"><CardTitle title="Profile and notifications" subtitle="Your name and where reminders should arrive."/><form className="settings-form" key={mode} onSubmit={e=>{e.preventDefault();const parsed=schemas.settings.safeParse(Object.fromEntries(new FormData(e.target)));if(!parsed.success){setError(parsed.error.issues[0].message);return;}const value=parsed.data;change({path:'/settings',method:'PUT',value,demo:d=>{d.settings={...d.settings,...value};}});}}><Field label="Your name" name="name" defaultValue={data.settings.name} required maxLength={100}/><Field label="Reminder email" name="email" type="email" defaultValue={data.settings.email} placeholder="you@example.com"/><div className="field-pair"><Field label="Quiet hours start (optional)" name="quiet_start" type="time" defaultValue={data.settings.quiet_start||''}/><Field label="Quiet hours end (optional)" name="quiet_end" type="time" defaultValue={data.settings.quiet_end||''}/></div><p className="form-hint">Email reminders wait until quiet hours end, in the server timezone (default Asia/Beirut). Clear both times to disable. Overnight ranges are supported.</p><div className="info-note"><Mail size={17}/>Reminders for your allowed apps use this address. The server must stay running.</div><button className="primary" disabled={busy}>Save preferences</button></form></section>
     {mode==='live'&&(can('money')||can('tasks'))&&<ReportEmails settings={data.settings} money={can('money')} tasks={can('tasks')} emailConfigured={data.connections?.email} busy={busy} onChange={enabled=>change({path:'/settings/report-emails',method:'PUT',value:{enabled},message:enabled?'Report emails enabled':'Report emails turned off'})}/>}
   </section>
   <div className="settings-side">
     <section className="settings-group" aria-labelledby="settings-device">
       <h2 id="settings-device"><Compass size={18} aria-hidden="true"/>Workspace</h2>
       <ThemePreference language={language||document.documentElement.lang}/>
       <InstallApp/>
       {user.role==='admin'&&<SetupStatus mode={mode} api={api}/>}
     </section>
     <section className="settings-group" aria-labelledby="settings-account">
       <h2 id="settings-account"><Users size={18} aria-hidden="true"/>Account and devices</h2>
       <section className="card"><CardTitle title="Your account & access" subtitle={mode==='demo'?'You’re using sample data in a demo workspace.':'Your records are private to your account.'}/><div className="settings-form"><div className="connection-line"><span>Signed in as</span><strong>{user.email}</strong></div><div className="connection-line"><span>Role</span><span className="badge low">{user.role==='admin'?'Owner':'Family member'}</span></div><div className="access-chips">{user.permissions.filter(p=>p!=='assistant').map(p=><span key={p}><Check size={11}/>{APP_LABELS[p]}</span>)}</div><p className="muted">{user.role==='admin'?'Manage user accounts and app permissions in Users & access.':'To change your access or reset a password, contact your administrator.'}</p><button className="secondary" onClick={signOut}><LogOut size={15}/>Sign out</button><hr/><PasswordForm kind="change" request={api} disabled={mode!=='live'} onDone={signOut}/><hr/><button className="secondary" onClick={exportData}><Download size={15}/>Export my data (JSON)</button><p className="muted">Only your records from apps you can access are included.</p></div></section>
       <Sessions api={api} mode={mode}/>
     </section>
   </div>
 </div>}

 {mode==='demo'&&(page==='overview'||page==='tasks'||page==='money')&&<DemoGuides can={app=>app===page||page==='overview'&&can(app)}/>}{page==='users'&&user.role==='admin'&&<Suspense fallback={pageLoading}><UserManager mode={mode} api={api} onPreview={onPreview}/></Suspense>}

 </main></div>{tutorials&&<TutorialDialog can={can} close={()=>setTutorials(false)}/>}{trailer&&<DemoTrailer close={()=>setTrailer(false)}/>}{toast&&<div className="toast"><span role="status"><Check size={17}/>{toast.message}</span>{toast.undoId!=null&&<button type="button" className="toast-undo" disabled={busy||needsRefresh} onClick={undoQuickPurchase}>Undo</button>}</div>}{modal?.type==='transactionChoice'?<TransactionChoice language={modal.language} onChoose={open} onClose={()=>setModal(null)}/>:modal?.type==='companionChange'?<CompanionChangeReview proposal={modal.proposal} data={data} user={user} current={current} language={modal.language} busy={busy} error={error} onClose={()=>{setModal(null);setError('');}} onConfirm={confirmCompanionChange}/>:modal?.type==='entryDetails'?<TransactionDetailsDialog entry={modal.entry} categories={data.entries.map(entry=>entry.category)} review={modal.review} language={language} busy={busy} error={error} onClose={()=>{setModal(null);setError('');}} onSave={saveEntryDetails}/>:modal&&<EntryModal data={data} modal={modal} close={()=>{setModal(null);setError('');}} error={error} busy={busy} current={current} addEntry={addEntry} add={add} renew={renew} balance={b} settings={data.settings} taskCategories={taskCategories} recategorize={recategorize}/>}</div>;
}
function TransactionChoice({language,onChoose,onClose}){
 const t=workspaceText(language);
 const dialog=useRef(null);
 useEffect(()=>{dialog.current.showModal();},[]);
 const choices=[
  ['expense','Expense','Record something you paid for.',ShoppingBag],
  ['income','Income','Record a payment you received and split it between spending and savings.',ArrowDownLeft],
  ['opening','Existing savings','Record money you already had set aside.',PiggyBank],
  ['withdrawal','Withdraw from savings','Move money from savings to your spending balance.',ArrowUpRight],
 ];
 return <dialog ref={dialog} dir={language==='ar'?'rtl':'ltr'} aria-labelledby="transaction-choice-title" onCancel={event=>{event.preventDefault();onClose();}}>
  <div className="modal-heading">
   <h2 id="transaction-choice-title">{t("Add transaction")}</h2>
   <button type="button" className="icon-button" aria-label={t("Close transaction options")} onClick={onClose}><X size={20}/></button>
  </div>
  <div className="transaction-choices">
   {choices.map(([type,label,description,Icon])=><button key={type} type="button" className="secondary" onClick={()=>onChoose(type)}>
    <Icon size={20} aria-hidden="true"/><span><strong>{t(label)}</strong><small>{t(description)}</small></span>
   </button>)}
  </div>
 </dialog>;
}

function EntryModal({data,modal,close,error,busy,current,addEntry,add,renew,balance,settings,taskCategories,recategorize}){
 const [language,setLanguage]=useState(modal.language||'en');const t=text=>formText(text,language);
 const {type,initial}=modal;
 const categoryOptions=initial.category&&!categories.includes(initial.category)?[...categories,initial.category]:categories;
 const dialog=useRef();
 useEffect(()=>{
  const element=dialog.current;
  if(!element.open)element.showModal();
  if(type==='expense')element.querySelector('[name=amount]')?.focus();
 },[type]);
 const labels={expense:'Log a purchase',income:'Add income',opening:'Add existing savings',withdrawal:'Withdraw from savings',item:'Save an everyday item',budget:'Make a spending plan',subscription:'Add a subscription',task:'Make a little plan',renew:'Record subscription payment',taskCategory:'Change task category'};
 const [entryCurrency,setEntryCurrency]=useState(initial.currency??'USD');
 const [saveItem,setSaveItem]=useState(false);
 const financial=['expense','income','opening','withdrawal'].includes(type);
 return <dialog dir={language==='ar'?'rtl':'ltr'} lang={language} ref={dialog} onCancel={e=>{e.preventDefault();if(!busy)close();}}><div className="modal-heading"><div><span className="eyebrow">{t("YOUR EVERYDAY, ORGANIZED")}</span><h2>{t(labels[type])}</h2></div><button className="icon-button" onClick={close} disabled={busy} aria-label={t("Close dialog")}><X size={20}/></button></div><div className="entry-language-switch" role="group" aria-label="Form language"><button type="button" aria-pressed={language==='en'} onClick={()=>setLanguage('en')}>English</button><button type="button" aria-pressed={language==='ar'} onClick={()=>setLanguage('ar')}>عربي</button></div><CreationGuide key={type} kind={type} language={language}/><form onSubmit={e=>{e.preventDefault();const v=Object.fromEntries(new FormData(e.target));if(type==='renew'){renew(initial,v);return;}if(type==='taskCategory'){recategorize(initial,v.category);return;}if(financial){const review=type==='expense'&&!v.category?.trim();addEntry({...v,type,...(review?{category:'Other',category_review_requested:true}:{}),save_as_item:type==='expense'&&saveItem});return;}if(type==='task'){add('tasks',{...v,reminder:v.reminder||null,scheduled_time:v.scheduled_time||null,subtasks:(v.subtasks||'').split('\n').map(s=>s.trim()).filter(Boolean)});return;}add({item:'items',budget:'budgets',subscription:'subscriptions'}[type],{...v,amount:Number(v.amount)});}}>
 {type==='renew'?<><div className="info-note">{language==='ar'?<>{initial.title}: المبلغ المخطّط {money(cents(initial.amount))} USD. سجّل المبلغ الفعلي تحت. التجديد بينتقل من <bdi>{dateLabel(initial.renewal)}</bdi> إلى <bdi>{dateLabel(nextRenewal(initial.renewal,initial.cycle))}</bdi>.</>:<>{initial.title} is planned at {money(cents(initial.amount))} USD. Enter the actual payment below. This advances renewal from {dateLabel(initial.renewal)} to {dateLabel(nextRenewal(initial.renewal,initial.cycle))}.</>}</div><CurrencyFields language={language} settings={settings} currency={entryCurrency} setCurrency={setEntryCurrency}/><Field key={entryCurrency} label={t(`Amount paid (${entryCurrency})`)} name="amount" type="number" min="0.01" step="0.01" max="999999999" defaultValue={entryCurrency==='USD'?initial.amount:''} required/></>:type==='taskCategory'?<><p className="category-edit-title">{initial.title}</p><TaskCategoryField language={language} categories={taskCategories} value={taskCategory(initial)}/></>:<> {type==='expense'&&<Field label={t(entryCurrency?`Amount (${entryCurrency})`:'Amount')} name="amount" type="number" min="0.01" step="0.01" max="999999999" defaultValue={initial.amount||''} required autoFocus/>}<Field label={t(type==='income'?'Income source':type==='withdrawal'?'Transfer name':type==='task'?'What would you like to do?':'Name')} name="title" defaultValue={initial.title||''} placeholder={t(type==='income'?'Monthly salary or freelance work':'Give it a name')} required maxLength={160} autoFocus={type!=='expense'}/>
 {type==='task'&&<Field label={t("Due date")} name="due" type="date" defaultValue={initial.due||current} required/>}
 {initial.receipt&&<p className="info-note">{language==='ar'?'راجع اسم المحل والمبلغ والعملة من الإيصال قبل الحفظ.':'Check the shop, total, and currency against the receipt before saving.'}{!initial.currency&&initial.receipt.currency&&<> ({initial.receipt.currency})</>}</p>}
 {financial&&<CurrencyFields language={language} settings={settings} currency={entryCurrency} setCurrency={setEntryCurrency} compact={type==='expense'} requireChoice={!!initial.receipt}/>}
 {type==='income'?<IncomeAllocation initialAmount={initial.amount} showExample={initial.firstIncome} currency={entryCurrency} language={language} catalog={currencyCatalog(settings)}/>:type==='withdrawal'?<WithdrawalAmount initialAmount={initial.amount} currency={entryCurrency} language={language} data={data} current={current}/>:!['task','expense'].includes(type)&&<Field label={t(type==='budget'?'Spending limit (USD)':financial?`Amount (${entryCurrency})`:'Amount (USD)')} name="amount" type="number" min="0.01" step="0.01" max="999999999" defaultValue={initial.amount||''} required/>}
 {type==='expense'&&<section>
  <label className="companion-motion-option"><input type="checkbox" checked={saveItem} onChange={event=>setSaveItem(event.target.checked)}/>{language==='ar'?'احفظه كعنصر كمان':'Also save as an item'}</label>
  {saveItem&&<div className="info-note form-guide-steps"><GuideAvatar/><p>{language==='ar'?'أنا Sage. العنصر بيحفظ الاسم والفئة والسعر المعتاد. المرّة الجاية اضغط سجّل الشراء من Today أو Money → Items.':'I’m Sage. An item remembers the name, category, and usual price. Next time, log it with one tap from Today or Money → Items.'}</p></div>}
  {saveItem&&entryCurrency!=='USD'&&<Field name="item_price_usd" label={language==='ar'?'سعر العنصر المعتاد (USD)':'Usual item price (USD)'} type="number" min="0.01" max="999999999" step="0.01" required/>}
 </section>}
 {financial&&<Field label={t("Date")} name="date" type="date" defaultValue={initial.date||current} max={current} required/>}
 {type==='expense'&&<MoneyCategoryField language={language} value={initial.category||''} categories={data.entries.map(entry=>entry.category)} allowLater/>}
 {['income','item','subscription'].includes(type)&&<label className="field"><span>{t("Category")}</span><select name="category" defaultValue={initial.category||(type==='income'?'Work':'Other')}>{categoryOptions.map(c=><option key={c} value={c}>{t(c)}</option>)}</select></label>}
 {type==='budget'&&<div className="field-pair"><Field label={t("Start date")} name="start" type="date" defaultValue={initial.start||current} required/><Field label={t("End date")} name="end" type="date" min={initial.start||current} defaultValue={initial.end||current} required/></div>}
 {type==='subscription'&&<div className="field-pair"><label className="field"><span>{t("Renewal cycle")}</span><select name="cycle"><option value="monthly">{t("Monthly")}</option><option value="weekly">{t("Weekly")}</option><option value="yearly">{t("Yearly")}</option></select></label><Field label="Next renewal" name="renewal" type="date" defaultValue={initial.renewal||current} required/></div>}
 {type==='task'&&<><details><summary>{t("More options: time, repeat, subtasks and reminders")}</summary><Field label={t("Time estimate (minutes)")} name="estimate_minutes" type="number" min="0" max="1440" step="1" defaultValue="0"/><p className="form-hint">{t("For example: 15 for a quick task, 60 for one hour. 0 means unestimated.")}</p><TaskCategoryField language={language} categories={taskCategories} value={initial.category||'Personal'}/><div className="field-pair"><Field label={t("Start time (optional)")} name="scheduled_time" type="time" defaultValue={initial.scheduled_time||''}/><label className="field"><span>{t("Priority")}</span><select name="priority" defaultValue="medium"><option value="low">{t("Low")}</option><option value="medium">{t("Medium")}</option><option value="high">{t("High")}</option></select></label></div><label className="field"><span>{t("Repeat")}</span><select name="recurrence" defaultValue="none"><option value="none">{t("Does not repeat")}</option><option value="daily">{t("Every day")}</option><option value="weekly">{t("Every week")}</option></select></label><label className="field"><span>{t("Subtasks (optional, one per line)")}</span><textarea name="subtasks" rows={3} maxLength={4800} placeholder={t('Research ideas\nMake a first draft\nReview and finish')}/></label><p className="form-hint">{t("Up to 30 small steps. Repeating tasks get a fresh checklist after completion.")}</p><Field label={t("Email reminder date (optional)")} name="reminder" type="date"/><p className="form-hint">{t("Requires your email and SMTP setup. Reminders are sent on the selected day.")}</p></details></>}
 {type==='withdrawal'?<label className="field"><span>{t('Why are you using your savings? (required)')}</span><textarea name="note" required maxLength={2000} rows={3}/></label>:
  (financial||type==='task')&&<details className="entry-extra"><summary>{t('Notes (optional)')}</summary><label className="field"><span>{t('Notes (optional)')}</span><textarea name="note" maxLength={2000} rows={3}/></label></details>}
 {type==='withdrawal'&&<p className="form-hint">{t("Savings are checked in the selected currency. This moves money to spending; log the purchase separately.")}</p>}
 </>}{error&&<div className="error" role="alert">{t(error)}</div>}<div className="modal-footer"><button type="button" className="secondary" onClick={close} disabled={busy}>{t("Cancel")}</button><button className="primary" disabled={busy}>{t(busy?'Saving…':type==='renew'?'Record payment':'Save '+(financial?'transaction':type==='taskCategory'?'category':type))}<Check size={15}/></button></div></form></dialog>;
}

