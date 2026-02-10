# UIUX ProMax Workspace

A ready-to-use workspace for AI agents to create high-quality UI/UX designs using HTML + Tailwind CSS. No build tools, no npm — just open the HTML files in a browser.

## Quick Start

1. Open `index.html` in your browser to see the starter landing page
2. Open `components/dashboard.html` for a dashboard starter
3. Edit the HTML files to customize
4. Create new pages in the `pages/` directory

## What's Included

### Starter Templates

| File | Description |
|------|-------------|
| `index.html` | Landing page — hero, features, testimonials, pricing, FAQ, CTA, footer |
| `components/dashboard.html` | Dashboard — sidebar nav, stats cards, data table, activity feed |

### Design Intelligence

The parent `ui-ux-pro-max` system provides searchable design data:

```bash
python3 ../scripts/search.py "saas" --domain product        # 57 styles
python3 ../scripts/search.py "glassmorphism" --domain style  # Style details
python3 ../scripts/search.py "healthcare" --domain color     # 95 color palettes
python3 ../scripts/search.py "elegant" --domain typography   # 56 font pairings
python3 ../scripts/search.py "animation" --domain ux         # 98 UX guidelines
python3 ../scripts/search.py "responsive" --stack html-tailwind
```

## Tech Stack

- **Tailwind CSS 3.x** via Play CDN (no build required)
- **Alpine.js 3.x** for lightweight interactivity
- **Lucide Icons** for SVG icons
- **Google Fonts** for typography (Inter by default)

## File Structure

```
workspace/
├── CLAUDE.md                  # Workspace-specific instructions (HTML format, CDN setup)
├── README.md                  # This file
├── index.html                 # Landing page starter template
├── components/
│   └── dashboard.html         # Dashboard starter template
└── pages/                     # Output directory for new pages
```

For the full design workflow, search commands, and professional UI rules, see `../ui-ux-pro-max.md`.
