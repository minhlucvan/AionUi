# Landing Page Builder — Core Skill

## The Problem

AI-generated landing pages all look the same. Generic hero with gradient blob. Three-column feature grid. Pricing table. Footer. The layout is structurally correct and emotionally dead.

The problem isn't missing sections — it's missing story. A landing page is not a component library demo. It's a persuasion sequence. Every scroll reveals the next piece of an argument. Every visual choice reinforces a specific feeling about a specific product.

Generic output happens when you skip the story and jump to layout. This skill ensures you never do that.

## Where Defaults Hide

Learn to see the generic patterns AI defaults to. Once you see them, you can't unsee them:

### Hero Defaults
- Centered headline, subtitle, single CTA button — the most common AI layout in existence
- Gradient mesh blob or abstract illustration on the right — decorative, says nothing about the product
- "Transform your workflow" / "The future of X" — empty headline that applies to anything
- Purple-to-blue gradient background — the universal AI color choice

### Section Defaults
- Three-column feature grid with icons — looks like every other SaaS page
- Alternating left-right feature sections — predictable, no rhythm
- Testimonial carousel with circular avatars — template energy
- Pricing table with "Popular" badge on the middle tier — obvious, unearned

### Visual Defaults
- Inter or system font for everything — no typographic personality
- One accent color plus gray — safe, forgettable
- Uniform section spacing — no scroll rhythm, no breathing
- Stock photography or generic illustrations — trust-destroying

### Copy Defaults
- Benefit-first subheadings that could describe any product — "Save time", "Work smarter"
- Lorem ipsum-feeling placeholder copy — technically correct, says nothing specific
- "Get Started" / "Sign Up Free" — CTA that asks for commitment without earning it

**Every one of these must be caught and replaced with a decision.**

---

## Story First

Before writing a single line of HTML, answer these questions. They are not optional.

### Three Required Answers

1. **What transformation does this product promise?**
   Not "what does it do" — what changes for the person using it? A project management tool doesn't "organize tasks." It gives a founder back their evenings. A design tool doesn't "create interfaces." It makes a solo developer look like they have a design team.

2. **Who specifically arrives on this page, and what are they feeling?**
   Not "developers" or "marketers" — paint the person. An engineer who just spent 3 hours debugging a deployment. A founder who's comparing 5 tools in 15 minutes. A designer who's been told to "just use Figma." Their emotional state when they land determines what the hero needs to say first.

3. **What would make them stop scrolling and pay attention?**
   Not a feature list — a moment of recognition. "Oh, this is for people like me." That moment is the job of the hero. Everything after it is building the case.

### Story Architecture

A landing page tells a story in scroll. The structure is:

1. **Hook** (Hero) — Arrest attention. State the transformation. Show you understand their world.
2. **Credibility** (Social Proof) — Before they evaluate features, dissolve the "who made this?" objection. Logos, numbers, testimonials — but only what's real and specific.
3. **Evidence** (Features/Demo) — Now prove the transformation is possible. Show the product. Be specific. Screenshots > descriptions. Interactions > static images.
4. **Differentiation** (Why This) — Why this tool over the 5 others they're comparing? Not a feature checklist — a perspective. What do you believe about this problem that others don't?
5. **Objection Handling** (FAQ/Comparison) — Address the unspoken "but what about..." questions. Pricing concerns, migration pain, team adoption.
6. **Conversion** (Final CTA) — The ask. By now they should feel informed enough to act. Make it easy, low-risk, and obvious.

Not every page needs all six. But every page needs the story to flow in this direction: **hook → trust → proof → differentiate → convert**.

---

## Every Choice Must Be A Choice

"I used a three-column grid because it's the standard layout for features."

That's not a reason. That's a default. For every design decision, you must be able to say WHY this choice serves THIS product's story.

- **Why this layout?** — "Side-by-side because the product is about comparison and the user needs to see before/after in one glance."
- **Why this color?** — "Deep navy because the product is about trust and security — it should feel institutional, not playful."
- **Why this animation?** — "Fade-up on scroll because the product reveals complexity gradually — the page should mirror that experience."
- **Why this CTA text?** — "'See it in action' because the user is evaluating, not ready to commit — we're offering proof, not asking for a signup."

If you can swap the choice for a different product and it still works, it's generic. Rebuild it.

---

## Product World Exploration

Before building, explore the product's visual world. This is not optional.

### Required Outputs

**Story:**
- Transformation: One sentence — what changes for the user
- Audience: One paragraph — who they are and what they're feeling when they arrive
- Hook: The first thing they need to hear

**Visual World:**
- Domain: 5+ concepts from the product's world (not UI concepts — real-world metaphors)
- Color mood: 5+ colors that naturally exist in this domain
- Motion language: How things should move (snappy/fluid/mechanical/organic)
- Signature: One visual element unique to THIS page that no template would generate

**Anti-defaults:**
- 3 obvious layout choices to reject and what to do instead
- 3 obvious copy patterns to reject and what to write instead

### Example: Developer Deployment Tool

**Story:**
- Transformation: "Ship with the confidence of a 50-person platform team, alone."
- Audience: Solo developer or small team lead, tired of YAML configs and broken CI pipelines. They've just had a failed deploy and they're looking for something that actually works.
- Hook: "Deploy like it's `git push`. Because it is."

**Visual World:**
- Domain: terminal, command line, pipelines, green checkmarks, speed, infrastructure
- Color mood: terminal green on dark, steel blue, warm amber for success states
- Motion: snappy, instant — like a terminal response. No floaty animations.
- Signature: A real terminal animation showing an actual deploy in the hero — not a screenshot, a live-feeling sequence.

**Anti-defaults:**
- Reject: centered hero with abstract blob → Do: asymmetric layout with terminal on the left, copy on the right
- Reject: "Deploy with confidence" headline → Do: "Zero-config deploys for people who hate config"
- Reject: three-column feature grid → Do: single scrolling timeline showing a deploy from push to live

---

## Section Choreography

Every section has a job in the scroll sequence. No section exists without a purpose.

### Section Purpose Map

| Section | Job | Scroll Position |
|---------|-----|-----------------|
| Hero | Hook attention, state transformation | Above the fold |
| Social Proof Bar | Dissolve "who uses this?" objection | Immediately below hero |
| Primary Feature | Prove the core value proposition | First scroll |
| Feature Sequence | Build the full picture, section by section | Middle |
| Testimonial | Let real users make the argument | After features |
| Pricing | Remove the "how much?" blocker | Late |
| Final CTA | Convert the convinced visitor | Bottom |

### Scroll Rhythm

Not every section should be the same height or have the same visual weight.

**Breathing pattern:**
- Hero: LARGE — maximum visual impact, generous whitespace
- Social Proof: small — compact, quiet credibility
- Primary Feature: LARGE — full demonstration, maybe interactive
- Feature 2: medium — supporting evidence
- Feature 3: medium — supporting evidence
- Testimonial: medium-large — emotional pause, let a story land
- Pricing: LARGE — the decision section needs space and clarity
- Final CTA: medium — confident, not desperate

This creates rhythm. Big-small-big-medium-medium-large-big-medium. The eye never gets bored because the page breathes.

### Section Transitions

How sections connect matters as much as what's in them.

- **Color shifts** — Moving from dark hero to lighter sections creates a sense of emergence
- **Whitespace gates** — Extra vertical padding between major sections creates chapter breaks
- **Visual continuity** — A shape, line, or gradient that bleeds between sections creates flow
- **Content bridges** — The last line of one section sets up the first line of the next

---

## Conversion Architecture

A landing page has one job: get the visitor to take the next step. Every design decision either moves them toward that action or distracts from it.

### CTA Hierarchy

Every page has exactly one primary action. Everything else is secondary.

**Primary CTA:**
- Appears in hero and at the bottom (minimum)
- Visually dominant — largest, most contrast, most color
- Copy matches where the user is in their journey
  - Hero CTA: lower commitment ("See how it works", "Watch demo")
  - Final CTA: higher commitment ("Start free trial", "Get started")

**Secondary CTAs:**
- "Learn more" links within feature sections
- Documentation links for technical audiences
- "Talk to sales" for enterprise pages

**Never:**
- Two equally weighted CTAs competing for attention
- CTA before the user understands the value
- Generic "Submit" or "Click here"

### Trust Signals

Place trust signals where objections naturally arise:

- **Near hero:** Logos of known companies, user count, GitHub stars
- **Near features:** Specific metrics ("50ms p95 latency", "99.99% uptime")
- **Near pricing:** "No credit card required", money-back guarantee, security badges
- **Near final CTA:** Testimonial from someone like the target user

### Urgency Without Desperation

Good urgency: "Join 12,000 teams already shipping faster"
Bad urgency: "LIMITED TIME OFFER!!!" / countdown timers / "Only 3 spots left"

The page should feel confident, not anxious. A great product doesn't beg.

---

## Visual Storytelling

### The Hero Is Everything

The hero section gets 3–5 seconds. In that time, the visitor decides: "Is this for me?"

**What the hero must communicate instantly:**
1. What this is (product category)
2. What it does differently (unique angle)
3. Who it's for (recognition moment)

**Hero patterns that work (choose based on product):**

- **Product-led:** Giant screenshot or interactive demo dominates. Copy is secondary. Works when the product's UI IS the selling point.
- **Copy-led:** Bold headline dominates. Minimal visual. Works when the transformation is emotional or abstract.
- **Split:** Copy on one side, product visual on the other. Works for most SaaS products.
- **Full-bleed visual:** Background is the product world (e.g., dark code editor). Copy overlays. Works for developer tools.
- **Video hero:** Autoplay muted video showing the product in use. Works when motion tells the story better than a screenshot.

### Typography as Personality

Landing page typography must do more work than app typography.

- **Headlines:** The typeface IS the brand voice. Geometric sans = modern/technical. Serif = established/premium. Rounded = friendly/approachable. Monospace = developer/technical.
- **Size matters:** Hero headlines should be large enough to feel confident. 48px minimum on desktop, 56–72px for impact. Don't be timid.
- **Weight contrast:** Use font weight to create hierarchy within a single line. "Build apps **10x faster**" — the number gets the weight.
- **Letter spacing:** Tight for headlines (confidence), normal for body (readability).

### Color as Narrative

- **Dark backgrounds** signal sophistication, technical depth, premium. (Linear, Vercel, Raycast)
- **Light backgrounds** signal approachability, clarity, openness. (Notion, Stripe, Slack)
- **Accent color** is the emotional core — it should appear on CTAs, key metrics, and interactive elements. Only ONE accent. Two accents means no accent.
- **Gradient usage:** Gradients can feel premium or gimmicky. Use them on backgrounds or large surfaces, never on small text or buttons. A gradient should feel like lighting, not decoration.

### Motion as Meaning

Animation on a landing page is not decoration. It's pacing.

- **Scroll reveals:** Elements fade up as they enter the viewport. This creates reading pace and guides attention.
- **Stagger:** Related elements (feature cards, pricing tiers) enter one after another. This implies sequence and hierarchy.
- **Product demos:** Micro-animations showing the product in use — cursor movements, code appearing, UI state changes. These replace screenshots with experiences.
- **Parallax (careful):** Subtle depth on background elements. Can feel premium or nauseating. If in doubt, don't.
- **Performance:** Every animation must run at 60fps. Use `transform` and `opacity` only. No layout-triggering animations.

---

## Before Writing Each Section

Mandatory checkpoint. Before you write the HTML for any section, state:

1. **Purpose** — What job does this section do in the scroll sequence?
2. **Entry state** — What does the visitor know/feel arriving at this section?
3. **Exit state** — What should they know/feel after scrolling past it?
4. **Signature** — What's the one thing in this section that no template would generate?
5. **Copy** — What's the headline, and why these words specifically?

If you can't answer all five, you're about to build a generic section. Stop and think.

---

## Craft Checks

Before presenting any landing page, run these:

### 1. Scroll Test
Open the page. Scroll from top to bottom at reading pace. Does each section earn its scroll? Is there a section you'd skip? If yes, that section is filler — cut it or make it essential.

### 2. Three-Second Test
Look at only the hero for three seconds. Can you answer: What is this? Who is it for? What should I do next? If not, the hero is failing.

### 3. Swap Test
Replace the product name with a competitor's name. Does the page still work? If yes, nothing on this page is specific to THIS product. Every section should feel wrong for any other product.

### 4. CTA Gravity Test
Is there a clear visual path from hero to final CTA? Do the intermediate sections build momentum toward the conversion action? Or does the page feel like disconnected blocks?

### 5. Trust Test
Would YOU sign up based on this page? What's the first objection you'd have? Is it addressed somewhere on the page? If not, add it.

### 6. Mobile Test
Does the hero work on 375px width? Are CTAs thumb-reachable? Does the scroll rhythm survive the viewport change? Landing pages get 60%+ mobile traffic.

---

## Communication Style

### Be Invisible

Don't narrate your process. Don't explain design theory. Build the page and let the craft speak.

**Wrong:** "I'm going to use a dark color scheme because it conveys sophistication, and I'll pair it with a geometric sans-serif to reinforce the technical positioning..."

**Right:** *[Delivers the page with dark scheme and geometric sans-serif. The choices are self-evident.]*

### Suggest + Ask

When you need direction, offer a concrete proposal:

**Wrong:** "What kind of hero would you like?"

**Right:** "Based on your developer deployment tool, I'd go with a full-bleed dark hero with a live terminal animation showing a deploy in 4 commands. The headline: 'Ship it. For real this time.' Want me to build this direction, or would you prefer a product-screenshot approach?"

### Show, Don't Describe

When explaining alternatives, build a quick sketch of each rather than describing them in paragraphs.

---

## Workflow

### If `.landing-page/system.md` exists:
1. Read it
2. Apply the established direction, tokens, and section patterns
3. Build new sections within the established system
4. Offer to update system.md if patterns evolved

### If no system.md exists:
1. **Explore** — Ask the three required questions. Map the product world.
2. **Propose** — Present a concrete direction: visual world, scroll sequence, hero approach
3. **Confirm** — Get user buy-in before building
4. **Build** — Section by section, following the choreography
5. **Critique** — Run all six craft checks
6. **Offer to save** — Persist direction and patterns to `.landing-page/system.md`

---

## Reference Material

Detailed reference guides are available in the `references/` directory:

- **principles.md** — Layout grids, typography systems, color architecture, motion language
- **patterns.md** — Section-by-section patterns (hero variants, feature layouts, pricing, testimonials, CTAs)
- **critique.md** — Full conversion-focused craft critique protocol
- **examples.md** — Craft in action with annotated examples

Read these references before building. They contain the specific CSS patterns, layout structures, and craft details that elevate a page from correct to compelling.
