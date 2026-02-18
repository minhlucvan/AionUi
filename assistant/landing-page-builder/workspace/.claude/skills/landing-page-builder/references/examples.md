# Style Gallery

**Choose ONE style for each landing page. Do not mix styles.**

Each style is a complete, self-contained design system with its own color world, typography, hero approach, motion language, depth strategy, and CTA treatment. Read the summary below to identify the right fit, then open ONLY that style's file for the full reference.

---

## The Styles

### 1. Developer Dark
**File:** `styles/developer-dark.md`
**Reference:** Linear, Vercel, Raycast, Warp

Dark backgrounds. Terminal aesthetics. Monospace accents. Code as the hero visual. Borders-only depth. Snappy, instant motion. The page feels like it was built by engineers for engineers.

**Use when:** Developer tools, CLIs, APIs, DevOps, infrastructure
**Token flavor:** `--void`, `--signal`, `--edge`, `--ink-bright`
**Hero:** Split — headline left, terminal/code right
**Motion:** Snappy (150ms), no floaty animations

---

### 2. Clean Minimal
**File:** `styles/clean-minimal.md`
**Reference:** Stripe, Clerk, Resend, Plaid

Maximum whitespace. Crisp typography. Single accent color. Product screenshots with refined shadows. The confidence comes from what's NOT on the page.

**Use when:** Fintech, payments, APIs, enterprise SaaS needing trust
**Token flavor:** `--paper`, `--brand`, `--line`, `--ink-headline`
**Hero:** Product-led centered — headline above, screenshot below
**Motion:** Restrained — opacity fades only, no transforms

---

### 3. Warm Friendly
**File:** `styles/warm-friendly.md`
**Reference:** Notion, Slack, Loom, Pitch

Off-white warm canvas. Rounded corners. Soft shadows. Product screenshots with human elements (avatars, cursors). Geometric but warm typography. The page feels like a conversation.

**Use when:** Collaboration tools, productivity, consumer SaaS, "the simple alternative"
**Token flavor:** `--canvas`, `--linen`, `--joy`, `--ink-headline`
**Hero:** Product-led with human context — avatars, annotations, real names
**Motion:** Fluid (200ms), gentle bounces, micro-interactions welcome

---

### 4. Bold Gradient
**File:** `styles/bold-gradient.md`
**Reference:** Arc Browser, Framer, Figma, Pitch

Rich gradient backgrounds. Glass-morphism. Oversized typography. Gradient text. Animated mesh backgrounds. Glow effects. The page doesn't apologize for being bold.

**Use when:** Creative tools, AI products, design platforms, anything radically different
**Token flavor:** `--spectrum-start`, `--spectrum-end`, `--glass`, `--accent-glow`
**Hero:** Copy-led immersive — massive gradient headline, mesh background
**Motion:** Dramatic (250ms), gradient shifts, glow intensification

---

### 5. Editorial Premium
**File:** `styles/editorial-premium.md`
**Reference:** Apple, Aesop, Squarespace, Craft

Serif display headlines. Dramatic whitespace. Full-bleed imagery. Muted, sophisticated palette. The page reads like a premium magazine editorial.

**Use when:** Premium products, design tools, lifestyle brands, hardware + software
**Token flavor:** `--cream`, `--stone`, `--ink-black`, `--rule`
**Hero:** Copy-led editorial — massive serif headline, curated image below
**Motion:** Deliberate (300ms), opacity only, slow considered transitions

---

### 6. Enterprise Confident
**File:** `styles/enterprise-confident.md`
**Reference:** Datadog, Snowflake, HashiCorp, PagerDuty

Deep navy. Structured grids. Metrics-heavy social proof. Architecture diagrams. Comparison tables. The page says "we handle serious infrastructure for serious companies."

**Use when:** Infrastructure, DevOps, data platforms, Fortune 500 customers
**Token flavor:** `--navy`, `--action`, `--ink-white`, `--edge`
**Hero:** Split with metrics — headline + proof left, dashboard right
**Motion:** Professional (200ms), subtle, no playfulness

---

### 7. Playful Creative
**File:** `styles/playful-creative.md`
**Reference:** Figma, Miro, Canva, Webflow

Saturated multi-color palette. Asymmetric layouts. Floating UI elements. Bouncy spring animations. Bento grids. The page itself is creative.

**Use when:** Design tools, no-code builders, collaboration platforms for creatives
**Token flavor:** `--violet`, `--pink`, `--cyan`, `--amber`, `--lime`
**Hero:** Product-led with energy — floating elements, cursor annotations, color
**Motion:** Energetic, spring-eased, bouncy hovers, floating oscillation

---

### 8. Data Dense
**File:** `styles/data-dense.md`
**Reference:** Retool, Supabase, Neon, Prisma

GitHub-inspired palette. Code blocks as design elements. Syntax-highlighted examples. Architecture diagrams. Dense information presented cleanly. The code IS the pitch.

**Use when:** Databases, ORMs, SDKs, developer libraries, DX-focused products
**Token flavor:** `--syntax-string`, `--syntax-keyword`, `--brand`, `--well`
**Hero:** Split with live code — headline left, syntax-highlighted code right
**Motion:** Precise (150ms), code typewriter effect, minimal

---

### 9. Startup Launch
**File:** `styles/startup-launch.md`
**Reference:** Product Hunt launches, Superhuman, Liveblocks

Dense hero — everything above the fold. Email capture form. Real-time counters. Autoplay product GIFs. Social proof via tweets. Optimized for 10-second attention span.

**Use when:** Product Hunt, beta launches, waitlists, indie projects, email capture
**Token flavor:** `--launch`, `--launch-glow`, `--canvas`, `--ink-white`
**Hero:** Conversion-optimized dense — headline + email form + demo, all above fold
**Motion:** Punchy (150ms), animated counters, confetti on signup

---

## How to Choose

1. **Identify the audience.** Developers? Enterprise buyers? Consumers? Creatives? Each audience has different expectations.
2. **Identify the product's positioning.** Premium? Technical? Friendly? Bold?
3. **Match to a style.** One style will feel right. If two feel close, pick the one whose hero approach matches the product better.
4. **Commit fully.** Use that style's colors, typography, motion, and CTA treatment. Don't cherry-pick from multiple styles.

## After Choosing

Read the full style file for your chosen style. It contains:
- Complete CSS token system ready to use
- Typography configuration
- Hero layout with ASCII wireframe
- Section rhythm map
- Motion specifications
- Depth strategy with CSS
- CTA button styles with hover states
- Signature elements unique to that style
- Anti-default table (what to reject and what to do instead)
