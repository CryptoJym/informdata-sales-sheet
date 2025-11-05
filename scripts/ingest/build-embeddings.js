#!/usr/bin/env node
/**
 * Build embeddings for site docs into data/embeddings.json
 * Usage: node scripts/ingest/build-embeddings.js
 * Requires: OPENAI_API_KEY
 */
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const BASE = path.resolve(__dirname, '..', '..');
const PAGES = [
  'mvr_api.html',
  'api_docs.html',
  'national_scan_components.html',
  'databases_coverage.html',
  'statewide_vs_county.html',
  'informdata_source_list.html',
];

// Note: This uses a local copy of text processing utilities
// TODO: Migrate to ES modules to use shared utils/text-processing.js
function chunkText(text, maxLen = 1200, minChunkLen = 200) {
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
        end = start + lastMatch.index + 1;
      }
    }

    const chunk = text.slice(start, end).trim();
    if (chunk) chunks.push(chunk);
    start = end;
  }

  return chunks;
}

async function embedAll(chunks) {
  if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY missing');
  const url = 'https://api.openai.com/v1/embeddings';
  const batchSize = 50;
  const out = [];
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const body = JSON.stringify({
      input: batch.map(c => c.text),
      model: 'text-embedding-3-large'
    });
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_API_KEY}` },
      body
    });
    if (!res.ok) throw new Error(`Embed failed: ${res.status} ${await res.text()}`);
    const data = await res.json();
    data.data.forEach((d, j) => {
      out.push({ ...batch[j], embedding: d.embedding });
    });
    process.stderr.write(`embedded ${Math.min(i+batch.length, chunks.length)}/${chunks.length}\n`);
  }
  return out;
}

async function main() {
  const docs = [];
  for (const file of PAGES) {
    const full = path.join(BASE, file);
    if (!fs.existsSync(full)) continue;
    const html = fs.readFileSync(full, 'utf8');
    const $ = cheerio.load(html);
    const title = $('h1').first().text().trim() || $('title').text().trim() || file;
    const sections = [];
    $('h1, h2, h3, p, li, table').each((_, el) => {
      const tag = el.tagName.toLowerCase();
      if (tag === 'h1' || tag === 'h2' || tag === 'h3') {
        sections.push({ heading: $(el).text().trim(), text: '' });
      } else {
        const text = $(el).text().replace(/\s+/g, ' ').trim();
        if (!text) return;
        if (!sections.length) sections.push({ heading: title, text: '' });
        sections[sections.length - 1].text += (sections[sections.length - 1].text ? ' ' : '') + text;
      }
    });
    // chunk
    const chunks = [];
    for (const s of sections) {
      for (const c of chunkText(s.text)) {
        chunks.push({ url: `/${file}`, heading: s.heading, text: c });
      }
    }
    docs.push(...chunks);
  }

  const embedded = await embedAll(docs);
  const outPath = path.join(BASE, 'data', 'embeddings.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify({ model: 'text-embedding-3-large', chunks: embedded }, null, 2));
  console.log('Wrote', outPath, 'chunks=', embedded.length);
}

main().catch(err => { console.error(err); process.exit(1); });

