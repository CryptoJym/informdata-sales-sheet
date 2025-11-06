#!/usr/bin/env node

/**
 * Add Table Captions Script
 * Adds descriptive <caption> elements to all tables for screen reader accessibility
 */

const fs = require('fs');
const path = require('path');

const tableCaptions = {
  // Cookie Policy
  'cookie-policy.html': [
    'Functional Cookies Used by Vuplicity',
    'Third-Party Service Providers and Their Privacy Policies',
    'Cookie Retention Periods by Type'
  ],
  // Accessibility Statement
  'accessibility-statement.html': [
    'Assistive Technology Compatibility and Support Levels'
  ],
  // County Fee Breakdown
  'county_fee_breakdown.html': [
    'County Search Fees by Jurisdiction'
  ],
  // Databases Coverage
  'databases_coverage.html': [
    'Coverage Summary by Service Type',
    'State-by-State Coverage Details',
    'Database Sources and Record Counts'
  ],
  // InformData Source List
  'informdata_source_list.html': [
    'InformData Background Check Source Directory'
  ],
  // NatCrim Overview
  'natcrim_overview.html': [
    'National Criminal Database Summary Statistics',
    'Top States by Coverage Domain and Record Count'
  ],
  // National Scan Components
  'national_scan_components.html': [
    'Coverage by Domain',
    'Source Directory'
  ],
  // Statewide vs County
  'statewide_vs_county.html': [
    'Statewide vs County Coverage Comparison'
  ],
  // Integrations
  'integrations/informdata_sdk_webhooks.html': [
    'Webhook Event Types',
    'API Authentication Methods',
    'Webhook Payload Examples'
  ],
  // Docs/sales
  'docs/sales/county_fee_breakdown.html': [
    'County Search Fees by Jurisdiction'
  ]
};

function addCaptionToTable(content, caption) {
  // Find first table without caption
  const tableRegex = /(<table[^>]*>)\s*(?!<caption)/i;
  if (tableRegex.test(content)) {
    content = content.replace(tableRegex, `$1\n        <caption>${caption}</caption>`);
  }
  return content;
}

function processFile(filePath) {
  const fileName = filePath.replace('./', '');
  const captions = tableCaptions[fileName];

  if (!captions) return;

  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const original = content;

    captions.forEach(caption => {
      content = addCaptionToTable(content, caption);
    });

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✓ Added ${captions.length} caption(s) to ${path.basename(filePath)}`);
    }
  } catch (err) {
    console.error(`Error processing ${filePath}: ${err.message}`);
  }
}

function main() {
  console.log('\n📋 Adding Table Captions for Screen Reader Accessibility\n');

  Object.keys(tableCaptions).forEach(fileName => {
    processFile(fileName);
  });

  console.log('\n✅ Complete!\n');
}

main();
