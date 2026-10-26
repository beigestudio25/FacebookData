#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
=============================================================================
المنسق الشامل لخط استخراج وتحليل عقارات فيسبوك (Master Pipeline Orchestrator)
=============================================================================
المؤلف: مهندس أنظمة وبرمجيات الأتمتة (Automation & Backend Engineer)
يربط المراحل الأربعة في خط إنتاج متكامل:
  المرحلة 1: كشط وتصفية المنشورات بواسطة Playwright والـ Regex
  المرحلة 2: التحليل الدلالي المنظم بواسطة Gemini 3.1 Flash Lite
  المرحلة 3: تصدير قواعد البيانات إلى Excel و CSV مع روابط واتساب
  المرحلة 4: تقرير إحصائي نهائي شامل
=============================================================================
"""

import argparse
import os
import sys
import json
import time
try:
    from dotenv import load_dotenv
    load_dotenv(".env.local")
    load_dotenv(".env")
except ImportError:
    pass

PRIMARY_MODEL = "gemini-3.6-flash"

def print_banner():
    banner = """
    ╔═══════════════════════════════════════════════════════════════════════╗
    ║       🏢 محرك استخراج وتحليل عقارات فيسبوك بالذكاء الاصطناعي          ║
    ║   Facebook Groups Scraper • Regex Phone Extractor • Gemini Analyzer  ║
    ╚═══════════════════════════════════════════════════════════════════════╝
    """
    print(banner)

def main():
    parser = argparse.ArgumentParser(
        description="Facebook Real Estate Master Pipeline Orchestrator"
    )
    parser.add_argument(
        "--group-url",
        type=str,
        default="https://www.facebook.com/groups/egypt.realestate.hub",
        help="رابط مجموعة فيسبوك العقارية المستهدفة"
    )
    parser.add_argument(
        "--max-posts",
        type=int,
        default=30,
        help="الحد الأقصى لعدد المنشورات المستهدفة (الافتراضي: 30)"
    )
    parser.add_argument(
        "--headless",
        action="store_true",
        default=True,
        help="تشغيل متصفح Playwright بدون واجهة رسومية (Headless)"
    )
    parser.add_argument(
        "--no-headless",
        action="store_false",
        dest="headless",
        help="إظهار متصفح Playwright على الشاشة أثناء الكشط"
    )
    parser.add_argument(
        "--model",
        type=str,
        default=PRIMARY_MODEL,
        help=f"اسم نموذج Gemini المستخدم (الافتراضي: {PRIMARY_MODEL})"
    )
    parser.add_argument(
        "--skip-non-real-estate",
        action="store_true",
        help="استبعاد الإعلانات غير العقارية من ملف التصدير النهائي"
    )
    parser.add_argument(
        "--resume",
        action="store_true",
        help="استئناف العمليات السابقة وعدم إعادة تحليل المنشورات المكتملة"
    )
    parser.add_argument(
        "--demo",
        action="store_true",
        help="تشغيل وضع المحاكاة التجريبي (Demo Mode) بدون كشط فعلي من فيسبوك"
    )

    args = parser.parse_args()
    print_banner()

    start_time = time.time()
    scraped_file = "scraped_filtered_leads.json"
    analyzed_file = "analyzed_real_estate_leads.json"
    excel_file = "facebook_real_estate_leads.xlsx"
    csv_file = "facebook_real_estate_leads.csv"

    # =========================================================================
    # المرحلة 1: السحب والتنقية بالأرقام
    # =========================================================================
    print("📍 [المرحلة 1]: استخراج وتصفية المنشورات بأرقام الهواتف المصرية...")

    if args.demo:
        print("ℹ️ تشغيل المرحلة 1 في الوضع التجريبي (--demo) وإنشاء عينات نموذجية...")
        mock_leads = [
            {
                "id": "FB_DEMO_01",
                "post_url": "https://www.facebook.com/groups/demo/posts/101",
                "author_name": "المهندس شريف سالم (مالك)",
                "post_time": "منذ ساعتين",
                "raw_text": "للبيع شقة بالتجمع الخامس حي الأندلس 180م تشطيب كامل الترا سوبر لوكس من المالك مباشرة بدون عمولة 3.4 مليون كاش لسرعة السفر. للتواصل فون وواتس: 01012345678",
                "primary_phone": "01012345678",
                "primary_carrier": "فودافون (Vodafone)",
                "all_phones": [
                    {"local": "01012345678", "intl": "+201012345678", "carrier": "فودافون (Vodafone)"}
                ]
            },
            {
                "id": "FB_DEMO_02",
                "post_url": "https://www.facebook.com/groups/demo/posts/102",
                "author_name": "مكتب نيو كايرو للتسويق العقاري",
                "post_time": "منذ 4 ساعات",
                "raw_text": "فرصة استثمارية محل تجاري 85م للإيجار في الشيخ زايد على المحور مباشرة، واجهة زجاجية، إيجار شهري 60 ألف جنيه، عمولة شهر للمكتب. كود الوحدة 402. اتصال: 01222334455",
                "primary_phone": "01222334455",
                "primary_carrier": "أورنج (Orange)",
                "all_phones": [
                    {"local": "01222334455", "intl": "+201222334455", "carrier": "أورنج (Orange)"}
                ]
            },
            {
                "id": "FB_DEMO_03",
                "post_url": "https://www.facebook.com/groups/demo/posts/103",
                "author_name": "د. هاني عثمان",
                "post_time": "منذ 6 ساعات",
                "raw_text": "مطلوب شقة للإيجار عائلي في المعادي دجلة بميزانية لا تتجاوز 20 ألف شهرياً، يفضل دور أرضي بحديقة أو أول. الاتصال على 01155443322",
                "primary_phone": "01155443322",
                "primary_carrier": "اتصالات (e& Egypt)",
                "all_phones": [
                    {"local": "01155443322", "intl": "+201155443322", "carrier": "اتصالات (e& Egypt)"}
                ]
            },
            {
                "id": "FB_DEMO_04_SPAM",
                "post_url": "https://www.facebook.com/groups/demo/posts/104",
                "author_name": "إعلانات توظيف مصر",
                "post_time": "منذ 8 ساعات",
                "raw_text": "مطلوب فوراً شباب للعمل كول سنتر وسائقين رخصة مهنية في مدينة نصر، الراتب يبدأ من 7500 جنيه، تواصل واتساب على: 01511223344",
                "primary_phone": "01511223344",
                "primary_carrier": "وي (Telecom Egypt)",
                "all_phones": [
                    {"local": "01511223344", "intl": "+201511223344", "carrier": "وي (Telecom Egypt)"}
                ]
            }
        ]
        with open(scraped_file, "w", encoding="utf-8") as f:
            json.dump(mock_leads, f, ensure_ascii=False, indent=2)
        total_scraped = len(mock_leads)
        total_qualified = len(mock_leads)
    else:
        # استدعاء سكربت الكشط
        cmd_scrape = [
            sys.executable,
            "facebook_stealth_scraper.py",
            "--group-url", args.group_url,
            "--max-posts", str(args.max_posts),
            "--output", scraped_file
        ]
        if args.headless:
            cmd_scrape.append("--headless")
        if args.resume:
            cmd_scrape.append("--resume")

        print(f"🚀 تنفيذ: {' '.join(cmd_scrape)}")
        ret = os.system(" ".join(cmd_scrape))
        if ret != 0 or not os.path.exists(scraped_file):
            print("❌ فشلت عملية سحب المنشورات. يرجى مراجعة إعدادات تسجيل الدخول أو تشغيل الوضع التجريبي عبر --demo")
            sys.exit(1)

        with open(scraped_file, "r", encoding="utf-8") as f:
            scraped_data = json.load(f)
            total_scraped = len(scraped_data)
            total_qualified = len(scraped_data)

    print(f"✅ اكتملت المرحلة الأولى بنجاح: تم تجهيز {total_qualified} منشور يحتوي على أرقام هواتف صالحة.\n")

    # =========================================================================
    # المرحلة 2: التحليل الذكي عبر Gemini API
    # =========================================================================
    print("📍 [المرحلة 2]: التحليل الدلالي المنظم باستخدام Gemini...")
    cmd_analyze = [
        sys.executable,
        "gemini_real_estate_service.py",
        "--input-json", scraped_file,
        "--output-json", analyzed_file,
        "--model", args.model
    ]
    if args.skip_non_real_estate:
        cmd_analyze.append("--skip-non-real-estate")
    if args.resume:
        cmd_analyze.append("--resume")
    if args.demo:
        cmd_analyze.append("--demo")

    print(f"🚀 تنفيذ: {' '.join(cmd_analyze)}")
    ret_analyze = os.system(" ".join(cmd_analyze))
    if ret_analyze != 0 or not os.path.exists(analyzed_file):
        print("❌ فشلت عملية التحليل بـ Gemini.")
        sys.exit(1)

    with open(analyzed_file, "r", encoding="utf-8") as f:
        analyzed_data = json.load(f)

    successful_analyses = [p for p in analyzed_data if p.get("ai_analysis") is not None and not p.get("analysis_error")]
    failed_analyses = [p for p in analyzed_data if p.get("analysis_error") or p.get("ai_analysis") is None]

    print(f"✅ اكتمل التحليل الذكي: {len(successful_analyses)} ناجح | {len(failed_analyses)} تعثر.\n")

    # =========================================================================
    # المرحلة 3: التصدير لـ Excel و CSV
    # =========================================================================
    print("📍 [المرحلة 3]: تصدير البيانات إلى جداول CRM احترافية...")
    cmd_export = [
        sys.executable,
        "real_estate_exporter.py",
        "--input-json", analyzed_file,
        "--excel-out", excel_file,
        "--csv-out", csv_file
    ]
    if args.demo:
        cmd_export.append("--demo")

    print(f"🚀 تنفيذ: {' '.join(cmd_export)}")
    ret_export = os.system(" ".join(cmd_export))
    if ret_export != 0:
        print("❌ فشلت عملية تصدير الجداول.")
        sys.exit(1)

    elapsed_time = round(time.time() - start_time, 2)

    # =========================================================================
    # المرحلة 4: التقرير الإحصائي النهائي
    # =========================================================================
    print("\n" + "=" * 70)
    print("📊 التقرير الهندسي والإحصائي الشامل للعملية (Final Pipeline Summary)")
    print("=" * 70)
    print(f"⏱️ إجمالي الوقت المستغرق: {elapsed_time} ثانية")
    print(f"📥 المنشورات المستخرجة: {total_scraped}")
    print(f"📱 المنشورات المؤهلة (تحتوي على أرقام هواتف): {total_qualified}")
    print(f"🧠 المنشورات المحللة بنجاح عبر Gemini ({args.model}): {len(successful_analyses)}")
    print(f"⚠️ المنشورات التي تعثر تحليلها: {len(failed_analyses)}")
    print("-" * 70)
    print(f"💾 ملف الإدخال المصفى:    {os.path.abspath(scraped_file)}")
    print(f"💾 ملف التحليل الدلالي:   {os.path.abspath(analyzed_file)}")
    print(f"📊 ملف Excel التفاعلي:    {os.path.abspath(excel_file)}")
    print(f"📄 ملف CSV المتوافق:      {os.path.abspath(csv_file)}")
    print("=" * 70)
    print("✨ تم اكتمال خط العمليات بنجاح وبأعلى معايير الدقة الهندسية!\n")

if __name__ == "__main__":
    main()
