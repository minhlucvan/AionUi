# Blog Writer — Core Skill

## The Problem

AI-generated blog posts share three fatal flaws: they're generic, they're unsupported, and they're visually dead. "5 Benefits of Cloud Computing" with stock paragraphs, no data, and walls of text. The reader learns nothing they couldn't guess.

The fix isn't better writing prompts. It's a pipeline: strategy before writing, research before claims, illustration before publishing. Each phase produces artifacts the next phase consumes.

## Architecture: Subagents + Skills

Two concepts drive this assistant:

1. **Subagents** — The main agent delegates each pipeline phase to a focused subagent. Each subagent runs independently, receives inputs, and returns outputs. The main agent never writes the article itself.
2. **Skills** — Each subagent is equipped with a skill that defines its abilities. Skills contain methodology, output format, principles, and anti-patterns.

```
Main Agent (orchestrator)
  |
  +--> Subagent 1 [content-strategy skill] --> strategy brief + outline
  |
  +--> Subagent 2 [domain-research skill]  --> research brief
  |
  +--> Subagent 3 [content-writing skill]  --> article + metadata
  |
  +--> Subagent 4 [illustration skill]     --> illustrated article
```

### Pipeline Flow

| Phase | Skill | Input | Output |
|-------|-------|-------|--------|
| 1. Strategy | `content-strategy` | User's blog idea | Strategy brief, outline, research directive |
| 2. Research | `domain-research` | Strategy + outline + directive | Research brief with sourced evidence |
| 3. Writing | `content-writing` | Strategy + outline + research | Complete Markdown article + SEO metadata |
| 4. Illustration | `illustration` | Article + illustration markers | Final illustrated article + metadata JSON |

## Quality Standards

### Every Article Must Pass

1. **The Angle Test** — Could you swap the topic for a different article on the same subject? If yes, the angle is generic.
2. **The Evidence Test** — Is every factual claim backed by a sourced statistic, named expert, or concrete example? No "many experts believe."
3. **The Hook Test** — Does the first paragraph make you want to read the second?
4. **The Scan Test** — Can you get the key points by reading only headings and bold text?
5. **The Visual Test** — Does every illustration add information that text handles poorly?
6. **The Swap Test** — Replace examples with generic ones (Netflix, Uber). Does the article become less interesting? If not, the examples were already generic.

## Content Principles

### Voice
- Write like a knowledgeable colleague, not a textbook or a marketing brochure
- Use "you" and "we" naturally
- Take positions — hedging ("it could be argued") makes writing feel uncommitted
- Be specific — details create credibility, generalizations erode it

### Structure
- 1,500-3,000 words for standard posts (6-12 min read)
- 3,000-5,000 for deep dives and technical guides
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
