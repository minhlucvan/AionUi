# Section Patterns

Concrete layout structures for every major landing page section. Use as starting points, then customize for the product's world.

---

## Hero Patterns

### 1. Product-Led Hero

The product IS the hero. Screenshot or interactive demo dominates. Copy is supporting.

```html
<section class="hero hero-product-led">
  <div class="container">
    <div class="hero-content">
      <p class="hero-eyebrow">Eyebrow label</p>
      <h1 class="hero-headline">Headline that states the transformation</h1>
      <p class="hero-subtitle">One line that explains what this is and who it's for.</p>
      <div class="hero-actions">
        <a href="#" class="cta-primary">Primary action</a>
        <a href="#" class="cta-secondary">Secondary action →</a>
      </div>
    </div>
    <div class="hero-visual">
      <!-- Full-width product screenshot with browser chrome -->
      <div class="product-frame">
        <div class="browser-bar">
          <span class="dot"></span><span class="dot"></span><span class="dot"></span>
        </div>
        <img src="product.png" alt="Product screenshot" />
      </div>
    </div>
  </div>
</section>
```

```css
.hero-product-led {
  padding: var(--section-xl) 0 var(--section-lg);
  text-align: center;
}

.hero-product-led .hero-content {
  max-width: 720px;
  margin: 0 auto var(--section-md);
}

.hero-product-led .hero-visual {
  max-width: 1000px;
  margin: 0 auto;
}

.product-frame {
  border-radius: 12px;
  border: 1px solid var(--border);
  overflow: hidden;
  box-shadow:
    0 4px 16px rgba(0, 0, 0, 0.08),
    0 24px 64px rgba(0, 0, 0, 0.12);
}

.browser-bar {
  padding: 12px 16px;
  background: var(--surface-raised);
  border-bottom: 1px solid var(--border);
  display: flex;
  gap: 6px;
}

.browser-bar .dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--ink-muted);
}
```

**Best for:** Tools where the UI is the selling point (design tools, dashboards, editors)

---

### 2. Split Hero

Copy and visual side by side. The classic SaaS hero, but done with intention.

```html
<section class="hero hero-split">
  <div class="container hero-grid">
    <div class="hero-content">
      <p class="hero-eyebrow">Eyebrow label</p>
      <h1 class="hero-headline">Headline</h1>
      <p class="hero-subtitle">Supporting paragraph with specific detail.</p>
      <div class="hero-actions">
        <a href="#" class="cta-primary">Primary action</a>
        <a href="#" class="cta-secondary">See how it works →</a>
      </div>
      <div class="hero-proof">
        <div class="avatar-stack"><!-- user avatars --></div>
        <p class="proof-text">Trusted by 12,000+ teams</p>
      </div>
    </div>
    <div class="hero-visual">
      <!-- Product visual, code block, terminal, or illustration -->
    </div>
  </div>
</section>
```

```css
.hero-split {
  padding: var(--section-xl) 0;
}

.hero-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 48px;
  align-items: center;
}

@media (min-width: 768px) {
  .hero-grid {
    grid-template-columns: 1fr 1fr;
    gap: 64px;
  }
}

.hero-proof {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 32px;
  padding-top: 32px;
  border-top: 1px solid var(--border);
}

.avatar-stack {
  display: flex;
}

.avatar-stack img {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid var(--surface-base);
  margin-left: -8px;
}

.avatar-stack img:first-child { margin-left: 0; }

.proof-text {
  font-size: var(--text-small);
  color: var(--ink-secondary);
}
```

**Best for:** Most SaaS products, especially when you have a strong product visual

---

### 3. Full-Bleed Dark Hero

Background IS the product world. Copy overlays the atmosphere.

```html
<section class="hero hero-immersive">
  <div class="hero-background">
    <!-- Gradient, pattern, or video background -->
  </div>
  <div class="container">
    <div class="hero-content">
      <h1 class="hero-headline">Bold statement headline</h1>
      <p class="hero-subtitle">One supporting line.</p>
      <div class="hero-actions">
        <a href="#" class="cta-primary">Get started free</a>
      </div>
    </div>
  </div>
</section>
```

```css
.hero-immersive {
  position: relative;
  padding: var(--section-xl) 0;
  min-height: 90vh;
  display: flex;
  align-items: center;
  overflow: hidden;
}

.hero-background {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 60% 60% at 50% 40%, var(--accent-glow), transparent),
    var(--surface-base);
}

.hero-immersive .hero-content {
  position: relative;
  z-index: 1;
  max-width: 720px;
  text-align: center;
  margin: 0 auto;
}
```

**Best for:** Developer tools, premium products, products that need to feel immersive

---

### 4. Copy-Led Hero

Words do all the work. Minimal or no visual. Maximum typographic impact.

```html
<section class="hero hero-copy">
  <div class="container">
    <h1 class="hero-headline-xl">
      The headline IS<br>the entire hero.
    </h1>
    <p class="hero-subtitle">A single supporting sentence. No more.</p>
    <a href="#" class="cta-primary">Start building →</a>
  </div>
</section>
```

```css
.hero-copy {
  padding: var(--section-xl) 0;
  text-align: center;
}

.hero-headline-xl {
  font-size: clamp(3rem, 8vw, 6rem);
  line-height: 1.0;
  letter-spacing: -0.04em;
  font-weight: 800;
  max-width: 900px;
  margin: 0 auto 24px;
}
```

**Best for:** When the message itself is the product (AI tools, abstract products, brand-driven launches)

---

## Social Proof Patterns

### Logo Bar

Compact row of company logos. Appears right below the hero.

```html
<section class="social-proof-bar" data-reveal>
  <div class="container">
    <p class="proof-label">Trusted by teams at</p>
    <div class="logo-row">
      <img src="logo1.svg" alt="Company 1" />
      <img src="logo2.svg" alt="Company 2" />
      <img src="logo3.svg" alt="Company 3" />
      <img src="logo4.svg" alt="Company 4" />
      <img src="logo5.svg" alt="Company 5" />
    </div>
  </div>
</section>
```

```css
.social-proof-bar {
  padding: var(--section-sm) 0;
  border-bottom: 1px solid var(--border);
}

.proof-label {
  text-align: center;
  font-size: var(--text-small);
  color: var(--ink-secondary);
  text-transform: uppercase;
  letter-spacing: var(--text-overline-tracking);
  margin-bottom: 24px;
}

.logo-row {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 32px;
  flex-wrap: wrap;
}

.logo-row img {
  height: 24px;
  opacity: 0.5;
  filter: grayscale(1);
  transition: opacity 0.2s;
}

.logo-row img:hover {
  opacity: 0.8;
}
```

### Metrics Bar

Numbers that create instant credibility.

```html
<section class="metrics-bar" data-reveal-stagger>
  <div class="container metrics-grid">
    <div class="metric">
      <span class="metric-value">12,000+</span>
      <span class="metric-label">Teams</span>
    </div>
    <div class="metric">
      <span class="metric-value">99.99%</span>
      <span class="metric-label">Uptime</span>
    </div>
    <div class="metric">
      <span class="metric-value">50ms</span>
      <span class="metric-label">p95 Latency</span>
    </div>
    <div class="metric">
      <span class="metric-value">4.9/5</span>
      <span class="metric-label">Customer Rating</span>
    </div>
  </div>
</section>
```

```css
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 32px;
  text-align: center;
}

@media (min-width: 768px) {
  .metrics-grid { grid-template-columns: repeat(4, 1fr); }
}

.metric-value {
  display: block;
  font-size: var(--text-heading);
  font-weight: 700;
  color: var(--ink-headline);
  font-variant-numeric: tabular-nums;
}

.metric-label {
  font-size: var(--text-small);
  color: var(--ink-secondary);
}
```

---

## Feature Patterns

### Primary Feature — Full Width

The main value prop deserves a full section.

```html
<section class="feature-primary" data-reveal>
  <div class="container feature-primary-grid">
    <div class="feature-content">
      <p class="feature-eyebrow">Core feature</p>
      <h2 class="feature-headline">Specific headline about what this does</h2>
      <p class="feature-description">
        Two to three sentences explaining the value. Be specific.
        Include a real detail about how it works.
      </p>
      <ul class="feature-bullets">
        <li>Specific benefit with a real detail</li>
        <li>Another specific benefit</li>
        <li>A third specific benefit</li>
      </ul>
    </div>
    <div class="feature-visual">
      <!-- Screenshot, code block, or interactive demo -->
    </div>
  </div>
</section>
```

```css
.feature-primary { padding: var(--section-lg) 0; }

.feature-primary-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 48px;
  align-items: center;
}

@media (min-width: 768px) {
  .feature-primary-grid {
    grid-template-columns: 1fr 1fr;
    gap: 80px;
  }
}

.feature-eyebrow {
  font-size: var(--text-overline);
  font-weight: var(--text-overline-weight);
  letter-spacing: var(--text-overline-tracking);
  text-transform: uppercase;
  color: var(--accent);
  margin-bottom: 12px;
}

.feature-bullets {
  list-style: none;
  padding: 0;
  margin-top: 24px;
}

.feature-bullets li {
  padding: 8px 0 8px 28px;
  position: relative;
  color: var(--ink-body);
}

.feature-bullets li::before {
  content: '✓';
  position: absolute;
  left: 0;
  color: var(--accent);
  font-weight: 600;
}
```

### Feature Grid — Three Up

For secondary features that support the main value prop.

```html
<section class="features-grid-section" data-reveal>
  <div class="container">
    <div class="section-header">
      <h2>Everything you need to [outcome]</h2>
      <p>One supporting line about the feature set.</p>
    </div>
    <div class="features-grid" data-reveal-stagger>
      <div class="feature-card">
        <div class="feature-icon"><!-- SVG icon --></div>
        <h3>Feature name</h3>
        <p>Two lines max. Be specific about what this does and why it matters.</p>
      </div>
      <!-- Repeat 3-6 cards -->
    </div>
  </div>
</section>
```

```css
.feature-card {
  padding: 32px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--surface-raised);
  transition: border-color 0.2s ease-out;
}

.feature-card:hover {
  border-color: var(--border-emphasis);
}

.feature-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: var(--accent-subtle, var(--accent-glow));
  display: grid;
  place-items: center;
  margin-bottom: 16px;
  color: var(--accent);
}

.feature-card h3 {
  font-size: var(--text-subheading);
  margin-bottom: 8px;
  color: var(--ink-headline);
}

.feature-card p {
  font-size: var(--text-body);
  color: var(--ink-body);
  line-height: var(--text-body-leading);
}
```

### Bento Grid

Asymmetric grid for feature showcase with varying visual emphasis.

```html
<div class="bento-grid" data-reveal-stagger>
  <div class="bento-card bento-large">
    <!-- Primary feature — spans 2 columns, includes visual -->
  </div>
  <div class="bento-card">
    <!-- Secondary feature -->
  </div>
  <div class="bento-card">
    <!-- Secondary feature -->
  </div>
  <div class="bento-card bento-wide">
    <!-- Wide feature — full width, could include demo -->
  </div>
</div>
```

```css
.bento-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}

@media (min-width: 768px) {
  .bento-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .bento-large {
    grid-column: span 2;
    grid-row: span 2;
  }

  .bento-wide {
    grid-column: span 2;
  }
}

.bento-card {
  padding: 32px;
  border-radius: 16px;
  border: 1px solid var(--border);
  background: var(--surface-raised);
  overflow: hidden;
}
```

---

## Testimonial Patterns

### Featured Testimonial

One powerful quote with full context.

```html
<section class="testimonial-featured" data-reveal>
  <div class="container content-medium">
    <figure class="testimonial">
      <blockquote>
        <p>"Specific, detailed quote about the real impact. Include numbers
        or specific outcomes when possible. Two to three sentences max."</p>
      </blockquote>
      <figcaption>
        <img src="avatar.jpg" alt="Name" class="testimonial-avatar" />
        <div>
          <cite class="testimonial-name">Full Name</cite>
          <span class="testimonial-role">Title, Company</span>
        </div>
      </figcaption>
    </figure>
  </div>
</section>
```

```css
.testimonial-featured {
  padding: var(--section-lg) 0;
  text-align: center;
}

.testimonial blockquote p {
  font-size: var(--text-heading);
  line-height: var(--text-heading-leading);
  color: var(--ink-headline);
  font-weight: 500;
  font-style: normal;
}

.testimonial figcaption {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-top: 32px;
}

.testimonial-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
}

.testimonial-name {
  display: block;
  font-style: normal;
  font-weight: 600;
  color: var(--ink-headline);
}

.testimonial-role {
  font-size: var(--text-small);
  color: var(--ink-secondary);
}
```

### Testimonial Grid

Multiple testimonials in a masonry-like layout.

```html
<section class="testimonials-section" data-reveal>
  <div class="container">
    <div class="section-header">
      <h2>What people are saying</h2>
    </div>
    <div class="testimonial-grid" data-reveal-stagger>
      <div class="testimonial-card">
        <p class="testimonial-text">"Quote text here."</p>
        <div class="testimonial-author">
          <img src="avatar.jpg" alt="" />
          <div>
            <span class="name">Name</span>
            <span class="role">Title, Company</span>
          </div>
        </div>
      </div>
      <!-- Repeat -->
    </div>
  </div>
</section>
```

```css
.testimonial-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}

@media (min-width: 768px) {
  .testimonial-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1200px) {
  .testimonial-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

.testimonial-card {
  padding: 24px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--surface-raised);
}

.testimonial-text {
  color: var(--ink-body);
  line-height: var(--text-body-leading);
  margin-bottom: 16px;
}

.testimonial-author {
  display: flex;
  align-items: center;
  gap: 10px;
}

.testimonial-author img {
  width: 36px;
  height: 36px;
  border-radius: 50%;
}

.testimonial-author .name {
  display: block;
  font-weight: 600;
  font-size: var(--text-small);
  color: var(--ink-headline);
}

.testimonial-author .role {
  font-size: 0.8rem;
  color: var(--ink-secondary);
}
```

---

## Pricing Patterns

### Three-Tier Pricing

```html
<section class="pricing-section" data-reveal>
  <div class="container">
    <div class="section-header">
      <h2>Simple, transparent pricing</h2>
      <p>No surprises. No hidden fees.</p>
    </div>
    <div class="pricing-grid" data-reveal-stagger>
      <div class="pricing-card">
        <h3 class="plan-name">Starter</h3>
        <div class="plan-price">
          <span class="price-amount">$0</span>
          <span class="price-period">/month</span>
        </div>
        <p class="plan-description">For individuals getting started.</p>
        <a href="#" class="cta-secondary plan-cta">Get started free</a>
        <ul class="plan-features">
          <li>Feature one</li>
          <li>Feature two</li>
          <li>Feature three</li>
        </ul>
      </div>

      <div class="pricing-card pricing-card-featured">
        <div class="plan-badge">Most popular</div>
        <h3 class="plan-name">Pro</h3>
        <div class="plan-price">
          <span class="price-amount">$29</span>
          <span class="price-period">/month</span>
        </div>
        <p class="plan-description">For growing teams.</p>
        <a href="#" class="cta-primary plan-cta">Start free trial</a>
        <ul class="plan-features">
          <li>Everything in Starter</li>
          <li>Pro feature one</li>
          <li>Pro feature two</li>
          <li>Pro feature three</li>
        </ul>
      </div>

      <div class="pricing-card">
        <h3 class="plan-name">Enterprise</h3>
        <div class="plan-price">
          <span class="price-amount">Custom</span>
        </div>
        <p class="plan-description">For large organizations.</p>
        <a href="#" class="cta-secondary plan-cta">Contact sales</a>
        <ul class="plan-features">
          <li>Everything in Pro</li>
          <li>Enterprise feature one</li>
          <li>Enterprise feature two</li>
          <li>Dedicated support</li>
        </ul>
      </div>
    </div>
  </div>
</section>
```

```css
.pricing-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  max-width: 1000px;
  margin: 0 auto;
}

@media (min-width: 768px) {
  .pricing-grid {
    grid-template-columns: repeat(3, 1fr);
    align-items: start;
  }
}

.pricing-card {
  padding: 32px;
  border-radius: 16px;
  border: 1px solid var(--border);
  background: var(--surface-raised);
}

.pricing-card-featured {
  border-color: var(--accent);
  position: relative;
  box-shadow: 0 0 0 1px var(--accent), 0 8px 32px var(--accent-glow);
}

.plan-badge {
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  padding: 4px 16px;
  border-radius: 100px;
  background: var(--accent);
  color: white;
  font-size: var(--text-small);
  font-weight: 600;
  white-space: nowrap;
}

.plan-name {
  font-size: var(--text-subheading);
  color: var(--ink-headline);
}

.price-amount {
  font-size: var(--text-heading);
  font-weight: 700;
  color: var(--ink-headline);
}

.price-period {
  font-size: var(--text-body);
  color: var(--ink-secondary);
}

.plan-cta {
  display: block;
  width: 100%;
  text-align: center;
  margin: 24px 0;
}

.plan-features {
  list-style: none;
  padding: 0;
  border-top: 1px solid var(--border);
  padding-top: 24px;
}

.plan-features li {
  padding: 6px 0 6px 24px;
  position: relative;
  font-size: var(--text-small);
  color: var(--ink-body);
}

.plan-features li::before {
  content: '✓';
  position: absolute;
  left: 0;
  color: var(--accent);
}
```

---

## CTA Patterns

### Final CTA Section

The closing pitch. By now, the visitor should feel informed enough to act.

```html
<section class="cta-final" data-reveal>
  <div class="container content-narrow" style="text-align: center;">
    <h2>Ready to [transformation verb]?</h2>
    <p>One sentence that reinforces the value and reduces friction.</p>
    <div class="cta-actions">
      <a href="#" class="cta-primary cta-large">Primary action</a>
      <p class="cta-reassurance">Free to start. No credit card required.</p>
    </div>
  </div>
</section>
```

```css
.cta-final {
  padding: var(--section-xl) 0;
  text-align: center;
}

.cta-final h2 {
  font-size: var(--text-heading);
  color: var(--ink-headline);
  margin-bottom: 12px;
}

.cta-final p {
  color: var(--ink-body);
  margin-bottom: 32px;
}

.cta-large {
  padding: 16px 40px;
  font-size: var(--text-body);
  font-weight: 600;
}

.cta-reassurance {
  font-size: var(--text-small);
  color: var(--ink-secondary);
  margin-top: 16px;
}
```

### CTA Button Styles

```css
/* Primary CTA — the main action */
.cta-primary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border-radius: 8px;
  background: var(--accent);
  color: white;
  font-weight: 600;
  font-size: var(--text-body);
  text-decoration: none;
  border: none;
  cursor: pointer;
  transition: transform 0.15s ease-out, box-shadow 0.15s ease-out, background 0.15s;
}

.cta-primary:hover {
  background: var(--accent-hover);
  transform: translateY(-1px);
  box-shadow: 0 4px 16px var(--accent-glow);
}

.cta-primary:active {
  transform: translateY(0);
}

/* Secondary CTA — supporting action */
.cta-secondary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border-radius: 8px;
  background: transparent;
  color: var(--ink-headline);
  font-weight: 600;
  font-size: var(--text-body);
  text-decoration: none;
  border: 1px solid var(--border-emphasis);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.cta-secondary:hover {
  border-color: var(--ink-secondary);
  background: var(--surface-raised);
}

/* Ghost CTA — minimal style */
.cta-ghost {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--accent);
  font-weight: 600;
  text-decoration: none;
  transition: gap 0.15s ease-out;
}

.cta-ghost:hover {
  gap: 8px;
}
```

---

## Navigation Pattern

### Sticky Nav

```html
<nav class="nav">
  <div class="container nav-inner">
    <a href="/" class="nav-logo">
      <!-- Logo SVG or text -->
      <span>ProductName</span>
    </a>
    <div class="nav-links">
      <a href="#features">Features</a>
      <a href="#pricing">Pricing</a>
      <a href="#docs">Docs</a>
    </div>
    <div class="nav-actions">
      <a href="#" class="nav-link-action">Sign in</a>
      <a href="#" class="cta-primary cta-nav">Get started</a>
    </div>
  </div>
</nav>
```

```css
.nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  padding: 16px 0;
  background: rgba(10, 10, 15, 0.8);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border-subtle);
}

.nav-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.nav-logo {
  font-weight: 700;
  font-size: 1.125rem;
  color: var(--ink-headline);
  text-decoration: none;
}

.nav-links {
  display: none;
  gap: 32px;
}

@media (min-width: 768px) {
  .nav-links { display: flex; }
}

.nav-links a {
  font-size: var(--text-small);
  color: var(--ink-body);
  text-decoration: none;
  transition: color 0.15s;
}

.nav-links a:hover {
  color: var(--ink-headline);
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.cta-nav {
  padding: 8px 16px;
  font-size: var(--text-small);
}
```

---

## Footer Pattern

```html
<footer class="footer">
  <div class="container footer-grid">
    <div class="footer-brand">
      <span class="footer-logo">ProductName</span>
      <p class="footer-tagline">One-line product description.</p>
    </div>
    <div class="footer-column">
      <h4>Product</h4>
      <ul>
        <li><a href="#">Features</a></li>
        <li><a href="#">Pricing</a></li>
        <li><a href="#">Changelog</a></li>
      </ul>
    </div>
    <div class="footer-column">
      <h4>Company</h4>
      <ul>
        <li><a href="#">About</a></li>
        <li><a href="#">Blog</a></li>
        <li><a href="#">Careers</a></li>
      </ul>
    </div>
    <div class="footer-column">
      <h4>Resources</h4>
      <ul>
        <li><a href="#">Documentation</a></li>
        <li><a href="#">Community</a></li>
        <li><a href="#">Support</a></li>
      </ul>
    </div>
  </div>
  <div class="container footer-bottom">
    <p>&copy; 2025 ProductName. All rights reserved.</p>
  </div>
</footer>
```

```css
.footer {
  padding: var(--section-md) 0 var(--section-sm);
  border-top: 1px solid var(--border);
}

.footer-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 40px;
}

@media (min-width: 768px) {
  .footer-grid {
    grid-template-columns: 2fr 1fr 1fr 1fr;
    gap: 64px;
  }
}

.footer-logo {
  font-weight: 700;
  font-size: 1.125rem;
  color: var(--ink-headline);
}

.footer-tagline {
  color: var(--ink-secondary);
  font-size: var(--text-small);
  margin-top: 8px;
}

.footer-column h4 {
  font-size: var(--text-small);
  font-weight: 600;
  color: var(--ink-headline);
  margin-bottom: 16px;
}

.footer-column ul {
  list-style: none;
  padding: 0;
}

.footer-column li + li { margin-top: 8px; }

.footer-column a {
  font-size: var(--text-small);
  color: var(--ink-secondary);
  text-decoration: none;
  transition: color 0.15s;
}

.footer-column a:hover { color: var(--ink-headline); }

.footer-bottom {
  margin-top: var(--section-sm);
  padding-top: 24px;
  border-top: 1px solid var(--border);
  font-size: var(--text-small);
  color: var(--ink-muted);
}
```
