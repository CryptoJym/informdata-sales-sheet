/**
 * Tests for environment validation
 * Run with: node --test test/env-validation.test.js
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { validateChatEnv } from '../utils/env-validation.js';

test('validateChatEnv: fails without API keys', () => {
  // Save original env
  const originalGrok = process.env.GROK_API_KEY;
  const originalOpenAI = process.env.OPENAI_API_KEY;

  // Clear env
  delete process.env.GROK_API_KEY;
  delete process.env.OPENAI_API_KEY;

  const result = validateChatEnv();

  assert.strictEqual(result.valid, false, 'Should be invalid without keys');
  assert.ok(result.errors.length > 0, 'Should have errors');

  // Restore env
  if (originalGrok) process.env.GROK_API_KEY = originalGrok;
  if (originalOpenAI) process.env.OPENAI_API_KEY = originalOpenAI;
});

test('validateChatEnv: passes with GROK_API_KEY', () => {
  const originalGrok = process.env.GROK_API_KEY;

  process.env.GROK_API_KEY = 'test-key-with-sufficient-length';

  const result = validateChatEnv();

  assert.strictEqual(result.valid, true, 'Should be valid with Grok key');

  if (originalGrok) process.env.GROK_API_KEY = originalGrok;
  else delete process.env.GROK_API_KEY;
});

test('validateChatEnv: warns with only OpenAI key', () => {
  const originalGrok = process.env.GROK_API_KEY;
  const originalOpenAI = process.env.OPENAI_API_KEY;

  delete process.env.GROK_API_KEY;
  process.env.OPENAI_API_KEY = 'sk-test-key-openai';

  const result = validateChatEnv();

  assert.strictEqual(result.valid, true, 'Should be valid with OpenAI key');
  assert.ok(result.warnings.length > 0, 'Should have warnings about using fallback');

  if (originalGrok) process.env.GROK_API_KEY = originalGrok;
  if (originalOpenAI) process.env.OPENAI_API_KEY = originalOpenAI;
  else delete process.env.OPENAI_API_KEY;
});

test('validateChatEnv: detects invalid key format', () => {
  const originalGrok = process.env.GROK_API_KEY;

  process.env.GROK_API_KEY = 'short';

  const result = validateChatEnv();

  assert.strictEqual(result.valid, false, 'Should be invalid with short key');
  assert.ok(result.errors.some(e => e.includes('too short')), 'Should mention key length');

  if (originalGrok) process.env.GROK_API_KEY = originalGrok;
  else delete process.env.GROK_API_KEY;
});
