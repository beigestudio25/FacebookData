import React from 'react';
import { Sparkles, Terminal, BookOpen, Bot, Download, Table, HelpCircle, Layers } from 'lucide-react';
import { ActiveTab } from '../types';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  postsCount: number;
  qualifiedCount: number;
  onOpenFacebookScraper?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  postsCount,
  qualifiedCount,
  onOpenFacebookScraper,
}) => {
  return (
    <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-blue-600 flex items-center justify-center shadow-lg shadow-teal-500/20 text-white font-black text-xl shrink-0">
              🏢
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-base sm:text-lg text-slate-100 tracking-tight">
                  برنامج سحب وتحليل عقارات فيسبوك
                </h1>
                <span className="hidden sm:flex text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 items-center gap-1 font-bold">
                  <Bot className="w-3.5 h-3.5" />
                  ذكاء اصطناعي 100%
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden md:block">
                سحب تلقائي للإعلانات • استخراج أرقام الهواتف • تصنيف المالك والسمسار بضغطة زر
              </p>
            </div>
          </div>

          {/* Easy Button Navigation Tabs */}
          <nav className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-2xl border border-slate-800">
            <button
              onClick={() => setActiveTab('studio')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'studio'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Sparkles className="w-4 h-4 text-emerald-300" />
              <span>🚀 لوحة السحب والتحليل</span>
              {postsCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-900 text-emerald-300 font-mono">
                  {postsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('guide')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'guide'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <HelpCircle className="w-4 h-4 text-sky-400" />
              <span>❓ طريقة الاستخدام</span>
            </button>

            <button
              onClick={() => setActiveTab('code')}
              className={`hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'code'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Terminal className="w-4 h-4" />
              <span>💻 ملفات الكود (للمحترفين)</span>
            </button>
          </nav>

          {/* One-Click Scraper Button */}
          <div className="flex items-center gap-2">
            {onOpenFacebookScraper && (
              <button
                onClick={onOpenFacebookScraper}
                className="flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-600/30 transition-all border border-blue-400/40 cursor-pointer animate-pulse hover:animate-none shrink-0"
                title="سحب إعلانات فيسبوك بضغطة زر واحدة بدون أي برمجة"
              >
                <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                <span>سحب من فيسبوك ⚡</span>
              </button>
            )}

            <div className="hidden xl:flex px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60 items-center gap-2 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-slate-400">الهواتف المؤهلة:</span>
              <span className="font-bold text-emerald-400 font-mono">{qualifiedCount}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

