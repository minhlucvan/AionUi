# Audit Landing Page for Conversion & Craft

Audit existing landing page code against the established system and conversion best practices.

## Prerequisites

Read `.landing-page/system.md` if it exists. If not, extract patterns first to establish a baseline.

## Audit Categories

### 1. Story Flow
- Does the section order follow the story architecture? (hook → trust → proof → differentiate → convert)
- Are there sections without a clear purpose in the scroll sequence?
- Does the hero pass the three-second test?

### 2. Conversion Issues
- Is the primary CTA visually dominant?
- Is the CTA present above the fold?
- Does CTA copy match the user's decision stage?
- Are trust signals placed near decision points?
- Is the final CTA section given enough space and emphasis?

### 3. Spacing Violations
- Values not on the spacing grid
- Inconsistent section padding
- Asymmetric component padding
- Missing whitespace around CTAs

### 4. Typography Violations
- Inconsistent font sizes (values outside the scale)
- Missing hierarchy levels
- Line lengths exceeding 75 characters
- Headline letter-spacing not tightened

### 5. Color Violations
- Colors not in the defined palette
- Multiple accent colors competing
- Insufficient contrast ratios
- Inconsistent border opacity values

### 6. Motion Issues
- Missing scroll reveal animations
- Animations on layout-triggering properties (not transform/opacity)
- Missing prefers-reduced-motion handling
- Inconsistent animation durations

### 7. Responsive Issues
- Missing mobile breakpoint adjustments
- Touch targets below 44px
- Horizontal overflow on mobile
- Hero headline too small on mobile

### 8. Specificity Check
- Generic headlines that could apply to any product
- Generic CTA copy ("Get Started", "Sign Up")
- Token names that don't reflect the product's world
- Missing signature element

## Output Format

Report violations grouped by category with:
- File and line reference
- Current value vs. expected value
- Severity: `critical` (breaks conversion), `warning` (reduces craft), `suggestion` (opportunity)

Offer to fix violations after presenting the audit.
