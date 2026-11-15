// Each pair describes the same step in English and Lebanese Arabic.
export const formGuideSteps = {
  task: [
    ['Give the task a name and choose its due date.', 'سمّي المهمة واختار تاريخ الاستحقاق.'],
    ['Use More options to add a time, repeat schedule, checklist, or email reminder.', 'افتح الخيارات الإضافية لتضيف وقت أو تكرار أو قائمة خطوات أو تذكير بالإيميل.'],
    ['Save the task. Use its checkbox when you finish.', 'احفظ المهمة وعلّم عليها لما تخلّص.'],
  ],
  expense: [
    ['Name the purchase and enter what you actually paid.', 'سمّي المشتريات واكتب قديش دفعت فعلياً.'],
    ['Choose the currency, purchase date, and category, then save.', 'اختار العملة وتاريخ الشراء والفئة، وبعدها احفظ.'],
    ['The amount comes out of your available spending balance.', 'المبلغ بينخصم من الرصيد المتاح للصرف.'],
  ],
  income: [
    ['Enter the source, full amount, currency, and date received.', 'اكتب مصدر الدخل والمبلغ الكامل والعملة وتاريخ القبض.'],
    ['Enter the part to set aside under Allocate to savings. For example, saving 200 from 700 leaves 500 to spend.', 'حطّ الجزء اللي بدّك توفّره بخانة الادخار. مثلاً إذا وفّرت ٢٠٠ من ٧٠٠، بيضلّ ٥٠٠ للصرف.'],
  ],
  opening: [
    ['Enter money you already had saved, with the amount, currency, and date.', 'سجّل المصاري اللي كانت موفّرة من قبل، مع المبلغ والعملة والتاريخ.'],
    ['Save it once. It adds to savings, while available spending stays the same.', 'احفظها مرّة وحدة. بتزيد المدخرات وبيضلّ الرصيد المتاح للصرف متل ما هو.'],
  ],
  withdrawal: [
    ['Choose the currency and enter how much to move from savings to spending.', 'اختار العملة واكتب قديش بدّك تنقل من المدخرات للصرف.'],
    ['Add the date and a reason. Any purchase you make with the money is a separate expense.', 'ضيف التاريخ والسبب. إذا اشتريت شي بهالمصاري، سجّله كمصروف منفصل.'],
  ],
  item: [
    ['Save a name, usual price in USD, and category, such as Coffee for $3.50.', 'احفظ الاسم والسعر المعتاد بالدولار والفئة، مثلاً قهوة بـ٣٫٥٠ دولار.'],
    ['Tap Log purchase later to record one expense, or choose Adjust purchase when the price differs.', 'بعدين اضغط سجّل الشراء لتضيف مصروف واحد، أو عدّل الشراء إذا السعر تغيّر.'],
  ],
  budget: [
    ['Name your spending plan and enter the limit in USD.', 'سمّي خطة الصرف وحطّ الحد بالدولار.'],
    ['Choose the start and end dates. The report compares recorded spending during that period with your limit.', 'اختار تاريخ البداية والنهاية. التقرير بيقارن المصاريف بهالفترة مع الحد.'],
  ],
  subscription: [
    ['Name the service and enter the usual charge in USD.', 'سمّي الخدمة واكتب قديش بتكلّف عادةً بالدولار.'],
    ['Choose weekly, monthly, or yearly, then enter the next date you expect to pay.', 'اختار أسبوعي أو شهري أو سنوي، وحطّ تاريخ الدفعة الجاية.'],
    ['Saving adds the plan. Use Record payment once the charge has been paid.', 'الحفظ بيضيف خطة الاشتراك. بعد ما تدفع، استعمل تسجيل الدفعة.'],
  ],
  renew: [
    ['Check the subscription name and upcoming renewal date.', 'تأكّد من اسم الاشتراك وتاريخ التجديد.'],
    ['Choose the currency you paid in and enter the actual charge.', 'اختار العملة اللي دفعت فيها واكتب المبلغ الفعلي.'],
    ['Record payment to log the expense and advance the renewal by one billing cycle.', 'سجّل الدفعة لينضاف المصروف وينتقل التجديد لدورة الدفع الجاية.'],
  ],
  taskCategory: [
    ['Choose a category that helps you group this task, then save.', 'اختار فئة بتساعدك ترتّب المهمة، وبعدها احفظ.'],
  ],
  goal: [
    ['Name what you’re saving for, set a USD target, and optionally choose a deadline.', 'سمّي الشي اللي عم توفّر كرماله، وحطّ هدف بالدولار وموعد إذا بدّك.'],
    ['After creating the goal, use Add savings to reserve part of your existing savings for it.', 'بعد إنشاء الهدف، استعمل إضافة المدخرات لتحجز جزء من مدخراتك إله.'],
  ],
  fund: [
    ['Enter how much of your available USD savings to assign to this goal.', 'اكتب قديش من مدخراتك المتاحة بالدولار بدّك تخصّص لهالهدف.'],
  ],
  release: [
    ['Enter how much to return from this goal to unassigned savings.', 'اكتب قديش بدّك ترجع من هالهدف للمدخرات غير المخصّصة.'],
    ['Use Withdraw from savings separately if you want to move that money to spending.', 'استعمل السحب من المدخرات بشكل منفصل إذا بدّك تنقل المصاري للصرف.'],
  ],
  currency: [
    ['Choose a home currency to set the default for your reports.', 'اختار العملة الأساسية اللي بتبدأ فيها التقارير.'],
    ['When adding a currency, enter how many units equal one unit of the reference currency.', 'لما تضيف عملة، اكتب قديش منها بيساوي وحدة من العملة المرجعية.'],
    ['A new default rate applies to future records. Saved records keep their original rates.', 'سعر الصرف الجديد بينطبق عالسجلات الجاية. السجلات القديمة بتحتفظ بسعرها.'],
  ],
  money: [
    ['Choose the entry that matches what happened: income, expense, existing savings, or savings withdrawal.', 'اختار نوع العملية حسب اللي صار: دخل، مصروف، مدخرات موجودة، أو سحب مدخرات.'],
    ['Check the amount, currency, and date before saving.', 'تأكّد من المبلغ والعملة والتاريخ قبل الحفظ.'],
  ],
};
