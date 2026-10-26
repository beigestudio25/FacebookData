import { ExtractedPhone } from '../types';

/**
 * Normalizes Eastern Arabic (Arabic-Indic) numerals (٠-٩) and Persian variants to standard ASCII digits (0-9)
 */
export function normalizeArabicNumerals(text: string): string {
  const arabicDigits: Record<string, string> = {
    '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
    '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
    '۴': '4', '۵': '5', '۶': '6',
  };
  return text.replace(/[٠-٩۴-۶]/g, (char) => arabicDigits[char] || char);
}

/**
 * Exact regex matching Egyptian mobile numbers:
 * - Boundaries: (?<!\d) before pattern and (?!\d) after pattern
 * - Only accepts numbers starting with 01[0125] OR (+20/0020/20) followed by optional 0 then 1[0125]
 * - Strictly rejects isolated 10-digit numbers without leading 0 (e.g. 1012345678)
 * - Strictly rejects numbers embedded in longer digit sequences (e.g. 3101234567800, 20101234567890123)
 */
export const EGYPTIAN_PHONE_REGEX = /(?<!\d)(?:(?:\+|00)?20[\s.-]?0?1[0125]|01[0125])(?:[\s.-]?\d){8}(?!\d)/g;

/**
 * Extracts Egyptian phone numbers from text accurately.
 */
export function extractEgyptianPhones(rawText: string): ExtractedPhone[] {
  if (!rawText) return [];

  const textWithAsciiDigits = normalizeArabicNumerals(rawText);
  // Reset regex index for global regex
  const regex = new RegExp(EGYPTIAN_PHONE_REGEX.source, 'g');
  const matches = textWithAsciiDigits.matchAll(regex);

  const results: ExtractedPhone[] = [];
  const seenNormalized = new Set<string>();

  for (const match of matches) {
    const fullMatch = match[0];
    const digitsOnly = fullMatch.replace(/\D/g, '');

    let localFormat = '';
    if (digitsOnly.startsWith('20') && digitsOnly.length === 12) {
      localFormat = '0' + digitsOnly.slice(2);
    } else if (digitsOnly.startsWith('01') && digitsOnly.length === 11) {
      localFormat = digitsOnly;
    } else if (digitsOnly.startsWith('0020') && digitsOnly.length === 14) {
      localFormat = '0' + digitsOnly.slice(4);
    }

    if (localFormat && localFormat.length === 11 && !seenNormalized.has(localFormat)) {
      const prefix = localFormat.slice(0, 3);
      let carrier: ExtractedPhone['carrier'] = 'أخرى';
      if (prefix === '010') carrier = 'فودافون';
      else if (prefix === '011') carrier = 'اتصالات';
      else if (prefix === '012') carrier = 'أورنج';
      else if (prefix === '015') carrier = 'وي';

      if (['010', '011', '012', '015'].includes(prefix)) {
        seenNormalized.add(localFormat);
        results.push({
          raw: fullMatch.trim(),
          normalized: localFormat,
          international: `+2${localFormat}`,
          carrier,
        });
      }
    }
  }

  return results;
}

/**
 * Generates a direct WhatsApp click-to-chat URL with optional custom inquiry message
 */
export function getWhatsAppLink(phone: ExtractedPhone, customMessage?: string): string {
  const digits = phone.international.replace(/\D/g, '');
  const base = `https://wa.me/${digits}`;
  if (customMessage) {
    return `${base}?text=${encodeURIComponent(customMessage)}`;
  }
  return base;
}
