# محرك استخراج وتحليل بيانات عقارات فيسبوك الذكي
## Facebook Real Estate Scraper & AI Analyzer

نظام أتمتة وتحليل متقدم لسحب إعلانات مجموعات فيسبوك العقارية، تنقية وفلترة أرقام الهواتف المصرية (فودافون، اتصالات، أورنج، وي)، التحليل الدلالي بـ Gemini API، والتصدير إلى جداول بيانات مخصصة لفرق المبيعات والـ CRM (Excel & CSV).

---

### 🟢 طريقة التشغيل السريعة والسهلة (بدون أي خبرة برمجية)

إذا كنت لا تفهم في البرمجة وتريد تشغيل البرنامج بضغطة زر:

1. **حمّل وثبّت برنامج Node.js**:
   - من الموقع الرسمي: [https://nodejs.org](https://nodejs.org) (اختر النسخة المستقرة LTS واضغط Next حتى الانتهاء).
2. **ضع مفتاح الذكاء الاصطناعي المجاني**:
   - احصل على مفتاح Gemini مجاناً من: [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey).
   - افتح ملف `.env` (أو أنشئه) واكتب داخله:
     ```env
     GEMINI_API_KEY="ضع_مفتاحك_هنا"
     ```
3. **شغّل البرنامج**:
   - **مستخدمي ويندوز (Windows)**: اضغط مرتين على ملف **`run.bat`**.
   - **مستخدمي ماك ولينكس (Mac/Linux)**: افتح الطرفية ونفذ `./start.sh` أو `bash start.sh`.
   - سيفتح المتصفح تلقائياً على: `http://localhost:3000` وستظهر لك الأداة كاملة بأيقونة فيسبوك للسحب المباشر!

---

### للمطورين والمتخصصين (Prerequisites & Advanced)

#### 1. بيئة بايثون (Python 3.10+)
قم بتثبيت حزم بايثون المطلوبة وتثبيت محرك Chromium الخاص بـ Playwright:

```bash
# تثبيت الحزم المطلوبة
pip install -r requirements.txt

# تثبيت متصفح Chromium المخصص لـ Playwright
playwright install chromium
```

#### 2. بيئة نود والواجهة التفاعلية (Node.js & Vite)
```bash
# تثبيت الاعتماديات
npm install

# تشغيل خادم التطوير
npm run dev

# أو تشغيل الإنتاج
npm run build
npm start
```

---

### إعداد المتغيرات البيئية (.env)

أنشئ ملف `.env` أو `.env.local` في جذر المشروع وأضف المفاتيح التالية:

```env
# مفتاح Gemini API (إلزامي للتحليل)
GEMINI_API_KEY="AIzaSy..."

# المنفذ اختياري (الافتراضي 3000)
PORT=3000

# مفتاح أمان اختياري لتقييد الـ API routes (x-api-key)
APP_ACCESS_KEY=""
```

*ملاحظة: يتحقق الخادم `server.ts` عند الإقلاع من توفر `GEMINI_API_KEY`؛ في حال غيابه سيطبع تنبيهاً واضحاً ويتوقف عن العمل لحين إضافته.*

---

### تشغيل خط الأتمتة الكامل عبر بايثون

```bash
python run_pipeline.py --group-url "https://www.facebook.com/groups/realestatecairoegypt" --max-posts 20 --headless
```
