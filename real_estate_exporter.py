#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
=============================================================================
وحدة التصدير والجداول الذكية لفرق التسويق والمبيعات (CRM Real Estate Exporter)
=============================================================================
المؤلف: مهندس أنظمة وبرمجيات الأتمتة (Automation & Backend Engineer)
الميزات التقنية:
1. توليد روابط واتساب مباشرة (WhatsApp Click-to-Chat) مع رسالة استفسار ذكية ومخصصة لكل عقار.
2. بناء ملف إكسيل (.xlsx) احترافي باتجاه من اليمين لليسار (RTL).
3. تظليل صفوف المالك المباشر بلون أخضر هادئ (#DCFCE7) لتمييز الفرص ذات الأولوية.
4. تثبيت عرض الأعمدة تلقائياً (Auto-fit Column Widths) وتنسيق الحدود والخطوط.
5. منع تشويه أرقام الهواتف (حفظها كنصوص صريحة لمنع حذف الصفر أو التحويل لصيغة 1E+10).
6. عزل المنشورات التي تعثر تحليلها (analysis_error) في ورقة عمل منفصلة داخل الإكسيل لسهولة الفحص.
7. تصدير ملف CSV بترميز `utf-8-sig` لضمان قراءة النصوص العربية في Microsoft Excel بنسبة 100%.
8. دعم الخيار التجريبي (--demo) والخروج الصريح عند غياب ملف الإدخال.
=============================================================================
"""

import argparse
import json
import os
import re
import sys
import urllib.parse
from typing import List, Dict, Any, Tuple

try:
    import pandas as pd
    import openpyxl
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
    from openpyxl.utils import get_column_letter
except ImportError:
    print("❌ خطأ: يرجى تثبيت المكتبات المطلوبة أولاً: pip install pandas openpyxl")
    sys.exit(1)


# =============================================================================
# 1. دوال تنسيق روابط الواتساب والرسائل الاستفسارية الذكية
# =============================================================================

def format_international_whatsapp_number(local_phone: str) -> str:
    """تحويل الرقم المحلي (01xxxxxxxxx) إلى الصيغة الدولية لواتساب (201xxxxxxxxx)."""
    digits = re.sub(r'\D', '', str(local_phone or ''))
    if digits.startswith("20") and len(digits) == 12:
        return digits
    if digits.startswith("01") and len(digits) == 11:
        return "20" + digits[1:]
    if digits.startswith("1") and len(digits) == 10:
        return "20" + digits
    return digits

def generate_whatsapp_inquiry_url(phone_num: str, property_type: str = "العقار", location: str = "") -> str:
    """
    توليد رابط واتساب مباشر (Click-to-Chat) مع رسالة استفسار تسويقية مخصصة.
    الرابط يفتح محادثة واتساب فورية في التطبيق أو المتصفح دون الحاجة لحفظ الرقم مسبقاً.
    """
    intl_digits = format_international_whatsapp_number(phone_num)
    if not intl_digits:
        return ""

    loc_str = f" في {location}" if location and location not in ["غير محدد", "غير مذكور"] else ""
    prop_str = property_type if property_type and property_type != "غير محدد" else "العقار"

    inquiry_message = (
        f"السلام عليكم، بخصوص إعلانكم المنشور على فيسبوك عن ({prop_str}{loc_str})، "
        f"هل الوحدة ما زالت متاحة لمزيد من التفاصيل والمعاينة؟ شكراً لك."
    )

    encoded_msg = urllib.parse.quote(inquiry_message)
    return f"https://wa.me/{intl_digits}?text={encoded_msg}"


# =============================================================================
# 2. تجهيز وتسوية السجلات (Flattening & Schema Normalization)
# =============================================================================

def split_posts_by_status(posts: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """فصل المنشورات الناجحة عن تلك التي احتوت على أخطاء تحليل."""
    success_posts = []
    failed_posts = []

    for post in posts:
        if post.get("analysis_error") or post.get("ai_analysis") is None:
            failed_posts.append(post)
        else:
            success_posts.append(post)

    return success_posts, failed_posts

def prepare_leads_dataframe(posts: List[Dict[str, Any]]) -> pd.DataFrame:
    """
    تحويل مصفوفة السجلات الناجحة إلى هيكل جدول بيانات منظم ومتوافق مع CRM.
    """
    rows = []

    for idx, post in enumerate(posts, start=1):
        ai = post.get("ai_analysis") or {}

        # استخراج الهاتف والشبكة
        phones_list = post.get("all_phones") or post.get("extracted_phones") or []
        primary_phone = post.get("primary_phone") or (phones_list[0].get("local") if phones_list else "")
        carrier = post.get("primary_carrier") or (phones_list[0].get("carrier") if phones_list else "غير محدد")

        all_phones_str = " | ".join([p.get("local", "") for p in phones_list if p.get("local")]) if phones_list else primary_phone

        prop_type = ai.get("property_type") or "غير محدد"
        loc = ai.get("location") or "غير محدد"
        adv_type = ai.get("advertiser_type") or "غير محدد"
        deal_type = ai.get("deal_type") or "غير محدد"
        price_val = ai.get("price") or "غير مذكور"
        summary_val = ai.get("summary") or ""
        is_real = "نعم (عقار مؤكد)" if ai.get("is_real_estate", False) else "لا (إعلان خارجي)"

        # توليد رابط الواتساب الذكي
        wa_link = generate_whatsapp_inquiry_url(primary_phone, prop_type, loc) if primary_phone else ""

        # رابط المنشور واسم المعلن
        post_url = post.get("post_url") or ""
        author = post.get("author_name") or post.get("author") or "غير محدد"

        raw_text_snippet = (post.get("raw_text") or "").replace("\n", " ").strip()
        if len(raw_text_snippet) > 250:
            raw_text_snippet = raw_text_snippet[:250] + "..."

        row = {
            "م": idx,
            "معرف الفرصة": post.get("id", f"LEAD_{idx:03d}"),
            "هل عقار؟": is_real,
            "صفة المعلن": adv_type,
            "اسم المعلن": author,
            "نوع الصفقة": deal_type,
            "نوع العقار": prop_type,
            "السعر المطلوب": price_val,
            "المنطقة / الموقع": loc,
            "رقم الهاتف الرئيسي": f"'{primary_phone}" if primary_phone else "",
            "شبكة الاتصالات": carrier,
            "جميع أرقام الهواتف": all_phones_str,
            "رابط واتساب فوري": wa_link,
            "رابط المنشور": post_url,
            "الملخص التسويقي الذكي": summary_val,
            "نص المنشور الأصلي": raw_text_snippet
        }
        rows.append(row)

    return pd.DataFrame(rows)


def prepare_failed_dataframe(failed_posts: List[Dict[str, Any]]) -> pd.DataFrame:
    """تحويل السجلات التي تعثر تحليلها لجدول مستقل للمتابعة الفنية."""
    rows = []
    for idx, post in enumerate(failed_posts, start=1):
        phones_list = post.get("all_phones") or post.get("extracted_phones") or []
        primary_phone = post.get("primary_phone") or (phones_list[0].get("local") if phones_list else "")
        carrier = post.get("primary_carrier") or (phones_list[0].get("carrier") if phones_list else "غير محدد")
        error_msg = post.get("analysis_error") or "تحليل غير مكتمل أو فارغ"
        raw_text_snippet = (post.get("raw_text") or "").replace("\n", " ").strip()

        rows.append({
            "م": idx,
            "معرف المنشور": post.get("id", f"ERR_{idx:03d}"),
            "رقم الهاتف": f"'{primary_phone}" if primary_phone else "",
            "الشبكة": carrier,
            "اسم المعلن": post.get("author_name") or post.get("author") or "غير محدد",
            "رابط المنشور": post.get("post_url") or "",
            "سبب الخطأ": error_msg,
            "نص المنشور": raw_text_snippet
        })
    return pd.DataFrame(rows)


# =============================================================================
# 3. بناء وتنسيق ملف الإكسيل الاحترافي (OpenPyXL Engine)
# =============================================================================

def export_to_styled_excel(
    df_success: pd.DataFrame,
    df_failed: pd.DataFrame,
    excel_path: str = "real_estate_leads.xlsx"
) -> str:
    """
    إنشاء وتنسيق ملف إكسيل (.xlsx) احترافي متكامل:
    - اتجاه RTL من اليمين لليسار على مستوى الورقة.
    - ورقة رئيسية للفرص الناجحة وورقة ثانية للإعلانات المتعثرة.
    - تلوين صفوف المالك المباشر باللون الأخضر الهادئ (#DCFCE7).
    - روابط واتساب وروابط منشورات تفاعلية قابلة للنقر.
    """
    wb = openpyxl.Workbook()

    # لوحة الألوان والأنماط
    HEADER_FILL = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid")
    HEADER_FONT = Font(name="Segoe UI", size=11, bold=True, color="FFFFFF")
    ERR_HEADER_FILL = PatternFill(start_color="881337", end_color="881337", fill_type="solid")

    OWNER_ROW_FILL = PatternFill(start_color="DCFCE7", end_color="DCFCE7", fill_type="solid")
    BROKER_CELL_FILL = PatternFill(start_color="E0F2FE", end_color="E0F2FE", fill_type="solid")
    BUYER_CELL_FILL = PatternFill(start_color="FEF3C7", end_color="FEF3C7", fill_type="solid")

    DATA_FONT = Font(name="Segoe UI", size=10, color="0F172A")
    BOLD_DATA_FONT = Font(name="Segoe UI", size=10, bold=True, color="0F172A")
    PRICE_FONT = Font(name="Segoe UI", size=10, bold=True, color="047857")
    LINK_FONT = Font(name="Segoe UI", size=10, bold=True, color="0284C7", underline="single")
    POST_LINK_FONT = Font(name="Segoe UI", size=9, color="3B82F6", underline="single")

    BORDER_THIN = Border(
        left=Side(style='thin', color='CBD5E1'),
        right=Side(style='thin', color='CBD5E1'),
        top=Side(style='thin', color='CBD5E1'),
        bottom=Side(style='thin', color='CBD5E1')
    )

    # 1. الورقة الرئيسية: الفرص المحللة
    ws = wb.active
    ws.title = "فرص عقارات فيسبوك"
    ws.views.sheetView[0].rightToLeft = True

    if not df_success.empty:
        headers = list(df_success.columns)
        ws.append(headers)

        for col_idx in range(1, len(headers) + 1):
            cell = ws.cell(row=1, column=col_idx)
            cell.fill = HEADER_FILL
            cell.font = HEADER_FONT
            cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
            cell.border = BORDER_THIN

        ws.row_dimensions[1].height = 28

        for row_idx, (_, row_data) in enumerate(df_success.iterrows(), start=2):
            is_owner = row_data["صفة المعلن"] == "مالك"
            advertiser_type = row_data["صفة المعلن"]

            for col_idx, col_name in enumerate(headers, start=1):
                val = row_data[col_name]
                cell = ws.cell(row=row_idx, column=col_idx)

                if col_name in ["الملخص التسويقي الذكي", "نص المنشور الأصلي"]:
                    cell.alignment = Alignment(horizontal="right", vertical="center", wrap_text=True)
                elif col_name in ["نوع العقار", "المنطقة / الموقع", "السعر المطلوب", "اسم المعلن"]:
                    cell.alignment = Alignment(horizontal="right", vertical="center")
                else:
                    cell.alignment = Alignment(horizontal="center", vertical="center")

                cell.border = BORDER_THIN
                cell.font = DATA_FONT

                if is_owner:
                    cell.fill = OWNER_ROW_FILL
                elif col_name == "صفة المعلن":
                    if advertiser_type == "وسيط/سمسار":
                        cell.fill = BROKER_CELL_FILL
                    elif advertiser_type == "مشتري":
                        cell.fill = BUYER_CELL_FILL

                if col_name == "السعر المطلوب":
                    cell.font = PRICE_FONT

                if col_name == "رقم الهاتف الرئيسي":
                    clean_phone = str(val).lstrip("'")
                    cell.value = clean_phone
                    cell.number_format = '@'
                    cell.font = BOLD_DATA_FONT
                    continue

                if col_name == "رابط واتساب فوري":
                    wa_url = str(val).strip()
                    if wa_url and wa_url.startswith("http"):
                        cell.hyperlink = wa_url
                        cell.value = "مراسلة واتساب 💬"
                        cell.font = LINK_FONT
                    else:
                        cell.value = "لا يوجد هاتف"
                        cell.font = Font(name="Segoe UI", size=9, color="94A3B8")
                    continue

                if col_name == "رابط المنشور":
                    p_url = str(val).strip()
                    if p_url and p_url.startswith("http"):
                        cell.hyperlink = p_url
                        cell.value = "فتح الإعلان 🔗"
                        cell.font = POST_LINK_FONT
                    else:
                        cell.value = "-"
                    continue

                cell.value = val

            ws.row_dimensions[row_idx].height = 24

        for col in ws.columns:
            col_letter = get_column_letter(col[0].column)
            header_name = str(col[0].value or '')
            max_len = max(len(str(cell.value or '')) for cell in col)

            if header_name == "الملخص التسويقي الذكي":
                col_width = 45
            elif header_name == "نص المنشور الأصلي":
                col_width = 35
            elif header_name in ["المنطقة / الموقع", "السعر المطلوب"]:
                col_width = 24
            elif header_name in ["رابط واتساب فوري", "رقم الهاتف الرئيسي"]:
                col_width = 18
            else:
                col_width = min(max(max_len + 3, 12), 30)

            ws.column_dimensions[col_letter].width = col_width
    else:
        ws.append(["لا توجد منشورات مكتملة التحليل"])

    # 2. الورقة الثانية: المنشورات التي تعثر تحليلها (إن وجدت)
    if not df_failed.empty:
        ws_err = wb.create_sheet(title="إعلانات تعثر تحليلها")
        ws_err.views.sheetView[0].rightToLeft = True

        err_headers = list(df_failed.columns)
        ws_err.append(err_headers)

        for col_idx in range(1, len(err_headers) + 1):
            cell = ws_err.cell(row=1, column=col_idx)
            cell.fill = ERR_HEADER_FILL
            cell.font = HEADER_FONT
            cell.alignment = Alignment(horizontal="center", vertical="center")
            cell.border = BORDER_THIN

        for row_idx, (_, row_data) in enumerate(df_failed.iterrows(), start=2):
            for col_idx, col_name in enumerate(err_headers, start=1):
                cell = ws_err.cell(row=row_idx, column=col_idx)
                val = row_data[col_name]

                cell.border = BORDER_THIN
                cell.font = DATA_FONT

                if col_name == "رقم الهاتف":
                    cell.value = str(val).lstrip("'")
                    cell.number_format = '@'
                elif col_name == "سبب الخطأ":
                    cell.value = str(val)
                    cell.font = Font(name="Segoe UI", size=9, color="B91C1C", bold=True)
                elif col_name == "رابط المنشور":
                    p_url = str(val).strip()
                    if p_url and p_url.startswith("http"):
                        cell.hyperlink = p_url
                        cell.value = "فتح الإعلان 🔗"
                        cell.font = POST_LINK_FONT
                    else:
                        cell.value = "-"
                else:
                    cell.value = val

        for col in ws_err.columns:
            col_letter = get_column_letter(col[0].column)
            max_len = max(len(str(cell.value or '')) for cell in col)
            ws_err.column_dimensions[col_letter].width = min(max(max_len + 3, 14), 45)

    wb.save(excel_path)
    print(f"📊 [تم التصدير]: تم حفظ ملف الإكسيل المنسق بنجاح في '{excel_path}'")
    return excel_path


# =============================================================================
# 4. تصدير ملف CSV العربي المتوافق (UTF-8 with BOM)
# =============================================================================

def export_to_safe_csv(df: pd.DataFrame, csv_path: str = "real_estate_leads.csv") -> str:
    """
    تصدير ملف CSV باستخدام ترميز `utf-8-sig` (Byte Order Mark).
    هذا الترميز ضروري لمنع تشويه الحروف العربية في Microsoft Excel.
    """
    df_csv = df.copy()
    if "رقم الهاتف الرئيسي" in df_csv.columns:
        df_csv["رقم الهاتف الرئيسي"] = df_csv["رقم الهاتف الرئيسي"].astype(str).str.lstrip("'")

    df_csv.to_csv(csv_path, index=False, encoding="utf-8-sig")
    print(f"📄 [تم التصدير]: تم حفظ ملف CSV المتوافق عربياً في '{csv_path}'")
    return csv_path


# =============================================================================
# 5. الدالة التنفيذية الموحدة (Main Exporter Pipeline)
# =============================================================================

def export_real_estate_leads(
    posts: List[Dict[str, Any]],
    excel_path: str = "facebook_real_estate_leads.xlsx",
    csv_path: str = "facebook_real_estate_leads.csv"
) -> Tuple[str, str]:
    """
    دالة شاملة تأخذ قائمة منشورات فيسبوك، تفصل الناجح عن المتعثر،
    ثم تصدر كل من ملف Excel المنسق وملف الـ CSV المتوافق.
    """
    if not posts:
        print("⚠️ تحذير: قائمة المنشورات فارغة! لا توجد بيانات للتصدير.")
        return "", ""

    success_posts, failed_posts = split_posts_by_status(posts)
    print(f"\n🔄 جاري تجهيز {len(posts)} سجل: {len(success_posts)} مكتمل و {len(failed_posts)} متعثر...")

    df_success = prepare_leads_dataframe(success_posts)
    df_failed = prepare_failed_dataframe(failed_posts)

    excel_file = export_to_styled_excel(df_success, df_failed, excel_path)
    csv_file = export_to_safe_csv(df_success, csv_path)

    print("✨ اكتملت عملية التصدير بنجاح لكافة الصيغ!\n")
    return excel_file, csv_file


# =============================================================================
# 6. نقطة الدخول وسطر الأوامر (CLI Entry Point)
# =============================================================================

def main():
    parser = argparse.ArgumentParser(
        description="Facebook Real Estate CRM Leads Exporter (Excel & CSV with WhatsApp Links)"
    )
    parser.add_argument(
        "--input-json",
        type=str,
        default="analyzed_real_estate_leads.json",
        help="مسار ملف JSON للمنشورات المحللة بـ Gemini"
    )
    parser.add_argument(
        "--excel-out",
        type=str,
        default="facebook_real_estate_leads.xlsx",
        help="مسار واسم ملف Excel الناتج (.xlsx)"
    )
    parser.add_argument(
        "--csv-out",
        type=str,
        default="facebook_real_estate_leads.csv",
        help="مسار واسم ملف CSV الناتج (.csv)"
    )
    parser.add_argument(
        "--demo",
        action="store_true",
        help="تشغيل السكربت مع بيانات تجريبية وهمية في حال عدم توفر ملف الإدخال الحقيقي"
    )

    args = parser.parse_args()

    # التحقق من وجود ملف الإدخال
    if not os.path.exists(args.input_json):
        if not args.demo:
            print(
                f"❌ خطأ: ملف الإدخال '{args.input_json}' غير موجود!\n"
                f"💡 إذا كنت ترغب في تجربة التصدير مع عينات نموذجية، مرر الخيار: --demo\n"
                f"مثال: python real_estate_exporter.py --demo"
            )
            sys.exit(1)

        print(f"ℹ️ تم تفعيل الخيار التجريبي (--demo). جاري إنشاء عينات نموذجية لاختبار التصدير...")
        sample_posts = [
            {
                "id": "FB_LEAD_001",
                "post_url": "https://facebook.com/groups/egyptrealestate/posts/101",
                "author_name": "أحمد محمود (المالك)",
                "primary_phone": "01012345678",
                "primary_carrier": "فودافون (Vodafone)",
                "raw_text": "للبيع شقة بالتجمع الخامس حي الأندلس 175م من المالك مباشرة 3.4 مليون كاش 01012345678",
                "ai_analysis": {
                    "is_real_estate": True,
                    "advertiser_type": "مالك",
                    "deal_type": "بيع",
                    "property_type": "شقة",
                    "price": "3,450,000 ج.م كاش",
                    "location": "التجمع الخامس - حي الأندلس",
                    "summary": "شقة فاخرة للبيع 175م بالتجمع الخامس من المالك مباشرة بدون وسيط بسعر 3.45 مليون كاش."
                }
            },
            {
                "id": "FB_LEAD_002",
                "post_url": "https://facebook.com/groups/egyptrealestate/posts/102",
                "author_name": "شركة زاد العقارية",
                "primary_phone": "01288765432",
                "primary_carrier": "أورنج (Orange)",
                "raw_text": "محل تجاري للإيجار بالشيخ زايد المحور المركزي 85م إيجار 60 ألف عمولة شهر مكتب ريل ستيت 01288765432",
                "ai_analysis": {
                    "is_real_estate": True,
                    "advertiser_type": "وسيط/سمسار",
                    "deal_type": "إيجار",
                    "property_type": "محل",
                    "price": "60,000 ج.م شهرياً (عمولة شهر)",
                    "location": "الشيخ زايد - المحور المركزي",
                    "summary": "محل تجاري 85م للإيجار في موقع حيوي بالشيخ زايد عبر شركة تسويق عقاري."
                }
            },
            {
                "id": "FB_LEAD_003_FAILED",
                "post_url": "https://facebook.com/groups/egyptrealestate/posts/103",
                "author_name": "محمد حسن",
                "primary_phone": "01155443322",
                "primary_carrier": "اتصالات (e& Egypt)",
                "raw_text": "مطلوب شقة للإيجار في المعادي 01155443322",
                "ai_analysis": None,
                "analysis_error": "انقطاع مؤقت في الاتصال أثناء الاستدعاء (503 Service Unavailable)"
            }
        ]
        posts_data = sample_posts
    else:
        with open(args.input_json, "r", encoding="utf-8") as f:
            posts_data = json.load(f)

    export_real_estate_leads(posts_data, excel_path=args.excel_out, csv_path=args.csv_out)


if __name__ == "__main__":
    main()
