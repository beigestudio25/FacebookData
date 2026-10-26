import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import {
  FileSpreadsheet,
  Download,
  Search,
  MessageCircle,
  Copy,
  Check,
  Building,
  UserCheck,
  Briefcase,
  ShoppingBag,
  ExternalLink,
  MapPin,
  Tag,
  DollarSign,
  User
} from 'lucide-react';
import { FacebookPostItem, ExtractedPhone } from '../types';
import { getWhatsAppLink } from '../utils/regex';

interface DataGridProps {
  posts: FacebookPostItem[];
}

export const DataGrid: React.FC<DataGridProps> = ({ posts }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [advertiserFilter, setAdvertiserFilter] = useState<string>('all');
  const [dealTypeFilter, setDealTypeFilter] = useState<string>('all');
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);

  // Filter completed items
  const completedPosts = posts.filter((p) => p.status === 'completed' && p.analysis);

  const filteredPosts = completedPosts.filter((post) => {
    const ai = post.analysis!;
    // Advertiser filter
    if (advertiserFilter !== 'all' && ai.advertiser_type !== advertiserFilter) {
      return false;
    }
    // Deal type filter
    if (dealTypeFilter !== 'all' && ai.deal_type !== dealTypeFilter) {
      return false;
    }
    // Search query
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchLoc = ai.location?.toLowerCase().includes(term);
      const matchType = ai.property_type?.toLowerCase().includes(term);
      const matchSummary = ai.summary?.toLowerCase().includes(term);
      const matchPrice = ai.price?.toLowerCase().includes(term);
      const matchAuthor = post.author?.toLowerCase().includes(term);
      const matchPhone = post.phones.some((p) => p.normalized.includes(term));
      return matchLoc || matchType || matchSummary || matchPrice || matchPhone || matchAuthor;
    }
    return true;
  });

  const handleCopyPhone = (phone: string) => {
    navigator.clipboard.writeText(phone);
    setCopiedPhone(phone);
    setTimeout(() => setCopiedPhone(null), 2000);
  };

  // Export to Excel (.xlsx) using SheetJS with RTL & string formats
  const handleExportExcel = () => {
    if (completedPosts.length === 0) return;

    const dataForExcel = completedPosts.map((p, idx) => {
      const ai = p.analysis!;
      const phoneList = p.phones.map((ph) => ph.normalized).join(' | ');
      const primaryPhone = p.phones[0]?.normalized || '';
      const carrier = p.phones[0]?.carrier || '';
      const whatsapp = p.phones[0] ? getWhatsAppLink(p.phones[0]) : '';
      const author = p.author || 'غير محدد';
      const postUrl = p.post_url || '';

      return {
        'م': idx + 1,
        'معرف الإعلان': p.id,
        'هل عقار؟': ai.is_real_estate ? 'نعم' : 'لا',
        'صفة المعلن': ai.advertiser_type,
        'اسم المعلن': author,
        'نوع الصفقة': ai.deal_type,
        'نوع العقار': ai.property_type,
        'السعر المالي': ai.price,
        'المنطقة / الموقع': ai.location,
        'الهاتف الرئيسي': primaryPhone,
        'الشبكة': carrier,
        'كافة الأرقام': phoneList,
        'رابط واتساب': whatsapp,
        'رابط المنشور': postUrl,
        'الملخص الذكي': ai.summary,
        'نص المنشور': p.rawText.slice(0, 300),
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataForExcel);

    // Format phone column as string explicitly to preserve leading 0
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
    for (let R = range.s.r + 1; R <= range.e.r; ++R) {
      // Column J is phone (col index 9)
      const phoneCellRef = XLSX.utils.encode_cell({ r: R, c: 9 });
      if (worksheet[phoneCellRef]) {
        worksheet[phoneCellRef].t = 's';
        worksheet[phoneCellRef].z = '@';
      }
    }

    // RTL sheet view
    worksheet['!views'] = [{ rightToLeft: true }];
    // Column widths
    worksheet['!cols'] = [
      { wch: 5 },  // م
      { wch: 14 }, // معرف الإعلان
      { wch: 10 }, // هل عقار
      { wch: 14 }, // صفة المعلن
      { wch: 18 }, // اسم المعلن
      { wch: 12 }, // نوع الصفقة
      { wch: 14 }, // نوع العقار
      { wch: 20 }, // السعر
      { wch: 22 }, // المنطقة
      { wch: 16 }, // الهاتف الرئيسي
      { wch: 14 }, // الشبكة
      { wch: 24 }, // كافة الأرقام
      { wch: 28 }, // رابط واتساب
      { wch: 28 }, // رابط المنشور
      { wch: 45 }, // الملخص
      { wch: 40 }, // النص
    ];

    const workbook = XLSX.utils.book_new();
    // Workbook RTL view specification
    workbook.Workbook = { Views: [{ RTL: true }] };
    XLSX.utils.book_append_sheet(workbook, worksheet, 'عقارات فيسبوك');
    XLSX.writeFile(workbook, `facebook_real_estate_${Date.now()}.xlsx`);
  };

  // Export to CSV with UTF-8 BOM for Arabic compatibility in Excel
  const handleExportCSV = () => {
    if (completedPosts.length === 0) return;

    const headers = [
      'م',
      'معرف الإعلان',
      'هل عقار حقيقي',
      'صفة المعلن',
      'اسم المعلن',
      'نوع الصفقة',
      'نوع العقار',
      'السعر',
      'المنطقة',
      'رقم الهاتف',
      'الشبكة',
      'رابط واتساب',
      'رابط المنشور',
      'الملخص الذكي',
    ];

    const rows = completedPosts.map((p, idx) => {
      const ai = p.analysis!;
      const phone = p.phones[0]?.normalized || '';
      const carrier = p.phones[0]?.carrier || '';
      const wa = p.phones[0] ? getWhatsAppLink(p.phones[0]) : '';
      const author = p.author || 'غير محدد';
      const postUrl = p.post_url || '';
      return [
        idx + 1,
        `"${p.id}"`,
        ai.is_real_estate ? 'نعم' : 'لا',
        `"${ai.advertiser_type}"`,
        `"${author.replace(/"/g, '""')}"`,
        `"${ai.deal_type}"`,
        `"${ai.property_type}"`,
        `"${(ai.price || '').replace(/"/g, '""')}"`,
        `"${(ai.location || '').replace(/"/g, '""')}"`,
        `"${phone}"`,
        `"${carrier}"`,
        `"${wa}"`,
        `"${postUrl}"`,
        `"${(ai.summary || '').replace(/"/g, '""')}"`,
      ].join(',');
    });

    // UTF-8 BOM \uFEFF ensures Arabic renders correctly in Windows Excel
    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `facebook_real_estate_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getAdvertiserBadge = (type: string) => {
    switch (type) {
      case 'مالك':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <UserCheck className="w-3.5 h-3.5" />
            مالك مباشر
          </span>
        );
      case 'وسيط/سمسار':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-sky-500/15 text-sky-400 border border-sky-500/30">
            <Briefcase className="w-3.5 h-3.5" />
            وسيط / سمسار
          </span>
        );
      case 'مشتري':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <ShoppingBag className="w-3.5 h-3.5" />
            عميل مشتري
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-slate-800 text-slate-300">
            {type}
          </span>
        );
    }
  };

  const getDealBadge = (type: string) => {
    switch (type) {
      case 'بيع':
        return (
          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">
            بيع
          </span>
        );
      case 'إيجار':
        return (
          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-indigo-950 text-indigo-300 border border-indigo-800">
            إيجار
          </span>
        );
      case 'مطلوب':
        return (
          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-purple-950 text-purple-300 border border-purple-800">
            طلب شراء/إيجار
          </span>
        );
      default:
        return <span className="text-xs text-slate-400">{type}</span>;
    }
  };

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
      {/* Header & Controls */}
      <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-900/50 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-slate-100 text-base">
              جدول البيانات المنظمة (Structured Real Estate Leads)
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
              {filteredPosts.length} نتيجة
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            بيانات مجمعة من المنشورات ومحللة بالذكاء الاصطناعي مع إمكانية التصدير المباشر
          </p>
        </div>

        {/* Action Buttons: Export */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportExcel}
            disabled={completedPosts.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white shadow-sm transition-all"
          >
            <Download className="w-4 h-4" />
            تصدير إكسيل (.xlsx)
          </button>
          <button
            onClick={handleExportCSV}
            disabled={completedPosts.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 border border-slate-700 transition-all"
          >
            <Download className="w-4 h-4" />
            تصدير CSV (UTF-8)
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3 bg-slate-950/40 border-b border-slate-800/80 flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث بالمنطقة، نوع العقار، السعر، الهاتف، أو اسم المعلن..."
            className="w-full pr-9 pl-3 py-1.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Advertiser filter */}
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <span>المعلن:</span>
          <select
            value={advertiserFilter}
            onChange={(e) => setAdvertiserFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-slate-200 px-2 py-1 rounded-lg text-xs focus:outline-none"
          >
            <option value="all">الكل</option>
            <option value="مالك">مالك فقط</option>
            <option value="وسيط/سمسار">وسيط / سمسار</option>
            <option value="مشتري">مشتري فقط</option>
          </select>
        </div>

        {/* Deal type filter */}
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <span>الصفقة:</span>
          <select
            value={dealTypeFilter}
            onChange={(e) => setDealTypeFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-slate-200 px-2 py-1 rounded-lg text-xs focus:outline-none"
          >
            <option value="all">كافة الصفقات</option>
            <option value="بيع">بيع</option>
            <option value="إيجار">إيجار</option>
            <option value="مطلوب">مطلوب</option>
          </select>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        {filteredPosts.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Building className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-sm font-medium">لا توجد سجلات مكتملة التحليل حالياً</p>
            <p className="text-xs text-slate-500 mt-1">
              قم بتشغيل تحليل المنشورات أعلاه لرؤية النتائج المنظمة هنا وتصديرها.
            </p>
          </div>
        ) : (
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950/80 text-slate-300 border-b border-slate-800">
                <th className="py-3 px-3 w-10 text-center font-bold">#</th>
                <th className="py-3 px-3 font-bold">نوع العقار</th>
                <th className="py-3 px-3 font-bold">الصفقة</th>
                <th className="py-3 px-3 font-bold">المعلن</th>
                <th className="py-3 px-3 font-bold">السعر المالي</th>
                <th className="py-3 px-3 font-bold">المنطقة والموقع</th>
                <th className="py-3 px-3 font-bold">أرقام الهواتف والتواصل</th>
                <th className="py-3 px-3 font-bold">رابط الإعلان</th>
                <th className="py-3 px-3 font-bold">الملخص التسويقي الذكي</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredPosts.map((post, idx) => {
                const ai = post.analysis!;
                const primaryPhone = post.phones[0];

                return (
                  <tr
                    key={post.id}
                    className="hover:bg-slate-800/40 transition-colors group"
                  >
                    <td className="py-3 px-3 text-center text-slate-400 font-mono">
                      {idx + 1}
                    </td>

                    {/* Property Type */}
                    <td className="py-3 px-3 font-semibold text-slate-100 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{ai.property_type || 'غير محدد'}</span>
                      </div>
                    </td>

                    {/* Deal Type */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      {getDealBadge(ai.deal_type)}
                    </td>

                    {/* Advertiser Type & Author */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="flex flex-col gap-0.5">
                        <div>{getAdvertiserBadge(ai.advertiser_type)}</div>
                        {post.author && (
                          <span className="text-[10px] text-slate-400 flex items-center gap-1 truncate max-w-[120px]">
                            <User className="w-3 h-3 text-slate-500 shrink-0" />
                            {post.author}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Price */}
                    <td className="py-3 px-3 whitespace-nowrap font-medium text-emerald-400 font-mono">
                      {ai.price}
                    </td>

                    {/* Location */}
                    <td className="py-3 px-3 text-slate-200">
                      <div className="flex items-center gap-1 max-w-[160px] truncate">
                        <MapPin className="w-3 h-3 text-red-400 shrink-0" />
                        <span title={ai.location}>{ai.location || 'غير مذكور'}</span>
                      </div>
                    </td>

                    {/* Phone & WhatsApp Actions */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      {primaryPhone ? (
                        <div className="flex items-center gap-2">
                          <div className="flex flex-col">
                            <span className="font-mono font-bold text-slate-100 text-xs">
                              {primaryPhone.normalized}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {primaryPhone.carrier}
                            </span>
                          </div>

                          {/* WhatsApp Direct Link */}
                          <a
                            href={getWhatsAppLink(
                              primaryPhone,
                              `مرحباً، بخصوص إعلانكم بخصوص (${ai.property_type} في ${ai.location}) المنشور على فيسبوك:`
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="فتح محادثة واتساب فورية"
                            className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/30 transition-all border border-emerald-500/30"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </a>

                          {/* Copy button */}
                          <button
                            onClick={() => handleCopyPhone(primaryPhone.normalized)}
                            title="نسخ الرقم"
                            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-all"
                          >
                            {copiedPhone === primaryPhone.normalized ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-500">لا يوجد هاتف</span>
                      )}
                    </td>

                    {/* Post Link */}
                    <td className="py-3 px-3 whitespace-nowrap text-center">
                      {post.post_url ? (
                        <a
                          href={post.post_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={`فتح رابط المنشور المباشر علي فيسبوك: ${post.post_url}`}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-400 hover:text-white bg-blue-950/60 hover:bg-blue-600 px-2.5 py-1.5 rounded-xl border border-blue-800/80 hover:border-blue-500 transition-all shadow-sm"
                        >
                          <svg className="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 24 24">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                          </svg>
                          <span>رابط المنشور 🔗</span>
                        </a>
                      ) : (
                        <span className="text-slate-600 text-xs">-</span>
                      )}
                    </td>

                    {/* AI Summary */}
                    <td className="py-3 px-3 text-slate-300 max-w-[280px]">
                      <p className="line-clamp-2 text-xs leading-relaxed" title={ai.summary}>
                        {ai.summary}
                      </p>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
