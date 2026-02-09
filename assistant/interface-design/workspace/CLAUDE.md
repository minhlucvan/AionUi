# Interface Design Workspace

This workspace uses the [interface-design](https://github.com/Dammyjay93/interface-design) plugin for crafted, consistent UI development.

## Getting Started

1. Run `/interface-design:init` to begin principle-based design
2. The plugin will assess your project and propose a design direction
3. Confirm to save decisions to `.interface-design/system.md`
4. All subsequent sessions will load your design system automatically

## Available Commands

- `/interface-design:init` — Start a new design system
- `/interface-design:status` — View current design tokens and patterns
- `/interface-design:audit <path>` — Check code against your system
- `/interface-design:extract` — Pull patterns from existing code
- `/interface-design:critique` — Get design critique

## Design System File

Your design decisions live in `.interface-design/system.md`. This file is loaded automatically at session start to maintain consistency.
