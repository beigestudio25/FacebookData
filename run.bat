@echo off
setlocal enabledelayedexpansion

:: 1. تأكيد العمل في مجلد المشروع الحالي
cd /d "%~dp0"
title Facebook Real Estate AI Scraper

echo ========================================================
echo   Facebook Real Estate AI Scraper - Local Launcher
echo   مشغل نظام استخراج وتحليل عقارات فيسبوك
echo ========================================================
echo.

:: 2. التحقق من Node.js في المسارات الشائعة في حال لم يكن في الـ PATH
where node >nul 2>nul
if %errorlevel% equ 0 goto NODE_FOUND

if exist "C:\Program Files\nodejs\node.exe" (
    set "PATH=C:\Program Files\nodejs;%PATH%"
    goto NODE_FOUND
)
if exist "C:\Program Files (x86)\nodejs\node.exe" (
    set "PATH=C:\Program Files (x86)\nodejs;%PATH%"
    goto NODE_FOUND
)
if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" (
    set "PATH=%LOCALAPPDATA%\Programs\nodejs;%PATH%"
    goto NODE_FOUND
)

:NODE_NOT_FOUND
echo [ERROR / خطأ]
echo Node.js is NOT installed or not detected!
echo لم يتم العثور على برنامج Node.js على جهازك!
echo.
echo Please follow these 2 simple steps:
echo 1. Download and install Node.js (LTS version) from:
echo    https://nodejs.org
echo 2. If you just installed it, RESTART your computer or close and reopen this file.
echo.
pause
exit /b 1

:NODE_FOUND
echo [OK] Node.js is detected:
node -v
echo.

:: 3. التحقق من ملف .env
if exist ".env" goto CHECK_PACKAGES

echo [SETUP] Creating .env file from .env.example...
if exist ".env.example" (
    copy /y ".env.example" ".env" >nul
) else (
    echo GEMINI_API_KEY=MY_GEMINI_API_KEY > ".env"
    echo PORT=3000 >> ".env"
)
echo .env file created!
echo.

:CHECK_PACKAGES
:: 4. تثبيت المكتبات إذا لم تكن موجودة
if exist "node_modules" goto LAUNCH_SERVER

echo [INSTALL] Installing packages (this runs once and takes 1-2 minutes)...
echo جاري تحميل وتثبيت المكتبات لأول مرة... يرجى الانتظار
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] npm install failed. Please check your internet connection.
    pause
    exit /b 1
)

:LAUNCH_SERVER
echo.
echo ========================================================
echo   Server is starting on: http://localhost:3000
echo   جاري فتح المتصفح وتشغيل الخادم...
echo ========================================================
echo.

:: فتح المتصفح
start http://localhost:3000

:: تشغيل الخادم
call npm run dev

if %errorlevel% neq 0 (
    echo.
    echo [NOTE] Server stopped or encountered an error.
    pause
)
