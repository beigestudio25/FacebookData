import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { PRIMARY_MODEL, FALLBACK_MODEL } from './src/constants/models.ts';
import { scrapeFacebookGroup } from './src/utils/scraperEngine.ts';

// 1. Load .env.local first, then .env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config();

// 2. Validate GEMINI_API_KEY presence
const geminiApiKey = process.env.GEMINI_API_KEY?.trim();
const hasGeminiKey = !!(geminiApiKey && geminiApiKey !== 'MY_GEMINI_API_KEY');

if (!hasGeminiKey) {
  console.warn('\n⚠️  تنبيه للمستخدم: لم يتم تعيين مفتاح GEMINI_API_KEY بعد في ملف .env!');
  console.warn('   سيعمل السيرفر والموقع، ولكن عند استخدام ميزة التحليل بالذكاء الاصطناعي سيطلب منك إدخال المفتاح.');
  console.warn('   احصل على مفتاح مجاني من: https://aistudio.google.com/app/apikey ثم ضعه في ملف .env\n');
}

const isProduction = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT) || 3000;

// Shared Google Gen AI client with telemetry user-agent
const ai = new GoogleGenAI({
  apiKey: geminiApiKey || 'dummy_local_key',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

interface RealEstateAnalysis {
  is_real_estate: boolean;
  advertiser_type: 'مالك' | 'وسيط/سمسار' | 'مشتري' | 'غير محدد';
  deal_type: 'إيجار' | 'بيع' | 'مطلوب' | 'تنازل' | 'غير محدد';
  property_type: string;
  price: string;
  location: string;
  summary: string;
}

const analysisSchema = {
  type: Type.OBJECT,
  properties: {
    is_real_estate: {
      type: Type.BOOLEAN,
      description: 'صحيح true إذا كان المنشور يتعلق بعقار حقيقي، خطأ false للمنشورات العشوائية أو غير العقارية',
    },
    advertiser_type: {
      type: Type.STRING,
      enum: ['مالك', 'وسيط/سمسار', 'مشتري', 'غير محدد'],
      description: 'صفة المعلن (من المالك مباشرة، مكتب/سمسار/شركة، أو عميل مشتري يبحث عن عقار)',
    },
    deal_type: {
      type: Type.STRING,
      enum: ['إيجار', 'بيع', 'مطلوب', 'تنازل', 'غير محدد'],
      description: 'نوع الصفقة المعلن عنها',
    },
    property_type: {
      type: Type.STRING,
      description: 'نوع العقار مثل: شقة، فيلا، تاون هاوس، محل، مكتب إداري، أرض، شاليه، مخزن، أخرى',
    },
    price: {
      type: Type.STRING,
      description: 'السعر المذكور ونظام السداد (كاش/أقساط) أو "غير مذكور"',
    },
    location: {
      type: Type.STRING,
      description: 'المنطقة أو الحي أو المدينة أو اسم الكمبوند بدقة',
    },
    summary: {
      type: Type.STRING,
      description: 'ملخص تسويقي احترافي وسريع للمنشور في جملة واحدة موجزة ومفيدة',
    },
  },
  required: [
    'is_real_estate',
    'advertiser_type',
    'deal_type',
    'property_type',
    'price',
    'location',
    'summary',
  ],
};

async function analyzeSinglePost(
  postText: string,
  modelName: string = PRIMARY_MODEL
): Promise<RealEstateAnalysis> {
  if (!hasGeminiKey) {
    throw new Error('لم يتم تعيين مفتاح GEMINI_API_KEY بعد! يرجى وضعه في ملف .env (احصل عليه مجاناً من https://aistudio.google.com/app/apikey)');
  }

  const prompt = `أنت خبير تحليل بيانات وسوق عقارات في مصر والوطن العربي.
قم بتحليل نص المنشور التالي المأخوذ من مجموعة فيسبوك عقارية:
"""
${postText}
"""

المطلوب:
استخراج البيانات بدقة بصيغة JSON وفق المخطط المطلوب:
1. is_real_estate: هل المنشور يخص عقارات فعلاً؟ (استبعد الإعلانات المضللة كالتوظيف والخدمات العامة).
2. advertiser_type: حدد هل هو "مالك" (مثال: من المالك مباشرة، شقتي، بدون عمولات) أم "وسيط/سمسار" (مثال: لدينا، كود الإعلان، شركة تسويق) أم "مشتري" (مثال: مطلوب شقة، ابحث عن).
3. deal_type: حدد هل هو "بيع" أم "إيجار" أم "مطلوب" أم "تنازل".
4. property_type: نوع العقار بدقة (شقة، دوبلكس، فيلا، روف، محل، مكتب، أرض).
5. price: السعر ونظام الدفع إن وُجد بالأرقام والعملة، وإلا اكتب "غير مذكور".
6. location: المنطقة/المدينة/الكمبوند بأعلى دقة ممكنة.
7. summary: ملخص دقيق للمنشور في جملة واحدة جذابة ومفيدة للمسوقين.`;

  // Candidate models with deduplication: selected -> PRIMARY -> FALLBACK
  const candidateModels = Array.from(new Set([modelName, PRIMARY_MODEL, FALLBACK_MODEL]));
  let lastError: any = null;

  for (const currentModel of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model: currentModel,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: analysisSchema,
          temperature: 0.1,
        },
      });

      const text = response.text?.trim() || '{}';
      return JSON.parse(text);
    } catch (err: any) {
      console.warn(`Model ${currentModel} returned error:`, err?.message || err);
      lastError = err;
      // Continue to next fallback model
    }
  }

  throw lastError || new Error('فشل التحليل بجميع النماذج المتاحة');
}

// In-memory rate limiting map: 30 requests per minute per IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function rateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown-ip';
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return next();
  }

  if (record.count >= 30) {
    return res.status(429).json({
      error: 'تم تجاوز معدل الطلبات المسموح به (30 طلباً في الدقيقة). يرجى الانتظار والمحاولة لاحقاً.',
    });
  }

  record.count += 1;
  next();
}

// Optional Authentication Middleware via x-api-key
function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const expectedKey = process.env.APP_ACCESS_KEY?.trim();
  if (expectedKey) {
    const providedKey = req.headers['x-api-key'];
    const isSameOrigin = req.headers['sec-fetch-site'] === 'same-origin' ||
      (req.headers.referer && req.headers.host && req.headers.referer.includes(req.headers.host));

    if (!isSameOrigin && (!providedKey || providedKey !== expectedKey)) {
      return res.status(401).json({ error: 'غير مصرح: مفتاح x-api-key مفقود أو غير صحيح' });
    }
  }
  next();
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // API Route: Analyze a single Facebook post
  app.post('/api/analyze-post', authMiddleware, rateLimitMiddleware, async (req: Request, res: Response) => {
    try {
      const { postText, model } = req.body;
      if (!postText || typeof postText !== 'string') {
        return res.status(400).json({ error: 'حقل نص المنشور مطلوب (postText)' });
      }

      const selectedModel = model || PRIMARY_MODEL;
      const analysis = await analyzeSinglePost(postText, selectedModel);
      return res.json({ success: true, analysis });
    } catch (error: any) {
      console.error('Gemini Analysis Error:', error);
      return res.status(500).json({
        error: 'فشل في تحليل المنشور بواسطة Gemini',
        details: error?.message || String(error),
      });
    }
  });

  // API Route: Analyze batch of Facebook posts (capped at max 50 posts)
  app.post('/api/analyze-batch', authMiddleware, rateLimitMiddleware, async (req: Request, res: Response) => {
    try {
      const { posts, model } = req.body;
      if (!Array.isArray(posts) || posts.length === 0) {
        return res.status(400).json({ error: 'مصفوفة المنشورات مطلوبة (posts)' });
      }

      if (posts.length > 50) {
        return res.status(400).json({ error: 'الحد الأقصى المسموح به في الحزمة الواحدة هو 50 منشوراً لتجنب تجاوز حدود الموارد' });
      }

      const selectedModel = model || PRIMARY_MODEL;
      const results = [];

      for (let i = 0; i < posts.length; i++) {
        const item = posts[i];
        const postText = typeof item === 'string' ? item : item.text || item.rawText;
        const id = item.id || `post_${i + 1}`;
        const phones = item.phones || [];

        try {
          const analysis = await analyzeSinglePost(postText, selectedModel);
          results.push({
            id,
            postText,
            phones,
            analysis,
            success: true,
          });
        } catch (err: any) {
          results.push({
            id,
            postText,
            phones,
            error: err?.message || 'خطأ في التحليل',
            success: false,
          });
        }
      }

      return res.json({ success: true, count: results.length, results });
    } catch (error: any) {
      console.error('Batch Analysis Error:', error);
      return res.status(500).json({
        error: 'فشل في معالجة الحزمة',
        details: error?.message || String(error),
      });
    }
  });

function fallbackAnalyzePost(postText: string): RealEstateAnalysis {
  const isRealEstate = !/وظيفة|مطلوب موظفين|مطلوب عمال|تطبيقات/i.test(postText);
  const isOwner = /من المالك|المالك مباشرة|شقتي|بدون عمولة|بدون وسطاء/i.test(postText);
  const isBuyer = /مطلوب للشراء|ابحث عن|مطلوب شقة|مطلوب فيلا/i.test(postText);

  let advertiser_type: 'مالك' | 'وسيط/سمسار' | 'مشتري' | 'غير محدد' = 'وسيط/سمسار';
  if (isOwner) advertiser_type = 'مالك';
  else if (isBuyer) advertiser_type = 'مشتري';

  let deal_type: 'إيجار' | 'بيع' | 'مطلوب' | 'تنازل' | 'غير محدد' = 'بيع';
  if (/للإيجار|إيجار|مفروش/i.test(postText)) deal_type = 'إيجار';
  else if (/مطلوب/i.test(postText)) deal_type = 'مطلوب';
  else if (/تنازل/i.test(postText)) deal_type = 'تنازل';

  let property_type = 'شقة';
  if (/فيلا|تاون هاوس|توين هاوس/i.test(postText)) property_type = 'فيلا';
  else if (/شاليه/i.test(postText)) property_type = 'شاليه';
  else if (/محل|تجاري/i.test(postText)) property_type = 'محل تجاري';
  else if (/مكتب|إداري|عيادة/i.test(postText)) property_type = 'مكتب إداري';
  else if (/أرض|قطعة أرض/i.test(postText)) property_type = 'أرض سكنية';

  const priceMatch = postText.match(/(\d+[\d,.]*\s*(?:مليون|ألف|ج|جنيه|مصري|كاش))/i);
  const price = priceMatch ? priceMatch[0] : 'غير مذكور';

  const locationMatch = postText.match(/(التجمع|الشيخ زايد|أكتوبر|المعادي|الشروق|العاصمة|الساحل|السخنة|الرحاب|مدينتي|مدينة نصر|مصر الجديدة)[^,\n.]*/i);
  const location = locationMatch ? locationMatch[0] : 'غير محدد';

  const summary = `${property_type} ${deal_type} في ${location} ${price !== 'غير مذكور' ? 'بسعر ' + price : ''}`.trim();

  return {
    is_real_estate: isRealEstate,
    advertiser_type,
    deal_type,
    property_type,
    price,
    location,
    summary,
  };
}

  // API Route: One-click Facebook Scraper endpoint (Zero Code)
  app.post('/api/scraper/start', authMiddleware, rateLimitMiddleware, async (req: Request, res: Response) => {
    try {
      const { groupUrl, maxPosts = 15, mode = 'smart_cloud', autoAnalyze = true, model } = req.body;
      if (!groupUrl || typeof groupUrl !== 'string') {
        return res.status(400).json({ error: 'رابط مجموعة فيسبوك مطلوب (groupUrl)' });
      }

      const limit = Math.min(Math.max(Number(maxPosts) || 15, 1), 50);
      const selectedModel = model || PRIMARY_MODEL;

      // Scrape posts matching group theme and extract phones
      const rawPosts = await scrapeFacebookGroup({
        groupUrl,
        maxPosts: limit,
        mode,
        autoAnalyze,
      });

      // If autoAnalyze is enabled, perform Gemini analysis with fast parallel execution & local fallback
      if (autoAnalyze) {
        if (!hasGeminiKey) {
          // Instant local rule-based analysis if no Gemini key configured yet
          for (const post of rawPosts) {
            if (post.hasPhone) {
              post.analysis = fallbackAnalyzePost(post.rawText);
              post.status = 'completed';
            } else {
              post.status = 'skipped_no_phone';
            }
          }
        } else {
          // Parallel Gemini analysis with strict 3-second per-post timeout and local fallback
          await Promise.allSettled(
            rawPosts.map(async (post) => {
              if (!post.hasPhone) {
                post.status = 'skipped_no_phone';
                return;
              }

              try {
                const timeoutPromise = new Promise<never>((_, reject) =>
                  setTimeout(() => reject(new Error('Timeout')), 3000)
                );
                const analysis = await Promise.race([
                  analyzeSinglePost(post.rawText, selectedModel),
                  timeoutPromise,
                ]);
                post.analysis = analysis;
                post.status = 'completed';
              } catch (err) {
                // Fallback to local rule-based analysis on Gemini API timeout or error
                post.analysis = fallbackAnalyzePost(post.rawText);
                post.status = 'completed';
              }
            })
          );
        }
      }

      return res.json({
        success: true,
        count: rawPosts.length,
        posts: rawPosts,
      });
    } catch (error: any) {
      console.error('Scraper Start Error:', error);
      return res.status(500).json({
        error: 'فشل في سحب إعلانات فيسبوك',
        details: error?.message || String(error),
      });
    }
  });

  // Vite setup for development or static serving for production
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server started on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal Server Error:', err);
  process.exit(1);
});
