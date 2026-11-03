// Small, explicit dialect vocabulary; never infer an unsupported financial action.
export function normalizeLebanese(input){
 input=input.trim().replace(/^(?:(?:please|plz|pls|baddi|badde|bedde|bade)\s+)+/i,'').replace(/^(?:a3ref|e3raf)\s+/i,'');
 if(/^(?:kifak|kifik|kifek|keefak|kifkon|ahlan|ahla|hi kifak)[.!?\s]*$/i.test(input))input='مرحبا';
 // Translate only known command words, preserving the user's item/task names.
 const arabizi=/^(?:sarfet|saraft|saraft|daf3et|dafa3et|2ebedt|2abadet|ebedt|zakerne|zakerni|zakkerni|shou|shu|adde|2adde|kam|marhaba|merci|cancel)\b/i.test(input.trim());
 if(arabizi)input=input.replace(/^(sarfet|saraft)\b/i,'صرفت').replace(/^(daf3et|dafa3et)\b/i,'دفعت').replace(/^(2ebedt|2abadet|ebedt)\b/i,'قبضت').replace(/^(zakerne|zakerni|zakkerni)\b/i,'ذكرني').replace(/^(shou|shu)\b/i,'شو').replace(/^(adde|2adde|kam)\b/i,'قديش').replace(/^marhaba\b/i,'مرحبا').replace(/^merci\b/i,'شكرا')
  .replace(/\b(lyoum|elyom|elyoum|l yom)\b/gi,'اليوم').replace(/\b(bokra|bukra)\b/gi,'بكرا').replace(/\b(mbereh|mbarah|mberih)\b/gi,'مبارح').replace(/\b(hal shaher|halshaher)\b/gi,'هالشهر').replace(/\b(hal esbou3|halesbou3)\b/gi,'هالاسبوع').replace(/\b(3ande|3andi|aande)\b/gi,'عندي').replace(/\bsarfet\b/gi,'صرفت').replace(/\b(dollar|dolar|dollars)\b/gi,'دولار').replace(/\b(lira|liret)\b/gi,'ليرة').replace(/\b(3al se3a|3al se3a|el se3a|se3a)\b/gi,'الساعة').replace(/\b(bel lel|bel leil|masa)\b/gi,'المسا').replace(/\b(soboh|sobe7)\b/gi,'الصبح').replace(/\b(3a|3ala|for)\b/gi,'على');
 let q=input.trim().replace(/[٠-٩]/g,d=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/[۰-۹]/g,d=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[\u064B-\u065F\u0670]/g,'').replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').replace(/٫/g,'.').replace(/٬/g,'');
 const arabic=/[\u0600-\u06ff]/.test(q);
 if(!arabic)return {question:q,arabic:arabizi};
 if(/^(مرحبا|اهلا|هاي|كيفك|شكرا|يسلمو)[!؟?. ]*$/.test(q))return {arabic,answer:'اهلا! كيف فيني ساعدك اليوم؟ فيك تقلي «ذكرني العب فوتبول بكرا الساعة 9 المسا» او «صرفت 15 دولار على الغدا».'};
 if(/^(الغي|الغيها|خلص بلاش|بلاها|الغاء)$/.test(q))return {arabic,question:'cancel'};
 q=q.replace(/^(?:(?:لو سمحت|بليز|بدي|بدّي|ممكن)\s+)+/,'').replace(/^اعرف\s+/,'');
 if(/^(?:ضيف|اضف|سجل) مصروف[؟? ]*$/.test(q))return {arabic,question:'add expense',needsCurrency:true};
 const command=q.match(/^(ذكرني|ضيف مهمة|ضيف مهمه|اضف مهمة|سجل مهمة|صرفت|دفعت|ضيف مصروف|سجل مصروف|قبضت|ضيف دخل|سجل دخل)\s+(.+)$/);
 if(command){
  const type=/^(ذكرني|ضيف مهمة|ضيف مهمه|اضف مهمة|سجل مهمة)$/.test(command[1])?'task':/^(قبضت|ضيف دخل|سجل دخل)$/.test(command[1])?'income':'expense';
  let rest=command[2].replace(/بعد بكرا/g,'__AFTER_TOMORROW__');
  if(rest.includes('__AFTER_TOMORROW__'))return {arabic,answer:'لبعد بكرا، حدد التاريخ بصيغة YYYY-MM-DD كرمال ما اغلط بالموعد. ما انحفظ شي.'};
  rest=rest.replace(/بكرا|بكرة/g,' tomorrow ').replace(/اليوم/g,' today ').replace(/مبارح|امبارح/g,' yesterday ')
   .replace(/(?:عالساعة|عالساعه|الساعة|الساعه)\s*(\d{1,2}(?::\d{2})?)\s*(المسا|مسا|بالليل|ليلا|الصبح|صباحا|صباح)?/g,(_,n,p)=>` at ${n}${p?(/المسا|مسا|بالليل|ليلا/.test(p)?' pm':' am'):''} `)
   .replace(/دولار(?:ات)?/g,' USD ').replace(/ليرة(?: لبنانية)?|ليره(?: لبنانيه)?/g,' LBP ')
   .replace(/^ان[ي]?\s+/,'').replace(/\s+(?:على|علي|حق|من|ع)\s+/g,type==='income'?' from ':' for ').replace(/\s+/g,' ').trim();
  if(/الساعة|الساعه|عالساعة|عالساعه/.test(rest))return {arabic,answer:'حدد الساعة بالارقام ومع الصبح او المسا، مثلا «الساعة 9 المسا». ما انحفظ شي.'};
  // Unparsed money number words are left for the existing amount clarification.
  return {arabic,question:`add ${type} ${rest}`,needsCurrency:type!=='task'&&!/\b(?:USD|LBP)\b|\$/i.test(rest)};
 }
 const period=/هالاسبوع|هيدا الاسبوع|هذا الاسبوع/.test(q)?'this week':/هالشهر|هيدا الشهر|هذا الشهر/.test(q)?'this month':/مبارح/.test(q)?'yesterday':/بكرا|بكرة/.test(q)?'tomorrow':'today';
 if(/^(?:راجع|شو|عرض).*اشتراك/.test(q))return {arabic,question:'review subscriptions'};
 if(/^(?:اهداف|شو).*ادخار|^اهداف التوفير/.test(q))return {arabic,question:'savings goals'};
 if(/^(?:وضع|شو|كيف).*ميزاني/.test(q))return {arabic,question:'budget status'};
 if(/^قارن.*(?:مصروف|مصاريف|صرف)/.test(q))return {arabic,question:'compare spending this month'};
 if(/^(?:كيف|وين).*(?:وفر|توفير)|^خفف.*(?:مصروف|مصاريف)/.test(q))return {arabic,question:'how can I save more'};
 const quick=q.match(/^(?:عندي|معي)\s+(\d+)\s+(?:دقيقة|دقيقه|دقايق)$/);
 if(quick)return {arabic,question:`I have ${quick[1]} minutes`};
 const afford=q.match(/^(?:فيني|بقدر)\s+(?:اصرف|اشتري)\s+(\d+(?:\.\d{1,2})?)\s*(دولار|ليرة|ليره|USD|LBP)?[؟?]*$/i);
 if(afford)return afford[2]?{arabic,question:`Can I afford ${afford[1]} ${/لير|LBP/i.test(afford[2])?'LBP':'USD'}?`}:{arabic,answer:'حدّد العملة كمان، مثلاً «فيني اصرف 100 دولار؟» أو «فيني اصرف 100000 ليرة؟».'};
 if(/^(قديش|كم|شو|شقد)/.test(q)&&/وفرت|مدخرات|توفير|تحويش/.test(q))return {arabic,question:`what are my savings ${period}`};
 if(/^(قديش|كم|شو|شقد)/.test(q)&&/صرفت|مصروف|مصاريف/.test(q))return {arabic,question:`expenses ${period}`};
 if(/^(شو|ايش)/.test(q)&&/عندي|خططي|مهام|برنامج/.test(q))return {arabic,question:`plans ${period}`};
 if(/^(رتب|نظم|خطط)/.test(q)&&/يومي|نهاري|بكرا/.test(q))return {arabic,question:period==='tomorrow'?'plan tomorrow':'plan my day'};
 if(/^(?:شو|ايش).*?(?:لازم اعمل|المهمة الجاية|المهمه الجايه)/.test(q))return {arabic,question:'what is my next task?'};
 if(/^(?:شو|ايش).*?(?:تاخر|متاخر)/.test(q))return {arabic,question:'show overdue tasks'};
 if(/^تقرير/.test(q))return {arabic,question:`report ${period}`};
 return {arabic,question:null};
}
