export const config = { runtime: 'nodejs' };

import fs from 'fs';
import path from 'path';

async function json(req, status = 200) {
  return new Response(JSON.stringify(req), { status, headers: { 'Content-Type': 'application/json' }});
}

function dot(a, b){ let s=0; for(let i=0;i<Math.min(a.length,b.length);i++) s+=a[i]*b[i]; return s; }
function norm(a){ return Math.sqrt(dot(a,a)); }
function cosine(a,b){ const d=dot(a,b); const n=norm(a)*norm(b)||1; return d/n; }

async function embed(text) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY missing');
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
    body: JSON.stringify({ model: 'text-embedding-3-large', input: text })
  });
  if (!res.ok) throw new Error('embed failed');
  const data = await res.json();
  return data.data[0].embedding;
}

async function chat(prompt) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY missing');
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      messages: [
        { role: 'system', content: 'You are a helpful assistant that answers strictly based on the provided context. Cite each source with its page path and heading.' },
        ...prompt
      ]
    })
  });
  if (!res.ok) throw new Error('chat failed');
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

export default async function handler(request) {
  if (request.method !== 'POST') return json({ error: 'Use POST {query}' }, 405);
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
  const q = (body?.query || '').toString().trim();
  if (!q) return json({ error: 'Missing query' }, 400);

  // Load embeddings
  const embedPath = path.join(process.cwd(), 'data', 'embeddings.json');
  if (!fs.existsSync(embedPath)) {
    return json({ error: 'Embeddings not built yet. Run scripts/ingest/build-embeddings.js' }, 503);
  }
  const { chunks } = JSON.parse(fs.readFileSync(embedPath, 'utf8'));
  try {
    const qe = await embed(q);
    // score
    const scored = chunks.map((c) => ({...c, score: cosine(qe, c.embedding)}));
    scored.sort((a,b)=> b.score - a.score);
    const top = scored.slice(0, 6);
    const context = top.map((c,i)=>`[${i+1}] (${c.url}) ${c.heading}\n${c.text}`).join('\n\n');
    const citations = top.map((c,i)=>`[${i+1}] ${c.url} – ${c.heading}`).join('\n');

    const answer = await chat([
      { role: 'system', content: 'Answer concisely for sales/engineering/compliance audiences.' },
      { role: 'user', content: `Context:\n${context}\n\nQuestion: ${q}\n\nRespond with clear bullets and include a short citations list referencing [1]..[6]. If the answer is not in context, say you cannot find it and point to API Docs and MVR API pages.` }
    ]);

    return json({ answer, citations });
  } catch (e) {
    return json({ error: e.message || 'Failed' }, 500);
  }
}

