# Style: Data Dense

Reference sites: **Retool**, **Supabase**, **Neon**, **Prisma**

## Personality

Technical depth without intimidation. The page respects the audience's intelligence — it shows architecture, code, and real technical detail, but presents it cleanly enough that it doesn't overwhelm. The visitor should feel: "these people understand my stack."

## Visual Signature

Code blocks as first-class design elements. Architecture diagrams. Real SQL/API examples. Dense but organized information. Split layouts with code on one side and explanation on the other. Syntax-highlighted code is as important as any product screenshot.

## Color World

```css
:root {
  /* Canvas — code editor inspired, but not pure dark */
  --canvas: #0d1117;
  --surface: #161b22;
  --panel: #1c2333;
  --well: #252d3d;

  /* Ink */
  --ink-bright: #e6edf3;
  --ink-body: #8b949e;
  --ink-secondary: #6e7681;
  --ink-muted: #3d444d;

  /* Brand — cool blue-green for primary actions */
  --brand: #58a6ff;
  --brand-hover: #79c0ff;
  --brand-soft: rgba(88, 166, 255, 0.08);

  /* Syntax — code colors that double as feature accents */
  --syntax-string: #a5d6ff;
  --syntax-keyword: #ff7b72;
  --syntax-function: #d2a8ff;
  --syntax-variable: #ffa657;
  --syntax-comment: #6e7681;

  /* Edges */
  --edge: rgba(255, 255, 255, 0.08);
  --edge-subtle: rgba(255, 255, 255, 0.04);
  --edge-emphasis: rgba(255, 255, 255, 0.14);
}
```

GitHub-inspired palette — comfortable for developers. Syntax colors pull double duty as feature section accents.

## Typography

```css
:root {
  --font-display: 'Inter', system-ui, sans-serif;
  --font-body: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;

  --text-display: clamp(2rem, 4vw + 0.5rem, 3.25rem);
  --text-display-leading: 1.1;
  --text-display-tracking: -0.02em;
  --text-display-weight: 700;

  --text-heading: clamp(1.5rem, 2.5vw + 0.5rem, 2rem);
  --text-body: 0.9375rem;
  --text-body-leading: 1.6;
  --text-small: 0.8125rem;

  --text-code: 0.875rem;
  --text-code-leading: 1.7;
}
```

Code text size is nearly as large as body text — code is content, not decoration. Slightly smaller headlines than other styles because the page is information-dense.

## Hero Approach

**Split with live code.** Headline on one side, actual code example on the other. The code IS the product pitch — showing how simple the API is, how few lines it takes, how clean the DX is.

```
┌──────────────────────────────────────────────────┐
│  [nav]  Logo   Docs  Pricing  Blog    [Sign in]  │
│                                   [Start free]    │
├───────────────────────┬──────────────────────────┤
│                       │  ┌────────────────────┐  │
│  Build [thing]        │  │ // Your first query │  │
│  in minutes,          │  │ const result =      │  │
│  not months.          │  │   await db          │  │
│                       │  │     .from('users')  │  │
│  Supporting line      │  │     .select('*')    │  │
│  about the DX.        │  │     .limit(10);     │  │
│                       │  │                     │  │
│  [Start building]     │  │ // That's it.       │  │
│  Documentation →      │  └────────────────────┘  │
│                       │                          │
│  npm i @product/sdk   │                          │
│                       │                          │
└───────────────────────┴──────────────────────────┘
```

## Section Rhythm

```
[Hero          — 85vh  — --canvas, split with code block            ]
[Install bar   — 60px  — --surface, npm install one-liner           ]
[Feature code  — 700px — --canvas, code left, explanation right     ]
[Feature code  — 700px — --surface, explanation left, code right    ]
[Feature grid  — 500px — --canvas, 3-col capability cards           ]
[Architecture  — 600px — --surface, architecture diagram            ]
[Testimonial   — 400px — --canvas, developer quote with GitHub link ]
[Pricing       — 700px — --surface, usage-based tiers               ]
[Final CTA     — 400px — --canvas, centered with code snippet       ]
```

## Motion

- Character: **precise** — clean, no unnecessary movement
- Scroll reveals: `translateY(12px)` fade-up, 400ms, ease-out
- Code blocks: typewriter effect on reveal (characters appear sequentially)
- Hover: border-color change only on cards
- Transitions: 150ms base
- Tab switching for code examples: instant, no transition

## Depth Strategy

**Borders-only.** Code blocks and cards defined by crisp borders. No shadows — shadows feel design-y; this audience trusts code aesthetics.

```css
.code-block {
  border: 1px solid var(--edge);
  border-radius: 8px;
  background: var(--surface);
  overflow: hidden;
}

.code-block-header {
  padding: 10px 16px;
  border-bottom: 1px solid var(--edge);
  font-size: var(--text-small);
  color: var(--ink-secondary);
  font-family: var(--font-mono);
}

.code-block pre {
  padding: 20px;
  font-family: var(--font-mono);
  font-size: var(--text-code);
  line-height: var(--text-code-leading);
  overflow-x: auto;
}
```

## CTA Style

```css
.cta-primary {
  padding: 10px 20px;
  border-radius: 6px;
  background: var(--brand);
  color: #fff;
  font-weight: 600;
  font-size: 0.875rem;
  transition: background 0.15s;
}

.cta-primary:hover {
  background: var(--brand-hover);
}

/* Install command as CTA */
.cta-install {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 6px;
  background: var(--surface);
  border: 1px solid var(--edge);
  font-family: var(--font-mono);
  font-size: 0.875rem;
  color: var(--ink-body);
  cursor: pointer;
}

.cta-install .copy-icon {
  color: var(--ink-secondary);
}
```

The install command doubles as a CTA. Click to copy.

## Signature Elements

- Syntax-highlighted code blocks as primary feature visuals
- Copyable install commands (`npm i @product/sdk`)
- Code tabs (JavaScript / Python / Go / cURL)
- Architecture diagrams with connection lines
- API response previews (JSON with syntax colors)
- GitHub-style contribution graphs or activity indicators
- "Playground" or "Try it" inline code editors
- Version badges and changelog links

## Anti-Defaults

| Reject | Instead | Why |
|--------|---------|-----|
| Product screenshots | Code blocks and API examples | The code IS the product |
| Abstract feature icons | Syntax-colored code snippets | Show the DX, not concepts |
| "Get started" CTA | `npm i` command + "Read docs" | Meet developers where they are |
| Generic testimonials | Tweets/quotes with GitHub profiles | Developer social proof |
| Marketing language | Technical precision | "Sub-millisecond reads" not "blazing fast" |
| Decorative illustrations | Architecture diagrams | This audience thinks in systems |

## When to Use

- Database products, ORMs, query builders
- API platforms, SDKs, developer libraries
- Backend services (auth, storage, messaging)
- Developer infrastructure
- Any product where the DX is the primary selling point
