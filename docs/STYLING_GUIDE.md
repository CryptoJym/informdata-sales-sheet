# Universal Styling Guide

This document describes the universal design system available in `styles/tokens.css`. All pages should use these shared styles instead of duplicating CSS.

## Design Tokens

### Colors
```css
--bg: #f6f7fb;           /* Page background */
--surface: #ffffff;      /* Card/panel backgrounds */
--border: #d4dae5;       /* Border color */
--text: #111827;         /* Primary text */
--muted: #667085;        /* Secondary/muted text */
--accent: #2563eb;       /* Primary accent (blue) */
--accent-soft: #e0e9ff;  /* Light accent background */
--danger: #b91c1c;       /* Error/danger states */
--success: #166534;      /* Success states */
```

### Typography
```css
--font-sans: 'Inter', system-ui, ...
--fs-xxl: 2.5rem;        /* Extra large headings */
--fs-xl: 2.1rem;         /* Large headings */
--fs-lg: 1.4rem;         /* Medium headings */
--fs-md: 1rem;           /* Body text */
--fs-sm: 0.9rem;         /* Small text */
--fs-xs: 0.85rem;        /* Extra small text */
--lh: 1.6;               /* Line height */
```

### Spacing
```css
--space-1: 0.25rem;      /* 4px */
--space-2: 0.5rem;       /* 8px */
--space-3: 0.75rem;      /* 12px */
--space-4: 1rem;         /* 16px */
--space-5: 1.25rem;      /* 20px */
--space-6: 1.5rem;       /* 24px */
--space-8: 2rem;         /* 32px */
```

### Border Radius
```css
--radius-sm: 0.4rem;
--radius-md: 0.65rem;
--radius-lg: 0.9rem;
--radius-xl: 1rem;
--radius-pill: 999px;
```

### Shadows
```css
--shadow-sm: 0 4px 12px rgba(15, 23, 42, 0.06);
--shadow-md: 0 8px 18px rgba(15, 23, 42, 0.08);
--shadow-lg: 0 10px 24px rgba(15, 23, 42, 0.10);
```

## Layout Components

### Page Containers
```html
<!-- Standard page wrapper (1240px max-width) -->
<div class="page">...</div>

<!-- Alternative main wrapper (1200px max-width) -->
<main>...</main>

<!-- Generic container -->
<div class="container">...</div>
```

### Cards
```html
<!-- Basic card -->
<div class="card">...</div>

<!-- Card as a section (includes padding and gap) -->
<section class="card">...</section>
```

### Grids
```html
<!-- 2-column responsive grid -->
<div class="grid-2">...</div>

<!-- 3-column responsive grid -->
<div class="grid-3">...</div>

<!-- 4-column responsive grid -->
<div class="grid-4">...</div>

<!-- Stat grid (220px min columns) -->
<div class="stat-grid">
  <div class="stat-card">
    <strong>1.23B</strong>
    <span>Total records</span>
  </div>
</div>
```

## Typography

### Headings
```html
<h1>Main heading</h1>          <!-- 2.5rem, weight 700 -->
<h2>Section heading</h2>        <!-- 1.4rem, weight 700 -->
<h3>Subsection heading</h3>     <!-- weight 600 -->
```

### Text Styles
```html
<p class="lead">Lead paragraph with muted color</p>
<p class="note">Small muted note text</p>
<p class="text-muted">Muted text utility</p>
```

### Hero Sections
```html
<header class="hero">
  <h1>Large hero title</h1>
  <p>Hero description with muted color</p>
</header>
```

## Interactive Components

### Buttons
```html
<!-- Primary button -->
<button class="btn btn-primary">Primary Action</button>
<a href="#" class="btn btn-primary">Primary Link</a>

<!-- Outline button -->
<button class="btn btn-outline">Secondary Action</button>
<a href="#" class="btn btn-outline">Secondary Link</a>
```

### Navigation
```html
<nav class="nav">
  <a href="#">Link 1</a>
  <a href="#">Link 2</a>
  <a href="#">Link 3</a>
</nav>
```

### Chips (Toggleable filters)
```html
<div class="filters">
  <button class="chip">Filter Option</button>
  <button class="chip active">Active Filter</button>
</div>
```

### Pills
```html
<div class="pill-grid">
  <span class="pill">Status Badge</span>
  <span class="pill">Another Badge</span>
</div>
```

## Forms

### Form Controls
```html
<div class="controls">
  <div>
    <label for="field1">Field Label</label>
    <input type="text" id="field1" />
  </div>
  <div>
    <label for="field2">Select Label</label>
    <select id="field2">
      <option>Option 1</option>
    </select>
  </div>
</div>
```

### Filter Panel
```html
<div class="filter-panel">
  <div>
    <label for="search">Search</label>
    <input type="search" id="search" />
  </div>
  <div class="filters">
    <button class="chip">Category 1</button>
    <button class="chip active">Category 2</button>
  </div>
</div>
```

## Tables

```html
<table>
  <thead>
    <tr>
      <th>Column 1</th>
      <th>Column 2</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Data 1</td>
      <td>Data 2</td>
    </tr>
  </tbody>
</table>
```

Tables automatically get:
- Alternating row backgrounds
- Border styling
- Responsive overflow

## Code Blocks

```html
<!-- Inline code -->
<p>Use the <code>API_KEY</code> variable</p>

<!-- Code block -->
<pre><code>{
  "key": "value"
}</code></pre>
```

## Callouts

```html
<div class="callout">
  <strong>Important Note</strong>
  <p>Callout content with left accent border</p>
</div>
```

## Links

```html
<!-- Link collection -->
<div class="links">
  <a href="#">Download</a>
  <a href="#">Documentation</a>
  <a href="#">GitHub</a>
</div>
```

## Utility Classes

### Spacing
```html
<div class="mt-0">No margin top</div>
<div class="mb-0">No margin bottom</div>
<div class="mt-1">1rem margin top</div>
<div class="mb-1">1rem margin bottom</div>
```

### Gap Utilities
```html
<div class="grid-2 gap-sm">Small gap (0.5rem)</div>
<div class="grid-2 gap-md">Medium gap (1rem)</div>
<div class="grid-2 gap-lg">Large gap (1.5rem)</div>
```

### Display
```html
<div class="hidden">Hidden element</div>
<div class="text-center">Centered text</div>
```

## Responsive Design

All components are mobile-responsive. At 640px and below:
- `.page` and `main` get reduced padding
- All grids become single-column
- Headings scale down
- `.controls` becomes single-column

## Best Practices

### DO ✅
- Use tokens.css classes for all common patterns
- Use CSS custom properties (variables) for colors and spacing
- Add `<link rel="stylesheet" href="styles/tokens.css" />` to all pages
- Keep page-specific styles minimal and in inline `<style>` tags

### DON'T ❌
- Duplicate common styles across pages
- Hard-code color values - use `var(--accent)` instead
- Create new button styles - use `.btn` variants
- Override tokens.css styles unnecessarily

## Example Page Structure

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Page Title</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="styles/tokens.css" />
  <style>
    /* Only page-specific styles here */
  </style>
</head>
<body>
  <div data-include="components/header.html"></div>

  <main>
    <section class="card">
      <h1>Page Title</h1>
      <p class="lead">Lead paragraph explaining the page</p>
    </section>

    <section class="card">
      <h2>Section Title</h2>
      <!-- Content -->
    </section>
  </main>

  <script src="components/include.js" defer></script>
</body>
</html>
```

## Maintenance

When adding new common patterns:
1. Add the styles to `styles/tokens.css`
2. Update this documentation
3. Use the new styles across existing pages
4. Remove duplicated inline styles

## Migration Checklist

When updating an existing page:
- [ ] Add `<link rel="stylesheet" href="styles/tokens.css" />`
- [ ] Replace custom `.page`/`main` styles with tokens.css version
- [ ] Replace custom button styles with `.btn` classes
- [ ] Replace custom form styles with tokens.css versions
- [ ] Replace custom table styles with tokens.css version
- [ ] Replace hard-coded colors with CSS custom properties
- [ ] Remove duplicated styles from inline `<style>` tags
- [ ] Test responsive behavior at mobile breakpoint
