import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  MapPin,
  Search,
  Sparkles,
  Phone,
  MessageCircle,
  Download,
  Copy,
  Check,
  Building,
  Star,
  Layers,
  Filter,
  Globe,
  Loader2,
  Navigation,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface BusinessLead {
  id: string;
  name: string;
  category: string;
  address: string;
  phone: string;
  rating: number;
  reviews_count: number;
  lat: number;
  lng: number;
  summary: string;
}

interface MapPreset {
  id: string;
  name: string;
  lat: number;
  lng: number;
  zoom: number;
  badge: string;
}

const MAP_PRESETS: MapPreset[] = [
  {
    id: 'tagamoa',
    name: 'القاهرة الجديدة والتجمع الخامس',
    lat: 30.016,
    lng: 31.433,
    zoom: 13,
    badge: 'الأكثر طلباً 🏙️',
  },
  {
    id: 'zayed',
    name: 'الشيخ زايد و 6 أكتوبر',
    lat: 30.052,
    lng: 30.985,
    zoom: 13,
    badge: 'تطوير عقاري 🏡',
  },
  {
    id: 'new_capital',
    name: 'العاصمة الإدارية الجديدة',
    lat: 30.01,
    lng: 31.7,
    zoom: 13,
    badge: 'استثماري 🏢',
  },
  {
    id: 'maadi',
    name: 'المعادي ودجلة والزهراء',
    lat: 29.96,
    lng: 31.26,
    zoom: 14,
    badge: 'مكاتب وشركات 🌳',
  },
  {
    id: 'nasr_city',
    name: 'مدينة نصر ومصر الجديدة',
    lat: 30.055,
    lng: 31.33,
    zoom: 14,
    badge: 'تجاري وسكني 🏬',
  },
  {
    id: 'alex',
    name: 'الإسكندرية والسموحة',
    lat: 31.200,
    lng: 29.918,
    zoom: 13,
    badge: 'أنشطة ساحلية 🏖️',
  },
];

const CATEGORIES = [
  { id: 'real_estate', label: '🏢 شركات عقارية ومكاتب تسويق' },
  { id: 'commercial', label: '🏬 مراكز تجارية ومحلات' },
  { id: 'cafes_restaurants', label: '☕ مطاعم وكافيهات' },
  { id: 'medical', label: '🏥 عيادات ومراكز طبية' },
  { id: 'admin_offices', label: '🏢 مكاتب إدارية وشركات' },
  { id: 'all_businesses', label: '🛍️ أنشطة تجارية عامة' },
];

export const MapScraper: React.FC = () => {
  const [selectedPreset, setSelectedPreset] = useState<MapPreset>(MAP_PRESETS[0]);
  const [selectedCategory, setSelectedCategory] = useState<string>(CATEGORIES[0].label);
  const [targetLat, setTargetLat] = useState<number>(MAP_PRESETS[0].lat);
  const [targetLng, setTargetLng] = useState<number>(MAP_PRESETS[0].lng);
  const [radiusKm, setRadiusKm] = useState<number>(3);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [extractedLeads, setExtractedLeads] = useState<BusinessLead[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const markersGroupRef = useRef<any>(null);

  // Initialize or re-center Leaflet Map dynamically
  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (!mapContainerRef.current) return;

      try {
        const L = (await import('leaflet')).default;

        if (!leafletMapRef.current) {
          const map = L.map(mapContainerRef.current, {
            center: [targetLat, targetLng],
            zoom: selectedPreset.zoom,
            zoomControl: true,
          });

          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19,
          }).addTo(map);

          markersGroupRef.current = L.layerGroup().addTo(map);

          // Click on map to update target pin lat & lng
          map.on('click', (e: any) => {
            if (!isMounted) return;
            const { lat, lng } = e.latlng;
            setTargetLat(Number(lat.toFixed(6)));
            setTargetLng(Number(lng.toFixed(6)));
          });

          leafletMapRef.current = map;
        } else {
          leafletMapRef.current.setView([targetLat, targetLng], selectedPreset.zoom);
        }
      } catch (err) {
        console.error('Leaflet load error:', err);
      }
    }

    initMap();

    return () => {
      isMounted = false;
    };
  }, [selectedPreset]);

  // Update map markers when leads or target lat/lng changes
  useEffect(() => {
    async function updateMarkers() {
      if (!leafletMapRef.current || !markersGroupRef.current) return;
      const L = (await import('leaflet')).default;

      markersGroupRef.current.clearLayers();

      // Add Target Selected Area Circle Marker
      const targetCircle = L.circle([targetLat, targetLng], {
        color: '#10b981',
        fillColor: '#10b981',
        fillOpacity: 0.15,
        radius: radiusKm * 1000,
      });

      const targetMarker = L.marker([targetLat, targetLng], {
        title: 'المنطقة المحددة',
      }).bindPopup(`
        <div style="font-family: 'Cairo', sans-serif; text-align: right; direction: rtl;" dir="rtl">
          <strong style="color: #059669; display: block; margin-bottom: 4px;">📍 مركز المنطقة المحددة</strong>
          <span style="font-size: 11px; color: #4b5563;">${selectedPreset.name}</span>
        </div>
      `);

      markersGroupRef.current.addLayer(targetCircle);
      markersGroupRef.current.addLayer(targetMarker);

      // Add Extracted Business Markers
      extractedLeads.forEach((biz) => {
        const waLink = `https://wa.me/20${biz.phone.replace(/^0/, '')}?text=${encodeURIComponent(
          `مرحباً، بخصوص خدماتكم في (${biz.name}) في منطقة ${selectedPreset.name}:`
        )}`;

        const popupHtml = `
          <div style="font-family: 'Cairo', sans-serif; text-align: right; direction: rtl; padding: 2px;" dir="rtl">
            <strong style="font-size: 13px; color: #1e293b; display: block; margin-bottom: 2px;">${biz.name}</strong>
            <span style="font-size: 11px; color: #059669; font-weight: bold; display: block; margin-bottom: 4px;">🏢 ${biz.category}</span>
            <span style="font-size: 11px; color: #64748b; display: block; margin-bottom: 6px;">📍 ${biz.address}</span>
            <div style="display: flex; items-center; gap: 6px; margin-top: 6px;">
              <a href="${waLink}" target="_blank" style="background: #10b981; color: white; padding: 4px 8px; border-radius: 6px; text-decoration: none; font-size: 11px; font-weight: bold;">💬 واتساب</a>
              <a href="tel:${biz.phone}" style="background: #0284c7; color: white; padding: 4px 8px; border-radius: 6px; text-decoration: none; font-size: 11px; font-weight: bold;">📞 اتصال (${biz.phone})</a>
            </div>
          </div>
        `;

        const bizMarker = L.circleMarker([biz.lat, biz.lng], {
          radius: 8,
          color: '#0284c7',
          fillColor: '#38bdf8',
          fillOpacity: 0.9,
        }).bindPopup(popupHtml);

        markersGroupRef.current.addLayer(bizMarker);
      });
    }

    updateMarkers();
  }, [extractedLeads, targetLat, targetLng, radiusKm, selectedPreset]);

  // Handle preset selection
  const handleSelectPreset = (preset: MapPreset) => {
    setSelectedPreset(preset);
    setTargetLat(preset.lat);
    setTargetLng(preset.lng);
  };

  // Trigger Gemini Maps/Search Grounding Extraction Endpoint
  const handleExtractLeadsFromMap = async () => {
    setIsLoading(true);
    setStatusMsg({ type: 'info', text: `جاري مسح الخريطة وسحب بيانات (${selectedCategory}) في منطقة (${selectedPreset.name})...` });

    try {
      const response = await fetch('/api/map/extract-businesses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationName: selectedPreset.name,
          category: selectedCategory,
          radiusKm,
          lat: targetLat,
          lng: targetLng,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'فشل في سحب البيانات من الخريطة');
      }

      setExtractedLeads(data.businesses || []);
      setStatusMsg({
        type: 'success',
        text: `تم سحب (${data.businesses?.length || 0}) نشاط تجاري حقيقي بروابط هواتف وواتساب صالحة!`,
      });
    } catch (err: any) {
      console.error(err);
      setStatusMsg({
        type: 'error',
        text: err.message || 'حدث خطأ أثناء سحب الأنشطة التجارية من الخريطة',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Copy single phone
  const handleCopyPhone = (phone: string) => {
    navigator.clipboard.writeText(phone);
    setCopiedPhone(phone);
    setTimeout(() => setCopiedPhone(null), 2000);
  };

  // Copy all phones for WhatsApp campaigns
  const handleCopyAllPhones = () => {
    const phones = Array.from(new Set(extractedLeads.map((b) => b.phone).filter(Boolean)));
    if (phones.length === 0) {
      setStatusMsg({ type: 'error', text: 'لا توجد أرقام هواتف صالحة للنسخ حالياً.' });
      return;
    }
    navigator.clipboard.writeText(phones.join('\n'));
    setStatusMsg({
      type: 'success',
      text: `تم نسخ (${phones.length}) رقم هاتف بنجاح لصقها في أداة الواتساب!`,
    });
  };

  // Export to Excel (.xlsx)
  const handleExportExcel = () => {
    if (extractedLeads.length === 0) return;

    const dataForExcel = extractedLeads.map((b, idx) => ({
      'م': idx + 1,
      'اسم النشاط / الشركة': b.name,
      'نوع النشاط': b.category,
      'العنوان بالتفصيل': b.address,
      'رقم الهاتف': b.phone,
      'التقييم': b.rating,
      'عدد المراجعات': b.reviews_count,
      'رابط واتساب': `https://wa.me/20${b.phone.replace(/^0/, '')}`,
      'الوصف والخدمات': b.summary,
      'خط العرض': b.lat,
      'خط الطول': b.lng,
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataForExcel);
    worksheet['!views'] = [{ rightToLeft: true }];
    worksheet['!cols'] = [
      { wch: 5 },  // م
      { wch: 32 }, // اسم النشاط
      { wch: 22 }, // نوع النشاط
      { wch: 35 }, // العنوان
      { wch: 16 }, // رقم الهاتف
      { wch: 10 }, // التقييم
      { wch: 12 }, // المراجعات
      { wch: 28 }, // الواتساب
      { wch: 40 }, // الوصف
    ];

    const workbook = XLSX.utils.book_new();
    workbook.Workbook = { Views: [{ RTL: true }] };
    XLSX.utils.book_append_sheet(workbook, worksheet, 'أنشطة الخريطة');
    XLSX.writeFile(workbook, `map_businesses_${Date.now()}.xlsx`);
  };

  const filteredLeads = extractedLeads.filter((b) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      b.name.toLowerCase().includes(term) ||
      b.category.toLowerCase().includes(term) ||
      b.address.toLowerCase().includes(term) ||
      b.phone.includes(term)
    );
  });

  return (
    <div className="space-y-6 font-['Cairo',sans-serif]">
      {/* Toast Notification */}
      {statusMsg && (
        <div
          className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all ${
            statusMsg.type === 'success'
              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
              : statusMsg.type === 'error'
              ? 'bg-rose-950/80 text-rose-300 border-rose-800'
              : 'bg-sky-950/80 text-sky-300 border-sky-800'
          }`}
        >
          <span>{statusMsg.text}</span>
          <button onClick={() => setStatusMsg(null)} className="text-slate-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 rounded-3xl border border-slate-800 p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                🗺️
              </div>
              <h2 className="text-lg font-black text-slate-100">
                سحب بيانات الأنشطة والشركات من الخريطة التفاعلية 🎯
              </h2>
            </div>
            <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
              حدد أي منطقة على الخريطة لاستهداف الشركات والعقارات، وسيقوم النظام بسحب أرقام الهواتف والعناوين والتقييمات وتصديرها فوراً إلى Excel.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <button
              onClick={handleExtractLeadsFromMap}
              disabled={isLoading}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-xs font-black bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white shadow-xl shadow-blue-600/30 transition-all border border-blue-400/40 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري مسح الخريطة...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-emerald-300" />
                  <span>🚀 سحب أنشطة المنطقة المحددة الآن</span>
                </>
              )}
            </button>

            {extractedLeads.length > 0 && (
              <>
                <button
                  onClick={handleExportExcel}
                  className="flex items-center gap-1.5 px-4 py-3 rounded-2xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  <span>تصدير إكسيل ({extractedLeads.length})</span>
                </button>

                <button
                  onClick={handleCopyAllPhones}
                  className="flex items-center gap-1.5 px-4 py-3 rounded-2xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 transition-all shadow-sm"
                >
                  <Phone className="w-4 h-4 text-sky-400" />
                  <span>📋 نسخ الهواتف</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Preset Location Buttons */}
        <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-2">
          <span className="text-[11px] font-bold text-slate-400 block">
            اختر منطقة رئيسية بنقرة واحدة لتحديد موقع الخريطة:
          </span>
          <div className="flex flex-wrap gap-2">
            {MAP_PRESETS.map((preset) => {
              const isSelected = selectedPreset.id === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => handleSelectPreset(preset)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-900/40'
                      : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{preset.name}</span>
                  <span className="text-[10px] opacity-80">{preset.badge}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Map & Category Selection View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Category & Radius Controls (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Categories Selector */}
          <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 shadow-lg space-y-3">
            <h3 className="font-bold text-xs sm:text-sm text-slate-100 flex items-center gap-2">
              <Filter className="w-4 h-4 text-emerald-400" />
              فئة الأنشطة والشركات المستهدفة:
            </h3>

            <div className="space-y-1.5">
              {CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat.label;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.label)}
                    className={`w-full text-right p-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-blue-950/80 text-blue-200 border-blue-500 shadow-sm'
                        : 'bg-slate-950/60 text-slate-300 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    <span>{cat.label}</span>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                  </button>
                );
              })}
            </div>

            {/* Radius Selector */}
            <div className="pt-3 border-t border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-300">قطر نطاق البحث:</span>
                <span className="font-mono text-emerald-400 font-bold">{radiusKm} كم</span>
              </div>

              <div className="flex gap-1.5">
                {[1, 3, 5, 10].map((r) => (
                  <button
                    key={r}
                    onClick={() => setRadiusKm(r)}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                      radiusKm === r
                        ? 'bg-emerald-600 text-white border-emerald-500'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    {r} كم
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Summary Card */}
          <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 shadow-lg space-y-2 text-xs">
            <span className="text-slate-400 block font-bold">📍 إحداثيات مركز المنطقة المحددة:</span>
            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 font-mono text-[11px] text-emerald-400 flex justify-between">
              <span>LAT: {targetLat}</span>
              <span>LNG: {targetLng}</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed pt-1">
              💡 يمكنك النقرات المباشرة على الخريطة لتغيير مركز الدائرة الحمراء وتحديد أي شارع أو حي بدقة.
            </p>
          </div>
        </div>

        {/* Right Column: Interactive Leaflet Map (8 cols) */}
        <div className="lg:col-span-8 bg-slate-900/90 rounded-2xl border border-slate-800 p-3 shadow-xl space-y-3">
          <div className="flex items-center justify-between px-2">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Navigation className="w-4 h-4 text-blue-400" />
              الخريطة التفاعلية (انقر على أي نقطة لتغيير الموقع):
            </span>
            <span className="text-[11px] text-emerald-400 font-mono">
              {extractedLeads.length} نشاط مُكتشف
            </span>
          </div>

          {/* Map Canvas */}
          <div
            ref={mapContainerRef}
            className="w-full h-[400px] rounded-xl overflow-hidden border border-slate-800 z-10"
          />
        </div>
      </div>

      {/* Extracted Business Leads Table */}
      {extractedLeads.length > 0 && (
        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 overflow-hidden shadow-xl space-y-3">
          <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Building className="w-5 h-5 text-emerald-400" />
              <h3 className="font-bold text-slate-100 text-sm sm:text-base">
                نتائج سحب الخريطة للأنشطة والشركات
              </h3>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-emerald-400 font-mono font-bold">
                {filteredLeads.length} نتيجة
              </span>
            </div>

            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="بحث باسم الشركة، النشاط، أو الهاتف..."
                className="w-full pr-8 pl-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950/80 text-slate-300 border-b border-slate-800">
                  <th className="py-3 px-3 w-10 text-center font-bold">#</th>
                  <th className="py-3 px-3 font-bold">اسم الشركة / النشاط</th>
                  <th className="py-3 px-3 font-bold">نوع الفئة</th>
                  <th className="py-3 px-3 font-bold">العنوان والموقع</th>
                  <th className="py-3 px-3 font-bold">رقم الهاتف والتواصل</th>
                  <th className="py-3 px-3 font-bold">التقييم</th>
                  <th className="py-3 px-3 font-bold">الخدمات والملخص</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredLeads.map((biz, idx) => {
                  const waLink = `https://wa.me/20${biz.phone.replace(/^0/, '')}?text=${encodeURIComponent(
                    `مرحباً، بخصوص خدماتكم في (${biz.name}) في منطقة ${selectedPreset.name}:`
                  )}`;

                  return (
                    <tr key={biz.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3 text-center text-slate-400 font-mono">
                        {idx + 1}
                      </td>

                      <td className="py-3 px-3 font-bold text-slate-100 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Building className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          <span>{biz.name}</span>
                        </div>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold">
                          {biz.category}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-slate-300 max-w-[200px] truncate">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-rose-400 shrink-0" />
                          <span title={biz.address}>{biz.address}</span>
                        </div>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap font-mono">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-100">{biz.phone}</span>

                          <a
                            href={waLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-all border border-emerald-500/30"
                            title="محادثة واتساب فورية"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </a>

                          <button
                            onClick={() => handleCopyPhone(biz.phone)}
                            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-all"
                            title="نسخ الرقم"
                          >
                            {copiedPhone === biz.phone ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap font-mono">
                        <div className="flex items-center gap-1 text-amber-400">
                          <Star className="w-3.5 h-3.5 fill-current" />
                          <span className="font-bold text-slate-200">{biz.rating}</span>
                          <span className="text-[10px] text-slate-500">({biz.reviews_count})</span>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-slate-300 max-w-[240px] truncate">
                        {biz.summary}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
