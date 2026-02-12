# Landing Page Builder Workspace

This workspace contains the design engineering methodology for building landing pages with craft, conversion architecture, and visual storytelling.

## Scope

Landing pages, hero sections, pricing pages, feature showcases, waitlist pages, case study layouts, changelog pages.

**NOT:** Dashboards, admin panels, application UIs, e-commerce, blogs, documentation.

## Workspace Structure

```
workspace/
├── CLAUDE.md                          # This file
├── .claude/
│   ├── config.json                    # Workspace metadata
│   ├── commands/
│   │   ├── init.md                    # Initialize page direction
│   │   ├── status.md                  # Show current page system
│   │   ├── extract.md                 # Extract patterns from existing pages
│   │   ├── audit.md                   # Audit page for conversion craft
│   │   └── critique.md               # Deep craft critique
│   └── skills/
│       └── landing-page-builder/
│           ├── SKILL.md               # Core methodology
│           └── references/
│               ├── principles.md      # Layout, typography, color, motion
│               ├── patterns.md        # Section patterns (hero, features, pricing, etc.)
│               ├── critique.md        # Conversion-focused craft critique
│               └── examples.md        # Craft in action
├── reference/
│   ├── system-template.md             # Template for .landing-page/system.md
│   └── examples/
│       ├── system-saas-dark.md        # Example: Dark SaaS (Linear/Vercel style)
│       └── system-saas-light.md       # Example: Light SaaS (Notion/Stripe style)
└── .landing-page/                     # Created per-project
    └── system.md                      # Page direction, tokens, section patterns
```

## Workflow

1. **Story first** — What is the product? Who is it for? What transformation does it promise?
2. **Visual world** — Map the product's domain to colors, textures, motion, metaphors
3. **Section choreography** — Plan the scroll sequence: hook → build trust → demonstrate → convert
4. **Build with craft** — Every section earns its scroll. No filler. No generic.
5. **Critique** — Apply conversion checks, scroll rhythm test, craft critique
6. **Offer to save** — Persist direction and patterns to `.landing-page/system.md`

## Page Direction Memory

The file `.landing-page/system.md` stores:

- **Story** — Product positioning, audience, transformation promise
- **Visual World** — Color palette, typography, motion language, signature elements
- **Section Map** — Planned scroll sequence with purpose per section
- **Tokens** — CSS custom properties for the page
- **Patterns** — Reusable section structures, CTA styles, card layouts

If this file exists, read it before building. If it doesn't, go through the full story exploration.

## Commands

| Command | Purpose |
|---------|---------|
| `/landing-page-builder:init` | Initialize page direction for a product |
| `/landing-page-builder:status` | Show current page system state |
| `/landing-page-builder:extract` | Extract patterns from existing landing page code |
| `/landing-page-builder:audit` | Audit page for conversion and craft issues |
| `/landing-page-builder:critique` | Deep craft critique of built page |
