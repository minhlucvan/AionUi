# Responsive Design Skill

## Breakpoint Strategy

Tailwind CSS breakpoints (mobile-first):

| Prefix | Min Width | Target Devices |
|--------|-----------|----------------|
| (none) | 0px | Mobile phones (portrait) |
| `sm:` | 640px | Mobile phones (landscape), small tablets |
| `md:` | 768px | Tablets (portrait) |
| `lg:` | 1024px | Tablets (landscape), laptops |
| `xl:` | 1280px | Desktops |
| `2xl:` | 1536px | Large desktops |

## Key Testing Widths

Always test at these widths:
- **375px** — iPhone SE / small phones
- **390px** — iPhone 14 / modern phones
- **768px** — iPad Mini / tablets
- **1024px** — iPad Pro / small laptops
- **1280px** — Standard desktop
- **1536px** — Large desktop

## Responsive Patterns

### Navigation

```html
<!-- Desktop: horizontal nav | Mobile: hamburger menu -->
<nav class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
  <div class="flex items-center justify-between h-16 lg:h-20">
    <!-- Logo (always visible) -->
    <a href="#" class="text-xl font-bold">Brand</a>

    <!-- Desktop nav (hidden on mobile) -->
    <div class="hidden lg:flex items-center gap-8">
      <a href="#">Link 1</a>
      <a href="#">Link 2</a>
    </div>

    <!-- Mobile menu button (hidden on desktop) -->
    <button class="lg:hidden p-2">Menu</button>
  </div>
</nav>
```

### Responsive Grid

```html
<!-- 1 col mobile → 2 col tablet → 3 col desktop -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

<!-- 1 col mobile → 2 col tablet → 4 col desktop -->
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

<!-- Stats row: stack on mobile, row on tablet+ -->
<div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
```

### Responsive Typography

```html
<!-- Hero heading -->
<h1 class="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-extrabold tracking-tight">

<!-- Section heading -->
<h2 class="text-2xl sm:text-3xl lg:text-4xl font-bold">

<!-- Body text -->
<p class="text-base lg:text-lg text-gray-600 dark:text-gray-400">
```

### Responsive Spacing

```html
<!-- Section padding -->
<section class="py-16 lg:py-24 xl:py-32">

<!-- Container padding -->
<div class="px-4 sm:px-6 lg:px-8">

<!-- Card padding -->
<div class="p-4 sm:p-6 lg:p-8">

<!-- Gap between elements -->
<div class="gap-4 md:gap-6 lg:gap-8">
```

### Responsive Images

```html
<!-- Full width on mobile, contained on desktop -->
<img src="..." alt="..." class="w-full max-w-2xl mx-auto rounded-2xl">

<!-- Aspect ratio container -->
<div class="aspect-video rounded-2xl overflow-hidden">
  <img src="..." alt="..." class="w-full h-full object-cover">
</div>
```

### Show/Hide by Breakpoint

```html
<!-- Only on mobile -->
<div class="block md:hidden">Mobile only</div>

<!-- Only on desktop -->
<div class="hidden lg:block">Desktop only</div>

<!-- Hidden on small screens, visible on medium+ -->
<div class="hidden sm:block">Tablet and up</div>
```

### Responsive Flex Direction

```html
<!-- Stack on mobile, row on desktop -->
<div class="flex flex-col lg:flex-row items-center gap-6">
  <div>Content 1</div>
  <div>Content 2</div>
</div>

<!-- CTA buttons: full width mobile, auto desktop -->
<div class="flex flex-col sm:flex-row gap-4">
  <a href="#" class="w-full sm:w-auto px-8 py-3 text-center bg-primary-600 text-white rounded-xl">Primary</a>
  <a href="#" class="w-full sm:w-auto px-8 py-3 text-center bg-gray-100 rounded-xl">Secondary</a>
</div>
```

## Touch-Friendly Design

### Minimum Touch Target: 44x44px

```html
<!-- Correct: large enough touch target -->
<button class="min-h-[44px] min-w-[44px] px-4 py-3">Click me</button>

<!-- For icon buttons -->
<button class="p-3" aria-label="Menu">
  <svg class="w-5 h-5">...</svg>
</button>
```

### Spacing for Touch

```html
<!-- Enough spacing between tappable items in lists -->
<nav class="space-y-1">
  <a href="#" class="block px-4 py-3 rounded-lg">Link 1</a>
  <a href="#" class="block px-4 py-3 rounded-lg">Link 2</a>
</nav>
```

## Common Responsive Anti-Patterns

| Anti-Pattern | Fix |
|-------------|-----|
| Horizontal scroll on mobile | Use `overflow-x-auto` on tables/carousels, or restructure layout |
| Text too small on mobile | Minimum 16px for body text on mobile |
| Touch targets too small | Minimum 44x44px for all interactive elements |
| Fixed-width elements | Use `w-full` with `max-w-*` constraints |
| Content overflowing viewport | Use `overflow-hidden` on parent or `break-words` on text |
| Images not scaling | Use `w-full h-auto` or `object-cover` with fixed aspect ratio |
