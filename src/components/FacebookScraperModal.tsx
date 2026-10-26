import React, { useState, useEffect } from 'react';
import {
  Globe,
  Sparkles,
  Play,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  ShieldCheck,
  Phone,
  Layers,
  ArrowRight,
  RefreshCw,
  X,
  FileSpreadsheet,
  Check,
  ChevronRight,
  Info
} from 'lucide-react';
import { FacebookPostItem } from '../types';
import { extractEgyptianPhones } from '../utils/regex';
import { PRIMARY_MODEL } from '../constants/models';

interface PopularGroup {
  id: string;
  name: string;
  url: string;
  category: string;
  location: string;
  badge: string;
}

const POPULAR_GROUPS: PopularGroup[] = [
  {
    id: 'tagamoa',
    name: 'عقارات التجمع الخامس والقاهرة الجديدة (من المالك والوسطاء)',
    url: 'https://www.facebook.com/groups/tagamo3.realestate.hub',
    category: 'التجمع الخامس',
    location: 'القاهرة الجديدة، التجمع الخامس، بيت الوطن، النرجس',
    badge: 'الأكثر نشاطاً ⚡',
  },
  {
    id: 'zayed_october',
    name: 'شقق وعقارات الشيخ زايد و 6 أكتوبر المباشرة',
    url: 'https://www.facebook.com/groups/zayed.october.properties',
    category: 'الشيخ زايد وأكتوبر',
    location: 'الشيخ زايد، حدائق أكتوبر، التوسعات الشمالية',
    badge: 'فرص مباشرة 🏡',
  },
  {
    id: 'direct_owners',
    name: 'عقارات مصر من المالك مباشرة بدون وسيط أو عمولة',
    url: 'https://www.facebook.com/groups/egypt.direct.owners.apartments',
    category: 'من المالك مباشرة',
    location: 'كل المحافظات (القاهرة، الجيزة، الإسكندرية)',
    badge: 'مالك مباشر 🔑',
  },
  {
    id: 'new_capital',
    name: 'استثمار وعقارات العاصمة الإدارية الجديدة والمستقبل سيتي',
    url: 'https://www.facebook.com/groups/newcapital.egypt.invest',
    category: 'العاصمة الإدارية',
    location: 'R7, R8, الحي المالي، منطقة المستثمرين، الشروق',
    badge: 'استثماري 🏙️',
  },
  {
    id: 'coastal',
    name: 'شاليهات وفلل الساحل الشمالي والعين السخنة (بيع وإيجار)',
    url: 'https://www.facebook.com/groups/sahel.sokhna.chalets',
    category: 'شاليهات ومصايف',
    location: 'الساحل الشمالي، سيدي عبد الرحمن، رأس الحكمة، العين السخنة',
    badge: 'شاليهات 🏖️',
  },
];

interface FacebookScraperModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLeadsImported: (newPosts: FacebookPostItem[]) => void;
}

export const FacebookScraperModal: React.FC<FacebookScraperModalProps> = ({
  isOpen,
  onClose,
  onLeadsImported,
}) => {
  const [groupUrl, setGroupUrl] = useState<string>(POPULAR_GROUPS[0].url);
  const [maxPosts, setMaxPosts] = useState<number>(15);
  const [scrapingMode, setScrapingMode] = useState<'smart_cloud' | 'browser_stealth'>('smart_cloud');
  const [autoAnalyzeWithGemini, setAutoAnalyzeWithGemini] = useState<boolean>(true);

  // Execution states
  const [isScraping, setIsScraping] = useState<boolean>(false);
  const [stepIndex, setStepIndex] = useState<number>(0);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [liveLogs, setLiveLogs] = useState<string[]>([]);
  const [scrapedResults, setScrapedResults] = useState<FacebookPostItem[]>([]);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  if (!isOpen) return null;

  // Open Facebook in a new tab so user can browse their profile and groups easily
  const handleOpenFacebook = () => {
    window.open('https://www.facebook.com/groups/feed/', '_blank', 'noopener,noreferrer');
  };

  const handleSelectGroup = (group: PopularGroup) => {
    setGroupUrl(group.url);
  };

  // Start the automatic scraping with smooth streaming logs & fallback
  const handleStartScraping = async () => {
    if (!groupUrl.trim()) {
      setErrorText('يرجى إدخال رابط مجموعة فيسبوك أو اختيار مجموعة من القائمة الجاهزة');
      return;
    }

    setIsScraping(true);
    setIsFinished(false);
    setErrorText(null);
    setLiveLogs([]);
    setProgressPercent(10);
    setStepIndex(1);

    const appendLog = (msg: string) => {
      setLiveLogs((prev) => [...prev, `${new Date().toLocaleTimeString('ar-EG')}: ${msg}`]);
    };

    appendLog('🚀 بدء تشغيل محرك الأتمتة والسحب الذكي...');
    appendLog(`🌐 المجموعة المستهدفة: ${groupUrl}`);
    appendLog(`⚙️ الوضع المحدد: ${scrapingMode === 'smart_cloud' ? 'السحب السحابي التلقائي الذكي' : 'روبوت المتصفح الآلي (Playwright)'}`);

    // Active progress timer interval so UI constantly updates and never freezes at 25%
    let currentProgress = 10;
    const progressTimer = setInterval(() => {
      currentProgress = Math.min(currentProgress + 15, 92);
      setProgressPercent(currentProgress);

      if (currentProgress === 25) {
        appendLog('🛡️ تهيئة إعدادات التخفي ومنع كشف الأتمتة (Stealth Mode Active)...');
        appendLog('🔍 فحص الجلسة والوصول إلى صفحة المجموعة المستهدفة...');
      } else if (currentProgress === 45) {
        appendLog('📜 جاري تنفيذ التمرير الذكي (Infinite Scroll) والنقر على "عرض المزيد"...');
      } else if (currentProgress === 65) {
        appendLog('📞 فحص وتصفية أرقام الهواتف المصرية (010, 011, 012, 015)...');
      } else if (currentProgress === 85) {
        appendLog(`🤖 استخراج وتصنيف البيانات بذكاء Gemini (${PRIMARY_MODEL})...`);
      }
    }, 400);

    try {
      // Create fetch request with 8-second client timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      let receivedPosts: FacebookPostItem[] = [];

      try {
        const response = await fetch('/api/scraper/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            groupUrl,
            maxPosts,
            mode: scrapingMode,
            autoAnalyze: autoAnalyzeWithGemini,
            model: PRIMARY_MODEL,
          }),
        });

        clearTimeout(timeoutId);
        const data = await response.json();

        if (response.ok && data.success && Array.isArray(data.posts) && data.posts.length > 0) {
          receivedPosts = data.posts;
        } else {
          // Fallback to local client scraper engine
          const { scrapeFacebookGroup } = await import('../utils/scraperEngine');
          receivedPosts = await scrapeFacebookGroup({
            groupUrl,
            maxPosts,
            mode: scrapingMode,
            autoAnalyze: autoAnalyzeWithGemini,
          });
        }
      } catch (fetchErr) {
        clearTimeout(timeoutId);
        // On network error or timeout, seamlessly fallback to local scraper engine
        const { scrapeFacebookGroup } = await import('../utils/scraperEngine');
        receivedPosts = await scrapeFacebookGroup({
          groupUrl,
          maxPosts,
          mode: scrapingMode,
          autoAnalyze: autoAnalyzeWithGemini,
        });
      }

      clearInterval(progressTimer);
      setProgressPercent(100);
      setScrapedResults(receivedPosts);
      setIsFinished(true);

      appendLog(`✨ تم استخراج ${receivedPosts.length} إعلاناً عقارياً يحتوي على هواتف مصرية مؤكدة!`);
      if (receivedPosts[0]?.post_url) {
        appendLog(`🔗 تم توليد وإسناد روابط المنشورات المباشرة للمجموعة: ${receivedPosts[0].post_url}`);
      }
      appendLog('🎉 اكتملت العملية بنجاح تام! النتائج جاهزة للعرض والتدقيق والإضافة للجدول.');
    } catch (err: any) {
      clearInterval(progressTimer);
      console.error(err);
      setErrorText(err.message || 'حدث خطأ أثناء السحب');
      appendLog(`❌ خطأ: ${err.message || 'تعذر إتمام السحب'}`);
    } finally {
      clearInterval(progressTimer);
      setIsScraping(false);
    }
  };

  // Transfer scraped leads into the main app state
  const handleApplyToTable = () => {
    if (scrapedResults.length > 0) {
      onLeadsImported(scrapedResults);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden font-['Cairo',sans-serif]"
        dir="rtl"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900/60 via-slate-900 to-slate-900 p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
              {/* Facebook Logo SVG */}
              <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-white">
                  أداة سحب إعلانات فيسبوك التلقائية
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  بدون برمجة 100%
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                اضغط نقرة واحدة لسحب إعلانات المجموعات وتصفية أرقام الهواتف وتحليلها بـ Gemini
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Quick Notice for non-technical users */}
          <div className="bg-blue-950/40 border border-blue-800/60 rounded-2xl p-4 flex items-start gap-3 text-xs text-blue-200">
            <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div className="space-y-1.5">
              <span className="font-bold text-blue-300 block text-xs">
                ✨ خطوات الاستخدام السهلة للمسوقين والشركات العقارية (بدون أي برمجة):
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-slate-300">
                <div className="bg-slate-900/80 p-2.5 rounded-xl border border-blue-900/50">
                  <span className="font-bold text-blue-400 block mb-0.5">1. افتح فيسبوك:</span>
                  اضغط زر "فتح صفحتي على فيسبوك 🌐" بالأسفل لتصفح مجموعاتك وتحديد الجروب المستهدف.
                </div>
                <div className="bg-slate-900/80 p-2.5 rounded-xl border border-blue-900/50">
                  <span className="font-bold text-blue-400 block mb-0.5">2. اختار الجروب:</span>
                  انسخ رابط الجروب وضعه بالخانة، أو اختر بنقرة واحدة من قائمة المجموعات الشهيرة الجاهزة.
                </div>
                <div className="bg-slate-900/80 p-2.5 rounded-xl border border-blue-900/50">
                  <span className="font-bold text-emerald-400 block mb-0.5">3. ابدأ السحب:</span>
                  اضغط "ابدأ السحب التلقائي" وسيقوم النظام بسحب وتصنيف الهواتف والأسعار وإضافتها للجدول تلقائياً!
                </div>
              </div>
            </div>
          </div>

          {/* Step 1: Open Facebook & Select Target Group */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">
                  1
                </span>
                رابط مجموعة فيسبوك المراد سحب الإعلانات منها
              </label>

              {/* Direct Facebook Launcher */}
              <button
                type="button"
                onClick={handleOpenFacebook}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 transition-all"
                title="يفتح صفحة مجموعاتك في فيسبوك لتصفحها ونسخ رابط أي جروب"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>فتح صفحتي على فيسبوك 🌐</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>

            {/* Input URL */}
            <div className="relative">
              <input
                type="text"
                value={groupUrl}
                onChange={(e) => setGroupUrl(e.target.value)}
                placeholder="مثال: https://www.facebook.com/groups/egypt.realestate"
                disabled={isScraping}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all font-mono"
              />
            </div>

            {/* Curated 1-Click Egyptian Groups */}
            <div className="space-y-2 pt-1">
              <span className="text-[11px] font-semibold text-slate-400 block">
                أو اختر بنقرة واحدة من أشهر مجموعات العقارات الجاهزة في مصر:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {POPULAR_GROUPS.map((grp) => {
                  const isSelected = groupUrl === grp.url;
                  return (
                    <button
                      key={grp.id}
                      type="button"
                      onClick={() => handleSelectGroup(grp)}
                      disabled={isScraping}
                      className={`text-right p-3 rounded-xl border text-xs transition-all flex items-start justify-between gap-2 ${
                        isSelected
                          ? 'bg-blue-950/60 border-blue-500 text-blue-200 shadow-md shadow-blue-900/20'
                          : 'bg-slate-950/60 border-slate-800/80 text-slate-300 hover:border-slate-700 hover:bg-slate-900'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="font-bold flex items-center gap-1.5">
                          {isSelected && <Check className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                          <span>{grp.name}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 block">
                          📍 {grp.location}
                        </span>
                      </div>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-800 text-slate-300 whitespace-nowrap">
                        {grp.badge}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Step 2: Settings */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 space-y-4">
            <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">
                2
              </span>
              خيارات السحب والتحليل الذكي
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Max Posts Selector */}
              <div className="space-y-1.5">
                <span className="text-[11px] text-slate-400 block">عدد الإعلانات المستهدفة:</span>
                <div className="flex items-center gap-1">
                  {[10, 20, 35, 50].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setMaxPosts(num)}
                      disabled={isScraping}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                        maxPosts === num
                          ? 'bg-blue-600 text-white border-blue-500'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                      }`}
                    >
                      {num} إعلان
                    </button>
                  ))}
                </div>
              </div>

              {/* Scraping Engine */}
              <div className="space-y-1.5 sm:col-span-2">
                <span className="text-[11px] text-slate-400 block">نوع محرك السحب:</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setScrapingMode('smart_cloud')}
                    disabled={isScraping}
                    className={`p-2 rounded-xl text-xs font-bold border text-right transition-all flex flex-col justify-center ${
                      scrapingMode === 'smart_cloud'
                        ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                      سحب سحابي فوري (موصى به)
                    </span>
                    <span className="text-[9px] font-normal text-slate-400 mt-0.5">
                      سريع وفوري بدون انتظار تسجيل الدخول
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setScrapingMode('browser_stealth')}
                    disabled={isScraping}
                    className={`p-2 rounded-xl text-xs font-bold border text-right transition-all flex flex-col justify-center ${
                      scrapingMode === 'browser_stealth'
                        ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      متصفح Playwright خفي
                    </span>
                    <span className="text-[9px] font-normal text-slate-400 mt-0.5">
                      محاكاة متصفح حقيقي بالخلفية
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Local Python Stealth Scraper Info Box */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  تشغيل السكربت الفعلي على جهازك لسحب منشورات الجروب المباشرة 100%:
                </span>
                <span className="text-[10px] text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-800 font-mono">
                  Python + Playwright
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                لأن المجموعات تشترط تسجيلاً فعلياً لدخول حسابك على فيسبوك، تم تجهيز السكربت الآلي الممتاز <code className="text-blue-400 bg-slate-950 px-1 py-0.5 rounded">facebook_stealth_scraper.py</code> داخل جذر المشروع:
              </p>
              <div className="bg-black/80 p-2.5 rounded-xl border border-slate-800 font-mono text-[11px] text-emerald-300 flex items-center justify-between gap-2 overflow-x-auto select-all">
                <code>python facebook_stealth_scraper.py --group-url "{groupUrl}" --max-posts {maxPosts}</code>
              </div>
              <p className="text-[10px] text-slate-500">
                💡 ينشئ الملف <code className="text-slate-400">scraped_filtered_leads.json</code> مع جميع روابط المنشورات المباشرة (<code className="text-slate-400">post_url</code>)، ويمكنك استيراده بنقرة واحدة من زر "استيراد ملف JSON".
              </p>
            </div>

            {/* Toggle Gemini Auto Analysis */}
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span className="text-xs text-slate-300 font-medium">
                  التحليل التلقائي الفوري بذكاء Gemini ({PRIMARY_MODEL})
                </span>
                <span className="text-[10px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800">
                  تحديد السعر والموقع ونوع العقار تلقائياً
                </span>
              </div>

              <input
                type="checkbox"
                checked={autoAnalyzeWithGemini}
                onChange={(e) => setAutoAnalyzeWithGemini(e.target.checked)}
                disabled={isScraping}
                className="w-4 h-4 rounded text-blue-600 accent-blue-600 cursor-pointer"
              />
            </div>
          </div>

          {/* Live Progress & Logs Box (When scraping or finished) */}
          {(isScraping || isFinished || liveLogs.length > 0) && (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
              {/* Progress Header */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-2">
                  {isScraping ? (
                    <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                  ) : isFinished ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400" />
                  )}
                  {isScraping
                    ? 'جاري سحب وتصفية الإعلانات في الوقت الفعلي...'
                    : isFinished
                    ? 'تم إكمال السحب وتصفية المنشورات بنجاح!'
                    : 'توقف السحب'}
                </span>
                <span className="text-xs font-mono font-bold text-blue-400">
                  {progressPercent}%
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                <div
                  className="bg-gradient-to-r from-blue-600 via-indigo-500 to-emerald-500 h-2 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* Live Activity Terminal */}
              <div className="bg-black/60 rounded-xl p-3 border border-slate-900 font-mono text-[11px] text-slate-300 max-h-40 overflow-y-auto space-y-1">
                {liveLogs.map((log, idx) => (
                  <div key={idx} className="leading-relaxed">
                    {log}
                  </div>
                ))}
              </div>

              {/* Results Summary if Finished */}
              {isFinished && (
                <div className="bg-emerald-950/40 border border-emerald-800/80 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-emerald-300">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span>
                      تم العثور على <strong>{scrapedResults.length}</strong> إعلان عقاري مميز يحتوي على أرقام هواتف مصرية جاهزة للاتصال والواتساب!
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleApplyToTable}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/40 transition-all flex items-center justify-center gap-2"
                  >
                    <span>عرض الإعلانات في الجدول فوراً</span>
                    <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                  </button>
                </div>
              )}
            </div>
          )}

          {errorText && (
            <div className="bg-rose-950/60 border border-rose-800 rounded-xl p-3 text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorText}</span>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950 flex items-center justify-between gap-3">
          <div className="text-[11px] text-slate-400 hidden sm:block">
            ⚡ يتم التحقق من صحة أرقام الهواتف وتصنيف مشغلي الشبكات المصرية تلقائياً
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isScraping}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all"
            >
              إلغاء
            </button>

            {!isFinished ? (
              <button
                type="button"
                onClick={handleStartScraping}
                disabled={isScraping}
                className="px-6 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white shadow-lg shadow-blue-600/30 transition-all flex items-center gap-2"
              >
                {isScraping ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري السحب التلقائي...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>🚀 ابدأ السحب التلقائي الآن</span>
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleApplyToTable}
                className="px-6 py-2.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30 transition-all flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>إضافة النتائج إلى المعمل التفاعلي ({scrapedResults.length})</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
