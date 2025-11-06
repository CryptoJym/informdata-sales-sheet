#!/usr/bin/env node

/**
 * UI/UX Fix Script
 * Automatically fixes common UI/UX issues across HTML files
 */

const fs = require('fs');
const path = require('path');

let filesFixed = 0;
let issuesFixed = 0;

function log(message) {
  console.log(`✓ ${message}`);
}

function getAllHtmlFiles(dir = '.', files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'tests') {
      continue;
    }

    if (entry.isDirectory()) {
      getAllHtmlFiles(fullPath, files);
    } else if (entry.name.endsWith('.html') && !fullPath.includes('components/')) {
      files.push(fullPath);
    }
  }

  return files;
}

function wrapTablesInResponsive(content) {
  let fixed = 0;

  // Match tables not already wrapped in .table-responsive
  const tableRegex = /(<table[^>]*>[\s\S]*?<\/table>)/gi;

  content = content.replace(tableRegex, (match) => {
    // Check if already wrapped
    const before = content.substring(Math.max(0, content.indexOf(match) - 200), content.indexOf(match));
    if (before.includes('class="table-responsive"') || before.includes('class="table-wrapper"')) {
      return match;
    }

    fixed++;
    return `<div class="table-responsive">\n      ${match}\n      </div>`;
  });

  issuesFixed += fixed;
  return { content, fixed };
}

function replaceInlineStyles(content) {
  let fixed = 0;

  // Fix common inline styles
  const replacements = [
    // margin-top
    { pattern: /style="margin-top:\s*1rem;?"/g, replace: 'class="mt-4"', desc: 'margin-top: 1rem' },
    { pattern: /style="margin-top:\s*2rem;?"/g, replace: 'class="mt-8"', desc: 'margin-top: 2rem' },
    { pattern: /style="margin-top:\s*1\.25rem;?"/g, replace: 'class="mt-5"', desc: 'margin-top: 1.25rem' },
    { pattern: /style="margin-top:\s*0\.5rem;?"/g, replace: 'class="mt-2"', desc: 'margin-top: 0.5rem' },

    // display + other properties
    { pattern: /style="margin-top:1\.25rem;\s*display:flex;\s*gap:0\.75rem;\s*flex-wrap:wrap;?"/g, replace: 'class="mt-5 flex gap-3 flex-wrap"', desc: 'nav inline styles' },
    { pattern: /style="display:block;\s*margin-top:0\.35rem;\s*font-size:0\.8rem;\s*opacity:0\.8;?"/g, replace: 'class="block mt-1 text-xs"', desc: 'span inline styles' },

    // font-style and color
    { pattern: /style="font-style:\s*italic;\s*color:\s*var\(--muted\);?"/g, replace: 'class="text-muted" style="font-style: italic;"', desc: 'italic muted text' },

    // Remove border-left-color when it's just var(--accent) - already in .callout
    { pattern: /(<div class="callout")\s+style="border-left-color:\s*var\(--accent\);?"/g, replace: '$1', desc: 'callout border' },
  ];

  replacements.forEach(({ pattern, replace, desc }) => {
    const matches = content.match(pattern);
    if (matches) {
      fixed += matches.length;
      content = content.replace(pattern, replace);
    }
  });

  issuesFixed += fixed;
  return { content, fixed };
}

function addButtonTypes(content) {
  let fixed = 0;

  // Add type="button" to buttons without type
  content = content.replace(/<button\s+(?!type=)([^>]*?)>/gi, (match, attrs) => {
    if (!attrs.includes('type=')) {
      fixed++;
      return `<button type="button" ${attrs}>`;
    }
    return match;
  });

  issuesFixed += fixed;
  return { content, fixed };
}

function fixChipButtons(content) {
  let fixed = 0;

  // Add type="button" specifically to .chip elements
  content = content.replace(/<button class="chip"([^>]*?)>/gi, (match, attrs) => {
    if (!attrs.includes('type=')) {
      fixed++;
      return `<button type="button" class="chip"${attrs}>`;
    }
    return match;
  });

  issuesFixed += fixed;
  return { content, fixed };
}

function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const original = content;
    let fileIssuesFixed = 0;

    // Apply all fixes
    let result;

    result = wrapTablesInResponsive(content);
    content = result.content;
    if (result.fixed > 0) {
      log(`${path.basename(filePath)}: Wrapped ${result.fixed} table(s) in responsive container`);
      fileIssuesFixed += result.fixed;
    }

    result = replaceInlineStyles(content);
    content = result.content;
    if (result.fixed > 0) {
      log(`${path.basename(filePath)}: Replaced ${result.fixed} inline style(s)`);
      fileIssuesFixed += result.fixed;
    }

    result = addButtonTypes(content);
    content = result.content;
    if (result.fixed > 0) {
      log(`${path.basename(filePath)}: Added type="button" to ${result.fixed} button(s)`);
      fileIssuesFixed += result.fixed;
    }

    result = fixChipButtons(content);
    content = result.content;
    if (result.fixed > 0) {
      log(`${path.basename(filePath)}: Fixed ${result.fixed} chip button(s)`);
      fileIssuesFixed += result.fixed;
    }

    // Only write if changes were made
    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      filesFixed++;
      log(`✅ Fixed ${fileIssuesFixed} issue(s) in ${path.basename(filePath)}\n`);
    }

  } catch (err) {
    console.error(`Error processing ${filePath}: ${err.message}`);
  }
}

function main() {
  console.log('\n🔧 UI/UX Fix Script\n');
  console.log('Fixing:');
  console.log('  • Wrapping tables in responsive containers');
  console.log('  • Replacing inline styles with utility classes');
  console.log('  • Adding type="button" to buttons');
  console.log('  • Fixing chip button attributes\n');

  const htmlFiles = getAllHtmlFiles('.');

  console.log(`Found ${htmlFiles.length} HTML files to process\n`);

  htmlFiles.forEach(processFile);

  console.log('\n' + '='.repeat(60));
  console.log(`✅ Complete!`);
  console.log(`   Files fixed: ${filesFixed}`);
  console.log(`   Total issues fixed: ${issuesFixed}`);
  console.log('='.repeat(60) + '\n');
}

main();
