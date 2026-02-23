# Algorithmic Art Workspace

## Project Overview

This is a **single-file generative art** workspace using p5.js. The goal is to produce complete, self-contained HTML artworks that combine mathematical algorithms with aesthetic sensibility — for representation, education, and illustration.

## Tech Stack

- **p5.js 1.9.0** — Creative coding framework (loaded from CDN)
- **HTML5 / CSS3 / ES6 JavaScript** — All code lives in a single HTML file
- **No build tools** — Artworks run directly by opening the HTML file in a browser

## Workspace Structure

```
workspace/
├── CLAUDE.md               # This file — project instructions
├── index.html              # Starter template / current artwork
├── templates/
│   └── viewer.html         # Base viewer template with sidebar UI
├── gallery/                # Completed artwork collection
│   └── *.html              # Each artwork as a standalone HTML file
└── .claude/
    ├── config.json         # Agent & skill configuration
    ├── agents/             # Specialist agent personas
    │   ├── art-director.md
    │   ├── algorithm-engineer.md
    │   └── visualization-expert.md
    └── skills/             # Reusable skill definitions
        ├── p5js-generative.md
        ├── mathematical-patterns.md
        ├── color-theory.md
        └── data-visualization-art.md
```

## Development Rules

### Single-File Art Format

All artworks must be self-contained in a single HTML file with this structure:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>[Art Title] — Algorithmic Art</title>
  <style>/* All CSS — sidebar + canvas layout */</style>
</head>
<body>
  <div class="sidebar"><!-- Controls UI --></div>
  <div class="canvas-container" id="canvas-container"></div>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.0/p5.min.js"></script>
  <script>/* All art logic */</script>
</body>
</html>
```

### p5.js Loading

- Load p5.js from CDN: `https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.0/p5.min.js`
- Always check `typeof p5 !== 'undefined'` as a safety guard
- Use p5 global mode (not instance mode) for simplicity

### Seeded Randomness (Mandatory)

Every artwork MUST use deterministic seeded randomness via the Mulberry32 PRNG:

```javascript
function mulberry32(a) {
  return function() {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
```

This ensures:
- Same seed → same artwork, every time
- Users can share seeds to reproduce exact visuals
- Each seed is a unique "edition" of the algorithm

### Canvas Setup (Mandatory)

```javascript
function setup() {
  const container = document.getElementById('canvas-container');
  const canvas = createCanvas(CONFIG.canvasWidth, CONFIG.canvasHeight);
  canvas.parent(container);
  // ...
}
```

- **FORBIDDEN**: Do NOT create canvas outside the container
- Canvas minimum size: 1200x1200 pixels

### Code Organization

Inside the `<script>` tag, organize code in this order:

1. **CONFIG** — All tunable constants, parameters, and colors
2. **PRNG** — Seeded random number generator
3. **Seed Navigation** — prevSeed, nextSeed, randomSeed_, jumpToSeed
4. **Parameter System** — updateParam, updateColor, resetDefaults
5. **Utility Functions** — Color helpers, math utilities
6. **Core Algorithm** — generateArt() and related functions
7. **Entity Classes** — Particle, Agent, Cell classes (if needed)
8. **p5.js Lifecycle** — setup(), draw() (if animated), regenerate()
9. **Download Functions** — downloadArt, downloadSVG
10. **Initialization** — Store INITIAL_PARAMS/INITIAL_COLORS

### Sidebar UI Structure

The sidebar (320px wide) must always include:

1. **Title & Movement** — Art name + algorithmic aesthetic movement
2. **Seed Controls** — Previous / Next / Random buttons + input field
3. **Parameters** — Range sliders with live value display
4. **Palette** — Color pickers for configurable colors
5. **Actions** — Regenerate / Reset / Download PNG / Download SVG
6. **Description** — 2-3 sentence explanation of the algorithm

### Art Quality Checklist

Before finalizing any artwork:

- [ ] Every seed produces a visually interesting result
- [ ] Parameter extremes don't crash the algorithm
- [ ] Colors are harmonious at default values
- [ ] Canvas renders within 5 seconds
- [ ] Download button works correctly
- [ ] Responsive layout works on smaller screens
- [ ] No `Math.random()` calls anywhere
- [ ] All parameters have meaningful visual effects

## Code Style

- Use `const` and `let`, never `var`
- Use descriptive variable names
- Add brief inline comments for algorithm logic
- Group related code with section comments (`// === Particle System ===`)
- Keep functions focused and under 40 lines when possible
- Use the CONFIG pattern for all magic numbers

## Editing Existing Art

When modifying an artwork:

1. Read the full file first to understand the algorithm
2. Make targeted edits — do not rewrite the entire file
3. Preserve the seeded randomness system
4. Test that the artwork still renders correctly for seed 0
5. Verify parameter controls still work

## Creating New Art

When creating a new artwork from scratch:

1. Start from the `templates/viewer.html` structure
2. Develop an algorithmic philosophy internally
3. Design parameters that emerge from the philosophy
4. Implement using at least two layered techniques
5. Ensure every seed produces aesthetically pleasing results
6. Add descriptive title, movement name, and description
7. Save to the gallery/ directory with a descriptive filename
