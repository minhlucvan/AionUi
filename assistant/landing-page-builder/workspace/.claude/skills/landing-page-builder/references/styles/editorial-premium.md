# Style: Editorial Premium

Reference sites: **Apple**, **Aesop**, **Squarespace**, **Craft (app)**

## Personality

Refined. Considered. Every element placed with the deliberation of a magazine layout. The page doesn't shout — it draws you in with beautiful typography, dramatic whitespace, and curated imagery. The product feels expensive and worth it before you see the price.

## Visual Signature

Serif or mixed serif/sans typography. Dramatic whitespace — more space than content. High-quality imagery or renders with careful art direction. Muted, sophisticated color palette. The page reads like a premium editorial spread.

## Color World

```css
:root {
  /* Surfaces — barely-there warmth */
  --cream: #f9f7f4;
  --paper: #ffffff;
  --stone: #f0ece6;
  --charcoal: #1a1a1a;

  /* Ink — high contrast, editorial precision */
  --ink-black: #111111;
  --ink-body: #3d3d3d;
  --ink-caption: #7a7a7a;
  --ink-ghost: #c4c0b8;

  /* Accent — singular, restrained */
  --accent: #b45309;
  --accent-hover: #d97706;
  --accent-subtle: rgba(180, 83, 9, 0.06);

  /* Borders — fine lines like print rules */
  --rule: rgba(0, 0, 0, 0.1);
  --rule-light: rgba(0, 0, 0, 0.05);
  --rule-heavy: rgba(0, 0, 0, 0.2);
}
```

The accent is warm amber — not tech blue. Feels curated, not corporate.

## Typography

```css
:root {
  --font-display: 'Fraunces', 'DM Serif Display', Georgia, serif;
  --font-body: 'Inter', 'Helvetica Neue', system-ui, sans-serif;

  --text-display: clamp(2.75rem, 6vw + 0.5rem, 5rem);
  --text-display-leading: 1.05;
  --text-display-tracking: -0.02em;
  --text-display-weight: 600;

  --text-heading: clamp(1.75rem, 3vw + 0.5rem, 2.5rem);
  --text-heading-leading: 1.2;

  --text-body: 1.0625rem;
  --text-body-leading: 1.75;

  --text-caption: 0.8125rem;
  --text-caption-tracking: 0.06em;
}
```

**Serif for display, sans for body.** The serif headlines create personality; the sans body ensures readability. The contrast between them IS the typographic identity.

Generous body line-height (1.75) — editorial pacing. Caption text with wide tracking (0.06em) for overlines and labels.

## Hero Approach

**Copy-led editorial.** Massive serif headline with generous whitespace. Product image below, treated like a magazine photograph — full-bleed or with careful framing. Minimal UI elements in the hero.

```
┌────────────────────────────────────────────────┐
│  [nav]  Logo                    Menu   [Login] │
├────────────────────────────────────────────────┤
│                                                │
│                                                │
│                                                │
│         The product story,                     │
│         told in one line.                      │
│                (serif, large)                  │
│                                                │
│     Subtitle in sans-serif. Elegant brevity.   │
│                                                │
│             [ Explore → ]                      │
│                                                │
│                                                │
│  ┌──────────────────────────────────────────┐  │
│  │                                          │  │
│  │     Full-width curated product image     │  │
│  │                                          │  │
│  └──────────────────────────────────────────┘  │
│                                                │
└────────────────────────────────────────────────┘
```

## Section Rhythm

```
[Hero          — 95vh  — --cream, serif headline, product image below ]
[Statement     — 300px — --paper, single paragraph, centered narrow   ]
[Feature image — 700px — full-bleed image or product render           ]
[Feature copy  — 400px — --cream, narrow column, editorial spacing    ]
[Feature image — 700px — full-bleed, different angle/view             ]
[Testimonial   — 500px — --stone, large serif quote, minimal          ]
[Pricing       — 600px — --paper, clean, understated                  ]
[Final CTA     — 500px — --charcoal (dark), serif headline, contrast  ]
```

**The pattern:** Image-heavy sections alternate with text-heavy sections. Like turning pages of a magazine.

## Motion

- Character: **deliberate** — slow, smooth, considered
- Scroll reveals: `opacity` only, 800ms, ease-out (no translation — elements don't move, they emerge)
- Hover: color shifts only, slow (300ms)
- Transitions: 300ms base, ease-in-out
- No bouncing. No glow. No playfulness. Every motion is measured.

## Depth Strategy

**Flat or near-flat.** No card shadows. Depth comes from spacing, color contrast, and typography weight — not surface elevation.

```css
/* No card shadows. Depth through spacing and color. */
.feature-card {
  padding: 48px 32px;
  border-bottom: 1px solid var(--rule-light);
  /* No background. No shadow. No border-radius. */
}
```

## CTA Style

```css
.cta-primary {
  padding: 14px 32px;
  border-radius: 0;  /* Square — editorial, not SaaS */
  background: var(--ink-black);
  color: var(--cream);
  font-weight: 500;
  font-size: 0.9375rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  transition: background 0.3s;
}

.cta-primary:hover {
  background: var(--accent);
}
```

Square corners. Uppercase. Wide letter-spacing. The CTA feels like a magazine call to action, not a SaaS button. Hover shifts to accent color — warm, not dramatic.

## Signature Elements

- Serif display headlines with dramatic size and whitespace
- Full-bleed product imagery with editorial framing
- Rule lines (horizontal dividers) as section separators
- Uppercase small-cap labels with wide tracking
- Pull quotes styled like magazine blockquotes
- Asymmetric layouts (text on left third, image on right two-thirds)
- Dark-on-light contrast flip for the final CTA section

## Anti-Defaults

| Reject | Instead | Why |
|--------|---------|-----|
| Sans-serif for everything | Serif display + sans body | Typography IS the personality |
| Rounded corners | Square or barely rounded (2px) | Editorial precision |
| Icon-based feature grids | Image-led feature sections | Premium products show, not icon |
| Gradient backgrounds | Solid, muted surfaces | Sophistication = restraint |
| "Get started free" CTA | "Explore" or "Begin" | Premium language, not SaaS language |
| Packed layouts | Dramatic whitespace | Space = luxury |

## When to Use

- Premium consumer products
- Design and creative tools with editorial positioning
- Lifestyle or premium brand SaaS
- Products where aesthetics are part of the value prop
- Hardware + software products (like Apple)
- Any product positioning itself as "the refined choice"
