# Style: Enterprise Confident

Reference sites: **Datadog**, **Snowflake**, **HashiCorp**, **PagerDuty**

## Personality

Authority. Reliability. Scale. The page communicates "we handle serious infrastructure for serious companies." No playfulness — just competence, trust signals, and clear value propositions backed by real numbers. The visitor is often evaluating this against 3-5 competitors simultaneously.

## Visual Signature

Structured grid layouts. Data-rich sections. Metric-heavy social proof. Comparison tables. Clean but dense information architecture. Dark navy or deep gray color palette with a bright, actionable accent. The page feels like it was built by a company that handles your data.

## Color World

```css
:root {
  /* Surfaces — deep navy, not black */
  --navy: #0c1222;
  --surface: #131b2e;
  --panel: #1a2540;
  --card: #1f2d4a;

  /* Ink — clear, structured */
  --ink-white: #f0f2f5;
  --ink-body: #99a4b8;
  --ink-secondary: #687590;
  --ink-muted: #3d4d6a;

  /* Action — bright, unambiguous */
  --action: #3b82f6;
  --action-hover: #60a5fa;
  --action-light: rgba(59, 130, 246, 0.1);

  /* Status colors — enterprise needs clear status */
  --success: #22c55e;
  --warning: #f59e0b;
  --error: #ef4444;

  /* Edges */
  --edge: rgba(255, 255, 255, 0.08);
  --edge-subtle: rgba(255, 255, 255, 0.04);
  --edge-emphasis: rgba(255, 255, 255, 0.14);
}
```

Navy, not black. Blue, not purple. The palette says "infrastructure" not "consumer app."

## Typography

```css
:root {
  --font-display: 'Inter', system-ui, sans-serif;
  --font-body: 'Inter', system-ui, sans-serif;
  --font-mono: 'SF Mono', 'JetBrains Mono', monospace;

  --text-display: clamp(2.25rem, 4vw + 0.5rem, 3.5rem);
  --text-display-leading: 1.1;
  --text-display-tracking: -0.025em;
  --text-display-weight: 700;

  --text-heading: clamp(1.5rem, 2.5vw + 0.5rem, 2rem);
  --text-body: 0.9375rem;
  --text-body-leading: 1.6;
  --text-small: 0.8125rem;

  --text-metric: 'SF Mono', 'JetBrains Mono', monospace;
}
```

Inter for everything — neutral, professional, reads well at all sizes. Monospace exclusively for metrics and data. Headlines are large but not dramatic — authoritative, not flashy.

## Hero Approach

**Split with metrics.** Headline and proof on the left. Product dashboard or architecture diagram on the right. Social proof metrics visible without scrolling. Enterprise buyers need to validate credibility before they continue.

```
┌───────────────────────────────────────────────┐
│  [nav]  Logo   Platform  Solutions  Pricing   │
│                         Docs  [Login] [Demo]  │
├────────────────────────┬──────────────────────┤
│                        │                      │
│  CATEGORY LABEL        │  ┌────────────────┐  │
│                        │  │                │  │
│  Clear headline that   │  │  Dashboard     │  │
│  states enterprise     │  │  or product    │  │
│  value proposition     │  │  screenshot    │  │
│                        │  │                │  │
│  Two lines of body.    │  │                │  │
│                        │  └────────────────┘  │
│  [Request Demo]  [Docs →]                    │
│                        │                      │
│  ┌──────┬──────┬──────┐│                      │
│  │99.99%│ 50ms │ 10B+ ││                      │
│  │uptime│ p95  │events││                      │
│  └──────┴──────┴──────┘│                      │
│                        │                      │
└────────────────────────┴──────────────────────┘
```

## Section Rhythm

```
[Hero          — 90vh  — --navy, split, metrics in hero             ]
[Logo bar      — 120px — --surface, "Trusted by" + Fortune 500 logos]
[Feature arch  — 800px — --navy, architecture diagram + description  ]
[Feature grid  — 600px — --surface, 2x2 or 3-col benefit cards      ]
[Metrics sec   — 200px — --navy, full-width metric bar               ]
[Use cases     — 700px — --surface, tabbed or toggled scenarios      ]
[Testimonial   — 500px — --navy, enterprise customer logo + quote    ]
[Comparison    — 600px — --surface, comparison table vs competitors   ]
[Pricing       — 800px — --navy, tiered with "Contact Sales" for ent ]
[Final CTA     — 400px — --surface, "Request a Demo" centered        ]
```

More sections than other styles. Enterprise buyers need more information before converting.

## Motion

- Character: **professional** — smooth but not playful
- Scroll reveals: `translateY(12px)` fade-up, 500ms, ease-out (subtle, minimal distance)
- Hover: background darken + border emphasis on cards
- Transitions: 200ms base
- No glow. No dramatic lifts. No glass-morphism. Clean.

## Depth Strategy

**Borders + subtle shadow.** Cards use borders with optional one-layer shadow for the most important elements.

```css
--shadow-card: 0 1px 3px rgba(0, 0, 0, 0.2);
--shadow-elevated: 0 4px 16px rgba(0, 0, 0, 0.25);

.card {
  border: 1px solid var(--edge);
  border-radius: 8px;
  background: var(--card);
}

.card-featured {
  border-color: var(--action);
  box-shadow: 0 0 0 1px var(--action), var(--shadow-card);
}
```

## CTA Style

```css
/* Primary — bright, unmissable */
.cta-primary {
  padding: 12px 24px;
  border-radius: 6px;
  background: var(--action);
  color: #fff;
  font-weight: 600;
  font-size: 0.9375rem;
  transition: background 0.15s;
}

.cta-primary:hover {
  background: var(--action-hover);
}

/* Enterprise CTA — "Request Demo" has different energy */
.cta-demo {
  padding: 12px 24px;
  border-radius: 6px;
  background: transparent;
  color: var(--ink-white);
  border: 1px solid var(--edge-emphasis);
  font-weight: 600;
  transition: border-color 0.15s, background 0.15s;
}

.cta-demo:hover {
  border-color: var(--action);
  background: var(--action-light);
}
```

Two CTA styles: "Start free" (primary solid) and "Request demo" (outlined). Enterprise pages often need both.

## Signature Elements

- Metrics bar with monospace tabular numbers (uptime, latency, scale)
- Architecture or infrastructure diagrams
- Comparison tables against competitors
- Tabbed use-case sections (toggle between scenarios)
- Customer logos at enterprise scale (Fortune 500)
- Case study callout cards with real ROI numbers
- Security and compliance badges (SOC2, GDPR, ISO27001)

## Anti-Defaults

| Reject | Instead | Why |
|--------|---------|-----|
| Purple/violet accent | Blue (#3b82f6) | Blue = trust, infrastructure, reliability |
| Playful illustrations | Architecture diagrams | Enterprise buyers think in systems |
| Single CTA approach | "Start free" + "Request demo" | Different buying journeys |
| Minimal social proof | Metrics + logos + case studies | Enterprise needs more proof |
| Vague benefit copy | Specific numbers and SLAs | "99.99% uptime" > "reliable" |
| Simple pricing | Tiered with "Contact sales" | Enterprise deals need conversation |

## When to Use

- Infrastructure and DevOps platforms
- Enterprise SaaS with complex buying cycles
- Data platforms, observability, security
- Products with Fortune 500 customers
- Any product where "Request a demo" is the primary conversion
