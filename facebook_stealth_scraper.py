#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
=============================================================================
سكربت أتمتة متقدم لسحب وتصفية إعلانات عقارات فيسبوك (Facebook Stealth Scraper)
=============================================================================
المؤلف: مهندس أنظمة وبرمجيات الأتمتة (Automation & Backend Engineer)
الميزات التقنية:
1. متصفح Chromium فائق التخفي وحجب مؤشرات الأتمتة (navigator.webdriver bypass).
2. إدارة وحفظ جلسات العمل والكوكيز (fb_cookies.json) مع انتظار مرن حتى إتمام الدخول (حد أقصى 5 دقائق).
3. دعم حفظ ملفات تعريف الارتباط وجلسة المتصفح الدائمة عبر --user-data-dir.
4. تمرير ذكي (Smart Infinite Scroll) بفواصل بشرية عشوائية وتوسيع إعلانات (See more).
5. استخراج حصري من div[role='article'] العلوي واستبعاد مقالات التعليقات المتداخلة واستخلاص نص الجسم دون التعليقات.
6. استخراج رابط المنشور (post_url) واسم الكاتب (author_name) ووقت النشر (post_time).
7. منع التكرار بين الجلسات عبر seen_posts.json ودعم الحفظ التزايدي مع --resume.
8. محرك تعبيري (Regex) دقيق بحدود رقمية (?<!\\d) و (?!\\d) للأرقام المصرية (010, 011, 012, 015) مع توحيد الأرقام المشرقية (٠-٩).
9. التعرف الآلي على مشغل الشبكة وتوليد روابط واتساب للمراسلة بنقرة واحدة (Click-to-Chat).
10. تصفية صارمة: استبعاد أي منشور لا يحتوي على هاتف فورياً لتوفير التكاليف وموارد المعالجة.
=============================================================================
"""

import argparse
import asyncio
import datetime
import hashlib
import json
import os
import random
import re
import sys
import time
from typing import List, Dict, Any, Optional, Set

try:
    from playwright.async_api import async_playwright, Page, BrowserContext, ElementHandle
except ImportError:
    async_playwright = None
    Page = None
    BrowserContext = None
    ElementHandle = None

# =============================================================================
# 1. محرك الـ Regex المتقدم وتوحيد الأرقام المصرية (مع الحدود الرقمية)
# =============================================================================

ARABIC_INDIC_DIGITS = {
    '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
    '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
    '۴': '4', '۵': '5', '۶': '6'
}

CARRIERS_MAP = {
    "010": "فودافون (Vodafone Egypt)",
    "011": "اتصالات (e& Egypt)",
    "012": "أورنج (Orange Egypt)",
    "015": "وي (WE - Telecom Egypt)"
}

def normalize_arabic_digits(text: str) -> str:
    """تحويل الأرقام العربية المشرقية (٠-٩) إلى أرقام لاتينية قياسية (0-9)."""
    if not text:
        return ""
    for ar_digit, en_digit in ARABIC_INDIC_DIGITS.items():
        text = text.replace(ar_digit, en_digit)
    return text

PHONE_PATTERN = re.compile(
    r'(?<!\d)(?:(?:\+|00)?20[\s.-]?0?1[0125]|01[0125])(?:[\s.-]?\d){8}(?!\d)'
)

def extract_egyptian_phones(raw_text: str) -> List[Dict[str, str]]:
    """
    استخراج وتصنيف كافة أرقام الهواتف المصرية بدقة مع الحدود الرقمية.
    """
    if not raw_text:
        return []

    clean_text = normalize_arabic_digits(raw_text)
    matches = PHONE_PATTERN.finditer(clean_text)
    extracted_phones = []
    seen_local_numbers = set()

    for match in matches:
        full_match_str = match.group(0)
        digits_only = re.sub(r'\D', '', full_match_str)

        local_num = None
        if digits_only.startswith("20") and len(digits_only) == 12:
            local_num = "0" + digits_only[2:]
        elif digits_only.startswith("01") and len(digits_only) == 11:
            local_num = digits_only
        elif digits_only.startswith("0020") and len(digits_only) == 14:
            local_num = "0" + digits_only[4:]

        if local_num and len(local_num) == 11 and local_num not in seen_local_numbers:
            prefix = local_num[:3]
            if prefix in CARRIERS_MAP:
                seen_local_numbers.add(local_num)
                carrier = CARRIERS_MAP[prefix]
                intl_format = f"+2{local_num}"
                whatsapp_url = f"https://wa.me/2{local_num}"

                extracted_phones.append({
                    "raw_match": full_match_str.strip(),
                    "local": local_num,
                    "international": intl_format,
                    "carrier": carrier,
                    "whatsapp_url": whatsapp_url
                })

    return extracted_phones

# =============================================================================
# 2. إعدادات التخفي الحديثة ومحاكاة المتصفح (Stealth Context)
# =============================================================================

STEALTH_JS = """
Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
window.chrome = { runtime: {}, loadTimes: function() {}, csi: function() {}, app: {} };
Object.defineProperty(navigator, 'languages', { get: () => ['ar-EG', 'ar', 'en-US', 'en'] });
Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
"""

MODERN_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"

async def create_stealth_context(
    playwright,
    cookies_path: str,
    headed: bool = True,
    proxy_url: Optional[str] = None,
    user_data_dir: Optional[str] = None
) -> BrowserContext:
    """تهيئة متصفح Chromium متخفي مع إزالة إشارات الأتمتة ودعم البروكسي وحفظ بيانات المستخدم."""
    launch_kwargs: Dict[str, Any] = {
        "headless": not headed,
        "args": [
            "--disable-blink-features=AutomationControlled",
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-infobars",
            "--window-position=0,0",
            "--disable-dev-shm-usage"
        ]
    }

    if proxy_url:
        launch_kwargs["proxy"] = {"server": proxy_url}

    if user_data_dir:
        launch_kwargs["user_agent"] = MODERN_USER_AGENT
        launch_kwargs["viewport"] = {"width": 1366, "height": 768}
        launch_kwargs["locale"] = "ar-EG"
        launch_kwargs["timezone_id"] = "Africa/Cairo"
        launch_kwargs["color_scheme"] = "light"
        
        context = await playwright.chromium.launch_persistent_context(user_data_dir, **launch_kwargs)
    else:
        browser = await playwright.chromium.launch(**launch_kwargs)
        context = await browser.new_context(
            user_agent=MODERN_USER_AGENT,
            viewport={"width": 1366, "height": 768},
            locale="ar-EG",
            timezone_id="Africa/Cairo",
            color_scheme="light"
        )

    await context.add_init_script(STEALTH_JS)

    if not user_data_dir and os.path.exists(cookies_path):
        try:
            with open(cookies_path, "r", encoding="utf-8") as f:
                cookies = json.load(f)
                await context.add_cookies(cookies)
                print(f"🍪 [الكوكيز]: تم استرجاع {len(cookies)} ملف تعريف ارتباط من '{cookies_path}'.")
        except Exception as e:
            print(f"⚠️ [تحذير الكوكيز]: {e}")

    return context

async def save_cookies(context: BrowserContext, cookies_path: str):
    try:
        cookies = await context.cookies()
        with open(cookies_path, "w", encoding="utf-8") as f:
            json.dump(cookies, f, ensure_ascii=False, indent=2)
        print(f"💾 [حفظ الجلسة]: تم حفظ الكوكيز بنجاح في '{cookies_path}'.")
    except Exception as e:
        print(f"⚠️ [خطأ حفظ الجلسة]: {e}")

# =============================================================================
# 3. محرك التمرير الذكي وكشف النصوص الكاملة
# =============================================================================

async def expand_see_more_in_viewport(page: Page) -> int:
    see_more_selectors = [
        "div[role='button']:has-text('عرض المزيد')",
        "div[role='button']:has-text('See more')",
        "div[role='button']:has-text('See More')",
        "span:has-text('... المزيد')",
        "span:has-text('... More')"
    ]
    expanded_count = 0
    for selector in see_more_selectors:
        try:
            buttons = await page.query_selector_all(selector)
            for btn in buttons[:5]:
                if await btn.is_visible():
                    try:
                        await btn.click(timeout=800)
                        expanded_count += 1
                        await asyncio.sleep(random.uniform(0.2, 0.4))
                    except Exception:
                        pass
        except Exception:
            continue
    return expanded_count

async def human_like_scroll(page: Page):
    scroll_distance = random.randint(550, 950)
    await page.evaluate(f"window.scrollBy(0, {scroll_distance});")
    if random.random() < 0.35:
        await asyncio.sleep(random.uniform(0.3, 0.6))
        jitter = random.randint(-80, -20)
        await page.evaluate(f"window.scrollBy(0, {jitter});")
    await asyncio.sleep(random.uniform(1.8, 3.5))

# =============================================================================
# 4. استخراج مقالات المنشورات العلوية وتفاصيل الكاتب والرابط
# =============================================================================

async def extract_article_details(article: ElementHandle) -> Optional[Dict[str, Any]]:
    try:
        is_nested = await article.evaluate("""
            (node) => {
                let p = node.parentElement;
                while (p) {
                    if (p.getAttribute && p.getAttribute('role') === 'article') return true;
                    p = p.parentElement;
                }
                return false;
            }
        """)
        if is_nested:
            return None

        body_text = await article.evaluate("""
            (node) => {
                const msgEl = node.querySelector('div[data-ad-comet-preview="message"], div[data-ad-preview="message"]');
                if (msgEl) {
                    return msgEl.innerText.trim();
                }
                const clone = node.cloneNode(true);
                const comments = clone.querySelectorAll('ul, form, div[aria-label*="تعليق"], div[aria-label*="Comment"], div[role="group"]');
                comments.forEach(c => c.remove());
                return clone.innerText.trim();
            }
        """)

        if not body_text or len(body_text) < 35:
            return None

        post_url = await article.evaluate("""
            (node) => {
                const links = Array.from(node.querySelectorAll('a[href*="/posts/"], a[href*="/permalink/"], a[role="link"][href*="facebook.com"]'));
                for (const l of links) {
                    const href = l.getAttribute('href');
                    if (href && (href.includes('/posts/') || href.includes('/permalink/'))) {
                        return href.split('?')[0];
                    }
                }
                return '';
            }
        """)

        meta_info = await article.evaluate("""
            (node) => {
                let author = '';
                let postTime = '';

                const authorEl = node.querySelector('h2 a, h3 a, h4 a, strong a');
                if (authorEl) {
                    author = authorEl.innerText.trim();
                }

                const timeEl = node.querySelector('abbr, a[href*="/posts/"] span, a[href*="/permalink/"] span');
                if (timeEl) {
                    postTime = timeEl.innerText.trim();
                }

                return { author, postTime };
            }
        """)

        return {
            "body_text": body_text,
            "post_url": post_url or "",
            "author_name": meta_info.get("author") or "غير محدد",
            "post_time": meta_info.get("postTime") or ""
        }
    except Exception:
        return None

# =============================================================================
# 5. دالة السحب والتصفية مع الحفظ التزايدي والاستئناف
# =============================================================================

SEEN_POSTS_FILE = "seen_posts.json"

def load_seen_posts() -> Set[str]:
    if os.path.exists(SEEN_POSTS_FILE):
        try:
            with open(SEEN_POSTS_FILE, "r", encoding="utf-8") as f:
                return set(json.load(f))
        except Exception:
            return set()
    return set()

def save_seen_posts(seen_set: Set[str]):
    try:
        with open(SEEN_POSTS_FILE, "w", encoding="utf-8") as f:
            json.dump(list(seen_set), f, ensure_ascii=False, indent=2)
    except Exception:
        pass

async def scrape_facebook_group_with_phones(
    group_url: str,
    max_qualified_posts: int = 20,
    cookies_path: str = "fb_cookies.json",
    headed: bool = True,
    output_file: str = "scraped_filtered_leads.json",
    resume: bool = False,
    proxy_url: Optional[str] = None,
    user_data_dir: Optional[str] = None
) -> List[Dict[str, Any]]:
    print("\n" + "=" * 75)
    print("🚀 تشغيل محرك سحب وتصفية عقارات فيسبوك (Facebook Stealth Scraper)")
    print("=" * 75)
    print(f"🔗 رابط المجموعة: {group_url}")
    print(f"🎯 الهدف: استخراج {max_qualified_posts} إعلان يحتوي على هاتف مصري صالح")
    print(f"👁️ وضع المتصفح: {'مرئي (Headed)' if headed else 'خفي (Headless)'}")
    print(f"⏯️ وضع الاستئناف (Resume): {'مفعل' if resume else 'معطل'}")
    if user_data_dir:
        print(f"📁 مسار الجلسة الدائمة: {user_data_dir}")
    if proxy_url:
        print(f"🛡️ البروكسي: {proxy_url}")
    print("-" * 75)

    seen_posts = load_seen_posts()
    qualified_posts: List[Dict[str, Any]] = []

    if resume and os.path.exists(output_file):
        try:
            with open(output_file, "r", encoding="utf-8") as f:
                qualified_posts = json.load(f)
                print(f"📂 [الاستئناف]: تم تحميل {len(qualified_posts)} منشور سابق من '{output_file}'.")
                for p in qualified_posts:
                    if p.get("post_url"):
                        seen_posts.add(p["post_url"])
                    if p.get("raw_text"):
                        seen_posts.add(hashlib.md5(p["raw_text"].encode('utf-8')).hexdigest())
        except Exception as e:
            print(f"⚠️ تعذر قراءة ملف الاستئناف: {e}")

    total_scanned = 0
    skipped_no_phone = 0

    if not async_playwright:
        print("❌ خطأ: مكتبة Playwright غير مثبتة في البيئة! قم بتشغيل: pip install playwright && playwright install chromium")
        return qualified_posts

    async with async_playwright() as playwright:
        context = await create_stealth_context(
            playwright,
            cookies_path=cookies_path,
            headed=headed,
            proxy_url=proxy_url,
            user_data_dir=user_data_dir
        )
        page = await context.new_page()

        try:
            print("🌐 جاري فتح صفحة فيسبوك والتحقق من الجلسة...")
            await page.goto(group_url, wait_until="domcontentloaded", timeout=60000)

            try:
                await page.wait_for_selector("div[role='feed']", timeout=15000)
            except Exception:
                pass

            await asyncio.sleep(random.uniform(2.5, 4.0))

            is_login_page = False
            try:
                is_login_page = "login" in page.url or (await page.query_selector("input[name='email']") is not None)
            except Exception:
                is_login_page = True

            if is_login_page:
                if not headed:
                    print("❌ خطأ: يطلب فيسبوك تسجيل الدخول! شغّل الأمر مع خيار --headed لأول مرة لتسجيل الدخول وحفظ الكوكيز.")
                    return qualified_posts

                print("\n" + "!" * 75)
                print("🔑 [مطلوب تسجيل الدخول]: ظهرت شاشة الدخول في المتصفح.")
                print("⏳ بانتظار إتمامك لتسجيل الدخول والتحقق بخطوتين (مهلة قصوى 5 دقائق)...")
                print("!" * 75 + "\n")

                login_start = time.time()
                while time.time() - login_start < 300:
                    try:
                        still_login = "login" in page.url or (await page.query_selector("input[name='email']") is not None)
                    except Exception:
                        still_login = False

                    if not still_login:
                        print("✅ تم اكتشاف إتمام تسجيل الدخول بنجاح!")
                        await asyncio.sleep(5)
                        print("🔄 جاري الانتقال إلى صفحة المجموعة المستهدفة...")
                        await page.goto(group_url, wait_until="domcontentloaded", timeout=60000)
                        await asyncio.sleep(3)
                        break
                    await asyncio.sleep(2.5)

                if not user_data_dir:
                    await save_cookies(context, cookies_path)

            scroll_attempts = 0
            max_scrolls = max_qualified_posts * 6

            while len(qualified_posts) < max_qualified_posts and scroll_attempts < max_scrolls:
                await expand_see_more_in_viewport(page)
                articles = await page.query_selector_all("div[role='article']")

                for art in articles:
                    details = await extract_article_details(art)
                    if not details:
                        continue

                    body_text = details["body_text"]
                    post_url = details["post_url"]

                    text_hash = hashlib.md5(body_text.encode('utf-8')).hexdigest()
                    identifier = post_url if post_url else text_hash

                    if identifier in seen_posts or text_hash in seen_posts:
                        continue

                    seen_posts.add(identifier)
                    seen_posts.add(text_hash)
                    total_scanned += 1

                    phones = extract_egyptian_phones(body_text)

                    if not phones:
                        skipped_no_phone += 1
                        continue

                    primary_phone = phones[0]
                    lead_record = {
                        "id": f"lead_{len(qualified_posts) + 1:03d}",
                        "scraped_at": datetime.datetime.now().isoformat(),
                        "source_group": group_url,
                        "post_url": post_url,
                        "author_name": details["author_name"],
                        "post_time": details["post_time"],
                        "primary_phone": primary_phone["local"],
                        "primary_carrier": primary_phone["carrier"],
                        "whatsapp_chat_url": primary_phone["whatsapp_url"],
                        "all_phones": phones,
                        "phone_count": len(phones),
                        "raw_text": body_text
                    }

                    qualified_posts.append(lead_record)

                    with open(output_file, "w", encoding="utf-8") as f:
                        json.dump(qualified_posts, f, ensure_ascii=False, indent=2)
                    save_seen_posts(seen_posts)

                    print(f"✅ [فرصة #{len(qualified_posts):02d}/{max_qualified_posts}]: "
                          f"هاتف: {primary_phone['local']} ({primary_phone['carrier']}) | "
                          f"الكاتب: {details['author_name']} | "
                          f"{body_text[:45].replace(chr(10), ' ')}...")

                    if len(qualified_posts) >= max_qualified_posts:
                        break

                await human_like_scroll(page)
                scroll_attempts += 1

                if scroll_attempts % 8 == 0 and not user_data_dir:
                    await save_cookies(context, cookies_path)

            print("\n" + "=" * 75)
            print("📊 إحصائيات خط السحب والتنقية:")
            print(f"📥 إجمالي المنشورات التي تم فحصها: {total_scanned}")
            print(f"🗑️ منشورات مستبعدة لعدم احتوائها على هاتف: {skipped_no_phone}")
            print(f"🎯 منشورات مؤهلة تم استخراجها وتصنيف هواتفها: {len(qualified_posts)}")
            print("=" * 75)

            with open(output_file, "w", encoding="utf-8") as f:
                json.dump(qualified_posts, f, ensure_ascii=False, indent=2)
            save_seen_posts(seen_posts)

            print(f"💾 تم حفظ البيانات المفلترة بنجاح في: {output_file}")
            return qualified_posts

        finally:
            await context.close()

# =============================================================================
# 6. سطر الأوامر (CLI Entry Point)
# =============================================================================

def main():
    parser = argparse.ArgumentParser(description="Facebook Real Estate Stealth Scraper & Phone Extractor")
    parser.add_argument("--group-url", type=str, default="https://www.facebook.com/groups/realestatecairoegypt", help="رابط مجموعة فيسبوك")
    parser.add_argument("--max-posts", type=int, default=20, help="عدد المنشورات المؤهلة المطلوبة")
    parser.add_argument("--cookies-file", type=str, default="fb_cookies.json", help="ملف حفظ الكوكيز")
    parser.add_argument("--headed", action="store_true", default=True, help="تشغيل المتصفح في وضع مرئي (مطلوب لأول مرة)")
    parser.add_argument("--headless", dest="headed", action="store_false", help="تشغيل المتصفح في وضع خفي بعد حفظ الكوكيز")
    parser.add_argument("--output", type=str, default="scraped_filtered_leads.json", help="ملف JSON الناتج")
    parser.add_argument("--resume", action="store_true", default=False, help="استئناف السحب من الملف السابق دون تكرار")
    parser.add_argument("--proxy", type=str, default=None, help="عنوان البروكسي اختياري (مثل http://host:port)")
    parser.add_argument("--user-data-dir", type=str, default=None, help="مسار مجلد حفظ بيانات المتصفح وجلسة الدخول الدائمة")

    args = parser.parse_args()

    if not async_playwright:
        print("❌ خطأ: مكتبة Playwright غير مثبتة! نفذ الأمر: pip install playwright && playwright install chromium")
        sys.exit(1)

    asyncio.run(
        scrape_facebook_group_with_phones(
            group_url=args.group_url,
            max_qualified_posts=args.max_posts,
            cookies_path=args.cookies_file,
            headed=args.headed,
            output_file=args.output,
            resume=args.resume,
            proxy_url=args.proxy,
            user_data_dir=args.user_data_dir
        )
    )

if __name__ == "__main__":
    main()