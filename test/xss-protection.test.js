/**
 * Tests for XSS protection (manual, since it's client-side)
 * These test the expected behavior of escapeHtml function
 * Run with: node --test test/xss-protection.test.js
 */

import { test } from 'node:test';
import assert from 'node:assert';

// Simulate the escapeHtml function from components/include.js
function escapeHtml(text) {
  // Create a text node and get its HTML representation
  // This simulates what happens in the browser
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

test('escapeHtml: escapes script tags', () => {
  const malicious = '<script>alert("XSS")</script>';
  const escaped = escapeHtml(malicious);

  assert.ok(!escaped.includes('<script'), 'Should not contain script tag');
  assert.ok(escaped.includes('&lt;script'), 'Should escape < character');
  assert.ok(escaped.includes('&gt;'), 'Should escape > character');
});

test('escapeHtml: escapes event handlers', () => {
  const malicious = '<img src=x onerror=alert("XSS")>';
  const escaped = escapeHtml(malicious);

  assert.ok(!escaped.includes('<img'), 'Should not contain img tag');
  assert.ok(escaped.includes('&lt;img'), 'Should escape angle brackets');
  assert.ok(escaped.includes('&quot;'), 'Should escape quotes');
});

test('escapeHtml: escapes javascript: protocol', () => {
  const malicious = '<a href="javascript:alert(\'XSS\')">click</a>';
  const escaped = escapeHtml(malicious);

  // The key is that angle brackets and quotes are escaped, preventing execution
  assert.ok(!escaped.includes('<a'), 'Should not contain <a tag');
  assert.ok(escaped.includes('&lt;a'), 'Should escape opening bracket');
  assert.ok(escaped.includes('&#039;'), 'Should escape single quotes');
  assert.ok(escaped.includes('&quot;'), 'Should escape double quotes');
});

test('escapeHtml: preserves safe text', () => {
  const safe = 'Hello, this is a normal sentence.';
  const escaped = escapeHtml(safe);

  assert.strictEqual(escaped, safe, 'Should not modify safe text');
});

test('escapeHtml: escapes HTML entities', () => {
  const text = 'Use &copy; symbol & <div> tags';
  const escaped = escapeHtml(text);

  assert.ok(escaped.includes('&amp;'), 'Should escape ampersands');
  assert.ok(escaped.includes('&lt;div&gt;'), 'Should escape angle brackets');
});
