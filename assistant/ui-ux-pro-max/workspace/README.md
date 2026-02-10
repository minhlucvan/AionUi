# UIUX ProMax Workspace

A ready-to-use workspace for AI agents to create high-quality UI/UX designs using HTML + Tailwind CSS. No build tools, no npm — just open the HTML files in a browser.

## Quick Start

1. Open `index.html` in your browser to see the starter template
2. Edit the HTML file to customize the design
3. Create new pages in the `pages/` directory
4. Reference `components/` for pre-built component templates

## What's Included

### Starter Templates

| File | Description |
|------|-------------|
| `index.html` | Landing page template with hero, features, testimonials, pricing, FAQ, CTA |
| `components/dashboard.html` | Dashboard template with sidebar, stats, table, activity feed |

### Design Intelligence Database

Search 57 UI styles, 95 color palettes, 56 font pairings, 24 chart types, and 98 UX guidelines:

```bash
python3 ../scripts/search.py "saas" --domain product
python3 ../scripts/search.py "glassmorphism" --domain style
python3 ../scripts/search.py "healthcare" --domain color
python3 ../scripts/search.py "elegant" --domain typography
python3 ../scripts/search.py "responsive" --stack html-tailwind
```

### Agent Personas

| Agent | Role |
|-------|------|
| `uiux-designer` | Primary designer — handles all UI/UX creation tasks |
| `interaction-designer` | Specialist in animations, transitions, micro-interactions |
| `accessibility-expert` | WCAG compliance, keyboard navigation, screen reader support |

### Skills

| Skill | Purpose |
|-------|---------|
| `layout-patterns` | Common page layouts (landing, dashboard, bento grid) |
| `component-library` | Pre-built Tailwind components (buttons, cards, forms, tables) |
| `responsive-design` | Mobile-first responsive patterns and breakpoint strategy |
| `animation-effects` | CSS animations, scroll effects, hover interactions |
| `design-system` | Design tokens, color system, typography scale, dark mode |
| `accessibility` | WCAG AA compliance, focus management, semantic HTML |

## Tech Stack

- **Tailwind CSS 3.x** via Play CDN (no build required)
- **Alpine.js 3.x** for lightweight interactivity
- **Lucide Icons** for SVG icons
- **Google Fonts** for typography (Inter by default)

## File Structure

```
workspace/
├── CLAUDE.md                  # Agent instructions
├── README.md                  # This file
├── index.html                 # Landing page starter template
├── components/                # Pre-built component templates
│   └── dashboard.html         # Dashboard template
├── pages/                     # Output directory for new pages
└── .claude/
    ├── config.json            # Workspace metadata
    ├── agents/                # Agent persona definitions
    │   ├── uiux-designer.md
    │   ├── interaction-designer.md
    │   └── accessibility-expert.md
    └── skills/                # Design skill references
        ├── layout-patterns.md
        ├── component-library.md
        ├── responsive-design.md
        ├── animation-effects.md
        ├── design-system.md
        └── accessibility.md
```
