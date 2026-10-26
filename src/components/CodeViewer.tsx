import React, { useState } from 'react';
import {
  FileCode,
  Copy,
  Check,
  Download,
  Terminal,
  Layers,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  FileCheck
} from 'lucide-react';
import { PYTHON_SNIPPETS, PythonSnippet } from '../data/pythonCodeSnippets';

export const CodeViewer: React.FC = () => {
  const [activeSnippetId, setActiveSnippetId] = useState<string>('stage3');
  const [copied, setCopied] = useState(false);

  const activeSnippet =
    PYTHON_SNIPPETS.find((s) => s.id === activeSnippetId) || PYTHON_SNIPPETS[0];

  const handleCopy = () => {
    navigator.clipboard.writeText(activeSnippet.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadSingle = (snippet: PythonSnippet) => {
    const blob = new Blob([snippet.code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = snippet.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadAll = () => {
    PYTHON_SNIPPETS.forEach((s, idx) => {
      setTimeout(() => {
        handleDownloadSingle(s);
      }, idx * 250);
    });
  };

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 p-6 rounded-2xl border border-slate-800 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-mono font-bold text-sm">
                🐍
              </span>
              <h2 className="text-lg font-bold text-slate-100">
                مستودع كود بايثون البرمجي (Python Modular Scripts)
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              كود برمجي نظيف، موثق باللغة العربية، ومعتمد على أحدث معايير هندسة البرمجيات (PEP 8) وحزمة <code className="text-emerald-400 font-mono">google-genai</code> الرسمية و Playwright و Pandas.
            </p>
          </div>

          <button
            onClick={handleDownloadAll}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950/40 transition-all self-start md:self-auto"
          >
            <Download className="w-4 h-4" />
            تحميل حزمة الملفات بالكامل (.py)
          </button>
        </div>

        {/* Quick Instructions */}
        <div className="mt-4 p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 flex flex-wrap items-center gap-4 text-xs text-slate-300">
          <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
            <Terminal className="w-3.5 h-3.5" />
            طريقة التشغيل السريعة:
          </span>
          <code className="bg-slate-900 px-2 py-0.5 rounded text-slate-300 font-mono text-[11px]" dir="ltr">
            pip install -r requirements.txt
          </code>
          <code className="bg-slate-900 px-2 py-0.5 rounded text-slate-300 font-mono text-[11px]" dir="ltr">
            playwright install chromium
          </code>
          <code className="bg-slate-900 px-2 py-0.5 rounded text-emerald-400 font-mono text-[11px]" dir="ltr">
            python main_pipeline.py --max-posts 25
          </code>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-2">
        {PYTHON_SNIPPETS.map((snippet) => {
          const isActive = snippet.id === activeSnippetId;
          return (
            <button
              key={snippet.id}
              onClick={() => setActiveSnippetId(snippet.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                isActive
                  ? 'bg-slate-800 text-emerald-400 border-emerald-500/60 shadow-sm'
                  : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>{snippet.filename}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-950 text-slate-400 font-normal">
                {snippet.stageName}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active Code Display */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
        {/* File Header Bar */}
        <div className="p-4 bg-slate-950/70 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-sm text-slate-100">
                {activeSnippet.filename}
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                {activeSnippet.stageName}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {activeSnippet.description}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">تم النسخ!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>نسخ الكود</span>
                </>
              )}
            </button>

            <button
              onClick={() => handleDownloadSingle(activeSnippet)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600/90 hover:bg-emerald-500 text-white transition-all shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تنزيل الملف</span>
            </button>
          </div>
        </div>

        {/* Code Content */}
        <div className="relative">
          <pre
            className="p-5 text-xs text-slate-200 font-mono leading-relaxed overflow-x-auto bg-slate-950/90 max-h-[600px] text-left selection:bg-emerald-900 selection:text-white"
            dir="ltr"
          >
            <code>{activeSnippet.code}</code>
          </pre>
        </div>
      </div>
    </div>
  );
};
