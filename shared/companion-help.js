import {hasAccess} from './access.js';
import {languageProfile} from './lebanese-language.js';

const topics=[
 {
  id:'currencies',access:'money',
  match:/\b(?:home currency|default currency|add a currency|saved exchange rates?|exchange rate history)\b|العملة الرئيسية|اضافة عملة|سعر الصرف المحفوظ|kif.*home currency/u,
  en:'Go to Settings → Preferences → Your currencies. Choose a home currency and save it, or open Add a currency. Reports open in your home currency. Each entry keeps its own currency and saved exchange rates, so changing a default rate affects new entries.',
  ar:'روح على الإعدادات ← التفضيلات ← عملاتك. اختَر العملة الرئيسية واحفظها أو افتح أضف عملة. التقارير بتفتح بالعملة الرئيسية. كل عملية بتحتفظ بعملتها وسعر الصرف المحفوظ، لذلك تغيير السعر الافتراضي بيأثّر على العمليات الجديدة.',
 },
 {
  id:'review',access:'money',
  match:/needs review|review queue|category review|uncategorized expenses?|(?:old|past) expenses.*\bother\b|\bother\b.*\b(?:queue|review)\b|why.*receipt.*draft|بحاجه الى مراجعه|بحاجة الى مراجعة|قائمه المراجعه|قائمة المراجعة|مصاريف غير مصنفة|kif.*review queue/u,
  en:'Open Money → Transactions → Needs review. You’ll find unfinished receipt drafts from this browser and new expenses saved with Choose a category later. Open an item to review it, or discard an unwanted receipt draft. Old expenses and entries explicitly filed under Other stay out of the queue.',
  ar:'افتح المال ← المعاملات ← بحاجة إلى مراجعة. بتلاقي مسودات الإيصالات بهالمتصفح والمصاريف الجديدة اللي حفظتها بخيار اختر الفئة لاحقًا. افتح العملية للمراجعة أو تجاهل مسودة الإيصال. المصاريف القديمة والعمليات اللي اخترتلها أخرى ما بتظهر هون.',
 },
 {
  id:'receipt',access:'money',
  match:/\b(?:how|where|can i|can you|help|recover|resume|find|scan|snap|upload)\b.*\breceipt\b|\breceipt (?:drafts?|scan|photo)\b|(?:كيف|وين|فيني|امسح|صور|ارفع).*ايصال|(?:kif|wein|bade).*\breceipt\b/u,
  en:'In Companion, open Quick add → Scan a receipt and take or choose a photo. When the AI connection is available, Yawmeh reads the shop, amount, and currency. Check the fields and category before saving. If you close the form, reopen the draft from Money → Transactions → Needs review on this browser. Yawmeh keeps the extracted draft fields, and no copy of the photo.',
  ar:'من المساعد افتح إضافة ← مسح إيصال وصوّر الإيصال أو اختَر صورة. إذا الاتصال بالذكاء الاصطناعي متاح، يومِه بيقرأ اسم المحل والمبلغ والعملة. راجع التفاصيل والفئة قبل الحفظ. إذا سكّرت النموذج، بتلاقي المسودة تحت المال ← المعاملات ← بحاجة إلى مراجعة بهالمتصفح. الصورة ما بتنحفظ؛ بس تفاصيل المسودة.',
 },
 {
  id:'ledger',access:'money',
  match:/\b(?:amount|currency|date|total)\b.*\b(?:wrong|mistake)\b.*\b(?:saved|transaction|expense|payment)\b|\b(?:wrong|correct|edit|fix|change|mistake)\b.*\b(?:amount|currency|date|total)\b.*\b(?:saved|transaction|expense|payment)\b|\b(?:saved|transaction|expense|payment)\b.*\b(?:wrong|correct|edit|fix|change|mistake)\b.*\b(?:amount|currency|date|total)\b|(?:مبلغ|عملة|تاريخ).*(?:معاملة|عملية|مصروف).*(?:غلط|خطا)|(?:صحح|عدل).*(?:مبلغ|عملة|تاريخ).*(?:معاملة|عملية|مصروف)/u,
  en:'For a saved transaction with the wrong amount, currency, or date, go to Overview → More views → History. Find it, use Correct / undo transaction, and enter a reason. Then record the corrected transaction. History keeps the original and its reversal reason.',
  ar:'إذا المبلغ أو العملة أو التاريخ غلط بمعاملة محفوظة، روح على نظرة عامة ← المزيد من العروض ← السجل. لقّي المعاملة واضغط Correct / undo transaction واكتب السبب. بعدين سجّل المعاملة الصحيحة. السجل بيحتفظ بالعملية الأصلية وسبب العكس.',
 },
 {
  id:'categories',access:'money',
  match:/\b(?:how|where|can i|can you|which|what)\b.*\b(?:custom categor(?:y|ies)|categorize|expense categor(?:y|ies)|transaction categor(?:y|ies)|choose a category)\b|\b(?:add|choose|create|pick)s+(?:as+)?(?:customs+)?category\b|\bcategory picker\b|(?:كيف|وين|فيني|اختار|ضيف).*(?:فئة|فئه|تصنيف)|\b(?:kif|wein).*categor(?:y|ies)\b/u,
  en:'When you log or edit an expense, open Category. Choose a common category, reuse one you’ve used before, or pick Add a custom category. Other is a deliberate choice. On a new expense, Choose a category later adds it to Needs review.',
  ar:'وقت تسجّل أو تعدّل مصروف، افتح الفئة. اختَر فئة جاهزة أو فئة استعملتها قبل، أو اضغط أضف فئة مخصصة. أخرى اختيار عادي. إذا اخترت اختر الفئة لاحقًا بمصروف جديد، بيظهر تحت بحاجة إلى مراجعة.',
 },
 {
  id:'edit',access:'money',
  match:/^(?:edit|correct) transactions?$|\b(?:how|where|can i|can you|help me)\b.*\b(?:edit|rename|correct|change|fix)\b.*\b(?:transaction|expense|purchase|merchant|payee|payment)\b|\b(?:transaction|expense|purchase) (?:name|note|details)\b.*\bwrong\b|\bwrong (?:name|category|note)\b.*\b(?:expense|transaction|purchase)\b|(?:كيف|وين|فيني).*(?:عدل|غير|صحح|سمي).*(?:معاملة|عملية|مصروف|عملية شراء)|\b(?:kif|wein).*(?:edit|rename|ghayyer).*(?:transaction|expense|masrouf)\b/u,
  en:'Open Money → Transactions, find the row, and choose Edit transaction. You can fix the name, category, or note, then select Save changes. The same action is available in Overview → More views → History. For the wrong amount, currency, or date, use Correct / undo transaction in History, then enter the corrected record.',
  ar:'افتح المال ← المعاملات واضغط عدّل المعاملة على السطر المطلوب. فيك تصلّح الاسم أو الفئة أو الملاحظة، وبعدين تضغط احفظ التعديلات. نفس الخيار موجود بـ نظرة عامة ← المزيد من العروض ← السجل. إذا الغلط بالمبلغ أو العملة أو التاريخ، اعكس المعاملة بالسجل وسجّلها من جديد.',
 },
 {
  id:'monthly',access:'money',
  match:/\bmonthly money\b|\bcompare monthly totals\b|\bwhy\b.*\b(?:spending bar|red bar|budget line)\b|المال شهريا|قارن المجاميع الشهرية|ليش.*(?:عمود|احمر).*ميزانية/u,
  en:'Open Dashboard or Money → Transactions and find Monthly Money. Select a month to compare total spent, saved from income, and the monthly limit. Spending above its limit is red. Compare monthly totals shows exact figures for all six months.',
  ar:'افتح لوحة المعلومات أو المال ← المعاملات وروح على المال شهريًا. اختَر شهر لتقارن إجمالي الإنفاق والمدخر من الدخل والحد الشهري. إذا الإنفاق تجاوز الحد، بيظهر بالأحمر. قارن المجاميع الشهرية بتفرجيك الأرقام للأشهر الستة.',
 },
 {
  id:'balances',access:'money',
  match:/\b(?:what (?:does|is)|explain|difference)\b.*\b(?:safe to spend|left this month|cash available)\b|(?:شو|ما هو|شو يعني|فرق).*(?:المتاح للانفاق اليوم|المتبقي لهذا الشهر|الرصيد النقدي المتاح)/u,
  en:'On Today, Safe to spend today shows the recorded spending balance and its breakdown. Left this month shows what remains of the full-month spending budget, with a progress bar if one is set. Cash available shows the recorded spending balance in your home currency. It may match Safe to spend.',
  ar:'على اليوم، المتاح للإنفاق اليوم بيعرض رصيد الإنفاق المسجّل وتفاصيله. المتبقي لهذا الشهر هو الباقي من ميزانية الشهر الكامل، ومعه شريط تقدّم إذا حطّيت ميزانية. الرصيد النقدي المتاح هو رصيد الإنفاق بعملتك الرئيسية، وممكن يطابق المتاح للإنفاق.',
 },
 {
  id:'offline',
  match:/\boffline\b|\b(?:sync|pending sync)\b|\bwithout (?:internet|wi-?fi)\b|بدون انترنت|بلا انترنت|ما في انترنت|دون اتصال|المزامنة|\boffline sync\b/u,
  en:'After signing in online on this device, check Sync in the top bar. When offline capture is ready, you can record entries for your allowed apps. They stay on this device and sync when you reconnect. For an item that needs attention, open Sync and review the error or retry. Receipt scanning needs an online AI connection.',
  ar:'بعد تسجيل الدخول أونلاين على هالجهاز، افتح المزامنة بالشريط فوق. لما التسجيل دون اتصال يكون جاهز، فيك تسجّل ضمن التطبيقات المسموح فيها. السجلات بتبقى على الجهاز وبتتزامن لما يرجع النت. إذا في سجل بحاجة لمراجعة افتح المزامنة وشوف الخطأ أو جرّب من جديد. مسح الإيصالات بده اتصال أونلاين.',
 },
 {
  id:'install',
  match:/\b(?:install (?:the )?(?:app|yawmeh)|add (?:it )?to (?:my |the )?home screen)\b|ثبّت التطبيق|تثبيت التطبيق|اضافة الى الشاشة الرئيسية/u,
  en:'Open Settings → Workspace → Keep yawmeh.me close. Use Install app when your browser offers it. On iPhone or iPad, open Yawmeh in Safari and use Share → Add to Home Screen.',
  ar:'افتح الإعدادات ← مساحة العمل ← تثبيت يومِه. اضغط تثبيت التطبيق إذا المتصفح بيدعم الخيار. عالآيفون أو الآيباد، افتح الموقع بسفاري واستعمل مشاركة ← إضافة إلى الشاشة الرئيسية.',
 },
 {
  id:'appearance',
  match:/\b(?:app colou?r|accent colou?r|dark mode|light mode|colou?r theme|appearance|lime palette|change (?:the )?language|switch (?:to )?arabic)\b|لون التطبيق|لون الواجهة|الوضع الداكن|المظهر|(?:غير|بدل|كيف).*(?:اللغه|اللغة)|\bkif.*(?:theme|color|arabic)\b/u,
  en:'Use Settings → Workspace → Appearance for the Light, Dark, or System theme and the Lime, Ocean, Coral, or Emerald accent. Choices apply immediately in this browser. Use العربية / EN in the top bar to switch workspace direction and Companion language.',
  ar:'روح على الإعدادات ← مساحة العمل ← المظهر لاختيار فاتح أو داكن أو النظام، ولتغيير لون التطبيق بين ليموني ومحيطي ومرجاني وزمردي. بيتغيّر الخيار فورًا بهالمتصفح. استخدم العربية / EN فوق لتبديل اتجاه الواجهة ولغة المساعد.',
 },
 {
  id:'email',
  match:/\b(?:email reports?|reports? emails?|weekly email|monthly email|(?:weekly|monthly) report.*(?:email|send|receive)|email.*(?:weekly|monthly|reports?))\b|(?:تقرير|تقارير).*(?:البريد|ايميل)|(?:البريد|ايميل).*(?:تقرير|تقارير)/u,
  en:'In a live workspace, open Settings → Preferences → Report emails from Yawmeh. Save a reminder email and enable reports if email delivery is configured. Money accounts receive a Sunday money report. On the first of each month, Yawmeh sends a recap for the apps you can access.',
  ar:'بالحساب الفعلي، افتح الإعدادات ← التفضيلات ← تقارير يومِه بالبريد. احفظ عنوان بريد للتذكيرات وفعّل التقارير إذا إرسال البريد مضبوط. تقرير المال بيجي يوم الأحد، وبيوم واحد من كل شهر بيجي ملخص للتطبيقات اللي عندك صلاحية عليها.',
 },
 {
  id:'navigation',
  match:/\bmore views\b|\b(?:where|find|open|navigate)\b.*\b(?:calendar|history|weekly review|dashboard|daily tools)\b|\b(?:where|find)\b.*\b(?:overview|today)\b|المزيد من العروض|(?:وين|كيف).*(?:التقويم|السجل|لوحة المعلومات|المراجعة الاسبوعية|ادوات اليوم)/u,
  en:'Overview opens on Today. Your main balances, quick actions, and priorities are there. Expand Schedule, spending and daily tools for more. Dashboard has the summaries, and More views opens Calendar, Weekly review, and History.',
  ar:'نظرة عامة بتفتح على اليوم. فيها الأرصدة والإجراءات السريعة والأولويات. افتح المواعيد والإنفاق والأدوات اليومية للتفاصيل. لوحة المعلومات فيها الملخّصات، والمزيد من العروض فيه التقويم والمراجعة الأسبوعية والسجل.',
 },
];

export function companionHelp(user,question,language=languageProfile(question).language){
 const normalized=question.normalize('NFKC').toLowerCase().replace(/[أإآ]/g,'ا').replace(/[ً-ٰٟ]/g,'').trim();
 // A purchase description can contain words such as “offline”, “review”, or “dark mode”.
 if(/^(?:(?:i (?:just )?)?(?:spent|paid|bought|earned|received|got paid)|(?:please )?(?:add|record|log) (?:an? )?(?:expense|income|task|subscription|withdrawal|budget|item)|rename|reverse|صرفت|دفعت|اشتريت|قبضت|سجل مصروف|ضيف مصروف|ذكرني|sraft|sarfet|dfa3et)\b/u.test(normalized)||
    /^(?:صرفت|دفعت|اشتريت|قبضت|سجل مصروف|ضيف مصروف|ذكرني)(?:\s|$)/u.test(normalized))return null;
 const topic=topics.find(item=>item.match.test(normalized));
 if(!topic)return null;
 const ar=language==='ar';
 if(topic.access&&!hasAccess(user,topic.access))return {help:true,answer:ar?'حسابك ما عنده صلاحية للمال. تواصل مع مدير مساحة العمل إذا بدك صلاحية.':'Your account does not have Money access. Ask your workspace administrator if you need it.'};
 return {help:true,answer:topic[ar?'ar':'en']};
}
