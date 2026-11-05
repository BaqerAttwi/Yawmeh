import {detectedCompanionLanguage} from './lebanese-language.js';
import {arabicDetail} from './companion-detail-ar.js';
// Presentation only: preserve original amounts, dates, names, and draft values.
export const companionLanguage=detectedCompanionLanguage;

export function draftFields(action,language='en') {
 const ar=language==='ar',d=action.initial;
 return [
  [ar?'الاسم':'Name',d.title],
  [ar?'المبلغ':'Amount',d.amount==null?null:`${d.amount} ${d.currency||'USD'}`],
  [ar?'التاريخ':'Date',d.due||d.date||d.renewal||d.start],
  [ar?'الوقت':'Time',d.scheduled_time],
 ].filter(([,value])=>value!==undefined&&value!==null&&value!=='');
}

// Extract only known report templates, keeping the exact displayed currency values.
export function replyMetrics(text,language='en') {
 const ar=language==='ar';
 let match=text.match(/^Savings balance as of (\d{4}-\d{2}-\d{2}): (.*?)\. Available to spend: (.*?)\.$/)||text.match(/^المدخرات لغاية (\d{4}-\d{2}-\d{2}): (.*?)\. المتاح للصرف: (.*?)\.$/);
 if(match)return {caption:ar?'لغاية '+match[1]:'As of '+match[1],items:[[ar?'المدخرات':'Savings',match[2]],[ar?'المتاح للصرف':'Available to spend',match[3]]]};
 match=text.match(/^In this period: income (.*?), expenses (.*?), income allocated to savings (.*?), savings withdrawals (.*?)\.$/)||text.match(/^بهالفترة: الدخل (.*?)، المصاريف (.*?)، المخصّص من الدخل للادخار (.*?)، السحب من المدخرات (.*?)\.$/);
 if(match)return {caption:ar?'خلال هالفترة':'During this period',items:[[ar?'الدخل':'Income',match[1]],[ar?'المصاريف':'Expenses',match[2]],[ar?'مخصّص للادخار':'Allocated to savings',match[3]],[ar?'سحب من المدخرات':'Savings withdrawals',match[4]]]};
 return null;
}

export function presentReply(result,language) {
 if(language!=='ar'){
  if(result.context?.field==='time')return {...result,language:'en',answer:'What time? For example, 1 pm or 13:00. Your task draft is still here; nothing has been saved.'};
  if(result.context?.field==='date')return {...result,language:'en',answer:'Which date? Say today, tomorrow, or enter YYYY-MM-DD. Your task draft is still here; nothing has been saved.'};
  if(result.action)return {...result,language:'en',answer:'Your draft is ready. Review the details below before saving.'};
  if(result.context?.field&&/^(على شو|قديش المبلغ|بأي عملة)/.test(result.answer))return {...result,language:'en',answer:{title:'What should I call this entry? Say cancel to stop.',amount:'What is the amount? Enter a number such as 15.50, or say cancel.',currency:'Which currency? Enter a configured currency code, such as USD or LBP.'}[result.context.field]};
  const known={
   'لغيت المسودة. ما انحفظ شي.':'Draft cancelled. Nothing was saved.',
   'اهلا! كيف فيني ساعدك اليوم؟ فيك تقلي «ذكرني العب فوتبول بكرا الساعة 9 المسا» او «صرفت 15 دولار على الغدا».':'Hi! I can help you plan your day or prepare a task or money entry. What would you like to do?',
   'ما فهمت الطلب منيح. جرب «شو عندي اليوم؟»، «قديش صرفت هالشهر؟» او «صرفت 15 دولار على الغدا». بفهم طلبات محددة، وما انحفظ شي.':'I couldn’t understand that request. Try “Plan my day”, “Expenses this month”, or “I spent 15 dollars for lunch”. Nothing was saved.',
  };
  return {...result,language:'en',answer:known[result.answer]||result.answer};
 }
 if(result.action)return {...result,language:'ar',answer:'المسودة جاهزة. راجع التفاصيل قبل الحفظ؛ بعد ما انحفظ شي.'};
 if(result.context?.field){
  if(result.context.field==='time')return {...result,language:'ar',answer:'حدّد الوقت مثل 1 المسا أو 13:00. طلبك بعده محفوظ كمسودة؛ ما انحفظ شي بسجلاتك.'};
  if(result.context.field==='date')return {...result,language:'ar',answer:'بأي تاريخ؟ قلّي اليوم أو بكرا، أو اكتب تاريخ مثل 2026-11-04. ما انحفظ شي.'};
  const prompts={title:'شو اسم العملية؟ فيك تقول «الغي» لنوقف.',amount:'قديش المبلغ؟ اكتب رقم مثل 15.50، أو «الغي» لنوقف.',currency:'بأي عملة؟ اكتب رمز عملة من العملات اللي ضفتها، مثل USD أو LBP.'};
  // Preserve validation feedback instead of replacing it with a generic prompt.
  if(result.answer.startsWith('Choose one configured currency: '))return {...result,language:'ar',answer:result.answer.replace('Choose one configured currency: ','اختار عملة من العملات المضافة: ').replace('. Nothing was saved.','. ما انحفظ شي.')};
  if(/^(What|How much|Which|Please give|Enter a positive|على شو|قديش المبلغ|بأي عملة)/.test(result.answer))return {...result,language:'ar',answer:prompts[result.context.field]};
 }
 const exact={
  'Your message reached me as text. If you used Speak, your words were transcribed. Tell me what you would like to add or ask.':'وصلتني رسالتك كنص. إذا استعملت الميكروفون، كلامك تحوّل لنص. قلّي شو بدّك تضيف أو تسأل.',
  'I’m a free local helper, so I work with supported requests and your recorded data. Try “Plan my day”, “Can I afford $100?”, “How can I save more?”, “Review subscriptions”, “Savings goals”, or “I spent 15 for lunch”.':'أنا مساعد محلي مجاني وبفهم طلبات محددة من سجلاتك. جرّب «رتّبلي نهاري»، «قديش صرفت هالشهر؟» أو «صرفت 15 دولار على الغدا».',
  'Hi! What would help today? I can prepare a task or money entry, or show your plans and savings. Use a quick action below or tell me what to add.':'أهلا! شو بيساعدك اليوم؟ فيني حضّر مهمة أو عملية مصاري، أو فرجيك خططك ومدخراتك. اختار إضافة أو قلّي شو بدّك.',
  'Draft cancelled. Nothing was saved.':'لغيت المسودة. ما انحفظ شي.',
  'Your account does not have Money access.':'حسابك ما عنده صلاحية للمصاري.',
  'Your account does not have Tasks access.':'حسابك ما عنده صلاحية للمهام.',
  'Your account has no Money or Tasks access.':'حسابك ما عنده صلاحية للمصاري أو المهام.',
  'No tasks are scheduled in this period.':'ما في مهام مسجّلة بهالفترة.',
  'Based on recorded data; future transactions and uncreated recurring tasks are not predicted.':'حسب البيانات المسجّلة؛ العمليات المستقبلية والمهام المتكرّرة غير المنشأة مش محسوبة.',
  'No active subscriptions recorded.':'ما في اشتراكات مفعّلة مسجّلة.',
  'No unfinished tasks are recorded by this date. Choose one small priority, some personal time, and room to rest.':'ما في مهام معلّقة لحد هالتاريخ. اختار أولوية صغيرة وخلي وقت إلك وللراحة.',
  'Please use valid dates as YYYY-MM-DD, or choose dates below.':'اختار تواريخ صحيحة بصيغة YYYY-MM-DD، أو استعمل اختيار الفترة.',
  'Choose a valid start and end date, with the start first.':'اختار تاريخ بداية ونهاية صحيحين، والبداية قبل النهاية.',
 };
 let complete=true;
 const answer=result.answer.split('\n\n').map(line=>{
  if(exact[line])return exact[line];
  const detailed=arabicDetail(line);if(detailed!==null)return detailed;
  if(/^Report: (\d{4}-\d{2}-\d{2}) through (\d{4}-\d{2}-\d{2}) \(inclusive\)\.$/.test(line))return line.replace(/^Report: (.*?) through (.*?) \(inclusive\)\.$/,'تقرير من $1 إلى $2 (شامل).');
  if(/^Savings balance as of /.test(line))return line.replace(/^Savings balance as of (.*?): (.*?)\. Available to spend: (.*?)\.$/,'المدخرات لغاية $1: $2. المتاح للصرف: $3.');
  if(/^In this period: income /.test(line))return line.replace(/^In this period: income (.*?), expenses (.*?), income allocated to savings (.*?), savings withdrawals (.*?)\.$/,'بهالفترة: الدخل $1، المصاريف $2، المخصّص من الدخل للادخار $3، السحب من المدخرات $4.');
  if(/^Native balances: /.test(line))return line.replace(/^Native balances: /,'الأرصدة بعملتها الأصلية: ').replace(/ spending; /g,' للصرف؛ ').replace(/ savings/g,' مدخرات').replace(/\. Combined figures below are approximate (.*?) using saved entry rates\.$/,'. الأرقام المجمّعة أدناه تقريبية بـ $1 حسب أسعار الصرف المحفوظة.');
  if(/^Tasks due in this period: /.test(line))return line.replace(/^Tasks due in this period: (\d+) of (\d+) complete; (\d+) pending\.$/,'مهام هالفترة: $1 مكتملة من أصل $2؛ $3 معلّقة.');
  if(/^Plus \d+ more pending tasks in Tasks\.$/.test(line))return line.replace(/^Plus (\d+) more pending tasks in Tasks\.$/,'وفي $1 مهام معلّقة إضافية بتطبيق المهام.');
  if(/^• \d{4}-\d{2}-\d{2}/.test(line))return line.replace(/ at (\d{2}:\d{2})/,' الساعة $1');
  if(/^Suggested priorities for /.test(line))return line.replace(/^Suggested priorities for (.*):$/,'أولويات مقترحة لـ $1:');
  if(/^\d+\. .* — (overdue from|due) \d{4}/.test(line))return line.replace(/ — overdue from /,' — متأخرة من ').replace(/ — due /,' — موعدها ').replace(/ at (\d{2}:\d{2})/,' الساعة $1').replace(/ · (\d+) minutes$/,' · $1 دقيقة');
  if(/^\d+ unfinished tasks due by this date;/.test(line))return line.replace(/^(\d+) unfinished tasks due by this date; (\d+) estimated minutes/,'$1 مهام معلّقة لحد هالتاريخ؛ $2 دقيقة تقديرية').replace(/, plus (\d+) tasks without estimates/,'، و$1 مهام بدون تقدير للوقت').replace('. Start with one task, then take a break. This is a suggestion; nothing has been rescheduled.','. بلّش بمهمة وخد استراحة. هيدا اقتراح؛ ما تغيّر أي موعد.');
  if(/[\u0600-\u06ff]/.test(line)&&!/[A-Za-z]{4,}/.test(line))return line;
  complete=false;return line;
 }).join('\n\n');
 return {...result,answer,language:'ar',hasEnglishDetails:!complete};
}
