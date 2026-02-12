# Style: Warm Friendly

Reference sites: **Notion**, **Slack**, **Loom**, **Pitch**

## Personality

Approachable. Human. The page feels like a friendly conversation, not a sales pitch. Rounded shapes, warm colors, and generous spacing communicate "this is easy to use" before the visitor reads a single word. The product feels welcoming — like it was designed for real people, not power users.

## Visual Signature

Warm-tinted backgrounds (off-white, cream, light stone). Rounded corners everywhere. Soft shadows instead of hard borders. Illustrations or product screenshots with playful annotations. Typography that's geometric but warm — never cold or clinical.

## Color World

```css
:root {
  /* Canvas — warm, never sterile white */
  --canvas: #faf8f5;
  --paper: #ffffff;
  --linen: #f3f0eb;
  --sand: #e8e4dd;

  /* Ink — warm grays, not blue-gray */
  --ink-headline: #1c1917;
  --ink-body: #57534e;
  --ink-secondary: #a8a29e;
  --ink-faint: #d6d3d1;

  /* Joy — warm, inviting accent */
  --joy: #f97316;
  --joy-hover: #fb923c;
  --joy-soft: rgba(249, 115, 22, 0.08);

  /* Alternative accents for variety */
  --calm: #0ea5e9;
  --growth: #22c55e;

  /* Borders — soft warm tones */
  --edge: rgba(28, 25, 23, 0.06);
  --edge-subtle: rgba(28, 25, 23, 0.03);
  --edge-emphasis: rgba(28, 25, 23, 0.12);
}
```

## Typography

```css
:root {
  --font-display: 'Plus Jakarta Sans', system-ui, sans-serif;
  --font-body: 'Inter', system-ui, sans-serif;

  --text-display: clamp(2.25rem, 5vw + 0.5rem, 3.75rem);
  --text-display-leading: 1.1;
  --text-display-tracking: -0.02em;
  --text-display-weight: 700;

  --text-heading: clamp(1.5rem, 3vw + 0.5rem, 2rem);
  --text-body: 1rem;
  --text-body-leading: 1.7;

  --text-small: 0.875rem;
}
```

Body line-height is generous (1.7) — readability communicates care. Display font is geometric but slightly rounded (Plus Jakarta) — technical credibility without coldness.

## Hero Approach

**Product-led with human context.** Show the product, but surround it with human elements — avatars, cursor annotations, real names. The product should look like real people are actively using it.

```
┌──────────────────────────────────────────────┐
│  [nav]  Logo    Features  Pricing    [CTA]   │
├──────────────────────────────────────────────┤
│                                              │
│             Friendly headline                │
│         that speaks like a human             │
│                                              │
│      A warm, conversational subtitle.        │
│      Not corporate. Not technical.           │
│                                              │
│    [  Start free — no card needed  ]         │
│                                              │
│    ┌────────────────────────────────────┐    │
│    │  ┌─────┐  "Great work on the     │    │
│    │  │ 🙂  │   Q3 roadmap!"          │    │
│    │  └─────┘                          │    │
│    │         Product interface          │    │
│    │         with real content          │    │
│    │                       ┌──────┐    │    │
│    │                       │cursor│    │    │
│    │                       └──────┘    │    │
│    └────────────────────────────────────┘    │
│                                              │
└──────────────────────────────────────────────┘
```

## Section Rhythm

```
[Hero          — 90vh  — --canvas, product screenshot with annotations ]
[Logo bar      — 100px — --canvas, warm grayscale logos                ]
[Feature 1     — 700px — --paper, illustration left, copy right        ]
[Feature 2     — 700px — --linen, copy left, illustration right        ]
[Feature 3     — 700px — --paper, illustration left, copy right        ]
[Testimonials  — 600px — --canvas, 3-column card grid                  ]
[Pricing       — 750px — --paper, 2 tiers (simple), warm accent       ]
[Final CTA     — 400px — --canvas, centered, friendly                  ]
```

## Motion

- Character: **fluid** — smooth, comfortable, like opening a notebook
- Scroll reveals: `translateY(24px)` fade-up, 600ms, ease-out (slightly slower = friendlier)
- Hover: scale(1.02) + shadow increase on cards
- Transitions: 200ms base, ease-out
- Micro-interactions welcome: button hover grows slightly, cards lift gently

## Depth Strategy

**Soft shadows.** No hard borders. Cards float above the surface with warm-toned shadows.

```css
--shadow-card: 0 1px 3px rgba(28, 25, 23, 0.04), 0 4px 12px rgba(28, 25, 23, 0.03);
--shadow-hover: 0 4px 12px rgba(28, 25, 23, 0.06), 0 12px 24px rgba(28, 25, 23, 0.04);
--shadow-elevated: 0 8px 24px rgba(28, 25, 23, 0.08);
```

## CTA Style

```css
.cta-primary {
  padding: 14px 28px;
  border-radius: 12px;
  background: var(--joy);
  color: #fff;
  font-weight: 600;
  font-size: 1rem;
  transition: transform 0.2s ease-out, box-shadow 0.2s ease-out;
}

.cta-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(249, 115, 22, 0.2);
}
```

Larger padding, larger radius — feels approachable. Hover lift is slightly more than other styles because playfulness is on-brand.

## Signature Elements

- Product screenshots with real-looking content (actual names, real text, not lorem)
- Avatar stacks showing real users
- Annotation bubbles on product visuals (cursor + name labels)
- Emoji used sparingly in feature titles or badges
- Handwritten-style accent elements (underlines, circles, arrows)
- Rounded pill badges for categories

## Anti-Defaults

| Reject | Instead | Why |
|--------|---------|-----|
| Dark, techy backgrounds | Warm off-white canvas | Warmth = approachability |
| Sharp corners (4-6px radius) | Generous rounding (12-16px) | Rounded = friendly |
| Corporate stock photos | Product UI with real content | Authenticity > perfection |
| "Powerful platform for teams" | Conversational copy | Speak like a human |
| Formal testimonials | Casual quotes with emoji | Match the product's voice |

## When to Use

- Collaboration tools (Notion, Slack-style)
- Project management and productivity
- Communication platforms
- Consumer SaaS with broad appeal
- Products positioning as "the simple alternative to..."
