/**
 * Environment variable validation utilities
 * Validates required API keys and configuration on startup
 */

/**
 * Validation result
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - Whether validation passed
 * @property {string[]} errors - List of validation errors
 * @property {string[]} warnings - List of validation warnings
 */

/**
 * Validate environment variables for chat API
 * @returns {ValidationResult}
 */
export function validateChatEnv() {
  const errors = [];
  const warnings = [];

  // Check for at least one LLM provider
  const hasGrok = !!process.env.GROK_API_KEY;
  const hasOpenAI = !!process.env.OPENAI_API_KEY;

  if (!hasGrok && !hasOpenAI) {
    errors.push(
      'Missing LLM API key: Set either GROK_API_KEY or OPENAI_API_KEY in Vercel environment variables'
    );
  }

  // Warn if only fallback is configured
  if (!hasGrok && hasOpenAI) {
    warnings.push(
      'Using OpenAI as primary provider. Consider setting GROK_API_KEY for better performance'
    );
  }

  // Check API key format (basic validation)
  if (hasGrok) {
    const grokKey = process.env.GROK_API_KEY;
    if (grokKey.length < 20) {
      errors.push('GROK_API_KEY appears invalid (too short)');
    }
  }

  if (hasOpenAI) {
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey.startsWith('sk-')) {
      warnings.push('OPENAI_API_KEY format unexpected (should start with "sk-")');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate and throw on critical errors
 * Logs warnings to console
 * @throws {Error} If validation fails
 */
export function assertValidEnv() {
  const result = validateChatEnv();

  if (result.warnings.length > 0) {
    console.warn('⚠️  Environment warnings:');
    result.warnings.forEach(w => console.warn(`   - ${w}`));
  }

  if (!result.valid) {
    console.error('❌ Environment validation failed:');
    result.errors.forEach(e => console.error(`   - ${e}`));
    throw new Error('Invalid environment configuration');
  }

  console.log('✅ Environment validation passed');
}

export default { validateChatEnv, assertValidEnv };
