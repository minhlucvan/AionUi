# Interface Design Workspace

## What This Workspace Does

This workspace provides a design engineering methodology for building UI interfaces with **craft, memory, and consistency**. It transforms generic AI-generated interfaces into intentional, principle-driven design.

**Scope:** Dashboards, admin panels, SaaS apps, tools, settings pages, data interfaces.
**Not for:** Landing pages, marketing sites, campaigns.

## Workspace Structure

```
.claude/
├── commands/                  # Slash commands
│   ├── init.md                # /interface-design:init — Start building with craft
│   ├── audit.md               # /interface-design:audit — Check code against system
│   ├── status.md              # /interface-design:status — Show design system state
│   ├── extract.md             # /interface-design:extract — Extract patterns from code
│   └── critique.md            # /interface-design:critique — Self-critique and rebuild
├── skills/
│   └── interface-design/
│       ├── SKILL.md            # Core skill — design methodology
│       └── references/
│           ├── principles.md   # Token architecture, spacing, depth, typography
│           ├── critique.md     # Post-build craft critique protocol
│           ├── example.md      # Subtle layering in practice
│           └── validation.md   # Memory management and validation rules
├── config.json                # Workspace configuration
.interface-design/
└── system.md                  # Design memory (created per-project)
reference/
├── system-template.md         # Template for creating system.md
└── examples/
    ├── system-precision.md    # "Precision & Density" example
    └── system-warmth.md       # "Warmth & Approachability" example
```

## How It Works

### First Session (No system.md)
1. Explore the product's domain — concepts, color world, signature element
2. Propose a design direction with rationale
3. Get user confirmation
4. Build with craft principles applied
5. Offer to save patterns to `.interface-design/system.md`

### Subsequent Sessions (system.md exists)
1. Load established patterns from `.interface-design/system.md`
2. Apply existing tokens, depth strategy, and component patterns
3. Extend the system when new patterns emerge
4. Maintain consistency across sessions

## Design Memory

The `.interface-design/system.md` file stores project-specific design decisions:
- Direction and personality (warm, cool, dense, spacious)
- Token values (spacing, colors, radius, typography)
- Component patterns (buttons, cards, inputs)
- Decision log with rationale

Reference templates are available in `reference/` for bootstrapping.

## Commands

| Command | Purpose |
|---------|---------|
| `/interface-design:init` | Initialize design and start building |
| `/interface-design:status` | Show current design system state |
| `/interface-design:audit <path>` | Check code against design system |
| `/interface-design:extract` | Extract patterns from existing code |
| `/interface-design:critique` | Critique build for craft, rebuild defaults |

## Output Format

- **Default:** Clean semantic HTML with CSS custom properties
- **Framework projects:** Adapts to Tailwind, UnoCSS, or project's CSS framework
- **Token naming:** Evocative names from the product's world (`--ink`, `--parchment`) over generic (`--gray-700`)

## Rules

- Every design choice needs a WHY — "it's common" is not a reason
- Spacing on grid (4px or 8px base), no exceptions
- Pick ONE depth strategy and commit (borders-only, subtle shadows, layered, or surface shifts)
- Token names should reflect the product's domain
- Always offer to save patterns after building UI
- Run self-checks (swap test, squint test, signature test, token test) before presenting
