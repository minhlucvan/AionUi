# UIUX ProMax Workspace

## Overview

This is a **single-file UI/UX design workspace** optimized for creating high-quality user interfaces. Every page is a self-contained HTML file with Tailwind CSS — no build tools, no npm, no bundlers. Open the HTML file in a browser and see your design instantly.

## Tech Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| HTML5 | Latest | Structure |
| Tailwind CSS | 3.x (Play CDN) | Utility-first styling |
| Google Fonts | Latest | Typography |
| Lucide Icons | Latest | Icon library (SVG) |
| Alpine.js | 3.x | Lightweight interactivity |

## Design Database

This workspace integrates with the **UI/UX ProMax Design Intelligence System**. Use the search scripts to find best practices, color palettes, typography pairings, and style recommendations.

```bash
# Search from workspace directory
python3 ../scripts/search.py "<query>" --domain <domain>

# Available domains: product, style, color, typography, landing, chart, ux, prompt
# Available stacks: html-tailwind, react, vue, nextjs, nuxtjs, svelte, shadcn

# Examples:
python3 ../scripts/search.py "saas dashboard" --domain product
python3 ../scripts/search.py "glassmorphism" --domain style
python3 ../scripts/search.py "elegant modern" --domain typography
python3 ../scripts/search.py "fintech" --domain color
python3 ../scripts/search.py "responsive layout" --stack html-tailwind
python3 ../scripts/search.py "animation best practices" --domain ux
```

## File Format — Single-File HTML

All UI/UX designs MUST follow this single-file HTML structure:

```html
<!DOCTYPE html>
<html lang="en" class="scroll-smooth">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Page Title</title>

  <!-- Tailwind CSS (Play CDN) -->
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          // Custom colors, fonts, animations here
        }
      }
    }
  </script>

  <!-- Google Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">

  <!-- Custom Styles (only what Tailwind can't do) -->
  <style>
    /* Custom animations, complex gradients, special effects */
  </style>
</head>
<body class="antialiased">
  <!-- ===== NAVIGATION ===== -->
  <!-- ===== HERO SECTION ===== -->
  <!-- ===== CONTENT SECTIONS ===== -->
  <!-- ===== FOOTER ===== -->

  <!-- Alpine.js (lightweight interactivity) -->
  <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>

  <!-- Page Scripts -->
  <script>
    // Dark mode toggle, scroll effects, interactions
  </script>
</body>
</html>
```

## Mandatory Rules

### 1. Always Use Tailwind CSS Play CDN

```html
<script src="https://cdn.tailwindcss.com"></script>
```

Never write raw CSS when a Tailwind utility class exists. Only use `<style>` blocks for:
- Custom `@keyframes` animations
- Complex gradient backgrounds that exceed Tailwind's utilities
- Pseudo-element effects (::before, ::after)
- Third-party library overrides

### 2. Tailwind Config Customization

Always configure the Tailwind config inline for custom design tokens:

```html
<script>
  tailwind.config = {
    darkMode: 'class',
    theme: {
      extend: {
        colors: {
          primary: { 50: '#eff6ff', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8' },
          accent: { 50: '#fdf4ff', 500: '#a855f7', 600: '#9333ea' },
        },
        fontFamily: {
          sans: ['Inter', 'system-ui', 'sans-serif'],
          display: ['Cabinet Grotesk', 'Inter', 'sans-serif'],
        },
        animation: {
          'fade-in': 'fadeIn 0.5s ease-out',
          'slide-up': 'slideUp 0.6s ease-out',
          'float': 'float 6s ease-in-out infinite',
        },
        keyframes: {
          fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
          slideUp: { '0%': { opacity: '0', transform: 'translateY(20px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
          float: { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-20px)' } },
        },
      }
    }
  }
</script>
```

### 3. Responsive Design — Mobile First

Always design mobile-first using Tailwind breakpoints:

```
sm: 640px   — Small tablets
md: 768px   — Tablets
lg: 1024px  — Laptops
xl: 1280px  — Desktops
2xl: 1536px — Large screens
```

Example:
```html
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
```

### 4. Dark Mode Support

Always implement dark mode using the `class` strategy:

```html
<html class="dark">
<body class="bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
```

### 5. Professional UI Standards

- **No emojis** in professional UIs — use icons (Lucide/Heroicons SVGs)
- **All clickable elements** must have `cursor-pointer`
- **Contrast ratio**: Minimum 4.5:1 for normal text, 3:1 for large text (WCAG AA)
- **Touch targets**: Minimum 44x44px on mobile
- **Consistent spacing**: Use Tailwind's spacing scale (4, 6, 8, 12, 16, 20, 24)
- **Max content width**: Use `max-w-7xl mx-auto` for content containers
- **Font sizes**: Follow typographic scale — don't use arbitrary sizes
- **Transitions**: Add `transition-all duration-200` on interactive elements
- **Focus states**: Always include `focus:ring-2 focus:ring-offset-2 focus:outline-none`
- **Hover states**: Every interactive element needs a hover state

### 6. Icon Integration

Use Lucide Icons via SVG or CDN:

```html
<!-- Option 1: Lucide CDN (recommended) -->
<script src="https://unpkg.com/lucide@latest"></script>
<script>lucide.createIcons();</script>

<!-- Usage -->
<i data-lucide="menu" class="w-5 h-5"></i>
<i data-lucide="search" class="w-5 h-5"></i>
<i data-lucide="user" class="w-5 h-5"></i>

<!-- Option 2: Inline SVG (for specific icons) -->
<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
</svg>
```

### 7. Alpine.js for Interactivity

Use Alpine.js for lightweight client-side interactivity:

```html
<!-- Dark mode toggle -->
<div x-data="{ dark: false }" x-init="dark = localStorage.getItem('dark') === 'true'"
     x-effect="document.documentElement.classList.toggle('dark', dark); localStorage.setItem('dark', dark)">
  <button @click="dark = !dark" class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
    <i x-show="!dark" data-lucide="moon" class="w-5 h-5"></i>
    <i x-show="dark" data-lucide="sun" class="w-5 h-5"></i>
  </button>
</div>

<!-- Mobile menu -->
<div x-data="{ open: false }">
  <button @click="open = !open">Menu</button>
  <nav x-show="open" x-transition class="absolute top-full left-0 w-full">
    <!-- Menu items -->
  </nav>
</div>

<!-- Tab component -->
<div x-data="{ tab: 'features' }">
  <button @click="tab = 'features'" :class="tab === 'features' ? 'border-primary-500' : ''">Features</button>
  <button @click="tab = 'pricing'" :class="tab === 'pricing' ? 'border-primary-500' : ''">Pricing</button>
  <div x-show="tab === 'features'">Features content</div>
  <div x-show="tab === 'pricing'">Pricing content</div>
</div>
```

### 8. Image Handling

For placeholder images use these services:

```html
<!-- Unsplash (photo placeholders) -->
<img src="https://images.unsplash.com/photo-XXXXX?w=800&h=600&fit=crop" alt="Description">

<!-- UI Faces (avatar placeholders) -->
<img src="https://i.pravatar.cc/150?img=1" alt="User avatar" class="w-10 h-10 rounded-full">

<!-- Placeholder boxes (when no image needed) -->
<div class="bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900 dark:to-primary-800 rounded-xl aspect-video flex items-center justify-center">
  <i data-lucide="image" class="w-12 h-12 text-primary-400"></i>
</div>
```

## Design Workflow

### Step 1: Research
Before creating any UI, search the design database:

```bash
python3 ../scripts/search.py "<product type>" --domain product   # Get style recommendations
python3 ../scripts/search.py "<style>" --domain style            # Get implementation details
python3 ../scripts/search.py "<industry>" --domain color         # Get color palette
python3 ../scripts/search.py "<mood>" --domain typography        # Get font pairing
python3 ../scripts/search.py "best practices" --domain ux        # Get UX guidelines
```

### Step 2: Create
Start with `index.html` as the base template or create a new file in `pages/`.

### Step 3: Iterate
Open the HTML file in a browser. Make changes and refresh. No build step needed.

## Code Organization

Organize sections in this order within the HTML file:

```
1. HEAD
   ├── Meta tags
   ├── Tailwind CDN + config
   ├── Google Fonts
   └── Custom <style> (minimal)

2. BODY
   ├── Navigation / Header
   ├── Hero Section
   ├── Feature Sections
   ├── Social Proof / Testimonials
   ├── Pricing (if applicable)
   ├── CTA Section
   ├── Footer
   ├── Alpine.js CDN
   ├── Lucide Icons CDN
   └── Page Scripts
```

## Output Directory

- **`index.html`** — Main/default page template
- **`pages/`** — Additional pages (about, pricing, dashboard, etc.)
- **`components/`** — Reference component snippets (for copy-paste)

## Pre-Delivery Checklist

Before considering any page complete, verify:

- [ ] **Responsive**: Works on mobile (375px), tablet (768px), desktop (1280px)
- [ ] **Dark mode**: All elements properly styled in both light and dark
- [ ] **Hover/Focus states**: Every interactive element has visible feedback
- [ ] **Typography hierarchy**: Clear heading structure (h1 > h2 > h3)
- [ ] **Color contrast**: Meets WCAG AA (4.5:1 for text)
- [ ] **Touch targets**: Minimum 44x44px on mobile
- [ ] **Loading performance**: No unnecessary large libraries
- [ ] **Semantic HTML**: Proper use of `<nav>`, `<main>`, `<section>`, `<article>`, `<footer>`
- [ ] **Alt text**: All images have descriptive alt attributes
- [ ] **Smooth transitions**: Interactive elements use `transition-all duration-200`
- [ ] **Consistent spacing**: Using Tailwind's spacing scale consistently
- [ ] **Max content width**: Content doesn't stretch full-width on large screens
