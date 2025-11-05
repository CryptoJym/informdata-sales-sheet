/**
 * Shared text processing utilities for chunking and HTML parsing
 */

/**
 * Break text into chunks at sentence boundaries
 * @param {string} text - Text to chunk
 * @param {number} maxLen - Maximum chunk length
 * @param {number} minChunkLen - Minimum chunk length before sentence break
 * @returns {string[]} Array of text chunks
 */
export function chunkText(text, maxLen = 1000, minChunkLen = 200) {
  const chunks = [];
  let start = 0;

  while (start < text.length) {
    let end = Math.min(text.length, start + maxLen);

    // Try to break on sentence boundary (., !, ?)
    if (end < text.length) {
      const sentenceEnd = /[.!?]\s/g;
      const searchText = text.slice(start, end);
      let lastMatch = null;
      let match;

      sentenceEnd.lastIndex = 0;
      while ((match = sentenceEnd.exec(searchText)) !== null) {
        lastMatch = match;
      }

      // Use sentence boundary if found after minimum chunk length
      if (lastMatch && (start + lastMatch.index) > start + minChunkLen) {
        end = start + lastMatch.index + 1; // +1 to include the period/!/?
      }
    }

    const chunk = text.slice(start, end).trim();
    if (chunk) chunks.push(chunk);
    start = end;
  }

  return chunks;
}

/**
 * Extract text chunks from HTML file with headings
 * @param {object} cheerio - Cheerio instance loaded with HTML
 * @param {string} urlPath - URL path for the document
 * @param {number} maxChunkLen - Maximum chunk length
 * @returns {Array<{url: string, heading: string, text: string}>} Array of chunks
 */
export function extractChunksFromHtml(cheerio, urlPath, maxChunkLen = 1000) {
  const $ = cheerio;
  const title = $('h1').first().text().trim() || $('title').text().trim() || urlPath;
  const sections = [];

  $('h1, h2, h3, p, li, table').each((_, el) => {
    const tag = el.tagName.toLowerCase();
    if (tag === 'h1' || tag === 'h2' || tag === 'h3') {
      sections.push({ heading: $(el).text().trim(), text: '' });
    } else {
      const text = $(el).text().replace(/\s+/g, ' ').trim();
      if (!text) return;
      if (!sections.length) sections.push({ heading: title, text: '' });
      const lastSection = sections[sections.length - 1];
      lastSection.text += (lastSection.text ? ' ' : '') + text;
    }
  });

  const chunks = [];
  for (const section of sections) {
    for (const chunk of chunkText(section.text, maxChunkLen)) {
      chunks.push({
        url: urlPath,
        heading: section.heading,
        text: chunk
      });
    }
  }

  return chunks;
}

/**
 * TF-IDF stopwords set
 */
export const STOPWORDS = new Set(
  'a an the and or if then else with to for of in on at by from is are was were be been being about as that this these those not no into out over under your you we us our theirs their his her its it they them he she i'.split(/\s+/)
);

/**
 * Tokenize text for TF-IDF
 * @param {string} str - Text to tokenize
 * @returns {string[]} Array of tokens
 */
export function tokenize(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word && !STOPWORDS.has(word));
}
