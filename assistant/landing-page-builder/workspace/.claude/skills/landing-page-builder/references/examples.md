# Craft in Action

Concrete examples showing how principles translate to real landing page decisions. Each example demonstrates a specific aspect of craft.

---

## Example 1: The Hero That Earns Its Scroll

### The Generic Version (What AI Defaults To)

```html
<section class="hero" style="text-align: center; padding: 120px 20px;">
  <h1 style="font-size: 48px;">Transform Your Workflow</h1>
  <p style="color: gray;">The all-in-one platform for modern teams.</p>
  <button style="background: #6366f1; color: white; padding: 12px 24px;">
    Get Started
  </button>
</section>
```

**Why it fails:**
- "Transform Your Workflow" — describes every product ever
- "All-in-one platform for modern teams" — says nothing specific
- "Get Started" — commitment without context
- No product visual — the visitor doesn't know what they'd be signing up for
- Gradient-less, flat, generic — could be any company's hero

### The Crafted Version (For a Code Review Tool)

```html
<section class="hero">
  <div class="hero-bg">
    <!-- Subtle code-like pattern in background -->
  </div>
  <div class="container hero-grid">
    <div class="hero-content">
      <p class="hero-eyebrow">Code Review</p>
      <h1 class="hero-headline">
        Catch the bugs<br>your tests miss.
      </h1>
      <p class="hero-subtitle">
        AI-powered code review that understands your codebase,
        not just syntax. Finds logic errors, security issues,
        and performance problems in every PR.
      </p>
      <div class="hero-actions">
        <a href="#" class="cta-primary">
          Try on a real PR →
        </a>
        <a href="#" class="cta-ghost">
          See example review
        </a>
      </div>
      <div class="hero-proof">
        <span class="proof-stat">2.3M PRs reviewed</span>
        <span class="proof-divider">·</span>
        <span class="proof-stat">847 bugs caught today</span>
      </div>
    </div>
    <div class="hero-visual">
      <!-- Actual PR diff with AI annotations -->
      <div class="code-review-preview">
        <div class="diff-header">
          <span class="diff-file">src/auth/validate.ts</span>
          <span class="diff-badge diff-issue">1 issue found</span>
        </div>
        <pre class="diff-code"><code>
<span class="diff-context"> function validateToken(token: string) {</span>
<span class="diff-delete">-  if (token.length > 0) {</span>
<span class="diff-add">+  if (token && token.length > 0 && !isExpired(token)) {</span>
<span class="diff-context">    return decode(token);</span>
        </code></pre>
        <div class="ai-annotation">
          <span class="ai-badge">AI Review</span>
          <p>Missing expiration check allows expired tokens to pass validation. This is a security vulnerability — tokens should be verified against the expiry timestamp before decoding.</p>
        </div>
      </div>
    </div>
  </div>
</section>
```

**Why it works:**
- "Catch the bugs your tests miss" — specific transformation for a specific audience
- "Try on a real PR" — low commitment, high curiosity CTA
- Live-looking code review — the product IS the visual, not an abstract illustration
- Real-looking metrics — "847 bugs caught today" is specific and credible
- The hero IS a product demo — visitor understands the value without reading a features section

---

## Example 2: Token Architecture That Tells a Story

### Generic Tokens

```css
:root {
  --bg-primary: #0f0f0f;
  --text-primary: #ffffff;
  --text-secondary: #888888;
  --accent: #6366f1;
  --border: #333333;
}
```

These tokens are interchangeable. They could belong to any product. The names describe roles, not identity.

### Tokens for a Music Production Tool

```css
:root {
  /* Studio surfaces — dark like a recording booth */
  --studio-dark: #0c0c10;
  --studio-surface: #141418;
  --studio-panel: #1c1c22;
  --studio-control: #242430;

  /* Ink — warm like analog VU meters */
  --label-bright: #e8e4dc;
  --label-warm: #b8a88c;
  --label-dim: #6b6458;
  --label-ghost: #3a3632;

  /* Signal — the sound in visual form */
  --signal-active: #00d4aa;
  --signal-peak: #ff6b4a;
  --signal-glow: rgba(0, 212, 170, 0.12);

  /* Hardware borders — subtle rack-mount lines */
  --rack-line: rgba(255, 255, 255, 0.05);
  --rack-edge: rgba(255, 255, 255, 0.10);
}
```

**Why this matters:**
- `--studio-dark` instead of `--bg-primary` — you're IN a studio
- `--label-warm` instead of `--text-secondary` — warm tones reference analog equipment
- `--signal-active` instead of `--accent` — it's not an accent, it's a signal
- `--rack-line` instead of `--border` — the border IS part of the product's visual world
- Reading these tokens, you know exactly what product this belongs to

### Tokens for a Legal Document Tool

```css
:root {
  /* Paper — the document IS the interface */
  --parchment: #fdfcfa;
  --paper: #ffffff;
  --sidebar-linen: #f7f5f2;
  --drawer: #edeae5;

  /* Ink — like a printed brief */
  --ink-dense: #1a1a1a;
  --ink-body: #3d3d3d;
  --ink-note: #7a7a7a;
  --ink-watermark: #c8c4be;

  /* Seal — authority and action */
  --seal: #1e3a5f;
  --seal-hover: #2a4d7a;
  --seal-light: rgba(30, 58, 95, 0.08);

  /* Rule lines — structure like a legal pad */
  --rule: rgba(0, 0, 0, 0.06);
  --rule-heavy: rgba(0, 0, 0, 0.12);
}
```

Different product, different world, same principle: tokens should sound like they belong.

---

## Example 3: Scroll Rhythm in Practice

### The Flat Scroll (No Rhythm)

```
[Hero - 600px]
[Features - 600px]
[Testimonials - 600px]
[Pricing - 600px]
[CTA - 400px]
```

Every section same height, same weight, same background. It reads like a list. The eye has no landmarks.

### The Breathing Scroll (With Rhythm)

```
[Hero - 900px - dark bg, generous whitespace, maximum visual impact]
[Logo bar - 120px - tiny, quiet, just logos at 50% opacity]
[Primary Feature - 800px - light bg shift, full-width product screenshot]
[Feature Grid - 500px - same bg, compact three-column cards]
[Testimonial - 600px - dark bg returns, single powerful quote, lots of breathing room]
[Feature Detail - 700px - light bg, alternating left/right]
[Pricing - 800px - subtle bg shift, three-tier with featured tier]
[Final CTA - 400px - dark bg, centered, confident, minimal]
[Footer - 300px - same dark, compact]
```

**The rhythm:** BIG → tiny → BIG → medium → medium-large → medium → BIG → medium → small

**The color story:** dark → light (logo bar transitions) → light → light → dark (emphasis) → light → subtle shift → dark (bookend) → dark

This creates chapters. The visitor feels the structure even if they can't articulate it.

---

## Example 4: CTA Copy Evolution

### Level 1: Generic (Template Energy)

```
Hero CTA: "Get Started"
Final CTA: "Sign Up Now"
```

These are instructions, not invitations. They ask for commitment without earning it.

### Level 2: Benefit-Oriented (Better, Still Generic)

```
Hero CTA: "Start Building Faster"
Final CTA: "Try It Free"
```

Better — there's a benefit implied. But "building faster" could be any dev tool.

### Level 3: Product-Specific (The Goal)

For the code review tool:
```
Hero CTA: "Try on a real PR →"
Final CTA: "Review your first PR free"
```

For the music production tool:
```
Hero CTA: "Open a blank session →"
Final CTA: "Start producing — it's free"
```

For the legal document tool:
```
Hero CTA: "Draft your first brief →"
Final CTA: "Start a free document"
```

**Why Level 3 works:**
- The CTA names the actual first action the user will take
- It's specific to THIS product — you couldn't swap them
- "Try on a real PR" invites experimentation, not commitment
- The arrow (→) implies continuity, not finality

---

## Example 5: Social Proof That Converts

### Generic Social Proof

```html
<section class="social-proof">
  <p>Trusted by thousands of developers worldwide</p>
  <div class="logos">
    <!-- Company logos -->
  </div>
</section>
```

"Thousands of developers worldwide" is a template phrase. It could be true or made up — there's no way to tell.

### Specific Social Proof

```html
<section class="social-proof">
  <div class="proof-metrics">
    <div class="metric">
      <span class="metric-value">12,847</span>
      <span class="metric-label">Teams reviewing PRs</span>
    </div>
    <div class="metric">
      <span class="metric-value">2.3M</span>
      <span class="metric-label">PRs reviewed this month</span>
    </div>
    <div class="metric">
      <span class="metric-value">847</span>
      <span class="metric-label">Bugs caught today</span>
    </div>
  </div>
  <div class="proof-logos">
    <p class="proof-context">Used in production at</p>
    <!-- Logos with link to case studies -->
  </div>
</section>
```

**What changed:**
- Exact numbers instead of vague claims — "12,847 teams" not "thousands"
- Time-scoped metrics — "this month," "today" — suggests real-time, living product
- "Used in production at" instead of "trusted by" — speaks the audience's language
- The metrics tell a story: teams → volume → daily impact

---

## Example 6: Feature Section That Teaches

### The Description Approach (Tells)

```html
<div class="feature">
  <h3>Smart Code Analysis</h3>
  <p>Our AI analyzes your code and finds bugs automatically. It uses
  advanced machine learning to understand context and identify issues
  that traditional linters miss.</p>
</div>
```

This describes the feature. The reader has to imagine what it's like. Imagination is work.

### The Demonstration Approach (Shows)

```html
<div class="feature-demo">
  <div class="feature-content">
    <p class="feature-eyebrow">Smart Analysis</p>
    <h3>It reads your code like a senior engineer would</h3>
    <p>Not pattern matching — understanding. It traces data flow across files, recognizes architectural patterns, and spots the bugs that pass tests because the tests have the same blind spots as the code.</p>
  </div>
  <div class="feature-visual">
    <!-- Actual product UI showing analysis in progress -->
    <div class="analysis-demo">
      <div class="file-tree">
        <div class="file analyzed">auth/validate.ts ✓</div>
        <div class="file analyzing">api/routes.ts ⟳</div>
        <div class="file pending">db/queries.ts</div>
      </div>
      <div class="finding">
        <span class="severity high">High</span>
        <p>SQL injection via unsanitized user input in <code>getUserById()</code></p>
        <code class="fix">Use parameterized query: db.query('SELECT...WHERE id=$1', [id])</code>
      </div>
    </div>
  </div>
</div>
```

**The difference:**
- "Reads your code like a senior engineer would" — the headline creates recognition, not just description
- "Spots bugs that pass tests because the tests have the same blind spots" — this is insight, not feature description
- The visual IS a product demo — a file tree being analyzed, a real-looking finding with a fix
- The visitor experiences the product instead of reading about it

---

## The Craft Standard

When you build a landing page section, compare it to these examples. Ask:

1. **Is it at Level 3 specificity?** Or is it still generic enough to belong to any product?
2. **Does it show or tell?** Can I replace the description with a demonstration?
3. **Do the tokens have a world?** Or are they just `--primary`, `--secondary`, `--accent`?
4. **Is the scroll rhythm breathing?** Or is everything the same weight?
5. **Would I remember this page tomorrow?** What's the one thing that sticks?

If the page passes all five, it has craft. If it doesn't, the examples above show you where to look.
