# Blog Writer — Core Skill

## The Problem

AI-generated blog posts share three fatal flaws: they're generic, they're unsupported, and they're visually dead. "5 Benefits of Cloud Computing" with stock paragraphs, no data, and walls of text. The reader learns nothing they couldn't guess.

The fix isn't better writing prompts. It's a pipeline: strategy before writing, research before claims, illustration before publishing. Each stage produces artifacts the next stage consumes.

## Pipeline Architecture

```
Idea → Strategy → Research → Writing → Illustration → Article
```

### Stage 1: Content Strategy
**Input:** Raw blog idea
**Output:** Strategy brief + structured outline + research directive

The Strategist's job is to turn a vague idea into a sharp, differentiated angle. "Write about AI" becomes "Why AI agents will replace CI/CD pipelines by 2027 — and what engineers should do now."

Key decisions:
- **Audience** — specific enough to write for one person, broad enough to attract a segment
- **Angle** — the unique take that differentiates this article from existing content
- **SEO** — primary keyword, secondary keywords, search intent alignment
- **Tone** — voice characteristics matched to audience and topic
- **Structure** — outline where each section builds on the previous

### Stage 2: Domain Research
**Input:** Strategy brief + outline + research directive
**Output:** Research brief with sourced facts, quotes, case studies

The Researcher's job is to substantiate every claim in the outline with evidence. No "studies show" — only "a 2025 Gartner survey of 800 CTOs found..."

Key outputs:
- **Statistics** — specific, recent, attributable numbers
- **Expert quotes** — named voices with titles and contexts
- **Case studies** — real examples that haven't been overused
- **Counter-arguments** — honest objections that the article can address
- **Competitive gap** — what existing articles miss that ours can fill

### Stage 3: Content Writing
**Input:** Strategy + outline + research brief
**Output:** Complete Markdown article + SEO metadata + illustration markers

The Writer synthesizes strategy and research into prose. The article should read like it was written by a domain expert who happens to be a good writer.

Key requirements:
- Hook in the first paragraph (scenario, stat, question, or bold claim)
- One idea per paragraph, scannable structure
- Data and examples woven into narrative, not bolted on
- Illustration markers (`<!-- ILLUSTRATION: ... -->`) at natural visual pause points
- Conclusion that references the opening

### Stage 4: Illustration
**Input:** Complete article + illustration markers + visual brief
**Output:** Final illustrated article + metadata JSON

The Illustrator transforms text-only content into a rich visual experience.

Visual types:
- **Mermaid diagrams** — processes, architectures, sequences, comparisons
- **ASCII art** — developer-focused, terminal-themed content
- **SVG illustrations** — inline charts, simple graphics
- **Image prompts** — hero images, social cards, editorial visuals

## Quality Standards

### Every Article Must Pass

1. **The Angle Test** — Could you swap the topic for a different article on the same subject? If yes, the angle is generic.
2. **The Evidence Test** — Is every factual claim backed by a sourced statistic, named expert, or concrete example? No "many experts believe."
3. **The Hook Test** — Does the first paragraph make you want to read the second? Test by reading only the first paragraph.
4. **The Scan Test** — Can you get the article's key points by reading only headings and bold text? Structure should communicate even when skimmed.
5. **The Visual Test** — Does every illustration add information that text handles poorly? No decorative visuals.
6. **The Swap Test** — Replace the article's examples with generic ones (Netflix, Uber). Does the article become less interesting? If not, the examples were already generic.

## Content Principles

### Voice
- Write like a knowledgeable colleague, not a textbook or a marketing brochure
- Use "you" and "we" naturally
- Take positions — hedging ("it could be argued") makes writing feel uncommitted
- Be specific — details create credibility, generalizations erode it

### Structure
- 1,500–3,000 words for standard posts (6–12 min read)
- 3,000–5,000 for deep dives and technical guides
- 5-8 main sections maximum — more means the article is unfocused
- Subheadings every 200-300 words for scannability

### SEO (without being mechanical)
- Primary keyword in title, first paragraph, one H2, and meta description
- Secondary keywords distributed naturally across sections
- Meta description: 150 characters, includes primary keyword, creates curiosity
- URL slug: short, keyword-inclusive, hyphen-separated

### Formatting
- Markdown is the output format — proper heading hierarchy, lists, code blocks
- Bold key terms on first mention
- Blockquotes for expert quotes with attribution
- Code blocks with language tags for technical content
- Tables for comparisons (3+ items with multiple attributes)

## Anti-Patterns

These are the patterns that make AI-generated content recognizable. Eliminate them:

- **The generic opening:** "In today's rapidly evolving digital landscape..." — delete on sight
- **The definition start:** "X is defined as..." — readers aren't looking up dictionary entries
- **The exhaustive list:** "10 Benefits of..." where benefit 7-10 are padding — cut to the strong ones
- **The filler transition:** "Now let's look at..." — the heading already signals the topic change
- **The summary conclusion:** "In summary, we discussed..." — reward the reader with insight, not a recap
- **The unsourced authority:** "Research shows..." / "Experts agree..." — name the research and the expert
- **The hedge stack:** "It could potentially perhaps be argued that in some cases..." — say it or don't
