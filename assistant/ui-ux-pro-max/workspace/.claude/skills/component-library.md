# Component Library Skill

## Buttons

### Primary Button
```html
<button class="inline-flex items-center justify-center px-6 py-3 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-950 cursor-pointer">
  Button Text
</button>
```

### Secondary Button
```html
<button class="inline-flex items-center justify-center px-6 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 dark:focus:ring-offset-gray-950 cursor-pointer">
  Button Text
</button>
```

### Ghost Button
```html
<button class="inline-flex items-center justify-center px-6 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 dark:focus:ring-offset-gray-950 cursor-pointer">
  Button Text
</button>
```

### Outline Button
```html
<button class="inline-flex items-center justify-center px-6 py-3 text-sm font-semibold text-primary-600 dark:text-primary-400 border-2 border-primary-300 dark:border-primary-700 hover:bg-primary-50 dark:hover:bg-primary-950 rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-950 cursor-pointer">
  Button Text
</button>
```

### Button Sizes
```html
<!-- Small -->
<button class="px-4 py-2 text-xs font-semibold rounded-lg ...">Small</button>
<!-- Medium (default) -->
<button class="px-6 py-3 text-sm font-semibold rounded-xl ...">Medium</button>
<!-- Large -->
<button class="px-8 py-3.5 text-base font-semibold rounded-xl ...">Large</button>
```

## Cards

### Basic Card
```html
<div class="p-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
  <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Title</h3>
  <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">Description text here.</p>
</div>
```

### Interactive Card
```html
<div class="group p-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-lg hover:shadow-primary-500/5 transition-all duration-300 cursor-pointer">
  <div class="w-12 h-12 flex items-center justify-center rounded-xl bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400 mb-4 group-hover:scale-110 transition-transform duration-300">
    <!-- Icon -->
  </div>
  <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Title</h3>
  <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">Description</p>
</div>
```

### Glassmorphism Card
```html
<div class="p-6 rounded-2xl bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 shadow-xl">
  <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Title</h3>
  <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">Description</p>
</div>
```

## Form Elements

### Text Input
```html
<div>
  <label for="email" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email</label>
  <input type="email" id="email" placeholder="you@example.com"
    class="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200">
</div>
```

### Select
```html
<div>
  <label for="plan" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Plan</label>
  <select id="plan"
    class="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 cursor-pointer appearance-none">
    <option>Starter</option>
    <option>Pro</option>
    <option>Enterprise</option>
  </select>
</div>
```

### Checkbox
```html
<label class="flex items-center gap-3 cursor-pointer">
  <input type="checkbox" class="w-5 h-5 rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500 focus:ring-offset-0 cursor-pointer">
  <span class="text-sm text-gray-700 dark:text-gray-300">I agree to the terms</span>
</label>
```

## Badges

```html
<!-- Default -->
<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">Default</span>

<!-- Primary -->
<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300">Primary</span>

<!-- Success -->
<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300">Success</span>

<!-- Warning -->
<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300">Warning</span>

<!-- Danger -->
<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300">Danger</span>
```

## Avatars

```html
<!-- Avatar Group -->
<div class="flex -space-x-3">
  <img src="https://i.pravatar.cc/40?img=1" alt="User" class="w-10 h-10 rounded-full border-2 border-white dark:border-gray-900">
  <img src="https://i.pravatar.cc/40?img=2" alt="User" class="w-10 h-10 rounded-full border-2 border-white dark:border-gray-900">
  <img src="https://i.pravatar.cc/40?img=3" alt="User" class="w-10 h-10 rounded-full border-2 border-white dark:border-gray-900">
  <div class="w-10 h-10 rounded-full border-2 border-white dark:border-gray-900 bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-400">+5</div>
</div>
```

## Navigation

### Sticky Header
```html
<header class="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-gray-950/80 backdrop-blur-lg border-b border-gray-200/50 dark:border-gray-800/50">
  <nav class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 lg:h-20 flex items-center justify-between">
    <!-- Logo -->
    <!-- Nav Links -->
    <!-- Actions -->
  </nav>
</header>
```

### Sidebar Navigation
```html
<aside class="fixed left-0 top-0 bottom-0 w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 p-4 overflow-y-auto">
  <!-- Logo -->
  <div class="px-3 mb-8">Logo</div>

  <!-- Nav Items -->
  <nav class="space-y-1">
    <a href="#" class="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-300">
      <!-- Active item -->
    </a>
    <a href="#" class="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200">
      <!-- Inactive item -->
    </a>
  </nav>
</aside>
```

## Alerts/Notifications

```html
<!-- Info -->
<div class="flex items-start gap-3 p-4 rounded-xl bg-primary-50 dark:bg-primary-950 border border-primary-200 dark:border-primary-800">
  <svg class="w-5 h-5 text-primary-600 dark:text-primary-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
  <div>
    <p class="text-sm font-semibold text-primary-800 dark:text-primary-200">Info</p>
    <p class="text-sm text-primary-700 dark:text-primary-300 mt-1">This is an informational message.</p>
  </div>
</div>

<!-- Success -->
<div class="flex items-start gap-3 p-4 rounded-xl bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
  <svg class="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
  <div>
    <p class="text-sm font-semibold text-green-800 dark:text-green-200">Success</p>
    <p class="text-sm text-green-700 dark:text-green-300 mt-1">Operation completed successfully.</p>
  </div>
</div>
```

## Tables

```html
<div class="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800">
  <table class="w-full text-sm">
    <thead class="bg-gray-50 dark:bg-gray-800/50">
      <tr>
        <th class="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
        <th class="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
        <th class="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Role</th>
      </tr>
    </thead>
    <tbody class="divide-y divide-gray-200 dark:divide-gray-800 bg-white dark:bg-gray-900">
      <tr class="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-150">
        <td class="px-6 py-4 text-gray-900 dark:text-white font-medium">Jane Cooper</td>
        <td class="px-6 py-4"><span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300">Active</span></td>
        <td class="px-6 py-4 text-gray-600 dark:text-gray-400">Admin</td>
      </tr>
    </tbody>
  </table>
</div>
```
