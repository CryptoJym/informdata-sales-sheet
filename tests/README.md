# Vuplicity Test Suite

Comprehensive validation test suite for the Vuplicity website to ensure best practices, accessibility, and design system consistency.

## Running Tests

```bash
# Run validation tests
npm run test:validate

# Run all tests (unit tests + validation)
npm run test:all

# Or run validation directly
node tests/validation-suite.cjs
```

## Test Coverage

The test suite validates 8 critical areas:

### 1. **HTML Structure Validation**
- ✅ Valid HTML5 DOCTYPE and structure
- ✅ Required meta tags (viewport, charset)
- ✅ Title tags present
- ✅ Proper document hierarchy

### 2. **Design System Consistency**
- ✅ All pages use `tokens.css` (no inline `<style>` blocks)
- ✅ Minimal inline `style=` attributes
- ✅ Page type classification (`.page-product`, `.page-legal`, `.page-docs`)
- ✅ Unified design tokens across site

### 3. **Accessibility Requirements**
- ✅ `lang` attribute on `<html>`
- ✅ Skip navigation links
- ✅ `<main>` landmark with `id="main-content"`
- ✅ ARIA labels on navigation
- ✅ Images have `alt` text

### 4. **Component Inclusion System**
- ✅ `components/include.js` exists
- ✅ Required components exist (header, footer)
- ✅ All pages include header and footer
- ✅ Include script loaded on all pages

### 5. **Page Type Classification**
Validates correct page type classes:
- **Product pages** (`.page-product`): index, pricing, natcrim_overview, databases, etc.
- **Legal pages** (`.page-legal`): privacy-policy, terms-of-service, data-security, etc.
- **Documentation pages** (`.page-docs`): api_docs, SDK webhooks

### 6. **Link and Reference Validation**
- ✅ Local file links exist
- ✅ CSS references are valid
- ✅ JavaScript references are valid
- ✅ No broken internal links

### 7. **Tokens.css Validation**
- ✅ Required CSS custom properties defined
- ✅ Dark mode support (`prefers-color-scheme: dark`)
- ✅ Reduced motion support
- ✅ Comprehensive utility classes
- ✅ Page type-specific styles

### 8. **Responsive Design Elements**
- ✅ Mobile breakpoints defined
- ✅ Tablet breakpoints defined
- ✅ Auto-fit responsive grids

## Test Results

Current status: **✅ ALL TESTS PASS**

```
✓ Passed: 429
⚠ Warnings: 88
✗ Failed: 0

⏱ Duration: ~0.16s
```

## Understanding Warnings

Warnings are informational and don't indicate failures:

### Expected Warnings:
- **Skip links/ARIA labels**: Detected as missing because they're in the `header` component which is loaded dynamically
- **Component link paths**: Components use relative links that work when included in parent pages
- **Minimal inline styles**: A few strategic inline styles (11 in candidate-authorization) are acceptable for one-off layouts

### When to Investigate:
- If inline style count increases significantly
- If new pages missing page-type classification
- If new files don't follow design system

## Test File Structure

```
tests/
├── validation-suite.cjs   # Main test suite (CommonJS for Node.js)
└── README.md             # This file
```

## Adding New Tests

Edit `tests/validation-suite.cjs` and add new test functions following this pattern:

```javascript
function testNewFeature() {
  section('TEST X: New Feature Name');

  const htmlFiles = getAllHtmlFiles('.');

  htmlFiles.forEach(file => {
    const content = readFile(file);
    if (!content) return;

    // Your test logic here
    if (/* condition */) {
      pass('Test Name', `${file} passes test`);
    } else {
      fail('Test Name', `${file} fails test`);
    }
  });
}
```

Then add it to `runAllTests()`:

```javascript
function runAllTests() {
  // ... existing tests
  testNewFeature();
}
```

## Best Practices Enforced

1. **Single Source of Truth**: All styles in `tokens.css`
2. **No Duplication**: No inline `<style>` blocks
3. **Accessibility First**: WCAG 2.1 AA compliance
4. **Component-Based**: Reusable header/footer components
5. **Page Type Differentiation**: Distinct UX for different audiences
6. **Responsive Design**: Mobile-first approach
7. **Dark Mode Support**: System preference detection
8. **Performance**: Minimal inline styles, optimized CSS

## Continuous Integration

Add to your CI/CD pipeline:

```yaml
# .github/workflows/test.yml
- name: Run Validation Tests
  run: npm test
```

Tests exit with code `1` on failure, `0` on success (with or without warnings).

## Maintenance

Run tests before committing changes:

```bash
# Before commit
npm test

# If tests fail, fix issues and re-run
npm test
```

## License

Part of the Vuplicity project.
