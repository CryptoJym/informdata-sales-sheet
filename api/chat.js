export const config = { runtime: 'nodejs' };

import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';

async function json(req, status = 200) {
  return new Response(JSON.stringify(req), { status, headers: { 'Content-Type': 'application/json' }});
}

function dot(a, b){ let s=0; for(let i=0;i<Math.min(a.length,b.length);i++) s+=a[i]*b[i]; return s; }
function norm(a){ return Math.sqrt(dot(a,a)); }
function cosine(a,b){ const d=dot(a,b); const n=norm(a)*norm(b)||1; return d/n; }

// Grok chat (x.ai) with fallback to OpenAI if GROK_API_KEY not set
async function chat(prompt) {
  const grok = process.env.GROK_API_KEY;
  if (grok) {
    const res = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${grok}` },
      body: JSON.stringify({
        model: 'grok-4-latest',
        temperature: 0,
        stream: false,
        messages: [
          { role: 'system', content: 'You are a helpful assistant that answers strictly from the provided context. Always include short citations of the form [1], [2] tied to the provided list.' },
          ...prompt
        ]
      })
    });
    if (!res.ok) throw new Error(`grok chat failed: ${res.status}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  }
  // Fallback to OpenAI if configured
  const openai = process.env.OPENAI_API_KEY;
  if (!openai) throw new Error('No LLM API key configured (set GROK_API_KEY).');
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openai}` },
    body: JSON.stringify({ model: 'gpt-4o-mini', temperature: 0.2, messages: prompt })
  });
  if (!res.ok) throw new Error('openai chat failed');
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

// ---------- Retrieval (TF-IDF fallback, no embeddings required) ----------
const PAGES = [
  'mvr_api.html',
  'api_docs.html',
  'national_scan_components.html',
  'databases_coverage.html',
  'statewide_vs_county.html',
  'informdata_source_list.html',
];

function chunkText(text, maxLen = 1000) {
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(text.length, start + maxLen);
    const dot = text.lastIndexOf('.', end);
    if (dot > start + 200) end = dot + 1;
    chunks.push(text.slice(start, end).trim());
    start = end;
  }
  return chunks.filter(Boolean);
}

function extractChunksFromHtml(filePath, urlPath) {
  const html = fs.readFileSync(filePath, 'utf8');
  const $ = cheerio.load(html);
  const title = $('h1').first().text().trim() || $('title').text().trim() || urlPath;
  const sections = [];
  $('h1, h2, h3, p, li, table').each((_, el) => {
    const tag = el.tagName.toLowerCase();
    if (tag === 'h1' || tag === 'h2' || tag === 'h3') {
      sections.push({ heading: $(el).text().trim(), text: '' });
    } else {
      const t = $(el).text().replace(/\s+/g, ' ').trim();
      if (!t) return;
      if (!sections.length) sections.push({ heading: title, text: '' });
      sections[sections.length - 1].text += (sections[sections.length - 1].text ? ' ' : '') + t;
    }
  });
  const out = [];
  for (const s of sections) {
    for (const c of chunkText(s.text)) out.push({ url: urlPath, heading: s.heading, text: c });
  }
  return out;
}

function tokenize(str){
  return str.toLowerCase().replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter(w=>w && !STOP.has(w));
}
const STOP = new Set('a an the and or if then else with to for of in on at by from is are was were be been being about as that this these those not no into out over under your you we us our theirs their his her its it they them he she i'.split(/\s+/));

function tfidfRank(query, docs){
  const toksDocs = docs.map(d=>tokenize(d.text));
  const df = new Map();
  toksDocs.forEach(tokens=>{ const seen = new Set(tokens); seen.forEach(t=> df.set(t, (df.get(t)||0)+1)); });
  const N = docs.length;
  const idf = (t)=> Math.log(1 + (N / ((df.get(t)||0)+1)));
  function vector(tokens){
    const tf = new Map();
    tokens.forEach(t=> tf.set(t, (tf.get(t)||0)+1));
    const v = new Map(); tf.forEach((f,t)=> v.set(t, f * idf(t)));
    return v;
  }
  function vcos(a,b){
    let dot=0, na=0, nb=0; a.forEach((va,t)=>{ na+=va*va; const vb=b.get(t)||0; dot+=va*vb; }); b.forEach(vb=> nb+=vb*vb); return dot/((Math.sqrt(na)||1)*(Math.sqrt(nb)||1));
  }
  const qv = vector(tokenize(query));
  const scored = docs.map((d,i)=>({i,score:vcos(qv, vector(toksDocs[i]))}));
  scored.sort((a,b)=> b.score - a.score);
  return scored;
}

export default async function handler(request) {
  if (request.method !== 'POST') return json({ error: 'Use POST {query}' }, 405);
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
  const q = (body?.query || '').toString().trim();
  if (!q) return json({ error: 'Missing query' }, 400);

  // Build chunks (prefer prebuilt data/embeddings.json for speed; otherwise parse HTML)
  let chunks = [];
  const embedPath = path.join(process.cwd(), 'data', 'embeddings.json');
  if (fs.existsSync(embedPath)) {
    try { const data = JSON.parse(fs.readFileSync(embedPath, 'utf8')); chunks = data.chunks?.map(({url, heading, text})=>({url, heading, text})) || []; } catch {}
  }
  if (!chunks.length) {
    // Parse site pages directly
    const base = process.cwd();
    for (const file of PAGES) {
      const full = path.join(base, file);
      if (fs.existsSync(full)) chunks.push(...extractChunksFromHtml(full, `/${file}`));
    }
  }
  if (!chunks.length) return json({ error: 'No documents available for retrieval.' }, 503);

  // Rank via TF-IDF
  const ranked = tfidfRank(q, chunks).slice(0, 6);
  const top = ranked.map(({i,score}) => ({ ...chunks[i], score }));
  const context = top.map((c,i)=>`[${i+1}] (${c.url}) ${c.heading}\n${c.text}`).join('\n\n');
  const citations = top.map((c,i)=>`[${i+1}] ${c.url} – ${c.heading}`).join('\n');

  const answer = await chat([
    { role: 'user', content: `Context:\n${context}\n\nQuestion: ${q}\n\nRespond with clear bullets for mixed audiences (engineering, sales, compliance) and include a short citations list referencing [1]..[6]. If not in context, say you cannot find it and link to /api_docs.html and /mvr_api.html.` }
  ]);

  return json({ answer, citations });
}
