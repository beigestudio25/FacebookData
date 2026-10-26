#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const filesToSync = [
  {
    id: 'requirements',
    filename: 'requirements.txt',
    filePath: path.join(rootDir, 'requirements.txt'),
    title: 'المكتبات المطلوبة وحزم بايثون',
    stageName: 'المرحلة 1: البيئة',
    description: 'ملف التبعات الخاص ببيئة بايثون الافتراضية، يتضمن الحزمة الرسمية google-genai ومكتبات التحليل والجدولة والأتمتة.',
  },
  {
    id: 'stage1',
    filename: 'facebook_stealth_scraper.py',
    filePath: path.join(rootDir, 'facebook_stealth_scraper.py'),
    title: 'سكربت الأتمتة المتقدم والتخفي وفلترة الهواتف (Playwright Stealth)',
    stageName: 'المرحلة 1 و 2 المتكاملة',
    description: 'سكربت أتمتة متقدم: متصفح Chromium مع التخفي، وإدارة الكوكيز fb_cookies.json، وتوسيع See more، والـ Regex الموثوق للهواتف المصرية، وتتبع seen_posts.json.',
  },
  {
    id: 'stage3',
    filename: 'gemini_real_estate_service.py',
    filePath: path.join(rootDir, 'gemini_real_estate_service.py'),
    title: 'خدمة التحليل الذكي المهيكل (Gemini 3.1 Flash Lite Service)',
    stageName: 'المرحلة 3: خدمة الذكاء الاصطناعي',
    description: 'استخدام حزمة google-genai الرسمية ونموذج gemini-3.1-flash-lite مع تقييد درجة الحرارة على 0.1، ومخطط response_schema صارم، وحفظ أخطاء التحليل في analysis_error دون تزييف is_real_estate.',
  },
  {
    id: 'stage4',
    filename: 'real_estate_exporter.py',
    filePath: path.join(rootDir, 'real_estate_exporter.py'),
    title: 'وحدة التصدير لـ Excel المنسق و CSV مع روابط واتساب',
    stageName: 'المرحلة 4: تصدير CRM',
    description: 'توليد ملف Excel RTL احترافي مع تلوين المالك المباشر بالأخضر الهادئ، وتوليد روابط واتساب Click-to-Chat، وعزل المنشورات المتعثرة في ورقة عمل مستقلة، وتصدير CSV بترميز utf-8-sig.',
  },
  {
    id: 'pipeline',
    filename: 'run_pipeline.py',
    filePath: path.join(rootDir, 'run_pipeline.py'),
    title: 'المنسق الشامل لتشغيل خط الأتمتة بالكامل (Master Pipeline Orchestrator)',
    stageName: 'التشغيل الشامل (Full Pipeline)',
    description: 'سكربت تنفيذي موحد يربط الكشط، الفلترة، استدعاء Gemini 3.1 Flash Lite، والتصدير لـ Excel/CSV مع إحصائيات ختامية دقيقة.',
  },
];

const snippets = filesToSync.map((item) => {
  let content = '';
  if (fs.existsSync(item.filePath)) {
    content = fs.readFileSync(item.filePath, 'utf-8');
  } else {
    console.warn(`File not found: ${item.filePath}`);
  }
  return {
    id: item.id,
    filename: item.filename,
    title: item.title,
    stageName: item.stageName,
    description: item.description,
    code: content,
  };
});

const tsContent = `export interface PythonSnippet {
  id: string;
  filename: string;
  title: string;
  stageName: string;
  description: string;
  code: string;
}

export const PYTHON_SNIPPETS: PythonSnippet[] = ${JSON.stringify(snippets, null, 2)};
`;

const targetFile = path.join(rootDir, 'src', 'data', 'pythonCodeSnippets.ts');
fs.writeFileSync(targetFile, tsContent, 'utf-8');
console.log(`✅ Successfully synced ${snippets.length} Python scripts into ${targetFile}`);
