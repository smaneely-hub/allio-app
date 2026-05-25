// Decode HTML entities in stored recipe text. Applied at render-normalization time
// as a fallback for DB rows that were saved before the import-pipeline decode fix.
export function decodeHtmlEntities(text) {
  if (typeof text !== 'string') return text
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}
