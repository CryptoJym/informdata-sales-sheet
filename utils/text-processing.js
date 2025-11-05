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
 * Enhanced TF-IDF stopwords set (common English words with little semantic value)
 * Includes: articles, conjunctions, prepositions, pronouns, common verbs
 */
export const STOPWORDS = new Set(
  `a about above after again against all am an and any are aren't as at
   be because been before being below between both but by can't cannot could
   couldn't did didn't do does doesn't doing don't down during each few for
   from further had hadn't has hasn't have haven't having he he'd he'll he's
   her here here's hers herself him himself his how how's i i'd i'll i'm i've
   if in into is isn't it it's its itself let's me more most mustn't my myself
   no nor not of off on once only or other ought our ours ourselves out over
   own same shan't she she'd she'll she's should shouldn't so some such than
   that that's the their theirs them themselves then there there's these they
   they'd they'll they're they've this those through to too under until up
   very was wasn't we we'd we'll we're we've were weren't what what's when
   when's where where's which while who who's whom why why's with won't would
   wouldn't you you'd you'll you're you've your yours yourself yourselves`.split(/\s+/)
);

/**
 * Simple Porter-like stemmer for common English suffixes
 * Removes common endings to improve matching (e.g., "running" -> "run")
 * @param {string} word - Word to stem
 * @returns {string} Stemmed word
 */
function simpleStem(word) {
  // Don't stem very short words
  if (word.length <= 3) return word;

  // Common suffixes (order matters - try longer suffixes first)
  const suffixes = [
    { pattern: /ational$/, replace: 'ate' },    // relational -> relate
    { pattern: /iveness$/, replace: 'ive' },    // effectiveness -> effective
    { pattern: /fulness$/, replace: 'ful' },    // usefulness -> useful
    { pattern: /ousness$/, replace: 'ous' },    // callousness -> callous
    { pattern: /ization$/, replace: 'ize' },    // authorization -> authorize
    { pattern: /ational$/, replace: 'ate' },    // conditional -> condition
    { pattern: /alism$/, replace: 'al' },       // realism -> real
    { pattern: /ement$/, replace: '' },         // replacement -> replac
    { pattern: /ments$/, replace: 'ment' },     // agreements -> agreement
    { pattern: /ness$/, replace: '' },          // happiness -> happi
    { pattern: /ing$/, replace: '' },           // running -> runn
    { pattern: /ies$/, replace: 'y' },          // cities -> city
    { pattern: /ied$/, replace: 'y' },          // tried -> try
    { pattern: /ism$/, replace: '' },           // capitalism -> capital
    { pattern: /ist$/, replace: '' },           // capitalist -> capital
    { pattern: /ers$/, replace: 'er' },         // workers -> worker
    { pattern: /ed$/, replace: '' },            // walked -> walk
    { pattern: /es$/, replace: 'e' },           // boxes -> boxe
    { pattern: /s$/, replace: '' },             // cats -> cat
    { pattern: /ly$/, replace: '' },            // quickly -> quick
  ];

  for (const { pattern, replace } of suffixes) {
    if (pattern.test(word)) {
      const stemmed = word.replace(pattern, replace);
      // Don't return stems that are too short
      if (stemmed.length >= 3) {
        return stemmed;
      }
    }
  }

  return word;
}

/**
 * Tokenize text for TF-IDF with stemming
 * @param {string} str - Text to tokenize
 * @param {boolean} [useStemming=true] - Whether to apply stemming
 * @returns {string[]} Array of stemmed tokens
 */
export function tokenize(str, useStemming = true) {
  const tokens = str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word && word.length >= 2 && !STOPWORDS.has(word));

  return useStemming ? tokens.map(simpleStem) : tokens;
}
