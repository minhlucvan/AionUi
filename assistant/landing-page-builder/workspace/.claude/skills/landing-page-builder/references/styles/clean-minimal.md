# Style: Clean Minimal

Reference sites: **Stripe**, **Clerk**, **Resend**, **Plaid**

## Personality

Clarity above all. The page communicates complex value through simplicity. No decoration that doesn't serve understanding. Whitespace is the primary design tool. The confidence comes from what's NOT on the page — every element earns its space.

## Visual Signature

Generous whitespace. Crisp typography with tight headlines. Subtle gray palette with a single accent. Product UI screenshots with refined shadows. Geometric precision in spacing and alignment. The page feels like a well-written API doc that happens to be beautiful.

## Color World

```css
:root {
  /* Paper — bright, clean, maximum clarity */
  --paper: #ffffff;
  --canvas: #fafafa;
  --surface: #f5f5f5;
  --well: #eeeeee;

  /* Ink — true blacks and structured grays */
  --ink-headline: #0a0a0a;
  --ink-body: #525252;
  --ink-secondary: #8a8a8a;
  --ink-muted: #c4c4c4;

  /* Brand — single precise accent */
  --brand: #635bff;
  --brand-hover: #7a73ff;
  --brand-light: rgba(99, 91, 255, 0.06);

  /* Borders — barely there */
  --line: rgba(0, 0, 0, 0.08);
  --line-subtle: rgba(0, 0, 0, 0.04);
  --line-emphasis: rgba(0, 0, 0, 0.15);
}
```

## Typography

```css
:root {
  --font-display: 'Inter', system-ui, sans-serif;
  --font-body: 'Inter', system-ui, sans-serif;
  --font-mono: 'SF Mono', 'Fira Code', monospace;

  --text-display: clamp(2.75rem, 5vw + 1rem, 4.5rem);
  --text-display-leading: 1.05;
  --text-display-tracking: -0.035em;
  --text-display-weight: 600;

  --text-heading: clamp(1.75rem, 3vw + 0.5rem, 2.5rem);
  --text-heading-tracking: -0.02em;

  --text-body: 1.0625rem;
  --text-body-leading: 1.65;

  --text-small: 0.875rem;
}
```

Headlines: tight tracking (-0.035em), medium weight (600 not 700). Body: generous line-height (1.65). The typography is the design.

## Hero Approach

**Product-led centered.** Headline above, product screenshot below. Maximum simplicity. The screenshot is the star — presented with refined shadow treatment that makes it feel real.

```
┌──────────────────────────────────────────┐
│  [nav]  Logo    Products  Pricing  [CTA] │
├──────────────────────────────────────────┤
│                                          │
│              Eyebrow label               │
│                                          │
│        Clear, confident headline         │
│        that explains the value           │
│                                          │
│      One line of supporting copy.        │
│                                          │
│       [Primary CTA]   Link →             │
│                                          │
│   ┌──────────────────────────────────┐   │
│   │                                  │   │
│   │    Product Screenshot            │   │
│   │    with refined shadow           │   │
│   │                                  │   │
│   └──────────────────────────────────┘   │
│                                          │
└──────────────────────────────────────────┘
```

## Section Rhythm

```
[Hero          — 90vh  — --paper, centered, screenshot below headline ]
[Logo bar      — 100px — --paper, grayscale logos at 40% opacity      ]
[Feature block — 700px — --canvas, split layout, screenshot + copy    ]
[Feature block — 700px — --paper, split layout reversed               ]
[Feature grid  — 500px — --canvas, 3-col cards minimal               ]
[Testimonial   — 400px — --paper, single large quote                  ]
[Pricing       — 800px — --canvas, clean table with accent on popular ]
[Final CTA     — 350px — --paper, centered, minimal                   ]
```

## Motion

- Character: **restrained** — almost invisible
- Scroll reveals: `opacity` only, 500ms, ease-out (no translateY — elements don't move, they appear)
- Hover: background color change, no transform
- Transitions: 200ms base
- No glow effects. No dramatic lifts. Refinement, not spectacle.

## Depth Strategy

**Subtle shadows.** One shadow style for cards and screenshots. No borders on cards (shadow defines the edge).

```css
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.04);
--shadow-md: 0 2px 8px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(0, 0, 0, 0.04);
--shadow-lg: 0 4px 16px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.03);
--shadow-screenshot: 0 8px 32px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.04);
```

## CTA Style

```css
.cta-primary {
  padding: 12px 24px;
  border-radius: 8px;
  background: var(--brand);
  color: #fff;
  font-weight: 600;
  font-size: 0.9375rem;
  transition: background 0.15s;
}

.cta-primary:hover {
  background: var(--brand-hover);
}
```

No transform. No shadow on hover. Just a color shift. The confidence is in the restraint.

## Signature Elements

- Product screenshots with refined multi-layer shadow (feels like floating paper)
- Generous whitespace that makes every element feel intentional
- Code blocks with syntax highlighting for technical products
- Animated gradient text on display headings (very subtle, brand color shift)
- Metric cards with monospace numbers

## Anti-Defaults

| Reject | Instead | Why |
|--------|---------|-----|
| Background gradients | Pure white or subtle gray | Clarity comes from restraint |
| Hover lift transforms | Subtle background change | Movement would feel out of character |
| Icon-heavy feature cards | Text-led with small accent detail | Let the copy do the work |
| Multiple accent colors | Single brand color + grays | One color = maximum emphasis |
| Dense, busy layouts | Generous padding everywhere | Whitespace IS the design |

## When to Use

- Fintech, payments, banking
- API products, developer platforms
- Enterprise SaaS with clean positioning
- Products that need to feel trustworthy and established
- Anything that benefits from "less is more" confidence
