# 3D Game Development Workspace

## Project Overview

This is a **single-file 3D game development** workspace using Three.js. The goal is to produce complete, runnable HTML games that work standalone in any modern browser.

## Tech Stack

- **Three.js r128** - 3D rendering engine (bundled locally as `three.min.js`)
- **HTML5 / CSS3 / ES6 JavaScript** - All code lives in a single HTML file
- **No build tools** - Games run directly by opening `index.html` in a browser

## Workspace Structure

```
workspace/
├── CLAUDE.md          # This file - project instructions
├── index.html         # Starter template / current game
├── three.min.js       # Three.js r128 (local copy, no CDN needed)
├── src/               # Optional: multi-file game source
│   ├── scenes/        # Scene definitions
│   └── components/    # Reusable game components
├── assets/            # Game assets
│   ├── models/        # 3D models (.glb, .gltf)
│   └── textures/      # Texture images
└── .claude/           # Agent & skill configuration
    ├── agents/        # Specialist agent personas
    └── skills/        # Reusable skill definitions
```

## Development Rules

### Single-File Game Format

All games must be self-contained in a single HTML file with this structure:

```html
<!DOCTYPE html>
<html>
<head>
  <style>/* All CSS here */</style>
</head>
<body>
  <!-- Minimal HTML: HUD, modals, loading screen -->
  <script src="three.min.js"></script>
  <script>
    // All game logic here
  </script>
</body>
</html>
```

### Three.js Loading

- **Always load Three.js locally**: `<script src="three.min.js"></script>`
- The local `three.min.js` file is Three.js **r128**
- Do NOT use CDN links - the workspace includes the library locally for offline use
- Always check `typeof THREE === 'undefined'` at the start of `initGame()` as a safety guard

### Renderer Setup (Mandatory)

```javascript
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);
```

- **FORBIDDEN**: Do NOT use `document.getElementById()` or `document.querySelector()` to get a canvas
- **FORBIDDEN**: Do NOT pre-create a `<canvas>` tag in the HTML
- Let Three.js create the canvas element automatically

### Code Organization

Inside the `<script>` tag, organize code in this order:

1. **CONFIG** - Constants and tuning values
2. **Game State** - Score, flags, player state objects
3. **Scene Setup** - Scene, camera, renderer, lights
4. **Entity Creation** - Functions to create player, platforms, stars, enemies
5. **Game Loop** - `animate()` with `requestAnimationFrame`
6. **Physics & Updates** - `updatePhysics()`, `updateEnemies()`, collision checks
7. **Input Handling** - Keyboard event listeners
8. **UI Updates** - Score display, win/lose conditions, modals
9. **Initialization** - `initGame()` called from `window.onload`

### Game Loop Pattern

```javascript
function animate() {
  requestAnimationFrame(animate);
  if (gameState.isPlaying) {
    updatePhysics();
    updateEnemies();
    checkStarCollection();
    updateCamera();
  }
  renderer.render(scene, camera);
}
```

### Performance Guidelines

- Target **60 FPS** on mid-range hardware
- Use simple collision shapes (sphere, box)
- Minimize draw calls - merge static geometry when possible
- Dispose of Three.js resources properly (geometry, materials, textures)
- Always handle `window.resize` to update camera aspect ratio and renderer size

### UI Overlay Pattern

- Use HTML/CSS overlays for HUD elements (score, controls text)
- Use `position: fixed` with `pointer-events: none` for non-interactive HUD
- Modals (win/lose screens) should block input with `pointer-events: auto`
- Include a loading screen that hides after `initGame()` completes

## Code Style

- Use `const` and `let`, never `var`
- Use descriptive variable names
- Add brief inline comments for non-obvious logic
- Group related code with section comments (`// === Player Setup ===`)
- Keep functions focused and under 50 lines when possible

## Editing Existing Games

When modifying `index.html`:

- Read the full file first to understand the current game state
- Make targeted edits - do not rewrite the entire file for small changes
- Test mentally that changes maintain the game loop flow
- Preserve the CONFIG object pattern for tunable values

## Creating New Games

When creating a new game from scratch:

1. Start from the `index.html` template structure
2. Follow the code organization order above
3. Always include: loading screen, HUD, win condition, restart mechanism
4. Use the CONFIG pattern for all magic numbers
5. Include window resize handling
