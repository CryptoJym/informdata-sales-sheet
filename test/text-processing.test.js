/**
 * Tests for text processing utilities
 * Run with: node --test test/text-processing.test.js
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { chunkText, tokenize, STOPWORDS } from '../utils/text-processing.js';

test('chunkText: handles simple text', () => {
  const text = 'This is a sentence. This is another sentence.';
  const chunks = chunkText(text, 50);

  assert.ok(chunks.length > 0, 'Should return chunks');
  assert.ok(chunks.every(c => c.length <= 50), 'Chunks should respect max length');
});

test('chunkText: breaks on sentence boundaries', () => {
  const text = 'First sentence. Second sentence! Third sentence?';
  const chunks = chunkText(text, 25);

  // Should break after punctuation
  assert.ok(chunks.length >= 2, 'Should create multiple chunks');
  assert.ok(chunks[0].includes('.') || chunks[0].includes('!') || chunks[0].includes('?'),
    'First chunk should end with sentence boundary');
});

test('chunkText: handles empty text', () => {
  const chunks = chunkText('', 100);
  assert.strictEqual(chunks.length, 0, 'Empty text should return empty array');
});

test('chunkText: handles text with no punctuation', () => {
  const text = 'a'.repeat(1500); // Long text with no punctuation
  const chunks = chunkText(text, 500);

  assert.ok(chunks.length > 1, 'Should still chunk long text without punctuation');
  assert.ok(chunks.every(c => c.length <= 500), 'Should respect max length');
});

test('tokenize: lowercases and removes punctuation', () => {
  const tokens = tokenize('Hello, World! How are YOU?', false); // no stemming for this test

  assert.ok(tokens.every(t => t === t.toLowerCase()), 'Should lowercase all tokens');
  assert.ok(!tokens.some(t => /[^a-z0-9]/.test(t)), 'Should remove punctuation');
});

test('tokenize: removes stopwords', () => {
  const tokens = tokenize('the cat and the dog', false); // no stemming for this test

  assert.ok(!tokens.includes('the'), 'Should remove "the"');
  assert.ok(!tokens.includes('and'), 'Should remove "and"');
  assert.ok(tokens.includes('cat'), 'Should keep "cat"');
  assert.ok(tokens.includes('dog'), 'Should keep "dog"');
});

test('tokenize: applies stemming by default', () => {
  const tokens = tokenize('running cats databases walked');

  // With stemming enabled (default)
  assert.ok(tokens.includes('runn'), 'Should stem "running" to "runn"');
  assert.ok(tokens.includes('cat'), 'Should stem "cats" to "cat"');
  assert.ok(tokens.includes('database'), 'Should stem "databases" to "database"');
  assert.ok(tokens.includes('walk'), 'Should stem "walked" to "walk"');
});

test('tokenize: can disable stemming', () => {
  const tokens = tokenize('running cats databases', false);

  // Without stemming
  assert.ok(tokens.includes('running'), 'Should keep "running" unchanged');
  assert.ok(tokens.includes('cats'), 'Should keep "cats" unchanged');
  assert.ok(tokens.includes('databases'), 'Should keep "databases" unchanged');
});

test('tokenize: handles empty string', () => {
  const tokens = tokenize('');
  assert.strictEqual(tokens.length, 0, 'Empty string should return empty array');
});

test('STOPWORDS: contains common words', () => {
  assert.ok(STOPWORDS.has('the'), 'Should have "the"');
  assert.ok(STOPWORDS.has('and'), 'Should have "and"');
  assert.ok(STOPWORDS.has('or'), 'Should have "or"');
  assert.ok(STOPWORDS.has('about'), 'Should have "about"');
  assert.ok(STOPWORDS.has('because'), 'Should have "because"');
  assert.ok(STOPWORDS.has('doing'), 'Should have "doing"');
  assert.ok(!STOPWORDS.has('cat'), 'Should not have "cat"');
  assert.ok(!STOPWORDS.has('database'), 'Should not have "database"');
});
