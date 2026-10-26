/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { LiveStudio } from './components/LiveStudio';
import { CodeViewer } from './components/CodeViewer';
import { TechnicalGuide } from './components/TechnicalGuide';
import { FacebookScraperModal } from './components/FacebookScraperModal';
import { FacebookPostItem, ActiveTab } from './types';
import { MOCK_FACEBOOK_POSTS } from './data/mockPosts';
import { extractEgyptianPhones } from './utils/regex';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('studio');
  const [isFacebookModalOpen, setIsFacebookModalOpen] = useState<boolean>(false);

  // Initialize with realistic Egyptian Facebook real estate posts
  const [posts, setPosts] = useState<FacebookPostItem[]>(() => {
    return MOCK_FACEBOOK_POSTS.map((t) => {
      const phones = extractEgyptianPhones(t.text);
      return {
        id: t.id,
        rawText: t.text,
        phones,
        hasPhone: phones.length > 0,
        status: 'pending',
      };
    });
  });

  const qualifiedCount = posts.filter((p) => p.hasPhone).length;

  const handleLeadsImported = (newPosts: FacebookPostItem[]) => {
    setPosts((prev) => [...newPosts, ...prev]);
    setActiveTab('studio');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-['Cairo',sans-serif]">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        postsCount={posts.length}
        qualifiedCount={qualifiedCount}
        onOpenFacebookScraper={() => setIsFacebookModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'studio' && (
          <LiveStudio
            posts={posts}
            setPosts={setPosts}
            onOpenFacebookScraper={() => setIsFacebookModalOpen(true)}
          />
        )}

        {activeTab === 'code' && (
          <CodeViewer />
        )}

        {activeTab === 'guide' && (
          <TechnicalGuide />
        )}
      </main>

      {/* One-Click Facebook Scraper Modal (Zero Code) */}
      <FacebookScraperModal
        isOpen={isFacebookModalOpen}
        onClose={() => setIsFacebookModalOpen(false)}
        onLeadsImported={handleLeadsImported}
      />

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span>🏢</span>
            <span className="font-semibold text-slate-400">
              Facebook Real Estate AI Automation Engine
            </span>
            <span>•</span>
            <span>مدعوم بنموذج Google Gemini 3.1 Flash Lite</span>
          </div>

          <div className="flex items-center gap-4 text-slate-400 text-[11px]">
            <span>Playwright Web Scraping</span>
            <span>•</span>
            <span>Egyptian Phone Regex</span>
            <span>•</span>
            <span>Pandas & OpenPyXL Export</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
