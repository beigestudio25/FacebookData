import React from 'react';
import {
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Terminal,
  Cpu,
  Layers,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  Database,
  FileSpreadsheet
} from 'lucide-react';

export const TechnicalGuide: React.FC = () => {
  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-2xl">
        <div className="flex items-center gap-2.5 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
          <BookOpen className="w-4 h-4" />
          الدليل الهندسي الشامل لبناء النظام
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-100 leading-tight">
          معمارية بناء محرك استخراج وتحليل عقارات فيسبوك بالذكاء الاصطناعي
        </h2>
        <p className="text-sm text-slate-400 mt-2 leading-relaxed">
          شرح تحليلي مفصل خطوة بخطوة لبناء خط الأتمتة (End-to-End Automation Pipeline) لمعالجة التحديات التقنية مثل تخطي قيود فيسبوك، تحسين كفاءة وتكلفة استدعاءات Gemini API، وتصدير قواعد بيانات نظيفة لفرق التسويق العقاري.
        </p>

        {/* System Flow Diagram */}
        <div className="mt-6 p-4 bg-slate-950/80 rounded-2xl border border-slate-800">
          <span className="text-xs font-bold text-slate-400 block mb-3">
            مخطط تدفق البيانات (Data Pipeline Architecture):
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-center">
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center mx-auto mb-1">
                1
              </span>
              <h4 className="font-bold text-xs text-slate-200">Playwright Scraper</h4>
              <p className="text-[11px] text-slate-400 mt-1">
                سحب المنشورات مع محاكاة السلوك البشري والكوكيز
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <span className="w-6 h-6 rounded-full bg-teal-500/20 text-teal-400 font-bold text-xs flex items-center justify-center mx-auto mb-1">
                2
              </span>
              <h4 className="font-bold text-xs text-slate-200">Regex & Filtering</h4>
              <p className="text-[11px] text-slate-400 mt-1">
                تصفية الهواتف المصرية واستبعاد المنشورات عديمة الفائدة
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <span className="w-6 h-6 rounded-full bg-sky-500/20 text-sky-400 font-bold text-xs flex items-center justify-center mx-auto mb-1">
                3
              </span>
              <h4 className="font-bold text-xs text-slate-200">Gemini 3.6 Flash</h4>
              <p className="text-[11px] text-slate-400 mt-1">
                استخراج دلالي منظم بصيغة JSON صارمة للمالك والسعر
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-bold text-xs flex items-center justify-center mx-auto mb-1">
                4
              </span>
              <h4 className="font-bold text-xs text-slate-200">Pandas & Excel</h4>
              <p className="text-[11px] text-slate-400 mt-1">
                تصدير ملفات إكسيل منسقة مع روابط محادثات واتساب
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stage 1 Deep Dive */}
      <section className="bg-slate-900/80 rounded-2xl border border-slate-800 p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-sm border border-emerald-500/20">
            01
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100">
              المرحلة الأولى: إعداد البيئة وسحب المنشورات (Playwright Scraper)
            </h3>
            <p className="text-xs text-slate-400">
              تجاوز حماية منصة فيسبوك والتمرير اللانهائي (Infinite Scroll)
            </p>
          </div>
        </div>

        <div className="text-xs text-slate-300 space-y-3 leading-relaxed">
          <p>
            تعتمد منصة فيسبوك على آليات أمان متطورة تكتشف أدوات الأتمتة التقليدية مثل (Requests أو BeautifulSoup) بسبب اعتمادها على العرض من طرف العميل (Client-Side Rendering) وأكواد React المعقدة. لذلك فإن مكتبة <strong>Playwright</strong> هي الخيار الأنسب للأسباب التالية:
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-slate-300 pr-2">
            <li>
              <strong>محاكاة متصفح حقيقي (Chromium Context):</strong> نستخدم إعدادات <code className="text-emerald-400 font-mono">--disable-blink-features=AutomationControlled</code> لإخفاء بصمة الروبوتات البرمجية.
            </li>
            <li>
              <strong>إدارة الجلسات والكوكيز (Session Persistence):</strong> نقوم بحفظ ملف الكوكيز <code className="text-emerald-400 font-mono">fb_cookies.json</code> بعد تسجيل الدخول اليدوي لأول مرة، بحيث يتجاوز السكربت طلبات الدخول والتحقق بخطوتين (2FA) في كل مرة.
            </li>
            <li>
              <strong>الضغط التلقائي على أزرار "عرض المزيد" (See More):</strong> تحتوي معظم إعلانات العقارات على تفاصيل هامة (كالسعر وأرقام الهواتف) في نهاية النص بعد زر التوسيع. نقوم باستدعاء دالة تبحث عن هذه الأزرار وتضغطها قبل قراءة النصوص.
            </li>
            <li>
              <strong>التمرير البشري العشوائي:</strong> لتفادي الحظر المؤقت لـ IP، يتم إدراج فترات انتظار عشوائية تتراوح بين 2 إلى 4 ثوانٍ مع مسافات تمرير متغيرة.
            </li>
          </ul>
        </div>
      </section>

      {/* Stage 2 Deep Dive */}
      <section className="bg-slate-900/80 rounded-2xl border border-slate-800 p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center font-bold text-sm border border-teal-500/20">
            02
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100">
              المرحلة الثانية: التنقية والاستخراج الأولي (Regex & Filtering Engine)
            </h3>
            <p className="text-xs text-slate-400">
              استخراج الأرقام المصرية بدقة وتوفير تكاليف استهلاك الـ API بنسبة تصل لـ 50%
            </p>
          </div>
        </div>

        <div className="text-xs text-slate-300 space-y-3 leading-relaxed">
          <p>
            تعتبر هذه المرحلة صمام الأمان المالي والزمني للنظام؛ حيث توجد آلاف المنشورات في مجموعات فيسبوك لا تقدم أرقام اتصال أو تطلب التواصل عبر الرسائل الخاصة (إنبوكس). تصفية هذه المنشورات قبل إرسالها لـ Gemini توفر مبالغ طائلة وتسرع الأداء.
          </p>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
            <span className="font-bold text-emerald-400 block mb-1">
              النمط التعبيري المعتمد للهواتف المصرية:
            </span>
            <code className="text-[11px] font-mono text-slate-200 block bg-slate-900 p-2 rounded text-left" dir="ltr">
              r'(?:(?:\+|00)20[\s.-]?)?0?(1[0125][\s.-]?\d(?:[\s.-]?\d){7})'
            </code>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <h5 className="font-bold text-slate-200 mb-1">توحيد الأرقام المشرقية (٠-٩)</h5>
              <p className="text-slate-400">
                يقوم الكثير من المعلنين بكتابة الأرقام بالأرقام العربية الشرقية (مثل ٠١٠١٢٣٤٥٦٧٨). يتم تحويلها برمجياً لأرقام لاتينية أولاً قبل تشغيل الـ Regex.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <h5 className="font-bold text-slate-200 mb-1">التعرف التلقائي على المشغل (Carrier)</h5>
              <p className="text-slate-400">
                التمييز التلقائي لشبكات المحمول المصرية الأربعة: 010 فودافون، 011 اتصالات، 012 أورنج، و 015 شركة وي (Telecom Egypt).
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stage 3 Deep Dive */}
      <section className="bg-slate-900/80 rounded-2xl border border-slate-800 p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center font-bold text-sm border border-sky-500/20">
            03
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100">
              المرحلة الثالثة: التحليل الدلالي المنظم بـ Gemini 3.6 Flash
            </h3>
            <p className="text-xs text-slate-400">
              استخراج دقيق للمالك المباشر، السعر، والنوع مع تقييد المخرجات بـ JSON Schema
            </p>
          </div>
        </div>

        <div className="text-xs text-slate-300 space-y-3 leading-relaxed">
          <p>
            يتميز نموذج <code className="text-sky-400 font-mono">gemini-3.6-flash</code> بالسرعة الفائقة، الفهم العميق للعامية المصرية والمصطلحات العقارية الدارجة (مثل: "لقطة"، "أوفر"، "من المالك مباشرة"، "تشطيب ألترا سوبر لوكس"، "عمولة شهر")، بالإضافة إلى الأداء العالي والتوزيع الدقيق للأدوار.
          </p>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
            <span className="font-bold text-sky-400 block mb-1">
              مخطط الحقول المستخرجة (Response Schema Constraints):
            </span>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-300 mt-2">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span><strong>is_real_estate:</strong> التحقق من حقيقة الإعلان واستبعاد السبام</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span><strong>advertiser_type:</strong> مالك / وسيط وسمسار / مشتري</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span><strong>deal_type:</strong> بيع / إيجار / مطلوب / تنازل</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span><strong>property_type:</strong> شقة / فيلا / محل / أرض / مكتب</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span><strong>price:</strong> السعر ونظام الدفع (كاش/أقساط)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span><strong>location:</strong> المنطقة أو الكمبوند بدقة</span>
              </li>
            </ul>
          </div>

          <p className="text-slate-400 text-[11px]">
            💡 <em>ملاحظة هندسية:</em> نضبط درجة الحرارة على <code className="text-sky-300 font-mono">temperature=0.1</code> لضمان الحتمية والاستقرار التام في المخرجات وعدم اختلاق معلومات غير موجودة في النص.
          </p>
        </div>
      </section>

      {/* Stage 4 Deep Dive */}
      <section className="bg-slate-900/80 rounded-2xl border border-slate-800 p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-sm border border-amber-500/20">
            04
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100">
              المرحلة الرابعة: التصدير وجداول البيانات (Pandas & OpenPyXL)
            </h3>
            <p className="text-xs text-slate-400">
              تجهيز ملفات Excel جاهزة لفرق التسويق والـ CRM وروابط واتساب بنقرة واحدة
            </p>
          </div>
        </div>

        <div className="text-xs text-slate-300 space-y-3 leading-relaxed">
          <p>
            المخرجات النهائية يتم تنظيمها في جدول إكسيل احترافي يتضمن:
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-slate-300 pr-2">
            <li>
              <strong>روابط واتساب فورية (Click-to-Chat):</strong> يتم توليد صيغ روابط بصيغة <code className="text-amber-400 font-mono">https://wa.me/201xxxxxxxxx</code> بحيث يستطيع مسؤول المبيعات النقر مباشرة على الخلية لفتح محادثة واتساب مع المالك دون الحاجة لتسجيل الرقم في الهاتف أولاً.
            </li>
            <li>
              <strong>تنسيق بصري متقدم:</strong> تمييز إعلانات "المالك المباشر" باللون الأخضر الهادئ لسهولة فرز الفرص الذهبية، وتظليل إعلانات الوسطاء باللون الأزرق.
            </li>
            <li>
              <strong>دعم الترميز العربي الكامل (UTF-8 with BOM):</strong> عند تصدير ملفات CSV، نستخدم ترميز <code className="text-amber-400 font-mono">utf-8-sig</code> لضمان فتح الملف في Microsoft Excel على نظام ويندوز دون ظهور رموز غريبة أو تشويه في الحروف العربية.
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
};
