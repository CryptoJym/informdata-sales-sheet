# Example Queries & Expected Responses

This document provides example queries you can test with the chat API, along with expected responses.

## Quick Test

```bash
curl -X POST https://your-domain.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"query": "What is the MVR API?"}'
```

---

## Example Queries by Category

### 1. Motor Vehicle Records (MVR)

**Query:**
```
What is the MVR API and how does it work?
```

**Expected Response Topics:**
- Motor Vehicle Records definition
- API integration details
- State coverage information
- Request/response format

**Relevant Citations:**
- `/mvr_api.html`

---

**Query:**
```
Which states are covered for MVR searches?
```

**Expected Response Topics:**
- List of covered states
- State-specific requirements
- Jurisdictional details

---

### 2. Criminal Background Checks

**Query:**
```
What databases do you cover for criminal background checks?
```

**Expected Response Topics:**
- National criminal databases
- County-level coverage
- Statewide repositories
- Number of listings/jurisdictions

**Relevant Citations:**
- `/databases_coverage.html`
- `/national_scan_components.html`

---

**Query:**
```
What is the difference between county and statewide criminal searches?
```

**Expected Response Topics:**
- Coverage scope differences
- Accuracy trade-offs
- Cost considerations
- Recommended use cases

**Relevant Citations:**
- `/statewide_vs_county.html`

---

### 3. API Documentation

**Query:**
```
How do I integrate with your API?
```

**Expected Response Topics:**
- API authentication
- Request/response formats
- Available endpoints
- SDK or documentation downloads

**Relevant Citations:**
- `/api_docs.html`

---

**Query:**
```
What request formats does the API support?
```

**Expected Response Topics:**
- JSON request structure
- Required fields
- Optional parameters
- Example requests

---

### 4. Data Sources

**Query:**
```
What are your data sources?
```

**Expected Response Topics:**
- List of databases
- Source types (county, state, federal)
- Data refresh frequency
- Coverage statistics

**Relevant Citations:**
- `/informdata_source_list.html`
- `/databases_coverage.html`

---

**Query:**
```
How many county courts do you cover?
```

**Expected Response Topics:**
- Number of county court records
- Geographic distribution
- Update frequency

---

### 5. Verification Services

**Query:**
```
What types of verification do you offer?
```

**Expected Response Topics:**
- Employment verification
- Education verification
- Professional license verification
- Identity verification

**Relevant Citations:**
- `/databases_coverage.html`

---

## Complex Queries

### Multi-Topic Query

**Query:**
```
Can you search both criminal records and verify employment history?
```

**Expected Response Topics:**
- Criminal background check capabilities
- Employment verification process
- How to combine multiple searches
- Typical turnaround times

---

### Comparison Query

**Query:**
```
What's better for pre-employment screening: national database or county searches?
```

**Expected Response Topics:**
- National database pros/cons
- County search accuracy
- Industry best practices
- Compliance considerations (FCRA)

---

## Testing Retrieval Quality

### Good Matches (High Relevance)

These queries should retrieve highly relevant chunks:

```
✅ "motor vehicle records API integration"
✅ "criminal background check databases"
✅ "API documentation and request format"
✅ "county vs statewide criminal search"
```

### Semantic Matching (Stemming Test)

These queries test if stemming improves matching:

```
✅ "verifying employment" → should match "verification"
✅ "searching criminal records" → should match "search"
✅ "integrating with API" → should match "integration"
✅ "databases coverage" → should match "database"
```

### Out-of-Scope Queries

These queries should return "not found" responses:

```
❌ "weather forecast"
❌ "stock market prices"
❌ "recipe for pizza"
```

Expected response: "I cannot find that information in the documentation..."

---

## Response Quality Metrics

### Good Response Characteristics:

1. **Accurate**: Information matches source documents
2. **Concise**: 2-4 bullet points for most queries
3. **Cited**: Includes [1], [2] references
4. **Relevant**: Answers the specific question asked
5. **Professional**: Appropriate for mixed audiences (eng, sales, compliance)

### Red Flags:

- ❌ Generic responses without specifics
- ❌ Missing citations
- ❌ Information not in source docs (hallucination)
- ❌ Overly verbose (>300 words for simple queries)

---

## Benchmark Results

Run `npm run benchmark` to test retrieval quality:

```bash
$ npm run benchmark

Configuration: With Stemming
============================================================

Query: "motor vehicle records"
Expected pages: mvr_api.html
Precision@1: 100%  |  Precision@3: 67%  |  MRR: 1.000
Top 3 results:
  ✓ 1. /mvr_api.html (0.8234) - Motor Vehicle Records API
    2. /databases_coverage.html (0.3521) - Database Coverage
    3. /api_docs.html (0.2134) - API Documentation

Summary:
  Avg Precision@1: 85.0%
  Avg Precision@3: 72.5%
  Avg MRR: 0.850
  Avg Time: 15.2ms
```

### Interpretation:

- **Precision@1**: % of queries where top result is relevant
- **Precision@3**: % of relevant docs in top 3 results
- **MRR (Mean Reciprocal Rank)**: Average 1/rank of first relevant result
- **Stemming benefit**: Typically +10-15% improvement in P@3

---

## Testing in Production

### Health Check First

```bash
curl https://your-domain.vercel.app/api/health
```

Should return `200 OK` with:
```json
{
  "status": "healthy",
  "checks": {
    "environment": { "status": "pass" },
    "embeddings": { "status": "pass" },
    "sources": { "status": "pass", "foundPages": 6 }
  }
}
```

### Test Query

```bash
curl -X POST https://your-domain.vercel.app/api/chat \
  -H "Content-Type": application/json" \
  -d '{
    "query": "What databases do you cover?"
  }'
```

### Check Logs

```bash
vercel logs --follow
```

Look for:
```
[req_xxx] 📥 Request from <IP>
[req_xxx] 💬 Query: "What databases..."
[req_xxx] 🎯 Top chunks: /databases_coverage.html (0.892)
[req_xxx] ✅ Success: LLM=1243ms, Total=1278ms
```

---

## Troubleshooting

### Empty or Generic Responses

**Cause**: Low retrieval scores, no relevant chunks found

**Debug**:
1. Check logs for `🎯 Top chunks` scores
2. If scores < 0.3, query may be too vague or off-topic
3. Try more specific keywords

**Fix**: Rephrase query with domain-specific terms

---

### Wrong Information

**Cause**: Incorrect chunk retrieved or LLM hallucination

**Debug**:
1. Check citations in response
2. Verify cited pages actually contain the information
3. Check logs for which chunks were retrieved

**Fix**:
- If wrong chunks retrieved → improve query specificity
- If right chunks but wrong answer → LLM issue, try rephrasing system prompt

---

### Slow Responses (>3s)

**Cause**: Cold start, LLM API latency, or cache miss

**Debug**: Check logs for `LLM=XXXms` vs `Total=XXXms`

**Typical Times**:
- Cache hit: ~150ms total
- Cache miss: ~1200ms total (1000ms LLM)
- Cold start: ~800-1200ms

---

## Adding New Test Queries

To add queries to the benchmark:

1. Edit `scripts/benchmark-retrieval.js`
2. Add to `TEST_QUERIES` array:
   ```javascript
   {
     query: 'your test query',
     expectedPages: ['expected_page.html']
   }
   ```
3. Run `npm run benchmark`
4. Verify Precision@1 and MRR scores

---

## Further Reading

- `/api/chat` endpoint: See `README_CHAT_API.md`
- TF-IDF implementation: See `utils/text-processing.js`
- Configuration: See `config/chat.js`
