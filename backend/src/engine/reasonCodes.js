const DEFAULTS = {
  FRAUD_SANCTIONS: {
    en: 'We cannot proceed because of a screening result.',
    ur: 'اسکریننگ کے نتیجے کی وجہ سے آگے نہیں بڑھا جا سکتا۔',
    ar: 'لا يمكن المتابعة بسبب نتيجة الفحص.',
  },
  ELIG_AGE: {
    en: 'Age is outside the range allowed for this product.',
    ur: 'عمر اس پروڈکٹ کی مقررہ حد سے باہر ہے۔',
    ar: 'العمر خارج النطاق المسموح لهذا المنتج.',
  },
  ELIG_KYC: {
    en: 'Identity verification is not complete.',
    ur: 'شناخت کی تصدیق مکمل نہیں۔',
    ar: 'التحقق من الهوية غير مكتمل.',
  },
  ELIG_AMOUNT: {
    en: 'The amount is outside the product limits.',
    ur: 'رقم پروڈکٹ کی حد سے باہر ہے۔',
    ar: 'المبلغ خارج حدود المنتج.',
  },
  ELIG_TENOR: {
    en: 'The tenor is outside the product limits.',
    ur: 'مدت پروڈکٹ کی حد سے باہر ہے۔',
    ar: 'المدة خارج حدود المنتج.',
  },
  ELIG_EMPLOYMENT: {
    en: 'This employment type is not eligible for the product.',
    ur: 'یہ ملازمت اس پروڈکٹ کے لیے اہل نہیں۔',
    ar: 'نوع العمل غير مؤهل لهذا المنتج.',
  },
  ELIG_DELINQUENCY: {
    en: 'Recent repayment history is outside policy.',
    ur: 'حالیہ ادائیگی کی تاریخ پالیسی سے باہر ہے۔',
    ar: 'سجل السداد الأخير خارج السياسة.',
  },
  ELIG_WRITEOFF: {
    en: 'A previous write-off is on the credit file.',
    ur: 'کریڈٹ فائل پر پرانا رائٹ آف موجود ہے۔',
    ar: 'يوجد شطب سابق في الملف الائتماني.',
  },
  ELIG_RESIDENCY: {
    en: 'Residency does not match this product.',
    ur: 'رہائش اس پروڈکٹ سے مطابقت نہیں رکھتی۔',
    ar: 'الإقامة لا تطابق هذا المنتج.',
  },
  DBR_CAP: {
    en: 'The instalment would take repayments above the affordability cap.',
    ur: 'قسط ادائیگی کی گنجائش کی حد سے اوپر چلی جاتی ہے۔',
    ar: 'القسط تتجاوز حد القدرة على السداد.',
  },
  CASHFLOW_COVER: {
    en: 'Business cash flow does not cover the instalment safely.',
    ur: 'کاروباری کیش فلو قسط کو محفوظ حد تک نہیں ڈھانپتا۔',
    ar: 'التدفق النقدي لا يغطي القسط بهامش آمن.',
  },
  EXPOSURE_CAP: {
    en: 'Total exposure would exceed the configured limit.',
    ur: 'کل ایکسپوژر مقررہ حد سے تجاوز کر جائے گا۔',
    ar: 'إجمالي التعرض يتجاوز الحد المحدد.',
  },
  SCORE_LOW: {
    en: 'The score is below the decline cut-off.',
    ur: 'اسکور منظوری کی کم از کم حد سے نیچے ہے۔',
    ar: 'الدرجة أقل من حد الرفض.',
  },
  SCORE_REFER: {
    en: 'The score needs a person to review it.',
    ur: 'اسکور کے لیے انسانی جائزہ درکار ہے۔',
    ar: 'الدرجة تحتاج إلى مراجعة بشرية.',
  },
  APPROVE_CAPACITY: {
    en: 'Repayments fit inside your affordability cap.',
    ur: 'قسط آپ کی ادائیگی کی گنجائش کے اندر ہے۔',
    ar: 'القسط ضمن حد قدرتك على السداد.',
  },
  APPROVE_STABILITY: {
    en: 'Income has been steady for at least a year.',
    ur: 'آمدن کم از کم ایک سال سے مستحکم ہے۔',
    ar: 'الدخل مستقر منذ سنة على الأقل.',
  },
  APPROVE_BUREAU: {
    en: 'Credit history supports the offer.',
    ur: 'کریڈٹ ہسٹری اس پیشکش کی حمایت کرتی ہے۔',
    ar: 'السجل الائتماني يدعم العرض.',
  },
  DOA_ABOVE_STP: {
    en: 'The amount is above the straight-through limit, so a credit officer reviews it.',
    ur: 'رقم خودکار منظوری کی حد سے اوپر ہے، اس لیے کریڈٹ آفیسر دیکھے گا۔',
    ar: 'المبلغ أعلى من حد المعالجة المباشرة ويحتاج مراجعة.',
  },
  DOA_COMMITTEE: {
    en: 'The amount sits above the committee threshold.',
    ur: 'رقم کمیٹی کی حد سے اوپر ہے۔',
    ar: 'المبلغ أعلى من حد اللجنة.',
  },
  PEP_REVIEW: {
    en: 'A politically exposed person match needs review.',
    ur: 'سیاسی طور پر نمایاں شخص کی مطابقت پر جائزہ درکار ہے۔',
    ar: 'تطابق شخص سياسي بارز يحتاج إلى مراجعة.',
  },
  FRAUD_DUPLICATE: {
    en: 'Several similar applications were seen recently.',
    ur: 'حالیہ دنوں میں کئی ملتی جلتی درخواستیں دیکھی گئیں۔',
    ar: 'ظهرت عدة طلبات مشابهة مؤخراً.',
  },
  FRAUD_DEVICE: {
    en: 'The device risk score needs a manual look.',
    ur: 'ڈیوائس رسک اسکور کے لیے دستی جائزہ درکار ہے۔',
    ar: 'درجة مخاطر الجهاز تحتاج مراجعة يدوية.',
  },
  SALARY_STOP: {
    en: 'New credit is paused because salary credits have stopped.',
    ur: 'تنخواہ کی آمد رک گئی ہے، اس لیے نیا قرض رکا ہوا ہے۔',
    ar: 'تم إيقاف الائتمان الجديد لتوقف إيداع الراتب.',
  },
  OVERRIDE: {
    en: 'An underwriter recorded a decision with a written reason.',
    ur: 'انڈر رائٹر نے تحریری وجہ کے ساتھ فیصلہ درج کیا۔',
    ar: 'سجل مكتتب القرار مع سبب مكتوب.',
  },
  ALT_DATA_WEAK: {
    en: 'Alternative data is not strong enough for this small-ticket product.',
    ur: 'متبادل ڈیٹا اس چھوٹے قرض کے لیے کافی مضبوط نہیں۔',
    ar: 'البيانات البديلة غير كافية لهذا التمويل الصغير.',
  },
  COOLING_OFF: {
    en: 'A recent decline is still inside the cooling-off window.',
    ur: 'حالیہ انکار ابھی کولنگ آف کی مدت میں ہے۔',
    ar: 'يوجد رفض حديث داخل فترة التهدئة.',
  },
  ELIG_AGE_MATURITY: {
    en: 'Try a shorter tenor or another product.',
    ur: 'کم مدت یا کوئی اور پروڈکٹ آزمائیں۔',
    ar: 'جرّب مدة أقصر أو منتجاً آخر.',
  },
  ELIG_INCOME: {
    en: 'Your income is below the minimum for this product.',
    ur: 'آپ کی آمدن اس پروڈکٹ کی کم از کم حد سے کم ہے۔',
    ar: 'دخلك أقل من الحد الأدنى لهذا المنتج.',
  },
  'RC-01': { en: 'We cannot offer this product for your age at this time.', ur: 'اس وقت عمر کی وجہ سے یہ پروڈکٹ نہیں دی جا سکتی۔', ar: 'لا يمكننا عرض هذا المنتج لعمرك حالياً.' },
  'RC-02': { en: 'Try a shorter tenor or another product.', ur: 'کم مدت یا کوئی اور پروڈکٹ آزمائیں۔', ar: 'جرّب مدة أقصر أو منتجاً آخر.' },
  'RC-03': { en: 'This product is not available for your residency status.', ur: 'یہ پروڈکٹ آپ کی رہائش کے لیے دستیاب نہیں۔', ar: 'هذا المنتج غير متاح لحالة إقامتك.' },
  'RC-06': { en: 'Your income is below the minimum for this product.', ur: 'آپ کی آمدن اس پروڈکٹ کی کم از کم حد سے کم ہے۔', ar: 'دخلك أقل من الحد الأدنى لهذا المنتج.' },
  'RC-10': { en: 'We could not verify your identity; please visit a branch.', ur: 'شناخت تصدیق نہیں ہو سکی؛ براہ کرم برانچ تشریف لائیں۔', ar: 'تعذر التحقق من هويتك؛ يرجى زيارة الفرع.' },
  'RC-11': { en: 'Your application needs additional review.', ur: 'آپ کی درخواست کو مزید جائزہ درکار ہے۔', ar: 'طلبك يحتاج إلى مراجعة إضافية.' },
  'RC-13': { en: 'You already have an application in progress.', ur: 'آپ کی ایک درخواست پہلے سے جاری ہے۔', ar: 'لديك طلب قيد المعالجة بالفعل.' },
  'RC-20': { en: 'Credit history prevents approval right now.', ur: 'کریڈٹ ہسٹری اس وقت منظوری نہیں دیتی۔', ar: 'السجل الائتماني يمنع الموافقة حالياً.' },
  'RC-22': { en: 'Credit history prevents approval.', ur: 'کریڈٹ ہسٹری منظوری نہیں دیتی۔', ar: 'السجل الائتماني يمنع الموافقة.' },
  'RC-30': { en: 'Your existing obligations are high compared with income; a lower amount may be possible.', ur: 'موجودہ ادائیگیاں آمدن کے مقابلے میں زیادہ ہیں؛ کم رقم ممکن ہو سکتی ہے۔', ar: 'التزاماتك مرتفعة مقارنة بالدخل؛ قد يكون مبلغ أقل ممكناً.' },
  'RC-32': { en: 'Business cash flow does not cover payments at this amount.', ur: 'کاروباری کیش فلو اس رقم کی ادائیگی نہیں ڈھانپتا۔', ar: 'التدفق النقدي لا يغطي الدفعات عند هذا المبلغ.' },
  'RC-40': { en: 'Total exposure exceeds the allowed limit.', ur: 'کل ایکسپوژر مقررہ حد سے زیادہ ہے۔', ar: 'إجمالي التعرض يتجاوز الحد المسموح.' },
  'RC-60': { en: 'Based on our assessment we cannot approve now.', ur: 'جائزے کی بنیاد پر اس وقت منظوری نہیں دی جا سکتی۔', ar: 'بناءً على التقييم لا يمكننا الموافقة الآن.' },
};

const BRD_CODE = {
  ELIG_AGE: 'RC-01',
  ELIG_AGE_MATURITY: 'RC-02',
  ELIG_RESIDENCY: 'RC-03',
  ELIG_INCOME: 'RC-06',
  ELIG_KYC: 'RC-10',
  ELIG_EMPLOYMENT: 'RC-07',
  ELIG_DELINQUENCY: 'RC-20',
  ELIG_WRITEOFF: 'RC-22',
  ELIG_AMOUNT: 'RC-80',
  ELIG_TENOR: 'RC-02',
  FRAUD_SANCTIONS: 'RC-11',
  PEP_REVIEW: 'RC-11',
  FRAUD_DUPLICATE: 'RC-13',
  FRAUD_DEVICE: 'RC-14',
  DBR_CAP: 'RC-30',
  CASHFLOW_COVER: 'RC-32',
  EXPOSURE_CAP: 'RC-40',
  SCORE_LOW: 'RC-60',
  SCORE_REFER: 'RC-60',
  SALARY_STOP: 'RC-12',
};

export function customerReason(code, catalogue = {}) {
  const fromConfig = catalogue?.[code] || {};
  const fallback = DEFAULTS[code] || { en: 'See your banker for the detailed reason.', ur: 'تفصیل کے لیے بینک سے رجوع کریں۔', ar: 'راجع البنك للتفاصيل.' };
  return {
    en: fromConfig.en || fallback.en,
    ur: fromConfig.ur || fallback.ur,
    ar: fromConfig.ar || fallback.ar,
    brdCode: fromConfig.brdCode || BRD_CODE[code] || (String(code).startsWith('RC-') ? code : ''),
    customerSafe: fromConfig.customerSafe !== false,
  };
}

export function reasonCatalogue() {
  return DEFAULTS;
}
