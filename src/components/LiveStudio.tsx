import React, { useState, useRef } from 'react';
import {
  Sparkles,
  Phone,
  Bot,
  Filter,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Upload,
  Plus,
  Trash2,
  FileText,
  Building2,
  Check,
  ChevronDown,
  Code,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { FacebookPostItem, ExtractedPhone } from '../types';
import { extractEgyptianPhones } from '../utils/regex';
import { MOCK_FACEBOOK_POSTS } from '../data/mockPosts';
import { DataGrid } from './DataGrid';
import { StatsDashboard } from './StatsDashboard';
import { PRIMARY_MODEL } from '../constants/models';

interface LiveStudioProps {
  posts: FacebookPostItem[];
  setPosts: React.Dispatch<React.SetStateAction<FacebookPostItem[]>>;
  onOpenFacebookScraper?: () => void;
}

export const LiveStudio: React.FC<LiveStudioProps> = ({
  posts,
  setPosts,
  onOpenFacebookScraper,
}) => {
  const [selectedPostId, setSelectedPostId] = useState<string>(posts[0]?.id || 'post_01');
  const [customText, setCustomText] = useState('');
  const [filterNoPhones, setFilterNoPhones] = useState(true);
  const [isAnalyzingSingle, setIsAnalyzingSingle] = useState(false);
  const [isAnalyzingBatch, setIsAnalyzingBatch] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [showJsonRaw, setShowJsonRaw] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedPost = posts.find((p) => p.id === selectedPostId) || posts[0];
  const failedPosts = posts.filter((p) => p.status === 'error');

  // Helper to trigger message notification
  const showToast = (type: 'success' | 'error' | 'info', text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 5000);
  };

  // Analyze single post with server-side Gemini
  const handleAnalyzeSingle = async (postItem: FacebookPostItem) => {
    if (!postItem) return;

    if (filterNoPhones && !postItem.hasPhone) {
      showToast('error', 'تم تخطي المنشور لعدم احتوائه على رقم هاتف (مفعل في إعدادات التصفية).');
      return;
    }

    setIsAnalyzingSingle(true);
    setStatusMessage({ type: 'info', text: `جاري استدعاء نموذج Gemini (${PRIMARY_MODEL}) للتحليل الدلالي...` });

    try {
      const response = await fetch('/api/analyze-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postText: postItem.rawText,
          model: PRIMARY_MODEL,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'فشل في استرجاع التحليل من الخادم');
      }

      setPosts((prev) =>
        prev.map((item) =>
          item.id === postItem.id
            ? {
                ...item,
                analysis: data.analysis,
                status: 'completed',
                error: undefined,
              }
            : item
        )
      );

      showToast('success', `تم اكتمال تحليل المنشور بنجاح عبر Gemini (${PRIMARY_MODEL})!`);
    } catch (err: any) {
      console.error(err);
      showToast('error', `خطأ في التحليل: ${err.message || 'حدث خطأ غير متوقع'}`);
      setPosts((prev) =>
        prev.map((item) =>
          item.id === postItem.id
            ? { ...item, status: 'error', error: err.message }
            : item
        )
      );
    } finally {
      setIsAnalyzingSingle(false);
    }
  };

  // Analyze batch of posts (with support for retrying failed items only)
  const handleAnalyzeBatch = async (onlyErrors = false) => {
    const targetPosts = posts.filter((p) => {
      if (onlyErrors) return p.status === 'error';
      if (filterNoPhones && !p.hasPhone) return false;
      return p.status !== 'completed';
    });

    if (targetPosts.length === 0) {
      showToast('info', onlyErrors ? 'لا توجد منشورات متعثرة لإعادة محاولتها.' : 'جميع المنشورات المؤهلة محللة بالفعل أو لا تحتوي على هواتف.');
      return;
    }

    setIsAnalyzingBatch(true);
    setBatchProgress({ current: 0, total: targetPosts.length });

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < targetPosts.length; i++) {
      const p = targetPosts[i];
      setBatchProgress({ current: i + 1, total: targetPosts.length });

      try {
        const response = await fetch('/api/analyze-post', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            postText: p.rawText,
            model: PRIMARY_MODEL,
          }),
        });

        const data = await response.json();
        if (response.ok && data.success && data.analysis) {
          successCount++;
          setPosts((prev) =>
            prev.map((item) =>
              item.id === p.id
                ? {
                    ...item,
                    analysis: data.analysis,
                    status: 'completed',
                    error: undefined,
                  }
                : item
            )
          );
        } else {
          failCount++;
          setPosts((prev) =>
            prev.map((item) =>
              item.id === p.id
                ? {
                    ...item,
                    status: 'error',
                    error: data.error || 'فشل في استخراج التحليل من النموذج',
                  }
                : item
            )
          );
        }
      } catch (err: any) {
        failCount++;
        setPosts((prev) =>
          prev.map((item) =>
            item.id === p.id
              ? {
                  ...item,
                  status: 'error',
                  error: err.message || 'خطأ في الاتصال بالخادم',
                }
              : item
          )
        );
      }
    }

    setIsAnalyzingBatch(false);
    setBatchProgress(null);

    if (failCount === 0) {
      showToast('success', `اكتمل تحليل حزمة المنشورات بنجاح (${successCount} منشور)!`);
    } else {
      showToast(
        'error',
        `اكتملت المعالجة: تم تحليل ${successCount} بنجاح، بينما تعثر ${failCount} منشور. يمكنك الضغط على "إعادة محاولة الفاشلة".`
      );
    }
  };

  // Import JSON file directly from scraper output
  const handleImportJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        if (!Array.isArray(parsed)) {
          throw new Error('يجب أن يحتوي ملف JSON على مصفوفة من المنشورات.');
        }

        const importedPosts: FacebookPostItem[] = parsed.map((item: any, idx: number) => {
          const rawText = item.raw_text || item.rawText || item.text || '';
          const author = item.author_name || item.author || 'معلن فيسبوك';
          const post_url = item.post_url || item.url || '';
          const phones = extractEgyptianPhones(rawText);
          const hasPhone = phones.length > 0;

          return {
            id: item.id || `lead_import_${Date.now()}_${idx + 1}`,
            rawText,
            author,
            post_url,
            phones,
            hasPhone,
            analysis: item.ai_analysis || item.analysis || undefined,
            status: item.ai_analysis ? 'completed' : item.analysis_error ? 'error' : hasPhone ? 'pending' : 'skipped_no_phone',
            error: item.analysis_error || undefined,
          };
        });

        if (importedPosts.length === 0) {
          showToast('error', 'الملف المستورد فارغ ولا يحتوي على سجلات.');
          return;
        }

        setPosts(importedPosts);
        setSelectedPostId(importedPosts[0].id);
        showToast('success', `تم استيراد ${importedPosts.length} منشور بنجاح من ملف JSON!`);
      } catch (err: any) {
        console.error(err);
        showToast('error', `فشل استيراد الملف: ${err.message || 'تنسيق JSON غير صالح'}`);
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file, 'utf-8');
  };

  const [customUrl, setCustomUrl] = useState('');
  const [customAuthor, setCustomAuthor] = useState('');

  // Add custom post with explicit Facebook post link (post_url) and author name
  const handleAddCustomPost = () => {
    if (!customText.trim()) return;

    const phones = extractEgyptianPhones(customText);
    const newId = `lead_direct_${Date.now()}`;
    const newPost: FacebookPostItem = {
      id: newId,
      rawText: customText.trim(),
      author: customAuthor.trim() || 'معلن فيسبوك',
      post_url: customUrl.trim() || undefined,
      phones,
      hasPhone: phones.length > 0,
      status: 'pending',
    };

    setPosts((prev) => [newPost, ...prev]);
    setSelectedPostId(newId);
    setCustomText('');
    setCustomUrl('');
    setCustomAuthor('');
    showToast('success', 'تم إضافة الإعلان برابطه المباشر وفحص الهواتف بنجاح!');
  };

  // Load a preset template
  const handleLoadPreset = (presetId: string) => {
    const template = MOCK_FACEBOOK_POSTS.find((t) => t.id === presetId);
    if (!template) return;

    const phones = extractEgyptianPhones(template.text);
    const existing = posts.find((p) => p.id === template.id);

    if (!existing) {
      const newPost: FacebookPostItem = {
        id: template.id,
        rawText: template.text,
        phones,
        hasPhone: phones.length > 0,
        status: 'pending',
      };
      setPosts((prev) => [newPost, ...prev]);
    }
    setSelectedPostId(template.id);
  };

  // Reset to initial mock dataset
  const handleResetDefaults = () => {
    const initialPosts: FacebookPostItem[] = MOCK_FACEBOOK_POSTS.map((t) => {
      const phones = extractEgyptianPhones(t.text);
      return {
        id: t.id,
        rawText: t.text,
        phones,
        hasPhone: phones.length > 0,
        status: 'pending',
      };
    });
    setPosts(initialPosts);
    setSelectedPostId(initialPosts[0].id);
    showToast('info', 'تمت استعادة المنشورات التجريبية الافتراضية.');
  };

  return (
    <div className="space-y-6">
      {/* Hidden File Input for JSON Import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleImportJsonFile}
      />

      {/* Toast Notification */}
      {statusMessage && (
        <div
          className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all ${
            statusMessage.type === 'success'
              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
              : statusMessage.type === 'error'
              ? 'bg-rose-950/80 text-rose-300 border-rose-800'
              : 'bg-sky-950/80 text-sky-300 border-sky-800'
          }`}
        >
          <span>{statusMessage.text}</span>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* Real-time Stats & Charts Dashboard */}
      <StatsDashboard posts={posts} />

      {/* Top Banner: One-Click Control Panel */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 rounded-3xl border border-slate-800 p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse"></span>
              <h2 className="text-lg font-black text-slate-100">
                لوحة التحكم الذكية والعمليات بنقرة زر 🎯
              </h2>
            </div>
            <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
              اختر أي زر من الأزرار الملونة بالأسفل لسحب الإعلانات، استخراج أرقام الموبايل، أو تصنيف المالك والسمسار بالذكاء الاصطناعي وتصديرها فوراً إلى Excel.
            </p>
          </div>

          {/* Primary Big Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            {/* Direct Facebook Scraper Launcher (Zero Code) */}
            {onOpenFacebookScraper && (
              <button
                onClick={onOpenFacebookScraper}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-xs font-black bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white shadow-xl shadow-blue-600/30 transition-all border border-blue-400/40 cursor-pointer"
                title="سحب إعلانات فيسبوك بضغطة زر واحدة بدون أي برمجة"
              >
                <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                <span>🚀 ابدأ سحب إعلانات من فيسبوك</span>
              </button>
            )}

            {/* Batch Analyze */}
            <button
              onClick={() => handleAnalyzeBatch(false)}
              disabled={isAnalyzingBatch || isAnalyzingSingle}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white shadow-lg shadow-emerald-950/40 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-emerald-300" />
              {isAnalyzingBatch
                ? `جاري التحليل (${batchProgress?.current}/${batchProgress?.total})...`
                : `🤖 تحليل الكل بالذكاء الاصطناعي`}
            </button>

            {/* Copy All Phones for WhatsApp */}
            <button
              onClick={() => {
                const allPhones = posts
                  .flatMap((p) => p.phones.map((ph) => ph.normalized))
                  .filter(Boolean);
                const unique = Array.from(new Set(allPhones));
                if (unique.length === 0) {
                  showToast('error', 'لا توجد أرقام هواتف صالحة للنسخ حالياً.');
                  return;
                }
                navigator.clipboard.writeText(unique.join('\n'));
                showToast('success', `تم نسخ (${unique.length}) رقم هاتف بنجاح لصقها في أداة الواتساب!`);
              }}
              className="flex items-center gap-1.5 px-3.5 py-3 rounded-2xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 transition-all shadow-sm"
              title="نسخ جميع أرقام هواتف المعالين لاستخدامها في الحملات والإرسال"
            >
              <Phone className="w-3.5 h-3.5 text-sky-400" />
              <span>📋 نسخ الهواتف</span>
            </button>

            {/* Import JSON File */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3.5 py-3 rounded-2xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all shadow-sm"
              title="استيراد ملف JSON جاهز للإعلانات"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>استيراد ملف</span>
            </button>

            <button
              onClick={handleResetDefaults}
              className="p-3 rounded-2xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-all"
              title="استعادة البيانات الافتراضية للتجربة"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 3 Simple Visual Steps */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5 pt-4 border-t border-slate-800/80">
          <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 font-black text-sm flex items-center justify-center shrink-0">
              1
            </div>
            <div>
              <span className="text-xs font-bold text-slate-200 block">سحب وتصفية الإعلانات</span>
              <span className="text-[11px] text-slate-400 block">تجميع منشورات الجروب واستخراج الموبايل</span>
            </div>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 font-black text-sm flex items-center justify-center shrink-0">
              2
            </div>
            <div>
              <span className="text-xs font-bold text-slate-200 block">تصنيف Gemini الذكي</span>
              <span className="text-[11px] text-slate-400 block">تحديد المالك والسمسار والسعر والموقع</span>
            </div>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 font-black text-sm flex items-center justify-center shrink-0">
              3
            </div>
            <div>
              <span className="text-xs font-bold text-slate-200 block">التصدير والواتساب</span>
              <span className="text-[11px] text-slate-400 block">تحميل ملف Excel أو المراسلة بضغطة زر</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Split View: Input & Controls (Left) | Analysis & Regex Results (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Post Selection & Input (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm text-slate-200 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-emerald-400" />
                نماذج منشورات جاهزة للتجربة
              </h3>
              <span className="text-xs text-slate-400 font-mono">
                {posts.length} منشور محمل
              </span>
            </div>

            {/* Presets Pills */}
            <div className="flex flex-wrap gap-1.5 mb-4">
              {MOCK_FACEBOOK_POSTS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleLoadPreset(t.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                    selectedPostId === t.id
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                      : 'bg-slate-950/80 text-slate-300 border-slate-800 hover:border-slate-700 hover:bg-slate-800'
                  }`}
                >
                  {t.title.split(' ')[0]} {t.title.split(' ')[1]}
                  <span className="opacity-75 text-[10px] mr-1">
                    ({t.category === 'owner' ? 'مالك' : t.category === 'broker' ? 'سمسار' : t.category === 'buyer' ? 'مشتري' : t.category === 'spam' ? 'سبام' : 'عقار'})
                  </span>
                </button>
              ))}
            </div>

            {/* Custom Direct Post Input */}
            <div className="border-t border-slate-800/80 pt-3 space-y-2">
              <label className="block text-xs font-bold text-slate-200">
                أو إدخال منشور حقيقي من فيسبوك مباشرة برابطه الأصلي:
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder="رابط المنشور المباشر (https://www.facebook.com/groups/.../posts/...)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                />
                <input
                  type="text"
                  value={customAuthor}
                  onChange={(e) => setCustomAuthor(e.target.value)}
                  placeholder="اسم المعلن / المالك (مثال: د. مصطفى الشاذلي)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <textarea
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="للبيع شقة بالتجمع الخامس من المالك مباشرة بدون وسيط... تواصل فون أو واتساب على 01012345678"
                rows={3}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 leading-relaxed font-sans"
              />

              <div className="flex justify-between items-center pt-1">
                <button
                  onClick={handleAddCustomPost}
                  disabled={!customText.trim()}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white shadow-sm transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  إضافة المنشور ورابطه للقائمة
                </button>

                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filterNoPhones}
                      onChange={(e) => setFilterNoPhones(e.target.checked)}
                      className="rounded accent-emerald-500"
                    />
                    <span>تصفية المنشورات بدون هاتف</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* List of currently loaded posts */}
          <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 max-h-[380px] overflow-y-auto space-y-2">
            <h4 className="text-xs font-bold text-slate-400 mb-2">
              قائمة المنشورات في خط الإنتاج:
            </h4>
            {posts.map((p, idx) => {
              const isSelected = p.id === selectedPostId;
              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedPostId(p.id)}
                  className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-slate-800/90 border-emerald-500/80 shadow-sm'
                      : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-850 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono font-bold text-slate-300">
                      #{idx + 1} - {p.id}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {p.hasPhone ? (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 text-[10px] font-mono">
                          {p.phones.length} هاتف
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-400 text-[10px]">
                          بدون هاتف
                        </span>
                      )}

                      {p.status === 'completed' && (
                        <span className="w-2 h-2 rounded-full bg-emerald-400" title="مكتمل التحليل"></span>
                      )}
                      {p.status === 'error' && (
                        <span className="w-2 h-2 rounded-full bg-rose-400" title="تعثر التحليل"></span>
                      )}
                    </div>
                  </div>
                  <p className="text-slate-400 line-clamp-2 text-[11px] leading-relaxed">
                    {p.rawText}
                  </p>
                  {p.error && (
                    <span className="text-[10px] text-rose-400 mt-1 block truncate">
                      خطأ: {p.error}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Active Post Inspector & Gemini Analysis (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {selectedPost ? (
            <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-lg space-y-4">
              {/* Header with status */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                      {selectedPost.id}
                    </span>
                    <h3 className="font-bold text-sm text-slate-100">
                      فحص المنشور المحدد ومعالجته
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleAnalyzeSingle(selectedPost)}
                    disabled={isAnalyzingSingle}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white shadow-sm transition-all"
                  >
                    <Bot className="w-4 h-4" />
                    {isAnalyzingSingle ? 'جاري التحليل...' : `تحليل بـ Gemini (${PRIMARY_MODEL})`}
                  </button>
                </div>
              </div>

              {/* Raw Post Text Box */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-400">
                    نص المنشور الأصلي (Raw Facebook Post):
                  </span>
                  {selectedPost.post_url && (
                    <a
                      href={selectedPost.post_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-sky-400 hover:underline"
                    >
                      فتح رابط الإعلان على فيسبوك 🔗
                    </a>
                  )}
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 text-xs text-slate-200 leading-relaxed font-sans max-h-40 overflow-y-auto whitespace-pre-wrap">
                  {selectedPost.rawText}
                </div>
              </div>

              {/* Stage 2 Live Regex Results */}
              <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    المرحلة 2: نتائج فحص الهواتف المصرية (Regex Output)
                  </span>
                  <span className="text-[11px] font-mono text-emerald-400">
                    {selectedPost.phones.length > 0
                      ? `تم العثور على (${selectedPost.phones.length}) رقم هاتف`
                      : 'لا توجد أرقام هواتف صالحة'}
                  </span>
                </div>

                {selectedPost.phones.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedPost.phones.map((phone, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700/80 text-xs"
                      >
                        <span className="font-mono font-bold text-emerald-400">
                          {phone.normalized}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                          {phone.carrier}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          ({phone.international})
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-amber-400/90 flex items-center gap-1.5 py-1">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>
                      لم يتعرف الـ Regex على أرقام هواتف مصرية صالحة (010, 011, 012, 015 أو +20).
                    </span>
                  </div>
                )}
              </div>

              {/* Stage 3 Live Gemini AI Results */}
              <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Bot className="w-4 h-4 text-sky-400" />
                    المرحلة 3: التحليل الدلالي المهيكل (Gemini Structured JSON)
                  </span>

                  {selectedPost.analysis && (
                    <button
                      onClick={() => setShowJsonRaw(!showJsonRaw)}
                      className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200"
                    >
                      <Code className="w-3.5 h-3.5" />
                      {showJsonRaw ? 'إخفاء الـ JSON الخام' : 'عرض الـ JSON الخام'}
                    </button>
                  )}
                </div>

                {selectedPost.status === 'completed' && selectedPost.analysis ? (
                  <div className="space-y-3">
                    {/* Visual Result Cards Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {/* Is Real Estate */}
                      <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">هل عقار حقيقي؟</span>
                        <span
                          className={`text-xs font-bold ${
                            selectedPost.analysis.is_real_estate
                              ? 'text-emerald-400'
                              : 'text-rose-400'
                          }`}
                        >
                          {selectedPost.analysis.is_real_estate
                            ? '✅ نعم (عقار مؤكد)'
                            : '❌ لا (إعلان خارج المجال)'}
                        </span>
                      </div>

                      {/* Advertiser Type */}
                      <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">صفة المعلن</span>
                        <span className="text-xs font-bold text-slate-100">
                          {selectedPost.analysis.advertiser_type}
                        </span>
                      </div>

                      {/* Deal Type */}
                      <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">نوع الصفقة</span>
                        <span className="text-xs font-bold text-slate-100">
                          {selectedPost.analysis.deal_type}
                        </span>
                      </div>

                      {/* Property Type */}
                      <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">نوع العقار</span>
                        <span className="text-xs font-bold text-slate-100">
                          {selectedPost.analysis.property_type || 'غير محدد'}
                        </span>
                      </div>

                      {/* Price */}
                      <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">السعر ونظام الدفع</span>
                        <span className="text-xs font-bold text-emerald-400">
                          {selectedPost.analysis.price || 'غير مذكور'}
                        </span>
                      </div>

                      {/* Location */}
                      <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">المنطقة والموقع</span>
                        <span className="text-xs font-bold text-slate-100">
                          {selectedPost.analysis.location || 'غير مذكور'}
                        </span>
                      </div>
                    </div>

                    {/* Summary */}
                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block mb-1">
                        الملخص التسويقي الذكي (AI Summary):
                      </span>
                      <p className="text-xs text-slate-200 leading-relaxed font-medium">
                        {selectedPost.analysis.summary}
                      </p>
                    </div>

                    {/* Raw JSON View (Collapsible) */}
                    {showJsonRaw && (
                      <pre className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-[11px] text-emerald-400 font-mono overflow-x-auto text-left" dir="ltr">
                        {JSON.stringify(selectedPost.analysis, null, 2)}
                      </pre>
                    )}
                  </div>
                ) : selectedPost.status === 'error' ? (
                  <div className="py-6 px-4 text-center rounded-xl bg-rose-950/40 border border-rose-900/60 space-y-2">
                    <AlertCircle className="w-7 h-7 text-rose-400 mx-auto" />
                    <p className="text-xs font-bold text-rose-300">تعثر تحليل المنشور بواسطة النموذج</p>
                    <p className="text-[11px] text-rose-400/90 font-mono max-w-md mx-auto">
                      {selectedPost.error || 'خطأ غير محدد أثناء استدعاء API'}
                    </p>
                    <button
                      onClick={() => handleAnalyzeSingle(selectedPost)}
                      className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-900/80 hover:bg-rose-800 text-rose-100 transition-all"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      إعادة المحاولة الآن
                    </button>
                  </div>
                ) : selectedPost.status === 'analyzing' || isAnalyzingSingle ? (
                  <div className="py-8 text-center text-slate-400 space-y-2">
                    <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="text-xs">جاري إرسال النص إلى Gemini ({PRIMARY_MODEL}) واستخراج الحقول المنظمة...</p>
                  </div>
                ) : (
                  <div className="py-6 text-center text-slate-500">
                    <Bot className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-xs">
                      اضغط على زر "تحليل بـ Gemini" بالأعلى لتشغيل النموذج واستخراج البيانات بصيغة JSON.
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-500">
              يرجى اختيار منشور من القائمة
            </div>
          )}
        </div>
      </div>

      {/* Stage 4: Live Data Grid with Excel / CSV Export */}
      <DataGrid posts={posts} />
    </div>
  );
};
