# Extract Patterns from Existing Landing Page

Scan existing landing page code and extract the design patterns into a structured system.

## What to Scan

Look for UI files: `.html`, `.tsx`, `.jsx`, `.vue`, `.svelte`, `.astro`

## What to Extract

### Layout Patterns
- Container max-width
- Section padding/spacing values
- Grid configurations (columns, gaps)
- Breakpoint values

### Typography
- Font families in use
- Size scale (all font-size values, sorted)
- Weight usage
- Letter-spacing patterns
- Line-height patterns

### Color System
- Background colors (surfaces)
- Text colors (ink hierarchy)
- Accent/brand colors
- Border colors and opacities
- Gradient definitions

### Section Patterns
- Hero layout structure
- Feature section variations
- Pricing layout
- Testimonial structure
- CTA patterns
- Navigation structure

### Motion
- Transition durations
- Animation properties
- Scroll-related JavaScript (Intersection Observer, scroll listeners)

### CTA Patterns
- Button styles (padding, radius, backgrounds)
- CTA copy text
- CTA placement (which sections contain CTAs)

## Output

Present findings organized by category with:
- Exact values and their frequency of use
- Identified inconsistencies (e.g., "3 different border-radius values used for cards")
- Suggested consolidation

## After Extraction

Offer to create `.landing-page/system.md` from the extracted data, filling in the template with discovered patterns.
