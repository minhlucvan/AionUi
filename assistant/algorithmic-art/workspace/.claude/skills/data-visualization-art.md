# Data Visualization Art Skill

You are an expert in transforming data into beautiful algorithmic artwork — where information becomes aesthetic experience.

## Core Capabilities

- Encode multi-dimensional data into visual properties (position, size, color, opacity, rotation)
- Create abstract data portraits and generative data landscapes
- Build interactive educational visualizations of scientific and mathematical concepts
- Design algorithm visualizations that reveal computational beauty
- Balance information accuracy with artistic expression

## Data-to-Visual Mapping Strategies

### Encoding Hierarchy (Perceptual Effectiveness)

Most accurate → least accurate for quantitative data:
1. **Position** (x, y) — Most precise human perception
2. **Length** — Easy to compare
3. **Angle/Slope** — Moderate precision
4. **Area** — Often misperceived (use sqrt scaling)
5. **Color luminance** — Good for sequential data
6. **Color hue** — Best for categorical data
7. **Texture/Shape** — Categorical distinctions only

### Multi-Dimensional Mapping Template
```javascript
function mapDataToVisual(datum) {
  return {
    x: map(datum.dim1, dim1Min, dim1Max, margin, width - margin),
    y: map(datum.dim2, dim2Min, dim2Max, height - margin, margin),
    size: map(datum.dim3, dim3Min, dim3Max, 4, 40),
    color: interpolatePalette(palette, map(datum.dim4, dim4Min, dim4Max, 0, 1)),
    opacity: map(datum.dim5, dim5Min, dim5Max, 40, 255),
    rotation: map(datum.dim6, dim6Min, dim6Max, 0, TWO_PI)
  };
}
```

## Generative Data Patterns

### Data-Driven Flow Field
```javascript
// Use data values to influence flow field angles
function dataFlowField(data, cols, rows, w, h) {
  const field = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      // Sample nearby data points to determine flow direction
      const dataInfluence = sampleNearestData(data, x * w / cols, y * h / rows);
      const baseAngle = noise(x * 0.05, y * 0.05) * TWO_PI;
      const angle = baseAngle + dataInfluence * PI;
      field.push(p5.Vector.fromAngle(angle));
    }
  }
  return field;
}
```

### Data Constellation
```javascript
// Map data points to star-like positions with connecting lines
function dataConstellation(data, centerX, centerY, radius) {
  const points = data.map((d, i) => {
    const angle = (i / data.length) * TWO_PI;
    const r = radius * map(d.magnitude, 0, 1, 0.3, 1.0);
    return {
      x: centerX + r * cos(angle),
      y: centerY + r * sin(angle),
      size: map(d.importance, 0, 1, 2, 12),
      connections: d.related || []
    };
  });

  // Draw connections
  stroke(255, 30);
  for (const p of points) {
    for (const idx of p.connections) {
      if (idx < points.length) {
        line(p.x, p.y, points[idx].x, points[idx].y);
      }
    }
  }

  // Draw points
  noStroke();
  for (const p of points) {
    fill(255, 200);
    ellipse(p.x, p.y, p.size);
  }
}
```

### Radial Data Mandala
```javascript
// Transform data into a mandala-like radial pattern
function dataMandala(data, cx, cy, rings, symmetry) {
  for (let ring = 0; ring < rings; ring++) {
    const radius = map(ring, 0, rings - 1, 50, min(cx, cy) * 0.9);
    const dataSlice = data.slice(
      Math.floor(ring / rings * data.length),
      Math.floor((ring + 1) / rings * data.length)
    );

    for (let s = 0; s < symmetry; s++) {
      const baseAngle = (s / symmetry) * TWO_PI;
      push();
      translate(cx, cy);
      rotate(baseAngle);

      for (let i = 0; i < dataSlice.length; i++) {
        const angle = (i / dataSlice.length) * (TWO_PI / symmetry);
        const val = dataSlice[i];
        const x = radius * cos(angle);
        const y = radius * sin(angle);
        const size = map(val, 0, 1, 2, 15);
        ellipse(x, y, size);
      }

      pop();
    }
  }
}
```

## Educational Visualization Patterns

### Math Concept: Function Plotter
```javascript
function plotFunction(fn, xMin, xMax, yMin, yMax, resolution) {
  const margin = 60;
  const plotW = width - 2 * margin;
  const plotH = height - 2 * margin;

  // Draw axes
  stroke(100);
  line(margin, margin, margin, height - margin);
  line(margin, height - margin, width - margin, height - margin);

  // Plot function
  noFill();
  stroke(CONFIG.colors.primary);
  strokeWeight(2);
  beginShape();
  for (let i = 0; i <= resolution; i++) {
    const x = xMin + (xMax - xMin) * (i / resolution);
    const y = fn(x);
    const px = margin + (x - xMin) / (xMax - xMin) * plotW;
    const py = height - margin - (y - yMin) / (yMax - yMin) * plotH;
    vertex(px, constrain(py, margin, height - margin));
  }
  endShape();
}
```

### Physics: Gravity Well Visualization
```javascript
function gravityWell(bodies, dt) {
  const G = 6.674;
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const dx = bodies[j].x - bodies[i].x;
      const dy = bodies[j].y - bodies[i].y;
      const dist = Math.sqrt(dx * dx + dy * dy) + 1;
      const force = G * bodies[i].mass * bodies[j].mass / (dist * dist);
      const fx = force * dx / dist;
      const fy = force * dy / dist;

      bodies[i].vx += fx / bodies[i].mass * dt;
      bodies[i].vy += fy / bodies[i].mass * dt;
      bodies[j].vx -= fx / bodies[j].mass * dt;
      bodies[j].vy -= fy / bodies[j].mass * dt;
    }
  }
  for (const b of bodies) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
  }
}
```

### Algorithm: Sorting Visualization
```javascript
function visualizeSort(arr, activeIndices, sortedIndices) {
  const barWidth = width / arr.length;
  for (let i = 0; i < arr.length; i++) {
    const h = map(arr[i], 0, max(arr), 20, height - 20);
    if (sortedIndices.includes(i)) {
      fill('#788c5d'); // sorted - green
    } else if (activeIndices.includes(i)) {
      fill('#d97757'); // active - orange
    } else {
      fill('#6a9bcc'); // default - blue
    }
    noStroke();
    rect(i * barWidth, height - h, barWidth - 1, h);
  }
}
```

## Synthetic Data Generation

When real data isn't available, generate meaningful synthetic data:

```javascript
function generateSyntheticData(seed, count, dimensions) {
  initSeed(seed);
  const data = [];
  for (let i = 0; i < count; i++) {
    const point = {};
    for (const dim of dimensions) {
      switch (dim.distribution) {
        case 'uniform':
          point[dim.name] = seededRandom(dim.min, dim.max);
          break;
        case 'gaussian':
          point[dim.name] = seededGaussian(dim.mean, dim.sd);
          break;
        case 'clustered':
          const cluster = seededRandomInt(0, dim.clusters - 1);
          point[dim.name] = seededGaussian(
            dim.centers[cluster],
            dim.spread
          );
          break;
      }
    }
    data.push(point);
  }
  return data;
}
```

## Annotation & Labels

```javascript
function drawAnnotation(x, y, label, value) {
  push();
  textAlign(LEFT, CENTER);
  textSize(11);
  fill(200);
  noStroke();
  text(`${label}: ${value}`, x + 8, y);

  // Leader line
  stroke(150, 80);
  strokeWeight(1);
  line(x, y, x + 6, y);
  pop();
}

function drawLegend(x, y, items) {
  push();
  textSize(11);
  textAlign(LEFT, CENTER);
  for (let i = 0; i < items.length; i++) {
    const iy = y + i * 22;
    fill(items[i].color);
    noStroke();
    rect(x, iy - 5, 14, 14, 3);
    fill(200);
    text(items[i].label, x + 20, iy + 2);
  }
  pop();
}
```

## When to Use

Use this skill when:
- Creating data-driven generative artwork
- Building educational mathematical visualizations
- Designing algorithm visualizations
- Transforming datasets into aesthetic representations
- Creating interactive scientific demonstrations
