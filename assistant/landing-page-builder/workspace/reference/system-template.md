# Landing Page Direction

## Story

### Transformation
[One sentence — what changes for the user]

### Audience
[Who arrives on this page? What are they feeling? Be specific.]

### Hook
[The first thing they need to hear to stop scrolling]

## Visual World

### Domain Concepts
[5+ real-world metaphors from the product's world]

### Color Mood
- Foundation: [dark | light]
- Temperature: [warm | cool | neutral]
- Accent: [single accent color and its meaning]
- Palette:
  - --[token-name]: [value]  /* [purpose] */
  - --[token-name]: [value]  /* [purpose] */

### Typography
- Display font: [family]
- Body font: [family]
- Personality: [geometric/grotesque/serif/monospace accent]
- Scale: [sizes]
- Weights: [weights used]

### Motion Language
- Character: [snappy | fluid | mechanical | organic]
- Scroll reveals: [fade-up | slide-in | scale | none]
- Hover: [lift | glow | expand | underline]
- Duration: [base duration in ms]

### Signature Element
[One visual element unique to THIS page that no template would generate]

## Section Choreography

| # | Section | Purpose | Visual Weight | Background |
|---|---------|---------|---------------|------------|
| 1 | Hero | [job] | LARGE | [bg] |
| 2 | [section] | [job] | [weight] | [bg] |
| 3 | [section] | [job] | [weight] | [bg] |
| ... | ... | ... | ... | ... |

## Tokens

```css
:root {
  /* Surfaces */
  --[name]: [value];    /* [purpose] */

  /* Ink */
  --[name]: [value];    /* [purpose] */

  /* Accent */
  --[name]: [value];    /* [purpose] */

  /* Borders */
  --[name]: [value];    /* [purpose] */

  /* Spacing */
  --section-sm: [value];
  --section-md: [value];
  --section-lg: [value];
  --section-xl: [value];

  /* Typography */
  --text-display: [value];
  --text-heading: [value];
  --text-subheading: [value];
  --text-body: [value];
  --text-small: [value];
}
```

## Patterns

### Hero
- Layout: [product-led | split | immersive | copy-led]
- Headline: "[actual headline text]"
- CTA: "[actual CTA text]"
- Visual: [screenshot | terminal | demo | video | none]

### CTA Primary
- Padding: [values]
- Radius: [value]
- Background: [value]
- Hover: [behavior]

### Feature Card
- Padding: [value]
- Radius: [value]
- Border: [value]
- Background: [value]

### Section Header
- Max-width: [value]
- Alignment: [center | left]
- Eyebrow style: [uppercase small | accent color | badge]

## Anti-Defaults

### Layout Rejections
| Rejected | Instead | Reason |
|----------|---------|--------|
| [obvious choice] | [our choice] | [why] |

### Copy Rejections
| Rejected | Instead | Reason |
|----------|---------|--------|
| [generic copy] | [our copy] | [why] |

## Decisions Log

| Decision | Rationale | Date |
|----------|-----------|------|
| [choice made] | [why this serves the product story] | YYYY-MM-DD |
