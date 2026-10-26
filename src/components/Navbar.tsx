import React from 'react';
import { Sparkles, Terminal, BookOpen, Layers, Bot, Download } from 'lucide-react';
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
    <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-teal-500/20 text-white font-black text-xl">
              🏢
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-lg text-slate-100 tracking-tight">
                  محلل عقارات فيسبوك الذكي
                </h1>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 font-mono">
                  <Bot className="w-3 h-3" />
                  Gemini 3.1 Flash Lite
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Facebook Groups Scraper • Regex Phone Extractor • AI Lead Enrichment
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('studio')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'studio'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>المعمل التفاعلي</span>
              {postsCount > 0 && (
                <span className="text-xs px-1.5 py-0.2 rounded-full bg-slate-900/80 text-emerald-300 font-mono">
                  {postsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('code')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'code'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Terminal className="w-4 h-4" />
              <span>أكواد بايثون (4 مراحل)</span>
            </button>

            <button
              onClick={() => setActiveTab('guide')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'guide'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>دليل البناء والهندسة</span>
            </button>
          </nav>

          {/* Quick Metrics & Facebook Scraper Launcher */}
          <div className="flex items-center gap-3 text-xs">
            {onOpenFacebookScraper && (
              <button
                onClick={onOpenFacebookScraper}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md shadow-blue-600/30 transition-all border border-blue-400/30 cursor-pointer"
                title="سحب إعلانات فيسبوك بضغطة زر واحدة بدون أي برمجة"
              >
                <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                <span>سحب من فيسبوك</span>
              </button>
            )}

            <div className="hidden md:flex px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/60 items-center gap-2">
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
