#!/bin/bash

echo "========================================================"
echo "  🚀 مشغل نظام سحب وتحليل عقارات فيسبوك (Mac/Linux)"
echo "========================================================"
echo ""

# 1. التحقق من وجود Node.js
if ! command -v node &> /dev/null; then
    echo "❌ [خطأ] برنامج Node.js غير مثبت على جهازك!"
    echo "يرجى تحميله وتثبيته أولاً مجاناً من: https://nodejs.org"
    exit 1
fi

# 2. التحقق من ملف .env
if [ ! -f ".env" ]; then
    echo "⚠️ [تنبيه] جار إنشاء ملف الإعدادات .env..."
    cp .env.example .env 2>/dev/null || touch .env
    echo ""
    echo "يرجى وضع مفتاح Gemini API المجاني الخاص بك."
    echo "يمكنك جلبه مجاناً من: https://aistudio.google.com/app/apikey"
    read -p "أدخل مفتاح Gemini API هنا: " USER_KEY
    if [ ! -z "$USER_KEY" ]; then
        echo "GEMINI_API_KEY=$USER_KEY" > .env
        echo "PORT=3000" >> .env
        echo "✅ تم حفظ المفتاح بنجاح!"
    fi
fi

# 3. تثبيت الحزم إذا لم تكن موجودة
if [ ! -d "node_modules" ]; then
    echo "📦 [تحميل] جار تثبيت متطلبات البرنامج لأول مرة..."
    npm install
fi

echo ""
echo "========================================================"
echo "  ✅ جاري تشغيل الخادم على الرابط: http://localhost:3000"
echo "========================================================"
echo ""

# 4. فتح المتصفح إن أمكن
if command -v open &> /dev/null; then
    open "http://localhost:3000"
elif command -v xdg-open &> /dev/null; then
    xdg-open "http://localhost:3000"
fi

# 5. تشغيل السيرفر
npm run dev
