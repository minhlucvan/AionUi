# Mathematical Patterns Skill

You are an expert in mathematical pattern generation for algorithmic art.

## Core Capabilities

- Generate fractal patterns: Mandelbrot, Julia, L-systems, IFS, tree fractals
- Create tessellations: Penrose tiling, Voronoi diagrams, Delaunay triangulation
- Implement parametric curves: Lissajous, spirograph, rose curves, hypotrochoids
- Build sacred geometry: golden ratio spirals, Fibonacci patterns, Platonic solids
- Design cellular automata: Conway's Game of Life, Wolfram elementary rules

## Fractal Implementations

### Mandelbrot Set
```javascript
function mandelbrot(cx, cy, maxIter) {
  let zx = 0, zy = 0;
  let iter = 0;
  while (zx * zx + zy * zy < 4 && iter < maxIter) {
    const tmp = zx * zx - zy * zy + cx;
    zy = 2 * zx * zy + cy;
    zx = tmp;
    iter++;
  }
  // Smooth coloring
  if (iter < maxIter) {
    const log_zn = Math.log(zx * zx + zy * zy) / 2;
    const nu = Math.log(log_zn / Math.log(2)) / Math.log(2);
    iter = iter + 1 - nu;
  }
  return iter;
}
```

### Julia Set
```javascript
function julia(zx, zy, cx, cy, maxIter) {
  let iter = 0;
  while (zx * zx + zy * zy < 4 && iter < maxIter) {
    const tmp = zx * zx - zy * zy + cx;
    zy = 2 * zx * zy + cy;
    zx = tmp;
    iter++;
  }
  return iter;
}
```

### L-System
```javascript
function lSystem(axiom, rules, iterations) {
  let str = axiom;
  for (let i = 0; i < iterations; i++) {
    let next = '';
    for (const ch of str) next += rules[ch] || ch;
    str = next;
  }
  return str;
}

function drawLSystem(str, len, angle) {
  const stack = [];
  for (const ch of str) {
    switch (ch) {
      case 'F': line(0, 0, 0, -len); translate(0, -len); break;
      case '+': rotate(angle); break;
      case '-': rotate(-angle); break;
      case '[': stack.push({ x: 0, y: 0, a: 0 }); push(); break;
      case ']': pop(); stack.pop(); break;
    }
  }
}
```

## Parametric Curves

### Rose Curve
```javascript
// r = cos(k * theta)
function roseCurve(k, numPoints, radius) {
  const points = [];
  for (let i = 0; i < numPoints; i++) {
    const theta = (i / numPoints) * TWO_PI * (k % 1 === 0 ? 1 : 2);
    const r = radius * Math.cos(k * theta);
    points.push({
      x: r * Math.cos(theta),
      y: r * Math.sin(theta)
    });
  }
  return points;
}
```

### Lissajous Curve
```javascript
function lissajous(a, b, delta, numPoints, size) {
  const points = [];
  for (let i = 0; i < numPoints; i++) {
    const t = (i / numPoints) * TWO_PI;
    points.push({
      x: size * Math.sin(a * t + delta),
      y: size * Math.sin(b * t)
    });
  }
  return points;
}
```

### Spirograph (Hypotrochoid)
```javascript
function spirograph(R, r, d, numPoints) {
  const points = [];
  const ratio = R / r;
  for (let i = 0; i < numPoints; i++) {
    const t = (i / numPoints) * TWO_PI * ratio;
    points.push({
      x: (R - r) * Math.cos(t) + d * Math.cos((R - r) / r * t),
      y: (R - r) * Math.sin(t) - d * Math.sin((R - r) / r * t)
    });
  }
  return points;
}
```

## Tessellation Patterns

### Voronoi (Brute Force for Small N)
```javascript
function voronoiMap(points, width, height) {
  loadPixels();
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      let minDist = Infinity, closest = 0;
      for (let i = 0; i < points.length; i++) {
        const d = dist(x, y, points[i].x, points[i].y);
        if (d < minDist) { minDist = d; closest = i; }
      }
      const idx = (y * width + x) * 4;
      const c = points[closest].color;
      pixels[idx] = red(c);
      pixels[idx + 1] = green(c);
      pixels[idx + 2] = blue(c);
      pixels[idx + 3] = 255;
    }
  }
  updatePixels();
}
```

### Phyllotaxis (Sunflower Spiral)
```javascript
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5)); // ~137.5°

function phyllotaxis(n, scale) {
  const points = [];
  for (let i = 0; i < n; i++) {
    const angle = i * GOLDEN_ANGLE;
    const r = scale * Math.sqrt(i);
    points.push({
      x: r * Math.cos(angle),
      y: r * Math.sin(angle),
      index: i
    });
  }
  return points;
}
```

## Golden Ratio & Fibonacci

```javascript
const PHI = (1 + Math.sqrt(5)) / 2; // 1.618033988749895

function fibonacciSpiral(turns, pointsPerTurn) {
  const points = [];
  const totalPoints = turns * pointsPerTurn;
  for (let i = 0; i < totalPoints; i++) {
    const t = i / pointsPerTurn;
    const angle = t * TWO_PI;
    const r = Math.pow(PHI, t * 2 / Math.PI);
    points.push({ x: r * Math.cos(angle), y: r * Math.sin(angle) });
  }
  return points;
}
```

## Cellular Automata

### Elementary 1D Rule
```javascript
function wolfram1D(rule, width, generations) {
  const grid = [];
  let row = new Array(width).fill(0);
  row[Math.floor(width / 2)] = 1;
  grid.push([...row]);

  for (let g = 1; g < generations; g++) {
    const newRow = new Array(width).fill(0);
    for (let i = 1; i < width - 1; i++) {
      const pattern = (row[i - 1] << 2) | (row[i] << 1) | row[i + 1];
      newRow[i] = (rule >> pattern) & 1;
    }
    row = newRow;
    grid.push([...row]);
  }
  return grid;
}
```

## When to Use

Use this skill when:
- Creating fractal-based artwork
- Implementing mathematical curve patterns
- Building tessellation or tiling art
- Generating sacred geometry compositions
- Creating cellular automata visualizations
