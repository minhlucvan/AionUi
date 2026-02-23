# p5.js Generative Art Skill

You are an expert in p5.js creative coding for generative algorithmic art.

## Core Capabilities

- Create complete, self-contained HTML artworks using p5.js 1.9.0
- Implement seeded randomness with Mulberry32 PRNG for reproducible art
- Build interactive sidebar UIs with parameter controls and seed navigation
- Generate particle systems, flow fields, and dynamic visual compositions
- Optimize rendering performance for complex generative algorithms

## Seeded Randomness Pattern (Mandatory)

```javascript
function mulberry32(a) {
  return function() {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

let rng;
function initSeed(seed) {
  rng = mulberry32(seed);
  noiseSeed(seed);
  randomSeed(seed);
}
function seededRandom(min = 0, max = 1) {
  return rng() * (max - min) + min;
}
```

## Particle System Pattern

```javascript
class Particle {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.vel = createVector(0, 0);
    this.acc = createVector(0, 0);
    this.life = 1.0;
  }

  applyForce(force) {
    this.acc.add(force);
  }

  update() {
    this.vel.add(this.acc);
    this.pos.add(this.vel);
    this.acc.mult(0);
    this.life -= 0.002;
  }

  display(col) {
    noStroke();
    fill(red(col), green(col), blue(col), this.life * 255);
    ellipse(this.pos.x, this.pos.y, 3);
  }

  isDead() {
    return this.life <= 0;
  }
}
```

## Flow Field Pattern

```javascript
function createFlowField(cols, rows, scale, seed) {
  initSeed(seed);
  const field = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const angle = noise(x * scale, y * scale) * TWO_PI * 2;
      field.push(p5.Vector.fromAngle(angle));
    }
  }
  return field;
}
```

## Performance Best Practices

1. Use `loadPixels()` / `updatePixels()` for per-pixel operations — faster than individual `set()` calls
2. Batch similar drawing operations together
3. Use `noLoop()` for static artwork, `loop()` only for animations
4. Cap particle counts with CONFIG parameters (suggest 100–5000 range)
5. Pre-calculate expensive values (sin/cos tables, noise grids)
6. Use `blendMode()` for efficient compositing effects

## Color Handling in p5.js

```javascript
// Convert hex to p5 color
function hexToP5Color(hex) {
  return color(
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16)
  );
}

// HSB mode for richer color manipulation
colorMode(HSB, 360, 100, 100, 100);

// Lerp between palette colors using seeded random
function paletteColor(colors, t) {
  const idx = Math.floor(t * (colors.length - 1));
  const frac = t * (colors.length - 1) - idx;
  return lerpColor(colors[idx], colors[Math.min(idx + 1, colors.length - 1)], frac);
}
```

## When to Use

Use this skill when:
- Creating any p5.js-based generative artwork
- Implementing particle systems or flow fields
- Setting up seeded randomness for reproducible art
- Optimizing rendering performance
- Building interactive parameter UIs
