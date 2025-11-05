/**
 * Configuration constants for chat/RAG system
 */

export const CHAT_CONFIG = {
  // Rate limiting
  RATE_LIMIT_WINDOW_MS: 60000, // 1 minute
  RATE_LIMIT_MAX_REQUESTS: 10, // requests per window
  RATE_LIMIT_MAP_MAX_SIZE: 10000, // max entries in rate limit map

  // API timeouts
  API_TIMEOUT_MS: 25000, // 25 seconds for LLM API calls
  CLIENT_TIMEOUT_MS: 30000, // 30 seconds client-side timeout
  VERCEL_MAX_DURATION: 30, // Vercel function timeout

  // Input validation
  MAX_QUERY_LENGTH: 500, // characters

  // Text chunking
  DEFAULT_CHUNK_LENGTH: 1000, // characters
  MIN_CHUNK_LENGTH: 200, // minimum before sentence break
  EMBEDDINGS_CHUNK_LENGTH: 1200, // for embeddings generation

  // Retrieval
  TOP_K_RESULTS: 6, // number of chunks to retrieve

  // LLM settings
  GROK_MODEL: 'grok-4-latest',
  GROK_TEMPERATURE: 0,
  OPENAI_MODEL: 'gpt-4o-mini',
  OPENAI_TEMPERATURE: 0.2,

  // Document pages to index
  PAGES: [
    'mvr_api.html',
    'api_docs.html',
    'national_scan_components.html',
    'databases_coverage.html',
    'statewide_vs_county.html',
    'informdata_source_list.html',
  ],

  // System prompts
  SYSTEM_PROMPT: 'You are a helpful assistant that answers strictly from the provided context. Always include short citations of the form [1], [2] tied to the provided list.',

  // Suspicious patterns for input validation
  SUSPICIOUS_PATTERNS: [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i, // event handlers like onclick=
    /\0/, // null bytes
  ],
};

export default CHAT_CONFIG;
