#!/usr/bin/env node
/**
 * Benchmark TF-IDF retrieval quality and performance
 * Tests stemming vs no stemming, measures retrieval accuracy
 *
 * Usage: node scripts/benchmark-retrieval.js
 */

import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';
import { extractChunksFromHtml, tokenize } from '../utils/text-processing.js';

// Test queries with expected relevant pages
const TEST_QUERIES = [
  { query: 'motor vehicle records', expectedPages: ['mvr_api.html'] },
  { query: 'criminal background checks', expectedPages: ['databases_coverage.html', 'national_scan_components.html'] },
  { query: 'API documentation', expectedPages: ['api_docs.html'] },
  { query: 'county vs statewide searches', expectedPages: ['statewide_vs_county.html'] },
  { query: 'data sources and databases', expectedPages: ['informdata_source_list.html', 'databases_coverage.html'] },
  { query: 'verification services', expectedPages: ['databases_coverage.html'] },
];

// Simple TF-IDF ranker (copied from api/chat.js)
function tfidfRank(query, docs, useStemming = true) {
  const toksDocs = docs.map(d => tokenize(d.text, useStemming));
  const df = new Map();
  toksDocs.forEach(tokens => {
    const seen = new Set(tokens);
    seen.forEach(t => df.set(t, (df.get(t) || 0) + 1));
  });
  const N = docs.length;
  const idf = t => Math.log(1 + N / ((df.get(t) || 0) + 1));

  function vector(tokens) {
    const tf = new Map();
    tokens.forEach(t => tf.set(t, (tf.get(t) || 0) + 1));
    const v = new Map();
    tf.forEach((f, t) => v.set(t, f * idf(t)));
    return v;
  }

  function vcos(a, b) {
    let dot = 0,
      na = 0,
      nb = 0;
    a.forEach((va, t) => {
      na += va * va;
      const vb = b.get(t) || 0;
      dot += va * vb;
    });
    b.forEach(vb => (nb += vb * vb));
    return dot / ((Math.sqrt(na) || 1) * (Math.sqrt(nb) || 1));
  }

  const qv = vector(tokenize(query, useStemming));
  const scored = docs.map((d, i) => ({ i, score: vcos(qv, vector(toksDocs[i])) }));
  scored.sort((a, b) => b.score - a.score);
  return scored;
}

// Load and parse HTML files
function loadChunks() {
  const pages = [
    'mvr_api.html',
    'api_docs.html',
    'national_scan_components.html',
    'databases_coverage.html',
    'statewide_vs_county.html',
    'informdata_source_list.html',
  ];

  const chunks = [];
  const base = process.cwd();

  for (const file of pages) {
    const full = path.join(base, file);
    if (fs.existsSync(full)) {
      const html = fs.readFileSync(full, 'utf8');
      const $ = cheerio.load(html);
      chunks.push(...extractChunksFromHtml($, `/${file}`));
    }
  }

  return chunks;
}

// Calculate precision@k
function precisionAtK(rankedResults, relevantPages, k) {
  const topK = rankedResults.slice(0, k);
  const relevant = topK.filter(r => {
    const page = r.url.substring(1); // Remove leading /
    return relevantPages.includes(page);
  });
  return relevant.length / k;
}

// Calculate Mean Reciprocal Rank (MRR)
function mrr(rankedResults, relevantPages) {
  for (let i = 0; i < rankedResults.length; i++) {
    const page = rankedResults[i].url.substring(1);
    if (relevantPages.includes(page)) {
      return 1 / (i + 1);
    }
  }
  return 0;
}

// Run benchmark
function benchmark() {
  console.log('🔍 Loading document chunks...');
  const chunks = loadChunks();
  console.log(`   Loaded ${chunks.length} chunks from ${new Set(chunks.map(c => c.url)).size} pages\n`);

  console.log('📊 Benchmarking retrieval quality...\n');

  const configs = [
    { name: 'With Stemming', useStemming: true },
    { name: 'Without Stemming', useStemming: false },
  ];

  for (const config of configs) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Configuration: ${config.name}`);
    console.log('='.repeat(60));

    let totalP1 = 0,
      totalP3 = 0,
      totalMRR = 0;
    const times = [];

    for (const test of TEST_QUERIES) {
      const start = Date.now();
      const ranked = tfidfRank(test.query, chunks, config.useStemming);
      const elapsed = Date.now() - start;
      times.push(elapsed);

      const topResults = ranked.slice(0, 5).map((r, i) => ({
        rank: i + 1,
        url: chunks[r.i].url,
        heading: chunks[r.i].heading,
        score: r.score.toFixed(4),
      }));

      const p1 = precisionAtK(topResults, test.expectedPages, 1);
      const p3 = precisionAtK(topResults, test.expectedPages, 3);
      const mrrScore = mrr(topResults, test.expectedPages);

      totalP1 += p1;
      totalP3 += p3;
      totalMRR += mrrScore;

      console.log(`\nQuery: "${test.query}"`);
      console.log(`Expected pages: ${test.expectedPages.join(', ')}`);
      console.log(`Precision@1: ${(p1 * 100).toFixed(0)}%  |  Precision@3: ${(p3 * 100).toFixed(0)}%  |  MRR: ${mrrScore.toFixed(3)}  |  Time: ${elapsed}ms`);
      console.log('Top 3 results:');
      topResults.slice(0, 3).forEach(r => {
        const relevant = test.expectedPages.includes(r.url.substring(1)) ? '✓' : ' ';
        console.log(`  ${relevant} ${r.rank}. ${r.url} (${r.score}) - ${r.heading.substring(0, 50)}`);
      });
    }

    const avgP1 = (totalP1 / TEST_QUERIES.length) * 100;
    const avgP3 = (totalP3 / TEST_QUERIES.length) * 100;
    const avgMRR = totalMRR / TEST_QUERIES.length;
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;

    console.log(`\n${'─'.repeat(60)}`);
    console.log('Summary:');
    console.log(`  Avg Precision@1: ${avgP1.toFixed(1)}%`);
    console.log(`  Avg Precision@3: ${avgP3.toFixed(1)}%`);
    console.log(`  Avg MRR: ${avgMRR.toFixed(3)}`);
    console.log(`  Avg Time: ${avgTime.toFixed(1)}ms`);
    console.log('─'.repeat(60));
  }
}

benchmark();
