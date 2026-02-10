# Accessibility Skill

## Quick Reference: WCAG AA Requirements

### Color Contrast

| Content Type | Minimum Ratio | Example |
|-------------|---------------|---------|
| Normal text (<18px) | 4.5:1 | `text-gray-600` on white bg |
| Large text (>=18px bold, >=24px) | 3:1 | `text-gray-500` on white bg |
| UI components & graphics | 3:1 | Borders, icons, form controls |

### Safe Color Combinations

#### Light Mode
```html
<!-- Body text on white: gray-600 = 5.74:1 ✓ -->
<p class="text-gray-600">Safe body text</p>

<!-- Muted text on white: gray-500 = 4.64:1 ✓ (just passes) -->
<p class="text-gray-500">Muted but accessible</p>

<!-- Heading on white: gray-900 = 17.4:1 ✓ -->
<h2 class="text-gray-900">Heading</h2>

<!-- Primary on white: primary-600 ≈ 4.7:1 ✓ -->
<a class="text-primary-600">Link text</a>
```

#### Dark Mode
```html
<!-- Body text on gray-950: gray-400 ≈ 5.5:1 ✓ -->
<p class="dark:text-gray-400">Safe body text</p>

<!-- Heading on gray-950: white = 18.1:1 ✓ -->
<h2 class="dark:text-white">Heading</h2>

<!-- Primary on gray-950: primary-400 ≈ 5.1:1 ✓ -->
<a class="dark:text-primary-400">Link text</a>
```

### Dangerous Color Combinations (AVOID)

```html
<!-- ✗ gray-400 on white = 3.13:1 — FAILS for normal text -->
<p class="text-gray-400">Not accessible</p>

<!-- ✗ gray-500 on gray-50 = 4.18:1 — FAILS for normal text -->
<p class="text-gray-500 bg-gray-50">Not accessible</p>

<!-- ✗ primary-400 on white ≈ 3.0:1 — FAILS -->
<a class="text-primary-400">Not accessible</a>
```

## Keyboard Navigation

### Focus Indicators

```html
<!-- Default focus ring (use on all interactive elements) -->
<button class="focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-950">

<!-- Visible focus for links -->
<a class="focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded-lg">
```

### Skip Navigation

```html
<!-- First element in <body> -->
<a href="#main-content" class="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-primary-600 focus:text-white focus:rounded-lg focus:text-sm focus:font-semibold">
  Skip to main content
</a>

<!-- Main content landmark -->
<main id="main-content">
```

### Focus Trap (for Modals)

```javascript
function trapFocus(element) {
  const focusable = element.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  element.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
    if (e.key === 'Escape') { closeModal(); }
  });

  first.focus();
}
```

## Semantic HTML Checklist

```html
<!-- ✓ Use semantic elements -->
<header>   <!-- Site header / navigation -->
<nav>      <!-- Navigation links -->
<main>     <!-- Primary content (one per page) -->
<section>  <!-- Thematic grouping with heading -->
<article>  <!-- Self-contained content -->
<aside>    <!-- Sidebar / supplementary -->
<footer>   <!-- Site footer -->

<!-- ✓ Use heading hierarchy (don't skip levels) -->
<h1>Page Title</h1>        <!-- One per page -->
  <h2>Section Title</h2>
    <h3>Subsection</h3>
  <h2>Another Section</h2>

<!-- ✓ Use lists for groups -->
<ul>  <!-- Unordered list (nav items, features) -->
<ol>  <!-- Ordered list (steps, rankings) -->

<!-- ✓ Use figure for images with captions -->
<figure>
  <img src="..." alt="Description">
  <figcaption>Caption text</figcaption>
</figure>
```

## Form Accessibility

```html
<form aria-label="Contact form">
  <!-- Label + Input (correctly associated) -->
  <div>
    <label for="name" class="block text-sm font-medium mb-2">Full Name <span class="text-red-500" aria-hidden="true">*</span></label>
    <input type="text" id="name" name="name" required aria-required="true"
      class="w-full px-4 py-3 rounded-xl border ..."
      aria-describedby="name-help">
    <p id="name-help" class="mt-1.5 text-xs text-gray-500">Enter your first and last name</p>
  </div>

  <!-- Error State -->
  <div>
    <label for="email" class="block text-sm font-medium mb-2">Email</label>
    <input type="email" id="email" aria-invalid="true" aria-describedby="email-error"
      class="w-full px-4 py-3 rounded-xl border-red-500 ...">
    <p id="email-error" role="alert" class="mt-1.5 text-xs text-red-600">Please enter a valid email address</p>
  </div>

  <!-- Button -->
  <button type="submit" class="px-6 py-3 bg-primary-600 text-white rounded-xl font-semibold">
    Submit
  </button>
</form>
```

## Image Accessibility

```html
<!-- Informative image: describe the content -->
<img src="chart.png" alt="Bar chart showing 45% increase in Q3 revenue">

<!-- Decorative image: empty alt -->
<img src="decoration.svg" alt="" role="presentation">

<!-- Complex image: use figure + description -->
<figure>
  <img src="diagram.png" alt="System architecture diagram" aria-describedby="diagram-desc">
  <figcaption id="diagram-desc">The system consists of three layers: presentation, business logic, and data access.</figcaption>
</figure>

<!-- Icon buttons: aria-label -->
<button aria-label="Close dialog">
  <svg class="w-5 h-5" ...></svg>
</button>
```

## Screen Reader Utility

```html
<!-- Visually hidden but accessible to screen readers -->
<span class="sr-only">Open menu</span>

<!-- Tailwind's sr-only class is equivalent to: -->
<style>
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
</style>
```

## Live Regions for Dynamic Content

```html
<!-- Polite: waits for user to finish current task -->
<div aria-live="polite" class="sr-only">
  <!-- JS updates this with status messages -->
</div>

<!-- Assertive: interrupts immediately (use sparingly) -->
<div aria-live="assertive" role="alert" class="sr-only">
  <!-- JS updates this with critical alerts -->
</div>
```
