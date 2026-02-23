# Algorithmic Art — Router & Creative Direction

Core skill for the Algorithmic Art Studio. Routes requests to the correct engine (p5.js or Three.js), provides color theory, composition principles, and palette selection.

## Engine Routing

The assistant decides which engine fits the request:

| Engine | Best For |
|--------|----------|
| **p5.js (2D)** | Flow fields, fractals, waveforms, signal flow, frequency curves, tessellations, cellular automata, parametric curves, 2D particle systems |
| **Three.js (3D)** | Room acoustics, spatial audio, speaker placement, terrain, parametric surfaces, molecular structures, architectural visualization, 3D particle clouds |

### Decision Rules

1. If the concept is inherently flat/planar → **p5.js**
2. If the concept involves depth, perspective, or camera orbit → **Three.js**
3. If the user says "3D", "room", "spatial", "speaker", "terrain" → **Three.js**
4. If the user says "waveform", "signal", "flow field", "fractal", "tessellation" → **p5.js**
5. If ambiguous, default to **p5.js** (broader template library)

### Tiebreakers

- "More immersive" → Three.js
- "More spatial" → Three.js
- "More detailed" → p5.js (pixel-level control)
- "More mathematical" → p5.js (complex plane, parametric curves)

## Color & Composition

See `references/color-and-composition.md` for complete palette theory, harmony rules, layering strategy, and composition principles.

## Palette Database

See `references/palettes.csv` — 26 curated palettes with mood, colors, background, description, and keywords.

### Quick Palette Lookup

Match user mood keywords against palette CSV `keywords` column:
- warm/earth/organic → Warm Earth, Sahara Dusk, Golden Hour
- cool/blue/ocean → Ocean Depths, Arctic Frost, Deep Sea
- nature/green → Forest Canopy, Jade Garden
- cosmic/space/purple → Cosmic Night, Amethyst Dreams
- tech/neon/cyberpunk → Neon Circuit
- soft/pastel → Cherry Blossom, Pastel Dreams
- neutral/minimal → Moonlit Silver, Sepia Memory
- accessible/data → Colorblind Safe (Categorical), Colorblind Safe (Diverging)

## Reference Artworks

See `references/references.csv` — 15 landmark generative art projects (Fidenza, Chromie Squiggle, Ringers, etc.) with techniques, lessons, and keywords.

Use these as creative inspiration and to understand established techniques.

## Workflow

1. **Consult** — understand the user's vision, mood, subject
2. **Route** — pick engine (p5.js or Three.js) based on concept dimensionality
3. **Research** — find relevant techniques, palettes, and reference artworks
4. **Propose** — describe the approach, palette, and algorithmic technique
5. **Generate** — delegate to `@code-generator` with engine-specific skill
6. **Validate** — delegate to `@quality-reviewer`
7. **Deliver** — present the artwork with explanation
