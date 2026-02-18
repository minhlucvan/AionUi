# Style: Startup Launch

Reference sites: **Product Hunt launches**, **Y Combinator demos**, **Superhuman**, **Liveblocks**

## Personality

Momentum. Excitement. The page is optimized for a single moment: launch day. It needs to capture attention fast, communicate value instantly, and convert curiosity into signups. Dense above the fold, social proof heavy, urgency without desperation. The visitor arrived from a tweet or HN post — they have 10 seconds of curiosity.

## Visual Signature

Dense hero section — everything important visible without scrolling. Real-time social proof (user counts, GitHub stars). Product GIF or video in the hero. Email capture form prominent. The page feels like it was built for speed: fast to load, fast to understand, fast to convert.

## Color World

```css
:root {
  /* Canvas — dark for impact, light for accessibility */
  --canvas: #09090b;
  --surface: #18181b;
  --panel: #27272a;
  --well: #3f3f46;

  /* Ink */
  --ink-white: #fafafa;
  --ink-body: #a1a1aa;
  --ink-secondary: #71717a;
  --ink-muted: #52525b;

  /* Launch — energetic, unmissable */
  --launch: #f97316;
  --launch-hover: #fb923c;
  --launch-glow: rgba(249, 115, 22, 0.15);

  /* Alt accent — for secondary elements */
  --alt: #8b5cf6;

  /* Edges */
  --edge: rgba(255, 255, 255, 0.08);
  --edge-subtle: rgba(255, 255, 255, 0.04);
  --edge-emphasis: rgba(255, 255, 255, 0.14);
}
```

Orange launch accent — stands out on dark backgrounds, signals energy and action. Not blue (too corporate) or green (too developer-specific).

## Typography

```css
:root {
  --font-display: 'Cal Sans', 'DM Sans', system-ui, sans-serif;
  --font-body: 'Inter', system-ui, sans-serif;

  --text-display: clamp(2.25rem, 5vw + 0.5rem, 3.75rem);
  --text-display-leading: 1.08;
  --text-display-tracking: -0.03em;
  --text-display-weight: 800;

  --text-heading: clamp(1.5rem, 3vw + 0.5rem, 2rem);
  --text-body: 0.9375rem;
  --text-body-leading: 1.6;
  --text-small: 0.8125rem;
}
```

Extra bold (800) display weight — demands attention. Cal Sans or similar display font for character. Body stays Inter for clarity.

## Hero Approach

**Conversion-optimized dense.** Everything above the fold: headline, one-liner, product visual, email capture, and social proof. No scrolling needed to understand and convert. The hero IS the landing page for 60% of visitors.

```
┌──────────────────────────────────────────────────┐
│  [nav]  Logo                     ★ Star on GH    │
├──────────────────────────────────────────────────┤
│                                                  │
│  🚀 Launching on Product Hunt                    │
│                                                  │
│  The headline that captures                      │
│  the entire value in one line.                   │
│                                                  │
│  One sentence. What + Who + Why different.       │
│                                                  │
│  ┌──────────────────────────────┐                │
│  │ your@email.com    [Get Early Access] │        │
│  └──────────────────────────────┘                │
│                                                  │
│  ── 2,847 people on waitlist ──                  │
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │                                            │  │
│  │   Product GIF / video demo                 │  │
│  │   (autoplay, showing key workflow)         │  │
│  │                                            │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
└──────────────────────────────────────────────────┘
```

## Section Rhythm

```
[Hero          — 95vh  — --canvas, dense: headline + capture + demo  ]
[Social proof  — 120px — --surface, real-time counter + logos         ]
[Feature 1     — 500px — --canvas, GIF/video left, copy right        ]
[Feature 2     — 500px — --surface, copy left, GIF/video right       ]
[Feature 3     — 500px — --canvas, GIF/video left, copy right        ]
[Testimonials  — 400px — --surface, tweet-embed style grid           ]
[FAQ           — 400px — --canvas, accordion, address launch concerns]
[Final CTA     — 400px — --surface, email capture repeated           ]
```

Shorter sections, faster pace. Launch pages are scanned, not studied.

## Motion

- Character: **punchy** — fast, attention-grabbing
- Scroll reveals: `translateY(20px)` fade-up, 400ms, ease-out (snappy)
- Product demo: autoplay GIF or video, no click-to-play
- Counter: animated number increment on scroll
- Transitions: 150ms base
- Loading state on email submit: spinner → checkmark animation

## Depth Strategy

**Borders + glow.** Cards use borders. The featured CTA gets a glow effect. Product demo gets a prominent shadow.

```css
.card {
  border: 1px solid var(--edge);
  border-radius: 10px;
  background: var(--surface);
}

.demo-frame {
  border-radius: 12px;
  border: 1px solid var(--edge-emphasis);
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

.capture-form {
  border: 1px solid var(--edge-emphasis);
  border-radius: 10px;
  background: var(--surface);
  box-shadow: 0 0 24px var(--launch-glow);
}
```

## CTA Style

```css
/* Email capture form — THE primary conversion */
.capture-form {
  display: flex;
  gap: 0;
  border-radius: 10px;
  border: 1px solid var(--edge-emphasis);
  overflow: hidden;
}

.capture-input {
  flex: 1;
  padding: 14px 16px;
  background: var(--surface);
  border: none;
  color: var(--ink-white);
  font-size: 0.9375rem;
}

.capture-submit {
  padding: 14px 24px;
  background: var(--launch);
  color: #fff;
  font-weight: 700;
  border: none;
  white-space: nowrap;
  cursor: pointer;
  transition: background 0.15s;
}

.capture-submit:hover {
  background: var(--launch-hover);
}

/* Waitlist counter below form */
.waitlist-count {
  text-align: center;
  margin-top: 12px;
  font-size: var(--text-small);
  color: var(--ink-secondary);
}

.waitlist-count strong {
  color: var(--launch);
  font-variant-numeric: tabular-nums;
}
```

The email capture form IS the CTA. Inline form (input + button), not a standalone button.

## Signature Elements

- Inline email capture form (not a button that opens a modal)
- Real-time waitlist/user counter with animated increment
- Product Hunt / HN badge in the nav
- Autoplay product GIF / short video (< 15 seconds)
- Tweet-style testimonials (screenshot of actual tweets)
- GitHub star count, npm downloads as real-time proof
- "Join 2,847 others" social proof near the form
- Animated confetti or checkmark on successful signup

## Anti-Defaults

| Reject | Instead | Why |
|--------|---------|-----|
| "Get Started" button | Email capture form inline | Capture the lead immediately |
| Static product screenshots | Autoplay GIF or video | Motion catches attention |
| Generic testimonials | Embedded tweets | Social proof that looks real |
| Formal company logos | User count + real-time numbers | Momentum > prestige |
| Long feature sections | Short, punchy feature blocks | Launch pages are skimmed |
| "Contact sales" | "Join the waitlist" | Launch energy, not sales energy |

## When to Use

- Product Hunt launches
- Beta / early access campaigns
- Waitlist pages
- Indie hacker / startup launches
- Side project landing pages
- Any product optimizing for email capture over enterprise sales
