# Design System Skill

## Design Tokens

Design tokens are the atomic values that define a design system. Configure them in the Tailwind config.

### Color System

#### Neutral Colors (Gray Scale)

Use Tailwind's built-in gray scale. For a warmer feel, use `slate` or `zinc`. For cooler, use `gray` or `neutral`.

| Token | Light Mode | Dark Mode | Use Case |
|-------|-----------|-----------|----------|
| Background | `bg-white` | `dark:bg-gray-950` | Page background |
| Surface | `bg-gray-50` | `dark:bg-gray-900` | Card backgrounds, sections |
| Surface Hover | `bg-gray-100` | `dark:bg-gray-800` | Hover states |
| Border | `border-gray-200` | `dark:border-gray-800` | Borders, dividers |
| Text Primary | `text-gray-900` | `dark:text-white` | Headings |
| Text Secondary | `text-gray-600` | `dark:text-gray-400` | Body text |
| Text Tertiary | `text-gray-500` | `dark:text-gray-500` | Captions, labels |

#### Brand Colors

Define your primary and accent colors with full shade ranges:

```javascript
colors: {
  primary: {
    50: '#eff6ff',   // Tinted backgrounds
    100: '#dbeafe',  // Light backgrounds
    200: '#bfdbfe',  // Borders
    300: '#93c5fd',  // Icons (light)
    400: '#60a5fa',  // Icons (dark mode)
    500: '#3b82f6',  // Primary brand
    600: '#2563eb',  // Buttons, links
    700: '#1d4ed8',  // Hover states
    800: '#1e40af',  // Active states
    900: '#1e3a8a',  // Dark tints
    950: '#172554',  // Very dark tints
  }
}
```

#### Semantic Colors

```javascript
// In addition to primary, define:
colors: {
  success: { /* green shades */ },
  warning: { /* amber shades */ },
  danger: { /* red shades */ },
  info: { /* blue/cyan shades */ },
}
```

### Typography Scale

#### Font Sizes (Tailwind defaults)

| Class | Size | Line Height | Use Case |
|-------|------|-------------|----------|
| `text-xs` | 12px / 0.75rem | 16px | Badges, fine print |
| `text-sm` | 14px / 0.875rem | 20px | Body text, labels |
| `text-base` | 16px / 1rem | 24px | Default body |
| `text-lg` | 18px / 1.125rem | 28px | Large body, subtitles |
| `text-xl` | 20px / 1.25rem | 28px | Card titles |
| `text-2xl` | 24px / 1.5rem | 32px | Small headings |
| `text-3xl` | 30px / 1.875rem | 36px | Section subheadings |
| `text-4xl` | 36px / 2.25rem | 40px | Section headings |
| `text-5xl` | 48px / 3rem | 48px | Page headings |
| `text-6xl` | 60px / 3.75rem | 60px | Hero headings |

#### Font Weight Scale

| Class | Weight | Use Case |
|-------|--------|----------|
| `font-light` | 300 | Decorative large text |
| `font-normal` | 400 | Body text |
| `font-medium` | 500 | Emphasized text, labels |
| `font-semibold` | 600 | Buttons, nav links, subheadings |
| `font-bold` | 700 | Section headings |
| `font-extrabold` | 800 | Hero headings, page titles |

#### Heading Hierarchy

```html
<h1 class="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-gray-900 dark:text-white">
<h2 class="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
<h3 class="text-xl lg:text-2xl font-semibold text-gray-900 dark:text-white">
<h4 class="text-lg font-semibold text-gray-900 dark:text-white">
<p class="text-base lg:text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
<p class="text-sm text-gray-500 dark:text-gray-500">
```

### Spacing Scale

Use Tailwind's default spacing scale consistently:

| Class Value | Pixels | Common Use |
|-------------|--------|------------|
| 1 | 4px | Tight inline spacing |
| 2 | 8px | Icon-to-text gap |
| 3 | 12px | Compact list spacing |
| 4 | 16px | Default element spacing |
| 5 | 20px | Card internal padding |
| 6 | 24px | Card padding, grid gaps |
| 8 | 32px | Section internal spacing |
| 10 | 40px | Large element spacing |
| 12 | 48px | Section heading to content |
| 16 | 64px | Section header margin |
| 20 | 80px | Section padding |
| 24 | 96px | Large section padding |
| 32 | 128px | Hero section padding |

### Border Radius Scale

| Class | Radius | Use Case |
|-------|--------|----------|
| `rounded` | 4px | Badges, tags |
| `rounded-md` | 6px | Inputs, small buttons |
| `rounded-lg` | 8px | Buttons, dropdowns |
| `rounded-xl` | 12px | Cards, inputs |
| `rounded-2xl` | 16px | Large cards, modals |
| `rounded-3xl` | 24px | Hero images, sections |
| `rounded-full` | 9999px | Avatars, pills, circles |

### Shadow Scale

| Class | Use Case |
|-------|----------|
| `shadow-sm` | Buttons, inputs |
| `shadow` | Dropdown menus |
| `shadow-md` | Cards (default) |
| `shadow-lg` | Elevated cards, popovers |
| `shadow-xl` | Modals, dialogs |
| `shadow-2xl` | Hero cards, marketing |

### Colored Shadows

```html
<!-- Primary glow -->
<div class="shadow-lg shadow-primary-500/25">

<!-- Soft primary glow (subtle) -->
<div class="shadow-lg shadow-primary-500/10">
```

## Dark Mode Implementation

### Strategy: `class`-based

```javascript
tailwind.config = { darkMode: 'class' }
```

### Toggle with persistence

```javascript
// Check on load
if (localStorage.getItem('dark') === 'true' ||
    (!localStorage.getItem('dark') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
  document.documentElement.classList.add('dark');
}

// Toggle
function toggleDark() {
  document.documentElement.classList.toggle('dark');
  localStorage.setItem('dark', document.documentElement.classList.contains('dark'));
}
```

### Dark Mode Color Mapping

| Element | Light | Dark |
|---------|-------|------|
| Page BG | `bg-white` | `dark:bg-gray-950` |
| Card BG | `bg-white` | `dark:bg-gray-900` |
| Section BG | `bg-gray-50` | `dark:bg-gray-900/50` |
| Border | `border-gray-200` | `dark:border-gray-800` |
| Text primary | `text-gray-900` | `dark:text-white` |
| Text body | `text-gray-600` | `dark:text-gray-400` |
| Text muted | `text-gray-500` | `dark:text-gray-500` |
| Input BG | `bg-white` | `dark:bg-gray-800` |
| Input border | `border-gray-300` | `dark:border-gray-700` |
| Hover BG | `hover:bg-gray-100` | `dark:hover:bg-gray-800` |
| Focus ring offset | `focus:ring-offset-white` | `dark:focus:ring-offset-gray-950` |

## Theming: Switching Color Palettes

To make a theme switchable, define primary colors as CSS custom properties:

```html
<style>
  :root {
    --color-primary-500: 59 130 246;  /* blue */
    --color-primary-600: 37 99 235;
  }
  .theme-purple {
    --color-primary-500: 168 85 247;  /* purple */
    --color-primary-600: 147 51 234;
  }
  .theme-green {
    --color-primary-500: 34 197 94;   /* green */
    --color-primary-600: 22 163 74;
  }
</style>

<script>
  tailwind.config = {
    theme: {
      extend: {
        colors: {
          primary: {
            500: 'rgb(var(--color-primary-500) / <alpha-value>)',
            600: 'rgb(var(--color-primary-600) / <alpha-value>)',
          }
        }
      }
    }
  }
</script>
```
