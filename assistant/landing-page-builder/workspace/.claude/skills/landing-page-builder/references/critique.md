# Landing Page Craft Critique

A post-build protocol for evaluating landing pages. This is not a checklist for correctness — it's a lens for craft. The difference between a correct landing page and a compelling one is what this critique surfaces.

---

## The Gap

Every landing page, after first build, has a gap between "technically complete" and "would actually make me sign up." This critique closes that gap.

The critique has five lenses. Apply all five, in order.

---

## 1. See the Story

Open the page. Scroll top to bottom at reading pace. Answer:

- **Can you state the product's transformation in one sentence?** If the page doesn't make this clear, the hero is failing.
- **Does each section advance the argument?** Or are some sections just "filling space" between the hero and the CTA?
- **Is there a section you'd skip?** That section is filler. Either make it essential or cut it.
- **Does the page build momentum toward the CTA?** Or does it plateau after the features section?
- **Would you sign up?** If not, what's the first objection the page doesn't address?

The story must flow: **hook → trust → proof → differentiate → convert**. If any step is missing or out of order, the scroll sequence is broken.

---

## 2. See the Scroll Rhythm

The visual weight of sections should alternate. If every section is the same height and density, the page feels like a list, not a journey.

- **Is there a breathing pattern?** Large sections followed by compact ones, then large again?
- **Do section transitions feel intentional?** Color shifts, whitespace gates, visual continuity between sections?
- **Does the page have chapters?** Major sections should feel like turning a page, not scrolling a feed.
- **Is the final CTA section given enough space?** It should feel like the conclusion of the argument, not an afterthought taped to the bottom.

---

## 3. See the Craft

Zoom into the details. This is where AI defaults live.

### Typography
- **Is the hero headline confident?** Large enough to feel intentional, not just "big text." Tight letter-spacing for display type.
- **Is there real hierarchy?** Can you identify 4 distinct levels (display, heading, body, small) without looking at CSS?
- **Are line lengths comfortable?** Body text lines should be 55-75 characters. Headlines should use `text-wrap: balance`.
- **Is the font pairing intentional?** Does the typeface choice say something about the product, or is it just "Inter because it's safe"?

### Color
- **Is there exactly one accent color?** Two accents means no accent. The CTA should be the most colorful thing on the page.
- **Does the color palette feel like it belongs to this product?** Or could you swap it onto any other page?
- **Are the grays warm or cool?** This should match the product's personality, not be arbitrary.
- **Is contrast sufficient?** Body text on backgrounds should have WCAG AA contrast minimum.

### Spacing
- **Is spacing on a system?** Consistent multiples of a base unit, not arbitrary pixel values.
- **Is padding symmetrical?** Top/bottom and left/right should match within components.
- **Is there enough whitespace around the hero CTA?** The CTA should breathe — it needs space to stand out.
- **Do cards have consistent internal padding?** Padding should be the same across all card types.

### Surfaces & Borders
- **Is there a depth strategy?** Either borders-only or shadows — not both competing.
- **Are borders subtle?** Landing page borders should be barely visible — `rgba` at low opacity.
- **Do cards feel like they belong to the same surface system?** Consistent radius, consistent border treatment.

### Motion
- **Do scroll reveals feel natural?** Not too slow (>800ms), not too fast (<200ms). Sweet spot: 500-600ms.
- **Is stagger timing right?** Items should appear sequentially but not so slowly that users wait. Max total stagger: 400ms.
- **Are hover states present on all interactive elements?** Buttons, cards, links — everything clickable should respond.
- **Does reduced-motion work?** Content should be visible immediately with `prefers-reduced-motion`.

---

## 4. See the Conversion

This is the business lens. A beautiful page that doesn't convert is a failure.

### CTA Analysis
- **Is the primary CTA visually dominant?** It should be the highest-contrast element in every section where it appears.
- **Does the CTA copy match the user's mindset?** Hero CTA should be lower commitment. Final CTA can be higher commitment.
- **Is the CTA visible without scrolling?** At minimum in the hero. Ideally also in the sticky nav.
- **Is there a clear visual path to the CTA?** The eye should naturally arrive at the button.

### Trust Analysis
- **Are trust signals placed near decision points?** Logos near the hero, testimonials near features, guarantees near pricing.
- **Are the trust signals specific?** "12,847 teams" > "thousands of users." "99.99% uptime" > "reliable."
- **Are testimonials from real people?** Full names, titles, companies. Vague attribution kills trust.

### Objection Analysis
- **What's the first thing a skeptic would think?** Is it addressed on the page?
- **Is pricing transparent?** If pricing is hidden, is there a clear path to find it?
- **Is the free tier / trial obvious?** Reducing risk is the fastest path to conversion.
- **Is there an FAQ or comparison that addresses the "why not a competitor?" question?**

### Mobile Analysis
- **Does the hero work on 375px width?** Test at actual mobile viewport.
- **Are CTAs thumb-reachable?** Bottom of screen, full-width on mobile.
- **Is the sticky nav usable on mobile?** Not blocking content, hamburger menu if needed.
- **Do feature sections stack cleanly?** No horizontal overflow, images resize properly.

---

## 5. See the Specificity

The final and most important lens. This is what separates a page that converts from a template.

- **The Swap Test:** Replace the product name with a competitor's name. Does the page still work? If yes, nothing is specific enough. Every headline, every visual, every feature description should feel wrong for any other product.
- **The Screenshot Test:** Take a screenshot of just the hero. Show it to someone who doesn't know the product. Can they tell what this does and who it's for? If not, the hero lacks specificity.
- **The Token Test:** Read the CSS custom property names. Do they sound like they belong to this product's world? `--surface-base` is generic. `--terminal-bg` is specific. `--ink-headline` is generic. `--chalk-primary` is specific.
- **The Copy Test:** Read every headline without the body text. Does each headline say something specific, or is it a placeholder that any product could use? "Build faster" is nothing. "Deploy in 4 commands" is something.

---

## Process

1. Open the built page in a browser
2. Walk through all five lenses, in order: Story → Rhythm → Craft → Conversion → Specificity
3. For each issue found, note whether it's a **default** (generic AI choice) or a **decision** (intentional choice that happens to need refinement)
4. Defaults get rebuilt from intent. Decisions get refined.
5. Don't narrate the critique to the user. Fix the issues and present the improved version.
6. If the user asked for a critique (rather than a build), present findings organized by lens with specific, actionable recommendations.

---

## Quick Self-Check

Before presenting any landing page, run this abbreviated version:

1. Three-second hero test — what is this, who is it for, what should I do?
2. Scroll the full page — any section I'd skip?
3. Swap test — replace the product name. Does anything feel wrong? (It should.)
4. Would I sign up based on this page?
5. One thing on this page that no template would generate — what is it?

If you can't answer #5, the page lacks a signature element. Find one and add it.
