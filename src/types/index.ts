export interface AnalysisResult {
  is_real_estate: boolean;
  advertiser_type: 'مالك' | 'وسيط/سمسار' | 'مشتري' | 'غير محدد';
  deal_type: 'إيجار' | 'بيع' | 'مطلوب' | 'تنازل' | 'غير محدد';
  property_type: string;
  price: string;
  location: string;
  summary: string;
}

export interface ExtractedPhone {
  raw: string;
  normalized: string; // e.g. 01012345678
  international: string; // e.g. +201012345678
  carrier: 'فودافون' | 'أورنج' | 'اتصالات' | 'وي' | 'أخرى';
}

export interface PostComment {
  id: string;
  author: string;
  text: string;
  phones: ExtractedPhone[];
  date?: string;
  isOwnerComment?: boolean;
}

export interface FacebookPostItem {
  id: string;
  rawText: string;
  author?: string;
  post_url?: string;
  postDate?: string;
  phones: ExtractedPhone[];
  hasPhone: boolean;
  comments?: PostComment[];
  commentsCount?: number;
  analysis?: AnalysisResult;
  status: 'pending' | 'analyzing' | 'completed' | 'error' | 'skipped_no_phone';
  error?: string;
}

export type ActiveTab = 'studio' | 'map' | 'code' | 'guide';
