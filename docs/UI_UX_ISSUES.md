# UI/UX Issues Found - Junior Developer Blind Spots

## Critical Issues

### 1. **Tables Not Responsive on Mobile** ❌ CRITICAL
**Location**: All tables across the site (14+ instances)
**Issue**: Tables will break layout on small screens, causing horizontal scroll
**Impact**: Poor mobile UX, users can't see full table content
**Files**:
- accessibility-statement.html
- cookie-policy.html (3 tables)
- county_fee_breakdown.html
- databases_coverage.html (3 tables)
- And 7 more files...

**Fix**: Wrap all tables in `.table-wrapper` with `overflow-x: auto`

### 2. **Inline Event Handlers** ❌ CRITICAL
**Location**: index.html line 93, natcrim_overview.html lines 89, 112
**Issue**: Large inline onclick handlers violate CSP and maintainability
**Impact**: Security risk, debugging difficulty, code duplication
**Example**:
```html
<button onclick="document.getElementById('searchInput').value=''; ...">
```

**Fix**: Move to proper event listeners in script blocks

### 3. **Inline Style Attributes** ⚠️ MODERATE
**Location**: 16 instances across multiple files
**Issue**: Violates design system consistency, utility classes exist
**Files**:
- candidate-authorization.html (11 instances)
- county_fee_breakdown.html (2)
- databases_coverage.html (1)
- index.html (1)
- national_scan_components.html (1)

**Fix**: Replace with utility classes (mt-4, text-muted, etc.)

## UI/UX Polish Issues

### 4. **Missing Visited Link States** ⚠️
**Issue**: Links don't show visited state, users can't track navigation history
**Impact**: Poor navigation experience, accessibility issue
**Fix**: Add `:visited` styles to tokens.css

### 5. **No Print Styles** ⚠️
**Issue**: Pages will print poorly (dark backgrounds, wasted ink)
**Impact**: Professional documents can't be printed properly
**Fix**: Add `@media print` styles

### 6. **Tooltips Not Keyboard Accessible** ❌
**Location**: index.html summary cards (lines 47-61)
**Issue**: Tooltips only work on click, not keyboard navigation
**Impact**: Accessibility failure for keyboard-only users
**Fix**: Add keyboard event handlers (Enter, Space)

### 7. **Focus Indicators Could Be Stronger** ⚠️
**Issue**: Current focus ring is subtle, may not meet WCAG AAA
**Impact**: Keyboard navigation difficult to track
**Fix**: Enhance focus ring with thicker border and better contrast

### 8. **No Smooth Scroll Behavior** ℹ️
**Issue**: Jump-to-top button has no smooth animation
**Impact**: Jarring UX, feels unpolished
**Fix**: Add `scroll-behavior: smooth` to html element

### 9. **Empty State Button Has Inline onclick** ❌
**Location**: index.html line 93
**Issue**: 200+ character onclick handler, unmaintainable
**Impact**: Code quality, security
**Fix**: Extract to named function

### 10. **No Loading Skeleton for Dynamic Content** ℹ️
**Issue**: Cards section shows nothing while loading, then pops in
**Impact**: Layout shift, feels slow
**Fix**: Add skeleton loading state

### 11. **Tables Missing Caption Elements** ⚠️
**Issue**: Tables lack `<caption>` for screen readers
**Impact**: Accessibility - screen reader users can't understand table purpose
**Fix**: Add `<caption>` to all data tables

### 12. **No Dark Mode Transition** ℹ️
**Issue**: Switching dark mode (system preference) is instant, jarring
**Impact**: Poor UX when system changes themes
**Fix**: Add transition to color properties

### 13. **Chip Buttons Missing Type Attribute** ⚠️
**Issue**: Some chip buttons don't have `type="button"`, could submit forms
**Impact**: Unexpected form submission behavior
**Fix**: Add `type="button"` to all non-submit buttons

### 14. **Search Input Missing Clear Button** ℹ️
**Issue**: Users have to manually delete search text
**Impact**: Extra friction in UX
**Fix**: Add clear button with X icon when input has value

### 15. **No Touch Feedback on Mobile** ℹ️
**Issue**: Buttons don't show pressed state on mobile tap
**Impact**: Feels unresponsive, users may tap twice
**Fix**: Add `:active` transform for mobile feedback

### 16. **External Link Icons Inconsistent** ℹ️
**Issue**: Some external links have ↗ icon, others don't
**Impact**: Visual inconsistency, unclear which links leave site
**Fix**: Standardize external link indicator

### 17. **Form Inputs Missing Autocomplete** ⚠️
**Issue**: Search inputs lack `autocomplete` attributes
**Impact**: Browser can't help users with autofill
**Fix**: Add appropriate autocomplete values

### 18. **Code Blocks Not Scrollable** ⚠️
**Issue**: Long code blocks in docs may overflow
**Impact**: Content cut off, poor mobile experience
**Fix**: Ensure `overflow-x: auto` on `<pre>` elements

### 19. **No "Back to Top" Link in Footer** ℹ️
**Issue**: Users must scroll all the way up or use floating button
**Impact**: Extra effort on long pages
**Fix**: Add "Back to Top" link in footer

### 20. **Summary Cards Don't Show Units** ℹ️
**Issue**: Median margin shows "$0.00" but could use "per check" clarification
**Impact**: Slight confusion about metrics
**Fix**: Add subtle unit labels to summary cards

## Severity Legend
- ❌ CRITICAL: Must fix (accessibility, security, broken functionality)
- ⚠️ MODERATE: Should fix (UX issues, best practices)
- ℹ️ NICE-TO-HAVE: Polish items (enhances experience)

## Priority Order
1. Tables responsive (CRITICAL)
2. Remove inline event handlers (CRITICAL)
3. Replace inline styles (MODERATE)
4. Table captions for accessibility (MODERATE)
5. Visited link states (MODERATE)
6. Tooltip keyboard access (CRITICAL)
7. Button type attributes (MODERATE)
8. Print styles (MODERATE)
9. All others (NICE-TO-HAVE)

## Estimated Fix Time
- Critical issues: 2-3 hours
- Moderate issues: 2-3 hours
- Nice-to-have: 1-2 hours
- **Total: 5-8 hours**
