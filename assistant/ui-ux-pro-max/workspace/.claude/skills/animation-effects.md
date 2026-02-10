# Animation & Effects Skill

## CSS Animations via Tailwind Config

Define custom animations in the Tailwind config:

```javascript
tailwind.config = {
  theme: {
    extend: {
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out forwards',
        'fade-in-up': 'fadeInUp 0.6s ease-out forwards',
        'fade-in-down': 'fadeInDown 0.6s ease-out forwards',
        'slide-in-left': 'slideInLeft 0.6s ease-out forwards',
        'slide-in-right': 'slideInRight 0.6s ease-out forwards',
        'scale-in': 'scaleIn 0.4s ease-out forwards',
        'float': 'float 6s ease-in-out infinite',
        'pulse-soft': 'pulseSoft 3s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'bounce-in': 'bounceIn 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        fadeInUp: { '0%': { opacity: '0', transform: 'translateY(24px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        fadeInDown: { '0%': { opacity: '0', transform: 'translateY(-24px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        slideInLeft: { '0%': { opacity: '0', transform: 'translateX(-24px)' }, '100%': { opacity: '1', transform: 'translateX(0)' } },
        slideInRight: { '0%': { opacity: '0', transform: 'translateX(24px)' }, '100%': { opacity: '1', transform: 'translateX(0)' } },
        scaleIn: { '0%': { opacity: '0', transform: 'scale(0.9)' }, '100%': { opacity: '1', transform: 'scale(1)' } },
        float: { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-20px)' } },
        pulseSoft: { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.7' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        bounceIn: { '0%': { opacity: '0', transform: 'scale(0.3)' }, '50%': { transform: 'scale(1.05)' }, '70%': { transform: 'scale(0.9)' }, '100%': { opacity: '1', transform: 'scale(1)' } },
      },
    },
  },
}
```

## Transition Utilities

### Standard Transitions
```html
<!-- Basic transition (use on all interactive elements) -->
<div class="transition-all duration-200">

<!-- Color transition only -->
<a class="transition-colors duration-200">

<!-- Transform transition only -->
<div class="transition-transform duration-200">

<!-- Shadow transition -->
<div class="transition-shadow duration-300">
```

### Duration Guide
| Duration | Use Case |
|----------|----------|
| `duration-150` | Hover color changes, opacity |
| `duration-200` | Button presses, focus states |
| `duration-300` | Card hovers, border changes |
| `duration-500` | Page section entrances |
| `duration-700` | Hero animations |

## Background Effects

### Gradient Backgrounds
```html
<!-- Subtle gradient -->
<div class="bg-gradient-to-br from-primary-50 to-accent-50 dark:from-gray-950 dark:to-gray-900">

<!-- Hero gradient orbs -->
<div class="absolute inset-0 -z-10">
  <div class="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-200/30 dark:bg-primary-900/20 rounded-full blur-3xl"></div>
  <div class="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-200/30 dark:bg-accent-900/20 rounded-full blur-3xl"></div>
</div>

<!-- Mesh gradient -->
<div class="bg-gradient-to-br from-primary-100 via-accent-50 to-cyan-100 dark:from-primary-950 dark:via-accent-950 dark:to-cyan-950">
```

### Dot Pattern Background
```html
<div class="absolute inset-0 opacity-[0.03]" style="background-image: radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0); background-size: 24px 24px;"></div>
```

### Grid Pattern Background
```html
<div class="absolute inset-0 opacity-[0.03]" style="background-image: linear-gradient(currentColor 1px, transparent 1px), linear-gradient(to right, currentColor 1px, transparent 1px); background-size: 40px 40px;"></div>
```

### Glass Effect
```html
<div class="bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 shadow-xl">
```

## Hover Effects

### Lift
```html
<div class="transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
```

### Scale
```html
<div class="transition-transform duration-200 hover:scale-[1.02]">
```

### Glow Border
```html
<div class="transition-all duration-300 border border-gray-200 dark:border-gray-800 hover:border-primary-400 dark:hover:border-primary-600 hover:shadow-lg hover:shadow-primary-500/10">
```

### Image Zoom on Hover
```html
<div class="overflow-hidden rounded-2xl">
  <img class="transition-transform duration-500 hover:scale-110" src="..." alt="...">
</div>
```

## Scroll-Triggered Animations

```html
<script>
// Intersection Observer for scroll animations
const animateOnScroll = () => {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
      if (entry.isIntersecting) {
        // Add stagger delay based on sibling index
        const delay = entry.target.dataset.delay || 0;
        entry.target.style.animationDelay = `${delay}ms`;
        entry.target.classList.add('animate-fade-in-up');
        entry.target.style.opacity = '1';
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  document.querySelectorAll('[data-animate]').forEach((el, i) => {
    el.style.opacity = '0';
    el.dataset.delay = el.dataset.delay || i * 100;
    observer.observe(el);
  });
};

document.addEventListener('DOMContentLoaded', animateOnScroll);
</script>

<!-- Usage -->
<div data-animate>This fades in when scrolled into view</div>
<div data-animate data-delay="100">This fades in 100ms later</div>
<div data-animate data-delay="200">This fades in 200ms later</div>
```

## Loading States

### Skeleton Screen
```html
<div class="animate-pulse space-y-4">
  <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded-lg w-3/4"></div>
  <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded-lg w-1/2"></div>
  <div class="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
</div>
```

### Shimmer Effect
```html
<div class="relative overflow-hidden bg-gray-200 dark:bg-gray-700 rounded-xl">
  <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" style="background-size: 200% 100%;"></div>
</div>
```

### Spinner
```html
<div class="w-8 h-8 border-4 border-primary-200 dark:border-primary-800 border-t-primary-600 dark:border-t-primary-400 rounded-full animate-spin"></div>
```

## Reduced Motion Support

Always include this in your `<style>` block:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```
