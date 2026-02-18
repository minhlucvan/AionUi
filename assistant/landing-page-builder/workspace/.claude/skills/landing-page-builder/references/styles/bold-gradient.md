# Style: Bold Gradient

Reference sites: **Arc Browser**, **Framer**, **Figma**, **Pitch**

## Personality

Expressive. Confident. Unapologetically bold. The page announces itself with color and doesn't apologize. This style works for products that are doing something genuinely different and want the landing page to reflect that ambition. Not subtle — intentional.

## Visual Signature

Rich gradient backgrounds. Large typography that owns the viewport. Vibrant accent colors. Animated gradient meshes. Glass-morphism cards. The page feels like a design tool's marketing — because it IS marketing for creative/ambitious products.

## Color World

```css
:root {
  /* Canvas — deep with color undertone */
  --canvas: #0f0b1a;
  --surface: #1a1528;
  --panel: #241e36;
  --glass: rgba(255, 255, 255, 0.04);

  /* Ink */
  --ink-bright: #ffffff;
  --ink-body: #b0a8c4;
  --ink-dim: #746b8a;
  --ink-ghost: #3d3650;

  /* Spectrum — the gradient system */
  --spectrum-start: #8b5cf6;
  --spectrum-mid: #d946ef;
  --spectrum-end: #f43f5e;

  --accent: var(--spectrum-start);
  --accent-hover: #a78bfa;
  --accent-glow: rgba(139, 92, 246, 0.2);

  /* Edges */
  --edge: rgba(255, 255, 255, 0.08);
  --edge-subtle: rgba(255, 255, 255, 0.04);
  --edge-glass: rgba(255, 255, 255, 0.12);
}
```

## Typography

```css
:root {
  --font-display: 'Satoshi', 'DM Sans', system-ui, sans-serif;
  --font-body: 'Inter', system-ui, sans-serif;

  --text-display: clamp(3rem, 7vw + 1rem, 5.5rem);
  --text-display-leading: 1.0;
  --text-display-tracking: -0.04em;
  --text-display-weight: 800;

  --text-heading: clamp(2rem, 4vw + 0.5rem, 3rem);
  --text-heading-tracking: -0.03em;

  --text-body: 1.0625rem;
  --text-body-leading: 1.6;
  --text-small: 0.875rem;
}
```

Display text is LARGE. Extra bold (800). Very tight tracking (-0.04em). This style uses size and weight to create drama.

## Hero Approach

**Copy-led immersive.** The headline dominates. Background gradient mesh creates atmosphere. Product visual may appear below, but the words come first. The gradient IS the visual identity.

```
┌──────────────────────────────────────────────┐
│  [nav - glass]  Logo              [CTA glow] │
├──────────────────────────────────────────────┤
│  ░░░░ Gradient mesh background ░░░░░░░░░░░  │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│          ░░░░░░░░░░░░░░░░░░░░░░░            │
│                                              │
│     The headline is                          │
│     THE ENTIRE HERO.                         │
│     (gradient text)                          │
│                                              │
│     One supporting line.                     │
│                                              │
│     [  Primary CTA with glow  ]              │
│              ░░░░░░░░                        │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
└──────────────────────────────────────────────┘
```

## Section Rhythm

```
[Hero          — 100vh — gradient mesh bg, oversized headline        ]
[Logo bar      — 80px  — --canvas, subtle, contrast to hero         ]
[Feature hero  — 800px — --surface, large product visual with glow  ]
[Feature cards — 600px — --canvas, glass-morphism cards, 3-col      ]
[Testimonial   — 500px — --surface, gradient border on quote card   ]
[Feature demo  — 700px — --canvas, interactive product demo         ]
[Pricing       — 800px — --surface, glass cards, gradient on popular]
[Final CTA     — 500px — gradient mesh returns, bookend the hero    ]
```

## Motion

- Character: **dramatic** — smooth but noticeable
- Scroll reveals: `translateY(32px)` + `scale(0.97)` fade-up, 700ms, cubic-bezier(0.16, 1, 0.3, 1)
- Hover: glow intensification + slight scale on cards
- Transitions: 250ms base
- Background mesh: slow continuous animation (120s loop, subtle movement)
- Gradient text shimmer on hover for headlines

## Depth Strategy

**Glass-morphism.** Semi-transparent surfaces with `backdrop-filter: blur()`. Gradient borders. Glow effects.

```css
.glass-card {
  background: rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
}

.gradient-border {
  border: 1px solid transparent;
  background:
    linear-gradient(var(--surface), var(--surface)) padding-box,
    linear-gradient(135deg, var(--spectrum-start), var(--spectrum-end)) border-box;
}
```

## CTA Style

```css
.cta-primary {
  padding: 14px 32px;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--spectrum-start), var(--spectrum-mid));
  color: #fff;
  font-weight: 700;
  font-size: 1rem;
  transition: transform 0.2s, box-shadow 0.2s;
  box-shadow: 0 0 20px var(--accent-glow);
}

.cta-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 0 40px var(--accent-glow), 0 8px 32px rgba(0, 0, 0, 0.3);
}
```

Gradient background. Ambient glow at rest. Intensified glow on hover.

## Signature Elements

- Animated gradient mesh background (CSS or canvas)
- Gradient text on display headlines
- Glass-morphism cards with gradient borders
- Glow effects around CTAs and featured elements
- Oversized display typography (5rem+ hero headlines)
- Gradient accent line/divider between sections

## Anti-Defaults

| Reject | Instead | Why |
|--------|---------|-----|
| Flat solid backgrounds | Gradient mesh with animation | The gradient IS the identity |
| Normal-sized headlines | Oversized display text (5rem+) | Drama and confidence |
| Standard card borders | Gradient borders + glass | Premium, distinct |
| Simple button styles | Gradient + glow CTA | The CTA should feel magnetic |
| Static screenshots | Product visuals with glow aura | Everything should feel alive |

## When to Use

- Design tools (Figma, Framer)
- Creative platforms
- Browser/app products doing something radically different
- AI products with ambitious positioning
- Products targeting designers and creative professionals
