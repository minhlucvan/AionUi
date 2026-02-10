# Layout Patterns Skill

## Common Page Layouts

### 1. Landing Page (Marketing)

```
┌─────────────────────────────────────┐
│           Navigation Bar            │
├─────────────────────────────────────┤
│                                     │
│           Hero Section              │
│     (Headline + CTA + Visual)       │
│                                     │
├─────────────────────────────────────┤
│         Logo Bar / Social Proof     │
├─────────────────────────────────────┤
│                                     │
│        Features Grid (3-col)        │
│                                     │
├─────────────────────────────────────┤
│                                     │
│      How It Works (Steps)           │
│                                     │
├─────────────────────────────────────┤
│         Testimonials                │
├─────────────────────────────────────┤
│          Pricing Cards              │
├─────────────────────────────────────┤
│            FAQ                      │
├─────────────────────────────────────┤
│          CTA Banner                 │
├─────────────────────────────────────┤
│            Footer                   │
└─────────────────────────────────────┘
```

### 2. Dashboard

```
┌────────┬────────────────────────────┐
│        │     Top Bar / Breadcrumb   │
│  Side  ├────────────────────────────┤
│  bar   │  Stats Cards (4-col)      │
│        ├────────────────────────────┤
│  Nav   │  Main Chart    │ Side     │
│        │                │ Panel    │
│        ├────────────────┤          │
│        │  Data Table    │          │
│        │                │          │
└────────┴────────────────┴──────────┘
```

### 3. Bento Grid

```
┌────────────┬──────────────────────┐
│            │                      │
│   Large    │       Medium         │
│   Card     │       Card           │
│            │                      │
├──────┬─────┼──────┬───────────────┤
│Small │Small│Small │               │
│ Card │Card │ Card │   Large Card  │
│      │     │      │               │
└──────┴─────┴──────┴───────────────┘
```

```html
<div class="grid grid-cols-4 gap-4">
  <div class="col-span-1 row-span-2 p-6 rounded-2xl bg-white dark:bg-gray-900 border">Large</div>
  <div class="col-span-3 p-6 rounded-2xl bg-white dark:bg-gray-900 border">Wide</div>
  <div class="col-span-1 p-6 rounded-2xl bg-white dark:bg-gray-900 border">Small</div>
  <div class="col-span-1 p-6 rounded-2xl bg-white dark:bg-gray-900 border">Small</div>
  <div class="col-span-1 p-6 rounded-2xl bg-white dark:bg-gray-900 border">Small</div>
</div>
```

## Section Patterns

### Hero Variants

#### Centered Hero (most common)
```html
<section class="pt-32 pb-20 lg:pt-44 lg:pb-32">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="max-w-3xl mx-auto text-center">
      <p class="text-sm font-semibold text-primary-600 uppercase tracking-wider mb-4">Tagline</p>
      <h1 class="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight">Headline</h1>
      <p class="mt-6 text-lg text-gray-600 dark:text-gray-400">Subheading text</p>
      <div class="mt-10 flex justify-center gap-4">
        <a href="#" class="px-8 py-3.5 bg-primary-600 text-white rounded-xl font-semibold">Primary CTA</a>
        <a href="#" class="px-8 py-3.5 bg-gray-100 dark:bg-gray-800 rounded-xl font-semibold">Secondary</a>
      </div>
    </div>
  </div>
</section>
```

#### Split Hero (text + image)
```html
<section class="pt-32 pb-20 lg:pt-44 lg:pb-32">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
      <div>
        <h1 class="text-4xl sm:text-5xl font-extrabold tracking-tight">Headline</h1>
        <p class="mt-6 text-lg text-gray-600 dark:text-gray-400">Description</p>
        <div class="mt-10 flex gap-4"><!-- CTAs --></div>
      </div>
      <div class="relative">
        <!-- Image/Illustration/Screenshot -->
      </div>
    </div>
  </div>
</section>
```

### Content Sections

#### Feature Grid (3-column)
```html
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
  <!-- Cards -->
</div>
```

#### Alternating Sections (zigzag)
```html
<!-- Row 1: Text Left, Image Right -->
<div class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
  <div><!-- Text --></div>
  <div><!-- Image --></div>
</div>

<!-- Row 2: Image Left, Text Right -->
<div class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
  <div class="lg:order-2"><!-- Text --></div>
  <div class="lg:order-1"><!-- Image --></div>
</div>
```

## Container Widths

| Class | Width | Use Case |
|-------|-------|----------|
| `max-w-sm` | 384px | Small dialogs, cards |
| `max-w-md` | 448px | Forms, modals |
| `max-w-lg` | 512px | Content cards |
| `max-w-xl` | 576px | Single-column content |
| `max-w-2xl` | 672px | Blog posts, articles |
| `max-w-3xl` | 768px | FAQ sections |
| `max-w-4xl` | 896px | Feature sections |
| `max-w-5xl` | 1024px | Pricing grids |
| `max-w-6xl` | 1152px | Wide content |
| `max-w-7xl` | 1280px | Full-width layouts (standard) |

## Spacing System

Use consistent spacing throughout:
- **Between sections**: `py-20 lg:py-32` (80px / 128px)
- **Section header to content**: `mb-16` (64px)
- **Between cards in a grid**: `gap-6` or `gap-8` (24px / 32px)
- **Inside cards**: `p-6 lg:p-8` (24px / 32px)
- **Between elements in cards**: `mb-4` or `mb-6` (16px / 24px)
- **Between text elements**: `mt-2` to `mt-4` (8px to 16px)
