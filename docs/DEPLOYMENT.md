# Deployment Guide

## Prerequisites

- Vercel account
- Node.js 18+ (for local development/testing)
- At least one LLM API key (Grok or OpenAI)

---

## Environment Variables

### Required (at least ONE):

```bash
# Primary (recommended)
GROK_API_KEY=your_grok_api_key_here

# Fallback
OPENAI_API_KEY=sk-proj-your_openai_key_here
```

### Setting Environment Variables on Vercel:

1. Go to your project settings on Vercel
2. Navigate to "Environment Variables"
3. Add `GROK_API_KEY` or `OPENAI_API_KEY`
4. Apply to all environments (Production, Preview, Development)

---

## Deployment Steps

### 1. Deploy to Vercel

```bash
# Option A: Via Vercel CLI
npm i -g vercel
vercel --prod

# Option B: Via Git (recommended)
git push origin main  # Auto-deploys if connected to Vercel
```

### 2. Verify Deployment

Check the health endpoint:
```bash
curl https://your-domain.vercel.app/api/health
```

Expected response:
```json
{
  "timestamp": "2025-11-05T...",
  "status": "healthy",
  "checks": {
    "environment": {
      "status": "pass",
      "errors": [],
      "warnings": []
    },
    "embeddings": {
      "status": "warn",
      "message": "No embeddings file (will parse HTML on-demand)"
    },
    "sources": {
      "status": "pass",
      "foundPages": 6,
      "totalPages": 6
    }
  }
}
```

### 3. Test the Chat API

```bash
curl -X POST https://your-domain.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"query": "What is MVR API?"}'
```

### 4. Monitor Logs

View logs in Vercel dashboard or CLI:
```bash
vercel logs --follow
```

Look for log patterns:
- `📥 Request from <IP>` - Incoming requests
- `💬 Query: "..."` - User queries
- `⚡ Using cached chunks` - Cache hits
- `✅ Success: LLM=...ms` - Successful responses
- `🚫 Rate limit exceeded` - Rate limiting in action

---

## Optional: Prebuilt Embeddings (Performance Boost)

To avoid parsing HTML on every cold start:

### 1. Generate embeddings locally:

```bash
export OPENAI_API_KEY=sk-proj-...
npm run build:embeddings
```

This creates `data/embeddings.json` (~100KB).

### 2. Commit and deploy:

```bash
git add data/embeddings.json
git commit -m "chore: add prebuilt embeddings"
git push
```

**Benefits:**
- ~200ms faster cold starts
- No HTML parsing needed
- Better first-request performance

**Cost:** ~$0.01 per rebuild (OpenAI embedding costs)

---

## Monitoring & Observability

### Built-in Health Check

Add to UptimeRobot (free tier):
- URL: `https://your-domain.vercel.app/api/health`
- Check interval: 5 minutes
- Expected status: 200

### Vercel Logs

All requests are logged with:
- Request ID for tracing
- Client IP
- Query text (first 100 chars)
- Retrieved chunks and scores
- LLM response time
- Total request time

Example log:
```
[req_1730779200000_abc123] 📥 Request from 192.168.1.1
[req_1730779200000_abc123] 💬 Query: "What databases do you cover?"
[req_1730779200000_abc123] ⚡ Using cached chunks (523 chunks)
[req_1730779200000_abc123] 🎯 Top chunks: /databases_coverage.html (0.892), /mvr_api.html (0.654)
[req_1730779200000_abc123] ✅ Success: LLM=1243ms, Total=1278ms, Answer=342 chars
```

---

## Testing Locally

### 1. Install dependencies:

```bash
npm install
```

### 2. Set environment variables:

```bash
export GROK_API_KEY=your_key_here
```

### 3. Run Vercel dev server:

```bash
vercel dev
# Or use Vercel CLI
npx vercel dev
```

### 4. Test endpoints:

```bash
# Health check
curl http://localhost:3000/api/health

# Chat
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"query": "test query"}'
```

### 5. Run tests:

```bash
npm test
```

---

## Performance Tuning

### Current Performance (Typical):

- **With embeddings.json:**
  - Cold start: ~800ms
  - Warm request (cached): ~150ms
  - Warm request (uncached): ~1200ms

- **Without embeddings.json:**
  - Cold start: ~1200ms (parses HTML)
  - Warm request (cached): ~150ms
  - Warm request (uncached): ~1400ms

### Optimization Tips:

1. **Use embeddings.json** - Commit it to the repo
2. **Monitor cache hits** - Check logs for `⚡ Using cached chunks`
3. **Adjust cache TTL** - Edit `CACHE_TTL` in `api/chat.js` (default: 5 minutes)
4. **Reduce chunk count** - Lower `TOP_K_RESULTS` in `config/chat.js` (default: 6)

---

## Troubleshooting

### Issue: "No LLM API key configured"

**Cause:** Missing environment variables

**Fix:**
1. Check Vercel environment variables
2. Verify key starts with correct prefix:
   - Grok: any format (min 20 chars)
   - OpenAI: `sk-proj-...` or `sk-...`
3. Redeploy after setting vars

### Issue: High response times (>3s)

**Cause:** LLM API latency or missing cache

**Fix:**
1. Check logs for LLM time: `LLM=2500ms` means LLM is slow
2. Switch to faster model in `config/chat.js`:
   - Grok: Try `grok-2-mini` (faster, cheaper)
   - OpenAI: Try `gpt-4o-mini` (already default)
3. Reduce context size (lower `TOP_K_RESULTS`)

### Issue: 429 Rate Limit Exceeded

**Cause:** Client hitting 10 requests/minute

**Fix:**
1. This is working as intended (prevents abuse)
2. Adjust limits in `config/chat.js`:
   ```js
   RATE_LIMIT_MAX_REQUESTS: 20, // increase from 10
   ```
3. For production scale, consider Redis (see INFRASTRUCTURE_ANALYSIS.md)

### Issue: "No documents available for retrieval"

**Cause:** Missing HTML files or embeddings.json

**Fix:**
1. Check health endpoint: `/api/health`
2. Verify HTML files exist:
   - `mvr_api.html`
   - `api_docs.html`
   - etc.
3. Ensure files are committed to git
4. Redeploy

---

## Security Checklist

✅ **Implemented:**
- Rate limiting (10 req/min per IP)
- Input validation (max 500 chars)
- XSS protection (HTML escaping)
- Request sanitization (blocks script tags, event handlers)
- Error masking (no internal details leaked)
- Timeout protection (25s API, 30s Vercel function)

❌ **Not Yet Implemented:**
- Authentication (public API, acceptable for docs)
- Redis-based rate limiting (unnecessary for current scale)
- DDoS protection (Vercel provides basic protection)

---

## Cost Estimation

### Free Tier (Likely Sufficient):

**Vercel:**
- 100GB bandwidth/month
- 100 hours function execution/month
- Typical usage: <1 hour/month for docs site

**LLM API:**
- Grok: ~$0.50/1M tokens (output)
- OpenAI gpt-4o-mini: ~$0.15/1M tokens (output)
- Estimated: $1-5/month for low-medium traffic

**Total: ~$1-5/month** (likely free if under Vercel limits)

### Monitoring:

Check Vercel usage dashboard for:
- Function invocations
- Bandwidth
- Function duration

---

## Scaling Considerations

**Current capacity:**
- ~10,000 requests/day (within free tier)
- 10 requests/min per IP
- Single Vercel region

**When to scale:**
- Multiple Vercel regions → Need Redis for rate limiting
- >100,000 requests/day → Need paid Vercel plan
- Complex auth requirements → Add middleware

See `docs/INFRASTRUCTURE_ANALYSIS.md` for scaling thresholds.
