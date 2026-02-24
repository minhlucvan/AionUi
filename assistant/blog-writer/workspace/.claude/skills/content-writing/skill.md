# Content Writing Skill

## What This Skill Does

Synthesizes a content strategy and research brief into a complete, publication-ready Markdown article with SEO metadata and illustration placement markers.

## When to Use

Use this skill when the orchestrator delegates the **writing phase** of the blog pipeline. The subagent receives strategy brief, outline, and research brief from prior phases.

## Output Artifacts

### 1. Complete Article (Markdown)

A fully written article following the outline structure, with:
- Hook in the first paragraph
- Data and examples woven into narrative
- `<!-- ILLUSTRATION: description -->` markers at natural visual pause points
- Conclusion that references the opening

### 2. SEO Metadata

```yaml
title: [Final title]
slug: [url-friendly-slug]
excerpt: [150-character meta description]
keywords: [comma-separated list]
word_count: [approximate]
read_time: [X min]
```

### 3. Illustration Brief

List of illustration opportunities with:
- Location in the article
- Suggested visual type (diagram, chart, infographic, decorative)
- Key data to visualize
- Tone/style guidance

## Writing Principles

- **Hook hard.** First paragraph determines if anyone reads the second. Open with a specific scenario, surprising fact, provocative question, or bold claim. Never open with a definition or platitude.
- **One idea per paragraph.** Readers scan. Each paragraph makes one point, supports it, moves on.
- **Show, then tell.** Lead with the example, story, or data — then explain what it means.
- **Earn every section.** If a section doesn't add new information, a new perspective, or new evidence, cut it.
- **Write for scanning.** Subheadings, bold key phrases, bullet lists, short paragraphs.
- **Close the loop.** Conclusion references the opening — question answered, scenario returned to.

## Markdown Conventions

- `#` for article title (H1 — used once)
- `##` for main sections (H2)
- `###` for subsections (H3)
- `**bold**` for key terms on first mention and emphasis
- `> blockquote` for expert quotes
- `- bullet lists` for enumerable items (3+ items)
- `1. numbered lists` for sequential steps
- `` `code` `` for technical terms, commands, file names
- `<!-- ILLUSTRATION: description -->` for visual placement markers

## Word Count Guidelines

- 1,500-3,000 words for standard posts (6-12 min read)
- 3,000-5,000 for deep dives and technical guides
- 5-8 main sections maximum

## Anti-Patterns

- **The Wikipedia opening** — "X is a technology/methodology/framework that..."
- **The everything article** — trying to cover every aspect instead of one sharp angle
- **Transition-less sections** — sections that feel like separate articles bolted together
- **Hedging language** — "It could be argued that perhaps..." — take a position
- **The summary conclusion** — "In this article, we covered..." — reward the reader with insight
- **Filler phrases** — "It's worth noting that", "At the end of the day" — cut them all
- **Passive voice overuse** — "The code was deployed" vs. "The team deployed the code"
