#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
=============================================================================
خدمة التحليل الذكي لإعلانات عقارات فيسبوك عبر حزمة Google GenAI الرسمية
=============================================================================
المؤلف: مهندس أنظمة وبرمجيات الأتمتة والذكاء الاصطناعي
الميزات التقنية:
1. استخدام حزمة `google-genai` الرسمية الجديدة (Modern Google GenAI SDK).
2. النموذج الأساسي: 'gemini-3.1-flash-lite' وسلسلة الاحتياط: 'gemini-3.8-flash'.
3. ضبط درجة الحرارة على `temperature=0.1` لضمان الحتمية الدلالية ومنع الهلوسة.
4. تقييد المخرجات الصارم بمخطط `response_schema` بصيغة JSON حصرية.
5. استخراج الحقول المطلوبة بدقة:
   - is_real_estate (بوليوني لاستبعاد الإعلانات المضللة والوظائف)
   - advertiser_type ('مالك' / 'وسيط/سمسار' / 'مشتري' / 'غير محدد')
   - deal_type ('بيع' / 'إيجار' / 'مطلوب' / 'تنازل' / 'غير محدد')
   - property_type (شقة، فيلا، محل، أرض، مكتب، إلخ)
   - price (القيمة المالية ونظام الدفع أو 'غير مذكور')
   - location (المنطقة أو الحي أو اسم الكمبوند بالتحديد)
   - summary (ملخص تسويقي احترافي ومكثف في جملة واحدة)
6. دعم الحفظ التراكمي اللحظي والاستئناف الذكي (--resume).
7. دعم تخطي المنشورات غير العقارية (--skip-non-real-estate).
8. حفظ أسباب الخطأ في analysis_error دون تزييف قيمة is_real_estate.
=============================================================================
"""

import argparse
import json
import os
import sys
import time
from typing import Dict, Any, List, Optional
try:
    from dotenv import load_dotenv
    load_dotenv(".env.local")
    load_dotenv(".env")
except ImportError:
    pass

# ثوابت أسماء النماذج القياسية
PRIMARY_MODEL = "gemini-3.6-flash"
FALLBACK_MODEL = "gemini-3.8-flash"
DEFAULT_MODELS = [PRIMARY_MODEL, FALLBACK_MODEL]

# استيراد الحزمة الرسمية الجديدة من Google
try:
    from google import genai
    from google.genai import types
except ImportError:
    print("❌ خطأ: حزمة google-genai غير مثبتة! قم بتشغيل: pip install google-genai>=2.4.0")
    sys.exit(1)


# =============================================================================
# 1. تعريف مخطط البيانات الصارم (Structured JSON Schema)
# =============================================================================

REAL_ESTATE_RESPONSE_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "is_real_estate": {
            "type": "BOOLEAN",
            "description": "True إذا كان المنشور يخص عقاراً حقيقياً، وFalse للإعلانات غير العقارية كالوظائف والسيارات والخدمات العامة."
        },
        "advertiser_type": {
            "type": "STRING",
            "enum": ["مالك", "وسيط/سمسار", "مشتري", "غير محدد"],
            "description": "صفة صاحب المنشور بدقة: مالك مباشر، وسيط أو مكتب تسويق، أو مشتري يبحث عن عقار."
        },
        "deal_type": {
            "type": "STRING",
            "enum": ["بيع", "إيجار", "مطلوب", "تنازل", "غير محدد"],
            "description": "نوع الصفقة المعروضة في المنشور."
        },
        "property_type": {
            "type": "STRING",
            "description": "نوع العقار، مثل: شقة، فيلا، تاون هاوس، دوبلكس، محل، مكتب إداري، أرض، عمارة، شاليه."
        },
        "price": {
            "type": "STRING",
            "description": "السعر المذكور بدقة ونظام الدفع (كاش/أقساط/مقدم) أو عبارة 'غير مذكور' في حال عدم تحديده."
        },
        "location": {
            "type": "STRING",
            "description": "المنطقة أو الحي أو اسم الكمبوند أو الشارع الرئيسي بالتحديد."
        },
        "summary": {
            "type": "STRING",
            "description": "ملخص تسويقي احترافي ومكثف للمنشور في جملة واحدة دقيقة ومباشرة دون حشو."
        }
    },
    "required": [
        "is_real_estate",
        "advertiser_type",
        "deal_type",
        "property_type",
        "price",
        "location",
        "summary"
    ]
}


# =============================================================================
# 2. التوجيهات الهندسية للنظام (System Instructions)
# =============================================================================

SYSTEM_INSTRUCTION = """
أنت خبير محترف ومحلل رئيسي لسوق العقارات في مصر والعالم العربي.
مهمتك: قراءة نصوص المنشورات المستخرجة من مجموعات فيسبوك العقارية بدقة، وفهم اللهجة المصرية والمصطلحات الدارجة، ثم استخراج البيانات بتنسيق JSON حصرياً مطابق للمخطط المطلوب.

قواعد التحليل الدلالي والتصنيف:
1. [is_real_estate]:
   - ضع True إذا كان الإعلان يتعلق ببيع، شراء، أو تأجير عقارات حقيقية.
   - ضع False إذا كان الإعلان عن: وظائف (دليفري، كول سنتر)، بيع سيارات، خدمات منزلية، شحن، أو منشورات عامة لا تخص عقاراً.

2. [advertiser_type]:
   - "مالك": إذا ذكر صراحة (من المالك مباشرة، شقتي، بدون وسيط، بدون عمولة، لسرعة السفر).
   - "وسيط/سمسار": إذا احتوى على دلالات الوساطة (كود الإعلان، لدينا شقة، شركة عقارات، عمولة شهر، متاح لدينا، للمعاينة والاستفسار اتصال بالمكتب).
   - "مشتري": إذا كان يبحث عن عقار (مطلوب شقة، بدور على، متاح شقة للإيجار أسكن فيها).
   - "غير محدد": إذا كانت الصياغة غامضة ولا توجد أي مؤشرات.

3. [deal_type]:
   - "بيع": إعلان معروض للبيع كاش أو تقسيط.
   - "إيجار": إيجار جديد أو مفروش أو سنوي.
   - "مطلوب": طلب شراء أو استئجار عقار.
   - "تنازل": بيع تنازل عن حجز أو وحدة في الإسكان.

4. [price]:
   - اذكر القيمة المالية ونظام الدفع (مثال: '3,200,000 ج.م كاش' أو 'مقدم 500 ألف والباقي أقساط'). إذا لم يذكر السعر فاكتب 'غير مذكور'.

5. [location]:
   - استخرج أدق موقع جغرافي وارد في النص (المدينة، الحي، التجمع، الكمبوند، الشارع الرئيسي).

6. [summary]:
   - صياغة جملة واحدة تسويقية احترافية تتضمن أهم التفاصيل (نوع العقار + الموقع + السعر + صفة المعلن).
"""


# =============================================================================
# 3. فئة خدمة التحليل الذكية (GeminiRealEstateAnalyzer)
# =============================================================================

class GeminiRealEstateAnalyzer:
    """
    خدمة احترافية تدير استدعاءات Google GenAI SDK مع معالجة الأخطاء والتوقف التدريجي.
    """

    def __init__(self, api_key: Optional[str] = None, preferred_model: str = PRIMARY_MODEL):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            raise ValueError(
                "❌ لم يتم العثور على مفتاح GEMINI_API_KEY! "
                "يرجى تعيينه في ملف .env أو تمريره مباشرة إلى الكائن."
            )

        # تهيئة عميل Google GenAI الرسمي
        self.client = genai.Client(
            api_key=self.api_key,
            http_options={
                "headers": {
                    "User-Agent": "facebook-real-estate-scraper"
                }
            }
        )

        self.preferred_model = preferred_model
        # سلسلة النماذج الاحتياطية بدون تكرار
        models = [preferred_model]
        if FALLBACK_MODEL not in models:
            models.append(FALLBACK_MODEL)
        self.fallback_models = models

    def _build_generation_config(self) -> types.GenerateContentConfig:
        """بناء كائن الإعدادات مع ضبط درجة الحرارة على 0.1 والـ Schema."""
        return types.GenerateContentConfig(
            system_instruction=SYSTEM_INSTRUCTION,
            response_mime_type="application/json",
            response_schema=REAL_ESTATE_RESPONSE_SCHEMA,
            temperature=0.1  # حتمية دلالية ومنع الهلوسة
        )

    def analyze_single_post(self, post_text: str, max_retries: int = 3) -> Dict[str, Any]:
        """
        تحليل نص منشور فيسبوك واحد واسترجاع البيانات بصيغة JSON نقية وموثوقة.
        تثير استثناء في حال الفشل حتى لا يضع النظام قيماً وهمية كـ is_real_estate=False.
        """
        if not post_text or not post_text.strip():
            raise ValueError("نص المنشور فارغ تماماً")

        user_content = f"حلل بدقة هذا المنشور العقاري المستخرج من فيسبوك:\n\"\"\"\n{post_text.strip()}\n\"\"\""
        config = self._build_generation_config()

        last_error = None
        for model_name in self.fallback_models:
            for attempt in range(1, max_retries + 1):
                try:
                    response = self.client.models.generate_content(
                        model=model_name,
                        contents=user_content,
                        config=config
                    )

                    raw_text = response.text
                    if not raw_text:
                        raise ValueError(f"استرجاع استجابة فارغة من النموذج {model_name}")

                    parsed_json = json.loads(raw_text.strip())
                    return parsed_json

                except Exception as err:
                    last_error = err
                    err_msg = str(err)
                    is_rate_limit = "503" in err_msg or "429" in err_msg or "high demand" in err_msg.lower()

                    if is_rate_limit and attempt < max_retries:
                        sleep_time = attempt * 2
                        print(f"⏳ [محاولة {attempt}/{max_retries} بالنموذج {model_name}]: انتظار {sleep_time} ثوان...")
                        time.sleep(sleep_time)
                    else:
                        print(f"⚠️ تعثر الاستدعاء عبر '{model_name}': {err_msg[:70]}. جاري التبديل للنموذج التالي...")
                        break

        raise RuntimeError(f"فشلت كافة المحاولات عبر النماذج المتاحة: {last_error}")

    def analyze_batch(
        self,
        posts: List[Dict[str, Any]],
        output_file: Optional[str] = None,
        delay_between_calls: float = 0.4,
        skip_non_real_estate: bool = False,
        resume: bool = False
    ) -> List[Dict[str, Any]]:
        """
        تحليل حزمة كاملة من المنشورات تباعاً مع دعم الاستئناف الذكي والحفظ اللحظي.
        """
        total = len(posts)
        print(f"\n🧠 [بدء التحليل الذكي]: إجمالي المنشورات المطلوب فحصها: {total} منشور (النموذج: {self.preferred_model})...")

        # تجهيز خريطة المنشورات المحللة مسبقاً إذا تم تفعيل --resume
        existing_analyzed: Dict[str, Dict[str, Any]] = {}
        if resume and output_file and os.path.exists(output_file):
            try:
                with open(output_file, "r", encoding="utf-8") as rf:
                    loaded = json.load(rf)
                    if isinstance(loaded, list):
                        for p in loaded:
                            pid = str(p.get("id", ""))
                            # إذا كان المنشور محللاً بنجاح وبدون أخطاء
                            if pid and p.get("ai_analysis") is not None and not p.get("analysis_error"):
                                existing_analyzed[pid] = p
                print(f"♻️ [استئناف التحليل]: تم العثور على {len(existing_analyzed)} منشور محلل مسبقاً في '{output_file}'.")
            except Exception as e:
                print(f"⚠️ تعذر قراءة ملف الاستئناف السابق: {e}")

        enriched_posts: List[Dict[str, Any]] = []
        success_count = 0
        failed_count = 0
        skipped_non_re_count = 0

        for idx, post in enumerate(posts, start=1):
            post_id = str(post.get("id", f"P_{idx}"))
            raw_text = post.get("raw_text", "")

            # فحص الاستئناف
            if resume and post_id in existing_analyzed:
                cached_post = existing_analyzed[post_id]
                post["ai_analysis"] = cached_post.get("ai_analysis")
                post.pop("analysis_error", None)

                if skip_non_real_estate and post["ai_analysis"] and not post["ai_analysis"].get("is_real_estate", False):
                    skipped_non_re_count += 1
                    continue

                enriched_posts.append(post)
                success_count += 1
                print(f"[{idx}/{total}] ⚡ تم استعادة تحليل المنشور ({post_id}) من الملف المحفوظ مسبقاً.")
                continue

            print(f"[{idx}/{total}] جاري استخراج البيانات الدلالية للمنشور ({post_id})...")

            try:
                analysis = self.analyze_single_post(raw_text)
                post["ai_analysis"] = analysis
                post.pop("analysis_error", None)
                success_count += 1

                print(f"   ✨ العقار: {analysis.get('property_type')} | "
                      f"المعلن: {analysis.get('advertiser_type')} | "
                      f"السعر: {analysis.get('price')} | "
                      f"الموقع: {analysis.get('location')}")

                if skip_non_real_estate and not analysis.get("is_real_estate", False):
                    print(f"   ⏩ استبعاد المنشور {post_id}: إعلان غير عقاري (--skip-non-real-estate).")
                    skipped_non_re_count += 1
                    continue

            except Exception as err:
                failed_count += 1
                err_str = str(err)
                print(f"   ❌ فشل تحليل المنشور {post_id}: {err_str[:80]}")
                # التوثيق الصارم: وضع analysis_error وعدم تزييف is_real_estate
                post["ai_analysis"] = None
                post["analysis_error"] = err_str

            enriched_posts.append(post)

            # الحفظ اللحظي التراكمي (Incremental Write)
            if output_file:
                try:
                    with open(output_file, "w", encoding="utf-8") as f:
                        json.dump(enriched_posts, f, ensure_ascii=False, indent=2)
                except Exception as save_err:
                    print(f"⚠️ فشل الحفظ اللحظي: {save_err}")

            if delay_between_calls > 0 and idx < total:
                time.sleep(delay_between_calls)

        print(f"\n🎉 [اكتمل التحليل]: الإجمالي: {len(enriched_posts)} | نجاح: {success_count} | فشل: {failed_count} | مستبعد لعدم كونه عقاراً: {skipped_non_re_count}\n")
        return enriched_posts


# =============================================================================
# 4. نقطة الدخول واختبار السكربت المباشر (CLI Execution)
# =============================================================================

def main():
    parser = argparse.ArgumentParser(
        description="Gemini Real Estate Structured Intelligence Service"
    )
    parser.add_argument(
        "--input-json",
        type=str,
        default="scraped_filtered_leads.json",
        help="مسار ملف JSON للمنشورات المستخرجة والمفلترة بالهواتف"
    )
    parser.add_argument(
        "--output-json",
        type=str,
        default="analyzed_real_estate_leads.json",
        help="مسار ملف JSON لحفظ النتائج بعد التحليل الذكي"
    )
    parser.add_argument(
        "--model",
        type=str,
        default=PRIMARY_MODEL,
        help=f"اسم نموذج Gemini المستهدف (الافتراضي: {PRIMARY_MODEL})"
    )
    parser.add_argument(
        "--skip-non-real-estate",
        action="store_true",
        help="تخطي وحذف الإعلانات التي تم تصنيفها كإعلانات غير عقارية من ملف المخرجات"
    )
    parser.add_argument(
        "--resume",
        action="store_true",
        help="استئناف التحليل وقراءة المنشورات المحللة بالفعل من ملف المخرجات لتفادي تكرار الاستدعاءات"
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
                f"💡 إذا كنت ترغب في تشغيل تجربة نموذجية لاختبار الكود، يرجى تمرير الخيار: --demo\n"
                f"مثال: python gemini_real_estate_service.py --demo"
            )
            sys.exit(1)

        print(f"ℹ️ تم تفعيل الخيار التجريبي (--demo). جاري إنشاء نصوص نموذجية لاختبار الخدمة...")
        posts_to_process = [
            {
                "id": "sample_owner_01",
                "raw_text": (
                    "للبيع من المالك مباشرة بدون وسيط شقة 175م بالتجمع الخامس حي الأندلس 2، "
                    "3 غرف و2 حمام تشطيب ألترا سوبر لوكس لم تسكن، السعر المطلوب 3,450,000 ج.م كاش لسرعة السفر. "
                    "تواصل فون وواتساب مع المالك: 01012345678"
                )
            },
            {
                "id": "sample_broker_02",
                "raw_text": (
                    "فرصة استثمارية لقطة! لدينا محل تجاري للإيجار بالشيخ زايد على المحور مباشرة، "
                    "مساحة 85م واجهة زجاجية، الإيجار الشهري 60 ألف جنيه، عمولة المكتب شهر. كود الإعلان 991. "
                    "تواصل مع شركة ريل استيت إيجيبت: 01222334455"
                )
            },
            {
                "id": "sample_spam_03",
                "raw_text": (
                    "مطلوب شباب للعمل دليفري وسائقين برخصة خاصة في شركة شحن كبرى بالهرم، "
                    "راتب 7000 جنيه، تواصل واتساب: 01155443322"
                )
            }
        ]
    else:
        with open(args.input_json, "r", encoding="utf-8") as f:
            posts_to_process = json.load(f)

    # تشغيل خدمة التحليل
    try:
        analyzer = GeminiRealEstateAnalyzer(preferred_model=args.model)
        analyzed_results = analyzer.analyze_batch(
            posts=posts_to_process,
            output_file=args.output_json,
            delay_between_calls=0.4,
            skip_non_real_estate=args.skip_non_real_estate,
            resume=args.resume
        )

        print(f"💾 [تم الحفظ بنجاح]: تم حفظ جميع النتائج ({len(analyzed_results)} سجل) في: {args.output_json}")

    except Exception as e:
        print(f"❌ حدث خطأ أثناء تشغيل خدمة التحليل: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
