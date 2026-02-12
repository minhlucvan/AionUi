# Landing Page Direction — Light SaaS

Style reference: Notion, Stripe, Clerk, Linear (light mode)

## Story

### Transformation
Go from scattered notes and missed follow-ups to a team that actually remembers what matters about every customer relationship.

### Audience
Startup founders and ops leads managing 50-500 customer relationships. They're currently using spreadsheets or a CRM that feels like it was built for a 10,000-person sales org. They want something that works the way they think — flexible, fast, not enterprise-heavy.

### Hook
"The CRM that works like your brain does."

## Visual World

### Domain Concepts
Notebooks, conversations, connections, timelines, context, memory, relationships

### Color Mood
- Foundation: light
- Temperature: warm (stone undertones, not sterile white)
- Accent: deep indigo (#4f46e5) — signals intelligence, depth, trust without being corporate
- Palette:
  - --paper: #ffffff           /* Content surfaces */
  - --canvas: #fafaf8          /* Page background — warm, not cold */
  - --linen: #f5f3f0           /* Alternating sections */
  - --shelf: #edeae5           /* Elevated surfaces */
  - --ink-dense: #1a1a1a       /* Headlines */
  - --ink-body: #4a4a4a        /* Body text */
  - --ink-note: #8a8a8a        /* Secondary text */
  - --ink-pencil: #c4c0ba      /* Borders, placeholders */
  - --focus: #4f46e5           /* CTA, active states */
  - --focus-soft: rgba(79, 70, 229, 0.08)  /* Hover backgrounds */
  - --warmth: #f59e0b          /* Highlights, stars, important */

### Typography
- Display font: Plus Jakarta Sans (geometric but warm)
- Body font: Inter
- Personality: Slightly rounded geometry — approachable without being childish
- Scale: 14, 16, 18, 20, 24, 32, 48, 60
- Weights: 400, 500, 600, 700

### Motion Language
- Character: fluid — smooth, like flipping through a notebook
- Scroll reveals: fade-up, 600ms, ease-out (slightly slower than dark variant)
- Hover: background fill + subtle scale
- Duration: 200ms base

### Signature Element
A "relationship timeline" visualization in the hero — showing a customer's journey as a beautiful horizontal timeline with touchpoints, notes, and context cards, replacing the typical CRM screenshot grid.

## Section Choreography

| # | Section | Purpose | Visual Weight | Background |
|---|---------|---------|---------------|------------|
| 1 | Hero | Hook: "Works like your brain" + timeline visual | LARGE | --canvas with radial warmth |
| 2 | Logo Bar | "Teams who stopped using Salesforce" | small | --canvas |
| 3 | Primary Feature | Show the relationship view in action | LARGE | --paper |
| 4 | Feature Trio | Speed, flexibility, context (left-right alternating) | medium × 3 | --linen, --paper, --linen |
| 5 | Testimonial | Founder quote about ditching their old CRM | medium-large | --canvas |
| 6 | Comparison | "Not another Salesforce" — lightweight comparison table | medium | --paper |
| 7 | Pricing | Two tiers (free + pro), no enterprise upsell | LARGE | --linen |
| 8 | Final CTA | "Remember your first customer" | medium | --canvas |

## Tokens

```css
:root {
  --paper: #ffffff;
  --canvas: #fafaf8;
  --linen: #f5f3f0;
  --shelf: #edeae5;

  --ink-dense: #1a1a1a;
  --ink-body: #4a4a4a;
  --ink-note: #8a8a8a;
  --ink-pencil: #c4c0ba;

  --focus: #4f46e5;
  --focus-hover: #6366f1;
  --focus-soft: rgba(79, 70, 229, 0.08);
  --warmth: #f59e0b;

  --rule: rgba(0, 0, 0, 0.06);
  --rule-subtle: rgba(0, 0, 0, 0.03);
  --rule-heavy: rgba(0, 0, 0, 0.12);

  --section-sm: 64px;
  --section-md: 96px;
  --section-lg: 128px;
  --section-xl: 160px;

  --text-display: clamp(2.5rem, 5vw + 1rem, 3.75rem);
  --text-heading: clamp(1.5rem, 3vw + 0.5rem, 2rem);
  --text-subheading: 1.25rem;
  --text-body: 1rem;
  --text-small: 0.875rem;
  --text-overline: 0.75rem;

  --font-display: 'Plus Jakarta Sans', system-ui, sans-serif;
  --font-body: 'Inter', system-ui, sans-serif;

  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;

  --shadow-card: 0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 12px rgba(0, 0, 0, 0.03);
  --shadow-elevated: 0 4px 16px rgba(0, 0, 0, 0.06), 0 12px 32px rgba(0, 0, 0, 0.04);
}
```

## Patterns

### Hero
- Layout: product-led (copy centered above, timeline visual below)
- Headline: "The CRM that works like your brain does."
- CTA: "Try it with your contacts →"
- Visual: Relationship timeline showing a customer journey

### CTA Primary
- Padding: 14px 28px
- Radius: 10px
- Background: var(--focus)
- Hover: darken + subtle shadow

### Feature Card
- Padding: 24px
- Radius: 12px
- Border: none (shadow-based depth)
- Background: var(--paper)
- Shadow: var(--shadow-card)

### Section Header
- Max-width: 560px
- Alignment: center
- Eyebrow: uppercase, var(--text-overline), var(--focus) color, 600 weight

## Anti-Defaults

### Layout Rejections
| Rejected | Instead | Reason |
|----------|---------|--------|
| Grid of CRM features with icons | Relationship timeline visual | Show the EXPERIENCE, not a feature list |
| Three-tier pricing with enterprise | Two tiers (free + pro) | Audience is anti-enterprise — match their values |
| "Schedule a demo" CTA | "Try it with your contacts" | Self-serve audience doesn't want to talk to sales |

### Copy Rejections
| Rejected | Instead | Reason |
|----------|---------|--------|
| "All-in-one CRM platform" | "Works like your brain does" | Emotional positioning, not category labeling |
| "Manage your pipeline" | "Remember what matters about every relationship" | Reframe from management (work) to memory (value) |
| "Start Free Trial" | "Try it with your contacts" | Names the actual first action, lower friction |

## Decisions Log

| Decision | Rationale | Date |
|----------|-----------|------|
| Warm white (#fafaf8) not pure white | Matches "notebook" metaphor, feels personal | 2025-01-20 |
| Shadow-based depth (not borders) | Softer, friendlier — matches warm personality | 2025-01-20 |
| Plus Jakarta Sans display | Geometric but warm — technical credibility with approachability | 2025-01-20 |
| Two pricing tiers only | Anti-enterprise positioning is part of the story | 2025-01-20 |
| Amber warmth accent | Secondary accent for highlights/stars — warm, personal, non-corporate | 2025-01-20 |
