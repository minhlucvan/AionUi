# Style: Playful Creative

Reference sites: **Figma**, **Miro**, **Canva**, **Webflow**

## Personality

Energetic. Creative. The page itself demonstrates the product's creative power. Colors are more saturated, layouts are more adventurous, and the page doesn't follow safe SaaS patterns. The visitor should feel inspired — like the product will make them more creative, too.

## Visual Signature

Saturated colors used more liberally (not just one accent). Asymmetric layouts. Illustrations mixed with product UI. Animated product demos. Grid-breaking elements that overlap or extend beyond their containers. The page feels like a playground, not a brochure.

## Color World

```css
:root {
  /* Canvas — light with personality */
  --canvas: #fafbff;
  --paper: #ffffff;
  --tint: #f5f3ff;
  --depth: #1e1b4b;

  /* Ink */
  --ink-headline: #0f172a;
  --ink-body: #475569;
  --ink-secondary: #94a3b8;
  --ink-muted: #cbd5e1;

  /* Palette — multiple colors used intentionally */
  --violet: #8b5cf6;
  --pink: #ec4899;
  --cyan: #06b6d4;
  --amber: #f59e0b;
  --lime: #84cc16;

  /* Primary — one leads, others support */
  --primary: var(--violet);
  --primary-hover: #a78bfa;
  --primary-soft: rgba(139, 92, 246, 0.08);

  /* Borders */
  --edge: rgba(0, 0, 0, 0.06);
  --edge-subtle: rgba(0, 0, 0, 0.03);
}
```

**Multiple colors**, but with clear hierarchy. Violet leads, others appear in illustrations, badges, and accents for different features.

## Typography

```css
:root {
  --font-display: 'DM Sans', system-ui, sans-serif;
  --font-body: 'DM Sans', system-ui, sans-serif;

  --text-display: clamp(2.5rem, 6vw + 0.5rem, 4.5rem);
  --text-display-leading: 1.05;
  --text-display-tracking: -0.03em;
  --text-display-weight: 700;

  --text-heading: clamp(1.75rem, 3vw + 0.5rem, 2.5rem);
  --text-body: 1rem;
  --text-body-leading: 1.65;
  --text-small: 0.875rem;
}
```

DM Sans — geometric, slightly rounded, feels creative without being childish. Same family for display and body, using weight and size contrast.

## Hero Approach

**Product-led with creative energy.** Product visual is the centerpiece, but surrounded by creative elements — floating UI components, cursor annotations, colorful accents. The hero should feel like the product's canvas mid-creation.

```
┌────────────────────────────────────────────────┐
│  [nav]  Logo   Features  Templates  Pricing    │
│                                    [Try Free]  │
├────────────────────────────────────────────────┤
│                                                │
│              Playful headline                  │
│           that captures the energy             │
│                                                │
│         One line. With personality.            │
│                                                │
│   [  Start creating — it's free  ]  Demo →     │
│                                                │
│    ┌──────────────────────────────────────┐    │
│    │  ╭────╮     ╭──────────────╮        │    │
│    │  │ 👋 │     │ Product UI   │  ╭──╮  │    │
│    │  ╰────╯     │ with real    │  │🎨│  │    │
│    │   cursor     │ creative     │  ╰──╯  │    │
│    │   "Sam"      │ content      │  float  │    │
│    │             ╰──────────────╯         │    │
│    │      ╭──╮                            │    │
│    │      │⭐│  floating elements         │    │
│    │      ╰──╯                            │    │
│    └──────────────────────────────────────┘    │
│                                                │
└────────────────────────────────────────────────┘
```

## Section Rhythm

```
[Hero          — 95vh  — --canvas, product visual with floating elements]
[Logo bar      — 100px — --canvas, colorful brand logos (not grayscale)]
[Feature demo  — 800px — --paper, interactive product walkthrough       ]
[Feature bento — 700px — --tint, bento grid with different colors/sizes]
[Testimonial   — 500px — --paper, card grid with avatar + color accent ]
[Templates     — 600px — --canvas, scrolling template/example gallery   ]
[Pricing       — 700px — --tint, playful cards with color-coded tiers  ]
[Final CTA     — 450px — --depth (dark flip), contrast closing          ]
```

## Motion

- Character: **energetic** — bouncy, playful, responsive
- Scroll reveals: `translateY(24px) scale(0.98)` fade-up, 600ms, cubic-bezier(0.34, 1.56, 0.64, 1) (slight bounce)
- Hover: scale(1.03) + shadow increase + color shift
- Transitions: 200ms, cubic-bezier(0.34, 1.56, 0.64, 1) (spring)
- Floating elements: gentle continuous oscillation (3-5s loop, translateY ±4px)
- Interactive product demos encouraged

## Depth Strategy

**Shadows + color.** Colored shadows that match the element's accent. Cards have visible elevation.

```css
--shadow-card: 0 2px 8px rgba(0, 0, 0, 0.04), 0 8px 24px rgba(0, 0, 0, 0.06);
--shadow-violet: 0 4px 16px rgba(139, 92, 246, 0.15);
--shadow-pink: 0 4px 16px rgba(236, 72, 153, 0.15);
--shadow-hover: 0 8px 32px rgba(0, 0, 0, 0.1);

.card {
  border-radius: 16px;
  background: var(--paper);
  box-shadow: var(--shadow-card);
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1),
              box-shadow 0.2s;
}

.card:hover {
  transform: translateY(-4px) scale(1.01);
  box-shadow: var(--shadow-hover);
}
```

## CTA Style

```css
.cta-primary {
  padding: 14px 28px;
  border-radius: 12px;
  background: var(--primary);
  color: #fff;
  font-weight: 700;
  font-size: 1rem;
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1),
              box-shadow 0.2s;
}

.cta-primary:hover {
  transform: translateY(-2px) scale(1.02);
  box-shadow: var(--shadow-violet);
}
```

Bouncy hover (spring easing). Colored shadow. The CTA should feel clickable and fun.

## Signature Elements

- Floating UI elements around product screenshots (cursors, reaction emojis, tool palettes)
- Color-coded feature cards (different accent per feature)
- Bento grid with varied card sizes and colors
- Interactive product demos / mini-sandboxes
- Template/example gallery with horizontal scroll
- Cursor annotations with user names (collaboration feeling)
- Illustrated icons with the product's color palette

## Anti-Defaults

| Reject | Instead | Why |
|--------|---------|-----|
| Single accent color | Color palette with hierarchy | Creative products are colorful |
| Grayscale logo bar | Full-color brand logos | Retain the energy |
| Static screenshots | Interactive demos or animated visuals | Show the creative process |
| Uniform card grid | Bento grid with varied sizes | Break the grid = creative energy |
| Subtle, restrained motion | Bouncy, spring-eased animations | Playfulness is on-brand |
| Serious, corporate tone | Energetic, personality-driven copy | Match the creative audience |

## When to Use

- Design and creative tools
- Collaboration platforms with visual output
- No-code / low-code builders
- Template and asset marketplaces
- Products targeting designers, marketers, and creative professionals
