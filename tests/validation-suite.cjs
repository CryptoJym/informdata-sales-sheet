#!/usr/bin/env node

/**
 * Comprehensive Validation Test Suite
 * Tests HTML validity, accessibility, design system consistency, and best practices
 */

const fs = require('fs');
const path = require('path');

// Test Results Tracker
const results = {
  passed: [],
  failed: [],
  warnings: []
};

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(color, symbol, message) {
  console.log(`${color}${symbol}${colors.reset} ${message}`);
}

function pass(test, message) {
  results.passed.push({ test, message });
  log(colors.green, '✓', `${test}: ${message}`);
}

function fail(test, message) {
  results.failed.push({ test, message });
  log(colors.red, '✗', `${test}: ${message}`);
}

function warn(test, message) {
  results.warnings.push({ test, message });
  log(colors.yellow, '⚠', `${test}: ${message}`);
}

function section(title) {
  console.log(`\n${colors.cyan}${'='.repeat(80)}${colors.reset}`);
  console.log(`${colors.cyan}${title}${colors.reset}`);
  console.log(`${colors.cyan}${'='.repeat(80)}${colors.reset}\n`);
}

// Utility: Get all HTML files
function getAllHtmlFiles(dir = '.', files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    // Skip node_modules, .git, etc.
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;

    if (entry.isDirectory()) {
      getAllHtmlFiles(fullPath, files);
    } else if (entry.name.endsWith('.html')) {
      files.push(fullPath);
    }
  }

  return files;
}

// Utility: Read file content
function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    fail('File Read', `Cannot read ${filePath}: ${err.message}`);
    return null;
  }
}

// ============================================================================
// TEST 1: HTML Structure Validation
// ============================================================================
function testHtmlStructure() {
  section('TEST 1: HTML Structure Validation');

  const htmlFiles = getAllHtmlFiles('.');
  const requiredElements = ['<!DOCTYPE html>', '<html', '<head', '<body', '</html>'];

  htmlFiles.forEach(file => {
    const content = readFile(file);
    if (!content) return;

    // Skip component files - they are HTML fragments, not full documents
    if (file.includes('components/')) {
      pass('HTML Structure', `${file} is a component fragment (skipped structure validation)`);
      return;
    }

    // Check for required HTML5 structure
    let hasAllRequired = true;
    requiredElements.forEach(elem => {
      if (!content.includes(elem)) {
        fail('HTML Structure', `${file} missing ${elem}`);
        hasAllRequired = false;
      }
    });

    if (hasAllRequired) {
      pass('HTML Structure', `${file} has valid HTML5 structure`);
    }

    // Check for meta viewport (responsive)
    if (content.includes('name="viewport"')) {
      pass('Responsive Meta', `${file} has viewport meta tag`);
    } else {
      fail('Responsive Meta', `${file} missing viewport meta tag`);
    }

    // Check for proper charset
    if (content.includes('charset="UTF-8"') || content.includes("charset='UTF-8'")) {
      pass('Character Encoding', `${file} has UTF-8 charset`);
    } else {
      fail('Character Encoding', `${file} missing or incorrect charset`);
    }

    // Check for title tag
    if (content.match(/<title>.*<\/title>/)) {
      pass('Title Tag', `${file} has title tag`);
    } else {
      fail('Title Tag', `${file} missing title tag`);
    }
  });
}

// ============================================================================
// TEST 2: Design System Consistency
// ============================================================================
function testDesignSystem() {
  section('TEST 2: Design System Consistency');

  const htmlFiles = getAllHtmlFiles('.');

  htmlFiles.forEach(file => {
    const content = readFile(file);
    if (!content) return;

    // Skip component files
    if (file.includes('components/')) {
      pass('Design System', `${file} is a component (skipped)`);
      return;
    }

    // Check for tokens.css reference
    if (content.includes('tokens.css')) {
      pass('Design Tokens', `${file} uses tokens.css`);
    } else {
      fail('Design Tokens', `${file} does not use tokens.css`);
    }

    // Check for inline <style> blocks (should not exist)
    if (content.match(/<style[^>]*>[\s\S]*?<\/style>/)) {
      fail('No Inline Styles', `${file} contains inline <style> block`);
    } else {
      pass('No Inline Styles', `${file} has no inline <style> blocks`);
    }

    // Check for inline style attributes (should be minimal/none)
    const inlineStyleCount = (content.match(/style="/g) || []).length;
    if (inlineStyleCount > 0) {
      warn('Inline Attributes', `${file} has ${inlineStyleCount} inline style attributes`);
    } else {
      pass('Inline Attributes', `${file} has no inline style attributes`);
    }

    // Check for page type classification
    const hasPageType = content.match(/class="page-(product|legal|docs)"/);
    if (hasPageType) {
      pass('Page Type', `${file} has page type: ${hasPageType[1]}`);
    } else {
      warn('Page Type', `${file} missing page-type class`);
    }
  });
}

// ============================================================================
// TEST 3: Accessibility Requirements
// ============================================================================
function testAccessibility() {
  section('TEST 3: Accessibility Requirements');

  const htmlFiles = getAllHtmlFiles('.');

  htmlFiles.forEach(file => {
    const content = readFile(file);
    if (!content) return;

    // Skip component files for main content check
    if (file.includes('components/')) {
      pass('Accessibility', `${file} is a component (skipped)`);
      return;
    }

    // Check for lang attribute
    if (content.match(/<html[^>]*lang="[^"]+"/)) {
      pass('Lang Attribute', `${file} has lang attribute`);
    } else {
      fail('Lang Attribute', `${file} missing lang attribute on <html>`);
    }

    // Check for skip link
    if (content.includes('skip-link') || content.includes('Skip to main content')) {
      pass('Skip Link', `${file} has skip navigation link`);
    } else {
      warn('Skip Link', `${file} missing skip navigation link`);
    }

    // Check for main landmark
    if (content.match(/<main[^>]*>/)) {
      pass('Main Landmark', `${file} has <main> landmark`);
    } else {
      fail('Main Landmark', `${file} missing <main> landmark`);
    }

    // Check for id="main-content"
    if (content.includes('id="main-content"')) {
      pass('Main Content ID', `${file} has main-content ID`);
    } else {
      warn('Main Content ID', `${file} missing main-content ID`);
    }

    // Check for aria-labels on navigation
    if (content.includes('aria-label') || content.includes('aria-labelledby')) {
      pass('ARIA Labels', `${file} uses ARIA labels`);
    } else {
      warn('ARIA Labels', `${file} may need ARIA labels`);
    }

    // Check for img without alt (bad practice)
    const imgsWithoutAlt = content.match(/<img(?![^>]*alt=)[^>]*>/g);
    if (imgsWithoutAlt && imgsWithoutAlt.length > 0) {
      fail('Image Alt Text', `${file} has ${imgsWithoutAlt.length} images without alt text`);
    } else {
      pass('Image Alt Text', `${file} images have alt text (or no images)`);
    }
  });
}

// ============================================================================
// TEST 4: Component Inclusion
// ============================================================================
function testComponentInclusion() {
  section('TEST 4: Component Inclusion System');

  const htmlFiles = getAllHtmlFiles('.');

  // Check if include.js exists
  if (fs.existsSync('components/include.js')) {
    pass('Include Script', 'components/include.js exists');
  } else {
    fail('Include Script', 'components/include.js missing');
  }

  // Check required components exist
  const requiredComponents = ['header.html', 'footer.html'];
  requiredComponents.forEach(component => {
    const componentPath = `components/${component}`;
    if (fs.existsSync(componentPath)) {
      pass('Component Exists', `${componentPath} exists`);
    } else {
      fail('Component Exists', `${componentPath} missing`);
    }
  });

  htmlFiles.forEach(file => {
    const content = readFile(file);
    if (!content) return;

    // Skip component files themselves
    if (file.includes('components/')) return;

    // Check for header inclusion
    if (content.includes('data-include="components/header.html"')) {
      pass('Header Inclusion', `${file} includes header component`);
    } else {
      warn('Header Inclusion', `${file} may be missing header component`);
    }

    // Check for footer inclusion
    if (content.includes('data-include="components/footer.html"')) {
      pass('Footer Inclusion', `${file} includes footer component`);
    } else {
      warn('Footer Inclusion', `${file} may be missing footer component`);
    }

    // Check for include.js script
    if (content.includes('include.js')) {
      pass('Include Script', `${file} loads include.js`);
    } else {
      warn('Include Script', `${file} may not load include.js`);
    }
  });
}

// ============================================================================
// TEST 5: Page Type Classification
// ============================================================================
function testPageTypeClassification() {
  section('TEST 5: Page Type Classification');

  const htmlFiles = getAllHtmlFiles('.');

  const expectedPageTypes = {
    'page-product': [
      'index.html',
      'natcrim_overview.html',
      'county_fee_breakdown.html',
      'databases_coverage.html',
      'national_scan_components.html',
      'statewide_vs_county.html',
      'informdata_source_list.html',
      'mvr_api.html'
    ],
    'page-legal': [
      'privacy-policy.html',
      'terms-of-service.html',
      'data-security.html',
      'cookie-policy.html',
      'accessibility-statement.html',
      'candidate-authorization.html'
    ],
    'page-docs': [
      'api_docs.html'
    ]
  };

  htmlFiles.forEach(file => {
    const content = readFile(file);
    if (!content) return;

    const fileName = path.basename(file);

    // Skip components
    if (file.includes('components/')) return;

    // Check expected page types
    let expectedType = null;
    for (const [type, files] of Object.entries(expectedPageTypes)) {
      if (files.includes(fileName)) {
        expectedType = type;
        break;
      }
    }

    if (expectedType) {
      if (content.includes(`class="${expectedType}"`)) {
        pass('Page Type Match', `${file} correctly has ${expectedType}`);
      } else {
        fail('Page Type Match', `${file} should have ${expectedType} but doesn't`);
      }
    }
  });
}

// ============================================================================
// TEST 6: Link and Reference Validation
// ============================================================================
function testLinksAndReferences() {
  section('TEST 6: Link and Reference Validation');

  const htmlFiles = getAllHtmlFiles('.');

  htmlFiles.forEach(file => {
    const content = readFile(file);
    if (!content) return;

    // Check for broken local references
    const localLinks = content.match(/href="(?!http|mailto|tel|#)([^"]+)"/g) || [];

    localLinks.forEach(link => {
      const href = link.match(/href="([^"]+)"/)[1];

      // Skip hash links and data attributes
      if (href.startsWith('#') || href.startsWith('data:')) return;

      // Construct full path relative to file location
      const fileDir = path.dirname(file);
      const targetPath = path.join(fileDir, href);

      if (fs.existsSync(targetPath)) {
        pass('Local Link', `${file}: ${href} exists`);
      } else {
        warn('Local Link', `${file}: ${href} may not exist at ${targetPath}`);
      }
    });

    // Check for CSS references
    const cssLinks = content.match(/href="[^"]*\.css"/g) || [];
    cssLinks.forEach(link => {
      const href = link.match(/href="([^"]+)"/)[1];
      const fileDir = path.dirname(file);
      const targetPath = path.join(fileDir, href);

      if (fs.existsSync(targetPath)) {
        pass('CSS Reference', `${file}: ${href} exists`);
      } else {
        fail('CSS Reference', `${file}: ${href} NOT FOUND at ${targetPath}`);
      }
    });

    // Check for JS script references
    const jsScripts = content.match(/src="[^"]*\.js"/g) || [];
    jsScripts.forEach(script => {
      const src = script.match(/src="([^"]+)"/)[1];

      // Skip CDN scripts
      if (src.startsWith('http')) return;

      const fileDir = path.dirname(file);
      const targetPath = path.join(fileDir, src);

      if (fs.existsSync(targetPath)) {
        pass('JS Reference', `${file}: ${src} exists`);
      } else {
        fail('JS Reference', `${file}: ${src} NOT FOUND at ${targetPath}`);
      }
    });
  });
}

// ============================================================================
// TEST 7: Tokens.css Validation
// ============================================================================
function testTokensCSS() {
  section('TEST 7: Tokens.css Validation');

  if (!fs.existsSync('styles/tokens.css')) {
    fail('Tokens CSS', 'styles/tokens.css does NOT exist');
    return;
  }

  const tokensContent = readFile('styles/tokens.css');
  if (!tokensContent) return;

  pass('Tokens CSS', 'styles/tokens.css exists');

  // Check for required CSS custom properties
  const requiredProperties = [
    '--bg',
    '--surface',
    '--border',
    '--text',
    '--muted',
    '--accent',
    '--accent-soft'
  ];

  requiredProperties.forEach(prop => {
    if (tokensContent.includes(prop)) {
      pass('CSS Variables', `${prop} is defined`);
    } else {
      fail('CSS Variables', `${prop} is NOT defined`);
    }
  });

  // Check for dark mode support
  if (tokensContent.includes('@media (prefers-color-scheme: dark)')) {
    pass('Dark Mode', 'Dark mode styles defined');
  } else {
    warn('Dark Mode', 'Dark mode styles may be missing');
  }

  // Check for reduced motion support
  if (tokensContent.includes('@media (prefers-reduced-motion: reduce)')) {
    pass('Reduced Motion', 'Reduced motion support defined');
  } else {
    warn('Reduced Motion', 'Reduced motion support may be missing');
  }

  // Check for utility classes
  const requiredUtilities = [
    '.mt-', '.mb-', '.ml-', '.mr-',
    '.pt-', '.pb-', '.pl-', '.pr-',
    '.gap-', '.text-', '.flex', '.grid'
  ];

  requiredUtilities.forEach(util => {
    if (tokensContent.includes(util)) {
      pass('Utility Classes', `${util} utilities are defined`);
    } else {
      warn('Utility Classes', `${util} utilities may be missing`);
    }
  });

  // Check for page-type styles
  const pageTypes = ['.page-product', '.page-legal', '.page-docs'];
  pageTypes.forEach(type => {
    if (tokensContent.includes(type)) {
      pass('Page Type Styles', `${type} styles defined`);
    } else {
      fail('Page Type Styles', `${type} styles NOT defined`);
    }
  });
}

// ============================================================================
// TEST 8: Responsive Design Elements
// ============================================================================
function testResponsiveDesign() {
  section('TEST 8: Responsive Design Elements');

  if (!fs.existsSync('styles/tokens.css')) {
    fail('Responsive Design', 'Cannot test - tokens.css missing');
    return;
  }

  const tokensContent = readFile('styles/tokens.css');
  if (!tokensContent) return;

  // Check for responsive breakpoints
  const breakpoints = [
    '@media (max-width: 640px)',
    '@media (min-width: 641px)'
  ];

  breakpoints.forEach(bp => {
    if (tokensContent.includes(bp)) {
      pass('Breakpoints', `${bp} is defined`);
    } else {
      warn('Breakpoints', `${bp} may be missing`);
    }
  });

  // Check for responsive grid classes
  if (tokensContent.includes('grid-template-columns: repeat(auto-fit')) {
    pass('Responsive Grids', 'Auto-fit grids implemented');
  } else {
    warn('Responsive Grids', 'Auto-fit grids may be missing');
  }
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================
function runAllTests() {
  console.log(`\n${colors.blue}${'═'.repeat(80)}${colors.reset}`);
  console.log(`${colors.blue}           VUPLICITY SYSTEM VALIDATION TEST SUITE${colors.reset}`);
  console.log(`${colors.blue}${'═'.repeat(80)}${colors.reset}\n`);

  const startTime = Date.now();

  // Run all test suites
  testHtmlStructure();
  testDesignSystem();
  testAccessibility();
  testComponentInclusion();
  testPageTypeClassification();
  testLinksAndReferences();
  testTokensCSS();
  testResponsiveDesign();

  // Print summary
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  console.log(`\n${colors.cyan}${'═'.repeat(80)}${colors.reset}`);
  console.log(`${colors.cyan}TEST SUMMARY${colors.reset}`);
  console.log(`${colors.cyan}${'═'.repeat(80)}${colors.reset}\n`);

  log(colors.green, '✓', `Passed: ${results.passed.length}`);
  log(colors.yellow, '⚠', `Warnings: ${results.warnings.length}`);
  log(colors.red, '✗', `Failed: ${results.failed.length}`);
  console.log(`\n${colors.blue}⏱  Duration: ${duration}s${colors.reset}\n`);

  // Exit with appropriate code
  if (results.failed.length > 0) {
    console.log(`${colors.red}❌ TESTS FAILED${colors.reset}\n`);
    process.exit(1);
  } else if (results.warnings.length > 0) {
    console.log(`${colors.yellow}⚠️  TESTS PASSED WITH WARNINGS${colors.reset}\n`);
    process.exit(0);
  } else {
    console.log(`${colors.green}✅ ALL TESTS PASSED${colors.reset}\n`);
    process.exit(0);
  }
}

// Run tests
runAllTests();
