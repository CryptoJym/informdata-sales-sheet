# Chat API Documentation

## Overview

RAG-powered chat API for documentation Q&A using Grok or OpenAI with TF-IDF retrieval.

## Quick Start

### 1. Install dependencies:
```bash
npm install
```

### 2. Set environment variables:
```bash
export GROK_API_KEY=your_key_here
# OR
export OPENAI_API_KEY=sk-proj-your_key_here
```

### 3. Run tests:
```bash
npm test                    # Run all tests
npm run test:watch          # Watch mode
```

### 4. Start dev server:
```bash
vercel dev
```

### 5. Test the API:
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"query": "What is the MVR API?"}'
```

## API Endpoints

### `POST /api/chat`

Main chat endpoint for Q&A.

**Request:**
```json
{
  "query": "What databases do you cover?"
}
```

**Response (200 OK):**
```json
{
  "answer": "• We cover 12,060+ listings across...",
  "citations": "[1] /databases_coverage.html – Coverage\n[2] /mvr_api.html – Motor Vehicle Records"
}
```

**Error Responses:**
- `400` - Invalid request (bad JSON, missing query, too long)
- `429` - Rate limit exceeded (10 req/min)
- `503` - Service unavailable (LLM error, no documents)

---

### `GET /api/health`

Health check for monitoring.

**Response (200 OK):**
```json
{
  "timestamp": "2025-11-05T12:00:00.000Z",
  "status": "healthy",
  "checks": {
    "environment": { "status": "pass" },
    "embeddings": { "status": "pass" },
    "sources": { "status": "pass", "foundPages": 6 }
  }
}
```

## Architecture

### Flow:
1. **Rate Limiting** - Check IP hasn't exceeded 10 req/min
2. **Validation** - Sanitize input, reject malicious patterns
3. **Retrieval** - Rank docs using TF-IDF (no embeddings needed)
4. **LLM** - Generate answer with Grok (fallback to OpenAI)
5. **Response** - Return answer with citations

### Components:

```
api/
├── chat.js           # Main endpoint (POST /api/chat)
└── health.js         # Health check (GET /api/health)

config/
└── chat.js           # Configuration constants

utils/
├── text-processing.js   # Chunking, tokenization
└── env-validation.js    # Environment validation

test/
├── text-processing.test.js
├── env-validation.test.js
└── xss-protection.test.js
```

## Security Features

✅ **Rate Limiting**
- 10 requests/minute per IP
- In-memory storage (sufficient for single-region)
- Automatic cleanup of old entries

✅ **Input Validation**
- Max 500 characters
- Type checking (must be string)
- Pattern blocking (script tags, event handlers, null bytes)

✅ **XSS Protection**
- HTML escaping in chat widget
- Safe DOM manipulation
- No innerHTML for user input

✅ **Error Masking**
- Generic error messages to clients
- Detailed errors logged server-side only
- No API key exposure

✅ **Timeout Protection**
- 25s LLM API timeout
- 30s Vercel function timeout
- Client-side 30s timeout

## Configuration

Edit `config/chat.js` to customize:

```javascript
export const CHAT_CONFIG = {
  // Rate limiting
  RATE_LIMIT_MAX_REQUESTS: 10,      // per minute
  RATE_LIMIT_WINDOW_MS: 60000,      // 1 minute

  // Timeouts
  API_TIMEOUT_MS: 25000,             // 25s for LLM
  CLIENT_TIMEOUT_MS: 30000,          // 30s client-side

  // Retrieval
  TOP_K_RESULTS: 6,                  // chunks to retrieve
  MAX_QUERY_LENGTH: 500,             // chars

  // Text chunking
  DEFAULT_CHUNK_LENGTH: 1000,        // chars
  MIN_CHUNK_LENGTH: 200,             // before sentence break

  // LLM settings
  GROK_MODEL: 'grok-4-latest',
  GROK_TEMPERATURE: 0,
  OPENAI_MODEL: 'gpt-4o-mini',
  OPENAI_TEMPERATURE: 0.2,
};
```

## Performance

### Typical Response Times:

| Scenario | Time | Notes |
|----------|------|-------|
| Cold start (with embeddings) | ~800ms | First request after deploy |
| Cold start (no embeddings) | ~1200ms | Parses HTML on startup |
| Warm request (cached) | ~150ms | Cache hit |
| Warm request (uncached) | ~1200ms | LLM call |

### Caching:

- **Chunk cache**: 5 minutes in-memory
- **Rate limit map**: Cleaned up at 10k entries
- **Embeddings**: Prebuilt (optional, ~200ms faster)

## Testing

### Run all tests:
```bash
npm test
```

### Test coverage:

- **Text Processing** (8 tests)
  - Chunking with sentence boundaries
  - Tokenization and stopword removal
  - Edge cases (empty, no punctuation)

- **Environment Validation** (4 tests)
  - Missing API keys
  - Invalid key formats
  - Warning conditions

- **XSS Protection** (5 tests)
  - Script tag escaping
  - Event handler escaping
  - Safe text preservation

**Total: 17 tests, 100% passing**

## Monitoring

### Log Patterns:

```
[req_xxx] 📥 Request from 192.168.1.1
[req_xxx] 💬 Query: "What is MVR?"
[req_xxx] ⚡ Using cached chunks (523 chunks)
[req_xxx] 🎯 Top chunks: /mvr_api.html (0.892)
[req_xxx] ✅ Success: LLM=1243ms, Total=1278ms
```

### Monitoring Tools (Free):

- **Vercel Logs**: Built-in, real-time
- **UptimeRobot**: Monitor `/api/health` (5min intervals)
- **Browser DevTools**: Network tab for client-side debugging

## Deployment

See `docs/DEPLOYMENT.md` for full guide.

**Quick deploy:**
```bash
# 1. Set environment variable on Vercel
vercel env add GROK_API_KEY

# 2. Deploy
vercel --prod
```

## Troubleshooting

### "No LLM API key configured"
→ Set `GROK_API_KEY` or `OPENAI_API_KEY` in Vercel environment variables

### High response times (>3s)
→ Check Vercel logs for `LLM=XXXms` - if high, LLM is slow
→ Try faster model: `grok-2-mini` or keep `gpt-4o-mini`

### 429 Rate Limited
→ Working as designed (10 req/min per IP)
→ Increase `RATE_LIMIT_MAX_REQUESTS` in `config/chat.js` if needed

### Empty responses
→ Check `/api/health` to verify documents are loaded
→ Ensure HTML files exist in repository

## Cost Estimation

**Free tier usage (typical docs site):**
- Vercel: $0 (under 100 hours function execution/month)
- Grok API: ~$1-3/month (low traffic)
- **Total: ~$1-3/month**

## Further Reading

- `docs/DEPLOYMENT.md` - Production deployment guide
- `docs/INFRASTRUCTURE_ANALYSIS.md` - Scaling & cost justifications
- `config/chat.js` - Configuration options
- `test/*.test.js` - Test examples
