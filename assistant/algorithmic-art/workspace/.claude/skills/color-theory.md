# Color Theory Skill

You are an expert in color theory applied to generative algorithmic art.

## Core Capabilities

- Design harmonious color palettes using color theory principles
- Implement HSB/HSL color manipulation for rich, dynamic palettes
- Create perceptually uniform color scales for data visualization
- Generate palette variations using seeded randomness
- Apply color blending and compositing techniques

## Color Harmony Strategies

### Analogous
Colors adjacent on the color wheel — harmonious and serene.
```javascript
function analogousPalette(baseHue, spread, count) {
  const colors = [];
  for (let i = 0; i < count; i++) {
    const hue = (baseHue + (i - Math.floor(count / 2)) * spread) % 360;
    colors.push(color(hue < 0 ? hue + 360 : hue, 70, 85));
  }
  return colors;
}
```

### Complementary
Opposing colors — high contrast and vibrant.
```javascript
function complementaryPalette(baseHue) {
  return [
    color(baseHue, 75, 90),
    color(baseHue, 50, 60),
    color((baseHue + 180) % 360, 75, 90),
    color((baseHue + 180) % 360, 50, 60),
    color(baseHue, 20, 95) // neutral
  ];
}
```

### Split-Complementary
Balanced contrast without the intensity of pure complementary.
```javascript
function splitComplementary(baseHue) {
  return [
    color(baseHue, 75, 85),
    color((baseHue + 150) % 360, 65, 80),
    color((baseHue + 210) % 360, 65, 80)
  ];
}
```

### Triadic
Three equidistant hues — vibrant and balanced.
```javascript
function triadicPalette(baseHue) {
  return [
    color(baseHue, 70, 85),
    color((baseHue + 120) % 360, 70, 85),
    color((baseHue + 240) % 360, 70, 85)
  ];
}
```

### Monochromatic
Single hue with varying saturation and brightness — elegant and cohesive.
```javascript
function monochromaticPalette(baseHue, count) {
  const colors = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    colors.push(color(baseHue, lerp(30, 90, t), lerp(90, 40, t)));
  }
  return colors;
}
```

## Perceptual Color Scales

### Sequential Scale (for ordered data)
```javascript
function sequentialScale(startColor, endColor, steps) {
  const scale = [];
  for (let i = 0; i < steps; i++) {
    scale.push(lerpColor(startColor, endColor, i / (steps - 1)));
  }
  return scale;
}
```

### Diverging Scale (for data with a meaningful midpoint)
```javascript
function divergingScale(lowColor, midColor, highColor, steps) {
  const scale = [];
  const half = Math.floor(steps / 2);
  for (let i = 0; i <= half; i++) {
    scale.push(lerpColor(lowColor, midColor, i / half));
  }
  for (let i = 1; i <= half; i++) {
    scale.push(lerpColor(midColor, highColor, i / half));
  }
  return scale;
}
```

## Color Manipulation Utilities

### Hex Conversions
```javascript
function hexToHSB(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d + 6) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  const s = max === 0 ? 0 : d / max * 100;
  const v = max * 100;
  return { h, s, b: v };
}
```

### Palette Interpolation
```javascript
function interpolatePalette(colors, t) {
  const scaled = t * (colors.length - 1);
  const idx = Math.floor(scaled);
  const frac = scaled - idx;
  if (idx >= colors.length - 1) return colors[colors.length - 1];
  return lerpColor(colors[idx], colors[idx + 1], frac);
}
```

### Seeded Palette Generation
```javascript
function seededPalette(seed, strategy) {
  const rng = mulberry32(seed);
  const baseHue = rng() * 360;
  switch (strategy) {
    case 'analogous': return analogousPalette(baseHue, 30, 5);
    case 'complementary': return complementaryPalette(baseHue);
    case 'triadic': return triadicPalette(baseHue);
    case 'split': return splitComplementary(baseHue);
    case 'monochromatic': return monochromaticPalette(baseHue, 5);
    default: return analogousPalette(baseHue, 25, 5);
  }
}
```

## Recommended Curated Palettes

### Warm Earth Tones
- Primary: `#d97757` (terra cotta)
- Secondary: `#b85c3a` (burnt sienna)
- Accent: `#e8c07a` (gold)
- Dark: `#3d2b1f` (dark brown)
- Light: `#f5e6d3` (cream)

### Ocean Depths
- Primary: `#6a9bcc` (steel blue)
- Secondary: `#2c5f8a` (deep blue)
- Accent: `#88d4ab` (sea green)
- Dark: `#1a2d42` (navy)
- Light: `#d4e8f0` (ice blue)

### Forest Canopy
- Primary: `#788c5d` (sage)
- Secondary: `#4a6741` (forest green)
- Accent: `#c4a35a` (amber)
- Dark: `#2a3d28` (deep green)
- Light: `#e8ecd8` (mint cream)

### Cosmic Night
- Primary: `#7b68ee` (medium slate blue)
- Secondary: `#4a3d8f` (indigo)
- Accent: `#ff6b9d` (hot pink)
- Dark: `#0f0a1a` (deep space)
- Light: `#c8beff` (lavender)

### Sunset Gradient
- Primary: `#ff6b35` (orange)
- Secondary: `#c44569` (raspberry)
- Accent: `#ffd93d` (yellow)
- Dark: `#2d132c` (dark plum)
- Light: `#ffe5cc` (peach)

## Colorblind-Safe Palettes

For data visualization and educational art, prefer these CB-safe palettes:

```javascript
const CB_SAFE = {
  categorical: ['#0072B2', '#E69F00', '#009E73', '#CC79A7', '#56B4E9', '#D55E00', '#F0E442'],
  sequential: ['#eff3ff', '#bdd7e7', '#6baed6', '#3182bd', '#08519c'],
  diverging: ['#d73027', '#fc8d59', '#fee090', '#e0f3f8', '#91bfdb', '#4575b4']
};
```

## When to Use

Use this skill when:
- Designing color palettes for generative artwork
- Implementing dynamic color manipulation
- Creating perceptually accurate data visualizations
- Ensuring colorblind accessibility
- Generating seeded palette variations
