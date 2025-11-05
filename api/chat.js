import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';
import { extractChunksFromHtml, tokenize } from '../utils/text-processing.js';
import CHAT_CONFIG from '../config/chat.js';
import { validateChatEnv } from '../utils/env-validation.js';

// Validate environment on cold start
let envValidated = false;
if (!envValidated) {
  const validation = validateChatEnv();
  if (validation.warnings.length > 0) {
    validation.warnings.forEach(w => console.warn(`⚠️  ${w}`));
  }
  if (!validation.valid) {
    validation.errors.forEach(e => console.error(`❌ ${e}`));
  }
  envValidated = true;
}

// Vercel requires static values in config exports (cannot use property access)
export const config = {
  runtime: 'nodejs',
  maxDuration: 30 // CHAT_CONFIG.VERCEL_MAX_DURATION value
};

// Simple in-memory rate limiting (for single-instance; use Redis/KV for production)
const rateLimitMap = new Map();

// Simple in-memory cache for parsed chunks (clears on function cold start)
let chunksCache = null;
let chunksCacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Check if a client has exceeded rate limits
 * @param {string} identifier - Client identifier (typically IP address)
 * @returns {boolean} True if request is allowed, false if rate limited
 */
function checkRateLimit(identifier) {
  const now = Date.now();
  const key = identifier;
  const record = rateLimitMap.get(key) || {
    count: 0,
    resetAt: now + CHAT_CONFIG.RATE_LIMIT_WINDOW_MS
  };

  // Reset if window expired
  if (now > record.resetAt) {
    record.count = 0;
    record.resetAt = now + CHAT_CONFIG.RATE_LIMIT_WINDOW_MS;
  }

  record.count++;
  rateLimitMap.set(key, record);

  // Cleanup old entries periodically
  if (rateLimitMap.size > CHAT_CONFIG.RATE_LIMIT_MAP_MAX_SIZE) {
    for (const [k, v] of rateLimitMap.entries()) {
      if (now > v.resetAt) rateLimitMap.delete(k);
    }
  }

  return record.count <= CHAT_CONFIG.RATE_LIMIT_MAX_REQUESTS;
}

/**
 * Create a JSON response
 * @param {Object} data - Data to JSON-encode
 * @param {number} [status=200] - HTTP status code
 * @returns {Response} HTTP response with JSON content-type
 */
async function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Fetch with timeout protection
 * @param {string} url - URL to fetch
 * @param {RequestInit} [options={}] - Fetch options
 * @param {number} [timeoutMs] - Timeout in milliseconds
 * @returns {Promise<Response>} Fetch response
 * @throws {Error} REQUEST_TIMEOUT if timeout exceeded
 */
async function fetchWithTimeout(url, options = {}, timeoutMs = CHAT_CONFIG.API_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('REQUEST_TIMEOUT');
    }
    throw err;
  }
}

/** @param {number[]} a @param {number[]} b @returns {number} */
function dot(a, b){ let s=0; for(let i=0;i<Math.min(a.length,b.length);i++) s+=a[i]*b[i]; return s; }

/** @param {number[]} a @returns {number} */
function norm(a){ return Math.sqrt(dot(a,a)); }

/** @param {number[]} a @param {number[]} b @returns {number} */
function cosine(a,b){ const d=dot(a,b); const n=norm(a)*norm(b)||1; return d/n; }

/**
 * Call LLM chat completion (Grok with OpenAI fallback)
 * @param {Array<{role: string, content: string}>} prompt - Chat messages
 * @returns {Promise<string>} LLM response content
 * @throws {Error} LLM_ERROR if both providers fail
 */
async function chat(prompt) {
  const grok = process.env.GROK_API_KEY;
  if (grok) {
    try {
      const res = await fetchWithTimeout('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${grok}` },
        body: JSON.stringify({
          model: CHAT_CONFIG.GROK_MODEL,
          temperature: CHAT_CONFIG.GROK_TEMPERATURE,
          stream: false,
          messages: [
            { role: 'system', content: CHAT_CONFIG.SYSTEM_PROMPT },
            ...prompt
          ]
        })
      }, CHAT_CONFIG.API_TIMEOUT_MS);
      if (!res.ok) {
        console.error(`Grok API error: ${res.status} ${await res.text()}`);
        throw new Error('LLM_ERROR');
      }
      const data = await res.json();
      return data.choices?.[0]?.message?.content || '';
    } catch (err) {
      console.error('Grok chat error:', err);
      // Try fallback if available
      if (!process.env.OPENAI_API_KEY) throw new Error('LLM_ERROR');
    }
  }
  // Fallback to OpenAI if configured
  const openai = process.env.OPENAI_API_KEY;
  if (!openai) {
    console.error('No LLM API key configured');
    throw new Error('LLM_ERROR');
  }
  try {
    const res = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openai}` },
      body: JSON.stringify({
        model: CHAT_CONFIG.OPENAI_MODEL,
        temperature: CHAT_CONFIG.OPENAI_TEMPERATURE,
        messages: prompt
      })
    }, CHAT_CONFIG.API_TIMEOUT_MS);
    if (!res.ok) {
      console.error(`OpenAI API error: ${res.status}`);
      throw new Error('LLM_ERROR');
    }
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  } catch (err) {
    console.error('OpenAI chat error:', err);
    throw new Error('LLM_ERROR');
  }
}

// ---------- Retrieval (TF-IDF fallback, no embeddings required) ----------

/**
 * Document chunk for retrieval
 * @typedef {Object} DocumentChunk
 * @property {string} url - Document URL
 * @property {string} heading - Section heading
 * @property {string} text - Chunk text content
 */

/**
 * Ranked search result
 * @typedef {Object} RankedResult
 * @property {number} i - Index in original docs array
 * @property {number} score - TF-IDF cosine similarity score
 */

/**
 * Rank documents using TF-IDF cosine similarity
 * @param {string} query - Search query
 * @param {DocumentChunk[]} docs - Documents to rank
 * @returns {RankedResult[]} Ranked results (highest score first)
 */
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

/**
 * Chat API endpoint handler
 * POST /api/chat
 * Body: { query: string }
 * Returns: { answer: string, citations: string } | { error: string }
 *
 * @param {Request} request - HTTP request
 * @returns {Promise<Response>} HTTP response
 */
export default async function handler(request) {
  const startTime = Date.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  if (request.method !== 'POST') {
    console.log(`[${requestId}] ❌ Method not allowed: ${request.method}`);
    return json({ error: 'Use POST {query}' }, 405);
  }

  // Rate limiting
  const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                   request.headers.get('x-real-ip') ||
                   'unknown';

  console.log(`[${requestId}] 📥 Request from ${clientIP}`);

  if (!checkRateLimit(clientIP)) {
    console.warn(`[${requestId}] 🚫 Rate limit exceeded for ${clientIP}`);
    return json({ error: 'Rate limit exceeded. Please try again later.' }, 429);
  }

  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

  // Input validation and sanitization
  const rawQuery = body?.query;
  if (typeof rawQuery !== 'string') {
    return json({ error: 'Query must be a string' }, 400);
  }

  const q = rawQuery.trim();
  if (!q) return json({ error: 'Missing query' }, 400);
  if (q.length > CHAT_CONFIG.MAX_QUERY_LENGTH) {
    return json({ error: `Query too long (max ${CHAT_CONFIG.MAX_QUERY_LENGTH} characters)` }, 400);
  }

  // Basic sanitization - reject obvious injection attempts
  if (CHAT_CONFIG.SUSPICIOUS_PATTERNS.some(pattern => pattern.test(q))) {
    console.warn(`[${requestId}] 🛡️  Suspicious query blocked: ${q.substring(0, 50)}`);
    return json({ error: 'Invalid query format' }, 400);
  }

  console.log(`[${requestId}] 💬 Query: "${q.substring(0, 100)}${q.length > 100 ? '...' : ''}"`);


  // Build chunks (prefer cache, then prebuilt embeddings, then parse HTML)
  let chunks = [];
  const now = Date.now();

  // Check cache first
  if (chunksCache && (now - chunksCacheTimestamp) < CACHE_TTL) {
    chunks = chunksCache;
    console.log(`[${requestId}] ⚡ Using cached chunks (${chunks.length} chunks)`);
  } else {
    // Try prebuilt embeddings.json
    const embedPath = path.join(process.cwd(), 'data', 'embeddings.json');
    if (fs.existsSync(embedPath)) {
      try {
        const data = JSON.parse(fs.readFileSync(embedPath, 'utf8'));
        chunks = data.chunks?.map(({url, heading, text}) => ({url, heading, text})) || [];
      } catch (err) {
        console.error('Error loading embeddings.json:', err);
      }
    }

    // Parse site pages directly if no embeddings found
    if (!chunks.length) {
      const base = process.cwd();
      for (const file of CHAT_CONFIG.PAGES) {
        const full = path.join(base, file);
        if (fs.existsSync(full)) {
          try {
            const html = fs.readFileSync(full, 'utf8');
            const $ = cheerio.load(html);
            chunks.push(...extractChunksFromHtml($, `/${file}`));
          } catch (err) {
            console.error(`Error parsing ${file}:`, err);
          }
        }
      }
    }

    // Cache the chunks
    if (chunks.length > 0) {
      chunksCache = chunks;
      chunksCacheTimestamp = now;
      console.log(`[${requestId}] 💾 Cached ${chunks.length} chunks`);
    }
  }

  if (!chunks.length) {
    console.error(`[${requestId}] ❌ No documents available`);
    return json({ error: 'No documents available for retrieval.' }, 503);
  }

  // Rank via TF-IDF
  const ranked = tfidfRank(q, chunks).slice(0, CHAT_CONFIG.TOP_K_RESULTS);
  const top = ranked.map(({i,score}) => ({ ...chunks[i], score }));

  console.log(`[${requestId}] 🎯 Top chunks: ${top.map(c => `${c.url} (${c.score.toFixed(3)})`).join(', ')}`);

  const context = top.map((c,i)=>`[${i+1}] (${c.url}) ${c.heading}\n${c.text}`).join('\n\n');
  const citations = top.map((c,i)=>`[${i+1}] ${c.url} – ${c.heading}`).join('\n');

  try {
    const llmStartTime = Date.now();
    const answer = await chat([
      { role: 'user', content: `Context:\n${context}\n\nQuestion: ${q}\n\nRespond with clear bullets for mixed audiences (engineering, sales, compliance) and include a short citations list referencing [1]..[6]. If not in context, say you cannot find it and link to /api_docs.html and /mvr_api.html.` }
    ]);
    const llmDuration = Date.now() - llmStartTime;

    const totalDuration = Date.now() - startTime;
    console.log(`[${requestId}] ✅ Success: LLM=${llmDuration}ms, Total=${totalDuration}ms, Answer=${answer.length} chars`);

    return json({ answer, citations });
  } catch (err) {
    const totalDuration = Date.now() - startTime;
    console.error(`[${requestId}] ❌ Error after ${totalDuration}ms:`, err.message);
    return json({
      error: 'Unable to process your query at this time. Please try again later.',
      fallback: 'For documentation, visit /api_docs.html or /mvr_api.html'
    }, 503);
  }
}
