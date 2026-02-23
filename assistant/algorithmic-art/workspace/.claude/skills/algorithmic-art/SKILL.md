# Algorithmic Art — Router

Routes requests to the correct engine skill: **algorithmic-art-p5js** (2D) or **algorithmic-art-3js** (3D).

## Engine Routing

| Engine | Skill | Best For |
|--------|-------|----------|
| **p5.js (2D)** | `algorithmic-art-p5js` | Flow fields, fractals, waveforms, signal flow, frequency curves, tessellations, cellular automata, parametric curves, 2D particle systems |
| **Three.js (3D)** | `algorithmic-art-3js` | Room acoustics, spatial audio, speaker placement, terrain, parametric surfaces, molecular structures, architectural visualization, 3D particle clouds |

## Decision Rules

1. If the concept is inherently flat/planar → **algorithmic-art-p5js**
2. If the concept involves depth, perspective, or camera orbit → **algorithmic-art-3js**
3. If the user says "3D", "room", "spatial", "speaker", "terrain" → **algorithmic-art-3js**
4. If the user says "waveform", "signal", "flow field", "fractal", "tessellation" → **algorithmic-art-p5js**
5. If ambiguous, default to **algorithmic-art-p5js** (broader template library)

### Tiebreakers

- "More immersive" → algorithmic-art-3js
- "More spatial" → algorithmic-art-3js
- "More detailed" → algorithmic-art-p5js (pixel-level control)
- "More mathematical" → algorithmic-art-p5js (complex plane, parametric curves)

## Workflow

1. **Consult** — understand the user's vision, mood, subject
2. **Route** — pick engine skill based on concept dimensionality
3. **Delegate** — the chosen engine skill handles techniques, palettes, references, and code generation
