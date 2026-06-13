/**
 * Text Utilities - SOLID Principle: Single Responsibility
 * 
 * Centralized text processing utilities for Telegram messages and HTML content.
 * Follows DRY principle - reusable across all handlers.
 * 
 * @module infrastructure/telegram/text-utils
 */

// ═══════════════════════════════════════════════════════════════
// HTML ENTITY MAPPINGS
// ═══════════════════════════════════════════════════════════════

/**
 * Vietnamese accent HTML entities mapping
 */
const VIETNAMESE_ENTITIES: Record<string, string> = {
  // Lowercase
  '&agrave;': 'à', '&aacute;': 'á', '&atilde;': 'ã', '&acirc;': 'â',
  '&egrave;': 'è', '&eacute;': 'é', '&ecirc;': 'ê',
  '&igrave;': 'ì', '&iacute;': 'í',
  '&ograve;': 'ò', '&oacute;': 'ó', '&otilde;': 'õ', '&ocirc;': 'ô',
  '&ugrave;': 'ù', '&uacute;': 'ú',
  // Uppercase
  '&Agrave;': 'À', '&Aacute;': 'Á', '&Atilde;': 'Ã', '&Acirc;': 'Â',
  '&Egrave;': 'È', '&Eacute;': 'É', '&Ecirc;': 'Ê',
  '&Igrave;': 'Ì', '&Iacute;': 'Í',
  '&Ograve;': 'Ò', '&Oacute;': 'Ó', '&Otilde;': 'Õ', '&Ocirc;': 'Ô',
  '&Ugrave;': 'Ù', '&Uacute;': 'Ú',
};

// ═══════════════════════════════════════════════════════════════
// CORE TEXT PROCESSING FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Escape special characters for Telegram MarkdownV2
 */
export function escapeMarkdown(str: string): string {
  if (!str) return '';
  // MarkdownV2 reserved: _ * [ ] ( ) ~ ` > # + - = | { } . !
  return str.replace(/([_*\[\]()~`>#+=|{}.!-])/g, '\\$1');
}

/**
 * Decode HTML entities including Vietnamese diacritics
 */
export function decodeHtmlEntities(text: string): string {
  let result = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
  
  // Decode numeric HTML entities (&#xxx;) - KEY FOR VIETNAMESE
  result = result.replace(/&#(\d+);/g, (_, code) => 
    String.fromCharCode(parseInt(code, 10))
  );
  result = result.replace(/&#x([0-9a-fA-F]+);/g, (_, code) => 
    String.fromCharCode(parseInt(code, 16))
  );
  
  // Decode named entities for Vietnamese accents
  for (const [entity, char] of Object.entries(VIETNAMESE_ENTITIES)) {
    result = result.replace(new RegExp(entity, 'g'), char);
  }
  
  // Remove remaining unknown entities
  result = result.replace(/&[a-z]+;/gi, '');
  
  return result;
}

/**
 * Extract image URLs from HTML
 */
export function extractImages(html: string): string[] {
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  const images: string[] = [];
  let match;
  
  while ((match = imgRegex.exec(html)) !== null) {
    if (match[1]) {
      images.push(match[1]);
    }
  }
  
  return images;
}

/**
 * Clean HTML to readable text
 * Preserves structure with bullet points and line breaks
 */
export function htmlToText(html: string): string {
  let text = html
    // Convert block elements to single newlines (compact)
    .replace(/<\/p>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li[^>]*>/gi, '- ')  // Use simple dash for list items
    .replace(/<\/tr>/gi, '\n')     // Table rows
    .replace(/<\/td>/gi, ' | ')    // Table cells
    .replace(/<\/th>/gi, ' | ');   // Table headers

  // Remove remaining HTML tags
  text = text.replace(/<[^>]*>/g, '');
  
  return text;
}

/**
 * Remove JSON-like data from text
 */
export function removeJsonData(text: string): string {
  return text
    .replace(/\{"[^"]*":[^}]+\}/g, '')
    .replace(/\[\{"[^"]*":[^\]]+\]\}/g, '')
    .replace(/data-sheet-value="[^"]*"/g, '');
}

/**
 * Normalize whitespace - compact single-line spacing
 */
export function normalizeWhitespace(text: string): string {
  return text
    .replace(/[ \t]+/g, ' ')      // Collapse horizontal spaces
    .replace(/\n[ \t]+/g, '\n')   // Trim start of lines
    .replace(/[ \t]+\n/g, '\n')   // Trim end of lines
    .replace(/\n{2,}/g, '\n')     // MAX 1 consecutive newline (compact)
    .trim();
}

// ═══════════════════════════════════════════════════════════════
// HIGH-LEVEL FUNCTIONS
// ═══════════════════════════════════════════════════════════════

export interface CleanDescriptionResult {
  text: string;
  attachments: string[];
}

/**
 * Clean HTML description to readable text
 * Main function for processing Leantime task descriptions
 * 
 * @param html - Raw HTML content
 * @param maxLength - Maximum output length (default: 800)
 * @returns Cleaned text and extracted attachments
 */
export function cleanHtmlDescription(
  html: string, 
  maxLength: number = 800
): CleanDescriptionResult {
  if (!html) {
    return { text: 'Không có mô tả', attachments: [] };
  }

  // Step 1: Extract attachments before processing
  const attachments = extractImages(html);

  // Step 2: Convert HTML to text (preserves structure)
  let text = htmlToText(html);
  
  // Step 3: Decode HTML entities (including Vietnamese)
  text = decodeHtmlEntities(text);
  
  // Step 4: Remove JSON-like data
  text = removeJsonData(text);
  
  // Step 5: Normalize whitespace (compact spacing)
  text = normalizeWhitespace(text);

  // Step 6: Truncate if too long
  if (text.length > maxLength) {
    text = text.slice(0, maxLength) + '...';
  }

  // Step 7: Fallback if empty
  if (!text.trim()) {
    text = 'Không có mô tả chi tiết';
  }

  return { text, attachments };
}

/**
 * Format description for Telegram display
 * Applies escaping and formatting
 */
export function formatDescriptionForTelegram(
  description: string | undefined,
  maxLength: number = 800
): { text: string; attachments: string[] } {
  const result = cleanHtmlDescription(description || '', maxLength);
  return {
    text: escapeMarkdown(result.text),
    attachments: result.attachments
  };
}
