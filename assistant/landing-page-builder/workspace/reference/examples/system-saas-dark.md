# Landing Page Direction — Dark SaaS

Style reference: Linear, Vercel, Raycast

## Story

### Transformation
Ship code with the confidence of a platform team, even if you're one engineer.

### Audience
Solo developers and small team leads who've spent too many hours debugging CI pipelines and YAML configs. They arrive frustrated after a failed deploy, comparing tools in 15 minutes.

### Hook
"Deploy like it's `git push`. Because it is."

## Visual World

### Domain Concepts
Terminal, command line, pipelines, green checkmarks, velocity, infrastructure, uptime

### Color Mood
- Foundation: dark
- Temperature: cool (slate-blue undertones)
- Accent: terminal green (#00d4aa) — signals success, speed, "it worked"
- Palette:
  - --void: #0a0a0f          /* Deep background */
  - --surface: #111118        /* Card surface */
  - --panel: #1a1a24          /* Elevated panels */
  - --ink-bright: #f4f2ef     /* Headlines */
  - --ink-body: #a8a4a0       /* Body text */
  - --ink-dim: #6b6966        /* Secondary text */
  - --ink-ghost: #3d3a38      /* Borders, muted */
  - --signal: #00d4aa         /* Success, CTA, active */
  - --signal-glow: rgba(0, 212, 170, 0.12)  /* Ambient glow */
  - --alert: #ff6b4a          /* Errors, warnings */

### Typography
- Display font: Geist (geometric, technical)
- Body font: Geist
- Personality: Monospace accent (JetBrains Mono) for code, metrics, and terminal elements
- Scale: 14, 16, 18, 24, 36, 48, 64
- Weights: 400, 500, 700

### Motion Language
- Character: snappy — like terminal response, instant feedback
- Scroll reveals: fade-up, 500ms, ease-out
- Hover: subtle lift + border glow
- Duration: 150ms base

### Signature Element
A real terminal animation in the hero showing a deploy from `git push` to "Live" in 4 lines — not a screenshot, a live-feeling typed sequence with cursor blink.

## Section Choreography

| # | Section | Purpose | Visual Weight | Background |
|---|---------|---------|---------------|------------|
| 1 | Hero | Hook: "Deploy like git push" + terminal demo | LARGE | --void with radial glow |
| 2 | Logo Bar | Dissolve "who uses this?" | small | --void |
| 3 | Primary Feature | Show the deploy flow end-to-end | LARGE | --surface |
| 4 | Feature Grid | 3 secondary features (speed, rollbacks, previews) | medium | --void |
| 5 | Metrics Bar | "99.99% uptime, 50ms p95, 2.3M deploys" | small | --surface |
| 6 | Testimonial | Senior eng quote about switching from Jenkins | medium-large | --void |
| 7 | Pricing | Three tiers, free tier prominent | LARGE | --surface |
| 8 | Final CTA | "Deploy your first project" | medium | --void with glow |

## Tokens

```css
:root {
  --void: #0a0a0f;
  --surface: #111118;
  --panel: #1a1a24;
  --control: #242430;

  --ink-bright: #f4f2ef;
  --ink-body: #a8a4a0;
  --ink-dim: #6b6966;
  --ink-ghost: #3d3a38;

  --signal: #00d4aa;
  --signal-hover: #00eabb;
  --signal-glow: rgba(0, 212, 170, 0.12);
  --alert: #ff6b4a;

  --edge: rgba(255, 255, 255, 0.06);
  --edge-subtle: rgba(255, 255, 255, 0.03);
  --edge-emphasis: rgba(255, 255, 255, 0.12);

  --section-sm: 80px;
  --section-md: 120px;
  --section-lg: 160px;
  --section-xl: 200px;

  --text-display: clamp(2.5rem, 5vw + 1rem, 4rem);
  --text-heading: clamp(1.75rem, 3vw + 0.5rem, 2.25rem);
  --text-subheading: 1.25rem;
  --text-body: 1rem;
  --text-small: 0.875rem;
  --text-overline: 0.75rem;

  --font-display: 'Geist', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
}
```

## Patterns

### Hero
- Layout: split (copy left, terminal right)
- Headline: "Deploy like it's `git push`. Because it is."
- CTA: "Deploy your first project →"
- Visual: Terminal animation with typed commands

### CTA Primary
- Padding: 12px 24px
- Radius: 8px
- Background: var(--signal)
- Hover: lift -1px + box-shadow glow

### Feature Card
- Padding: 32px
- Radius: 12px
- Border: 1px solid var(--edge)
- Background: var(--surface)

### Section Header
- Max-width: 640px
- Alignment: center
- Eyebrow: uppercase, var(--text-overline), var(--signal) color

## Anti-Defaults

### Layout Rejections
| Rejected | Instead | Reason |
|----------|---------|--------|
| Centered hero with gradient blob | Split layout with live terminal | Product is CLI-first, show the actual experience |
| Three-column icon feature grid | Scrolling deploy timeline | The value is in the FLOW, not individual features |
| Abstract illustration | Code/terminal visuals | Audience trusts code, not illustrations |

### Copy Rejections
| Rejected | Instead | Reason |
|----------|---------|--------|
| "Deploy with confidence" | "Deploy like it's git push" | Specific action > vague benefit |
| "Get Started" | "Deploy your first project" | Names the actual first action |
| "Trusted by developers" | "2.3M deploys this month" | Specific metric > vague claim |

## Decisions Log

| Decision | Rationale | Date |
|----------|-----------|------|
| Terminal green accent | Signals success/completion — core emotional reward of deploying | 2025-01-15 |
| Geist + JetBrains Mono | Technical audience reads monospace as authentic | 2025-01-15 |
| Borders-only depth | Dense information density, developer expectation | 2025-01-15 |
| Terminal hero animation | The product IS the CLI — showing it in action is the strongest possible proof | 2025-01-15 |
