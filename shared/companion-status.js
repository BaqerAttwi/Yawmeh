// Stable public reasons; provider response bodies and credentials stay server-side.
export function companionStatusMessage(code,language='en') {
 const messages={
  provider_request:['The AI provider rejected the request format or model settings. Ask the administrator to check the AI connection.','خدمة الذكاء الاصطناعي رفضت صيغة الطلب أو إعدادات النموذج. اطلب من المسؤول يراجع الاتصال.'],
  provider_busy:['The AI provider is temporarily unavailable. Using the local helper; try again shortly.','خدمة الذكاء الاصطناعي مش متاحة مؤقتاً. عم نستعمل المساعد المحلي؛ جرّب بعد شوي.'],
  usage_unavailable:['The server could not check your AI allowance. Ask the administrator to check the database setup.','الخادم ما قدر يتأكد من حد استعمال الذكاء الاصطناعي. اطلب من المسؤول يراجع إعداد قاعدة البيانات.'],
  records_unavailable:['The server could not read the records for this answer. Try refreshing your records.','الخادم ما قدر يقرأ السجلات لهالجواب. جرّب تحدّث سجلاتك.'],
  disabled:['AI is switched off on this server. Using the local helper.','الذكاء الاصطناعي مطفّي عالخادم. عم نستعمل المساعد المحلي.'],
  missing_key:['AI is not configured on this server. Using the local helper.','الذكاء الاصطناعي مش مُعدّ عالخادم. عم نستعمل المساعد المحلي.'],
  allowance_disabled:['The server AI allowance is disabled. Using the local helper.','حد استعمال الذكاء الاصطناعي معطّل عالخادم. عم نستعمل المساعد المحلي.'],
  allowance_reached:['The app AI allowance has been reached. Using the local helper.','وصلنا لحد استعمال الذكاء الاصطناعي بالتطبيق. عم نستعمل المساعد المحلي.'],
  rate_limited:['Too many AI requests in a minute. Wait a moment; the local helper is still available.','طلبات كتيرة خلال دقيقة. ناطر شوي؛ المساعد المحلي بعده متاح.'],
  provider_quota:['The AI provider has reached a usage or rate limit. Using the local helper.','خدمة الذكاء الاصطناعي وصلت لحد الاستعمال أو سرعة الطلبات. عم نستعمل المساعد المحلي.'],
  provider_auth:['The server AI credentials were rejected. Ask the administrator to check the connection.','الخدمة رفضت بيانات اتصال الذكاء الاصطناعي. اطلب من المسؤول يراجع الاتصال.'],
  model_unavailable:['The configured AI model is unavailable. Ask the administrator to check the model setting.','نموذج الذكاء الاصطناعي المحدّد مش متاح. اطلب من المسؤول يراجع الإعدادات.'],
  timeout:['AI took too long to reply. Try again; the local helper is available.','الذكاء الاصطناعي تأخّر بالرد. جرّب مرة تانية؛ المساعد المحلي متاح.'],
  invalid_response:['AI returned an incomplete or unreadable reply. Try again; using the local helper.','رد الذكاء الاصطناعي كان ناقص أو مش مفهوم. جرّب مرة تانية؛ عم نستعمل المساعد المحلي.'],
  unavailable:['Could not connect to AI. Using the local helper; try again shortly.','ما قدرنا نتّصل بالذكاء الاصطناعي. عم نستعمل المساعد المحلي؛ جرّب بعد شوي.'],
 };
 return (messages[code]||messages.unavailable)[language==='ar'?1:0];
}
