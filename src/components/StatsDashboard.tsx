import React from 'react';
import {
  BarChart3,
  Phone,
  Building,
  UserCheck,
  Briefcase,
  MapPin,
  TrendingUp,
  PieChart,
  Layers,
  Sparkles
} from 'lucide-react';
import { FacebookPostItem } from '../types';

interface StatsDashboardProps {
  posts: FacebookPostItem[];
}

export const StatsDashboard: React.FC<StatsDashboardProps> = ({ posts }) => {
  const totalPosts = posts.length;
  const postsWithPhone = posts.filter((p) => p.hasPhone);
  const phoneCount = postsWithPhone.length;
  const phonePercentage = totalPosts > 0 ? Math.round((phoneCount / totalPosts) * 100) : 0;

  // Completed items with AI analysis
  const completedPosts = posts.filter((p) => p.status === 'completed' && p.analysis);

  // Direct owners count
  const ownerCount = completedPosts.filter(
    (p) => p.analysis?.advertiser_type === 'مالك'
  ).length;

  // Brokers count
  const brokerCount = completedPosts.filter(
    (p) => p.analysis?.advertiser_type === 'وسيط/سمسار'
  ).length;

  // Buyers count
  const buyerCount = completedPosts.filter(
    (p) => p.analysis?.advertiser_type === 'مشتري'
  ).length;

  // Extract locations frequency
  const locationMap = new Map<string, number>();
  posts.forEach((p) => {
    let loc = p.analysis?.location;
    if (!loc || loc === 'غير محدد' || loc === 'غير مذكور') {
      // Simple fallback extract from raw text for instant stats
      const match = p.rawText.match(
        /(التجمع الخامس|التجمع|الشيخ زايد|أكتوبر|العاصمة الإدارية|العاصمة|الساحل الشمالي|الساحل|المعادي|الشروق|الرحاب|مدينتي|مدينة نصر|مصر الجديدة)/i
      );
      loc = match ? match[0] : 'مناطق متنوعة';
    }

    // Normalize location labels
    if (loc.includes('التجمع') || loc.includes('بيت الوطن') || loc.includes('النرجس')) {
      loc = 'التجمع الخامس والقاهرة الجديدة';
    } else if (loc.includes('زايد') || loc.includes('أكتوبر')) {
      loc = 'الشيخ زايد و 6 أكتوبر';
    } else if (loc.includes('العاصمة')) {
      loc = 'العاصمة الإدارية الجديدة';
    } else if (loc.includes('الساحل') || loc.includes('سيدي') || loc.includes('السخنة')) {
      loc = 'الساحل الشمالي والسخنة';
    } else if (loc.includes('المعادي')) {
      loc = 'المعادي ودجلة';
    } else if (loc.includes('الرحاب') || loc.includes('مدينتي')) {
      loc = 'الرحاب ومدينتي';
    }

    locationMap.set(loc, (locationMap.get(loc) || 0) + 1);
  });

  // Sort top 5 locations
  const topLocations = Array.from(locationMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const maxLocationCount = topLocations[0]?.[1] || 1;

  // Carriers stats
  const carrierMap: Record<string, number> = {
    فودافون: 0,
    اتصالات: 0,
    أورنج: 0,
    'شركة وي (WE)': 0,
  };

  posts.forEach((p) => {
    p.phones.forEach((ph) => {
      if (ph.carrier.includes('فودافون') || ph.carrier.includes('Vodafone')) {
        carrierMap['فودافون'] += 1;
      } else if (ph.carrier.includes('اتصالات') || ph.carrier.includes('Etisalat')) {
        carrierMap['اتصالات'] += 1;
      } else if (ph.carrier.includes('أورنج') || ph.carrier.includes('Orange')) {
        carrierMap['أورنج'] += 1;
      } else if (ph.carrier.includes('وي') || ph.carrier.includes('WE')) {
        carrierMap['شركة وي (WE)'] += 1;
      }
    });
  });

  const totalCarriers = Object.values(carrierMap).reduce((a, b) => a + b, 0) || 1;

  return (
    <div className="space-y-4 font-['Cairo',sans-serif]">
      {/* Top Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-bold">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-100 flex items-center gap-2">
              <span>لوحة الإحصائيات المباشرة والرسوم البيانية</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                تحديث أوتوماتيكي ⚡
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              تحليل فوري للمناطق الأكثر طلبًا وأعداد أرقام الهواتف ونوع المعلنين
            </p>
          </div>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Scraped Posts */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-md hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>إجمالي المنشورات</span>
            <Building className="w-4 h-4 text-blue-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-100 font-mono">
              {totalPosts}
            </span>
            <span className="text-[11px] text-slate-400">إعلان عقاري</span>
          </div>
        </div>

        {/* Posts with Phones */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-md hover:border-emerald-500/50 transition-all">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>توجد بها هواتف صالحة</span>
            <Phone className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-emerald-400 font-mono">
              {phoneCount}
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
              {phonePercentage}% من الإعلانات
            </span>
          </div>
        </div>

        {/* Direct Owner Opportunities */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-md hover:border-emerald-500/50 transition-all">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>فرص المالك المباشر 🔑</span>
            <UserCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-emerald-300 font-mono">
              {ownerCount}
            </span>
            <span className="text-[10px] text-slate-400">بدون أي وسيط</span>
          </div>
        </div>

        {/* Broker Ads */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-md hover:border-sky-500/50 transition-all">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>إعلانات الوسطاء والشركات</span>
            <Briefcase className="w-4 h-4 text-sky-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-sky-300 font-mono">
              {brokerCount}
            </span>
            <span className="text-[10px] text-slate-400">مسوق عقاري</span>
          </div>
        </div>
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Chart 1: Top Locations Chart (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900/90 rounded-2xl border border-slate-800 p-4 sm:p-5 shadow-lg space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-rose-400" />
              <h4 className="font-bold text-xs sm:text-sm text-slate-100">
                أكثر المناطق عقارات وتكراراً في الجروبات
              </h4>
            </div>
            <span className="text-[10px] text-slate-400">رسم بياني شريطي</span>
          </div>

          <div className="space-y-3 pt-1">
            {topLocations.map(([locationName, count], idx) => {
              const percentage = Math.round((count / maxLocationCount) * 100);
              const barColors = [
                'from-blue-600 to-indigo-500',
                'from-emerald-600 to-teal-500',
                'from-purple-600 to-indigo-500',
                'from-amber-600 to-orange-500',
                'from-rose-600 to-pink-500',
              ];

              return (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-200 flex items-center gap-1.5 truncate max-w-[240px]">
                      <span className="w-4 h-4 rounded-full bg-slate-800 text-slate-400 text-[10px] flex items-center justify-center font-mono">
                        {idx + 1}
                      </span>
                      {locationName}
                    </span>
                    <span className="font-mono text-emerald-400 font-bold text-xs">
                      {count} إعلان
                    </span>
                  </div>

                  {/* Animated Bar */}
                  <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800/80">
                    <div
                      className={`h-full bg-gradient-to-r ${barColors[idx % barColors.length]} transition-all duration-500 rounded-full`}
                      style={{ width: `${Math.max(percentage, 12)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chart 2: Carriers & Advertiser Breakdown (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900/90 rounded-2xl border border-slate-800 p-4 sm:p-5 shadow-lg space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <PieChart className="w-4 h-4 text-emerald-400" />
              <h4 className="font-bold text-xs sm:text-sm text-slate-100">
                توزيع شبكات المحمول المصرية
              </h4>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">010 / 011 / 012 / 015</span>
          </div>

          {/* Carrier Distribution */}
          <div className="space-y-2.5 pt-1">
            {Object.entries(carrierMap).map(([carrierName, count], idx) => {
              const carrierPct = Math.round((count / totalCarriers) * 100);
              const badgeBg =
                carrierName === 'فودافون'
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                  : carrierName === 'اتصالات'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  : carrierName === 'أورنج'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30';

              return (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs"
                >
                  <span className={`px-2 py-0.5 rounded-lg font-bold border ${badgeBg}`}>
                    {carrierName}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-slate-200">
                      {count} رقم
                    </span>
                    <span className="font-mono text-[10px] text-slate-400">
                      ({carrierPct}%)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
