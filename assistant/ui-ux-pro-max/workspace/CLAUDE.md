# UIUX ProMax Workspace

> For design workflow, search commands, professional UI rules, and the pre-delivery checklist, see the parent skill: `../ui-ux-pro-max.md`

## Workspace Format

This workspace produces **single-file HTML pages** — no build tools, no npm. Open any `.html` file directly in a browser.

### Tech Stack

| Technology | Purpose | Load Method |
|-----------|---------|-------------|
| Tailwind CSS 3.x | Utility-first styling | `<script src="https://cdn.tailwindcss.com"></script>` |
| Alpine.js 3.x | Lightweight interactivity | `<script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>` |
| Lucide Icons | SVG icon library | `<script src="https://unpkg.com/lucide@latest"></script>` |
| Google Fonts | Typography | `<link>` in `<head>` |

### HTML Template Structure

Every page MUST follow this skeleton:

```html
<!DOCTYPE html>
<html lang="en" class="scroll-smooth">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Page Title</title>

  <!-- 1. Tailwind CSS Play CDN + inline config -->
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: { extend: { /* custom colors, fonts, animations */ } }
    }
  </script>

  <!-- 2. Google Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">

  <!-- 3. Custom CSS (only what Tailwind can't do: @keyframes, ::before/::after, complex gradients) -->
  <style></style>
</head>
<body class="font-sans antialiased bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
  <!-- Navigation -->
  <!-- Hero -->
  <!-- Content Sections -->
  <!-- Footer -->

  <!-- 4. Alpine.js + Lucide Icons + Page Scripts (at end of body) -->
  <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
  <script src="https://unpkg.com/lucide@latest"></script>
  <script>
    document.addEventListener('DOMContentLoaded', () => { if (window.lucide) lucide.createIcons(); });
  </script>
</body>
</html>
```

### Mandatory Rules

1. **Tailwind-first** — Never write raw CSS when a utility class exists. Only use `<style>` for `@keyframes`, `::before/::after`, and complex gradients.
2. **Inline Tailwind config** — Define custom design tokens (colors, fonts, animations) in `tailwind.config` within the `<script>` tag.
3. **Dark mode via `class`** — Always use `darkMode: 'class'` and provide `dark:` variants for all elements.
4. **Mobile-first** — Start with mobile layout, use `sm:`, `md:`, `lg:`, `xl:` breakpoints to scale up.

### Icon Integration

```html
<!-- Lucide CDN (recommended) -->
<i data-lucide="menu" class="w-5 h-5"></i>

<!-- Inline SVG (when you need a specific icon without Lucide) -->
<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
</svg>
```

### Alpine.js Patterns

```html
<!-- Dark mode toggle -->
<div x-data="{ dark: false }" x-init="dark = localStorage.getItem('dark') === 'true'"
     x-effect="document.documentElement.classList.toggle('dark', dark); localStorage.setItem('dark', dark)">
  <button @click="dark = !dark">Toggle</button>
</div>

<!-- Mobile menu -->
<div x-data="{ open: false }">
  <button @click="open = !open">Menu</button>
  <nav x-show="open" x-transition><!-- links --></nav>
</div>

<!-- Tabs -->
<div x-data="{ tab: 'a' }">
  <button @click="tab = 'a'" :class="tab === 'a' && 'border-primary-500'">Tab A</button>
  <div x-show="tab === 'a'">Content A</div>
</div>

<!-- Accordion -->
<div x-data="{ open: null }">
  <button @click="open = open === 1 ? null : 1">Item 1</button>
  <div x-show="open === 1" x-transition>Content</div>
</div>
```

### Image Placeholders

```html
<!-- Avatars -->
<img src="https://i.pravatar.cc/150?img=1" alt="User avatar" class="w-10 h-10 rounded-full">

<!-- Gradient placeholder (no external dependency) -->
<div class="bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900 dark:to-primary-800 rounded-xl aspect-video flex items-center justify-center">
  <i data-lucide="image" class="w-12 h-12 text-primary-400"></i>
</div>
```

## Output Directories

| Path | Purpose |
|------|---------|
| `index.html` | Default starter / main page |
| `pages/` | Additional pages |
| `components/` | Reference component templates |

## Section Order Within a Page

```
HEAD → Meta → Tailwind CDN + config → Google Fonts → Custom <style>
BODY → Nav → Hero → Features → Social Proof → Pricing → CTA → Footer → Alpine.js → Lucide → Scripts
```
