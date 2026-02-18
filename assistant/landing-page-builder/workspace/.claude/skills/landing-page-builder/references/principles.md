# Landing Page Principles

## Layout Architecture

### The Constraint Grid

Landing pages need a single containing width that creates visual consistency across all sections.

```css
.container {
  max-width: 1200px;    /* Content container */
  margin: 0 auto;
  padding: 0 24px;
}

@media (min-width: 768px) {
  .container { padding: 0 40px; }
}

@media (min-width: 1200px) {
  .container { padding: 0 64px; }
}
```

Some sections break out of the container for full-bleed backgrounds while keeping content aligned:

```css
.section-full-bleed {
  width: 100%;
  background: var(--surface-feature);
}

.section-full-bleed .container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
}
```

### Section Spacing System

Vertical rhythm between sections creates the breathing pattern described in the skill.

```css
:root {
  --section-sm: 64px;     /* Compact sections (social proof bar) */
  --section-md: 96px;     /* Standard sections (features) */
  --section-lg: 128px;    /* Major sections (hero, pricing) */
  --section-xl: 160px;    /* Breathing room (before final CTA) */
}

@media (min-width: 768px) {
  :root {
    --section-sm: 80px;
    --section-md: 120px;
    --section-lg: 160px;
    --section-xl: 200px;
  }
}
```

Apply spacing based on section importance, not uniformly.

### Content Width Hierarchy

Not all content should fill the container. Narrower content is easier to read and feels more intentional.

```css
.content-narrow  { max-width: 640px; }    /* Single-column copy */
.content-medium  { max-width: 800px; }    /* Feature descriptions */
.content-wide    { max-width: 1000px; }   /* Feature grids, pricing */
.content-full    { max-width: 1200px; }   /* Full layouts */
```

Center narrow content for section headers:

```css
.section-header {
  max-width: 640px;
  margin: 0 auto;
  text-align: center;
}
```

---

## Typography System

### Scale

Landing pages need more dramatic size contrast than application UIs.

```css
:root {
  /* Display — hero headlines */
  --text-display: clamp(2.5rem, 5vw + 1rem, 4.5rem);
  --text-display-leading: 1.05;
  --text-display-tracking: -0.03em;

  /* Heading — section titles */
  --text-heading: clamp(1.75rem, 3vw + 0.5rem, 2.5rem);
  --text-heading-leading: 1.15;
  --text-heading-tracking: -0.02em;

  /* Subheading — feature titles */
  --text-subheading: clamp(1.25rem, 2vw + 0.25rem, 1.5rem);
  --text-subheading-leading: 1.3;
  --text-subheading-tracking: -0.01em;

  /* Body — descriptions, paragraphs */
  --text-body: clamp(1rem, 1.2vw, 1.125rem);
  --text-body-leading: 1.6;

  /* Small — labels, badges, fine print */
  --text-small: 0.875rem;
  --text-small-leading: 1.5;

  /* Overline — section labels, eyebrow text */
  --text-overline: 0.75rem;
  --text-overline-tracking: 0.08em;
  --text-overline-weight: 600;
}
```

### Responsive Typography with `clamp()`

All display and heading sizes use `clamp()` for fluid scaling. This eliminates the need for breakpoint-based font size changes and creates smooth transitions.

### Font Pairing Strategies

**Geometric Sans (Modern/Technical):**
- Headlines: Inter, Geist, Plus Jakarta Sans
- Body: Same family at lighter weight
- Use when: Developer tools, technical SaaS, modern products

**Neo-Grotesque (Clean/Neutral):**
- Headlines: Helvetica Neue, SF Pro, Söhne
- Body: Same family
- Use when: Enterprise, fintech, productivity tools

**Serif + Sans (Premium/Established):**
- Headlines: Fraunces, Playfair Display, DM Serif
- Body: Inter, DM Sans
- Use when: Premium positioning, creative tools, design platforms

**Monospace Accent (Developer/Technical):**
- Headlines: Regular sans
- Code/metrics: JetBrains Mono, Fira Code, Berkeley Mono
- Body: Regular sans
- Use when: Developer tools, technical products, CLI-first products

### Headline Craft

```css
/* Tight tracking for headlines — reads as confident */
.hero-headline {
  font-size: var(--text-display);
  line-height: var(--text-display-leading);
  letter-spacing: var(--text-display-tracking);
  font-weight: 700;
  text-wrap: balance;    /* Prevents orphans */
}

/* Lighter body text under headlines — contrast creates hierarchy */
.hero-subtitle {
  font-size: var(--text-body);
  line-height: var(--text-body-leading);
  color: var(--ink-secondary);
  max-width: 540px;      /* Limit line length for readability */
}
```

---

## Color Architecture

### Dark Mode Landing Pages

Reference: Linear, Vercel, Raycast, Warp

```css
:root {
  /* Surfaces */
  --surface-base: #0a0a0f;         /* Page background */
  --surface-raised: #111118;        /* Card backgrounds */
  --surface-overlay: #1a1a24;       /* Dropdowns, modals */
  --surface-feature: #0d0d14;       /* Alternating section bg */

  /* Ink */
  --ink-headline: #f4f2ef;          /* Maximum contrast for headlines */
  --ink-body: #a8a4a0;             /* Comfortable reading for body */
  --ink-secondary: #6b6966;         /* Tertiary information */
  --ink-muted: #3d3a38;            /* Borders, dividers */

  /* Accent */
  --accent: #6366f1;               /* Primary brand/CTA color */
  --accent-hover: #818cf8;         /* Hover state */
  --accent-glow: rgba(99, 102, 241, 0.15);  /* Ambient glow effect */

  /* Semantic */
  --success: #22c55e;
  --warning: #eab308;
  --error: #ef4444;

  /* Borders */
  --border: rgba(255, 255, 255, 0.06);
  --border-subtle: rgba(255, 255, 255, 0.03);
  --border-emphasis: rgba(255, 255, 255, 0.12);
}
```

### Light Mode Landing Pages

Reference: Stripe, Notion, Linear (light), Clerk

```css
:root {
  /* Surfaces */
  --surface-base: #ffffff;
  --surface-raised: #fafafa;
  --surface-overlay: #ffffff;
  --surface-feature: #f8f8fa;

  /* Ink */
  --ink-headline: #111111;
  --ink-body: #555555;
  --ink-secondary: #888888;
  --ink-muted: #cccccc;

  /* Accent */
  --accent: #635bff;
  --accent-hover: #7a73ff;
  --accent-subtle: rgba(99, 91, 255, 0.08);

  /* Borders */
  --border: rgba(0, 0, 0, 0.08);
  --border-subtle: rgba(0, 0, 0, 0.04);
  --border-emphasis: rgba(0, 0, 0, 0.15);
}
```

### Gradient Craft

Gradients on landing pages should feel like lighting, not decoration.

```css
/* Background gradient — subtle ambient light */
.hero {
  background:
    radial-gradient(ellipse 80% 50% at 50% -20%, var(--accent-glow), transparent),
    var(--surface-base);
}

/* Text gradient — use sparingly, only on display text */
.gradient-text {
  background: linear-gradient(135deg, #f4f2ef 0%, #a8a4a0 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* CTA gradient — brand emphasis */
.cta-primary {
  background: linear-gradient(135deg, var(--accent) 0%, #8b5cf6 100%);
}

/* Border gradient — premium card treatment */
.card-premium {
  border: 1px solid transparent;
  background:
    linear-gradient(var(--surface-raised), var(--surface-raised)) padding-box,
    linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.02)) border-box;
}
```

---

## Motion Language

### Scroll Reveal System

Use Intersection Observer for all scroll-triggered animations. No library dependencies.

```javascript
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('revealed');
      observer.unobserve(entry.target);
    }
  });
}, {
  threshold: 0.15,
  rootMargin: '0px 0px -60px 0px'
});

document.querySelectorAll('[data-reveal]').forEach(el => observer.observe(el));
```

```css
/* Base reveal state */
[data-reveal] {
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.6s ease-out, transform 0.6s ease-out;
}

[data-reveal].revealed {
  opacity: 1;
  transform: translateY(0);
}

/* Staggered children */
[data-reveal-stagger] > * {
  opacity: 0;
  transform: translateY(16px);
  transition: opacity 0.5s ease-out, transform 0.5s ease-out;
}

[data-reveal-stagger].revealed > *:nth-child(1) { transition-delay: 0ms; }
[data-reveal-stagger].revealed > *:nth-child(2) { transition-delay: 100ms; }
[data-reveal-stagger].revealed > *:nth-child(3) { transition-delay: 200ms; }
[data-reveal-stagger].revealed > *:nth-child(4) { transition-delay: 300ms; }

[data-reveal-stagger].revealed > * {
  opacity: 1;
  transform: translateY(0);
}
```

### Hover Interactions

```css
/* CTA button hover — lift + glow */
.cta-primary {
  transition: transform 0.2s ease-out, box-shadow 0.2s ease-out;
}

.cta-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 24px var(--accent-glow);
}

/* Card hover — subtle lift */
.feature-card {
  transition: transform 0.25s ease-out, border-color 0.25s ease-out;
}

.feature-card:hover {
  transform: translateY(-2px);
  border-color: var(--border-emphasis);
}

/* Link hover — underline expand */
.text-link {
  text-decoration: none;
  background-image: linear-gradient(var(--accent), var(--accent));
  background-size: 0% 1px;
  background-position: 0 100%;
  background-repeat: no-repeat;
  transition: background-size 0.3s ease-out;
}

.text-link:hover {
  background-size: 100% 1px;
}
```

### Performance Rules

- Only animate `transform` and `opacity` — never `width`, `height`, `top`, `left`, `margin`, `padding`
- Use `will-change: transform` sparingly and only on elements that will animate
- Intersection Observer animations should fire once (unobserve after revealing)
- Stagger delays should not exceed 400ms total — user shouldn't wait for content to appear
- Prefers-reduced-motion must be respected:

```css
@media (prefers-reduced-motion: reduce) {
  [data-reveal],
  [data-reveal-stagger] > * {
    opacity: 1;
    transform: none;
    transition: none;
  }
}
```

---

## Responsive Strategy

### Mobile-First Breakpoints

```css
/* Mobile first (default) — 375px+ */
/* Tablet — 768px+ */
@media (min-width: 768px) { }
/* Desktop — 1200px+ */
@media (min-width: 1200px) { }
```

### Hero Responsiveness

```css
.hero {
  padding: var(--section-lg) 0;
  text-align: center;  /* Center on mobile */
}

@media (min-width: 768px) {
  .hero {
    padding: var(--section-xl) 0;
    text-align: left;  /* Left-align on desktop if split layout */
  }
}
```

### Feature Grid Responsiveness

```css
.feature-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
}

@media (min-width: 768px) {
  .feature-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 32px;
  }
}

@media (min-width: 1200px) {
  .feature-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 40px;
  }
}
```

### Touch Targets

- Minimum CTA button height: 48px on mobile, 44px on desktop
- Minimum tap target: 44x44px
- CTAs should be full-width on mobile:

```css
.cta-primary {
  width: 100%;
  padding: 14px 24px;
}

@media (min-width: 768px) {
  .cta-primary {
    width: auto;
    padding: 12px 32px;
  }
}
```

---

## Image & Media Strategy

### Hero Images

```css
/* Product screenshot with browser chrome */
.hero-screenshot {
  border-radius: 12px;
  border: 1px solid var(--border);
  box-shadow:
    0 0 0 1px var(--border-subtle),
    0 4px 16px rgba(0, 0, 0, 0.1),
    0 16px 48px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

/* Floating screenshot with glow */
.hero-screenshot-glow {
  position: relative;
}

.hero-screenshot-glow::before {
  content: '';
  position: absolute;
  inset: -1px;
  background: linear-gradient(135deg, var(--accent-glow), transparent 50%);
  border-radius: 13px;
  z-index: -1;
  filter: blur(20px);
}
```

### Placeholder Strategy

When no real product images exist, use:

1. **Gradient surfaces** mimicking a UI — better than nothing
2. **ASCII/code blocks** for developer tools — authentic
3. **Simple geometric shapes** suggesting the product's domain
4. **Never:** stock photos, generic illustrations, AI-generated images with artifacts

```css
/* Placeholder product preview */
.product-preview-placeholder {
  aspect-ratio: 16 / 10;
  border-radius: 12px;
  background:
    linear-gradient(135deg, var(--surface-raised) 0%, var(--surface-overlay) 100%);
  border: 1px solid var(--border);
  display: grid;
  place-items: center;
}
```
