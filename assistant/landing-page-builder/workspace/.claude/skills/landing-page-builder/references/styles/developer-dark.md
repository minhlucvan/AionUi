# Style: Developer Dark

Reference sites: **Linear**, **Vercel**, **Raycast**, **Warp**

## Personality

Precision. Speed. Trust through technical credibility. The page should feel like it was built by engineers for engineers — no fluff, no marketing speak, just clear value demonstrated through the product itself.

## Visual Signature

Dark backgrounds with subtle depth. Monospace accents. Terminal-like elements. The product UI is the hero visual. Ambient glow effects around interactive elements. Clean geometric sans-serif type.

## Color World

```css
:root {
  /* Void — deep, near-black with blue undertone */
  --void: #0a0a0f;
  --surface: #111118;
  --panel: #1a1a24;
  --control: #242430;

  /* Ink — cool, high contrast headlines, muted body */
  --ink-bright: #f4f2ef;
  --ink-body: #a8a4a0;
  --ink-dim: #6b6966;
  --ink-ghost: #3d3a38;

  /* Signal — terminal green for success, action */
  --signal: #00d4aa;
  --signal-hover: #00eabb;
  --signal-glow: rgba(0, 212, 170, 0.12);

  /* Alert */
  --alert: #ff6b4a;

  /* Edges */
  --edge: rgba(255, 255, 255, 0.06);
  --edge-subtle: rgba(255, 255, 255, 0.03);
  --edge-emphasis: rgba(255, 255, 255, 0.12);
}
```

## Typography

```css
:root {
  --font-display: 'Geist', system-ui, sans-serif;
  --font-body: 'Geist', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;

  --text-display: clamp(2.5rem, 5vw + 1rem, 4rem);
  --text-display-leading: 1.05;
  --text-display-tracking: -0.03em;
  --text-display-weight: 700;

  --text-heading: clamp(1.75rem, 3vw + 0.5rem, 2.25rem);
  --text-body: 1rem;
  --text-small: 0.875rem;
}
```

Monospace appears on: code snippets, metrics, terminal elements, keyboard shortcuts, version numbers.

## Hero Approach

**Split or immersive.** One side is always the product — a terminal, a code editor, a deploy pipeline. Never an illustration. The developer audience trusts code, not artwork.

```
┌────────────────────────────────────────────┐
│  [nav]  Logo    Features  Pricing   [CTA]  │
├────────────────────┬───────────────────────┤
│                    │                       │
│  Eyebrow label     │   ┌─────────────┐    │
│                    │   │ $ git push  │    │
│  Headline that     │   │ Deploying...│    │
│  states the        │   │ ✓ Live      │    │
│  transformation    │   └─────────────┘    │
│                    │                       │
│  [Primary CTA]     │                       │
│  Secondary link →  │                       │
│                    │                       │
│  ── 2.3M deploys ──│                       │
│                    │                       │
└────────────────────┴───────────────────────┘
```

## Section Rhythm

```
[Hero          — 90vh  — --void + radial accent glow     ]
[Logo bar      — 80px  — --void, quiet                    ]
[Primary feat  — 800px — --surface, full product demo     ]
[Feature grid  — 500px — --void, 3-col cards with borders ]
[Metrics       — 120px — --surface, monospace numbers     ]
[Testimonial   — 500px — --void, single quote, breathing  ]
[Pricing       — 800px — --surface, accent-bordered tier   ]
[Final CTA     — 400px — --void + glow, centered          ]
```

## Motion

- Character: **snappy** — instant, like terminal response
- Scroll reveals: `translateY(16px)` fade-up, 400ms, ease-out
- Hover: 1px lift + `box-shadow` glow on accent
- Transitions: 150ms base
- No floaty animations. No parallax. No decorative motion.

## Depth Strategy

**Borders-only.** No shadows. Shadows feel soft; this style is precise. Cards defined by `1px solid rgba(255,255,255,0.06)`.

## CTA Style

```css
.cta-primary {
  padding: 10px 20px;
  border-radius: 6px;
  background: var(--signal);
  color: #000;
  font-weight: 600;
  font-size: 0.9375rem;
  transition: transform 0.15s, box-shadow 0.15s;
}

.cta-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 20px var(--signal-glow);
}
```

Compact. No large padding. Technical audience prefers density.

## Signature Elements

- Terminal animation in hero (typed commands with cursor blink)
- Code diff or editor screenshot as product visual
- Monospace metrics bar with tabular-nums
- Keyboard shortcut badges (`⌘K` styled like actual keycaps)
- GitHub stars / npm downloads as real-time social proof

## Anti-Defaults

| Reject | Instead | Why |
|--------|---------|-----|
| Gradient mesh blob hero | Terminal or code editor visual | Audience trusts code |
| "Transform your workflow" | Specific technical outcome | Developers detect BS instantly |
| Illustration-based features | Product screenshots or code | Show, don't illustrate |
| "Get Started" CTA | Name the actual first action | "Deploy your first project" |
| Carousel testimonials | Single quote from a known eng | One credible voice > many generic |

## When to Use

- Developer tools, CLI products, APIs
- DevOps, infrastructure, deployment
- Code editors, IDEs, terminal tools
- Technical SaaS with developer-first positioning
