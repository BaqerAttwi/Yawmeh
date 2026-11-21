import {hasAccess} from './access.js';

// Original example phrases informed by the research in docs/companion-research.md.
// Templates describe supported operations; they are not copied user conversations.
export const companionRequests=[
 {id:'plan',group:'tasks',title:['Plan my day','رتّب نهاري'],examples:['Plan my day','رتّب يومي','ratteb yomi'],canonical:'plan my day',aliases:['What should I focus on today?','Help me prioritize my tasks','شو أول شي لازم اعمل اليوم؟','shou awal shi lezem a3mol lyom']},
 {id:'quick',group:'tasks',title:['Use a short break','استفيد من وقت صغير'],examples:['I have 15 minutes','عندي 15 دقيقة','3ande 15 da2aye2']},
 {id:'task',group:'tasks',title:['Add a reminder','ضيف تذكير'],examples:['Add task call the dentist tomorrow at 9 am','ذكرني اتصل بطبيب الاسنان بكرا الساعة 9 الصبح','bdi zakkerni call dentist bokra se3a 9 sobe7']},
 {id:'next_task',group:'tasks',title:['Pick my next task','شو بعمل هلق'],examples:['What is my next task?','شو لازم اعمل هلق؟','shu lezim a3mol halla2'],canonical:'what is my next task?',aliases:['شو لازم اعمل هلق؟','shu lezim a3mol halla2']},
 {id:'upcoming_tasks',group:'tasks',title:['See tasks coming up','شوف المهام الجاية'],examples:['Upcoming tasks','شو المهام الجاية؟','shou el tasks el jeye'],canonical:'upcoming tasks',aliases:['شو المهام الجاية؟','shou el tasks el jeye']},
 {id:'overdue',group:'tasks',title:['Catch up on overdue work','راجع الشغل المتأخر'],examples:['Show overdue tasks','شو المهام المتأخرة؟','shou el tasks el met2akhra'],canonical:'show overdue tasks',aliases:['What have I missed?','Which tasks are late?','شو الشغل المتأخر؟','shou el tasks el met2akhra']},
 {id:'completed',group:'tasks',title:['See what I finished','شوف شو خلّصت'],examples:['What have I completed today?','شو خلصت اليوم؟','shou khalaset lyom']},
 {id:'expense',group:'money',title:['Record a purchase','سجّل مصروف'],examples:['I spent 15 USD for lunch','صرفت 15 دولار على الغدا','sraft 15 dollar 3al ghada']},
 {id:'expense_quick',group:'money',title:['Log a quick expense','سجّل مصروف بسرعة'],examples:['Coffee $8','دفعت ٨$ على القهوة','dfa3et 8$ 3al coffee']},
 {id:'expense_start',group:'money',title:['Start with missing details','بلّش بمصروف'],examples:['I spend','صرفت','sarfet']},
 {id:'expense_lbp',group:'money',title:['Record a payment in lira','سجّل دفعة بالليرة'],examples:['I paid 150,000 LBP for a taxi','دفعت ١٥٠٬٠٠٠ ليرة على التاكسي','dfa3et 150,000 LBP 3al taxi']},
 {id:'expense_yesterday',group:'money',title:['Record yesterday’s expense','سجّل مصروف مبارح'],examples:['Yesterday, I spent $10 on parking','صرفت ١٠ دولار على الموقف مبارح','sraft 10 dollars 3al parking mbereh']},
 {id:'income',group:'money',title:['Record income','سجّل دخل'],examples:['I received 500 USD from work','قبضت 500 دولار من الشغل','2ebedet 500 dollar mn work']},
 {id:'income_client',group:'money',title:['Record a client payment','سجّل دفعة من زبون'],examples:['I got paid $250 from a client','وصلني ٢٥٠ دولار من زبون','2ebedet 250 dollar mn client']},
 {id:'savings',group:'money',title:['Add existing savings','ضيف مدخرات موجودة'],examples:['Add to savings 500 USD','ضيف مدخرات 500 دولار','bade zid savings 500 dollar']},
 {id:'subscription',group:'money',title:['Track a subscription','تابع اشتراك'],examples:['Add subscription 20 USD for Claude','ضيف اشتراك كلود ب 20 دولار','bdi zid subscription Claude b 20 dollar']},
 {id:'balance',group:'money',title:['Check available money','شوف قديش معك'],examples:['Money balance','قديش معي؟','adde ma3e'],canonical:'money balance',aliases:['How much money do I have left?','What is available to spend?','قديش بقي معي مصاري؟','adde ba2e ma3e masare']},
 {id:'budget',group:'money',title:['Check my budget','راجع ميزانيتي'],examples:['Budget status','وضع الميزانية','shou wad3 el budget'],canonical:'budget status',aliases:["What's left of my budget?",'Am I over budget?','شو بقي من الميزانية؟','shou wad3 el budget']},
 {id:'recent_expenses',group:'money',title:['See my latest expenses','شوف آخر مصاريفي'],examples:['Recent expenses','شو آخر مصاريفي؟','shou ekher masarife'],canonical:'recent expenses',aliases:['شو آخر مصاريفي؟','shou ekher masarife']},
 {id:'weekly_expenses',group:'money',title:['Check this week’s spending','راجع مصاريف هالأسبوع'],examples:['How much did I spend this week?','قديش صرفت هالأسبوع؟','adde sraft hal esbou3'],canonical:'expenses this week',aliases:['How much did I spend this week?','قديش صرفت هالأسبوع؟','adde sraft hal esbou3']},
 {id:'largest_expense',group:'money',title:['Find my largest expense','شوف أكبر مصروف'],examples:['Largest expense this month','شو أكبر مصروف هالشهر؟','shou akbar masrouf hal shaher'],canonical:'largest expense this month',aliases:['شو أكبر مصروف هالشهر؟','shou akbar masrouf hal shaher']},
 {id:'filtered_expense',group:'money',title:['Total spending on one thing','احسب مصروف شي معيّن'],examples:['How much did I spend on coffee this week?','قديش صرفت على القهوة هالأسبوع؟','adde sraft 3al coffee hal esbou3']},
 {id:'bills',group:'money',title:['See bills coming up','شوف الاشتراكات الجاية'],examples:['Which subscriptions are due?','شو الاشتراكات المستحقة؟','shou el subscriptions el mesta7a2a'],canonical:'which subscriptions are due?',aliases:['What bills are coming up?','What subscriptions should I check?','شو الاشتراكات الجاية؟','shou el subscriptions el mesta7a2a']},
 {id:'compare',group:'money',title:['Compare my spending','قارن مصاريفي'],examples:['Compare spending this month','قارن مصاريف الشهر','2aren masarife halshaher'],canonical:'compare spending this month',aliases:['Am I spending more than last month?','How does my spending compare?','عم اصرف أكتر من الشهر الماضي؟','2aren masarife halshaher']},
 {id:'save_more',group:'money',title:['Find saving opportunities','شوف وين فيك توفّر'],examples:['How can I save more?','كيف فيني وفر أكتر؟','kif fini waffer aktar'],canonical:'how can I save more',aliases:['Where does my money go?','Where can I cut spending?','وين عم تروح مصرياتي؟','wein 3am trou7 masriyeti']},
 {id:'goals',group:'money',title:['Review savings goals','راجع أهداف الادخار'],examples:['Savings goals','شو اهداف الادخار؟','shou ahdef el tawfir'],canonical:'savings goals',aliases:['How are my savings goals doing?','شو صار بأهداف الادخار؟','shou ahdef el tawfir']},
 {id:'afford',group:'money',title:['Check a purchase','راجع قدرة الصرف'],examples:['Can I afford 100 USD?','فيني اصرف 100 دولار؟','fini esrof 100 dollar?']},
 {id:'change_amount',group:'drafts',permission:'money',title:['Correct a draft amount','عدّل مبلغ المسودة'],examples:['Change the amount to 25','غير المبلغ 25','khalliha 25']},
 {id:'change_date',group:'drafts',title:['Correct a draft date','عدّل تاريخ المسودة'],examples:['Change that to tomorrow','خليها بكرا','khalliha bokra']},
 {id:'cancel',group:'drafts',title:['Cancel a draft','الغي المسودة'],examples:['Cancel','الغي','balaha']},
 {id:'cancel_task',group:'drafts',permission:'tasks',title:['Review a task cancellation','راجع إلغاء مهمة'],examples:['Delete task Call the dentist','احذف مهمة اتصل بطبيب الاسنان','bde shil task Call the dentist']},
 {id:'reverse_income',group:'drafts',permission:'money',title:['Review an income reversal','راجع عكس عملية دخل'],examples:['Reverse income Monthly salary because duplicate','احذف دخل الراتب بسبب سجل مكرّر','bde shil income Monthly salary']},
 {id:'rename_entry',group:'drafts',permission:'money',title:['Review a name change','راجع تغيير اسم عملية'],examples:['Rename expense Lunch to Team lunch','غير مصروف الغدا إلى غدا مع الفريق','ghayyer expense Lunch to Team lunch']},
 {id:'tomorrow_plan',group:'tasks',title:['Plan tomorrow','رتّب بكرا'],examples:['Plan tomorrow','رتّب يومي بكرا','ratteb yomi bokra'],canonical:'plan tomorrow',aliases:['رتّب يومي بكرا','ratteb yomi bokra']},
 {id:'weekly_review',group:'reports',title:['Review my week','راجع أسبوعي'],examples:['Weekly report','تقرير الأسبوع','ta2rir hal esbou3'],canonical:'weekly report',aliases:['تقرير الأسبوع','ta2rir hal esbou3']},
 {id:'monthly_review',group:'reports',title:['Review this month','راجع هالشهر'],examples:['Monthly report','تقرير هالشهر','ta2rir hal shaher'],canonical:'report this month',aliases:['Monthly report','This month’s report','تقرير هالشهر','ta2rir hal shaher']},
 {id:'last_month_review',group:'reports',title:['Review last month','راجع الشهر الماضي'],examples:['Report last month','تقرير الشهر الماضي','ta2rir el shaher el made'],canonical:'report last month',aliases:['تقرير الشهر الماضي','ta2rir el shaher el made']},
 {id:'yesterday_review',group:'reports',title:['Review yesterday','راجع مبارح'],examples:['Report yesterday','تقرير مبارح','ta2rir mbereh'],canonical:'report yesterday',aliases:['تقرير مبارح','ta2rir mbereh']},
];
export function availableCompanionRequests(user){return companionRequests.filter(row=>(!row.permission||hasAccess(user,row.permission))&&(!['tasks','money'].includes(row.group)||hasAccess(user,row.group)));}
const normalize=text=>text.normalize('NFKC').toLowerCase().replace(/[أإآ]/g,'ا').replace(/[\u064b-\u065f\u0670]/g,'').replace(/[؟?!.]+$/,'').replace(/\s+/g,' ').trim();
const aliases=new Map(companionRequests.filter(row=>row.canonical).flatMap(row=>row.aliases.map(text=>[normalize(text),row.canonical])));
export const commonRequestAlias=text=>aliases.get(normalize(text))||null;
